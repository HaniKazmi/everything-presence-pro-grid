# Save Settings Implementation

## Overview

Implement the `saveSettings()` stub so that all settings on the settings page are persisted to the backend and pushed to the device firmware. Consolidate the four existing individual WS commands into a single unified `set_settings` command, add a `set_detection_preview` command for live range preview, and fix config loading.

## Backend

### Unified `set_settings` WS command

Replaces `set_env_calibration`, `set_motion_timeout`, `set_tracking`, `set_static_presence`.

**Schema:**

```python
{
    "type": "eppgrid/set_settings",
    "mac": str,
    # env calibration
    "temperature_offset": float,
    "humidity_offset": float,
    "illuminance_offset": float,
    # motion
    "motion_timeout": float,
    # tracking (LD2450)
    "target_auto_distance": bool,
    "target_max_distance": float,
    # static presence (SEN0609)
    "static_auto_distance": bool,
    "static_min_distance": float,
    "static_max_distance": float,
    "static_trigger_threshold": int,
    "static_renew_threshold": int,
    "static_timeout": float,
    "static_on_delay": float,
    # entities
    "entities": dict,  # e.g. {"room_occupancy": true, "zone_presence": false}
}
```

**Storage:** All values stored under a single `device_config["settings"]` key as a flat dict matching the schema above.

**Push to device:** `async_push_config` reads from `device_config["settings"]` and maps to the individual firmware actions (`epp_set_tracking`, `epp_set_static_presence`, `epp_set_env_calibration`, `epp_set_motion_timeout`). The firmware actions stay separate because that's what the firmware exposes.

**Firmware inversion:** The firmware's sensitivity scale is inverted relative to the UI's threshold scale. When pushing to the device:
- firmware `trigger_sensitivity` = `10 - static_trigger_threshold`
- firmware `sustain_sensitivity` = `10 - static_renew_threshold`

**`trigger_range`** (firmware field) is not exposed in the UI; it is set to `static_max_distance` when pushing to the device.

**`led_enabled`** is omitted from this command; it will be handled with LED config later.

**Delete:** Remove `websocket_set_env_calibration`, `websocket_set_motion_timeout`, `websocket_set_tracking`, `websocket_set_static_presence` and their registrations.

### Entity management

The HA entity registry is the canonical source of truth for which entities are enabled/disabled. The `entities` dict in `set_settings` specifies the desired state; the handler applies changes to the HA entity registry via `er.async_update_entity()`.

