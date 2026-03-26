# Custom Firmware Integration Design

Date: 2026-03-24

## Overview

Add custom Everything Presence Pro firmware support to the eppgrid monorepo. The zone engine moves from the Python backend to a C++ library running on the ESP32 device, while the Python backend is retained for development and algorithm iteration. The frontend talks to both via a dual-mode HA integration.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  EPP Device (ESP32)                                  │
│                                                      │
│  ┌──────────┐   ┌────────────────────────────┐       │
│  │ LD2450   │──▶│ epp ESPHome component      │       │
│  │ SEN0609  │   │                            │       │
│  │ PIR      │   │  ┌──────────────────────┐  │       │
│  │ BH1750   │   │  │ C++ Zone Engine Lib  │  │       │
│  │ SHTC3    │   │  │ Grid, Window, Engine │  │       │
│  │ SCD4x    │   │  │ SensorTransform      │  │       │
│  └──────────┘   │  └──────────────────────┘  │       │
│                 │                            │       │
│                 │  Outputs: zone occupancy,  │       │
│                 │  target status, raw pass-  │       │
│                 │  through                   │       │
│                 └────────────┬───────────────┘       │
│                              │                       │
│  LED control ◀── zone occ   │   NVS: grid, zones,   │
│  Relay       ◀── zone occ   │   calibration          │
│                              │                       │
│  Config services: set_perspective, set_grid, set_zones│
└──────────────────┬───────────────────────────────────┘
                   │ ESPHome native API (TCP, noise PSK)
                   │
┌──────────────────▼───────────────────────────────────┐
│  HA Integration (eppgrid)                            │
│                                                      │
│  Coordinator                                         │
│  ├── Receives firmware zone results (production)     │
│  ├── Receives raw LD2450 frames (always)             │
│  ├── Runs Python zone engine (dev mode only)         │
│  ├── Pushes config to device on save                 │
│  └── Proxies data to frontend via websocket          │
│                                                      │
│  WebSocket API                                       │
│  ├── subscribe_grid_targets(source: firmware|python) │
│  ├── subscribe_raw_targets                           │
│  ├── set_setup, set_room_layout, set_reporting, ...  │
│  └── (all existing commands unchanged)               │
│                                                      │
│  Entities                                            │
│  └── Source: firmware (production) or python (dev)    │
└──────────────────┬───────────────────────────────────┘
                   │ HA WebSocket
                   │
