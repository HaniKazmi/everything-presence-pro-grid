# Backend Data Catalog

Data flows between firmware, integration, and frontend.

## Architecture

```
ESPHome firmware (ESP32)
  ├── LD2450 UART → rolling median → perspective transform → zone engine
  ├── SEN0609 GPIO → static presence
  ├── SHTC3/BH1750 → temperature, humidity, illuminance
  └── publishes ESPHome entities + text sensor streams

HA Integration (eppgrid)
  ├── discovers ESPHome devices with zone_engine_version
  ├── opens aioesphomeapi connection for frontend sessions
  ├── subscribe_states → fans out to subscription handlers
  ├── stores config in EPPGridStore → pushes to device via API actions
  └── manages ESPHome entity enable/disable/rename

Frontend (eppgrid-panel.ts — orchestrator)
  ├── subscribe_device → opens session connection
  ├── subscribe_grid_targets → structured events (positions, zones, sensors)
  ├── subscribe_raw_targets → raw sensor-space positions
  ├── orchestrator wires DeviceController callbacks → TargetController → panel state
  ├── commands: set_setup, set_room_layout, set_env_calibration, etc.
  ├── controllers/
  │   ├── device-controller.ts — WS subscriptions, device loading
  │   ├── grid-state-controller.ts — grid/zone/furniture mutation, templates
  │   └── target-controller.ts — target/sensor/zone state, zone engine, debug logs
  ├── components/
  │   ├── epp-wizard.ts — calibration wizard (guide, corners, capture)
  │   ├── epp-live-view.ts — live overview composite (grid, sidebar, menu)
  │   ├── epp-editor-view.ts — zone/furniture editor composite
  │   ├── epp-settings-view.ts — device settings (accordions, ranges, reporting)
  │   ├── epp-grid.ts — shared grid renderer (live + editor)
  │   ├── epp-live-sidebar.ts — sensor/zone status display
  │   ├── epp-zone-sidebar.ts — zone list + type controls
  │   ├── epp-furniture-sidebar.ts — furniture catalog + custom icons
  │   └── epp-furniture-overlay.ts — furniture drag/resize/rotate
  └── lib/
      └── zone-engine.ts — pure-function zone occupancy state machine
```

## 1. ESPHome Entities

All entities are created by ESPHome firmware with `disabled_by_default` where appropriate. The integration manages enable/disable/rename.

### Enabled by Default

| Entity | Type | Source |
|--------|------|--------|
| Occupancy | binary_sensor | zone engine processed (active/pending = on, inactive = off) |
| Zone Engine Version | text_sensor | firmware version string |
| Config Protocol | sensor | config protocol version integer (e.g. `1`) |
| Current Connections | sensor | current API client count (diagnostic, accuracy_decimals=0) |

### Disabled by Default

| Entity | Type | Source |
|--------|------|--------|
| Temperature | sensor | SHTC3 + calibration offset |
| Humidity | sensor | SHTC3 + calibration offset |
| Illuminance | sensor | BH1750 + calibration offset |
| Motion Presence | binary_sensor | zone engine processed (active/pending = on, inactive = off) |
| Static Presence | binary_sensor | zone engine processed (active/pending = on, inactive = off) |
| Target Presence | binary_sensor | zone engine device-level tracking |
| Tracking Presence | binary_sensor | LD2450 any-target-detected |
| Zone 0-7 Presence | binary_sensor | zone engine per-zone state |
| Target 1-3 Position | text_sensor | "x,y,status" post-transform |
| Raw Target 1-3 | text_sensor | "x,y" pre-transform (sensor-space) |
| Zone State | text_sensor | JSON with zone engine tick results |
| Target 1-3 X | sensor (mm) | per-target X position post-transform |
| Target 1-3 Y | sensor (mm) | per-target Y position post-transform |
| Target 1-3 Signal | sensor | per-target signal strength |
| Target 1-3 Active | binary_sensor | per-target active flag |
| Target 1-3 Zone | sensor | zone index the target currently occupies |
| Zone 0-7 Target Count | sensor | number of active targets in each zone |
| Target Count | sensor | total number of active targets |

## 2. Live Streaming

Two websocket subscriptions, both using the same device session connection.

### `subscribe_device` — session lifecycle

Opens the aioesphomeapi connection. Closes on unsubscribe.

**Request:** `{ "type": "eppgrid/subscribe_device", "mac": str }`

