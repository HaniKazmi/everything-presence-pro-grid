# Firmware Phase 3: ESPHome Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the C++ zone engine library into the ESPHome component so it processes real LD2450 sensor data on-device, exposes zone occupancy and target positions via ESPHome native API, receives configuration from HA, and persists config to NVS.

**Architecture:** The epp component takes over LD2450 UART frame parsing (replacing the existing debug lambda). It feeds raw target positions through SensorTransform → TumblingWindow → ZoneEngine, then publishes results as ESPHome sensors. Configuration (perspective, grid, zones) is received via ESPHome services and persisted to ESP32 NVS. The existing per-target sensors (x, y, speed, etc.) are preserved for raw data pass-through.

**Tech Stack:** ESPHome (external component, YAML), C++ (ESP-IDF, NVS), ArduinoJson

**Spec:** `docs/superpowers/specs/2026-03-24-firmware-integration-design.md`

**Working directory:** `/workspaces/ha-dev/everything-presence-pro-grid/.worktrees/firmware/`

**Key reference files:**
- `firmware/common/ld2450-base.yaml:746-1213` — Current UART debug lambda (frame parsing)
- `firmware/components/epp/` — Current scaffold
- `firmware/lib/epp_zone_engine/include/` — C++ zone engine library

---

## Approach

Phase 3 is the most complex phase. We break it into incremental sub-tasks, each producing a compilable firmware. The approach:

1. First get the epp component reading LD2450 UART frames directly (bypassing the debug lambda)
2. Then wire in the zone engine pipeline
3. Then expose results as ESPHome sensors
4. Then add services for configuration
5. Then add NVS persistence
6. Finally clean up: remove polygon zones, adapt presence fusion, add capability sensor

Each task compiles and can be flashed to verify on hardware.

---

## Tasks

### Task 1: EPP component receives UART frames

Modify the epp component to directly parse LD2450 UART binary frames. The component registers as a `UARTDevice`, reads frames delimited by `[0x55, 0xCC]`, and extracts 3 targets' x, y, speed, resolution from the 30-byte payload.

The existing debug lambda in ld2450-base.yaml continues to run — we don't remove it yet. The epp component parses in parallel.

**Files:**
- Modify: `firmware/components/epp/__init__.py` — Add UART dependency, configure UART ID
- Modify: `firmware/components/epp/epp_component.h` — Add UARTDevice base, frame parsing
- Modify: `firmware/components/epp/epp_component.cpp` — Implement UART reading in loop()
- Modify: `firmware/common/everything-presence-pro-base.yaml` — Pass uart_id to epp component

**Key implementation:**
- Component inherits from `esphome::uart::UARTDevice`
- In `loop()`: read bytes until delimiter `[0x55, 0xCC]`, validate 30-byte frame
- Parse 3 targets: x (int16_t), y (int16_t), speed (int16_t), resolution (uint16_t)
- Apply upside-down flag (invert X if not upside down — matching existing logic)
- Store parsed targets in internal struct, set a `frame_ready_` flag
- Log parsed data for verification

**Verification:** Compile and flash. Check ESPHome logs show parsed target positions matching the existing sensor values.

- [ ] Step 1: Update `__init__.py` to add UART dependency
- [ ] Step 2: Implement frame parsing in epp_component.h/cpp
- [ ] Step 3: Wire uart_id in base YAML
- [ ] Step 4: Compile firmware
- [ ] Step 5: Commit

---

### Task 2: Wire zone engine pipeline

Connect the parsed frames to the C++ zone engine: SensorTransform → TumblingWindow → ZoneEngine. On each tumbling window tick, log the processing result.

**Files:**
- Modify: `firmware/components/epp/epp_component.h` — Add zone engine members
- Modify: `firmware/components/epp/epp_component.cpp` — Feed frames through pipeline

**Key implementation:**
- Component holds: `SensorTransform`, `TumblingWindow` (wrapping `Grid`), `ZoneEngine`
- In `loop()` after frame parse: create `TargetInput[3]` from parsed data, feed to tumbling window
- When window ticks: call `zone_engine_.tick()`, log result (zone occupancy, target status)
- Initially no calibration/grid configured, so zone engine does nothing until config is pushed

- [ ] Step 1: Add zone engine members to component
- [ ] Step 2: Feed parsed frames through pipeline in loop()
- [ ] Step 3: Compile firmware
- [ ] Step 4: Commit

---

### Task 3: Expose zone occupancy as ESPHome sensors

Create ESPHome binary sensors for zone occupancy (zone 0 + zones 1-7) and a binary sensor for `device_tracking_present`. These publish state from the zone engine processing result.

**Files:**
- Modify: `firmware/components/epp/__init__.py` — Register binary sensor outputs
- Modify: `firmware/components/epp/epp_component.h` — Add sensor pointers
- Modify: `firmware/components/epp/epp_component.cpp` — Publish zone occupancy on tick

