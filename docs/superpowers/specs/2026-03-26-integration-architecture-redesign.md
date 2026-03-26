# EPP Grid Integration Architecture Redesign

## Summary

Restructure the eppgrid HA integration from a full device manager (own API connection, own entities, own zone engine) into a lightweight layer on top of ESPHome. ESPHome owns the device connection and entities. eppgrid provides device discovery, configuration management, and the calibration UI.

## Motivation

The current architecture creates ~45 duplicate entities alongside ESPHome, maintains its own API connection to the device, and runs a parallel Python zone engine. This causes confusion about which entities are authoritative, entity naming conflicts, and unnecessary complexity. The firmware zone engine now handles all zone processing — the HA integration only needs to push config and provide a UI.

## Architecture

### Integration Lifecycle

- **Auto-setup on install.** No config flow. Adding the integration creates a single config entry automatically.
- **Config option:** `sidebar_panel: true` (default) — can be disabled for users who prefer a dashboard card.
- **No entity platforms.** The integration creates zero entities. ESPHome owns all device entities.

### Storage (`.storage/eppgrid`)

Single storage file with two top-level keys:

```json
{
  "version": 1,
  "devices": {
    "AA:BB:CC:DD:EE:FF": {
      "name": "Lounge",
      "calibration": {
        "perspective": [8 floats],
        "room_width": 3118,
        "room_depth": 4753
      },
      "room_layout": {
        "grid_bytes": [400 ints],
        "zone_slots": [up to 7 zone configs],
        "furniture": [...],
        "room_type": "normal"
      },
      "offsets": {
        "illuminance": 0,
        "temperature": 0,
        "humidity": 0
      }
    }
  },
  "templates": {
    "bedroom": {
      "room_layout": {...},
      "furniture": [...]
    }
  }
}
```

### Device Discovery

- On startup and via entity registry event listeners, scan for ESPHome text sensor entities matching `*zone_engine_version*`.
- From each match, resolve the ESPHome device (MAC, config entry) and track it as a managed device.
- New ESPHome devices are picked up automatically when they appear.

### Connection Architecture

Two independent paths to the device:

```
ESPHome integration          eppgrid backend
       |                           |
       | permanent connection      | on-demand connection
       | entity state updates      | (calibration UI active)
       |                           |
       v                           v
   HA entities              EPP device (API)
   (for automations)          |
                              +-- target position stream
                              +-- zone occupancy stream
                              +-- environmental sensors
                              +-- config push
```

**ESPHome (permanent):** Owns the device connection. Creates HA entities for zone occupancy, environmental sensors, etc. These are purely for user automations.

**eppgrid backend (on-demand):** Opens a direct API connection to the device only while the calibration UI is active. Streams all data (targets, zone state, sensors) to the frontend via websocket. Pushes config over the same connection. Disconnects when the UI closes.

The frontend never reads from HA entities. All frontend data comes from the eppgrid backend's direct device connection. HA entities can all be disabled without affecting the frontend.

### Config Push

- **On save:** When the user saves calibration/zones in the frontend, push immediately over the active connection.
- **On device connect:** Listen for ESPHome device availability changes in HA (entity state: unavailable -> available). When a managed device comes online, open a temporary direct connection, push stored config, and close it. This ensures the device has current config after reflash or NVS wipe.

### Entity Management

eppgrid manages ESPHome-owned entities in the HA entity registry:

- When zones are configured, enable the corresponding ESPHome zone occupancy binary sensors and rename them based on zone names (e.g. "Zone 1 Occupancy" -> "Lounge Armchair").
- When zones are removed, disable those entities.
- Zone 0 ("rest of room") is enabled when any named zones exist.
- The user can further enable/disable entities for automations as they wish.

### Websocket API

Commands keyed by device MAC instead of config entry ID:

| Command | Purpose |
|---|---|
| `eppgrid/list_devices` | Discovered ESPHome zone engine devices (MAC, name, state) |
| `eppgrid/get_config` | Fetch stored config for a device |
| `eppgrid/set_setup` | Save perspective calibration |
| `eppgrid/set_room_layout` | Save grid layout, zones, furniture |
| `eppgrid/set_zones` | Update zone configuration |
| `eppgrid/set_reporting` | Configure reporting settings |
| `eppgrid/rename_zone_entities` | Update ESPHome entity names in HA registry |
| `eppgrid/subscribe_raw_targets` | Stream raw target positions from device |
| `eppgrid/subscribe_grid_targets` | Stream processed targets + zone state from device |
| `eppgrid/list_templates` | List saved room templates |
| `eppgrid/save_template` | Save a room template |
| `eppgrid/delete_template` | Delete a room template |
| `eppgrid/apply_template` | Apply a template to a device |

### Dev Mode

Gated behind `EPPGRID_DEV_MODE` environment variable. When set:

- Python zone engine, calibration transform, recording tools are loaded.
- Additional websocket commands registered: `set_dev_mode`, `start_recording`, `stop_recording`.
- Frontend can request Python-processed results via `source=python`.

When not set, none of this code is imported. Removed entirely once firmware is fully validated.

## What Changes

### Removed from production path

- `binary_sensor.py` — eppgrid creates no entities
- `sensor.py` — eppgrid creates no entities
- `config_flow.py` — auto-setup, no flow
- Zone engine, tumbling window, display buffer, sensor transform in coordinator

### Simplified

- `coordinator.py` — becomes a device manager: discovery, on-demand connections, config storage/push
- `websocket_api.py` — keyed by MAC, streams from direct device connection, template commands
- `__init__.py` — no entity platforms, auto-setup

### Kept

- `frontend/` — panel and static assets
- `const.py` — constants

### Kept but only loaded in dev mode

- `zone_engine.py` — Python zone engine
- `calibration.py` — perspective transform
- Recording mode in coordinator

Estimated reduction: ~3,800 lines -> ~800-1,000 lines (production path).

## Sidebar Panel Configuration

The sidebar panel is registered by default. Users who prefer a dashboard card can disable it via the integration's config options. The dashboard card (future work) provides the same frontend functionality embedded in a Lovelace card.
