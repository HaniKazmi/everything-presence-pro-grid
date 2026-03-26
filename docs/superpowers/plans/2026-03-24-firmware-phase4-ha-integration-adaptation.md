# Firmware Phase 4: HA Integration Adaptation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt the HA integration (eppgrid) to support dual mode — firmware zone engine (production) and Python zone engine (dev). Add `source` parameter to websocket subscriptions and configuration push to device.

**Architecture:** The coordinator detects firmware capability via `epp_firmware_version` text sensor. In production mode, it parses firmware zone results (ESPHome sensors) into `ProcessingResult` format. In dev mode, it also runs the Python zone engine on raw data. The `source` parameter on `subscribe_grid_targets` selects which result stream to use. Configuration is pushed to the device on save.

**Tech Stack:** Python 3.12+, aioesphomeapi, Home Assistant

**Spec:** `docs/superpowers/specs/2026-03-24-firmware-integration-design.md`

**Working directory:** `/workspaces/ha-dev/everything-presence-pro-grid/.worktrees/firmware/`

---

## Tasks

### Task 1: Detect firmware zone engine capability

The coordinator subscribes to all ESPHome entity states. When it sees `epp_firmware_version` text sensor with a value containing "zone_engine", it sets a flag.

**Files:**
- Modify: `custom_components/eppgrid/coordinator.py`

**Implementation:**
- Add `_has_firmware_zone_engine: bool = False` property
- In `subscribe_targets()` entity classification, look for `epp_firmware_version`
- In `_handle_text_sensor()`, when key matches firmware_version: parse value, set flag
- Add `has_firmware_zone_engine` property

- [ ] Step 1: Add firmware detection to coordinator
- [ ] Step 2: Write test
- [ ] Step 3: Run tests
- [ ] Step 4: Commit

---

### Task 2: Receive firmware zone results

Parse the firmware's ESPHome sensors (zone occupancy binary sensors + target position text sensors) into `ProcessingResult` format.

**Files:**
- Modify: `custom_components/eppgrid/coordinator.py`

**Implementation:**
- Classify firmware zone sensors in `subscribe_targets()`:
  - `epp_zone_*_occupancy` (binary sensors) → map to zone occupancy
  - `epp_target_*_position` (text sensors) → parse "x,y,signal,status" strings
  - `epp_zone_tracking` (binary sensor) → device_tracking_present
- Add `_firmware_result: ProcessingResult` to hold parsed firmware state
- On each firmware sensor update, update `_firmware_result`
- Add `_firmware_zone_occupancy: dict[int, bool]` and `_firmware_targets: list[TargetResult]`
- When firmware zone sensors change, build a complete `ProcessingResult` and dispatch signal

- [ ] Step 1: Add firmware sensor classification
- [ ] Step 2: Add firmware result parsing
- [ ] Step 3: Write tests
- [ ] Step 4: Run tests
- [ ] Step 5: Commit

---

### Task 3: Add `source` parameter to subscribe_grid_targets

The websocket subscription gains an optional `source` parameter: "firmware" (default) or "python".

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py`
- Modify: `custom_components/eppgrid/coordinator.py`

**Implementation:**
- In `subscribe_grid_targets` handler, read `source` from message (default "firmware")
- Add coordinator properties:
  - `last_result_firmware` → from parsed firmware sensors
  - `last_result_python` → from Python zone engine (existing `_last_result`)
- The subscription callback selects which result to use based on source
- When source is "python" and Python engine isn't running, start it
- When source is "firmware" and no firmware detected, fall back to Python

- [ ] Step 1: Add source parameter to websocket handler
- [ ] Step 2: Add result source selection to coordinator
- [ ] Step 3: Write tests
- [ ] Step 4: Run tests
- [ ] Step 5: Commit

---

### Task 4: Configuration push to device

When the frontend saves calibration or zones, push the configuration to the device via ESPHome services.

**Files:**
- Modify: `custom_components/eppgrid/coordinator.py`
- Modify: `custom_components/eppgrid/websocket_api.py`

**Implementation:**
- Add `async _push_perspective_to_device()`:
  - Call ESPHome service `epp_set_perspective` with perspective string + room dimensions
  - Uses `self._client.execute_service()`
- Add `async _push_grid_to_device()`:
  - Call ESPHome service `epp_set_grid` with base64 grid + origin
- Add `async _push_zones_to_device()`:
  - Call ESPHome service `epp_set_zones` with JSON zone configs
- In `set_setup` handler: after persisting, call `_push_perspective_to_device()` + `_push_grid_to_device()`
- In `set_room_layout` handler: after persisting, call `_push_grid_to_device()` + `_push_zones_to_device()`
- Only push if `has_firmware_zone_engine` is True

- [ ] Step 1: Implement push methods
- [ ] Step 2: Wire into set_setup and set_room_layout
- [ ] Step 3: Write tests
- [ ] Step 4: Run tests
- [ ] Step 5: Commit

---

### Task 5: Dev mode toggle

Add a `set_dev_mode` websocket command and coordinator flag.

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py`
- Modify: `custom_components/eppgrid/coordinator.py`
- Modify: `custom_components/eppgrid/const.py`

**Implementation:**
- Add `_dev_mode: bool = False` to coordinator
- Add `dev_mode` property
- When dev mode enabled: Python zone engine runs (processes raw data as today)
- When dev mode disabled (default): Python zone engine doesn't run, saves CPU
- Add websocket command `eppgrid/set_dev_mode` with `enabled: bool`
- Persist dev_mode flag in entry options

- [ ] Step 1: Add dev mode flag and command
- [ ] Step 2: Gate Python zone engine on dev mode
- [ ] Step 3: Write tests
- [ ] Step 4: Run tests
- [ ] Step 5: Commit

---

### Task 6: Entity source switching

In production mode, entities source from firmware results. In dev mode with source=python, from Python results.

**Files:**
- Modify: `custom_components/eppgrid/binary_sensor.py`
- Modify: `custom_components/eppgrid/sensor.py`
- Modify: `custom_components/eppgrid/coordinator.py`

**Implementation:**
- Entities always source from coordinator's "active result" (firmware by default)
- Coordinator's `last_result` property returns firmware result when available, Python otherwise
- No entity changes needed if we keep `last_result` as the single source of truth
- The coordinator just changes what `last_result` points to based on mode

- [ ] Step 1: Ensure entities use coordinator.last_result consistently
- [ ] Step 2: Coordinator.last_result returns firmware or python based on capability
- [ ] Step 3: Run tests
- [ ] Step 4: Commit
