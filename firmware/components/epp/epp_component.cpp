#include "epp_component.h"
#include "esphome/core/log.h"

#include <ArduinoJson.h>
#include <cstring>
#include <mbedtls/base64.h>
#include <nvs_flash.h>
#include <nvs.h>

namespace epp {

static const char *const TAG = "epp";
static const char *const NVS_NAMESPACE = "epp";

void EPPComponent::setup() {
  ESP_LOGI(TAG, "EPP Zone Engine component initialized");

  // Publish firmware version
  if (firmware_version_sensor_ != nullptr) {
    firmware_version_sensor_->publish_state("1.0.0-zone-engine");
  }

  restore_from_nvs_();
}

void EPPComponent::loop() {
  if (!frame_ready_)
    return;
  frame_ready_ = false;
  frame_count_++;

  // Apply perspective transform to get room-space coordinates.
  // Gate out targets with y==0 — the LD2450 reports this transiently
  // before it has a range fix, producing a bogus initial position.
  TargetInput inputs[MAX_TARGETS];
  for (int i = 0; i < NUM_TARGETS; i++) {
    if (targets_[i].detected && targets_[i].y != 0.0f) {
      auto [rx, ry] = transform_.apply(targets_[i].x, targets_[i].y);
      inputs[i] = {rx, ry, true};
    } else {
      inputs[i] = {0.0f, 0.0f, false};
    }
  }

  // Feed through tumbling window
  float ts = esphome::millis() / 1000.0f;
  bool ticked = window_.feed(inputs, MAX_TARGETS, ts);

  if (ticked) {
    const auto &result = zone_engine_.tick(window_.output(), ts);

    // Log state transitions
    if (result.device_tracking_present != prev_tracking_) {
      ESP_LOGI(TAG, "Tracking: %s", result.device_tracking_present ? "present" : "clear");
      prev_tracking_ = result.device_tracking_present;
    }
    for (int i = 0; i < MAX_ZONE_SLOTS; i++) {
      if (result.zone_occupancy[i] != prev_zone_occ_[i]) {
        ESP_LOGI(TAG, "Zone %d: %s", i, result.zone_occupancy[i] ? "occupied" : "clear");
        prev_zone_occ_[i] = result.zone_occupancy[i];
      }
    }

    // Log target activity
    for (int i = 0; i < result.target_count && i < MAX_TARGETS; i++) {
      if (result.targets[i].status != epp::TargetStatus::INACTIVE) {
        ESP_LOGD(TAG, "T%d: (%.0f,%.0f) signal=%d status=%d",
                 i, result.targets[i].x, result.targets[i].y,
                 result.targets[i].signal, static_cast<int>(result.targets[i].status));
      }
    }

    // Publish device tracking binary sensor
    if (device_tracking_sensor_ != nullptr) {
      device_tracking_sensor_->publish_state(result.device_tracking_present);
    }

    // Publish zone occupancy binary sensors
    for (int i = 0; i < MAX_ZONE_SLOTS; i++) {
      if (zone_occupancy_sensors_[i] != nullptr) {
        zone_occupancy_sensors_[i]->publish_state(result.zone_occupancy[i]);
      }
    }

    // Publish target position text sensors as "x,y,signal,status"
    for (int i = 0; i < result.target_count && i < MAX_TARGETS; i++) {
      if (target_position_sensors_[i] != nullptr) {
        char buf[64];
        const char *status_str = "inactive";
        switch (result.targets[i].status) {
          case epp::TargetStatus::ACTIVE:
            status_str = "active";
            break;
          case epp::TargetStatus::PENDING:
            status_str = "pending";
            break;
          default:
            break;
        }
        snprintf(buf, sizeof(buf), "%.0f,%.0f,%d,%s",
                 result.targets[i].x, result.targets[i].y,
                 result.targets[i].signal, status_str);
        target_position_sensors_[i]->publish_state(buf);
      }
    }

    // Log periodically
    if (frame_count_ % 100 == 0) {
      ESP_LOGD(TAG, "Zone tick: tracking=%d, occ=[%d,%d,%d,%d,%d,%d,%d,%d]",
               result.device_tracking_present,
               result.zone_occupancy[0], result.zone_occupancy[1],
               result.zone_occupancy[2], result.zone_occupancy[3],
               result.zone_occupancy[4], result.zone_occupancy[5],
               result.zone_occupancy[6], result.zone_occupancy[7]);
    }
  }
}

float EPPComponent::get_setup_priority() const {
  return esphome::setup_priority::DATA;
}

void EPPComponent::feed_targets(float x1, float y1, bool d1,
                                float x2, float y2, bool d2,
                                float x3, float y3, bool d3) {
  targets_[0] = {x1, y1, d1};
  targets_[1] = {x2, y2, d2};
  targets_[2] = {x3, y3, d3};
  frame_ready_ = true;
}

// ---------------------------------------------------------------------------
// Service: set_perspective
// ---------------------------------------------------------------------------

void EPPComponent::set_perspective(const std::string &perspective,
                                   float room_width, float room_depth) {
  float coeffs[8];
  int count = 0;

  // Parse comma-separated floats
  const char *p = perspective.c_str();
  while (count < 8 && *p != '\0') {
    char *end;
    coeffs[count] = strtof(p, &end);
    if (end == p) {
      ESP_LOGE(TAG, "Failed to parse perspective coefficient at index %d", count);
      return;
    }
    count++;
    p = end;
    if (*p == ',') p++;
  }

  if (count != 8) {
    ESP_LOGE(TAG, "Expected 8 perspective coefficients, got %d", count);
    return;
  }

  transform_.set_coefficients(coeffs, room_width, room_depth);

  // Cache for NVS persistence
  memcpy(persp_cache_, coeffs, 8 * sizeof(float));
  persp_cache_[8] = room_width;
  persp_cache_[9] = room_depth;
  has_persp_cache_ = true;

  ESP_LOGI(TAG, "Perspective set: room %.0fx%.0f mm", room_width, room_depth);

  save_perspective_to_nvs_();
}

// ---------------------------------------------------------------------------
// Service: set_grid
// ---------------------------------------------------------------------------

void EPPComponent::set_grid(const std::string &grid_data,
                            float origin_x, float origin_y) {
  uint8_t decoded[GRID_CELL_COUNT];
  size_t decoded_len = 0;

  int ret = mbedtls_base64_decode(decoded, sizeof(decoded), &decoded_len,
                                  reinterpret_cast<const unsigned char *>(grid_data.c_str()),
                                  grid_data.length());
  if (ret != 0) {
    ESP_LOGE(TAG, "Base64 decode failed (error %d)", ret);
    return;
  }

  if (decoded_len != GRID_CELL_COUNT) {
    ESP_LOGE(TAG, "Grid data: expected %d bytes, got %d", GRID_CELL_COUNT, (int)decoded_len);
    return;
  }

  grid_ = Grid(origin_x, origin_y);
  grid_.load_from_bytes(decoded, GRID_CELL_COUNT);
  zone_engine_.set_grid(grid_);

  ESP_LOGI(TAG, "Grid set: origin (%.0f, %.0f), %d cells",
           origin_x, origin_y, GRID_CELL_COUNT);

  save_grid_to_nvs_();
}

// ---------------------------------------------------------------------------
// Service: set_zones
// ---------------------------------------------------------------------------

static ZoneType type_str_to_enum(const char *s) {
  if (strcmp(s, "entrance") == 0) return ZoneType::ENTRANCE;
  if (strcmp(s, "thoroughfare") == 0) return ZoneType::THOROUGHFARE;
  if (strcmp(s, "rest") == 0) return ZoneType::REST;
  if (strcmp(s, "custom") == 0) return ZoneType::CUSTOM;
  return ZoneType::NORMAL;
}

void EPPComponent::set_zones(const std::string &zones_json) {
  JsonDocument doc;
  if (deserializeJson(doc, zones_json)) {
    ESP_LOGE(TAG, "Failed to parse zones JSON");
    return;
  }

  ZoneConfig configs[MAX_ZONE_SLOTS];
  int count = 0;

  // Zone 0 (room) from root-level fields
  configs[count] = {
    0,
    type_str_to_enum(doc["room_type"] | "normal"),
    doc["room_trigger"] | 5,
    doc["room_renew"] | 3,
    doc["room_timeout"] | 10.0f,
    doc["room_handoff_timeout"] | 3.0f,
    doc["room_entry_point"] | false
  };
  count++;

  // Named zones 1-7 from zone_slots array
  JsonArray slots = doc["zone_slots"].as<JsonArray>();
  for (size_t i = 0; i < slots.size() && count < MAX_ZONE_SLOTS; i++) {
    if (slots[i].isNull()) continue;
    JsonObject z = slots[i].as<JsonObject>();
    configs[count] = {
      z["id"] | static_cast<int>(i + 1),
      type_str_to_enum(z["type"] | "normal"),
      z["trigger"] | 5,
      z["renew"] | 3,
      z["timeout"] | 10.0f,
      z["handoff_timeout"] | 3.0f,
      z["entry_point"] | false
    };
    count++;
  }

  zone_engine_.set_zones(configs, count);
  ESP_LOGI(TAG, "Configured %d zones", count);

  save_zones_to_nvs_(zones_json);
}

// ---------------------------------------------------------------------------
// NVS persistence — restore
// ---------------------------------------------------------------------------

void EPPComponent::restore_from_nvs_() {
  nvs_handle_t handle;
  if (nvs_open(NVS_NAMESPACE, NVS_READONLY, &handle) != ESP_OK) {
    ESP_LOGD(TAG, "No NVS namespace found, starting fresh");
    return;
  }

  uint8_t version = 0;
  if (nvs_get_u8(handle, "version", &version) != ESP_OK || version != NVS_SCHEMA_VERSION) {
    ESP_LOGW(TAG, "NVS schema version mismatch (got %d, expected %d), skipping restore",
             version, NVS_SCHEMA_VERSION);
    nvs_close(handle);
    return;
  }

  // Restore perspective (8 floats + room_width + room_depth = 40 bytes)
  size_t len = sizeof(persp_cache_);
  if (nvs_get_blob(handle, "persp", persp_cache_, &len) == ESP_OK && len == sizeof(persp_cache_)) {
    transform_.set_coefficients(persp_cache_, persp_cache_[8], persp_cache_[9]);
    has_persp_cache_ = true;
    ESP_LOGI(TAG, "Restored perspective from NVS");
  }

  // Restore grid (400 cell bytes + origin_x + origin_y = 408 bytes)
  len = 408;
  uint8_t grid_buf[408];
  if (nvs_get_blob(handle, "grid", grid_buf, &len) == ESP_OK && len == 408) {
    float origin_x, origin_y;
    memcpy(&origin_x, grid_buf + GRID_CELL_COUNT, sizeof(float));
    memcpy(&origin_y, grid_buf + GRID_CELL_COUNT + sizeof(float), sizeof(float));
    grid_ = Grid(origin_x, origin_y);
    grid_.load_from_bytes(grid_buf, GRID_CELL_COUNT);
    zone_engine_.set_grid(grid_);
    ESP_LOGI(TAG, "Restored grid from NVS (origin %.0f, %.0f)", origin_x, origin_y);
  }

  // Restore zones (stored as JSON string)
  size_t str_len = 0;
  if (nvs_get_str(handle, "zones", nullptr, &str_len) == ESP_OK && str_len > 1) {
    std::string zones_str(str_len - 1, '\0');  // str_len includes null terminator
    nvs_get_str(handle, "zones", &zones_str[0], &str_len);
    nvs_close(handle);  // Close before calling set_zones (which re-opens for save)
    // Parse and apply but don't re-save — call the parsing logic directly
    JsonDocument doc;
    if (!deserializeJson(doc, zones_str)) {
      ZoneConfig configs[MAX_ZONE_SLOTS];
      int count = 0;

      configs[count] = {
        0,
        type_str_to_enum(doc["room_type"] | "normal"),
        doc["room_trigger"] | 5,
        doc["room_renew"] | 3,
        doc["room_timeout"] | 10.0f,
        doc["room_handoff_timeout"] | 3.0f,
        doc["room_entry_point"] | false
      };
      count++;

      JsonArray slots = doc["zone_slots"].as<JsonArray>();
      for (size_t i = 0; i < slots.size() && count < MAX_ZONE_SLOTS; i++) {
        if (slots[i].isNull()) continue;
        JsonObject z = slots[i].as<JsonObject>();
        configs[count] = {
          z["id"] | static_cast<int>(i + 1),
          type_str_to_enum(z["type"] | "normal"),
          z["trigger"] | 5,
          z["renew"] | 3,
          z["timeout"] | 10.0f,
          z["handoff_timeout"] | 3.0f,
          z["entry_point"] | false
        };
        count++;
      }

      zone_engine_.set_zones(configs, count);
      last_zones_json_ = zones_str;
      ESP_LOGI(TAG, "Restored %d zones from NVS", count);
    }
    return;
  }

  nvs_close(handle);
}

// ---------------------------------------------------------------------------
// NVS persistence — save
// ---------------------------------------------------------------------------

void EPPComponent::save_perspective_to_nvs_() {
  if (!has_persp_cache_) return;

  nvs_handle_t handle;
  if (nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle) != ESP_OK) {
    ESP_LOGE(TAG, "Failed to open NVS for writing");
    return;
  }