### `subscribe_raw_targets` — calibration & FOV overlay

Parses Raw Target text sensor updates into structured events.

**Request:** `{ "type": "eppgrid/subscribe_raw_targets", "mac": str }`

**Event payload:**
```json
{
    "targets": [
        {"raw_x": 1234.0, "raw_y": -567.0},
        {"raw_x": null, "raw_y": null},
        {"raw_x": null, "raw_y": null}
    ]
}
```

### `subscribe_grid_targets` — live overview & zone editor

Parses Target Position, Zone State, and sensor entity updates into structured events.

**Request:** `{ "type": "eppgrid/subscribe_grid_targets", "mac": str }`

**Event payload:**
```json
{
    "targets": [
        {"x": 1500.0, "y": 2000.0, "signal": 5, "status": "active"},
        {"x": null, "y": null, "signal": 0, "status": "inactive"},
        {"x": null, "y": null, "signal": 0, "status": "inactive"}
    ],
    "sensors": {
        "occupancy": true,
        "static_presence": false,
        "motion_presence": false,
        "target_presence": true,
        "static_state": "I",
        "motion_state": "P",
        "occupancy_state": true,
        "temperature": 22.5,
        "humidity": 45.0,
        "illuminance": 120.0,
        "co2": null
    },
    "zones": {
        "occupancy": {"0": true, "1": false},
        "target_counts": {},
        "frame_count": 10,
        "debug_log": "S:I M:P Occ:1|T0:Z1:A:9|Z1:O:9"
    }
}
```

**Data rates:**
- Target entity sensors (X, Y, signal, active, zone) + target_count: at entity_target_interval (user-configured Hz), only published when the corresponding entity toggle is enabled
- Zone entity sensors (presence, target_count): at entity_zone_interval (user-configured Hz), only published when the corresponding entity toggle is enabled
- Display stream (raw + grid text sensors): at display_interval (200ms default), only published when at least one frontend session is subscribed
- Zone state JSON: at zone_state_interval (1000ms default), only published when at least one frontend session is subscribed
- System outputs (device tracking, presence binary sensors, relay): fixed 1000ms regardless of frontend subscription

## 3. Commands

### `list_devices`

Returns discovered EPP devices.

**Request:** `{ "type": "eppgrid/list_devices" }`
**Response:**
```json
{
    "devices": [
        {
            "mac": "AA:BB:CC:DD:EE:FF",
            "name": "Living Room Sensor",
            "host": "192.168.1.50",
            "available": true,
            "configured": true,
            "config_protocol_status": "compatible",
            "current_connection_count": 1,
            "bluetooth_enabled": false,
            "co2_enabled": true,
            "ethernet_enabled": false,
            "board_revision": "v2",
            "sensor_variant": "ld2450",
            "firmware_channel": "stable",
            "model": "epp-pro"
        }
    ]
}
```

`config_protocol_status` is `"compatible"`, `"firmware_behind"`, or `"firmware_ahead"` — comparing the device's `Config Protocol` sensor value to the integration's `CONFIG_PROTOCOL_VERSION`.

The build flag fields (`bluetooth_enabled`, `co2_enabled`, `ethernet_enabled`, `board_revision`, `sensor_variant`, `firmware_channel`, `model`) are optional — they are only present after the device has connected and build flags have been fetched via the `get_build_flags` API action.

### `get_config`

Returns stored config for a device.

**Request:** `{ "type": "eppgrid/get_config", "mac": str }`
**Response:** `{ "config": {...} }` — calibration, room_layout, env_calibration, etc.

### `update_firmware`

Triggers OTA firmware update on a device via its ESPHome update entity.

**Request:** `{ "type": "eppgrid/update_firmware", "mac": str }`

### Protocol Version Guard

All config commands (`set_setup`, `set_room_layout`, `set_entity_enabled`, `set_settings`, `set_pipeline`) check `config_protocol_status` before executing. On mismatch, they return an error with code `"firmware_behind"` or `"firmware_ahead"`.

### `set_setup`

Saves perspective calibration. Clears room layout. Pushes to device. Sets `settings.zone_presence` to `true` on calibration (`room_width > 0`) or `false` on delete (`room_width = 0`), then calls `async_update_zone_entities` to enable/disable zone entities accordingly.

