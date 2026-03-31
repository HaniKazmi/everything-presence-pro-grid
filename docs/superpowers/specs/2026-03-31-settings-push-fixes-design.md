# Settings Push Fixes

## Problem

Three issues in the settings-to-firmware push flow:

1. **Auto distances not applied.** When `target_auto_distance` or `static_auto_distance` is true, the frontend sends the *stored* manual distance values instead of the auto-computed values. The backend stores and pushes whatever it receives, so the firmware gets stale distances. **(Fixed)**

2. **Double push on save.** After saving settings, `_apply_entity_states()` changes `disabled_by` on HA entity registry entries. HA core reloads the ESPHome config entry in response, causing a disconnect/reconnect. `_on_device_available()` then pushes the full config a second time. **(Fixed)**

3. **Editor distance lifecycle.** When editing zones/rooms, the firmware needs widened detection ranges so the sensor can see targets everywhere. On save or cancel, the ranges must be restored to the correct values.

## Design

### Already implemented (bugs 1 & 2)

- `_emitSave()` and `applyLayout()` compute auto distances via `autoDetectionRange()` when auto flags are set.
- `_entity_update_macs` guard set suppresses redundant reconnect push.
- Detection preview (live slider push) removed — was unnecessary firmware spam.

### Editor distance lifecycle

**Backend — new WS command `eppgrid/set_distance_override`:**
- Takes `mac`, `target_max_distance`, `static_min_distance`, `static_max_distance`.
- Merges with stored non-distance settings (thresholds, timeout, on_delay) from storage.
- Pushes tracking + static presence to device via session — no persist.
- No-op if no session exists.

**Backend — modify `set_room_layout`:**
- Remove `_push_config_to_device` call. Layout saves no longer trigger a settings push. The frontend handles settings push separately via `set_settings` when auto is on.

**Frontend — entering editor (`_view` changes to `"editor"`):**
- Call `set_distance_override` with:
  - `target_max_distance`: 6 if `_targetAutoDistance`, else `_targetMaxDistance`
  - `static_min_distance`: 0.3 if `_staticAutoDistance`, else `_staticMinDistance`
  - `static_max_distance`: 16 if `_staticAutoDistance`, else `_staticMaxDistance`
- If neither auto flag is on, skip the call entirely (no override needed).

**Frontend — save from editor (`applyLayout`):**
- Save layout via `set_room_layout` (no config push).
- If `_targetAutoDistance || _staticAutoDistance`: compute auto distances, call `set_settings` with them.
- If both auto flags OFF: no `set_settings` call needed (distances unchanged).

**Frontend — cancel from editor:**
- If `_targetAutoDistance || _staticAutoDistance`: call `set_distance_override` with stored values (`_targetMaxDistance`, `_staticMinDistance`, `_staticMaxDistance`) to revert widened ranges.
- Then reload config as already done.

## Testing

### Already implemented
- Frontend: `_emitSave()` with auto ON sends auto-computed values.
- Frontend: `applyLayout()` with auto ON sends auto-computed distances.
- Python: entity update guard suppresses redundant reconnect push.

### Editor distance lifecycle
- Backend: `set_distance_override` pushes to device without persisting.
- Backend: `set_distance_override` is no-op when no session exists.
- Backend: `set_room_layout` no longer calls `_push_config_to_device`.
- Frontend: editor entry with auto ON calls `set_distance_override` with widened values.
- Frontend: editor entry with both auto OFF does not call `set_distance_override`.
- Frontend: editor entry with mixed auto (one on, one off) sends widened for auto, stored for manual.
- Frontend: save from editor with auto ON calls `set_settings`.
- Frontend: save from editor with auto OFF does not call `set_settings`.
- Frontend: cancel from editor with auto ON calls `set_distance_override` with stored values.
- Frontend: cancel from editor with auto OFF does not call `set_distance_override`.
