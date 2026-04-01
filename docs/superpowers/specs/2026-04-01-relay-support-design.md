# Relay Support Design

## Overview

Add relay output support (GPIO12) to the EPP Grid firmware and integration, using the existing settings system for configuration. The relay activates automatically based on global motion/presence state and operates autonomously on the device without HA dependency.

## Background

The original Everything Presence Pro firmware exposes relay configuration as three HA entities (a GPIO switch, a contact mode select, and a trigger mode select) with a script-based control loop. This design replaces that approach with our settings-driven architecture while keeping the GPIO switch entity for visibility and manual override.

## Settings Schema

Two new keys added to the settings system:

| Key | Type | Validation | Default |
|-----|------|-----------|---------|
| `relay_trigger_mode` | string | `vol.In(["disabled", "motion", "presence", "occupancy"])` | `"disabled"` |
| `relay_contact_mode` | string | `vol.In(["no", "nc"])` | `"no"` |

These flow through the full settings pipeline:

- Added to `_SETTINGS_KEYS` tuple
- Validated in `set_settings` websocket command schema
- Stored in `device_config["settings"]`
- Pushed to firmware via new `epp_set_relay` action
- Parsed in frontend `ParsedSettings` interface

## Firmware

### Action

New API action `epp_set_relay` with two string parameters:
- `trigger_mode`: `"disabled"`, `"motion"`, `"presence"`, `"occupancy"`
- `contact_mode`: `"no"`, `"nc"`

### Relay Logic

New members on `EPPComponent`:
- `relay_trigger_mode_` enum
- `relay_contact_mode_` enum
- GPIO12 configured as output pin

On each zone publish tick (1Hz), after the zone engine produces its `ProcessingResult`:

1. If trigger mode is `disabled` -> de-energize the relay (desired state = off)
2. Determine activation based on trigger mode:
   - `motion` -> `result.motion_state != INACTIVE`
   - `presence` -> `result.static_state != INACTIVE` (mmWave static presence)
   - `occupancy` -> `result.occupancy` (combined motion + static signal)
3. Apply contact mode:
   - `no` (Normally Open) -> activation as-is
   - `nc` (Normally Closed) -> invert activation
4. Call `turn_on()`/`turn_off()` on the `system_alarm_relay` switch entity (not raw GPIO) so the ESPHome switch entity state stays in sync with the actual pin state

**Note on automatic modes**: If a user manually toggles the relay switch in HA while in an automatic mode (motion/presence/occupancy), the automatic logic will override it on the next 1Hz evaluation tick.

### NVS Persistence

Relay settings (trigger mode, contact mode) saved to NVS alongside perspective, grid, and zone data. Restored on boot so the relay operates in its last-known configuration without waiting for HA to push settings.

### Existing YAML Changes

- **Keep**: `system_alarm_relay` GPIO switch definition (provides entity for HA visibility and manual override)
- **Remove**: `relay_contact_mode` template select
- **Remove**: `system_alarm_mode` template select
- **Remove**: `update_relay_state` script
- **Remove**: Relay-related triggers in `pir_motion` and `occupancy` `on_state` handlers

The C++ component controls the switch entity via `turn_on()`/`turn_off()`, which in turn drives GPIO12. The switch entity reflects the current state in HA.

## Backend

### `websocket_api.py`

- Add `relay_trigger_mode` and `relay_contact_mode` to `_SETTINGS_KEYS`
- Add validation to `set_settings` schema:
  - `vol.Required("relay_trigger_mode"): vol.In(["disabled", "motion", "presence", "occupancy"])`
  - `vol.Required("relay_contact_mode"): vol.In(["no", "nc"])`

### `device_manager.py`

- In `async_push_config()`, map relay settings to `epp_set_relay` action call
- After storing settings, auto-enable/disable the relay switch entity based on `relay_trigger_mode`:
  - `"disabled"` -> disable entity in HA registry
  - Any other value -> enable entity in HA registry
- Uses existing `_apply_entity_states()` mechanism

### Data Catalog

Add relay settings to `docs/backend-data-catalog.md` settings section.

## Frontend

### `config-serialization.ts`

Add to `ParsedSettings` interface:
```typescript
relayTriggerMode: string;  // "disabled" | "motion" | "presence" | "occupancy"
relayContactMode: string;  // "no" | "nc"
```

Add to `parseSettings()`:
```typescript
relayTriggerMode: s.relay_trigger_mode ?? "disabled",
relayContactMode: s.relay_contact_mode ?? "no",
```

### `epp-settings-view.ts`

New **"Relay"** accordion section (after existing sections):
- **Trigger Mode** select: Disabled, Motion Only, Presence Only, Occupancy
- **Contact Mode** select: Normally Open (NO), Normally Closed (NC) — only visible when trigger mode is not `"disabled"`

Both controls use the `_overrides` pattern. Values included in `_emitSave()` as `relay_trigger_mode` and `relay_contact_mode`.

## Entity Management

The relay switch entity (`relay_output`) is:
- **Disabled by default** in the HA entity registry (trigger mode defaults to `"disabled"`)
- **Auto-enabled** when `relay_trigger_mode` is set to any value other than `"disabled"`
- **Auto-disabled** when `relay_trigger_mode` is set back to `"disabled"`

This is handled automatically in the `set_settings` handler — no separate `entities` dict entry needed from the frontend.

## Testing

### Backend Tests (`tests/test_websocket_api.py`)
- `set_settings` accepts and stores relay keys
- Push maps relay settings to `epp_set_relay` action
- Relay entity auto-enabled when trigger mode is not `"disabled"`
- Relay entity auto-disabled when trigger mode is `"disabled"`

### Firmware Tests (`firmware/lib/epp_zone_engine/`)
- Relay evaluation: each trigger mode maps to correct sensor state
- Disabled mode skips automatic evaluation
- Contact mode inversion: NO passes through, NC inverts
- NVS round-trip: save and restore relay settings

### Frontend Tests (`frontend/src/__tests__/`)
- Settings view renders relay section with both controls
- Contact mode hidden when trigger mode is `"disabled"`
- `_emitSave` includes relay keys
- `parseSettings` returns correct defaults