  nvs_set_u8(handle, "version", NVS_SCHEMA_VERSION);
  nvs_set_blob(handle, "persp", persp_cache_, sizeof(persp_cache_));
  nvs_commit(handle);
  nvs_close(handle);
  ESP_LOGD(TAG, "Perspective saved to NVS (40 bytes)");
}

void EPPComponent::save_grid_to_nvs_() {
  nvs_handle_t handle;
  if (nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle) != ESP_OK) {
    ESP_LOGE(TAG, "Failed to open NVS for writing");
    return;
  }

  // Pack cell data + origin into blob
  uint8_t buf[GRID_CELL_COUNT + 2 * sizeof(float)];
  for (int i = 0; i < GRID_CELL_COUNT; i++) {
    buf[i] = grid_.cell(i);
  }
  float ox = grid_.origin_x();
  float oy = grid_.origin_y();
  memcpy(buf + GRID_CELL_COUNT, &ox, sizeof(float));
  memcpy(buf + GRID_CELL_COUNT + sizeof(float), &oy, sizeof(float));

  nvs_set_u8(handle, "version", NVS_SCHEMA_VERSION);
  nvs_set_blob(handle, "grid", buf, sizeof(buf));
  nvs_commit(handle);
  nvs_close(handle);
  ESP_LOGD(TAG, "Grid saved to NVS (%d bytes)", (int)sizeof(buf));
}

void EPPComponent::save_zones_to_nvs_(const std::string &zones_json) {
  nvs_handle_t handle;
  if (nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle) != ESP_OK) {
    ESP_LOGE(TAG, "Failed to open NVS for writing");
    return;
  }

  last_zones_json_ = zones_json;
  nvs_set_u8(handle, "version", NVS_SCHEMA_VERSION);
  nvs_set_str(handle, "zones", zones_json.c_str());
  nvs_commit(handle);
  nvs_close(handle);
  ESP_LOGD(TAG, "Zones saved to NVS (%d bytes)", (int)zones_json.size());
}

}  // namespace epp
