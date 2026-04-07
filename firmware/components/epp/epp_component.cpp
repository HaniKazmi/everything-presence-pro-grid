#include "epp_component.h"
#include "esphome/core/log.h"

#include <ArduinoJson.h>
#include <cmath>
#include <cstring>
#include <mbedtls/base64.h>
#include <nvs_flash.h>
#include <nvs.h>

namespace epp {

static const char *const TAG = "zones";
static const char *const NVS_NAMESPACE = "epp";

void EPPComponent::setup() {
  ESP_LOGI(TAG, "EPP Zone Engine component initialized");

  // Publish firmware version
  if (firmware_version_sensor_ != nullptr) {
    firmware_version_sensor_->publish_state(FIRMWARE_VERSION_STR);
  }

  restore_from_nvs_();
}

void EPPComponent::loop() {
  if (!frame_ready_) return;
  frame_ready_ = false;
  frame_count_++;

  uint32_t now = esphome::millis();
  float ts = now / 1000.0f;

  // === PROCESSING PIPELINE (runs every frame) ===

  // Stage 1: Feed raw positions into rolling median
  TargetInput raw_inputs[NUM_TARGETS];
  for (int i = 0; i < NUM_TARGETS; i++) {
    raw_inputs[i] = {targets_[i].x, targets_[i].y,
                     targets_[i].detected && targets_[i].y != 0.0f};
  }
  window_.feed(raw_inputs, NUM_TARGETS, now);

  // Stage 2: Get smoothed raw, transform to grid coordinates
  const auto &win = window_.output();
  TargetInput grid_inputs[NUM_TARGETS];
  for (int i = 0; i < NUM_TARGETS; i++) {
    if (win.targets[i].active) {
      auto [rx, ry] = transform_.apply(
          win.targets[i].median_x, win.targets[i].median_y);
      grid_inputs[i] = {rx, ry, true};
    } else {
      grid_inputs[i] = {0.0f, 0.0f, false};
    }
  }

  // Stage 2b: Track per-frame overlay cell crossings
  // The median position may skip over boundary overlay cells, so we check
  // each raw frame's transformed position directly. The flag is sticky:
  // set when any frame lands on an overlay cell, cleared when a frame
  // lands on a non-overlay room cell.
  for (int i = 0; i < NUM_TARGETS; i++) {
    if (raw_inputs[i].active) {
      auto [fx, fy] = transform_.apply(raw_inputs[i].x, raw_inputs[i].y);
      int cell = grid_.xy_to_cell(fx, fy);
      if (cell != -1 && grid_.cell_is_room(cell)) {
        if (grid_.cell_has_overlay_entry(cell)) {
          target_touched_overlay_[i] = true;
        } else {
          target_touched_overlay_[i] = false;
        }
      }
      // If outside room, keep current flag value (sticky until next room cell)
    } else {
      // Target inactive — don't clear, let zone engine use the flag
    }
  }

  // Stage 3: Zone engine tick — uses transformed positions + frame counts
  WindowOutput zone_input;
  zone_input.total_frames = win.total_frames;
  for (int i = 0; i < NUM_TARGETS; i++) {
    zone_input.targets[i].active = win.targets[i].active;
    zone_input.targets[i].frame_count = win.targets[i].frame_count;
    zone_input.targets[i].median_x = grid_inputs[i].x;
    zone_input.targets[i].median_y = grid_inputs[i].y;
    zone_input.targets[i].on_overlay = target_touched_overlay_[i];
  }
  // Build sensor input for zone engine
  SensorInput sensor_input;
  if (static_presence_sensor_ != nullptr)
    sensor_input.static_on = static_presence_sensor_->state;
  if (motion_presence_sensor_ != nullptr)
    sensor_input.motion_on = motion_presence_sensor_->state;
  sensor_input.static_timeout = static_timeout_;
  sensor_input.motion_timeout = motion_timeout_;

  const auto &result = zone_engine_.tick(zone_input, ts, sensor_input);

  // Output zone engine log entries immediately (before throttle may overwrite)
  for (int i = 0; i < result.log_count; ++i) {
    if (result.log[i].level == epp::LogLevel::INFO) {
      ESP_LOGI(TAG, "%s", result.log[i].message);
    } else {
      ESP_LOGD(TAG, "%s", result.log[i].message);
    }
  }

  last_zone_result_ = result;

  // === PUBLISH THROTTLES (do not affect processing) ===

  // Timer 1: Display (internal transport text sensors, frontend only)
  if (display_interval_ms_ > 0 && now - last_display_publish_ms_ >= display_interval_ms_) {
    last_display_publish_ms_ = now;

    // Publish raw target positions (pre-transform, smoothed)
    for (int i = 0; i < NUM_TARGETS; i++) {
      if (raw_target_sensors_[i] != nullptr) {
        if (win.targets[i].active) {
          char buf[32];
          snprintf(buf, sizeof(buf), "%.0f,%.0f",
                   win.targets[i].median_x,
                   win.targets[i].median_y);
          raw_target_sensors_[i]->publish_state(buf);
        } else {
          raw_target_sensors_[i]->publish_state("");
        }
      }
    }

    // Publish grid target positions from zone engine result.
    // Always send position when sensor sees a target (even if zone engine
    // didn't confirm it) so the frontend can process with its own grid.
    for (int i = 0; i < NUM_TARGETS; i++) {
      if (target_position_sensors_[i] != nullptr) {
        if (i < result.target_count && !std::isnan(result.targets[i].x)) {
          const char* status_str = result.targets[i].status == TargetStatus::ACTIVE ? "active"
                                 : result.targets[i].status == TargetStatus::PENDING ? "pending"
                                 : "inactive";
          char buf[64];
          snprintf(buf, sizeof(buf), "%.0f,%.0f,%s",
                   result.targets[i].x, result.targets[i].y, status_str);
          target_position_sensors_[i]->publish_state(buf);
        } else {
          target_position_sensors_[i]->publish_state("");
        }
      }
    }
  }

  // Timer 2: Zone state (internal transport JSON, frontend only)
  if (zone_state_interval_ms_ > 0 && now - last_zone_state_ms_ >= zone_state_interval_ms_) {
    last_zone_state_ms_ = now;

    // Publish zone state as compact JSON
    if (zone_state_sensor_ != nullptr) {
      // Compute sensor state codes (used in JSON fields and debug log)
      const char *static_code = result.static_state == SensorPresenceState::ACTIVE ? "A" :
                                 result.static_state == SensorPresenceState::PENDING ? "P" : "I";
      const char *motion_code = result.motion_state == SensorPresenceState::ACTIVE ? "A" :
                                 result.motion_state == SensorPresenceState::PENDING ? "P" : "I";

      char json[512];
      int pos = snprintf(json, sizeof(json),
          "{\"targets\":[");
      for (int i = 0; i < NUM_TARGETS; i++) {
        const char *status_str = "inactive";
        if (i < result.target_count) {
          switch (result.targets[i].status) {
            case TargetStatus::ACTIVE: status_str = "active"; break;
            case TargetStatus::PENDING: status_str = "pending"; break;
            default: break;
          }
        }
        int signal = (i < result.target_count) ? result.targets[i].signal : 0;
        pos += snprintf(json + pos, sizeof(json) - pos,
            "%s{\"signal\":%d,\"status\":\"%s\"}",
            i > 0 ? "," : "", signal, status_str);
      }
      pos += snprintf(json + pos, sizeof(json) - pos,
          "],\"zones\":{\"occupancy\":[");
      for (int i = 0; i < MAX_ZONE_SLOTS; i++) {
        pos += snprintf(json + pos, sizeof(json) - pos,
            "%s%s", i > 0 ? "," : "",
            result.zone_occupancy[i] ? "true" : "false");
      }
      pos += snprintf(json + pos, sizeof(json) - pos,
          "],\"tracking\":%s},"
          "\"static_state\":\"%s\",\"motion_state\":\"%s\",\"occupancy\":%s,"
          "\"frame_count\":%d,\"debug_log\":\"",
          result.device_tracking_present ? "true" : "false",
          static_code, motion_code,
          result.occupancy ? "true" : "false",
          result.frame_count);

      // Debug log: "S:A M:P Occ:1|T0:Z1:A:5|Z0:O:1 Z1:O:1"
      // Sensor prefix
      pos += snprintf(json + pos, sizeof(json) - pos,
          "S:%s M:%s Occ:%d|", static_code, motion_code, result.occupancy ? 1 : 0);
      // Targets part
      bool first_target = true;
      for (int i = 0; i < result.target_count && i < NUM_TARGETS; i++) {
        if (result.targets[i].status == TargetStatus::INACTIVE) continue;
        const char *s = result.targets[i].status == TargetStatus::ACTIVE ? "A" : "P";
        int zone = 0;
        if (result.targets[i].x != 0.0f || result.targets[i].y != 0.0f) {
          auto cell = grid_.xy_to_cell(result.targets[i].x, result.targets[i].y);
          if (cell >= 0 && cell < GRID_CELL_COUNT) {
            zone = grid_.cell_zone(cell);
          }
        }
        pos += snprintf(json + pos, sizeof(json) - pos,
            "%sT%d:Z%d:%s:%d", first_target ? "" : " ", i, zone, s, result.targets[i].signal);
        first_target = false;
      }
      // Zones part
      pos += snprintf(json + pos, sizeof(json) - pos, "|");
      bool first_zone = true;
      for (int i = 0; i < MAX_ZONE_SLOTS; i++) {
        if (!result.zone_occupancy[i]) continue;
        const char *zs = result.zone_states[i] == epp::ZoneState::PENDING_CLEAR ? "P" : "O";
        pos += snprintf(json + pos, sizeof(json) - pos,
            "%sZ%d:%s:%d", first_zone ? "" : " ", i, zs, result.zone_target_counts[i]);
        first_zone = false;
      }
      pos += snprintf(json + pos, sizeof(json) - pos, "\"}");
      zone_state_sensor_->publish_state(json);
    }
  }

  // Timer 3: Entity target (structured HA entities, user Hz)
  if (entity_target_interval_ms_ > 0 && now - last_entity_target_ms_ >= entity_target_interval_ms_) {
    last_entity_target_ms_ = now;

    int active_count = 0;
    for (int i = 0; i < NUM_TARGETS; i++) {
      bool active = i < result.target_count && result.targets[i].status != TargetStatus::INACTIVE;
      if (active) active_count++;

      if (target_x_sensors_[i] != nullptr)
        target_x_sensors_[i]->publish_state(active ? result.targets[i].x : NAN);
      if (target_y_sensors_[i] != nullptr)
        target_y_sensors_[i]->publish_state(active ? result.targets[i].y : NAN);
      if (target_signal_sensors_[i] != nullptr)
        target_signal_sensors_[i]->publish_state(active ? static_cast<float>(result.targets[i].signal) : 0.0f);
      if (target_active_sensors_[i] != nullptr)
        target_active_sensors_[i]->publish_state(active);
      if (target_zone_sensors_[i] != nullptr) {
        if (active && (result.targets[i].x != 0.0f || result.targets[i].y != 0.0f)) {
          auto cell = grid_.xy_to_cell(result.targets[i].x, result.targets[i].y);
          if (cell >= 0 && cell < GRID_CELL_COUNT)
            target_zone_sensors_[i]->publish_state(static_cast<float>(grid_.cell_zone(cell)));
          else
            target_zone_sensors_[i]->publish_state(NAN);
        } else {
          target_zone_sensors_[i]->publish_state(NAN);
        }
      }
    }
    if (target_count_sensor_ != nullptr)
      target_count_sensor_->publish_state(static_cast<float>(active_count));
  }

  // Timer 4: Entity zone (structured HA entities, user Hz)
  if (entity_zone_interval_ms_ > 0 && now - last_entity_zone_ms_ >= entity_zone_interval_ms_) {
    last_entity_zone_ms_ = now;

    for (int i = 0; i < MAX_ZONE_SLOTS; i++) {
      if (zone_occupancy_sensors_[i] != nullptr)
        zone_occupancy_sensors_[i]->publish_state(result.zone_occupancy[i]);
      if (zone_target_count_sensors_[i] != nullptr)
        zone_target_count_sensors_[i]->publish_state(static_cast<float>(result.zone_target_counts[i]));
    }
  }

  // Timer 5: System (fixed 1000ms, always runs)
  if (now - last_system_ms_ >= SYSTEM_INTERVAL_MS) {
    last_system_ms_ = now;

    if (device_tracking_sensor_ != nullptr)
      device_tracking_sensor_->publish_state(result.device_tracking_present);
    if (static_presence_output_ != nullptr)
      static_presence_output_->publish_state(result.static_state != SensorPresenceState::INACTIVE);
    if (motion_presence_output_ != nullptr)
      motion_presence_output_->publish_state(result.motion_state != SensorPresenceState::INACTIVE);
    if (occupancy_output_ != nullptr)
      occupancy_output_->publish_state(result.occupancy);

    // Relay evaluation
    if (relay_switch_ != nullptr) {
      RelayEvalInput relay_input{
          relay_trigger_mode_,
          relay_contact_mode_,
          result.motion_state != SensorPresenceState::INACTIVE,
          result.static_state != SensorPresenceState::INACTIVE,
          result.occupancy,
      };
      auto relay_result = evaluate_relay(relay_input);
      if (relay_result.should_update) {
        if (relay_result.desired_state != relay_switch_->state) {
          if (relay_result.desired_state) {
            relay_switch_->turn_on();
          } else {
            relay_switch_->turn_off();
          }
        }
      }
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
// Service: dismiss_target
// ---------------------------------------------------------------------------

void EPPComponent::dismiss_target(int target_index, int cell_index) {
    zone_engine_.dismiss_target(target_index, cell_index);
    ESP_LOGI(TAG, "Dismissed target %d at cell %d", target_index, cell_index);
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

  int overlay_count = 0;
  for (int i = 0; i < GRID_CELL_COUNT; i++) {
    if (grid_.cell_has_overlay_entry(i)) overlay_count++;
  }
  ESP_LOGI(TAG, "Grid set: origin (%.0f, %.0f), %d cells, %d overlay",
           origin_x, origin_y, GRID_CELL_COUNT, overlay_count);

  save_grid_to_nvs_();
}

// ---------------------------------------------------------------------------
// Service: set_zones
// ---------------------------------------------------------------------------

static ZoneType type_str_to_enum(const char *s) {
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
    doc["room_handoff_timeout"] | 3.0f
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
      z["handoff_timeout"] | 3.0f
    };
    count++;
  }

  zone_engine_.set_zones(configs, count);
  ESP_LOGI(TAG, "Configured %d zones", count);

  save_zones_to_nvs_(zones_json);
}

// ---------------------------------------------------------------------------
// Service: set_relay
// ---------------------------------------------------------------------------

static RelayTriggerMode trigger_mode_from_str(const std::string &s) {
    if (s == "motion") return RelayTriggerMode::MOTION;
    if (s == "presence") return RelayTriggerMode::PRESENCE;
    if (s == "occupancy") return RelayTriggerMode::OCCUPANCY;
    return RelayTriggerMode::DISABLED;
}

static RelayContactMode contact_mode_from_str(const std::string &s) {
    if (s == "nc") return RelayContactMode::NORMALLY_CLOSED;
    return RelayContactMode::NORMALLY_OPEN;
}

void EPPComponent::set_relay(const std::string &trigger_mode, const std::string &contact_mode) {
    relay_trigger_mode_ = trigger_mode_from_str(trigger_mode);
    relay_contact_mode_ = contact_mode_from_str(contact_mode);
    ESP_LOGI(TAG, "Relay set: trigger=%s contact=%s", trigger_mode.c_str(), contact_mode.c_str());
    save_relay_to_nvs_();
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

  // Restore relay settings
  uint8_t relay_trig = 0;
  if (nvs_get_u8(handle, "relay_trig", &relay_trig) == ESP_OK) {
    if (relay_trig <= static_cast<uint8_t>(RelayTriggerMode::OCCUPANCY)) {
      relay_trigger_mode_ = static_cast<RelayTriggerMode>(relay_trig);
    } else {
      ESP_LOGW(TAG, "Invalid relay trigger mode %d in NVS, defaulting to DISABLED", relay_trig);
      relay_trigger_mode_ = RelayTriggerMode::DISABLED;
    }
    uint8_t relay_cont = 0;
    nvs_get_u8(handle, "relay_cont", &relay_cont);
    if (relay_cont <= static_cast<uint8_t>(RelayContactMode::NORMALLY_CLOSED)) {
      relay_contact_mode_ = static_cast<RelayContactMode>(relay_cont);
    } else {
      ESP_LOGW(TAG, "Invalid relay contact mode %d in NVS, defaulting to NO", relay_cont);
      relay_contact_mode_ = RelayContactMode::NORMALLY_OPEN;
    }
    ESP_LOGI(TAG, "Restored relay settings from NVS (trigger=%d, contact=%d)",
             static_cast<int>(relay_trigger_mode_), static_cast<int>(relay_contact_mode_));
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
        doc["room_handoff_timeout"] | 3.0f
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
          z["handoff_timeout"] | 3.0f
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

void EPPComponent::save_relay_to_nvs_() {
  nvs_handle_t handle;
  if (nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle) != ESP_OK) {
    ESP_LOGE(TAG, "Failed to open NVS for writing");
    return;
  }

  nvs_set_u8(handle, "version", NVS_SCHEMA_VERSION);
  nvs_set_u8(handle, "relay_trig", static_cast<uint8_t>(relay_trigger_mode_));
  nvs_set_u8(handle, "relay_cont", static_cast<uint8_t>(relay_contact_mode_));
  nvs_commit(handle);
  nvs_close(handle);
  ESP_LOGD(TAG, "Relay settings saved to NVS");
}

}  // namespace epp
