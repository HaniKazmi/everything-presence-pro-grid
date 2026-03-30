# Settings Push Fixes

## Problem

Two bugs in the settings-to-firmware push flow:

1. **Auto distances not applied.** When `target_auto_distance` or `static_auto_distance` is true, the frontend sends the *stored* manual distance values instead of the auto-computed values. The backend stores and pushes whatever it receives, so the firmware gets stale distances.

2. **Double push on save.** After saving settings, `_apply_entity_states()` changes `disabled_by` on HA entity registry entries. HA core reloads the ESPHome config entry in response, causing a disconnect/reconnect. `_on_device_available()` then pushes the full config a second time.

## Design

### Bug 1: Frontend sends auto-computed distances

The frontend already computes auto distances via `autoDetectionRange()` in the settings view render. The fix is to use those computed values at save time.

**epp-settings-view.ts — cache auto values:**
- Store `_targetAutoVal` and `_staticMaxAutoVal` as instance properties, updated during `renderDetectionRanges()`.
- In `_emitSave()`, when `target_auto_distance` is true, send `_targetAutoVal` instead of the stored `targetMaxDistance`. Same for static: send `_staticMaxAutoVal` for max and `0.3` for min.

**grid-state-controller.ts — saveLayout sends correct distances:**
- `saveLayout()` calls `set_settings` after saving the layout (because auto distances may change when the grid changes). The panel state properties (`_targetMaxDistance` etc.) need to reflect the auto-computed values.
- After saving the layout, if auto distance is on, compute `autoDetectionRange()` from the updated room geometry and send those values in the `set_settings` call instead of the stale state properties.

**Backend stays unchanged** — it always receives concrete distance values and pushes them to firmware. The `target_auto_distance` / `static_auto_distance` flags are stored for the frontend's use but the backend doesn't act on them.

### Bug 2: Suppress redundant reconnect push

**device_manager.py — `_entity_update_macs` guard set:**
- Add `_entity_update_macs: set[str]` to `DeviceManager`.
- In `websocket_set_settings`, before calling `_apply_entity_states()`, add the MAC to this set.
- In `_on_device_available()`, if the MAC is in the set, remove it and skip the push.
- Use `hass.loop.call_later(60, ...)` to auto-clear the MAC as a safety net, so the flag doesn't stick forever if the expected reconnect doesn't happen.

## Testing

### Bug 1
- Frontend test: `_emitSave()` with `targetAutoDistance=true` sends auto-computed value, not stored value.
- Frontend test: `saveLayout()` with auto distance on sends recomputed distances.

### Bug 2
- Python test: after `websocket_set_settings` with entities, `_on_device_available` skips the push.
- Python test: after 60s timeout, the guard is cleared and a real availability change does push.