- **Idempotent:** Enabling an already-enabled entity or disabling an already-disabled entity is a no-op (don't fail).
- **On load (`get_config`):** Read current entity enabled/disabled states from the HA entity registry and include them in the config response, rather than returning what we stored. This means if the user manually toggles entities through HA's UI, the settings page reflects reality.
- **No storage:** Entity states are not stored in `device_config["settings"]` — they live in the HA entity registry only.

### `set_detection_preview` WS command

Pushes detection distance values to the device firmware without persisting to the store. Used for live preview while editing settings.

**Schema:**

```python
{
    "type": "eppgrid/set_detection_preview",
    "mac": str,
    "target_max_distance": float,
    "static_min_distance": float,
    "static_max_distance": float,
}
```

Calls the firmware tracking and static presence actions directly. For static presence, reads the current stored values for non-distance fields (`trigger_threshold`, `renew_threshold`, `timeout`, `on_delay`, `led_enabled`) from `device_config["settings"]` and combines them with the preview distance values. Does not call `async_save()`.

### `async_push_config` changes

Update to read settings from the new `device_config["settings"]` key instead of the old individual keys (`env_calibration`, `motion_timeout`, `tracking`, `static_presence`).

## Frontend Config Loading

### `parseConfig` changes

Replace `reportingConfig` and `offsetsConfig` in `ParsedConfig` with a unified `settings` object:

```typescript
interface ParsedSettings {
    temperatureOffset: number;
    humidityOffset: number;
    illuminanceOffset: number;
    motionTimeout: number;
    targetAutoDistance: boolean;
    targetMaxDistance: number;
    staticAutoDistance: boolean;
    staticMinDistance: number;
    staticMaxDistance: number;
    staticTriggerThreshold: number;
    staticRenewThreshold: number;
    staticTimeout: number;
    staticOnDelay: number;
    entities: Record<string, boolean>;
}
```

Reads from `config?.settings` with sensible defaults for each field. Entity states come from `config?.entities` (populated by `get_config` from the HA entity registry, not from stored settings).

### `_applyConfig` changes

Maps `parsed.settings` to panel state properties.

**Naming convention:** The Python backend uses snake_case, the frontend uses camelCase. Both use the same terminology ("distance" not "range", "threshold" not "sensitivity"). The firmware uses different terms (`trigger_sensitivity`, `max_range`) — the inversion/mapping happens in `async_push_config`.

| Backend key | Panel state | Notes |
|---|---|---|
| `target_auto_distance` | `_targetAutoDistance` | rename from `_targetAutoRange` |
| `target_max_distance` | `_targetMaxDistance` | existing |
| `static_auto_distance` | `_staticAutoDistance` | rename from `_staticAutoRange` |
| `static_min_distance` | `_staticMinDistance` | existing |
| `static_max_distance` | `_staticMaxDistance` | existing |
| `temperature_offset` | `_temperatureOffset` | new (replaces `_offsetsConfig`) |
| `humidity_offset` | `_humidityOffset` | new |
| `illuminance_offset` | `_illuminanceOffset` | new |
| `motion_timeout` | `_motionTimeout` | new |
| `static_timeout` | `_staticTimeout` | new |
| `static_trigger_threshold` | `_staticTriggerThreshold` | new |
| `static_renew_threshold` | `_staticRenewThreshold` | new |
| `static_on_delay` | `_staticOnDelay` | new |
| (from HA registry) | `_entitiesConfig` | rename from `_reportingConfig` |

Remove `_offsetsConfig`.

## Settings View Changes

### New properties

Add to `EppSettingsView`:

- `motionTimeout: number` (default: 5)
- `staticTimeout: number` (default: 30)
- `staticTriggerThreshold: number` (default: 3)
- `staticRenewThreshold: number` (default: 3)
- `staticOnDelay: number` (default: 0)

Bind these to the range inputs in `renderSensitivities()` (replacing hardcoded `value="..."` attributes).

Add "Presence delay" (`staticOnDelay`) as a new slider in the static sensor group.

Rename `reportingConfig` property to `entitiesConfig`. Rename `offsetsConfig` to individual offset properties (`temperatureOffset`, `humidityOffset`, `illuminanceOffset`).

### Save event carries payload

When Save is clicked, the settings view collects all current values and emits them using backend key names (snake_case) so the panel can forward directly to the WS command:

```typescript
new CustomEvent("save", {
    detail: {
        // from properties (detection distances)
        target_auto_distance, target_max_distance, static_auto_distance,
        static_min_distance, static_max_distance,
        // from properties (sensitivities)
        motion_timeout, static_timeout,
        static_trigger_threshold, static_renew_threshold,
        static_on_delay,
        // from DOM (offset sliders with data-offset-key)
        temperature_offset, humidity_offset, illuminance_offset,
        // from DOM (checkboxes with data-entity-key)
        entities: { room_occupancy: true, ... },
    },
});
```

Offset sliders and entity checkboxes remain DOM-only state, read at save time.

### Detection distance preview

When detection distance sliders fire `setting-change` events, the panel calls `set_detection_preview` to push values to the device. The user flips to the live view to see the effect.

## Save & Cancel Flow

### Save

1. Panel receives `save` event with full payload from settings view
2. Calls `eppgrid/set_settings` — single WS call
3. On success: `_dirty = false`, switch to live view
4. On WS error (validation, protocol mismatch, not loaded): stay on settings, show error

Settings are persisted to the HA store then pushed to the device. If the device is offline, the push happens automatically on reconnect. Entity enable/disable changes are applied to the HA entity registry.

### Cancel

1. Calls `_loadDeviceConfig` to reload saved config (already happens)
2. Calls `set_detection_preview` with the saved distance values to revert any previewed changes on the device
3. Switch to live view

### Layout save

After `applyLayout` saves the room layout via `set_room_layout`, it also calls `set_settings` with the current settings state (including recalculated auto distance values from the new room geometry). This is unconditional — always save settings after layout changes.
