# Conditional Entity Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce network traffic by only publishing entity data when consumers need it — structured HA entities at user-configured Hz, internal transport at frontend subscription rate.

**Architecture:** Two-tier publishing: (1) transport text sensors (`disabled_by_default`) for frontend display at 5Hz/1Hz, gated by WebSocket subscriber presence; (2) proper structured HA entities for automations at user-configured max Hz, gated by entity enable state. Five firmware publish timers replace the current two. Integration manages interval computation and pushes pipeline on subscribe/unsubscribe/settings changes.

**Tech Stack:** C++ (ESPHome component), Python (HA custom component), TypeScript (Lit frontend), pytest, vitest

**Spec:** `docs/superpowers/specs/2026-04-01-conditional-publish-design.md`

---

### Task 1: Firmware — rename zone occupancy entities to zone presence

Rename the 8 zone occupancy binary sensors from `zone_N_occupancy` → `zone_N_presence` in YAML, Python codegen, and C++.

**Files:**
- Modify: `firmware/common/everything-presence-pro-base.yaml:41-80`
- Modify: `firmware/components/epp/__init__.py:22,36-37,88-96`
- Modify: `firmware/components/epp/epp_component.h:49-52,124`
- Modify: `firmware/components/epp/epp_component.cpp:136-139`
- Modify: `custom_components/eppgrid/websocket_api.py:356` (prefix map)
- Modify: `tests/test_websocket_api.py` (any references to `_occupancy`)

- [ ] **Step 1: Update YAML entity names**

In `firmware/common/everything-presence-pro-base.yaml`, rename all 8 zone entities:

```yaml
  zone_occupancy:
    zone_0:
      name: "Zone 0 Presence"
      device_class: occupancy
      disabled_by_default: true
    zone_1:
      name: "Zone 1 Presence"
      device_class: occupancy
      disabled_by_default: true
    # ... same for zone_2 through zone_7
```

Note: Only rename the `name:` field. The YAML key `zone_occupancy` and sub-keys `zone_0` etc. are internal config keys, not entity names. The ESPHome `object_id` is derived from the `name` field, so "Zone 0 Presence" → `zone_0_presence`.

- [ ] **Step 2: Update integration entity prefix map**

In `custom_components/eppgrid/websocket_api.py`, update the prefix map to match new object_id suffix:

```python
_ENTITY_PREFIX_MAP: list[tuple[str, str, str]] = [
    ("zone_", "_presence", "zone_presence"),  # zone_0_presence, zone_1_presence, ...
    ("target_", "_position", "target_xy"),  # target_0_position, target_1_position, ...
]
```

- [ ] **Step 3: Run integration tests**

Run: `python -m pytest tests/test_websocket_api.py -v`
Expected: All tests pass (the entity prefix map change may break tests that use `_occupancy` in mock unique_ids — fix any failures)

- [ ] **Step 4: Update any failing test fixtures**

Search tests for `_occupancy` references and update to `_presence`. For example, mock entity unique_ids like `esphome_aabbccddeeff_zone_0_occupancy` → `esphome_aabbccddeeff_zone_0_presence`.

- [ ] **Step 5: Run integration tests again**

Run: `python -m pytest tests/test_websocket_api.py -v`
Expected: All pass

- [ ] **Step 6: Compile firmware**

Run: `esphome compile firmware/variants/wifi.yaml`
Expected: Successful compilation

- [ ] **Step 7: Commit**

```bash
git add firmware/ custom_components/ tests/
git commit -m "refactor: rename zone_N_occupancy to zone_N_presence"
```

---

### Task 2: Firmware — add new structured HA entities (target + zone + room)

Add 24 new ESPHome entities: 15 target (5 per target × 3), 8 zone target count, 1 room target count.

**Files:**
- Modify: `firmware/common/everything-presence-pro-base.yaml:29-97`
- Modify: `firmware/components/epp/__init__.py`
- Modify: `firmware/components/epp/epp_component.h`

- [ ] **Step 1: Add YAML entity definitions**

In `firmware/common/everything-presence-pro-base.yaml`, add under the `epp:` block, after the existing entities:

```yaml
  target_entities:
    target_1:
      x:
        name: "Target 1 X"
        disabled_by_default: true
        unit_of_measurement: "mm"
      y:
        name: "Target 1 Y"
        disabled_by_default: true
        unit_of_measurement: "mm"
      signal:
        name: "Target 1 Signal"
        disabled_by_default: true
      active:
        name: "Target 1 Active"
        device_class: occupancy
        disabled_by_default: true
      zone:
        name: "Target 1 Zone"
        disabled_by_default: true
    target_2:
      x:
        name: "Target 2 X"
        disabled_by_default: true
        unit_of_measurement: "mm"
      y:
        name: "Target 2 Y"
        disabled_by_default: true
        unit_of_measurement: "mm"
      signal:
        name: "Target 2 Signal"
        disabled_by_default: true
      active:
        name: "Target 2 Active"
        device_class: occupancy
        disabled_by_default: true
      zone:
        name: "Target 2 Zone"
        disabled_by_default: true
    target_3:
      x:
        name: "Target 3 X"
        disabled_by_default: true
        unit_of_measurement: "mm"
      y:
        name: "Target 3 Y"
        disabled_by_default: true
        unit_of_measurement: "mm"
      signal:
        name: "Target 3 Signal"
        disabled_by_default: true
      active:
        name: "Target 3 Active"
        device_class: occupancy
        disabled_by_default: true
      zone:
        name: "Target 3 Zone"
        disabled_by_default: true
  zone_target_counts:
    zone_0:
      name: "Zone 0 Target Count"
      disabled_by_default: true
    zone_1:
      name: "Zone 1 Target Count"
      disabled_by_default: true
    zone_2:
      name: "Zone 2 Target Count"
      disabled_by_default: true
    zone_3:
      name: "Zone 3 Target Count"
      disabled_by_default: true
    zone_4:
      name: "Zone 4 Target Count"
      disabled_by_default: true
    zone_5:
      name: "Zone 5 Target Count"
      disabled_by_default: true
    zone_6:
      name: "Zone 6 Target Count"
      disabled_by_default: true
    zone_7:
      name: "Zone 7 Target Count"
      disabled_by_default: true
  target_count:
    name: "Target Count"
    disabled_by_default: true
```

- [ ] **Step 2: Add Python codegen schema + to_code**

In `firmware/components/epp/__init__.py`, add constants, schemas, and codegen:

```python
# Add constants at top
CONF_TARGET_ENTITIES = "target_entities"
CONF_ZONE_TARGET_COUNTS = "zone_target_counts"
CONF_TARGET_COUNT = "target_count"

# Add schemas
TARGET_ENTITY_SCHEMA = cv.Schema({
    cv.Optional("x"): sensor.sensor_schema(),
    cv.Optional("y"): sensor.sensor_schema(),
    cv.Optional("signal"): sensor.sensor_schema(),
    cv.Optional("active"): binary_sensor.binary_sensor_schema(),
    cv.Optional("zone"): sensor.sensor_schema(),
})

TARGET_ENTITIES_SCHEMA = cv.Schema({
    cv.Optional(f"target_{i}"): TARGET_ENTITY_SCHEMA for i in range(1, 4)
})

ZONE_TARGET_COUNTS_SCHEMA = cv.Schema({
    cv.Optional(f"zone_{i}"): sensor.sensor_schema() for i in range(8)
})

# Add to CONFIG_SCHEMA
cv.Optional(CONF_TARGET_ENTITIES): TARGET_ENTITIES_SCHEMA,
cv.Optional(CONF_ZONE_TARGET_COUNTS): ZONE_TARGET_COUNTS_SCHEMA,
cv.Optional(CONF_TARGET_COUNT): sensor.sensor_schema(),

# Add to to_code()
# Target entities (targets labeled 1-3, mapping to firmware indices 0-2)
if CONF_TARGET_ENTITIES in config:
    te_conf = config[CONF_TARGET_ENTITIES]
    for i in range(1, 4):
        key = f"target_{i}"
        if key in te_conf:
            t = te_conf[key]
            idx = i - 1  # firmware uses 0-based
            if "x" in t:
                sens = await sensor.new_sensor(t["x"])
                cg.add(var.set_target_x_sensor(idx, sens))
            if "y" in t:
                sens = await sensor.new_sensor(t["y"])
                cg.add(var.set_target_y_sensor(idx, sens))
            if "signal" in t:
                sens = await sensor.new_sensor(t["signal"])
                cg.add(var.set_target_signal_sensor(idx, sens))
            if "active" in t:
                sens = await binary_sensor.new_binary_sensor(t["active"])
                cg.add(var.set_target_active_sensor(idx, sens))
            if "zone" in t:
                sens = await sensor.new_sensor(t["zone"])
                cg.add(var.set_target_zone_sensor(idx, sens))

# Zone target counts
if CONF_ZONE_TARGET_COUNTS in config:
    ztc_conf = config[CONF_ZONE_TARGET_COUNTS]
    for i in range(8):
        key = f"zone_{i}"
        if key in ztc_conf:
            sens = await sensor.new_sensor(ztc_conf[key])
            cg.add(var.set_zone_target_count_sensor(i, sens))

# Room-level target count
if CONF_TARGET_COUNT in config:
    sens = await sensor.new_sensor(config[CONF_TARGET_COUNT])
    cg.add(var.set_target_count_sensor(sens))
```

- [ ] **Step 3: Add C++ header declarations**

In `firmware/components/epp/epp_component.h`, add sensor pointers and setters:

```cpp
// In public section, add setters:
void set_target_x_sensor(int index, esphome::sensor::Sensor *sensor) {
    if (index >= 0 && index < NUM_TARGETS) target_x_sensors_[index] = sensor;
}
void set_target_y_sensor(int index, esphome::sensor::Sensor *sensor) {
    if (index >= 0 && index < NUM_TARGETS) target_y_sensors_[index] = sensor;
}
void set_target_signal_sensor(int index, esphome::sensor::Sensor *sensor) {
    if (index >= 0 && index < NUM_TARGETS) target_signal_sensors_[index] = sensor;
}
void set_target_active_sensor(int index, esphome::binary_sensor::BinarySensor *sensor) {
    if (index >= 0 && index < NUM_TARGETS) target_active_sensors_[index] = sensor;
}
void set_target_zone_sensor(int index, esphome::sensor::Sensor *sensor) {
    if (index >= 0 && index < NUM_TARGETS) target_zone_sensors_[index] = sensor;
}
void set_zone_target_count_sensor(int index, esphome::sensor::Sensor *sensor) {
    if (index >= 0 && index < MAX_ZONE_SLOTS) zone_target_count_sensors_[index] = sensor;
}
void set_target_count_sensor(esphome::sensor::Sensor *sensor) {
    target_count_sensor_ = sensor;
}

// In protected section, add member pointers:
// Structured target entity sensors (per-target x, y, signal, active, zone)
esphome::sensor::Sensor *target_x_sensors_[NUM_TARGETS]{};
esphome::sensor::Sensor *target_y_sensors_[NUM_TARGETS]{};
esphome::sensor::Sensor *target_signal_sensors_[NUM_TARGETS]{};
esphome::binary_sensor::BinarySensor *target_active_sensors_[NUM_TARGETS]{};
esphome::sensor::Sensor *target_zone_sensors_[NUM_TARGETS]{};

// Structured zone entity sensors (per-zone target count)
esphome::sensor::Sensor *zone_target_count_sensors_[MAX_ZONE_SLOTS]{};

// Room-level target count
esphome::sensor::Sensor *target_count_sensor_{nullptr};
```

- [ ] **Step 4: Compile firmware**

Run: `esphome compile firmware/variants/wifi.yaml`
Expected: Successful compilation (new entities exist but no publish code yet)

- [ ] **Step 5: Commit**

```bash
git add firmware/
git commit -m "feat: add structured target/zone HA entity definitions"
```

---

### Task 3: Firmware — split publish timers and add publish code

Replace the 2 existing publish timers with 5: entity_target, entity_zone, display, zone_state, system. Add publish code for the new structured entities. Fix the existing bug where `epp_set_pipeline` sets YAML globals instead of component member variables.

**Files:**
- Modify: `firmware/components/epp/epp_component.h` (new interval members + setters)
- Modify: `firmware/components/epp/epp_component.cpp:31-249` (loop rewrite)
- Modify: `firmware/common/everything-presence-pro-base.yaml:316-325` (action params)

- [ ] **Step 1: Add new interval members + setters to header**

In `firmware/components/epp/epp_component.h`, replace the existing interval members and add new setters:

```cpp
// In public section, add new setters (replace existing set_display_interval, set_zone_publish_interval):
void set_entity_target_interval(uint32_t ms) { entity_target_interval_ms_ = ms; }
void set_entity_zone_interval(uint32_t ms) { entity_zone_interval_ms_ = ms; }
void set_display_interval(uint32_t ms) { display_interval_ms_ = ms; }
void set_zone_state_interval(uint32_t ms) { zone_state_interval_ms_ = ms; }

// In protected section, replace existing interval members:
// Publish throttle intervals (ms) — 0 = disabled
uint32_t entity_target_interval_ms_ = 0;
uint32_t entity_zone_interval_ms_ = 0;
uint32_t display_interval_ms_ = 0;
uint32_t zone_state_interval_ms_ = 0;
static constexpr uint32_t SYSTEM_INTERVAL_MS = 1000;

// Publish throttle timestamps
uint32_t last_entity_target_ms_ = 0;
uint32_t last_entity_zone_ms_ = 0;
uint32_t last_display_publish_ms_ = 0;
uint32_t last_zone_state_ms_ = 0;
uint32_t last_system_ms_ = 0;
```

Remove the old `zone_publish_interval_ms_` and `last_zone_publish_ms_` members. Remove the `set_zone_publish_interval` setter.

- [ ] **Step 2: Rewrite the loop publish section**

In `firmware/components/epp/epp_component.cpp`, replace lines 93-248 (the publish section after `last_zone_result_ = result;`) with five timer blocks:

```cpp
  // === PUBLISH THROTTLES (do not affect processing) ===

  // 1. Display publish — internal transport text sensors (frontend only)
  if (display_interval_ms_ > 0 && now - last_display_publish_ms_ >= display_interval_ms_) {
    last_display_publish_ms_ = now;

    // Raw target positions (pre-transform, smoothed)
    for (int i = 0; i < NUM_TARGETS; i++) {
      if (raw_target_sensors_[i] != nullptr) {
        if (win.targets[i].active) {
          char buf[32];
          snprintf(buf, sizeof(buf), "%.0f,%.0f",
                   win.targets[i].median_x, win.targets[i].median_y);
          raw_target_sensors_[i]->publish_state(buf);
        } else {
          raw_target_sensors_[i]->publish_state("");
        }
      }
    }

    // Grid target positions (post-transform, includes pending status)
    for (int i = 0; i < NUM_TARGETS; i++) {
      if (target_position_sensors_[i] != nullptr) {
        if (i < result.target_count && result.targets[i].status != TargetStatus::INACTIVE) {
          char buf[64];
          snprintf(buf, sizeof(buf), "%.0f,%.0f,%s",
                   result.targets[i].x, result.targets[i].y,
                   result.targets[i].status == TargetStatus::ACTIVE ? "active" : "pending");
          target_position_sensors_[i]->publish_state(buf);
        } else {
          target_position_sensors_[i]->publish_state("");
        }
      }
    }
  }

  // 2. Zone state publish — internal transport JSON (frontend only)
  if (zone_state_interval_ms_ > 0 && now - last_zone_state_ms_ >= zone_state_interval_ms_) {
    last_zone_state_ms_ = now;

    if (zone_state_sensor_ != nullptr) {
      const char *static_code = result.static_state == SensorPresenceState::ACTIVE ? "A" :
                                 result.static_state == SensorPresenceState::PENDING ? "P" : "I";
      const char *motion_code = result.motion_state == SensorPresenceState::ACTIVE ? "A" :
                                 result.motion_state == SensorPresenceState::PENDING ? "P" : "I";

      char json[512];
      int pos = snprintf(json, sizeof(json), "{\"targets\":[");
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
      pos += snprintf(json + pos, sizeof(json) - pos, "],\"zones\":{\"occupancy\":[");
      for (int i = 0; i < MAX_ZONE_SLOTS; i++) {
        pos += snprintf(json + pos, sizeof(json) - pos,
            "%s%s", i > 0 ? "," : "", result.zone_occupancy[i] ? "true" : "false");
      }
      pos += snprintf(json + pos, sizeof(json) - pos,
          "],\"tracking\":%s},\"static_state\":\"%s\",\"motion_state\":\"%s\",\"occupancy\":%s,"
          "\"frame_count\":%d,\"debug_log\":\"",
          result.device_tracking_present ? "true" : "false",
          static_code, motion_code, result.occupancy ? "true" : "false", result.frame_count);

      pos += snprintf(json + pos, sizeof(json) - pos,
          "S:%s M:%s Occ:%d|", static_code, motion_code, result.occupancy ? 1 : 0);
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

  // 3. Entity target publish — structured HA entities (automations)
  if (entity_target_interval_ms_ > 0 && now - last_entity_target_ms_ >= entity_target_interval_ms_) {
    last_entity_target_ms_ = now;

    int active_count = 0;
    for (int i = 0; i < NUM_TARGETS; i++) {
      bool active = i < result.target_count && result.targets[i].status != TargetStatus::INACTIVE;
      if (active) active_count++;

      if (target_x_sensors_[i] != nullptr) {
        target_x_sensors_[i]->publish_state(active ? result.targets[i].x : NAN);
      }
      if (target_y_sensors_[i] != nullptr) {
        target_y_sensors_[i]->publish_state(active ? result.targets[i].y : NAN);
      }
      if (target_signal_sensors_[i] != nullptr) {
        target_signal_sensors_[i]->publish_state(
            active ? static_cast<float>(result.targets[i].signal) : 0.0f);
      }
      if (target_active_sensors_[i] != nullptr) {
        target_active_sensors_[i]->publish_state(active);
      }
      if (target_zone_sensors_[i] != nullptr) {
        if (active && (result.targets[i].x != 0.0f || result.targets[i].y != 0.0f)) {
          auto cell = grid_.xy_to_cell(result.targets[i].x, result.targets[i].y);
          if (cell >= 0 && cell < GRID_CELL_COUNT) {
            target_zone_sensors_[i]->publish_state(
                static_cast<float>(grid_.cell_zone(cell)));
          } else {
            target_zone_sensors_[i]->publish_state(NAN);
          }
        } else {
          target_zone_sensors_[i]->publish_state(NAN);
        }
      }
    }
    if (target_count_sensor_ != nullptr) {
      target_count_sensor_->publish_state(static_cast<float>(active_count));
    }
  }

  // 4. Entity zone publish — structured HA entities (automations)
  if (entity_zone_interval_ms_ > 0 && now - last_entity_zone_ms_ >= entity_zone_interval_ms_) {
    last_entity_zone_ms_ = now;

    for (int i = 0; i < MAX_ZONE_SLOTS; i++) {
      if (zone_occupancy_sensors_[i] != nullptr)
        zone_occupancy_sensors_[i]->publish_state(result.zone_occupancy[i]);
      if (zone_target_count_sensors_[i] != nullptr)
        zone_target_count_sensors_[i]->publish_state(
            static_cast<float>(result.zone_target_counts[i]));
    }
  }

  // 5. System publish — always 1Hz, binary outputs + relay
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
          relay_trigger_mode_, relay_contact_mode_,
          result.motion_state != SensorPresenceState::INACTIVE,
          result.static_state != SensorPresenceState::INACTIVE,
          result.occupancy,
      };
      auto relay_result = evaluate_relay(relay_input);
      if (relay_result.should_update) {
        if (relay_result.desired_state != relay_switch_->state) {
          if (relay_result.desired_state) relay_switch_->turn_on();
          else relay_switch_->turn_off();
        }
      }
    }
  }
```