┌──────────────────▼───────────────────────────────────┐
│  Frontend (Lit panel)                                │
│  ├── Calibration wizard (unchanged)                  │
│  ├── Zone editor + local engine replica (unchanged)  │
│  ├── Live overview (gains source selector in dev)    │
│  ├── Settings (gains dev toggle, firmware info, OTA) │
│  └── Same API, same payloads, different source       │
└──────────────────────────────────────────────────────┘
```

## Monorepo Structure

```
everything-presence-pro-grid/
├── firmware/
│   ├── lib/
│   │   └── epp_zone_engine/        # Pure C++ zone engine library
│   │       ├── include/
│   │       │   ├── grid.h
│   │       │   ├── tumbling_window.h
│   │       │   ├── zone_engine.h
│   │       │   ├── calibration.h
│   │       │   └── types.h
│   │       ├── src/
│   │       │   ├── grid.cpp
│   │       │   ├── tumbling_window.cpp
│   │       │   ├── zone_engine.cpp
│   │       │   └── calibration.cpp
│   │       └── tests/               # C++ unit tests (host, no ESP32)
│   │           ├── test_grid.cpp
│   │           ├── test_zone_engine.cpp
│   │           ├── test_parity.cpp
│   │           └── CMakeLists.txt
│   ├── components/                   # ESPHome external components
│   │   └── epp/
│   │       ├── __init__.py
│   │       ├── epp_component.h
│   │       └── epp_component.cpp
│   ├── common/                       # YAML base configs (from original firmware)
│   │   ├── everything-presence-pro-base.yaml
│   │   ├── ld2450-base.yaml
│   │   ├── sen0609-base.yaml
│   │   ├── co2-base.yaml
│   │   ├── bluetooth-base.yaml
│   │   └── ethernet-base.yaml
│   └── variants/                     # 8 entry-point YAMLs
│       ├── wifi.yaml
│       ├── wifi-ble.yaml
│       ├── wifi-co2.yaml
│       ├── wifi-ble-co2.yaml
│       ├── ethernet.yaml
│       ├── ethernet-ble.yaml
│       ├── ethernet-co2.yaml
│       └── ethernet-ble-co2.yaml
├── custom_components/eppgrid/        # HA integration (existing, evolves)
├── frontend/                         # Lit panel (existing, evolves)
├── tests/                            # Python tests (existing, evolves)
│   └── fixtures/
│       └── parity_scenarios.json     # Shared parity test fixtures
├── tools/
│   ├── firmware-builder/             # Web UI for build + flash
│   └── replay/                       # Recorded data replay dev tool
├── docs/
├── pyproject.toml
└── hacs.json
```

## C++ Zone Engine Library

### Design Principles

- **Pure C++** — no ESPHome, no Arduino, no platform dependencies. Standard C++ only (`<cstdint>`, `<cmath>`, `<array>`, `<cstring>`).
- **No heap allocation in hot path** — fixed-size arrays sized to compile-time maximums (grid: 400 cells, targets: 3, zones: 8 slots including zone 0).
- **Identical algorithms** — direct port of `zone_engine.py`. Same constants, same logic, same edge cases.
- **Host-testable** — compiles and runs on any machine with a C++ compiler.

### Core Classes

| C++ | Python | Purpose |
|-----|--------|---------|
| `Grid` | `Grid` | Fixed 20×20 byte array (400 cells), `xy_to_cell()`, cell bit operations |
| `TumblingWindow` | `TumblingWindow` | 1s accumulator, per-target median position + frame count |
| `ZoneEngine` | `ZoneEngine` | `tick()` → target evaluation, entry-point gating, continuity check, handoff, state machine |
| `SensorTransform` | `SensorTransform` | 8-coefficient perspective homography `apply(x, y)` |
| `ProcessingResult` | `ProcessingResult` | Output struct: zone occupancy, target status/position/signal |

The grid is always 20×20 cells (matching the frontend). The Python backend uses `compute_extent()` to generate an initial grid after calibration (before the user paints a room layout); the firmware does not need this because it receives the painted 20×20 grid from HA via `epp_set_grid`.

### Shared Constants

Canonical values used across C++, Python, and TypeScript:

- `GRID_COLS = 20`, `GRID_ROWS = 20`, `GRID_CELL_SIZE_MM = 300`
- `CELL_ROOM_BIT = 0x01`, `CELL_ZONE_SHIFT = 1`, `CELL_ZONE_MASK = 0x0E`
- `CELL_TRAINING_MASK = 0xF0`, `CELL_TRAINING_SHIFT = 4` (bits 4-7 reserved for future AI training data)
- `MAX_TARGETS = 3`, `MAX_ZONES = 7` (named zones 1-7; zone 0 is the implicit rest-of-room zone)
- `MAX_MOVEMENT_CELLS = 5` (continuity Chebyshev threshold)
- Zone type defaults: trigger/renew/timeout per type (normal, entrance, thoroughfare, rest, custom)

### Memory Budget (ESP32)

ESP32 has ~320KB RAM shared with WiFi/BLE/ESPHome runtime. Zone engine allocation:
- Grid: 400 bytes (fixed)
- TumblingWindow: ~240 bytes (3 targets × 10 frames × 2 floats × 4 bytes per float)
- ZoneEngine state: ~256 bytes (8 zone runtimes, per-target tracking)
- NVS config cache: ~600 bytes (perspective 32B + grid 400B + zone configs ~160B)
- Total: ~1.5KB — negligible vs. available RAM even with BLE proxy active

## ESPHome Component Wrapper

The `epp` external component adapts the C++ library to ESPHome's lifecycle.

### Inputs — LD2450 Frame Acquisition

The existing `ld2450-base.yaml` parses the LD2450 UART binary protocol and exposes individual ESPHome sensors (`target_1_x`, `target_1_y`, etc.). However, the zone engine needs all 3 targets' data simultaneously per frame. The `epp` component registers an `on_target` callback on the LD2450 custom UART component to receive complete parsed frames (all 3 targets in one callback) at ~10Hz, avoiding the overhead and timing issues of subscribing to individual sensor state changes.

Other inputs received via standard ESPHome sensor state callbacks:
- PIR binary sensor (GPIO36) — for presence fusion
- SEN0609 binary sensor (GPIO34) — for presence fusion
- Environmental sensors (BH1750, SHTC3, SCD4x) — passed through to HA

Note: SEN0609 and PIR are NOT inputs to the zone engine. They participate in presence fusion only (the combined `occupancy` signal = PIR OR SEN0609 OR zone_engine.device_tracking_present). This fusion runs on-device in the LED/relay control script, same as the original firmware.

### Outputs

Exposed via ESPHome native API:

**Zone engine results (ESPHome sensors, ~1Hz on window tick):**
- Per-zone occupancy binary sensors (zone 0 rest-of-room + zones 1-7)
- Per-zone target counts (0-9 signal strength per zone)
- Room-level: `device_tracking_present` (any zone occupied — zone-engine-only, before PIR/SEN0609 fusion)

**Target positions (ESPHome text sensors, ~5Hz rolling median):**
- Per-target: calibrated x/y, status (active/pending/inactive), signal strength (×3)
- Serialized as a single text sensor per target: `"x,y,signal,status"` (e.g., `"1500,2000,7,active"`)
- When inactive: `"0,0,0,inactive"`

**Raw target pass-through (ESPHome text sensors, at sensor rate ~10Hz):**
- Per-target: raw x/y/speed/resolution from LD2450 — for Python dev engine + display buffer
- Serialized as: `"raw_x,raw_y,speed,resolution"` per target
- These are the pre-transform sensor-space coordinates

**Capability advertisement:**
- ESPHome text sensor `epp_firmware_version`: reports firmware version + capability flags (e.g., `"1.0.0:zone_engine"`)
- The coordinator uses this to detect that the device runs custom firmware with zone engine (vs. stock firmware). If absent, coordinator falls back to Python-only mode (current behavior), ensuring graceful compatibility with stock devices.

### Configuration Services

Received from HA via ESPHome custom services. ESPHome services support basic types (int, float, string, bool) but not arrays, so complex data is serialized as strings:

- `epp_set_perspective(perspective: string, room_width: float, room_depth: float)` — `perspective` is 8 comma-separated floats: `"a,b,c,d,e,f,g,h"`
- `epp_set_grid(grid_data: string, origin_x: float, origin_y: float)` — `grid_data` is base64-encoded 400 bytes (matching the existing Python `Grid.to_base64()` format)
- `epp_set_zones(zones_json: string)` — JSON string parsed on-device with a lightweight parser (ArduinoJson, which is an ESPHome dependency already). Schema matches the existing `set_room_layout` zone_slots format:
  ```json
  [
    {"id":1,"name":"Kitchen","type":"entrance","trigger":3,"renew":2,"timeout":5.0,"handoff_timeout":1.0,"entry_point":true},
    null, null, null, null, null, null
  ]
  ```
  Array has 7 elements (MAX_ZONES=7), where index 0 = zone 1, index 1 = zone 2, etc. Zone 0 (rest-of-room) is implicit and configured via the room-level fields.
  Plus room-level fields: `room_type`, `room_trigger`, `room_renew`, `room_timeout`, `room_handoff_timeout`, `room_entry_point`.

All configuration persisted to ESP32 NVS so device operates standalone.

### NVS Storage Layout

| NVS Key | Format | Content |
|---------|--------|---------|
| `epp_version` | uint8 | Schema version (starts at 1). Checked on boot; if missing or mismatched, config is cleared (clean start). |
| `epp_persp` | blob (40 bytes) | 8 floats (perspective) + 2 floats (room_width, room_depth) |
| `epp_grid` | blob (408 bytes) | 400 cell bytes + 2 floats (origin_x, origin_y) |
| `epp_zones` | blob (variable) | Serialized zone configs (compact binary, not JSON — JSON is only the service interface) |

On OTA update: if `epp_version` in NVS matches the firmware's expected version, config is preserved. If it doesn't match, config is cleared and the device waits for configuration from HA. This avoids complex migration logic.

### Behavioral Properties

- Device runs autonomously once configured — if HA goes down, zones still evaluate, relay still triggers, LED still responds to occupancy
- Raw LD2450 frames always forwarded to HA via text sensors (for Python dev engine + display buffer)
- Zone engine results sent at ~1 Hz (on tumbling window tick)
- Target positions sent at ~5 Hz (rolling median, matching current display buffer cadence)

## Firmware Changes Audit

### Keep As-Is

| File | Content |
|------|---------|
| `everything-presence-pro-base.yaml` | Core API, I2C, PIR, SHTC3, BH1750, relay, LED, improv, scripts |
| `sen0609-base.yaml` | SEN0609 static presence driver, calibration, UART commands |
| `co2-base.yaml` | SCD4x CO2, auto-calibration toggle |
| `bluetooth-base.yaml` | BLE proxy config |
| `ethernet-base.yaml` | LAN8720 ethernet config |
| Variant YAMLs (×8) | Entry points with `device_config` substitution flags |

### Adapt

| Original | Change |
|----------|--------|
| `ld2450-base.yaml` polygon zones | **Remove** — 4 inclusion zones, 2 exclusion zones, per-zone sensors replaced by grid-based zone engine |
| `ld2450-base.yaml` occupancy | **Replace** — `ld2450_occupancy` replaced by zone engine's `device_tracking_present` |
| Presence fusion | **Adapt** — `ld2450_occupancy` input becomes `device_tracking_present` from zone engine |
| LED control script | **Adapt** — zone engine occupancy added as input alongside PIR/SEN0609/LD2450. All existing modes and effects preserved. |
| OTA manifest URL | **Adapt** — points to our GitHub Releases |

### Add

| Component | Purpose |
|-----------|---------|
| `epp_zone_engine` C++ library | Grid, TumblingWindow, ZoneEngine, SensorTransform |
| `epp` ESPHome component | Wrapper: sensor data → library → ESPHome sensors/services |
| Configuration services | `epp_set_perspective`, `epp_set_grid`, `epp_set_zones` from HA |
| Raw data forwarding | LD2450 frames to HA via text sensors at sensor rate |
| LD2450 angle reset | Force angle to 0° on init |
| NVS persistence | Grid, zones, calibration in flash |
| Capability advertisement | `epp_firmware_version` text sensor for coordinator detection |

**Breaking change:** Removing LD2450 polygon zones means users with existing polygon zone configurations will lose them on firmware update. They will need to reconfigure zones through the grid editor. This is acceptable — our grid-based zone system is the replacement.

## Dual Mode Integration

### Production Mode (Default)

Frontend → HA WebSocket → Coordinator (thin proxy) → ESPHome API → Firmware zone engine results.

Entities source from firmware. Python zone engine does not run.

### Dev Mode (Toggle in Settings)

Frontend → HA WebSocket → Coordinator → Python zone engine (using raw frames from device).

Both firmware and Python engines process the same raw data. Frontend selects source via parameter.

### WebSocket API

Existing subscriptions gain an optional `source` parameter:

```
subscribe_grid_targets:
  entry_id: str
  source: "firmware" | "python"   # default: "firmware"