**Request:** `{ "type": "eppgrid/set_setup", "mac": str, "perspective": float[8], "room_width": float, "room_depth": float }`

### `set_room_layout`

Saves grid, zones, room settings, furniture. Pushes config to device. Updates zone entity enable/disable/rename via `async_update_zone_entities`. Zone presence entities are named `"Zone {name}"` (e.g. `"Zone Armchair"`), target count entities `"Zone {name} Target Count"`. Zone 0 uses `"Zone Rest of Room"` / `"Zone Rest of Room Target Count"`.

**Request:** `{ "type": "eppgrid/set_room_layout", "mac": str, "grid_bytes": int[], "zone_slots": list, "room_type": str, ... }`

Each cell in `grid_bytes` is a uint8 with bit layout: bit 0 = room (inside/outside), bits 1-3 = zone (0-7), bit 4 = entry/exit overlay (bypasses gating on entry, uses handoff timeout on exit), bits 5-7 = interference level (0=none, 1=interference source, 2=suppress detection).

### `set_entity_enabled`

Enables/disables an ESPHome entity.

**Request:** `{ "type": "eppgrid/set_entity_enabled", "mac": str, "entity_id": str, "enabled": bool }`

### `set_settings`

Saves all device settings (offsets, timeouts, distances, thresholds, LED, relay, entities, log levels) in one call. Pushes full config to device. Auto-enables/disables relay switch entity based on `relay_trigger_mode`. When `entities` is provided and modifies `disabled_by`, sets `_entity_update_macs` guard to suppress the redundant reconnect push caused by the ESPHome config entry reload. When `entities.zone_presence` is provided, persists to `settings.zone_presence` and calls `async_update_zone_entities` (if enabling) for layout-aware zone naming.

**Request:** `{ "type": "eppgrid/set_settings", "mac": str, "temperature_offset": float, ..., "led_mode": str, "led_brightness": float, "led_presence_color": str, "static_led_enabled": bool, "relay_trigger_mode": str, "relay_contact_mode": str, "entities": { ... }, "log_levels": { ... } }`

**LED settings:**

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `led_mode` | string | `"Manual Control"` | One of: Manual Control, Occupancy, Environmental, Environmental + Occupancy |
| `led_brightness` | float | `1.0` | RGB LED brightness multiplier (0.1–1.0) |
| `led_presence_color` | string | `"#CC33FF"` | Hex RGB color for occupancy indication |
| `static_led_enabled` | bool | `true` | Enable/disable SEN0609 indicator LED |

**Relay settings:**

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `relay_trigger_mode` | string | `"disabled"` | One of: disabled, motion, presence, occupancy |
| `relay_contact_mode` | string | `"no"` | One of: no (Normally Open), nc (Normally Closed) |

**Update rate settings (optional):**

| Key | Type | Valid values | Description |
|-----|------|-------------|-------------|
| `target_update_rate_ms` | int | 200, 500, 1000, 2000 | Target entity sensor publish rate (stored in `settings.target_update_rate_ms`) |
| `zone_update_rate_ms` | int | 200, 500, 1000, 2000 | Zone entity sensor publish rate (stored in `settings.zone_update_rate_ms`) |

**Entity toggle keys (within `entities` dict) — additions:**

| Key | Description |
|-----|-------------|
| `target_active` | Enable/disable Target 1-3 Active binary sensors |
| `target_signal` | Enable/disable Target 1-3 Signal sensors |
| `target_zone` | Enable/disable Target 1-3 Zone sensors |
| `zone_target_count` | Enable/disable Zone 0-7 Target Count sensors |

**Firmware push:** LED mode/brightness/color pushed via `epp_set_led` action (mode, brightness, presence_red/green/blue as 0.0–1.0 floats). SEN0609 LED toggle passed through existing `epp_set_static_presence` action's `led_enabled` parameter. Relay settings pushed via `epp_set_relay` action (trigger_mode, contact_mode).

### `set_distance_override`

Pushes tracking + static presence ranges to firmware via session without persisting. Used by the editor to temporarily widen ranges on entry (so the sensor sees the full area) and revert on cancel.

**Request:** `{ "type": "eppgrid/set_distance_override", "mac": str, "target_max_distance": float, "static_min_distance": float, "static_max_distance": float }`

### `set_pipeline`

Saves and pushes all publish intervals and window duration.