- [ ] **Step 3: Update epp_set_pipeline YAML action**

In `firmware/common/everything-presence-pro-base.yaml`, replace the `epp_set_pipeline` action:

```yaml
    - action: epp_set_pipeline
      variables:
        entity_target_interval: int
        entity_zone_interval: int
        display_interval: int
        zone_state_interval: int
        window_duration: int
      then:
        - lambda: |-
            id(epp_component).set_entity_target_interval(entity_target_interval);
            id(epp_component).set_entity_zone_interval(entity_zone_interval);
            id(epp_component).set_display_interval(display_interval);
            id(epp_component).set_zone_state_interval(zone_state_interval);
            id(epp_component).set_window_duration(window_duration);
```

Also remove the now-unused YAML globals `display_interval_ms` and `zone_publish_interval_ms` from the `globals:` section.

- [ ] **Step 4: Compile firmware**

Run: `esphome compile firmware/variants/wifi.yaml`
Expected: Successful compilation

- [ ] **Step 5: Commit**

```bash
git add firmware/
git commit -m "feat: split firmware publish into 5 timers with structured entity publishing"
```

---

### Task 4: Integration — subscription refcounting and pipeline computation

Add subscriber tracking to `DeviceConnection` and a `_compute_pipeline()` function to derive all intervals.

**Files:**
- Modify: `custom_components/eppgrid/device_manager.py:40-104`
- Modify: `custom_components/eppgrid/websocket_api.py:490-552,555-719`
- Create: `tests/test_pipeline_compute.py`

- [ ] **Step 1: Write failing tests for `_compute_pipeline`**

Create `tests/test_pipeline_compute.py`:

```python
"""Tests for pipeline interval computation."""

from __future__ import annotations

import pytest


class TestComputePipeline:
    """Tests for _compute_pipeline function."""

    def test_all_disabled_no_subscribers(self) -> None:
        """All intervals zero when nothing enabled and no subscribers."""
        from custom_components.eppgrid.websocket_api import _compute_pipeline

        result = _compute_pipeline(
            config={},
            raw_target_subs=0,
            grid_target_subs=0,
        )
        assert result == {
            "entity_target_interval": 0,
            "entity_zone_interval": 0,
            "display_interval": 0,
            "zone_state_interval": 0,
            "window_duration": 1000,
        }

    def test_target_entities_enabled_uses_configured_rate(self) -> None:
        """Target interval uses configured Hz when any target entity is enabled."""
        from custom_components.eppgrid.websocket_api import _compute_pipeline

        result = _compute_pipeline(
            config={
                "settings": {
                    "entities": {"target_xy": True},
                    "target_update_rate_ms": 500,
                },
            },
            raw_target_subs=0,
            grid_target_subs=0,
        )
        assert result["entity_target_interval"] == 500

    def test_target_entities_all_disabled_gives_zero(self) -> None:
        """Target interval is 0 when all target entities are disabled."""
        from custom_components.eppgrid.websocket_api import _compute_pipeline

        result = _compute_pipeline(
            config={
                "settings": {
                    "entities": {
                        "target_xy": False,
                        "target_active": False,
                        "target_signal": False,
                        "target_zone": False,
                    },
                    "target_update_rate_ms": 500,
                },
            },
            raw_target_subs=0,
            grid_target_subs=0,
        )
        assert result["entity_target_interval"] == 0

    def test_zone_entities_enabled_uses_configured_rate(self) -> None:
        """Zone interval uses configured Hz when any zone entity is enabled."""
        from custom_components.eppgrid.websocket_api import _compute_pipeline

        result = _compute_pipeline(
            config={
                "settings": {
                    "entities": {"zone_presence": True},
                    "zone_update_rate_ms": 2000,
                },
            },
            raw_target_subs=0,
            grid_target_subs=0,
        )
        assert result["entity_zone_interval"] == 2000

    def test_zone_entities_all_disabled_gives_zero(self) -> None:
        """Zone interval is 0 when zone_presence and zone_target_count both disabled."""
        from custom_components.eppgrid.websocket_api import _compute_pipeline

        result = _compute_pipeline(
            config={
                "settings": {
                    "entities": {"zone_presence": False, "zone_target_count": False},
                    "zone_update_rate_ms": 1000,
                },
            },
            raw_target_subs=0,
            grid_target_subs=0,
        )
        assert result["entity_zone_interval"] == 0

    def test_raw_subscribers_enable_display(self) -> None:
        """Display interval is 200ms when raw target subscribers exist."""
        from custom_components.eppgrid.websocket_api import _compute_pipeline

        result = _compute_pipeline(config={}, raw_target_subs=1, grid_target_subs=0)
        assert result["display_interval"] == 200

    def test_grid_subscribers_enable_display_and_zone_state(self) -> None:
        """Grid subscribers enable both display (200ms) and zone state (1000ms)."""
        from custom_components.eppgrid.websocket_api import _compute_pipeline

        result = _compute_pipeline(config={}, raw_target_subs=0, grid_target_subs=1)
        assert result["display_interval"] == 200
        assert result["zone_state_interval"] == 1000

    def test_no_subscribers_disables_display_and_zone_state(self) -> None:
        """No subscribers means display and zone state intervals are 0."""
        from custom_components.eppgrid.websocket_api import _compute_pipeline

        result = _compute_pipeline(config={}, raw_target_subs=0, grid_target_subs=0)
        assert result["display_interval"] == 0
        assert result["zone_state_interval"] == 0

    def test_window_duration_from_config(self) -> None:
        """Window duration comes from pipeline config."""
        from custom_components.eppgrid.websocket_api import _compute_pipeline

        result = _compute_pipeline(
            config={"pipeline": {"window_duration": 500}},
            raw_target_subs=0,
            grid_target_subs=0,
        )
        assert result["window_duration"] == 500

    def test_default_rates_when_not_configured(self) -> None:
        """Default to 1000ms (1Hz) when Hz settings not in config."""
        from custom_components.eppgrid.websocket_api import _compute_pipeline

        result = _compute_pipeline(
            config={"settings": {"entities": {"target_xy": True, "zone_presence": True}}},
            raw_target_subs=0,
            grid_target_subs=0,
        )
        assert result["entity_target_interval"] == 1000
        assert result["entity_zone_interval"] == 1000

    def test_single_target_entity_enables_target_interval(self) -> None:
        """Even one enabled target entity category enables the target interval."""
        from custom_components.eppgrid.websocket_api import _compute_pipeline

        result = _compute_pipeline(
            config={"settings": {"entities": {"target_signal": True}}},
            raw_target_subs=0,
            grid_target_subs=0,
        )
        assert result["entity_target_interval"] == 1000
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_pipeline_compute.py -v`
Expected: FAIL — `ImportError: cannot import name '_compute_pipeline'`