```

Both sources produce identical payload format. `subscribe_raw_targets` has no source parameter (always from device).

### Configuration Push

When the frontend saves calibration or zones:
1. Persist to `entry.options` (as today)
2. Push to device via ESPHome services
3. Update local Python engine (as today)

Both engines always have the same configuration.

## Firmware Builder & Installation

### Firmware Builder

Static web app hosted on GitHub Pages (`tools/firmware-builder/`).

Users select: WiFi/Ethernet, BLE on/off, CO2 on/off → maps to one of 8 pre-built binaries → ESP Web Tools flashes via USB (Web Serial API).

Pre-built binaries published as GitHub Release assets by CI on every release. No compile-on-demand.

### USB Installation (First Flash)

1. Connect EPP to computer via USB
2. Open firmware builder web page
3. Select options, click Install
4. ESP Web Tools handles Web Serial flashing
5. Device boots, creates WiFi AP for provisioning

### OTA Updates

ESPHome `http_request` update component (from original firmware). Manifest URL points to our GitHub Releases, constructed from `device_config` flags. Triggered from HA or frontend settings.

### Factory Reset

- **Sensor reset** — LD2450 + SEN0609 factory reset buttons (existing)
- **Zone config reset** — clears NVS zone engine state (grid, zones, calibration) without touching WiFi
- **Device reset** — ESPHome factory reset (clears WiFi, NVS). Re-flash via USB.

## Testing & Parity Infrastructure

### Layer 1: Unit Tests Per Language

| Language | Runner | Location |
|----------|--------|----------|
| C++ | CMake + doctest | `firmware/lib/epp_zone_engine/tests/` |
| Python | pytest | `tests/` |
| TypeScript | vitest | `frontend/src/__tests__/` |

### Layer 2: Shared Parity Fixtures (CI)

A JSON fixture file (`tests/fixtures/parity_scenarios.json`) defines test scenarios consumed by all three languages. Schema:

```json
{
  "scenarios": {
    "<test_name>": {
      "grid": {
        "room_cells": [[col, row], ...],
        "zone_cells": {"<zone_id>": [[col, row], ...]}
      },
      "zones": [
        {"id": 1, "type": "entrance", "trigger": 3, "renew": 2,
         "timeout": 5.0, "handoff_timeout": 1.0, "entry_point": true}
      ],
      "room": {"type": "normal", "trigger": 5, "renew": 3,
               "timeout": 10.0, "handoff_timeout": 3.0, "entry_point": false},
      "ticks": [
        {"t": 100.0, "targets": [{"x": 2850, "y": 450, "frames": 3}]}
      ],
      "expected": [
        {
          "zone_occupancy": {"0": false, "1": true},
          "targets": [{"status": "active", "x": 2850, "y": 450, "signal": 3}]
        }
      ]
    }
  }
}
```

Each tick in `ticks` corresponds to the same index in `expected`. Target x/y values are in grid-space (including origin offset). All three test suites read the same fixtures and assert the same results. When an algorithm changes, update the fixture — if any language diverges, CI fails.

### Layer 3: Replay Tool (Dev Tool)

**Recording:** The coordinator dumps raw LD2450 frames to a JSONL file when a recording flag is set (websocket command or dev mode UI toggle). Each line:
```json
{"t": 1711234567.123, "targets": [{"x": 1234, "y": 2100, "speed": 50, "res": 300}, ...], "pir": false, "static": true}
```

**Replay:** A standalone C++ CLI binary (built from the same `epp_zone_engine` library + a thin `main.cpp` that reads JSONL from stdin) runs the C++ engine. A Python script orchestrates:
1. Feed JSONL → Python engine → capture per-tick output
2. Feed JSONL → C++ CLI binary (subprocess) → capture per-tick output
3. Diff the two output streams, report any divergent ticks

The C++ CLI binary is a natural byproduct of the host-testable library design — it's just another consumer of the library. Optional: visual replay in the frontend (play back positions on the grid at recorded timestamps).

Not in CI — a hands-on diagnostic tool for algorithm tuning.

### CI Pipeline

```
GitHub Actions on push/PR:
  ├── Python tests (pytest) — unit + parity fixtures
  ├── TypeScript tests (vitest) — unit + parity fixtures
  ├── C++ tests (cmake + doctest) — unit + parity fixtures
  ├── Firmware compile (esphome compile) — all 8 variants
  ├── Frontend lint + build (biome + rollup)
  └── HACS + hassfest validation