**Request:** `{ "type": "eppgrid/set_pipeline", "mac": str, "entity_target_interval": int, "entity_zone_interval": int, "display_interval": int, "zone_state_interval": int, "window_duration": int }`

| Parameter | Description |
|-----------|-------------|
| `entity_target_interval` | Publish interval for target entity sensors (X, Y, signal, active, zone, target_count) |
| `entity_zone_interval` | Publish interval for zone entity sensors (presence, target_count per zone) |
| `display_interval` | Publish interval for raw + grid text sensor streams (frontend only) |
| `zone_state_interval` | Publish interval for zone state JSON text sensor (frontend only) |
| `window_duration` | Rolling median window duration |

### Template Commands

| Command | Description |
|---------|------------|
| `list_templates` | List saved room templates |
| `save_template` | Save a room template |
| `delete_template` | Delete a room template |
| `apply_template` | Apply a template to a device |

### Flasher Commands

#### `list_flashable_devices`

Returns all ESPHome devices matching EPP manufacturer/model, regardless of whether they run original or EPP Grid firmware.

**Request:** `{ "type": "eppgrid/list_flashable_devices" }`
**Response:**
```json
{
    "devices": [
        {
            "mac": "AA:BB:CC:DD:EE:FF",
            "name": "Presence Pro Kitchen",
            "host": "192.168.1.42",
            "available": false,
            "firmware_type": "original",
            "firmware_version": "1.8.0",
            "update_available": false,
            "esphome_config_entry_id": "abc123"
        }
    ]
}
```

`firmware_type` is `"original"` (no `zone_engine_version` entity) or `"eppgrid"` (has `zone_engine_version` entity). `update_available` is `true` when the device runs EPP Grid firmware and a newer version is available. `firmware_version` is the current firmware version string.

#### `delete_esphome_device`

Removes an ESPHome config entry (used to clean up after flashing).

**Request:** `{ "type": "eppgrid/delete_esphome_device", "config_entry_id": str }`

#### `add_esphome_device`

Triggers the ESPHome config flow for a given host (used to add a freshly-flashed device).

**Request:** `{ "type": "eppgrid/add_esphome_device", "host": str }`

## 4. Firmware Data Pipeline

```
LD2450 UART (~10Hz)
  → rolling median (window_duration, computed every frame)
    → perspective transform (every frame)
      → zone engine (every frame, counts frames per zone)

Publishing (5 independent output timers):
  → entity_target   → user Hz   target_N_{x,y,signal,active,zone} + target_count
                                 (only published when entity enable flag is set)
  → entity_zone     → user Hz   zone_N_{presence,target_count}
                                 (only published when entity enable flag is set)
  → display         → 200ms     raw + grid text sensors
                                 (only published when frontend is subscribed)
  → zone_state      → 1000ms    zone state JSON text sensor
                                 (only published when frontend is subscribed)
  → system          → 1000ms    device tracking + presence outputs + relay
                                 (always published)
```

### Debug Log Format

Both firmware and frontend zone engine produce the same raw format:

```
T0:Z1:A:9 T1:Z0:P:3|Z0:O:9 Z1:P:3
```

- Before `|`: targets — `T{idx}:Z{zone_id}:{A|P}:{signal}`
- After `|`: zones — `Z{zone_id}:{O|P}:{signal}`

The frontend enricher replaces zone IDs with names for display.

## 5. Configuration Storage

`EPPGridStore` persists per-device config keyed by MAC:

```python
{
    "AA:BB:CC:DD:EE:FF": {
        "calibration": {"perspective": [8 floats], "room_width": float, "room_depth": float},
        "room_layout": {"grid_bytes": [400 ints], "zone_slots": [...], "room_type": str, ...},
        "env_calibration": {"temperature_offset": float, "humidity_offset": float, "illuminance_offset": float},
        "motion_timeout": {"timeout": float},
        "tracking": {"max_range": float},
        "static_presence": {"min_range": float, "max_range": float, ...},
        "relay": {"trigger_mode": str, "contact_mode": str},
        "pipeline": {"entity_target_interval": int, "entity_zone_interval": int, "display_interval": int, "zone_state_interval": int, "window_duration": int},
    }
}
```

All config is pushed to the device on save and on reconnect. The push
prefers the existing frontend session connection when one is active
(avoids the ESP32 concurrent connection limit); otherwise it creates a
temporary connection (e.g., on-boot push when no frontend is open).