- [ ] **Step 3: Implement `_compute_pipeline`**

In `custom_components/eppgrid/websocket_api.py`, add the function (near the other helper functions):

```python
_TARGET_ENTITY_KEYS = ("target_xy", "target_active", "target_signal", "target_zone")
_ZONE_ENTITY_KEYS = ("zone_presence", "zone_target_count")


def _compute_pipeline(
    config: dict[str, Any],
    raw_target_subs: int,
    grid_target_subs: int,
) -> dict[str, int]:
    """Derive all pipeline intervals from current settings and subscriber counts."""
    settings = config.get("settings", {})
    entities = settings.get("entities", {})
    pipeline = config.get("pipeline", {})

    target_rate = settings.get("target_update_rate_ms", 1000)
    zone_rate = settings.get("zone_update_rate_ms", 1000)

    any_target = any(entities.get(k) for k in _TARGET_ENTITY_KEYS)
    any_zone = any(entities.get(k) for k in _ZONE_ENTITY_KEYS)

    has_display_sub = raw_target_subs > 0 or grid_target_subs > 0

    return {
        "entity_target_interval": target_rate if any_target else 0,
        "entity_zone_interval": zone_rate if any_zone else 0,
        "display_interval": 200 if has_display_sub else 0,
        "zone_state_interval": 1000 if grid_target_subs > 0 else 0,
        "window_duration": pipeline.get("window_duration", 1000),
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_pipeline_compute.py -v`
Expected: All pass

- [ ] **Step 5: Add refcount tracking to DeviceConnection**

In `custom_components/eppgrid/device_manager.py`, add subscriber count tracking to the `DeviceConnection` class:

```python
# Add to __init__ (or class attributes):
self.raw_target_subs: int = 0
self.grid_target_subs: int = 0
```

- [ ] **Step 6: Commit**

```bash
git add custom_components/ tests/
git commit -m "feat: add pipeline compute function and subscription refcounting"
```

---

### Task 5: Integration — wire pipeline push to subscribe/unsubscribe/settings

