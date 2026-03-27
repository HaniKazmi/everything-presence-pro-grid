# Architecture

Everything Presence Pro (EPP) is a Home Assistant custom integration for the
Everything Presence Pro mmWave radar sensor. It provides room-level and
zone-level occupancy detection, target tracking, and environmental sensing
through firmware running on the ESP32 device, a thin HA integration for
device management and config storage, and a Lit-based frontend panel for
calibration, zone editing, and live visualization.

## System Overview

```
┌──────────────────────────────────────────────────────┐
│  EPP Device (ESP32)                                  │
│                                                      │
│  LD2450 mmWave → rolling median → perspective        │
│                  transform → zone engine             │
│  PIR, BH1750, SHTC3, SEN0609                        │
│                                                      │
│  Publishes: ESPHome entities + text sensor streams   │
│  Receives: config via ESPHome API actions            │
└──────────┬───────────────────────────────────────────┘
           │ ESPHome API (TCP, noise PSK)
           ▼
┌──────────────────────────────────────────────────────┐
│  HA Integration (thin relay layer)                   │
│                                                      │
│  ┌──────────────┐  ┌───────────┐  ┌──────────────┐  │
│  │ DeviceManager │  │  Storage  │  │ WebSocket API│  │
│  │ discovery,    │  │ per-device│  │ relay device │  │
│  │ connections,  │  │ config,   │  │ state to     │  │
│  │ config push   │  │ templates │  │ frontend     │  │
│  └──────────────┘  └───────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────┘
           │ WebSocket subscriptions
           ▼
┌──────────────────────────────────────────────────────┐
│  TypeScript Frontend (Lit panel)                     │
│                                                      │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Calibration │  │ Zone Editor  │  │    Live      │ │
│  │   Wizard    │  │ grid paint,  │  │  Overview    │ │
│  │ 4-corner    │  │ zone CRUD,   │  │  targets,    │ │
│  │ capture     │  │ furniture    │  │  sensors     │ │
│  └────────────┘  └──────────────┘  └──────────────┘ │
│                                                      │
│  Local zone engine replica (live preview in editor)  │
└──────────────────────────────────────────────────────┘
```

## Directory Layout

```
everything-presence-pro-grid/
├── custom_components/eppgrid/
│   ├── __init__.py            # Entry point: setup, panel registration
│   ├── manifest.json          # Integration metadata
│   ├── const.py               # Constants (domain, grid geometry, zones)
│   ├── config_flow.py         # HA config UI (singleton confirm step)
│   ├── device_manager.py      # Discovery, connections, config push
│   ├── storage.py             # Persistent per-device config + templates
│   ├── websocket_api.py       # Frontend ↔ device relay, commands
│   └── frontend/
│       └── eppgrid-panel.js   # Built JS bundle
├── frontend/
│   ├── src/
│   │   ├── eppgrid-panel.ts       # Orchestrator (view routing, controllers, dialogs)
│   │   ├── types.ts               # Shared type definitions
│   │   ├── constants.ts           # SVG data, catalog, labels, thresholds
│   │   ├── styles.ts              # HA theme tokens, reusable CSS fragments
│   │   ├── index.ts               # Export entry point
│   │   ├── controllers/
│   │   │   ├── device-controller.ts    # WS subscriptions, device loading
│   │   │   ├── grid-state-controller.ts # Grid/zone/furniture mutation, templates
│   │   │   └── target-controller.ts    # Target/sensor/zone state, zone engine
│   │   ├── components/
│   │   │   ├── epp-wizard.ts           # Calibration wizard (guide, corners, capture)
│   │   │   ├── epp-live-view.ts        # Live overview composite
│   │   │   ├── epp-editor-view.ts      # Zone/furniture editor composite
│   │   │   ├── epp-settings-view.ts    # Device settings (accordions, ranges)
│   │   │   ├── epp-grid.ts             # Shared grid renderer
│   │   │   ├── epp-live-sidebar.ts     # Sensor/zone status display
│   │   │   ├── epp-zone-sidebar.ts     # Zone list + type controls
│   │   │   ├── epp-furniture-sidebar.ts # Furniture catalog
│   │   │   └── epp-furniture-overlay.ts # Furniture drag/resize/rotate
│   │   └── lib/
│   │       ├── zone-engine.ts       # Pure-function zone state machine
│   │       ├── perspective.ts       # Homography math
│   │       ├── grid.ts             # Cell encoding, room bounds
│   │       ├── coordinates.ts      # Target → grid mapping
│   │       └── zone-defaults.ts    # Zone types, thresholds, colors
│   ├── rollup.config.js       # Bundles TS → built JS
│   ├── biome.json             # TS linter/formatter config
│   └── vitest.config.ts       # Frontend test config
├── firmware/
│   ├── components/epp/        # Custom ESPHome component
│   ├── lib/epp_zone_engine/   # C++ zone engine library + tests
│   ├── common/                # Shared ESPHome YAML configs
│   └── variants/              # 8 firmware build variants
├── docs/
│   └── backend-data-catalog.md  # Data field inventory
├── tools/
│   └── firmware-builder/      # Web UI for firmware variant selection
├── pyproject.toml             # Python config (ruff)
└── .github/workflows/         # CI: frontend + C++ tests, firmware builds
```

