# Pre-1.0 Code Review Tracker

Findings from the multi-agent review on 2026-05-03. Grouped into PR-sized chunks so each can be picked up independently in a subagent/worktree. Check items off as PRs land.

Severity legend: **C** = critical (security/data-loss/correctness), **H** = high, **M** = medium, **L** = low.

---

## PR 1 — WebSocket auth & input validation (security)

Goal: lock down trust boundaries. Single self-contained PR.

- [x] **C: Firmware proxy is unauthenticated** — [custom_components/eppgrid/firmware_proxy.py:26](custom_components/eppgrid/firmware_proxy.py#L26) — _shipped: PR #164_
  Set `requires_auth = True` (panel attaches `Authorization: Bearer <hass.auth.accessToken>`). Add `aiohttp.ClientTimeout(total=60, sock_read=15)` and a 16 MiB cap enforced via `Content-Length` pre-check + running total over `iter_chunked(64 KiB)`. Body is buffered (bounded by the cap) into a `web.Response`, not streamed via `StreamResponse` — the cap is the load-bearing security property; streaming was deemed unnecessary given a 16 MiB ceiling. Timeouts return 504; oversize uploads return 502.

- [x] **C: Add `@websocket_api.require_admin` to every state-mutating WS command** — [custom_components/eppgrid/websocket_api/_devices.py](custom_components/eppgrid/websocket_api/_devices.py), [_firmware.py](custom_components/eppgrid/websocket_api/_firmware.py) — _shipped: PR #174_
  Affected: `update_firmware`, `set_setup`, `set_room_layout`, `set_settings`, `set_distance_override`, `set_pipeline`, `set_entity_enabled`, `save_configuration`, `delete_configuration`, `set_show_room_calibration_tutorial`. Read-only `list_*`/`subscribe_*`/`get_config` stay open.

- [x] **C: `grid_bytes` schema unbounded** — [_devices.py:211](custom_components/eppgrid/websocket_api/_devices.py#L211)
  `vol.All([vol.All(int, vol.Range(min=0, max=255))], vol.Length(min=1, max=GRID_COLS*GRID_ROWS))`. — _shipped: PR 1 closeout_

- [x] **C: Unknown MACs flood storage** — `_devices.py:171, 232, 870, 1009`
  After `_check_firmware_version`, assert `mac in manager.devices` and `send_error("device_not_found", ...)` otherwise. Validate MAC format with `vol.Match(...)` regex. — _shipped: PR 1 closeout_

- [x] **C: `add_esphome_device` user_id branch is dead** — [_flasher.py:170-200](custom_components/eppgrid/websocket_api/_flasher.py#L170-L200)
  Replace `connection.context.user_id` (it's a method, not attr) with `connection.user.id`. Cap host length to 253. — _shipped: PR 1 closeout_

- [x] **H: All voluptuous string schemas are unbounded** — across `_devices.py`/`_firmware.py`/`_flasher.py`
  Apply `vol.All(str, vol.Length(max=N))` to every string field. Validate `mac` format. Cap `configuration` dict size. — _shipped: PR 1 closeout_

- [x] **H: Diagnostics leak MAC + LAN IP** — [diagnostics.py:38-45](custom_components/eppgrid/diagnostics.py#L38-L45)
  Run output through `async_redact_data(payload, {"mac", "host"})`. Replace MAC keys with stable indices. — _shipped: PR 1 closeout_

- [x] **L: `_validate_zone_slots` accepts bool as numeric** — [websocket_api/__init__.py:56-71](custom_components/eppgrid/websocket_api/__init__.py#L56-L71)
  `isinstance(v, (int, float)) and not isinstance(v, bool)`. — _shipped: PR 1 closeout_

- [x] **L: `set_setup` allows negative `room_width`/`room_depth`** — `_devices.py:151-153`. `vol.Range(min=0, max=50_000)` mm (firmware uses mm; ~50 m max room). — _shipped: PR 1 closeout_

- [x] **L: `_validate_zone_slots` doesn't bound `name`/`color`/`type` lengths** — [websocket_api/__init__.py:35-72](custom_components/eppgrid/websocket_api/__init__.py#L35-L72) — _shipped: PR 1 closeout_

---

## PR 2 — Connection lifecycle & subscription leaks (backend)

- [x] **C: `async_close_session` doesn't take session lock** — _shipped: this PR_
  Close acquires `_session_locks[mac]` so it serializes with in-flight open. Open re-checks `_is_device_available(mac)` after `async_connect` returns and tears down the just-opened conn if the device flipped offline mid-connect.

- [x] **C: Build-flag fetch broad `except Exception`** — _shipped: this PR_
  Narrowed to `_BUILD_FLAGS_TRANSIENT` / `_BUILD_FLAGS_CONNECT_TRANSIENT` tuples (Timeout, OS, Value, Runtime, ConnectionError, APIConnectionError) so unexpected programmer errors propagate instead of getting swallowed at debug level. Cache poisoning was already prevented; this is the exception-narrowing follow-up.

- [x] **C: `noise_psk` hardcoded empty** — _shipped: verified 2026-05-04_
  All callers (`async_open_session`, `async_trigger_ota`, `_fetch_build_flags`, `_push_config_to_device`) pass `_extract_noise_psk(...)` to `DeviceConnection`.

- [x] **H: `_compare_firmware_version` swallows parse errors as `firmware_behind`** — _shipped: verified 2026-05-04_
  Returns `None` on parse failure; `_sync_firmware_repair_issue` short-circuits when status is None — no false-positive repairs issue.

- [x] **H: `read_firmware_version` returns `"0.0.0"`** — _shipped: verified 2026-05-04_
  Returns `None` for missing/unavailable entities; callers handle None as "unknown".

- [x] **H: Dict mutation during iteration in `_on_esphome_entry_updated`** — _shipped: verified 2026-05-04_
  Iterates `list(self.devices.items())` snapshot.

- [x] **H: Fire-and-forget tasks not tracked** — _shipped: verified 2026-05-04_
  `_spawn` helper adds tasks to `_pending_tasks` set + done-callback discard; awaited in `async_stop` Phase 2.

- [x] **H: `async_stop` disconnects sequentially with no timeout** — _shipped: verified 2026-05-04_
  Phase 3 uses `asyncio.gather(*_safe_disconnect(...), return_exceptions=True)` with per-disconnect `_disconnect_timeout`.

- [x] **H: OTA opens a fresh `DeviceConnection` instead of reusing session** — _shipped: verified 2026-05-04_
  `async_trigger_ota` prefers `get_session(mac)`; only falls back to fresh connection when no session exists.

- [x] **H: OTA path reaches into `conn._client` / `conn._services`** — _shipped: verified 2026-05-04_
  `DeviceConnection.async_execute_service` abstraction in place; OTA paths route through it.

- [x] **M: `_on_state_changed` listens to literal `"state_changed"` for entire HA bus** — _shipped: verified 2026-05-04_
  Uses `async_track_state_change_event` keyed on the managed entity_ids list (`_refresh_state_listener`).

- [x] **M: `_on_state_changed` early-returns on `old_state is None`** — _shipped: verified 2026-05-04_
  Treats `old_state is None` as `STATE_UNAVAILABLE`.

- [x] **M: `subscribe_states` race + missing exception isolation** — _shipped: verified 2026-05-04_
  `_subscribe_lock` serializes subscribe path; `_dispatch_state` isolates per-callback exceptions.

- [x] **M: `_on_device_available` retry hangs without bounded backoff** — _shipped: verified 2026-05-04_
  Bounded exponential backoff (1s/3s/9s) with availability re-check between retries.

- [x] **L: `_release_references` called twice on async_disconnect path** — _shipped: verified 2026-05-04_
  Single fire path via `_on_stop`; client-presence guard prevents double-release.

- [x] **L: `_DEVICE_LOGGER.setLevel(DEBUG)` global mutation** — _shipped: verified 2026-05-04_
  No `setLevel` mutation in app code.

---

## PR 3 — Backend cleanup, dead code, BWC removal

- [x] **H: Templates→configurations migration violates "no BWC" rule** — _shipped: this PR_
  Legacy `test_legacy_templates_key_is_ignored` deleted from `tests/test_storage.py`; storage.py migration block was already removed.

- [x] **H: Options flow doesn't reload config entry** — _shipped: verified 2026-05-04_
  `entry.add_update_listener(_async_update_listener)` registered; `async_unload_entry` removes panel + JS URL.

- [x] **H: Frontend resources accumulate across reloads** — _shipped: verified 2026-05-04_
  `_JS_URL_KEY` tracks last-registered URL; old removed before new added.

- [x] **M: `manifest.json` read with blocking I/O at module-import time** — _shipped: verified 2026-05-04_
  Both `diagnostics.py` and `websocket_api/__init__.py` use `async_get_loaded_integration(hass, DOMAIN).version` at request time.

- [x] **M: `EMPTY_ZONE_SLOTS` is module-level mutable** — _shipped: verified 2026-05-04_
  Replaced with `empty_zone_slots()` function returning a fresh list of fresh dicts.

- [x] **M: `_REGISTERED` private cross-module import** — _shipped: verified 2026-05-04_
  Guard removed.

- [x] **M: `set_setup` reads `room_layout` from a dict it just popped** — _shipped: verified 2026-05-04_
  Dead `.get("room_layout", {}).get(...)` removed; uses `empty_zone_slots()`.

- [x] **M: `delete_esphome_device` `break` placement** — _n/a_
  No `delete_esphome_device` loop with mis-placed break in current code; existing breaks are correctly nested.

- [x] **M: `_get_entity_states` "any enabled" semantics** — _shipped: verified 2026-05-04_
  Uses AND semantics for category keys (`result[key] = result[key] and enabled`).

- [x] **L: `get_device(mac)` is a thin wrapper** — _shipped: verified 2026-05-04_
  Removed.

- [x] **L: `_resolve_zone_name` only strips one locale's prefix** — _shipped: verified 2026-05-04_
  Builds set of all locale prefixes and strips each.

- [x] **L: `_extract_mac` doesn't normalize via `dr.format_mac`** — _shipped: verified 2026-05-04_
  Uses `dr.format_mac(conn_id).upper()`.

- [x] **L: Substring matching for `firmware_version`/zone unique_ids** — _shipped: verified 2026-05-04_
  All checks use `.endswith("-firmware_version")` or `.endswith(f"-zone_{i}_...")` with proper separators.

---

## PR 4 — Backend efficiency: registry scans, tracking, observers

- [ ] **H: Bus-wide `state_changed` listener** (also tracked under PR 2) — see PR 2.

- [x] **M: `list_devices` does 3-4 entity-registry scans per device** — [device_manager/__init__.py:749-777](custom_components/eppgrid/device_manager/__init__.py#L749-L777) — _shipped: PR #167_
  Build `{device_id: list[RegistryEntry]}` once; reuse for `list_flashable_devices`. `read_firmware_version` called twice for same id at lines 845 + 854.

- [x] **M: `async_update_zone_entities` does 16 registry scans (8 zones × 2 suffixes)** — [device_manager/__init__.py:867-972](custom_components/eppgrid/device_manager/__init__.py#L867-L972) — _shipped: PR #167_
  Use `er.async_entries_for_device(...)` once and dispatch by unique_id substring in a single pass.

- [x] **M: `_on_device_registry_updated` does O(N) linear scan per event** — `device_manager/__init__.py:472-477` — _shipped: PR #167_
  Maintain `device_id → mac` reverse map.

- [x] **M: `_sync_firmware_repair_issue` re-fires on every device-registry change** — `device_manager/__init__.py:485-500` — _shipped: PR #167_
  Skip unless firmware_version actually changed.

- [x] **L: `list_flashable_devices` missing `include_disabled_entities=True`** — `device_manager/__init__.py:821`. Per `feedback_include_disabled_entities`. — _shipped: PR #167_

- [x] **L: Hot-path imports inside `_on_state` callbacks** — `_devices.py:666, 745` — _shipped: PR #167_
  Hoist `import math`, `import json as json_mod`, `from aioesphomeapi import …` to module scope.

- [ ] **L: Storage hit on every device removal** — `device_manager/__init__.py:524` — _wontfix: PR #167_
  Originally proposed: use `Store.async_delay_save` for batched debounced writes. Explored in PR #167, then reverted on review feedback — debouncing trades durability of explicit user-delete actions for a marginal bulk-coalesce win, and a force-restart inside the debounce window can resurrect the deleted config on rediscovery.

- [x] **L: `_LOGGER.info` chatty per push** — `_connection.py:217, 238, 269, 284, 292, 300, 317, 332, 343, 355` — _shipped: PR #167_
  Demote per-section to debug; one info summary at end.

---

## PR 5 — WebSocket DRY (decorators / boilerplate consolidation)

- [x] **M: `_require_manager` decorator + handler boilerplate consolidation** — _shipped: verified 2026-05-04_
  `@_require_manager` decorator (sync + async) in `websocket_api/__init__.py` injects `manager` as 4th arg; used across all handlers.

- [x] **M: `_check_firmware_version` block deduplicated** — _shipped: verified 2026-05-04_
  `@_require_manager(check_firmware=True)` decorator handles all 5 sites at once.

- [x] **L: `_send_update` shape consolidated** — _shipped: verified 2026-05-04_
  `_flashable_payload(hass, manager)` helper extracted.

- [x] **L: `_unsub` callback closures** — _shipped: verified 2026-05-04_
  Direct `unsub` stored where possible; `_flasher.py` wrapper retained because it manages a `closed` flag + task cancellation (not boilerplate).

- [x] **L: `_compute_pipeline` location** — _shipped: verified 2026-05-04_
  Lives in `device_manager/_helpers.py`.

- [x] **L: Late `_compare_firmware_version` import** — _shipped: verified 2026-05-04_
  Hoisted to module-level in `websocket_api/__init__.py`.

- [x] **L: `had_session` consolidation** — _shipped: verified 2026-05-04_
  Single `manager.get_session(mac)` call cached in `device_conn`; `had_session = device_conn is not None` derived.

---

## PR 6 — OTA correctness & resilience

- [x] **H: `update_firmware` reimplements `manager.async_trigger_ota`** — _shipped: verified 2026-05-04_
  Delegates to `manager.async_trigger_ota(msg["mac"])` with `HomeAssistantError` catch + `_send_exception`.

- [x] **H: `subscribe_ota_progress` leaks log subscription / firmware log level** — _shipped: verified 2026-05-04_
  `started_log_sub` + `bumped_log_level` flags; `_unsub` reverts both via `unsubscribe_logs()` and `_async_revert_log_level()`.

- [x] **H: OTA "in_progress" terminal-state race** — _shipped: verified 2026-05-04_
  Dual-sentinel latching (`in_progress=True` OR version-mismatch); arms 5-min outer timeout (`_OTA_OUTER_TIMEOUT_S`); emits `state: error` if timeout fires.

- [x] **H: `subscribe_ota_progress` no None-check on `_client`** — _shipped: verified 2026-05-04_
  Guards `device_conn is None or device_conn._client is None` before proceeding.

- [x] **M: Concurrent OTA on same device unguarded** — _shipped: verified 2026-05-04_
  `_ota_locks: dict[str, asyncio.Lock]` mirrors `_session_locks`; fast-fails with `ota_in_progress` error if already locked.

- [x] **M: `subscribe_device` `_unsub` race with re-subscribe** — _shipped: verified 2026-05-04_
  Uses `manager.schedule_close_session(mac)` (refcounted + pending-task tracked); `async_open_session` awaits any pending close.

- [x] **M: `_send_update` in `subscribe_flashable_devices` unguarded** — _shipped: verified 2026-05-04_
  In-flight tasks tracked in `in_flight` set; `_unsub` cancels them; `send_message` wrapped in try/except.

- [x] **M: `set_distance_override` silently succeeds with no session** — _shipped: verified 2026-05-04_
  Sends error with `translation_key="no_active_session"`.

- [x] **M: Generic exception swallowing in WS state callbacks** — _shipped: this PR_
  Raw-targets callback already used `_parse_position_csv` (length-guarded). Zone-state JSON parse silent `(ValueError, KeyError): pass` now logs at debug with the mac + error so a regression isn't hidden.

- [x] **M: Connection-failure broadcasts global `_fire_device_list_changed()`** — _shipped: this PR_
  Offline transition in `_on_state_changed` only fires when `dev.available` was True (i.e., this is the actual available→unavailable flip), and flips `dev.available` to False so subsequent unavailable→unknown pings during the same disconnect don't re-fire. Connection-failure (websocket subscribe_device) was already transition-guarded via `_connection_failed`.

---

## PR 7 — Firmware: zone engine library bugs

- [x] **C: `Grid::xy_to_cell` truncates negative offsets toward zero** — [epp_grid.cpp:17-25](firmware/lib/epp_zone_engine/src/epp_grid.cpp#L17-L25)
  Use `std::floor`; bounds-check `fx`/`fy` in float space before the int cast (avoids UB on huge finite inputs). Shared `Grid::xy_to_col_row` helper extracted; `ZoneEngine::tick` reuses it.

- [x] **H: `RollingWindow::MAX_FRAMES` and file-local `ROLLING_MAX_FRAMES` can desynchronize** — [epp_rolling_window.cpp:11](firmware/lib/epp_zone_engine/src/epp_rolling_window.cpp#L11)
  `MAX_FRAMES` promoted to public; file-local duplicate dropped.

- [x] **H: Rolling-window `expire_old` unsigned-subtraction underflow on out-of-order timestamps** — `epp_rolling_window.cpp:38-48`
  Out-of-order `now_ms < tail_ts` resets the buffer (monotonic-violation handling). Guarding the underflow alone left disordered frames behind a no-longer-monotonic tail — a later in-order feed could fail to expire frames already past the window.

- [x] **H: Cell-coord arithmetic duplicated and unsynchronized between Grid and ZoneEngine::tick** — `epp_zone_engine.cpp:233-234, 240-242`
  Extracted `Grid::xy_to_col_row(x, y, &col, &row) -> bool`. tick() bails defensively if the helper rejects, instead of storing garbage in `target_prev_col_/row_`.

- [x] **H: `Grid::cell_zone`/`cell_is_room`/`cell_overlay` lack bounds checks** — [epp_grid.cpp:27-37](firmware/lib/epp_zone_engine/src/epp_grid.cpp#L27-L37)
  Each returns a safe default (0 / false / 0) on out-of-bounds index.

- [x] **H: `parse_zone_configs` silently drops 9th+ slot; no value-range validation on trigger/renew/timeout** — [epp_zone_config_parser.h:25-41](firmware/lib/epp_zone_engine/include/epp_zone_config_parser.h#L25-L41)
  Drop slot indices >= MAX_ZONE_SLOTS; clamp `trigger`/`renew` to [1, 9]; clamp `timeout`/`handoff_timeout` to >= 0.

- [x] **H: `find_zone_index` couples zone_id to slot-index by convention only** — `epp_zone_engine.cpp:118-122, 51-78`
  Documented invariant (slot_index == config.id, established by parse_zone_configs).

- [x] **H: Step-2b overlay-exit handoff reads `tw.on_overlay` for inactive targets** — [epp_zone_engine.cpp:431-456](firmware/lib/epp_zone_engine/src/epp_zone_engine.cpp#L431-L456)
  Engine now tracks its own sticky `target_overlay_sticky_[]` so step-2b doesn't depend on the caller's stickiness contract.

- [x] **M: `set_zones` doesn't fully reset `ZoneRuntime[]`** — `epp_zone_engine.cpp:51-78`
  Resets every slot up front (not just the configured ones), so a disabled slot can't carry stale state into a future re-enable.

- [x] **M: `set_zones` doesn't reset `target_last_zone_[]` or `dismissed_cell_[]`** — `epp_zone_engine.cpp:81-87`. Both reset, plus overlay sticky.

- [x] **M: `dismiss_target` clobbers ALL targets' confirmation bits** — `epp_zone_engine.cpp:98-116`
  Clears only the dismissed target's bit. If other targets remain confirmed, zone state is preserved.

- [x] **M: `tick()` clears result but not log buffer; consumers may read stale `[log_count, MAX)` entries** — `epp_zone_engine.cpp:143-144`
  Documented (existing comment): consumers must respect `log_count`. Trade-off accepted: no per-tick zeroing of unused slots.

- [x] **M: Force-clear (Step 5c) doesn't emit "clear" log when triggered after Step 3 already snapshotted state** — `epp_zone_engine.cpp:483-495`
  Moved "log transitions" loop after Step 5c. Force-clear now emits both `Zone N: force-clear` and `Zone N: clear`.

- [x] **M: `log_()` lacks `__attribute__((format(printf, 3, 4)))`** — [epp_zone_engine.h:118](firmware/lib/epp_zone_engine/include/epp_zone_engine.h#L118). Added.

- [x] **L: `RelayEvalResult.should_update` always true (dead field)** — [epp_relay.h:32-55](firmware/lib/epp_zone_engine/include/epp_relay.h#L32-L55). Dropped; consumer simplified.

- [ ] **L: `Grid::cell()` non-const overload is unused & unbounded** — [epp_grid.h:38-39](firmware/lib/epp_zone_engine/include/epp_grid.h#L38-L39).
  Skipped: review's "unused" premise was wrong — used by `epp_component.cpp` and ~30 test sites for cell setup. Migrating tests to a bounded setter is too much churn for an L-priority cleanup.

- [ ] **L: `RollingWindow::output()` stack buffers are 384 B per call** — `epp_rolling_window.cpp:80-83`
  Skipped: 384 B is fine for ESP32 stack (~8 KB main task); refactor cost (API churn) outweighs benefit until MAX_FRAMES grows.

- [x] **L: `RAW_FPS=10` hardcoded denominator** — `epp_zone_engine.cpp:130`. Made configurable via `set_raw_fps()`.

- [x] **L: `dismissed_cell_` brace-init `{-1, -1, -1}` breaks if `MAX_TARGETS` changes** — [epp_zone_engine.h:98](firmware/lib/epp_zone_engine/include/epp_zone_engine.h#L98). Initialised in the constructor instead.

- [x] **L: `set_grid` doesn't invalidate per-target / zone caches** — `epp_zone_engine.cpp:43-45`.
  Resets target tracking + dismissed_cell_ + overlay sticky (cell indices are meaningful only under the grid that produced them).

- [x] **L: `Grid::load_from_bytes` doesn't zero tail when len < cell_count** — `epp_grid.cpp:39-44`.
  Zeroes the tail; also early-returns on negative `len` to avoid OOB write.

- [x] **L: `set_coefficients(nullptr)` crashes** — [epp_calibration.cpp:7-14](firmware/lib/epp_zone_engine/src/epp_calibration.cpp#L7-L14). Silent no-op.

- [x] **L: NaN propagation in `SensorTransform::apply` and `Grid::xy_to_cell`** — `epp_calibration.cpp:20-37`
  Both reject NaN/Inf at entry; Grid also bounds-checks in float space before the int cast (avoids UB on huge finite inputs).

---

## PR 8 — Firmware: ESPHome component glue

PR 8 was split into 4 stacked sub-PRs (#171, #177, #180, #183). All 28 items addressed; new host-testable lib `firmware/lib/epp_component_helpers/` (header-only INTERFACE) absorbed the pure-logic extractions, with ~78 doctest cases.

- [x] **C: Frame data race between `feed_targets` and `loop()` drops frames silently** — _shipped: PR #171_
  SPSC ring buffer (`FrameRingBuffer<TargetFrame, 3>` in `epp_frame_ring_buffer.h`); `feed_targets` pushes, `loop` drains FIFO. Overflow drops oldest with delta-rate `ESP_LOGW`. Receipt timestamp moved to `feed_targets` so the stale watchdog (PR #180) reflects actual UART arrival, not drain time.

- [x] **C: NVS schema-version conflict — every save bumps version, but each path writes only its blob** — _shipped: PR #171_
  Per-blob keys `persp_v`/`grid_v`/`zones_v`/`relay_v` in `epp_nvs_layout.h`; `should_load_blob(stored, expected)` constexpr predicate. Global `version` key dropped (no BWC).

- [x] **C: `nvs_get_str` corrupt-JSON branch silently drops zones** — _shipped: PR #171_
  `ESP_LOGW(TAG, "Corrupt zones JSON in NVS, skipping restore: %s", err.c_str())` on `deserializeJson` failure.

- [x] **C: `set_zones`/`set_grid`/`set_perspective` write to flash on every call with no idempotency** — _shipped: PR #171_
  `did_*_change` helpers in `epp_change_detector.h` short-circuit redundant writes. Caches seeded by `restore_from_nvs_` so first reconnect doesn't redundantly write. NVS-write failure clears the cache so retries aren't suppressed.

- [x] **C: 408 magic number in grid save/restore path, no `static_assert`** — _shipped: PR #171_
  `GRID_BLOB_SIZE = GRID_CELL_COUNT + 2 * sizeof(float)` + `static_assert(sizeof(float) == 4)` in `epp_nvs_layout.h`. Header buffer field also uses the constant directly.

- [x] **H: Inactive `target_signal_sensors_` publishes 0.0 instead of NaN** — _shipped: PR #177_
  Publish `NAN` when not active; matches x/y/zone semantics.

- [x] **H: Target zone reports "0" for legitimate origin (0,0)** — _shipped: PR #177_
  Extracted `is_target_valid(status, x, y)` in `epp_target_validity.h` (status != INACTIVE && finite coords). Replaces `(x != 0 || y != 0)` heuristic at both sites.

- [x] **H: Perspective coefficient parser silently truncates on extra commas; no NaN/Inf check** — _shipped: PR #177_
  Pure `parse_perspective_coefficients(input, out[8])` in `epp_perspective_parser.h`. Rejects NaN/Inf, double-commas, trailing garbage, wrong count. Caller in `set_perspective` logs length + 64-byte prefix on failure (no full-payload echo).

- [x] **H: `set_grid` decodes base64 from unbounded `std::string`** — _shipped: PR #177_
  `GRID_BASE64_MAX` constexpr in `epp_nvs_layout.h`; oversized input rejected with `ESP_LOGE` before decode.

- [x] **H: Zone-state JSON `snprintf` accumulator can overflow without truncation guard** — _shipped: PR #177_
  `BoundedWriter` in `epp_json_writer.h`; replaces the chained-snprintf accumulator with a safe `printf` wrapper that no-ops post-truncation. Truncation is logged via `ESP_LOGW` when it happens.

- [x] **H: Boot-time relay can fire on first loop before sensors stabilized** — _shipped: PR #177_
  `boot_settled_` flag flips true on first frame received OR after 2s elapsed (whichever first). Relay block gated on it. OR semantics so a disconnected radar doesn't permanently lock the relay.

- [x] **H: NaN can poison the median window from LD2450 glitches** — _shipped: PR #177_
  `std::isfinite(x) && std::isfinite(y)` added to the rolling-median active predicate at the producer boundary.

- [x] **M: Per-second binary_sensor `publish_state` floods regardless of change** — _shipped: PR #180_
  5 sensor caches (`int8_t last_*_published_ = -1` sentinel + `publish_bool_if_changed` lambda).

- [x] **M: text_sensor `publish_state("")` fires every display tick when no targets** — _shipped: PR #180_
  `std::string last_*_text_[NUM_TARGETS]` + `bool has_*` flag + `publish_text_if_changed` lambda. Both raw_target and target_position sites covered.

- [x] **M: ArduinoJson `JsonDocument` heap allocation in `set_zones` hot path** — _shipped: PR #180_
  ArduinoJson v7 unified `JsonDocument` owns its memory pool internally; no v7 API for size hints. Documented retention semantics (`parse_zone_configs` copies primitives into `ZoneConfig`, no pointers retained) and added a retention-guard test in `test_zone_config_parser.cpp` that pins the safety invariant via inner-scope destruction.

- [x] **M: `dismiss_target(int, int)` service does no bounds check at glue layer** — _shipped: PR #180_
  Validates `target_index ∈ [0, MAX_TARGETS)` and `cell_index ∈ [-1, GRID_CELL_COUNT)` (cell -1 is "no cell" sentinel). Rejects with `ESP_LOGW`.

- [x] **M: `relay_switch_->state` read-modify-write pattern bypasses switch internal state** — _shipped: PR #180_
  Component tracks own desired state (`relay_desired_state_` + `has_relay_desired_state_`); `relay_should_update` helper in `epp_relay_publish.h` has no parameter for switch state, so reading it is impossible by construction.

- [x] **M: No stale-frame watchdog — all sensors freeze if LD2450 stops sending** — _shipped: PR #180_
  `is_frame_stale` in `epp_frame_staleness.h`; STALE_FRAME_MS = 5s. `loop()` no longer early-returns on empty buffer — throttles always run, and synthesized empty `WindowOutput`/`ProcessingResult` (`static const`) drive offline state when stale. One-shot edge logs on stale-onset and recovery (cold-start suppressed). `last_frame_ms_` set in `feed_targets` so a delayed loop draining old frames doesn't mask staleness.

- [x] **M: No `dump_config()` override** — _shipped: PR #180_
  Prints firmware version, all 5 throttle intervals, 6 sensor wiring flags, sensor timeouts, relay config, NVS restore status.

- [x] **M: `set_perspective` doesn't validate `room_width > 0` and `room_depth > 0`** — _shipped: PR #180_
  Guard via `!(x > 0)` form so NaN, -0.0, negatives, and -inf all reject.

- [x] **L: `frame_count_` field write-only (dead)** — _shipped: PR #183_
  Removed; PR #180's `has_received_frame_` covers the "ever received a frame?" semantic at the boot-settled gate.

- [x] **L: `last_zones_json_` field write-only (dead)** — _shipped: PR #171_ (item #4 above)
  Already wired to `did_zones_change` as part of the idempotency cache.

- [x] **L: TAG `"zones"` covers all logs (relay/NVS/perspective/grid)** — _shipped: PR #183_
  Renamed to `"epp"` in C++ AND in 5 yaml callsites in `firmware/common/everything-presence-pro-base.yaml` (lambdas + `logger.set_log_level` for the user-facing log-level control).

- [x] **L: Repeated bounds-clamp setter pattern (11×) in header** — _shipped: PR #183_
  Templated `set_at(arr, idx, value)` free function in `epp_indexed_setter.h`. 9 setters reduced to one-liners (the original count of 11 was off; 9 was the actual count).

- [x] **L: "Is target i live" predicate computed 4× with subtle differences** — _shipped: PR #183_
  `is_target_active(result, i)` template in `epp_target_validity.h` (templated for host-test isolation). Distinct from `is_target_valid` (PR #177): this is the "anything to publish?" gate; `is_target_valid` adds finite-coords for grid lookup. Both used in adjacent lines so the distinction is clear in context.

- [x] **L: Hardcoded `static_timeout_=10` and `motion_timeout_=10` defaults duplicated against engine's `SensorInput`** — _shipped: PR #183_
  `DEFAULT_STATIC_TIMEOUT_S` / `DEFAULT_MOTION_TIMEOUT_S` constexpr in `epp_zone_engine.h`, referenced by both `SensorInput` and `EPPComponent`.

- [x] **L: `transform_.apply` called twice per frame (smoothed + raw)** — _shipped: PR #183_
  Hoisted `transform_.has_perspective()` out of both Stage 2 (smoothed) and Stage 2b (raw-overlay) per-target loops. Pre-calibration the transform is identity, so the function-call + identity branch is skipped per slot.

- [x] **L: `feed_targets` accepts 9 floats inline, not an array** — _shipped: PR #183_
  Signature `feed_targets(const float xy[NUM_TARGETS][2], const bool detected[NUM_TARGETS])`; yaml lambda updated. `NUM_TARGETS` hoisted to namespace scope so the array-bound parameters resolve.

---

## PR 9 — Frontend: zone-engine parity (project-critical drift)

- [x] **C: Frontend compares `signal` (0–9), firmware compares `frame_count`** — _shipped: commit 00c77ffb (2026-05-03)_
  Frontend now receives pre-converted `signal = min(frame_count, 9)`; firmware switched to `signal >= clamp_threshold(t)`. Both compare same semantic; rolling window hardcoded to 1000ms.

- [x] **C: Overlay-exit handoff uses different "previous zone" source** — _shipped: commits 00c77ffb + a9e809d1_
  `lastZone: (number | null)[]` + `lastOnOverlay: boolean[]` in `ZoneEngineState`; handoff loop iterates `MAX_TARGETS` matching firmware `target_last_zone_`.

- [x] **M: `runLocalZoneEngine` hardcodes timeouts** — _shipped: commit 00c77ffb_
  Forwards `this.host._staticTimeout` / `this.host._motionTimeout` for editor preview parity.

---

## PR 10 — Frontend: render() purity / Lit reactivity

- [x] **C: `_renderEditor` mutates `_targets[i].status` and `_sensorState`** — _shipped: verified 2026-05-04_
  `_renderEditor` now builds fresh `editorTargets` via `_targets.map(...)` spread; `_sensorState` mutation removed.

- [x] **C: `runLocalZoneEngine` reads `_targets` while panel mutates them** — _shipped: verified 2026-05-04_
  Engine output flows to children via `editorTargets`; `_targets` never mutated post-engine.

- [x] **C: `epp-grid` mutates parent's `dismissedTargets` during render** — _shipped: verified 2026-05-04_
  Undismiss detection moved to `willUpdate`; event dispatched there, never from `render()`.

- [x] **H: Wizard RAF loop never cancelled on disconnect** — _shipped: verified 2026-05-04_
  `disconnectedCallback` sets `_wizardCaptureCancelled = true` + stores/cancels `_captureRafId`.

- [x] **H: Stale closure on `raw` in env offset slider** — _shipped: verified 2026-05-04_
  Handler recomputes `liveReading` and `liveRaw` per input event.

- [x] **H: target-dot unkeyed map** — _shipped: verified 2026-05-04_
  Uses `repeat(targets.slice(0, MAX_TARGETS), (_t, i) => i, ...)` with stable key.

- [x] **H: Off-by-one in target-dot bounds check** — _shipped: verified 2026-05-04_
  Compares against `maxCol`/`maxRow` inclusive.

- [x] **M: `localZoneState` Map mutations** — _shipped: verified 2026-05-04_
  Engine state delegated to `TargetController`; Map passed read-only to children.

- [x] **M: `_dragState` not @state** — _shipped: verified 2026-05-04_
  Documented as intentionally non-reactive; reactive `@state` fields drive repaint.

- [x] **M: `_setText(el.nextElementSibling, ...)` null-deref** — _shipped: verified 2026-05-04_
  Refactored to `_setSettingValue(slider, text)` using `slider.parentElement?.querySelector(".setting-value")` with `instanceof HTMLElement` guard.

- [x] **M: settings-view `requestUpdate()` in `ha-select` handlers** — _shipped: verified 2026-05-04_
  Each `requestUpdate()` documented inline with the necessity (e.g. "keeps captured `current` in sync").

- [x] **M: `_resetSlider` parses display "—" with `parseFloat`** — _shipped: verified 2026-05-04_
  `Number.isNaN` check explicitly preserves em dash on NaN.

---

## PR 11 — Frontend: subscription/lifecycle leaks (controllers)

- [x] **C: Subscription leak race in `_subscribeGridTargets`/`subscribeDisplay`** — _shipped: verified 2026-05-04_
  Generation token (`_targetsGen`); `.then()` discards stale unsub if token mismatches.

- [x] **C: Same race in `subscribeDeviceList`** — _shipped: verified 2026-05-04_
  Same generation-token pattern (`_deviceListGen`).

- [x] **C: FlasherController hass-swap leaves stale subs/timers; no resubscribe** — _shipped: this PR_
  Captures `wasSubscribed` before clearing; auto-issues `subscribeDeviceList()` on the new connection so the panel keeps receiving updates after every HA reconnect.

- [x] **C: `applyLayout` mutates `_zoneConfigs` before async save** — _shipped: verified 2026-05-04_
  Pruned slots + furniture built locally; committed only after WS resolves.

- [x] **C: `loadConfiguration` mutates host state then awaits `set_settings`** — _shipped: verified 2026-05-04_
  Snapshots pre-restore; rolls back on WS failure.

- [x] **H: `subscribeTargets` invokes stale unsub without try/catch** — _shipped: verified 2026-05-04_
  Delegates to `unsubscribeTargets()` (uses `safeUnsub()`).

- [x] **H: `_handleOtaEvent` clears watchdog timer before checking state** — _shipped: verified 2026-05-04_
  `_resetOtaTimeout` moved inside each case; default leaves watchdog armed (intentional).

- [x] **H: `_otaSuccess` 5s setTimeout not in `_otaTimeouts` map** — _shipped: verified 2026-05-04_
  Tracked in `_otaTimeouts[mac]`; cleared in `hostDisconnected`.

- [x] **H: `setCancelledDeviceIpHint` 8s timeout not cleared on hostDisconnected** — _shipped: verified 2026-05-04_
  `_cancelledIpTimeout` cleared in `hostDisconnected`.

- [x] **H: `_applyDeviceList` crashes if backend omits `devices`** — _shipped: verified 2026-05-04_
  `?? []` fallback.

- [x] **H: Hardcoded English "Zone N" in `addZone`** — _shipped: verified 2026-05-04_
  Uses `this.host._localize?.("live.debug.zone_n", { n: firstEmpty })` with English fallback.

- [x] **H: `_initRetryTimer` orphaned across disconnect** — _shipped: verified 2026-05-04_
  Guards `setTimeout` callback with `if (!this.isConnected) return`.

- [x] **H: `history.pushState/replaceState` wrap state poisoning** — _shipped: verified 2026-05-04_
  Originals stashed on `window.__eppOriginalPushState` / `__eppOriginalReplaceState` once.

- [x] **M: Connection-swap branch forgets `_unsubDeviceList` / `_targetRetryTimer`** — _shipped: verified 2026-05-04_
  Both cleared in connection-swap branch.

- [x] **M: `loadDeviceConfig` returns null on concurrent re-entry** — _shipped: verified 2026-05-04_
  Dedupes via per-mac `_loadConfigInFlight` promise.

- [x] **M: Backend-supplied `devices` array sorted in place** — _shipped: verified 2026-05-04_
  Defensive `[...result.devices].sort(...)`.

- [x] **M: `_handleUsbFlash` doesn't await port.close()** — _shipped: verified 2026-05-04_
  `await port.close().catch(() => {})` at both sites.

- [x] **M: `panel-mount-guard` double-install on module reload** — _shipped: verified 2026-05-04_
  Tears down prior install via `window.__eppGridMountGuardTeardown` first.

- [x] **M: `_handleUsbFlash` cancel reported as `flash_failed`** — _shipped: verified 2026-05-04_
  `flash_cancelled` triggers `resetUsbState()` instead of error UI.

- [x] **M: `runWifiScan` reader release/re-acquire orphans WeakMap entries** — _shipped: verified 2026-05-04_
  `releaseReader()` helper cleans `_pendingReads` WeakMap entry on release.

- [x] **L: `serialPort.close()` doesn't release reader/writer locks** — _shipped: verified 2026-05-04_
  `_tearDownSerialPort` releases `_serialReader` / `_serialWriter` locks before close.

---

## PR 12 — Frontend: components polish (UX, a11y, theming)

- [x] **H: Tooltip listener leaks** — _shipped: verified 2026-05-04_
  `_attachTooltipListeners` / `_detachTooltipListeners` wire keydown, pointerdown, scroll, resize.

- [x] **H: Wifi password persists across SSID switch** — _shipped: verified 2026-05-04_
  Cleared on SSID change and manual-toggle change.

- [x] **H: Capture overlay z-index 1000 with no focus trap, no Escape** — _shipped: verified 2026-05-04_
  `_onCaptureOverlayKeydown` handles Escape (cancel) + Tab (traps focus on Cancel button); `updated()` autofocuses Cancel when overlay opens. Lifecycle attach/detach via `_attachCaptureOverlayListeners` / `_detachCaptureOverlayListeners`.

- [x] **H: live-sidebar zone-state ordering** — _shipped: verified 2026-05-04_
  Slot 0 first, then zones 1+ — matches editor.

- [x] **H: epp-furniture-overlay rotation in event detail** — _shipped: verified 2026-05-04_
  Rotation included in event detail for move/resize/rotate handlers.

- [x] **H: applyPerspective NaN guard** — _shipped: verified 2026-05-04_
  `computeSensorFov()` returns null when `len < 1e-6`.

- [x] **H: parseFurniture type validation** — _shipped: verified 2026-05-04_
  Uses `toFiniteNumber()` / `toPositiveSize()` / `toNonEmptyString()` validators.

- [x] **M: `_setOverlay` narrow endpoint** — _shipped: verified 2026-05-04_
  Uses `eppgrid/set_room_layout` without view switch.

- [x] **M: Hardcoded colors → theme variables** — _shipped: verified 2026-05-04_
  Components use `var(--success-color)` etc.

- [x] **M: `mwc-list-item` removed** — _shipped: verified 2026-05-04_
  No mwc-list-item in codebase.

- [x] **M: `_stopClosed` handler extracted** — _shipped: verified 2026-05-04_
  Single shared handler reused across 17 ha-select uses.

- [x] **M: zone-sidebar redundant `dirty` events dropped** — _shipped: verified 2026-05-04_
  Only `zone-config-change` dispatched.

- [x] **M: `_fireDirty` flag instead of DOM mutation** — _shipped: verified 2026-05-04_
  Sets `_localDirty` flag + dispatches event; no `.save-btn.disabled` mutation.

- [x] **M: ha-icon-picker `??` operator** — _shipped: verified 2026-05-04_
  `e.detail?.value ?? ""` preserves empty distinction.

- [x] **M: Rotation `parseFloat`** — _shipped: verified 2026-05-04_
  Accepts decimals.

- [x] **M: Rotation modulo handles negatives** — _shipped: verified 2026-05-04_
  `((v % 360) + 360) % 360`.

- [x] **M: Wizard `_smoothBuffer` cleared on cancel** — _shipped: verified 2026-05-04_
  Reset to empty array in `_wizardExit()`.

- [x] **M: Wizard chip click clears `_perspective`** — _shipped: verified 2026-05-04_
  Set to null on corner mark.

- [x] **M: Configuration restore dialog filters un-loadable templates** — _shipped: verified 2026-05-04_
  Filtered by `zones.length === 8`.

- [x] **L: `entityToggleHandler` extracted** — _shipped: verified 2026-05-04_
  Single handler reused across 17 toggles.

- [x] **L: `intl-messageformat` compile errors caught** — _shipped: verified 2026-05-04_
  Try/catch on constructor + format() with fallback to raw string.

- [x] **L: `navigator.clipboard.writeText`** — _shipped: verified 2026-05-04_
  No clipboard write operations in current code.

- [x] **L: `_furnitureClipboard` cleared on device switch** — _shipped: verified 2026-05-04_

- [x] **L: parseScanResults accepts SSIDs with control chars** — _shipped: verified 2026-05-04_
  `parseScanResults` strips `[\x00-\x1f\x7f]` from the decoded SSID and the `readString(32)` cap enforces 802.11 byte length before decoding.

- [x] **L: furniture resize handle hit area** — _shipped: verified 2026-05-04_
  Hit area is 22×22 px (visual indicator 8×8 via `::before`); reasonable for touch.

- [x] **L: Icon-only buttons have aria-labels** — _shipped: verified 2026-05-04_

- [x] **L: OTA retry button has spinner** — _shipped: verified 2026-05-04_
  `_retryPendingMacs` set + per-mac inline `<div class="ota-spinner">` while retry click is in flight.

- [x] **L: `host` styles deprecated `--paper-font-body1`** — _shipped: verified 2026-05-04_
  No `--paper-font-body1` in codebase.

---

## PR 13 — Frontend: efficiency hot paths

- [x] **H: `_renderLiveGrid` `_autoDetectionRange()` per-render scan** — _shipped: verified 2026-05-04_
  `_computeMaxRangeMm()` caches against `(_grid, _targetAutoDistance, _targetMaxDistance)`; `_autoDetectionRange()` only re-runs when one of the cache keys changes. Cache hit on every same-grid render.

- [x] **M: `getSmoothedValue` rebuilds buffer every call** — _shipped: verified 2026-05-04_
  In-place prune; single `pruned` array allocated per call instead of repeated buffer rebuilds.

- [x] **M: `_buildFrontendDebugLog` walks grid + targets 3-4× per push** — _shipped: verified 2026-05-04_
  `_allZoneIdsCache` keyed by grid reference; computed once per layout change.

- [x] **M: `clearZoneFromGrid` returns fresh Uint8Array even when unchanged** — _shipped: verified 2026-05-04_
  Returns `null` when no cells changed.

- [x] **L: `parseImprovPackets` quadratic on garbled streams** — _shipped: verified 2026-05-04_
  Uses `data.indexOf(HEADER_FIRST, i + 1)` to skip to next header candidate.

- [x] **L: `_dismissTooltips` queries shadowRoot on every window click** — _shipped: verified 2026-05-04_
  No `_dismissTooltips` exists in `eppgrid-panel.ts`; tooltip lifecycle is owned by `epp-settings-view` (`_attachTooltipListeners` / `_detachTooltipListeners`).

- [x] **L: `_fovCache` keyed by reference** — _shipped: verified 2026-05-04_
  Documented contract (panel + wizard reassign the perspective array rather than mutating in place); reference equality is the intended invalidation signal. Hashing 8 floats per render would cost more than the current cached path.

- [x] **L: `epp-grid` mouseenter cell handler throttled** — _shipped: verified 2026-05-04_
  `_lastEnterIdx` coalescing skips redundant dispatches.

- [x] **L: zone-sidebar zone-name input debounced** — _shipped: verified 2026-05-04_
  `NAME_DEBOUNCE_MS = 150` with flush on blur.

- [x] **L: `expandEntities` helper** — _n/a_
  No `expandEntities` helper present in current code; relevant logic lives in `buildSparseEntities` (multi-line, not an inline candidate).

- [x] **L: localize `formatCache` unbounded** — _shipped: verified 2026-05-04_
  Capped at 256 entries with LRU eviction.

- [x] **L: `setShowRoomCalibrationTutorial` redundant call per push** — _shipped: verified 2026-05-04_
  `if (this.showRoomCalibrationTutorial === value) return;` short-circuits identical updates; the function call itself is trivial (no requestUpdate, no allocation) so further dedupe at the call site isn't worth the indirection.

---

## PR 14 — Frontend: dead code, duplication, types

- [x] **H: `FOV_X_EXTENT` declared in two places** — [coordinates.ts:51](frontend/src/lib/coordinates.ts#L51) + [constants.ts:446-447](frontend/src/constants.ts#L446-L447). Consolidate. _shipped: PR 175 (dead)_

- [x] **M: `Target.x/y` typed non-nullable but backend sends null** — [types.ts:3-9](frontend/src/types.ts#L3-L9), [device-controller.ts:375-381](frontend/src/controllers/device-controller.ts#L375-L381). Change to `number | null`. _shipped: PR 175 (dead)_

- [x] **M: `Target.speed` always 0; never read** — `types.ts:6`, `device-controller.ts:378`. Drop or wire. _shipped: PR 175 (dead) — dropped_

- [x] **M: `DeviceController.loading` field unused** — `device-controller.ts:43`. Delete. _shipped: PR 175 (dead)_

- [x] **L: `_perspective` prop in live-sidebar only used as boolean** — [epp-live-sidebar.ts:49](frontend/src/components/epp-live-sidebar.ts#L49). Pass `hasPerspective: boolean`. _shipped: PR 175 (dead)_

- [x] **L: Empty `.level-selector`/`.level-buttons` CSS classes** — [epp-overlay-sidebar.ts:64-77](frontend/src/components/epp-overlay-sidebar.ts#L64-L77). Remove dead CSS. _shipped: PR 175 (dead)_

- [x] **L: `_buildSparseSettings` / `_buildSettingsPayload` / `SETTINGS_DEFAULTS` triple-source-of-truth** — `eppgrid-panel.ts:1099-1136`
  Single `SETTINGS_FIELDS` schema; derive both serialization and field-map. _shipped: PR 175 (dead) — `_buildSettingsPayload` derives from `SETTINGS_FIELD_MAP`_

- [x] **L: Duplicated unsubscribe try/catch idiom across all four controllers** — 5 sites. Extract `safeUnsub(unsub)` helper. _shipped: PR 175 (dead)_

- [x] **L: Duplicated debug-log timestamp/dedupe/cap logic** — `target-controller.ts:262-327`. Extract `_appendLog` helper. _shipped: PR 175 (dead)_

- [x] **L: `(this.host as any).hass.callWS` mixed with `this.host.hass.callWS`** — grid-state-controller.ts multiple. Drop redundant casts. _shipped: PR 175 (dead)_

- [x] **L: Inconsistent `requestUpdate()` calls after @state mutations** — `grid-state-controller.ts:197-243, 273-287`. Drop redundants. _shipped: PR 175 (dead)_

- [x] **L: `addZone` color-fallback branch unreachable** — `grid-state-controller.ts:213-215`. Drop fallback. _shipped: PR 175 (dead)_

- [x] **L: `getResizeCursor` "default" branch unreachable** — `furniture.ts:316-335`. _shipped: PR 175 (dead)_

- [x] **L: `getRoomBounds`/`getRawRoomBounds` duplicated logic** — `grid.ts:44-95`. Refactor. _shipped: PR 175 (dead)_

- [x] **L: `getZoneThresholds` silent hardcoded fallback** — `zone-defaults.ts:134-139`. Warn or return null. _shipped: PR 175 (dead) — warn-once-per-zid + canonical defaults_

- [x] **L: `solvePerspective` Gaussian elim no row scaling** — `perspective.ts:9-53`. Pre-scale source coords. _shipped: PR 175 (dead)_

- [x] **L: `static_state`/`motion_state` type comment wrong** — `epp-live-sidebar.ts:13-14`. Use `"A" | "P" | "I"`. _shipped: PR 175 (dead)_

- [x] **L: TARGET_COLORS palette has 3 entries; assert cap** — `epp-grid.ts:399, 421-422`. _shipped: PR 175 (dead) — hoisted `MAX_TARGETS`, runtime assertion, capped iteration_

- [x] **L: `parseInt(z?.replace("Z", "") ?? "0", 10)` produces "Zone NaN"** — `target-controller.ts:214, 225`. `Number.isFinite` guard. _shipped: PR 175 (dead)_

- [x] **L: `console.warn`/`console.error` only error surface in `saveSettings`** — `grid-state-controller.ts:761`. Add `onError?` host callback. _shipped: PR 175 (dead) — `onError?` hook + retained `console.error` for diagnostics_

- [x] **L: `host: ReactiveControllerHost & Record<string, any>` permits typos** — `target-controller.ts:25`, `grid-state-controller.ts:57`. Define real interface. _shipped: PR 188 (host-types) — typed `PanelHost` interface in `controllers/panel-host.ts`; `ZoneSlots` moved to `lib/zone-defaults.ts`; panel `@state` fields became public so the panel structurally satisfies `PanelHost` (no `as unknown as` cast); `SETTINGS_FIELD_MAP` prop column typed via `SettingsHostProp` literal union_

- [x] **L: `firmwareBaseUrl` not URL-validated** — `epp-flasher-view.ts:541, 1037-1040`. Assert `https:` protocol. _shipped: PR 175 (dead) — `sanitizeFirmwareBaseUrl` accepts same-origin relative + `http(s)://`, rejects `javascript:`/`data:`/`file:`/`vbscript:`/protocol-relative_

---

## How to use this document

- Each PR section is sized so a subagent or worktree can take it end-to-end in one session.
- Order suggestion: **PR 1 → PR 7 → PR 8 → PR 9 → PR 10 → PR 11 → PR 2 → PR 6 → rest**. (Security first, then engine-parity / data-loss bugs, then resilience, then polish.)
- For each finding, follow TDD: failing test → minimal fix → verify green. The pre-push checklist (`scripts/pre-push-fast.sh`) must pass before opening the PR.
- Cross-cutting tests: zone-engine parity tests already exist in `firmware/lib/epp_zone_engine/tests/test_parity.cpp` and `frontend/src/__tests__/panel-zone-engine-parity.test.ts` — extend them when fixing PR 9.
- Mark items off as PRs land. Don't lose the un-fixed ones in this doc.