Update the WebSocket handlers to trigger pipeline recomputation on subscribe, unsubscribe, and settings changes.

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py:490-720` (subscribe handlers)
- Modify: `custom_components/eppgrid/websocket_api.py:760-870` (set_settings)
- Modify: `custom_components/eppgrid/websocket_api.py:927-967` (set_pipeline)
- Modify: `custom_components/eppgrid/device_manager.py:313-319` (push_config pipeline section)
- Create: `tests/test_pipeline_push.py`

- [ ] **Step 1: Write failing tests for pipeline push on subscribe**

Create `tests/test_pipeline_push.py`:

```python
"""Tests for pipeline push triggers."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid import async_setup_entry
from custom_components.eppgrid import websocket_api as ws_module

# Reuse setup_integration helper
from tests.test_websocket_api import call_async_handler
from tests.test_websocket_api import setup_integration


class TestPipelinePushOnSubscribe:
    """Pipeline is pushed when frontend subscribes/unsubscribes."""

    async def test_subscribe_raw_targets_pushes_pipeline(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Subscribing to raw targets pushes pipeline with display_interval=200."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {}

        # Create a mock session with subscribe_states
        mock_session = MagicMock()
        mock_session.subscribe_states = MagicMock()
        mock_session.unsubscribe_states = MagicMock()
        mock_session._entities = []
        mock_session.raw_target_subs = 0
        mock_session.grid_target_subs = 0
        mock_dm.get_session = MagicMock(return_value=mock_session)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_raw_targets", "mac": mac}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        # Verify refcount incremented
        assert mock_session.raw_target_subs == 1

        # Verify pipeline was pushed
        mock_dm._push_pipeline_to_device.assert_called_once_with(mac)

    async def test_unsubscribe_raw_targets_pushes_pipeline(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Unsubscribing from raw targets pushes pipeline with display_interval=0."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {}

        mock_session = MagicMock()
        mock_session.subscribe_states = MagicMock()
        mock_session.unsubscribe_states = MagicMock()
        mock_session._entities = []
        mock_session.raw_target_subs = 1  # Already subscribed
        mock_session.grid_target_subs = 0
        mock_dm.get_session = MagicMock(return_value=mock_session)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_raw_targets", "mac": mac}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        # Trigger the unsub callback
        unsub = connection.subscriptions[1]
        unsub()

        assert mock_session.raw_target_subs == 0
        # Pipeline pushed on both subscribe and unsubscribe
        assert mock_dm._push_pipeline_to_device.call_count == 2


class TestPipelinePushOnSettings:
    """Pipeline is pushed when entity settings change."""

    async def test_set_settings_with_entity_changes_pushes_pipeline(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Changing entity toggles in set_settings triggers pipeline push."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {"settings": {}}

        mock_session = MagicMock()
        mock_session.raw_target_subs = 0
        mock_session.grid_target_subs = 0
        mock_dm.get_session = MagicMock(return_value=mock_session)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 1,
            "type": "eppgrid/set_settings",
            "mac": mac,
            "temperature_offset": 0,
            "humidity_offset": 0,
            "illuminance_offset": 0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 6.0,
            "static_auto_distance": True,
            "static_min_distance": 0.3,
            "static_max_distance": 16.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": 0.0,
            "led_mode": "Manual Control",
            "led_brightness": 1.0,
            "led_presence_color": "#CC33FF",
            "relay_trigger_mode": "disabled",
            "relay_contact_mode": "no",
            "entities": {"target_xy": True, "target_active": True},
        }

        await call_async_handler(hass, websocket_set_settings, connection, msg)

        mock_dm._push_pipeline_to_device.assert_called_once_with(mac)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_pipeline_push.py -v`
Expected: FAIL — `_push_pipeline_to_device` not found

- [ ] **Step 3: Add `_push_pipeline_to_device` to DeviceManager**

In `custom_components/eppgrid/device_manager.py`, add a method that computes pipeline and pushes:

```python
async def _push_pipeline_to_device(self, mac: str) -> None:
    """Recompute pipeline intervals and push to device."""
    from .websocket_api import _compute_pipeline

    config = self._store.devices.get(mac, {})
    session = self.get_session(mac)
    raw_subs = session.raw_target_subs if session else 0
    grid_subs = session.grid_target_subs if session else 0

    pipeline = _compute_pipeline(config, raw_subs, grid_subs)
    conn = session or await self._get_or_create_connection(mac)
    if conn is None:
        return
    svc = conn._services.get("epp_set_pipeline")
    if svc:
        await conn._client.execute_service(svc, pipeline)
        _LOGGER.info("Pushed pipeline to %s", mac)
```

Also update `async_push_config` to use the same function for the pipeline section (replacing the old hardcoded pipeline push at lines 313-319):

```python
# Replace the old pipeline push block with:
await self._push_pipeline_to_device(mac)
```

Wait — `async_push_config` is on `DeviceConnection`, while `_push_pipeline_to_device` is on `DeviceManager`. The push needs to happen from the manager level since it needs access to refcounts. Adjust `async_push_config` in `DeviceConnection` to skip the pipeline section, and have `DeviceManager._push_config_to_device` call `_push_pipeline_to_device` after `conn.async_push_config(config)`.

- [ ] **Step 4: Wire subscribe handlers to push pipeline**

In `custom_components/eppgrid/websocket_api.py`, update `websocket_subscribe_raw_targets`:

After `device_conn.subscribe_states(_on_state)` and `connection.send_result(msg["id"])`, add:

```python
    device_conn.raw_target_subs += 1
    manager = _get_manager(hass)
    if manager:
        hass.async_create_task(manager._push_pipeline_to_device(mac))
```

Update the `_unsub` callback:

```python
    @callback
    def _unsub() -> None:
        device_conn.unsubscribe_states(_on_state)
        device_conn.raw_target_subs -= 1
        manager = _get_manager(hass)
        if manager:
            hass.async_create_task(manager._push_pipeline_to_device(mac))
```

Apply the same pattern to `websocket_subscribe_grid_targets` using `grid_target_subs`.

- [ ] **Step 5: Wire set_settings to push pipeline on entity changes**

In `websocket_set_settings`, after the entity handling block, add:

```python
    # Push pipeline if entity settings changed (may affect intervals)
    if entities:
        await manager._push_pipeline_to_device(mac)
```

- [ ] **Step 6: Add new entity keys to settings and entity maps**

In `websocket_api.py`, update `_ENTITY_PREFIX_MAP` and `_ENTITY_OBJECT_ID_MAP` to include the new entity categories:

```python
_ENTITY_OBJECT_ID_MAP: dict[str, str] = {
    "occupancy": "room_occupancy",
    "static_presence": "room_static_presence",
    "motion_presence": "room_motion_presence",
    "target_presence": "room_target_presence",
    "temperature": "env_temperature",
    "humidity": "env_humidity",
    "illuminance": "env_illuminance",
    "co2": "env_co2",
    "system_alarm_relay": "relay_output",
    "target_count": "target_count",
}

_ENTITY_PREFIX_MAP: list[tuple[str, str, str]] = [
    ("zone_", "_presence", "zone_presence"),
    ("zone_", "_target_count", "zone_target_count"),
    ("target_", "_position", "target_xy"),
    ("target_", "_x", "target_xy"),
    ("target_", "_y", "target_xy"),
    ("target_", "_signal", "target_signal"),
    ("target_", "_active", "target_active"),
    ("target_", "_zone", "target_zone"),
]
```

Also update `_SETTINGS_KEYS` to include the new rate settings, and update the `set_settings` voluptuous schema to accept optional rate fields:

```python
vol.Optional("target_update_rate_ms"): vol.All(vol.Coerce(int), vol.In([200, 500, 1000, 2000])),
vol.Optional("zone_update_rate_ms"): vol.All(vol.Coerce(int), vol.In([200, 500, 1000, 2000])),
```

In the handler, persist rate settings:

```python
    if "target_update_rate_ms" in msg:
        device_config.setdefault("settings", {})["target_update_rate_ms"] = msg["target_update_rate_ms"]
    if "zone_update_rate_ms" in msg:
        device_config.setdefault("settings", {})["zone_update_rate_ms"] = msg["zone_update_rate_ms"]
```

- [ ] **Step 7: Update `websocket_set_pipeline` to use new parameters**

Replace the existing `websocket_set_pipeline` command validation and handler to accept the new 5-parameter schema:

```python
@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/set_pipeline",
        vol.Required("mac"): str,
        vol.Required("entity_target_interval"): vol.All(vol.Coerce(int), vol.Range(min=0, max=2000)),
        vol.Required("entity_zone_interval"): vol.All(vol.Coerce(int), vol.Range(min=0, max=2000)),
        vol.Required("display_interval"): vol.All(vol.Coerce(int), vol.Range(min=0, max=1000)),
        vol.Required("zone_state_interval"): vol.All(vol.Coerce(int), vol.Range(min=0, max=2000)),
        vol.Required("window_duration"): vol.All(vol.Coerce(int), vol.Range(min=200, max=2000)),
    }
)
```

Note: The `set_pipeline` command is now primarily used as an internal mechanism. The frontend sends entity/rate changes via `set_settings`, which triggers `_push_pipeline_to_device`. The `set_pipeline` command remains for direct control / debugging.

- [ ] **Step 8: Run all tests**

Run: `python -m pytest tests/ -v`
Expected: All pass. Fix any failures caused by the schema changes.

- [ ] **Step 9: Commit**

```bash
git add custom_components/ tests/
git commit -m "feat: wire pipeline push to subscribe/unsubscribe/settings triggers"
```

---

### Task 6: Integration — persist new entity keys and handle rate settings in set_settings

Ensure the new entity toggle keys (`target_active`, `target_signal`, `target_zone`, `zone_target_count`) and rate settings (`target_update_rate_ms`, `zone_update_rate_ms`) are properly persisted and restored.

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py:830-870` (set_settings entity persistence)
- Modify: `tests/test_websocket_api.py` (add tests for new keys)

- [ ] **Step 1: Write failing test for new entity key persistence**

Add to `tests/test_websocket_api.py` or `tests/test_pipeline_push.py`:

```python
class TestNewEntityKeyPersistence:
    """Tests for persisting new entity toggle keys."""

    async def test_set_settings_persists_target_active(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """target_active flag persists in stored settings."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {"settings": {}}

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = _make_settings_msg(mac, entities={"target_active": True})

        await call_async_handler(hass, websocket_set_settings, connection, msg)

        stored = mock_dm._store.devices[mac]["settings"]
        assert stored["target_active"] is True

    async def test_set_settings_persists_rate_settings(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Hz rate settings persist in stored settings."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {"settings": {}}

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = _make_settings_msg(mac, target_update_rate_ms=500, zone_update_rate_ms=2000)

        await call_async_handler(hass, websocket_set_settings, connection, msg)

        stored = mock_dm._store.devices[mac]["settings"]
        assert stored["target_update_rate_ms"] == 500
        assert stored["zone_update_rate_ms"] == 2000
```

(Create a `_make_settings_msg` helper that builds a full valid `set_settings` message with given overrides, to avoid duplicating the 20+ required fields in every test.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_pipeline_push.py::TestNewEntityKeyPersistence -v`
Expected: FAIL

- [ ] **Step 3: Update set_settings handler for new persisted keys**

In `websocket_set_settings`, update the `persisted_entity_keys` tuple:

```python
persisted_entity_keys = (
    "zone_presence", "target_xy",
    "target_active", "target_signal", "target_zone",
    "zone_target_count",
)
```

And add rate persistence after settings save:

```python
    # Persist rate settings
    rate_keys = ("target_update_rate_ms", "zone_update_rate_ms")
    for rk in rate_keys:
        if rk in msg:
            device_config.setdefault("settings", {})[rk] = msg[rk]
```

Also update the preservation block so new entity keys survive set_settings calls (same pattern as zone_presence/target_xy):

```python
    for ekey in persisted_entity_keys:
        if ekey in old_settings:
            new_settings[ekey] = old_settings[ekey]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/ -v`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add custom_components/ tests/
git commit -m "feat: persist new entity toggle keys and rate settings"
```

---

### Task 7: Frontend — add zone and target settings groups

Add the Zone Level and Target Level groups with entity toggles and Hz dropdowns to the settings view.

**Files:**
- Modify: `frontend/src/components/epp-settings-view.ts` (render + _emitSave + _overrides)
- Modify: `frontend/src/__tests__/components/epp-settings-view.test.ts`

- [ ] **Step 1: Write failing frontend test for new entity toggles**

In `frontend/src/__tests__/components/epp-settings-view.test.ts`, add:

```typescript
describe("zone and target entity groups", () => {
	it("renders zone_target_count toggle", () => {
		const el = createView();
		const root = el.renderRoot ?? el.shadowRoot ?? el;
		const result = el.render();
		// Check that zone_target_count entity key checkbox exists
		const checkbox = root.querySelector('[data-entity-key="zone_target_count"]');
		// This will be null until we add the UI
		expect(checkbox).toBeDefined();
	});

	it("renders target update rate select", () => {
		const el = createView();
		el.requestUpdate();
		const root = el.renderRoot ?? el.shadowRoot ?? el;
		const result = el.render();
		// Check for target rate select
		const selects = root.querySelectorAll("ha-select");
		const rateSelect = Array.from(selects).find(
			(s: any) => s.dataset?.settingKey === "target_update_rate_ms"
		);
		expect(rateSelect).toBeDefined();
	});

	it("emitSave includes rate settings", () => {
		const el = createView();
		(el as any)._overrides = {
			targetUpdateRateMs: 500,
			zoneUpdateRateMs: 2000,
		};
		let detail: any;
		el.addEventListener("save", (e: any) => { detail = e.detail; });
		(el as any)._emitSave();
		expect(detail.target_update_rate_ms).toBe(500);
		expect(detail.zone_update_rate_ms).toBe(2000);
	});

	it("disables target rate when all target entities off", () => {
		const el = createView({
			entitiesConfig: {
				target_xy: false,
				target_active: false,
				target_signal: false,
				target_zone: false,
			},
		});
		const root = el.renderRoot ?? el.shadowRoot ?? el;
		const result = el.render();
		const rateSelect = root.querySelector(
			'[data-setting-key="target_update_rate_ms"]'
		) as HTMLElement;
		// Rate select should be disabled
		expect(rateSelect?.hasAttribute("disabled")).toBe(true);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- --reporter verbose`
Expected: FAIL — new elements not found in rendered output

- [ ] **Step 3: Add properties for rate settings**

In `epp-settings-view.ts`, add properties:

```typescript
@property({ type: Number }) targetUpdateRateMs = 1000;
@property({ type: Number }) zoneUpdateRateMs = 1000;
```

Add to `_overrides` type and initialization.

- [ ] **Step 4: Add Zone Level group to render**

In the Reporting section of `render()`, add the Zone Level group after the existing zone_presence toggle. Replace the standalone zone_presence toggle with a group:

```typescript
// Zone Level group
<div class="settings-group">
  <h4>Zone Level</h4>
  <div class="setting-row">
    <span>Presence</span>
    <label class="toggle-switch">
      <input type="checkbox"
        @change=${this._entityToggle}
        data-entity-key="zone_presence"
        .checked=${isOn("zone_presence", true)}
        .disabled=${!this.perspective} />
      <span class="toggle-slider"></span>
    </label>
  </div>
  <div class="setting-row">
    <span>Target Count</span>
    <label class="toggle-switch">
      <input type="checkbox"
        @change=${this._entityToggle}
        data-entity-key="zone_target_count"
        .checked=${isOn("zone_target_count", false)}
        .disabled=${!this.perspective} />
      <span class="toggle-slider"></span>
    </label>
  </div>
  <div class="setting-row">
    <span>Update Rate</span>
    <ha-select
      data-setting-key="zone_update_rate_ms"
      .value=${String(o.zoneUpdateRateMs ?? this.zoneUpdateRateMs)}
      .disabled=${!anyZoneOn}
      @selected=${(e: CustomEvent<{ value: string }>) => {
        const val = e.detail.value;
        if (val) {
          this._overrides.zoneUpdateRateMs = Number(val);
          this._fireDirty();
          this.requestUpdate();
        }
      }}
      @closed=${(e: Event) => e.stopPropagation()}>
      <mwc-list-item value="200">5 Hz</mwc-list-item>
      <mwc-list-item value="500">2 Hz</mwc-list-item>
      <mwc-list-item value="1000">1 Hz</mwc-list-item>
      <mwc-list-item value="2000">0.5 Hz</mwc-list-item>
    </ha-select>
  </div>
</div>
```

Where `anyZoneOn` is computed:

```typescript
const anyZoneOn = isOn("zone_presence", true) || isOn("zone_target_count", false);
```

- [ ] **Step 5: Add Target Level group to render**

Same pattern as zone group, with toggles for `target_xy`, `target_active`, `target_signal`, `target_zone`, and a rate dropdown for `target_update_rate_ms`.

```typescript
const anyTargetOn = isOn("target_xy", false) || isOn("target_active", false)
    || isOn("target_signal", false) || isOn("target_zone", false);
```

- [ ] **Step 6: Update _emitSave to include rate settings**

In `_emitSave()`, add to the detail payload:

```typescript
target_update_rate_ms: o.targetUpdateRateMs ?? this.targetUpdateRateMs,
zone_update_rate_ms: o.zoneUpdateRateMs ?? this.zoneUpdateRateMs,
```

- [ ] **Step 7: Run frontend tests**

Run: `cd frontend && npm test -- --reporter verbose`
Expected: All pass

- [ ] **Step 8: Build frontend**

Run: `cd frontend && npm run build`
Expected: Successful build

- [ ] **Step 9: Commit**

```bash
git add frontend/
git commit -m "feat: add zone and target entity groups with Hz dropdowns to settings"
```

---

### Task 8: Update data catalog and run full test suite

Update the backend data catalog to reflect all changes.

**Files:**
- Modify: `docs/backend-data-catalog.md`

- [ ] **Step 1: Update entity tables in data catalog**

In `docs/backend-data-catalog.md`, update the "ESPHome Entities" section:

- Add new entities: target_N_x, target_N_y, target_N_signal, target_N_active, target_N_zone (N=1-3), zone_N_target_count (N=0-7), target_count
- Rename zone_N_occupancy → zone_N_presence
- Update the pipeline action documentation to show 5 parameters
- Update the `set_settings` command to document new optional fields: `target_update_rate_ms`, `zone_update_rate_ms`, and new entity keys
- Update the "Firmware Data Pipeline" section to show 5 publish timers
- Document the conditional publishing behavior (intervals gated by entity enables and frontend subscriptions)

- [ ] **Step 2: Run full integration test suite**

Run: `python -m pytest tests/ -v`
Expected: All pass

- [ ] **Step 3: Run full frontend test suite**

Run: `cd frontend && npm test -- --reporter verbose`
Expected: All pass

- [ ] **Step 4: Build frontend**

Run: `cd frontend && npm run build`
Expected: Successful build

- [ ] **Step 5: Compile firmware**

Run: `esphome compile firmware/variants/wifi.yaml`
Expected: Successful compilation

- [ ] **Step 6: Commit**

```bash
git add docs/ 
git commit -m "docs: update data catalog for conditional publish"
```

---

### Task 9: Integration test — end-to-end pipeline flow

Verify the full flow: settings change → pipeline compute → correct intervals pushed.

**Files:**
- Modify: `tests/test_pipeline_push.py`

- [ ] **Step 1: Write end-to-end test**

```python
class TestEndToEndPipelineFlow:
    """Full flow: entity enables + subscriber counts → correct pipeline pushed."""

    async def test_full_flow_entities_enabled_with_frontend(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """With target_xy enabled at 2Hz and frontend subscribed, all intervals set."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {
            "settings": {
                "entities": {"target_xy": True, "zone_presence": True},
                "target_update_rate_ms": 500,
                "zone_update_rate_ms": 1000,
            },
            "pipeline": {"window_duration": 800},
        }

        mock_session = MagicMock()
        mock_session.raw_target_subs = 0
        mock_session.grid_target_subs = 1  # Frontend connected
        mock_session._services = {"epp_set_pipeline": MagicMock()}
        mock_session._client = MagicMock()
        mock_session._client.execute_service = AsyncMock()
        mock_dm.get_session = MagicMock(return_value=mock_session)

        await mock_dm._push_pipeline_to_device(mac)

        call_args = mock_session._client.execute_service.call_args
        pipeline = call_args[0][1]  # second positional arg is the data dict
        assert pipeline["entity_target_interval"] == 500
        assert pipeline["entity_zone_interval"] == 1000
        assert pipeline["display_interval"] == 200
        assert pipeline["zone_state_interval"] == 1000
        assert pipeline["window_duration"] == 800

    async def test_full_flow_no_entities_no_frontend(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """With nothing enabled and no frontend, all intervals are 0."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {}

        mock_session = MagicMock()
        mock_session.raw_target_subs = 0
        mock_session.grid_target_subs = 0
        mock_session._services = {"epp_set_pipeline": MagicMock()}
        mock_session._client = MagicMock()
        mock_session._client.execute_service = AsyncMock()
        mock_dm.get_session = MagicMock(return_value=mock_session)

        await mock_dm._push_pipeline_to_device(mac)

        call_args = mock_session._client.execute_service.call_args
        pipeline = call_args[0][1]
        assert pipeline["entity_target_interval"] == 0
        assert pipeline["entity_zone_interval"] == 0
        assert pipeline["display_interval"] == 0
        assert pipeline["zone_state_interval"] == 0
```

- [ ] **Step 2: Run tests**

Run: `python -m pytest tests/test_pipeline_push.py::TestEndToEndPipelineFlow -v`
Expected: All pass (implementation done in previous tasks)

- [ ] **Step 3: Commit**

```bash
git add tests/
git commit -m "test: add end-to-end pipeline flow tests"
```

---

### Task 10: Flash firmware and verify on hardware

Build and flash the full implementation, then verify the pipeline push works end-to-end on real hardware.

- [ ] **Step 1: Flash firmware**

Run: `esphome run firmware/variants/wifi.yaml --device 192.168.20.214` (background)
Expected: OTA successful

- [ ] **Step 2: Restart HA**

Run: `ha-wt restart epp-chatty`

- [ ] **Step 3: Open frontend and verify**

Open the EPP Grid panel, navigate to a device, verify:
- Settings page shows Zone Level and Target Level groups
- Hz dropdowns work
- Enabling/disabling entity toggles works
- Live view still shows target positions (display interval active)
- Closing the frontend tab stops publishing (check firmware logs)

- [ ] **Step 4: Run pre-push checks**

Run: `python -m pytest tests/ -v && cd frontend && npm test && npm run build`
Expected: All pass

- [ ] **Step 5: Final commit if needed**

Fix any issues discovered during hardware testing.