## Firmware (ESP32)

All signal processing runs on-device in the C++ zone engine:

1. **LD2450 UART** (~10Hz raw frames) → rolling median filter
2. **Perspective transform** maps sensor coords to room coords
3. **Zone engine** processes through tumbling window + state machine
4. **Publishing**: raw targets (5Hz), grid targets (5Hz), zone state (1Hz)

Config (perspective coefficients, grid bytes, zone slots) is received via
ESPHome API actions and persisted in NVS.

See `firmware/lib/epp_zone_engine/` for the C++ implementation and tests.

## HA Integration

The Python integration is a thin layer between the device and the frontend.
It does **no** signal processing — that's all firmware.

### Integration Lifecycle (`__init__.py`)

`async_setup_entry` creates the store, starts the device manager, registers
WebSocket commands, and registers the frontend panel (with cache-busting
via MD5 hash of the JS bundle).

### Device Manager (`device_manager.py`)

Discovers ESPHome devices with `zone_engine_version` entities. Manages
on-demand aioesphomeapi connections for frontend sessions. Pushes stored
config to devices on save and on reconnect. Manages ESPHome zone entity
enable/disable/rename.

### Storage (`storage.py`)

Persists per-device config (calibration, room layout, zone slots, sensor
settings) and room templates via HA's `Store` API.

### WebSocket API (`websocket_api.py`)

Relays device state to the frontend and handles config commands. Two live
subscriptions parse ESPHome text sensor updates into structured events:

- `subscribe_raw_targets` — sensor-space positions for calibration
- `subscribe_grid_targets` — grid positions + zone state + sensor data

Config commands (`set_setup`, `set_room_layout`, etc.) save to storage and
push to the device.

See [backend-data-catalog.md](backend-data-catalog.md) for the complete
data field inventory.

## TypeScript Frontend

### Build System

Rollup bundles `src/index.ts` → minified ES module at
`custom_components/.../frontend/eppgrid-panel.js`.
TypeScript with strict mode and experimental decorators for Lit.
Biome for linting/formatting.

### Panel Architecture

The frontend is a Lit-based component tree rooted in `<eppgrid-panel>`,
which serves as an orchestrator. State flows via reactive controllers,
rendering is delegated to focused sub-components.

**Orchestrator (`eppgrid-panel.ts`)** — View routing (live/editor/settings/wizard),
device selector, global dialogs, navigation guards, controller creation.

**Controllers** (shared state, no DOM):
- `DeviceController` — WS subscriptions, device loading, session lifecycle
- `GridStateController` — grid/zone/furniture mutation, template persistence, save
- `TargetController` — target/sensor/zone state, zone engine, debug logs

**Composite views:**
- `<epp-live-view>` — live grid + sidebar + menu dropdown
- `<epp-editor-view>` — editable grid + zone/furniture sidebars + debug log
- `<epp-settings-view>` — accordion panels for detection ranges, reporting, env offsets
- `<epp-wizard>` — calibration flow (guide, 4-corner capture, perspective solve)

