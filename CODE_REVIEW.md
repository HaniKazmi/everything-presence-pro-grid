# Pre-1.0 Code Review Tracker

Findings from the multi-agent review on 2026-05-03. Grouped into PR-sized chunks so each can be picked up independently in a subagent/worktree. Check items off as PRs land.

Severity legend: **C** = critical (security/data-loss/correctness), **H** = high, **M** = medium, **L** = low.

---

## PR 1 — WebSocket auth & input validation (security)

Goal: lock down trust boundaries. Single self-contained PR.

- [x] **C: Firmware proxy is unauthenticated** — [custom_components/eppgrid/firmware_proxy.py:26](custom_components/eppgrid/firmware_proxy.py#L26) — _shipped: PR #164_
  Set `requires_auth = True` (panel attaches `Authorization: Bearer <hass.auth.accessToken>`). Add `aiohttp.ClientTimeout(total=60, sock_read=15)` and a 16 MiB cap enforced via `Content-Length` pre-check + running total over `iter_chunked(64 KiB)`. Body is buffered (bounded by the cap) into a `web.Response`, not streamed via `StreamResponse` — the cap is the load-bearing security property; streaming was deemed unnecessary given a 16 MiB ceiling. Timeouts return 504; oversize uploads return 502.

- [ ] **C: Add `@websocket_api.require_admin` to every state-mutating WS command** — [custom_components/eppgrid/websocket_api/_devices.py](custom_components/eppgrid/websocket_api/_devices.py), [_firmware.py](custom_components/eppgrid/websocket_api/_firmware.py)
  Affected: `update_firmware`, `set_setup`, `set_room_layout`, `set_settings`, `set_distance_override`, `set_pipeline`, `set_entity_enabled`, `save_configuration`, `delete_configuration`, `set_show_room_calibration_tutorial`. Read-only `list_*`/`subscribe_*`/`get_config` stay open.

- [ ] **C: `grid_bytes` schema unbounded** — [_devices.py:211](custom_components/eppgrid/websocket_api/_devices.py#L211)
  `vol.All([vol.All(int, vol.Range(min=0, max=255))], vol.Length(min=1, max=GRID_COLS*GRID_ROWS))`.

- [ ] **C: Unknown MACs flood storage** — `_devices.py:171, 232, 870, 1009`
  After `_check_firmware_version`, assert `mac in manager.devices` and `send_error("device_not_found", ...)` otherwise. Validate MAC format with `vol.Match(...)` regex.

- [ ] **C: `add_esphome_device` user_id branch is dead** — [_flasher.py:170-200](custom_components/eppgrid/websocket_api/_flasher.py#L170-L200)
  Replace `connection.context.user_id` (it's a method, not attr) with `connection.user.id`. Cap host length to 253.

- [ ] **H: All voluptuous string schemas are unbounded** — across `_devices.py`/`_firmware.py`/`_flasher.py`
  Apply `vol.All(str, vol.Length(max=N))` to every string field. Validate `mac` format. Cap `configuration` dict size.

- [ ] **H: Diagnostics leak MAC + LAN IP** — [diagnostics.py:38-45](custom_components/eppgrid/diagnostics.py#L38-L45)
  Run output through `async_redact_data(payload, {"mac", "host"})`. Replace MAC keys with stable indices.

- [ ] **L: `_validate_zone_slots` accepts bool as numeric** — [websocket_api/__init__.py:56-71](custom_components/eppgrid/websocket_api/__init__.py#L56-L71)
  `isinstance(v, (int, float)) and not isinstance(v, bool)`.

- [ ] **L: `set_setup` allows negative `room_width`/`room_depth`** — `_devices.py:151-153`. `vol.Range(min=0, max=50)`.

- [ ] **L: `_validate_zone_slots` doesn't bound `name`/`color`/`type` lengths** — [websocket_api/__init__.py:35-72](custom_components/eppgrid/websocket_api/__init__.py#L35-L72)

---

## PR 2 — Connection lifecycle & subscription leaks (backend)

- [ ] **C: `async_close_session` doesn't take session lock** — [device_manager/__init__.py:706-731](custom_components/eppgrid/device_manager/__init__.py#L706-L731)
  Acquire `_session_locks[mac]` in close path; re-check `_is_device_available(mac)` after `async_connect` returns.

- [ ] **C: Build-flag fetch poisons cache forever on transient failure** — [_connection.py:144-164](custom_components/eppgrid/device_manager/_connection.py#L144-L164)
  Replace `except (json.JSONDecodeError, Exception)` with specific exceptions; only cache `{}` on real "service not present", not on timeout/connection-error. Bump default timeout from 2 → 5–10s.

- [ ] **C: `noise_psk` hardcoded empty** — [_connection.py:31, 50](custom_components/eppgrid/device_manager/_connection.py#L31)
  Pull `noise_psk` from the ESPHome config entry data; pass to `DeviceConnection`.

- [ ] **H: `_compare_firmware_version` swallows parse errors as `firmware_behind`** — [_helpers.py:114-129](custom_components/eppgrid/device_manager/_helpers.py#L114-L129)
  Return `"firmware_unknown"` for unparseable versions. Don't raise repairs issue on unknown.

- [ ] **H: `read_firmware_version(device_id=None)` returns `"0.0.0"` and triggers fake "behind" repairs** — [device_manager/__init__.py:242-258](custom_components/eppgrid/device_manager/__init__.py#L242-L258)
  Return `None`; audit callers to treat None as "unknown — no issue".

- [ ] **H: Dict mutation during iteration in `_on_esphome_entry_updated`** — [device_manager/__init__.py:450-462](custom_components/eppgrid/device_manager/__init__.py#L450-L462)
  Iterate `list(self.devices.items())`.

- [ ] **H: Fire-and-forget tasks not tracked** — [device_manager/__init__.py:126, 355, 416, 433, 482](custom_components/eppgrid/device_manager/__init__.py)
  Add `self._pending_tasks: set[asyncio.Task]`; `task.add_done_callback(self._pending_tasks.discard)`; await all in `async_stop`.

- [ ] **H: `async_stop` disconnects sequentially with no timeout** — [device_manager/__init__.py:153-166](custom_components/eppgrid/device_manager/__init__.py#L153-L166)
  `asyncio.gather(*..., return_exceptions=True)` with timeout.

- [ ] **H: OTA opens a fresh `DeviceConnection` instead of reusing session** — [device_manager/__init__.py:217-240](custom_components/eppgrid/device_manager/__init__.py#L217-L240)
  Prefer `self.get_session(mac)`; fall back to temp connection only if no session.

- [ ] **H: OTA path reaches into `conn._client` / `conn._services`** — multiple sites
  Add `DeviceConnection.async_execute_service(name, payload, timeout=...)` and route all 4 sites through it.

- [ ] **M: `_on_state_changed` listens to literal `"state_changed"` for entire HA bus** — [device_manager/__init__.py:104](custom_components/eppgrid/device_manager/__init__.py#L104)
  Use `async_track_state_change_event` keyed on managed entity_ids; refresh on registry events. Use `EVENT_STATE_CHANGED` constant.

- [ ] **M: `_on_state_changed` early-returns on `old_state is None`, missing first appearance** — `device_manager/__init__.py:362-363`
  Treat `old_state is None` as `STATE_UNAVAILABLE` for the firmware-version transition.

- [ ] **M: `subscribe_states` race + missing exception isolation** — [_connection.py:85-100](custom_components/eppgrid/device_manager/_connection.py#L85-L100)
  Async-lock the subscribe path; per-callback `try/except` in `_dispatch_state` (mirror `_fire_device_list_changed`).

- [ ] **M: `_on_device_available` retry hangs without bounded backoff** — [device_manager/__init__.py:553-560](custom_components/eppgrid/device_manager/__init__.py#L553-L560)
  Exponential backoff with max attempts; re-check device state between retries.

- [ ] **L: `_release_references` called twice on async_disconnect path** — [_connection.py:46-72](custom_components/eppgrid/device_manager/_connection.py#L46-L72)
  Document idempotency or only fire from `_on_stop`.

- [ ] **L: `_DEVICE_LOGGER.setLevel(DEBUG)` global mutation** — [device_manager/__init__.py:582](custom_components/eppgrid/device_manager/__init__.py#L582)
  Don't mutate logger from app code; let `logger:` config own it.

---

## PR 3 — Backend cleanup, dead code, BWC removal

- [ ] **H: Templates→configurations migration violates "no BWC" rule** — [storage.py:39-54](custom_components/eppgrid/storage.py#L39-L54)
  Delete migration block + `test_storage.py` migration tests.

- [ ] **H: Options flow doesn't reload config entry** — [config_flow.py:46-61](custom_components/eppgrid/config_flow.py#L46-L61), [__init__.py:37-56](custom_components/eppgrid/__init__.py#L37-L56)
  Register `entry.add_update_listener(...)` that calls `async_reload(entry.entry_id)`; have `async_unload_entry` call `frontend.async_remove_panel` and `remove_extra_js_url`.

- [ ] **H: Frontend resources accumulate across reloads** — [__init__.py:59-68](custom_components/eppgrid/__init__.py#L59-L68)
  Track last-registered URL in `hass.data[DOMAIN+"_js_url"]`; remove old before adding new.

- [ ] **M: `manifest.json` read with blocking I/O at module-import time, twice** — [diagnostics.py:17](custom_components/eppgrid/diagnostics.py#L17), [websocket_api/__init__.py:19](custom_components/eppgrid/websocket_api/__init__.py#L19)
  Use `async_get_loaded_integration(hass, DOMAIN).version` at request time.

- [ ] **M: `EMPTY_ZONE_SLOTS` is module-level mutable** — [const.py:17](custom_components/eppgrid/const.py#L17)
  Function returning fresh copy, or `MappingProxyType`.

- [ ] **M: `_REGISTERED` private cross-module import** — [websocket_api/__init__.py:24](custom_components/eppgrid/websocket_api/__init__.py#L24)
  Drop the guard or expose `async_unregister_websocket_commands`.

- [ ] **M: `set_setup` reads `room_layout` from a dict it just popped** — [_devices.py:178-199](custom_components/eppgrid/websocket_api/_devices.py#L178-L199)
  Always pass `EMPTY_ZONE_SLOTS`; remove dead `.get("room_layout", {}).get(...)`.

- [ ] **M: `delete_esphome_device` `break` placement makes loop look at first `update` entity only** — `device_manager/__init__.py:828-834`. Move `break` inside the `if state is not None` block.

- [ ] **M: `_get_entity_states` "any enabled" semantics for category keys** — [_devices.py:399-402](custom_components/eppgrid/websocket_api/_devices.py#L399-L402)
  Use AND (all enabled) or expose tri-state.

- [ ] **L: `get_device(mac)` is a thin wrapper duplicating `self.devices.get(mac)`** — [storage.py:67-69](custom_components/eppgrid/storage.py#L67-L69). Inline & delete.

- [ ] **L: `_resolve_zone_name` only strips one locale's prefix** — [_helpers.py:91-101](custom_components/eppgrid/device_manager/_helpers.py#L91-L101). Strip every locale's prefix.

- [ ] **L: `_extract_mac` doesn't normalize via `dr.format_mac`** — [_helpers.py:198-203](custom_components/eppgrid/device_manager/_helpers.py#L198-L203).

- [ ] **L: Substring matching for `firmware_version`/zone unique_ids** — `device_manager/__init__.py:253, 290, 814, 970`
  Use `endswith()` + separator check, or anchor with regex.

---

## PR 4 — Backend efficiency: registry scans, tracking, observers

- [ ] **H: Bus-wide `state_changed` listener** (also tracked under PR 2) — see PR 2.

- [ ] **M: `list_devices` does 3-4 entity-registry scans per device** — [device_manager/__init__.py:749-777](custom_components/eppgrid/device_manager/__init__.py#L749-L777)
  Build `{device_id: list[RegistryEntry]}` once; reuse for `list_flashable_devices`. `read_firmware_version` called twice for same id at lines 845 + 854.

- [ ] **M: `async_update_zone_entities` does 16 registry scans (8 zones × 2 suffixes)** — [device_manager/__init__.py:867-972](custom_components/eppgrid/device_manager/__init__.py#L867-L972)
  Use `er.async_entries_for_device(...)` once and dispatch by unique_id substring in a single pass.

- [ ] **M: `_on_device_registry_updated` does O(N) linear scan per event** — `device_manager/__init__.py:472-477`
  Maintain `device_id → mac` reverse map.

- [ ] **M: `_sync_firmware_repair_issue` re-fires on every device-registry change** — `device_manager/__init__.py:485-500`
  Skip unless firmware_version actually changed.

- [ ] **L: `list_flashable_devices` missing `include_disabled_entities=True`** — `device_manager/__init__.py:821`. Per `feedback_include_disabled_entities`.

- [ ] **L: Hot-path imports inside `_on_state` callbacks** — `_devices.py:666, 745`
  Hoist `import math`, `import json as json_mod`, `from aioesphomeapi import …` to module scope.

- [ ] **L: Storage hit on every device removal** — `device_manager/__init__.py:524`
  Use `Store._async_schedule_save` for batched debounced writes.

- [ ] **L: `_LOGGER.info` chatty per push** — `_connection.py:217, 238, 269, 284, 292, 300, 317, 332, 343, 355`
  Demote per-section to debug; one info summary at end.

---

## PR 5 — WebSocket DRY (decorators / boilerplate consolidation)

- [ ] **M: `_get_manager` + `_send_not_loaded` boilerplate at top of every handler**
  `_require_manager` decorator (sync + async variants) injecting `manager` as 4th arg.

- [ ] **M: `_check_firmware_version` block duplicated 6×** — `_devices.py:166-168, 227-229, 790-792, 865-867, 955-957, 1004-1006`
  Roll into the same decorator.

- [ ] **L: `_send_update` shape duplicated** — `_flasher.py:36-48, 84-93`. Helper `_flashable_payload(manager)`.

- [ ] **L: Wrapping `_unsub` callbacks with no-op closures** — `_devices.py:55-59`, `_flasher.py:59-63`
  Store `unsub` directly.

- [ ] **L: `_compute_pipeline` lives in websocket_api but only consumed by device_manager** — circular-import-prone
  Move to `device_manager/_helpers.py` (or new `_pipeline.py`).

- [ ] **L: Late `from ..device_manager import _compare_firmware_version` inside hot path** — `websocket_api/__init__.py:221`
  Hoist to module-level.

- [ ] **L: `had_session = ...` then re-call `manager.get_session(mac)`** — `_firmware.py:133-138`
  Consolidate.

---

## PR 6 — OTA correctness & resilience

- [ ] **H: `update_firmware` reimplements `manager.async_trigger_ota` and uses `assert _client is not None`** — [_firmware.py:87-108](custom_components/eppgrid/websocket_api/_firmware.py#L87-L108)
  Replace body with `await manager.async_trigger_ota(mac)`; catch `HomeAssistantError` and feed to `_send_exception`.

- [ ] **H: `subscribe_ota_progress` leaks log subscription / firmware log level** — [_firmware.py:154-155, 263-269](custom_components/eppgrid/websocket_api/_firmware.py#L154-L155)
  Track whether subscription/log-level changed; revert in `_unsub`.

- [ ] **H: OTA "in_progress" terminal-state race** — `_firmware.py:170-213`
  Treat first `in_progress=True` OR `latest_version != current_version` as start sentinel; add 5-min outer timeout that emits `state: error`.

- [ ] **H: `subscribe_ota_progress` no None-check on `_client`** — `_firmware.py:163-168, 166`
  Guard `if device_conn._client is None: return` (or bake into `async_execute_service` from PR 2).

- [ ] **M: Concurrent OTA on same device unguarded** — `device_manager/__init__.py:168` + `_firmware.py:32`
  Per-mac `_ota_locks: dict[str, asyncio.Lock]` like `_session_locks`.

- [ ] **M: `subscribe_device` `_unsub` schedules close via `async_create_task` — race with re-subscribe** — [_devices.py:493-497](custom_components/eppgrid/websocket_api/_devices.py#L493-L497)
  Refcount sessions, or have `async_open_session` await any pending close for that mac.

- [ ] **M: `_send_update` in `subscribe_flashable_devices` not guarded against connection close** — `_flasher.py:36-57`
  Track in-flight task; cancel in `_unsub`; wrap `send_message` in try/except.

- [ ] **M: `set_distance_override` silently succeeds when no session** — `_devices.py:959-976`
  Send error with `translation_key="no_active_session"`.

- [ ] **M: Generic exception swallowing in WS state callbacks** — `_devices.py:555-558, 676-678, 697-738`
  Wrap parse with `try/except (ValueError, IndexError)`; validate `len(parts) >= 2`; extract shared helper.

- [ ] **M: Connection-failure broadcasts global `_fire_device_list_changed()`** — `_devices.py:472-473`
  Scope to affected MAC, only fire on actual transition.

---

## PR 7 — Firmware: zone engine library bugs

- [ ] **C: `Grid::xy_to_cell` truncates negative offsets toward zero** — [epp_grid.cpp:17-25](firmware/lib/epp_zone_engine/src/epp_grid.cpp#L17-L25)
  Use `std::floor`; check raw float against zero before `static_cast<int>`. Fix duplicate inline copy in `epp_zone_engine.cpp:233-234` via shared `Grid::xy_to_col_row(...)` helper.

- [ ] **H: `RollingWindow::MAX_FRAMES` and file-local `ROLLING_MAX_FRAMES` can desynchronize** — [epp_rolling_window.cpp:11](firmware/lib/epp_zone_engine/src/epp_rolling_window.cpp#L11)
  Use `RollingWindow::MAX_FRAMES` directly; `static_assert` if stuck with two constants.

- [ ] **H: Rolling-window `expire_old` unsigned-subtraction underflow on out-of-order timestamps** — `epp_rolling_window.cpp:38-48`
  Guard `now_ms < tail_ts` explicitly; document monotonic-millis assumption.

- [ ] **H: Cell-coord arithmetic duplicated and unsynchronized between Grid and ZoneEngine::tick** — `epp_zone_engine.cpp:233-234, 240-242`
  Extract `Grid::xy_to_col_row(x, y, &col, &row) -> bool`. Always validate before storing into `target_prev_col_/row_`.

- [ ] **H: `Grid::cell_zone`/`cell_is_room`/`cell_overlay` lack bounds checks** — [epp_grid.cpp:27-37](firmware/lib/epp_zone_engine/src/epp_grid.cpp#L27-L37)
  Bounds-check or return safe sentinel.

- [ ] **H: `parse_zone_configs` silently drops 9th+ slot; no value-range validation on trigger/renew/timeout** — [epp_zone_config_parser.h:25-41](firmware/lib/epp_zone_engine/include/epp_zone_config_parser.h#L25-L41)
  Log truncation; clamp ranges; fail-safe on negative timeouts.

- [ ] **H: `find_zone_index` couples zone_id to slot-index by convention only** — `epp_zone_engine.cpp:118-122, 51-78`
  Assert/log mismatch in `set_zones`, or make `config.id` implicit in slot index.

- [ ] **H: Step-2b overlay-exit handoff reads `tw.on_overlay` for inactive targets** — [epp_zone_engine.cpp:431-456](firmware/lib/epp_zone_engine/src/epp_zone_engine.cpp#L431-L456)
  Either propagate sticky `on_overlay` for inactive targets in RollingWindow, or track sticky bit in ZoneEngine, or remove the dead `gone` branch.

- [ ] **M: `set_zones` doesn't fully reset `ZoneRuntime[]`** — `epp_zone_engine.cpp:51-78`
  Reset all `MAX_ZONE_SLOTS` slots before re-applying configs.

- [ ] **M: `set_zones` doesn't reset `target_last_zone_[]` or `dismissed_cell_[]`** — `epp_zone_engine.cpp:81-87`. Reset both.

- [ ] **M: `dismiss_target` clobbers ALL targets' confirmation bits** — `epp_zone_engine.cpp:98-116`
  Only clear bit `(1 << target_index)`; recompute state from remaining mask.

- [ ] **M: `tick()` clears result but not log buffer; consumers may read stale `[log_count, MAX)` entries** — `epp_zone_engine.cpp:143-144`
  Document or zero unused entries.

- [ ] **M: Force-clear (Step 5c) doesn't emit "clear" log when triggered after Step 3 already snapshotted state** — `epp_zone_engine.cpp:483-495`
  Move "log transitions" loop after Step 5c.

- [ ] **M: `log_()` lacks `__attribute__((format(printf, 3, 4)))`** — [epp_zone_engine.h:118](firmware/lib/epp_zone_engine/include/epp_zone_engine.h#L118).

- [ ] **L: `RelayEvalResult.should_update` always true (dead field)** — [epp_relay.h:32-55](firmware/lib/epp_zone_engine/include/epp_relay.h#L32-L55).

- [ ] **L: `Grid::cell()` non-const overload is unused & unbounded** — [epp_grid.h:38-39](firmware/lib/epp_zone_engine/include/epp_grid.h#L38-L39).

- [ ] **L: `RollingWindow::output()` stack buffers are 384 B per call** — `epp_rolling_window.cpp:80-83`
  Move buffers to ZoneEngine state; consider insertion-sort median for n<=16.

- [ ] **L: `RAW_FPS=10` hardcoded denominator** — `epp_zone_engine.cpp:130`. Make configurable.

- [ ] **L: `dismissed_cell_` brace-init `{-1, -1, -1}` breaks if `MAX_TARGETS` changes** — [epp_zone_engine.h:98](firmware/lib/epp_zone_engine/include/epp_zone_engine.h#L98).

- [ ] **L: `set_grid` doesn't invalidate per-target / zone caches** — `epp_zone_engine.cpp:43-45`.

- [ ] **L: `Grid::load_from_bytes` doesn't zero tail when len < cell_count** — `epp_grid.cpp:39-44`.

- [ ] **L: `set_coefficients(nullptr)` crashes** — [epp_calibration.cpp:7-14](firmware/lib/epp_zone_engine/src/epp_calibration.cpp#L7-L14). Null guard.

- [ ] **L: NaN propagation in `SensorTransform::apply` and `Grid::xy_to_cell`** — `epp_calibration.cpp:20-37`
  `std::isfinite(x) && std::isfinite(y)` at entry; clamp output to room AABB.

---

## PR 8 — Firmware: ESPHome component glue

- [ ] **C: Frame data race between `feed_targets` and `loop()` drops frames silently** — [epp_component.cpp:28-31, 323-330](firmware/components/epp/epp_component.cpp#L28-L31)
  Small ring buffer (size 2-3) of `ParsedTarget[NUM_TARGETS]` frames; drain in `loop()`.

- [ ] **C: NVS schema-version conflict — every save bumps version, but each path writes only its blob** — `epp_component.cpp:577, 601, 616, 630, 479`
  Per-blob versioning (`persp_v`, `grid_v`, `zones_v`, `relay_v`) checked independently.

- [ ] **C: `nvs_get_str` corrupt-JSON branch silently drops zones** — `epp_component.cpp:546-558`. Add `ESP_LOGW` on parse failure.

- [ ] **C: `set_zones`/`set_grid`/`set_perspective` write to flash on every call with no idempotency** — `epp_component.cpp:427-442, 386-405, 345-380`
  Bound input length; compare against `last_*_` cache; commit only on change.

- [ ] **C: 408 magic number in grid save/restore path, no `static_assert`** — `epp_component.cpp:494-505`
  `static constexpr size_t GRID_BLOB_SIZE = GRID_CELL_COUNT + 2*sizeof(float);` + `static_assert(sizeof(float) == 4)`.

- [ ] **H: Inactive `target_signal_sensors_` publishes 0.0 instead of NaN** — `epp_component.cpp:246-266`
  Publish NaN; matches x/y/zone semantics.

- [ ] **H: Target zone reports "0" for legitimate origin (0,0)** — `epp_component.cpp:211-216, 254-262`
  Use `status != INACTIVE` and `!std::isnan(x)` as validity check.

- [ ] **H: Perspective coefficient parser silently truncates on extra commas; no NaN/Inf check** — `epp_component.cpp:345-380`
  Validate `std::isfinite(coeffs[i])`; require full input consumption.

- [ ] **H: `set_grid` decodes base64 from unbounded `std::string`** — `epp_component.cpp:386-405`
  `if (grid_data.size() > GRID_BASE64_MAX) error`.

- [ ] **H: Zone-state JSON `snprintf` accumulator can overflow without truncation guard** — `epp_component.cpp:166-232`
  After each snprintf: `if (pos >= (int)sizeof(json)) break;`.

- [ ] **H: Boot-time relay can fire on first loop before sensors stabilized** — `epp_component.cpp:296-315`
  Add `bool boot_settled_` flag (per `feedback_template_switch_restore`).

- [ ] **H: NaN can poison the median window from LD2450 glitches** — `epp_component.cpp:39-44`
  Add `std::isfinite(x) && std::isfinite(y)` to `active` predicate.

- [ ] **M: Per-second binary_sensor `publish_state` floods regardless of change** — `epp_component.cpp:282-294`
  Cache last published value; skip when unchanged.

- [ ] **M: text_sensor `publish_state("")` fires every display tick when no targets** — `epp_component.cpp:127-150`
  Track `last_published[i]`; only re-publish on change.

- [ ] **M: ArduinoJson `JsonDocument` heap allocation in `set_zones` hot path** — `epp_component.cpp:428, 548`
  `StaticJsonDocument<N>`; verify `parse_zone_configs` doesn't retain string pointers.

- [ ] **M: `dismiss_target(int, int)` service does no bounds check at glue layer** — `epp_component.cpp:336-339`
  Reject `target_index < 0 || >= MAX_TARGETS`, `cell_index < -1 || >= GRID_CELL_COUNT`.

- [ ] **M: `relay_switch_->state` read-modify-write pattern bypasses switch internal state** — `epp_component.cpp:307`
  Track desired state in component; only call `turn_on/off` on transitions you authored.

- [ ] **M: No stale-frame watchdog — all sensors freeze if LD2450 stops sending** — `epp_component.cpp:28-29`
  Run throttle timers unconditionally; flush-to-inactive on stale.

- [ ] **M: No `dump_config()` override** — [epp_component.h:25-30](firmware/components/epp/epp_component.h#L25-L30)
  Print firmware version, intervals, sensor pointers, relay mode, NVS restore status.

- [ ] **M: `set_perspective` doesn't validate `room_width > 0` and `room_depth > 0`** — `epp_component.cpp:345-380`.

- [ ] **L: `frame_count_` field write-only (dead)** — `epp_component.cpp:31, .h:129`. Remove or expose.

- [ ] **L: `last_zones_json_` field write-only (dead)** — `.h:150, .cpp:555, 615`. Remove or wire to idempotency check (PR-8 above).

- [ ] **L: TAG `"zones"` covers all logs (relay/NVS/perspective/grid)** — `epp_component.cpp:14`. Use `"epp"` or split tags.

- [ ] **L: Repeated bounds-clamp setter pattern (11×) in header** — `epp_component.h:43-114`. Templated helper.

- [ ] **L: "Is target i live" predicate computed 4× with subtle differences** — `epp_component.cpp:139, 171-178, 207-208, 242`. Extract helper.

- [ ] **L: Hardcoded `static_timeout_=10` and `motion_timeout_=10` defaults duplicated against engine's `SensorInput`** — `epp_component.h:167-168`. One source of truth.

- [ ] **L: `transform_.apply` called twice per frame (smoothed + raw)** — `epp_component.cpp:51-56, 64-79`. Combine; bail early if no perspective.

- [ ] **L: `feed_targets` accepts 9 floats inline, not an array** — `epp_component.h:32-34`. Pass `ParsedTarget targets[NUM_TARGETS]`.

---

## PR 9 — Frontend: zone-engine parity (project-critical drift)

- [ ] **C: Frontend compares `signal` (0–9), firmware compares `frame_count`** — [zone-engine.ts:267-291](frontend/src/lib/zone-engine.ts#L267-L291) vs [epp_zone_engine.cpp:310,338](firmware/lib/epp_zone_engine/src/epp_zone_engine.cpp)
  Pick one space (recommend: firmware publishes `frame_count` per target and frontend compares against that). Update `feedback_engine_sync` if semantics intentionally diverge.

- [ ] **C: Overlay-exit handoff uses different "previous zone" source** — [zone-engine.ts:324-359](frontend/src/lib/zone-engine.ts#L324-L359)
  Add `lastZone: (number|null)[]` to `ZoneEngineState`; mirror firmware `target_last_zone_` semantics (set when in a zone, clear only after handoff fires).

- [ ] **M: `runLocalZoneEngine` hardcodes `staticTimeout: 10, motionTimeout: 10`** — [target-controller.ts:122-126](frontend/src/controllers/target-controller.ts#L122-L126)
  Use `host._staticTimeout` / `host._motionTimeout` for true preview parity.

---

## PR 10 — Frontend: render() purity / Lit reactivity

- [ ] **C: `_renderEditor` mutates `_targets[i].status` and `_sensorState` during render** — [eppgrid-panel.ts:2447-2461](frontend/src/eppgrid-panel.ts#L2447-L2461)
  Build new objects (`_targets.map(...)`) and reassign; or derive editor view from a getter.

- [ ] **C: `runLocalZoneEngine` reads `_targets` while panel mutates them after engine** — [eppgrid-panel.ts:2452](frontend/src/eppgrid-panel.ts#L2452)
  Don't mutate `_targets` after engine runs; pass `engineResult.targets` to children.

- [ ] **C: `epp-grid` mutates parent's `dismissedTargets` Map and dispatches event during render** — [epp-grid.ts:358-374](frontend/src/components/epp-grid.ts#L358-L374)
  Move undismiss detection to `willUpdate`/`updated`; never dispatch from `render()`.

- [ ] **H: Wizard RAF loop never cancelled on disconnect** — [epp-wizard.ts:130-187](frontend/src/components/epp-wizard.ts#L130-L187)
  `disconnectedCallback` sets `_wizardCaptureCancelled = true`; store and `cancelAnimationFrame`.

- [ ] **H: Stale closure on `raw` in env offset slider input** — [epp-settings-view.ts:322-344](frontend/src/components/epp-settings-view.ts#L322-L344)
  Recompute `raw` from live state per input event.

- [ ] **H: target-dot `targets.map((t,i) => ...)` is unkeyed → pills/colors leak across nodes** — [epp-grid.ts:396-426](frontend/src/components/epp-grid.ts#L396-L426)
  Use `repeat()` directive with stable key.

- [ ] **H: Off-by-one in target-dot bounds check** — [epp-grid.ts:334-339](frontend/src/components/epp-grid.ts#L334-L339)
  Compare against `maxCol`/`maxRow`, not `minCol + visCols`.

- [ ] **M: `_zoneEngineState.localZoneState` Map mutations don't notify Lit** — [eppgrid-panel.ts:414-419, 2540](frontend/src/eppgrid-panel.ts#L414-L419)
  Reassign or version-bump after engine runs.

- [ ] **M: `_dragState` not @state; comment about reactive intent missing** — `eppgrid-panel.ts:387-401`. Move into controller, or annotate.

- [ ] **M: `_setText(el.nextElementSibling!, ...)` null-deref risk** — `epp-settings-view.ts:340, 497, 539, 561, 584, 599, 611, 623, 636, 1036`
  Use `parentElement.querySelector(".setting-value")` or stored ref; null-guard.

- [ ] **M: settings-view `requestUpdate()` in `ha-select` handlers contradicts no-reactive-render rule** — `epp-settings-view.ts:773, 813, 952, 967, 1019, 1097, 1116`. Document or refactor.

- [ ] **M: `_resetSlider` parses display "—" with `parseFloat` returning NaN** — `epp-settings-view.ts:370-385`. Write em dash on NaN.

---

## PR 11 — Frontend: subscription/lifecycle leaks (controllers)

- [ ] **C: Subscription leak race in `_subscribeGridTargets`/`subscribeDisplay`** — [device-controller.ts:371-438, 442-470](frontend/src/controllers/device-controller.ts#L371-L438)
  Generation token; in `.then()`, only assign unsub if token matches; else immediately call `unsub()`.

- [ ] **C: Same race in `subscribeDeviceList`** — `device-controller.ts:145-162` and `flasher-controller.ts:217-230`. Apply same generation-token fix.

- [ ] **C: FlasherController hass-swap leaves stale subs/timers; no resubscribe** — [flasher-controller.ts:193-195](frontend/src/controllers/flasher-controller.ts#L193-L195)
  Detect `value.connection !== oldConn`, drop stale unsubs, clear `_otaUnsubs`/`_otaTimeouts`/in-progress otaStates, resubscribe if user is on flasher tab.

- [ ] **C: `applyLayout` mutates `_zoneConfigs` before async save** — [grid-state-controller.ts:588-607](frontend/src/controllers/grid-state-controller.ts#L588-L607)
  Build pruned slots locally; commit only after WS resolves (mirror furniture pattern).

- [ ] **C: `loadConfiguration` mutates host state then awaits `set_settings` with no rollback** — `grid-state-controller.ts:519-572`
  Snapshot pre-restore; rollback on failure or surface error banner.

- [ ] **H: `subscribeTargets` invokes stale unsub without try/catch** — `device-controller.ts:343-346`. Use existing `unsubscribeTargets()`.

- [ ] **H: `_handleOtaEvent` clears watchdog timer before checking state** — `flasher-controller.ts:95-128`. Move `_resetOtaTimeout` inside each `case`; default re-arms.

- [ ] **H: `_otaSuccess` 5s setTimeout not in `_otaTimeouts` map** — `flasher-controller.ts:134-140`. Track and clear in `hostDisconnected`.

- [ ] **H: `setCancelledDeviceIpHint` 8s timeout not cleared on hostDisconnected** — `flasher-controller.ts:23, 320-333, 42-53`. Clear in `hostDisconnected`.

- [ ] **H: `_applyDeviceList` crashes if backend omits `devices`** — `device-controller.ts:154`. Default to `[]`.

- [ ] **H: Hardcoded English "Zone N" in `addZone`** — [grid-state-controller.ts:217](frontend/src/controllers/grid-state-controller.ts#L217)
  Use `localize("live.debug.zone_n", { n: firstEmpty })`.

- [ ] **H: `_initRetryTimer` orphaned across disconnect/in-flight init** — [eppgrid-panel.ts:783-813, 629-635](frontend/src/eppgrid-panel.ts#L783-L813)
  Guard `setTimeout` with `if (this.isConnected)`; check at top of timer callback.

- [ ] **H: `history.pushState/replaceState` wrap state can be poisoned across panel instances** — `eppgrid-panel.ts:603-608, 642-645`
  Stash truly-original on `window.__eppOriginalPushState` once; chain off it.

- [ ] **M: Connection-swap branch in `device-controller` forgets `_unsubDeviceList` and `_targetRetryTimer`** — `device-controller.ts:84-92`. Reset both.

- [ ] **M: `loadDeviceConfig` returns null on concurrent re-entry** — `device-controller.ts:237-258`. Dedupe via per-mac in-flight promise.

- [ ] **M: Backend-supplied `devices` array sorted in place** — `device-controller.ts:122-124, 176-178`. Defensive `[...devices].sort(...)`.

- [ ] **M: `_handleUsbFlash` doesn't await port.close()** — [eppgrid-panel.ts:3157-3162](frontend/src/eppgrid-panel.ts#L3157-L3162). Await close, mirror `_handleFlasherCancel`.

- [ ] **M: `panel-mount-guard` double-install on module reload leaves old listener attached** — [panel-mount-guard.ts:91-106](frontend/src/panel-mount-guard.ts#L91-L106). Uninstall first if flag set.

- [ ] **M: `_handleUsbFlash` cancel reported as `flash_failed` because `lastStep="flashing"`** — `eppgrid-panel.ts:3036-3044, 3145-3191`. On `flasher.errors.flash_cancelled`, call `resetUsbState()` instead of error UI.

- [ ] **M: `runWifiScan` reader release/re-acquire orphans WeakMap pending-read entries** — [usb-flash-service.ts:270-321](frontend/src/lib/usb-flash-service.ts#L270-L321), [improv-serial.ts:20-23](frontend/src/lib/improv-serial.ts#L20-L23)
  Add `releaseReader(r)` helper that also `_pendingReads.delete(r)`.

- [ ] **L: `serialPort.close()` in `hostDisconnected` doesn't release reader/writer locks** — `flasher-controller.ts:42-53`. Common cleanup helper.

---

## PR 12 — Frontend: components polish (UX, a11y, theming)

- [ ] **H: Tooltip listener leaks (no outside-click/Escape/scroll listener)** — [epp-settings-view.ts:418-443](frontend/src/components/epp-settings-view.ts#L418-L443)
  Use `<ha-tooltip>` (Web Awesome) or wire pointer-down/scroll/resize close listeners; add `aria-describedby`.

- [ ] **H: Wifi password persists across SSID switch in flasher** — [epp-flasher-view.ts:805-813](frontend/src/components/epp-flasher-view.ts#L805-L813)
  Clear `_wifiPassword` whenever SSID changes; on cancel.

- [ ] **H: Capture overlay z-index 1000 with no focus trap, no Escape** — [epp-wizard.ts:446-457](frontend/src/components/epp-wizard.ts#L446-L457)
  Focus-trap + keydown listener for Escape; focus Cancel on open.

- [ ] **H: live-sidebar zone-state ordering puts slot 0 last; editor puts it first** — [epp-live-sidebar.ts:202-229](frontend/src/components/epp-live-sidebar.ts#L202-L229)
  Match editor ordering (slot 0 first).

- [ ] **H: epp-furniture-overlay forwards rotation only as cursor; resize handles don't carry rotation** — [epp-furniture-overlay.ts:225-235](frontend/src/components/epp-furniture-overlay.ts#L225-L235)
  Forward rotation in event detail or have parent always read `item.rotation` at drag start.

- [ ] **H: applyPerspective returns NaN for all-zeros perspective; downstream consumers don't guard** — [room-geometry.ts:31-38](frontend/src/lib/room-geometry.ts#L31-L38)
  Return null when `len < 1e-6`; reject all-zeros in `parseCalibration`.

- [ ] **H: parseFurniture accepts `f.x = "potato"` via `??`** — [config-serialization.ts:96-109](frontend/src/lib/config-serialization.ts#L96-L109)
  Coerce + validate types.

- [ ] **M: `_setOverlay` triggers full layout save + view-switch on each click** — [eppgrid-panel.ts:2179-2191](frontend/src/eppgrid-panel.ts#L2179-L2191)
  Add narrow `eppgrid/set_overlay_cell` WS endpoint; or wrap in try/catch and don't set `_dirty` for one-shot.

- [ ] **M: Hardcoded colors in many components violate `feedback_ha_theming`** — see `epp-flasher-view.ts:117-140`, `epp-live-sidebar.ts:97`, `epp-wizard.ts:342, 355, 410, 638`, `epp-grid.ts:38-40, 132`. Replace with `var(--success-color)` etc.

- [ ] **M: `mwc-list-item` style hint / `--mdc-theme-primary`** — `epp-flasher-view.ts:249-251`
  Use `appearance="accent"` consistently; drop mwc theme override.

- [ ] **M: Repeated `@closed=${e => e.stopPropagation()}` on every ha-select** — settings-view 7+ sites
  Extract `stopClosed = (e) => e.stopPropagation()`.

- [ ] **M: zone-sidebar dispatches both `zone-config-change` and `dirty` events** — `epp-zone-sidebar.ts:241-247, 274-279, 354-366` etc. Drop redundant `dirty` events.

- [ ] **M: `_fireDirty` directly mutates `.save-btn.disabled` (bypasses Lit)** — `epp-settings-view.ts:391-394, 1242-1245`. Throttle parent re-renders or derive disabled from a getter.

- [ ] **M: ha-icon-picker `e.detail.value || ""` swallows undefined** — `epp-furniture-sidebar.ts:236-244`. Distinguish null from empty.

- [ ] **M: `parseInt(value, 10)` on furniture rotation drops decimals** — `epp-furniture-sidebar.ts:174-189`. `parseFloat`.

- [ ] **M: rotation modulo with negative numbers shows -90 instead of 270** — `epp-furniture-sidebar.ts:187`. `((x % 360) + 360) % 360`.

- [ ] **M: Wizard `_smoothBuffer` not cleared on cancel** — `epp-wizard.ts:66, 90-105`.

- [ ] **M: Wizard chip click doesn't null `_perspective`** — `epp-wizard.ts:776-787`.

- [ ] **M: `_renderConfigurationRestoreDialog` shows un-loadable templates** — `eppgrid-panel.ts:2698-2700`. Filter by length=8.

- [ ] **L: Repeated entity-toggle handler inlined 8× in settings-view** — `epp-settings-view.ts:689-871`. Use existing `entityToggleHandler`.

- [ ] **L: `intl-messageformat` compile errors uncaught** — [localize.ts:54-68](frontend/src/localize.ts#L54-L68). Try/catch fallback to identity.

- [ ] **L: `navigator.clipboard.writeText` not awaited; rejection silent** — `eppgrid-panel.ts:2792-2796, 2860-2862`. Add catch or transient "Copied" indicator.

- [ ] **L: `_furnitureClipboard` survives forever** — `eppgrid-panel.ts:386`. Clear on device switch.

- [ ] **L: parseScanResults accepts SSIDs with control chars** — `improv-serial.ts:393-427`. Strip ` -`; clamp length.

- [ ] **L: 8x8 px furniture resize handles too small for touch** — `epp-furniture-overlay.ts:82-100`. Larger transparent hit area.

- [ ] **L: Icon-only buttons missing `aria-label`** — `epp-live-sidebar.ts:271-278, 317-324`, `epp-zone-sidebar.ts:301-313`.

- [ ] **L: OTA retry button has no spinner** — `epp-flasher-view.ts:582-591`. Per `project_ota_feedback`.

- [ ] **L: `host` styles use deprecated `--paper-font-body1_-_font-family`** — `eppgrid-panel.ts:158-166`. Use `--ha-font-family-body`.

---

## PR 13 — Frontend: efficiency hot paths

- [ ] **H: `_renderLiveGrid` calls `_autoDetectionRange()` (full-grid scan) per render** — [eppgrid-panel.ts:2114](frontend/src/eppgrid-panel.ts#L2114)
  Use cached `_computeMaxRangeMm()`.

- [ ] **M: `getSmoothedValue` rebuilds buffer every call** — [coordinates.ts:75-107](frontend/src/lib/coordinates.ts#L75-L107). Circular buffer or in-place prune.

- [ ] **M: `_buildFrontendDebugLog` walks grid + targets 3-4× per push** — [target-controller.ts:357-432](frontend/src/controllers/target-controller.ts#L357-L432). Cache `allZoneIds` invalidated on layout change.

- [ ] **M: `clearZoneFromGrid` returns fresh Uint8Array even when unchanged** — [cell-painting.ts:117-132](frontend/src/lib/cell-painting.ts#L117-L132). Return null/grid identity when unchanged.

- [ ] **L: `parseImprovPackets` quadratic on garbled streams** — `improv-serial.ts:199-267`. `Uint8Array.indexOf` to next `'I'`.

- [ ] **L: `_dismissTooltips` queries shadowRoot on every window click** — `eppgrid-panel.ts:520-524`. Settings view should manage own listener.

- [ ] **L: `_fovCache` keyed by reference** — `epp-grid.ts:201-211`. Either hash contents or document contract.

- [ ] **L: `epp-grid` mouseenter cell handler not throttled** — `epp-grid.ts:280-283`. ~900 events per drag.

- [ ] **L: zone-sidebar zone-name input never debounced** — `epp-zone-sidebar.ts:258-300`.

- [ ] **L: `expandEntities` helper is a one-liner; consider inlining** — `settings-defaults.ts:155-159`.

- [ ] **L: localize `formatCache` unbounded** — `localize.ts:51, 62-66`. LRU cap.

- [ ] **L: `setShowRoomCalibrationTutorial` redundant call per push** — `device-controller.ts:151-153`. Already deduped internally; trivial.

---

## PR 14 — Frontend: dead code, duplication, types

- [ ] **H: `FOV_X_EXTENT` declared in two places** — [coordinates.ts:51](frontend/src/lib/coordinates.ts#L51) + [constants.ts:446-447](frontend/src/constants.ts#L446-L447). Consolidate.

- [ ] **M: `Target.x/y` typed non-nullable but backend sends null** — [types.ts:3-9](frontend/src/types.ts#L3-L9), [device-controller.ts:375-381](frontend/src/controllers/device-controller.ts#L375-L381). Change to `number | null`.

- [ ] **M: `Target.speed` always 0; never read** — `types.ts:6`, `device-controller.ts:378`. Drop or wire.

- [ ] **M: `DeviceController.loading` field unused** — `device-controller.ts:43`. Delete.

- [ ] **L: `_perspective` prop in live-sidebar only used as boolean** — [epp-live-sidebar.ts:49](frontend/src/components/epp-live-sidebar.ts#L49). Pass `hasPerspective: boolean`.

- [ ] **L: Empty `.level-selector`/`.level-buttons` CSS classes** — [epp-overlay-sidebar.ts:64-77](frontend/src/components/epp-overlay-sidebar.ts#L64-L77). Remove dead CSS.

- [ ] **L: `_buildSparseSettings` / `_buildSettingsPayload` / `SETTINGS_DEFAULTS` triple-source-of-truth** — `eppgrid-panel.ts:1099-1136`
  Single `SETTINGS_FIELDS` schema; derive both serialization and field-map.

- [ ] **L: Duplicated unsubscribe try/catch idiom across all four controllers** — 5 sites. Extract `safeUnsub(unsub)` helper.

- [ ] **L: Duplicated debug-log timestamp/dedupe/cap logic** — `target-controller.ts:262-327`. Extract `_appendLog` helper.

- [ ] **L: `(this.host as any).hass.callWS` mixed with `this.host.hass.callWS`** — grid-state-controller.ts multiple. Drop redundant casts.

- [ ] **L: Inconsistent `requestUpdate()` calls after @state mutations** — `grid-state-controller.ts:197-243, 273-287`. Drop redundants.

- [ ] **L: `addZone` color-fallback branch unreachable** — `grid-state-controller.ts:213-215`. Drop fallback.

- [ ] **L: `getResizeCursor` "default" branch unreachable** — `furniture.ts:316-335`.

- [ ] **L: `getRoomBounds`/`getRawRoomBounds` duplicated logic** — `grid.ts:44-95`. Refactor.

- [ ] **L: `getZoneThresholds` silent hardcoded fallback** — `zone-defaults.ts:134-139`. Warn or return null.

- [ ] **L: `solvePerspective` Gaussian elim no row scaling** — `perspective.ts:9-53`. Pre-scale source coords.

- [ ] **L: `static_state`/`motion_state` type comment wrong** — `epp-live-sidebar.ts:13-14`. Use `"A" | "P" | "I"`.

- [ ] **L: TARGET_COLORS palette has 3 entries; assert cap** — `epp-grid.ts:399, 421-422`.

- [ ] **L: `parseInt(z?.replace("Z", "") ?? "0", 10)` produces "Zone NaN"** — `target-controller.ts:214, 225`. `Number.isFinite` guard.

- [ ] **L: `console.warn`/`console.error` only error surface in `saveSettings`** — `grid-state-controller.ts:761`. Add `onError?` host callback.

- [ ] **L: `host: ReactiveControllerHost & Record<string, any>` permits typos** — `target-controller.ts:25`, `grid-state-controller.ts:57`. Define real interface.

- [ ] **L: `firmwareBaseUrl` not URL-validated** — `epp-flasher-view.ts:541, 1037-1040`. Assert `https:` protocol.

---

## How to use this document

- Each PR section is sized so a subagent or worktree can take it end-to-end in one session.
- Order suggestion: **PR 1 → PR 7 → PR 8 → PR 9 → PR 10 → PR 11 → PR 2 → PR 6 → rest**. (Security first, then engine-parity / data-loss bugs, then resilience, then polish.)
- For each finding, follow TDD: failing test → minimal fix → verify green. The pre-push checklist (`scripts/pre-push-fast.sh`) must pass before opening the PR.
- Cross-cutting tests: zone-engine parity tests already exist in `firmware/lib/epp_zone_engine/tests/test_parity.cpp` and `frontend/src/__tests__/panel-zone-engine-parity.test.ts` — extend them when fixing PR 9.
- Mark items off as PRs land. Don't lose the un-fixed ones in this doc.