```

## Phased Delivery

### Phase 1: Import & Scaffold

- Import firmware YAML into `firmware/common/` and `firmware/variants/`
- Delete fork repo
- ESPHome compile in CI (all 8 variants)
- Scaffold C++ library structure and ESPHome component (empty, compiles)
- Verify firmware identical to original

**Deliverable:** Monorepo with firmware that builds and flashes unchanged.

### Phase 2: C++ Zone Engine Library

- Port Grid, TumblingWindow, ZoneEngine, SensorTransform to C++
- Create shared JSON parity fixture file from existing test scenarios
- Write C++ parity tests, migrate Python/TS parity tests to shared fixtures
- All three languages pass same scenarios in CI

**Deliverable:** Proven-correct C++ zone engine library, tested on host.

### Phase 3: ESPHome Integration

- Wire C++ library into `epp` component
- Receive raw LD2450 frames, run zone engine on-device
- Expose zone occupancy + target status as ESPHome sensors
- Configuration services + NVS persistence
- Remove LD2450 polygon zones, adapt presence fusion
- LD2450 angle reset on init
- Raw data pass-through for dev mode

**Deliverable:** Firmware with on-device zone engine, flashable and standalone.

### Phase 4: HA Integration Adaptation

- Coordinator receives firmware zone results
- `source` parameter on `subscribe_grid_targets`
- Configuration push to device on save
- Dev mode toggle in frontend
- Entity source switches to firmware

**Deliverable:** Dual-mode integration, firmware in production, Python in dev.

### Phase 5: Firmware Builder & Installer

- CI builds 8 variants on release, publishes to GitHub Releases
- Static web app: option selection → ESP Web Tools flash
- Host on GitHub Pages
- OTA manifest URLs, firmware info in frontend

**Deliverable:** End users build and flash firmware from browser, receive OTA updates.

### Phase 6: Replay Tool

- Recording in coordinator (JSONL dump)
- Replay script with Python + C++ engine comparison
- Optional frontend replay mode

**Deliverable:** Dev tool for algorithm tuning and cross-engine comparison.

### Phase Dependencies

- Phases 1 → 2 → 3: strict sequence
- Phase 4: can start once Phase 3 is underway
- Phase 5: can start once Phase 3 is underway (independent of Phase 4)
- Phase 6: independent, can start anytime after Phase 2