**Key implementation:**
- 8 binary sensor pointers in component (zone 0-7 occupancy)
- 1 binary sensor for device_tracking_present
- On each zone engine tick, publish_state for each zone
- In `__init__.py`, register these as `output` binary sensors with configurable IDs
- In YAML, these can be referenced like `epp_zone_0_occupancy`

- [ ] Step 1: Add sensor registration to __init__.py
- [ ] Step 2: Add sensor pointers and publishing to component
- [ ] Step 3: Add sensor declarations to base YAML
- [ ] Step 4: Compile firmware
- [ ] Step 5: Commit

---

### Task 4: Expose target positions as text sensors

Create text sensors for per-target calibrated positions and raw positions (pass-through for dev mode).

**Files:**
- Modify: `firmware/components/epp/__init__.py` — Register text sensor outputs
- Modify: `firmware/components/epp/epp_component.h` — Add text sensor pointers
- Modify: `firmware/components/epp/epp_component.cpp` — Publish target data

**Key implementation:**
- 3 text sensors for calibrated target data: `"x,y,signal,status"` per target
- 3 text sensors for raw target data: `"raw_x,raw_y,speed,resolution"` per target
- Raw targets publish on every frame (~10Hz)
- Calibrated targets publish on zone engine tick (~1Hz) or rolling median (~5Hz)
- 1 text sensor for `epp_firmware_version`: `"1.0.0:zone_engine"`

- [ ] Step 1: Add text sensor registration
- [ ] Step 2: Implement publishing logic
- [ ] Step 3: Add sensor declarations to YAML
- [ ] Step 4: Compile firmware
- [ ] Step 5: Commit

---

### Task 5: Add ESPHome services for configuration

Implement the three configuration services: `epp_set_perspective`, `epp_set_grid`, `epp_set_zones`.

**Files:**
- Modify: `firmware/components/epp/__init__.py` — Register services
- Modify: `firmware/components/epp/epp_component.h` — Add service handlers
- Modify: `firmware/components/epp/epp_component.cpp` — Implement service handlers

**Key implementation:**
- `epp_set_perspective(perspective: string, room_width: float, room_depth: float)`:
  Parse 8 comma-separated floats from string, call `SensorTransform::set_coefficients()`
- `epp_set_grid(grid_data: string, origin_x: float, origin_y: float)`:
  Base64-decode string to 400 bytes, create Grid, call `zone_engine_.set_grid()`
- `epp_set_zones(zones_json: string)`:
  Parse JSON with ArduinoJson, create ZoneConfig array, call `zone_engine_.set_zones()`

- [ ] Step 1: Register services in __init__.py
- [ ] Step 2: Implement service handlers
- [ ] Step 3: Add ArduinoJson dependency
- [ ] Step 4: Compile firmware
- [ ] Step 5: Commit

---

### Task 6: NVS persistence

Store configuration to ESP32 NVS so device works standalone after HA disconnects.

**Files:**
- Modify: `firmware/components/epp/epp_component.h` — Add NVS read/write methods
- Modify: `firmware/components/epp/epp_component.cpp` — Persist on service calls, restore on setup

**Key implementation:**
- On setup(): read NVS keys `epp_version`, `epp_persp`, `epp_grid`, `epp_zones`
- If version matches: restore config to zone engine
- On each service call: write to NVS after updating zone engine
- Use ESP-IDF `nvs_flash` API (available in ESPHome ESP-IDF builds)

- [ ] Step 1: Add NVS read/write in setup() and service handlers
- [ ] Step 2: Compile firmware
- [ ] Step 3: Commit

---

### Task 7: Remove polygon zones and adapt presence fusion

Remove the polygon zone system from ld2450-base.yaml (inclusion zones, exclusion zones, per-zone occupancy sensors). Adapt the presence fusion to use `device_tracking_present` from the zone engine.

**Files:**
- Modify: `firmware/common/ld2450-base.yaml` — Remove polygon zones, simplify UART lambda
- Modify: `firmware/common/everything-presence-pro-base.yaml` — Adapt presence fusion

**Key implementation:**
- The UART debug lambda in ld2450-base.yaml becomes minimal: just parse and publish per-target x/y/speed/resolution/active (no polygon logic, no zone counting)
- Remove all polygon zone entities (text inputs, binary sensors, sensors, globals)
- In presence fusion: replace `ld2450_occupancy` with the epp component's `device_tracking_present`
- Force LD2450 installation_angle to 0 on boot (UART command)

This is a BREAKING CHANGE for polygon zone users (acknowledged in spec).

- [ ] Step 1: Strip polygon zone code from ld2450-base.yaml
- [ ] Step 2: Simplify UART lambda to basic target parsing + publishing
- [ ] Step 3: Add LD2450 angle reset (send UART command on boot)
- [ ] Step 4: Adapt presence fusion in base YAML
- [ ] Step 5: Compile all 8 variants
- [ ] Step 6: Commit

---

### Task 8: Final verification

- [ ] Step 1: Compile all 8 firmware variants
- [ ] Step 2: Run C++ tests
- [ ] Step 3: Run Python tests
- [ ] Step 4: Flash to device and verify: sensors report, zone engine processes, services work