**Shared components:**
- `<epp-grid>` — grid cell rendering, target dots, furniture overlay (live + editor)
- `<epp-live-sidebar>` — presence/zone/environment sensor display
- `<epp-zone-sidebar>` — zone list, type controls, add/remove
- `<epp-furniture-sidebar>` — sticker catalog, custom icons
- `<epp-furniture-overlay>` — drag, resize, rotate furniture items

**State flow:** Controllers own cross-cutting state (device, grid, targets).
Components receive data as properties, fire `CustomEvent`s for mutations.
The orchestrator wires events to controller methods.

**Navigation protection:** Intercepts `beforeunload` and
`history.pushState/replaceState` when unsaved changes exist.

### Library Modules

**perspective.ts** — `solvePerspective(src, dst)` solves the 8-coefficient
homography from 4 point pairs via Gaussian elimination.
`applyPerspective(h, x, y)` applies the transform.
`getInversePerspective(h)` inverts via 3×3 matrix inversion.

**grid.ts** — Cell bit operations (`cellIsInside`, `cellZone`,
`cellSetZone`), room bounds calculation, grid initialization from room
dimensions. Constants: `GRID_COLS=20`, `GRID_ROWS=20`, `GRID_CELL_MM=300`.

**coordinates.ts** — `mapTargetToGridCell(x, y, roomWidth, roomDepth)`
maps room-space coordinates to fractional grid cell position (room
centered horizontally). `rawToFovPct()` maps raw sensor coords to FOV
percentages for the wizard. `getSmoothedValue()` provides 1-second rolling
median for capture smoothing.

**zone-defaults.ts** — `ZoneConfig` interface, `ZONE_TYPE_DEFAULTS` with
thresholds per zone type, color palette (7 colorblind-friendly colors),
`getZoneThresholds()` resolver.

### Local Zone Engine Replica (`lib/zone-engine.ts`)

The frontend contains a pure-function replica of the firmware's zone engine
state machine for live preview in the editor. It implements the same algorithms:

- Target → grid cell mapping
- Continuity check (Chebyshev ≤ 5 cells)
- Entry-point gating
- Trigger/renew threshold comparison
- CLEAR/OCCUPIED/PENDING state machine with timeouts
- Handoff detection with accelerated timeout

**Keeping the C++ and TypeScript implementations in sync is critical.**

## Firmware ↔ TypeScript Sync Requirements

The zone engine must behave identically in firmware and frontend:

| Algorithm | C++ (firmware) | TypeScript (frontend) |
|-----------|---------------|----------------------|
| Cell encoding | `epp_grid.h` | `grid.ts` |
| Target → cell | `epp_zone_engine.cpp` | `coordinates.ts` |
| Zone state machine | `epp_zone_engine.cpp` | `lib/zone-engine.ts` |
| Zone type defaults | `epp_component.cpp` | `zone-defaults.ts` |
| Perspective transform | `epp_calibration.h` | `perspective.ts` |

## Testing

### C++ (doctest)

Tests in `firmware/lib/epp_zone_engine/tests/`:
zone engine, grid, calibration, rolling/tumbling windows.

### TypeScript (vitest)

Tests live in `frontend/src/__tests__/` with happy-dom for DOM simulation.

| Directory | Covers |
|-----------|--------|
| `panel-*.test.ts` | Integration tests for orchestrator |
| `controllers/*.test.ts` | DeviceController, GridStateController, TargetController |
| `components/*.test.ts` | All 9 extracted components |
| `lib/*.test.ts` | Pure-function modules (grid, coordinates, perspective, zone-engine, etc.) |

### Python (pytest)

Tests in `tests/`: init lifecycle, storage, device manager, websocket API.

### CI (.github/workflows/)

- **tests.yml** — Python tests (3 HA versions), frontend lint + vitest + coverage, C++ ctest
- **firmware.yml** — C++ tests + ESPHome compilation for all 8 variants
- **hacs.yml** — HACS repository structure validation
- **hassfest.yml** — manifest.json schema validation
