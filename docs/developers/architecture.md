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
│   │   │   ├── epp-settings-view.ts    # Device settings (accordions, ranges)
│   │   │   ├── epp-flasher-view.ts     # USB/Wi-Fi firmware flasher flow
│   │   │   ├── epp-device-card.ts      # Device picker card in the header
│   │   │   ├── epp-grid.ts             # Shared grid renderer
│   │   │   ├── epp-live-sidebar.ts     # Sensor/zone status display
│   │   │   ├── epp-zone-sidebar.ts     # Zone list + type controls
│   │   │   ├── epp-overlay-sidebar.ts  # Entry/Exit, Interference, Suppress modes
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
│   └── developers/
│       ├── architecture.md      # This file
│       └── data-catalog.md      # Data field inventory
├── pyproject.toml             # Python config (ruff)
└── .github/workflows/         # CI: frontend + C++ tests, firmware builds
```

## Firmware (ESP32)

All signal processing runs on-device in the C++ zone engine:

1. **LD2450 UART** (~10Hz raw frames) → rolling median filter
2. **Perspective transform** maps sensor coords to room coords
3. **Zone engine** processes through rolling window + state machine
4. **Sensor presence** — static (SEN0609) and motion (PIR) binary sensors are
   fed into the zone engine with software-managed timeouts (active→pending→inactive).
   Hardware timeouts are set to 1s for debounce; the zone engine manages the real
   timeout. When both sensors are inactive and no zones have active targets,
   pending zones are force-cleared immediately.
5. **Publishing**: raw targets (5Hz), grid targets (5Hz), zone state (1Hz)

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

Discovers ESPHome devices with `zone_engine_version` entities. Reads the
`Config Protocol` sensor to determine firmware-integration compatibility
(see the config protocol versioning spec in `docs/superpowers/specs/`).
Manages on-demand aioesphomeapi connections for frontend sessions. Pushes
stored config to devices on save and on reconnect via temporary connections
(separate from the frontend session to avoid consuming API slots or racing
with UI subscriptions). Manages ESPHome zone entity enable/disable/rename.
Fetches build flags from firmware on connect. Subscribes to device log
stream when any log category is set above None, re-emitting messages under
`custom_components.eppgrid.device_manager.device_logs`.

### Storage (`storage.py`)

Persists per-device config (calibration, room layout, zone slots, sensor
settings) and room templates via HA's `Store` API.

### WebSocket API (`websocket_api.py`)

Relays device state to the frontend and handles config commands. Two live
subscriptions parse ESPHome text sensor updates into structured events:

- `subscribe_raw_targets` — sensor-space positions for calibration
- `subscribe_grid_targets` — grid positions + zone state + sensor data

Config commands (`set_setup`, `set_room_layout`, etc.) check config protocol
compatibility before executing, then save to storage and push to the device.
An `update_firmware` command triggers OTA for firmware-behind devices.
A flasher subsystem (`ota.py`) implements the ESPHome OTA TCP protocol
(port 3232) for pushing firmware binaries directly to devices without
requiring ESPHome Dashboard.

See [data-catalog.md](data-catalog.md) for the complete
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

**Orchestrator (`eppgrid-panel.ts`)** — View routing (live/editor/settings/wizard/flasher),
device selector, global dialogs, navigation guards, controller creation. The live overview
and editor screens are rendered inline via `_renderLiveOverview()` and `_renderEditor()`
rather than through dedicated composite components.

**Controllers** (shared state, no DOM):
- `DeviceController` — WS subscriptions, device loading, session lifecycle
- `GridStateController` — grid/zone/furniture mutation, template persistence, save
- `TargetController` — target/sensor/zone state, zone engine, debug logs

**Views rendered inline by the panel** — the orchestrator builds the live overview and editor screens directly from the shared components below, using `_renderLiveOverview()` and `_renderEditor()` in `eppgrid-panel.ts`. Only the heavier, self-contained flows live in their own components:

- `<epp-wizard>` — calibration flow (guide, 4-corner capture, perspective solve)
- `<epp-settings-view>` — accordion panels for detection ranges, reporting, env offsets, LED control, log levels
- `<epp-flasher-view>` — USB/Wi-Fi firmware flashing flow

**Shared components** — composed by the panel's inline renderers:

- `<epp-grid>` — grid cell rendering, target dots, furniture overlay, FOV darkness (live + editor)
- `<epp-live-sidebar>` — presence/zone/environment sensor display
- `<epp-zone-sidebar>` — zone list, type controls, add/remove
- `<epp-overlay-sidebar>` — Entry/Exit, Interference, and Suppress paint-mode controls
- `<epp-furniture-sidebar>` — sticker catalog, custom icons
- `<epp-furniture-overlay>` — drag, resize, rotate furniture items
- `<epp-device-card>` — device picker card shown in the panel header

**State flow:** Controllers own cross-cutting state (device, grid, targets).
Components receive data as properties, fire `CustomEvent`s for mutations.
The orchestrator wires events to controller methods. On device load, the
orchestrator sets `DeviceController.onTargetData` and `onRawTargetData`
callbacks that route incoming WS data through `TargetController` to the
panel's reactive state — these must be set before subscriptions start.

**Navigation protection:** Intercepts `beforeunload` and
`history.pushState/replaceState` when unsaved changes exist.

### USB Flashing & WiFi Provisioning

The Flash Firmware tab provides USB-based firmware flashing and WiFi
provisioning via the Web Serial API and esptool.js, all running in the
browser.

**Key files:**
- `lib/usb-flash-service.ts` — esptool.js flash orchestration, manifest fetch
- `lib/improv-serial.ts` — Improv Serial protocol (packet building, parsing, buffer management)
- `components/epp-flasher-view.ts` — Flash UI (device list, variant selector, WiFi provisioning)
- `controllers/flasher-controller.ts` — Serial port lifecycle, USB state machine

**Firmware manifests + binaries** are proxied through the HA backend at
`/api/eppgrid/firmware/` (see `firmware_proxy.py`) to avoid CORS issues
with GitHub Releases. The proxy fetches from the per-version release at
`github.com/.../releases/download/v{FIRMWARE_VERSION}/`, so the integration
always installs the firmware version it was tested against — independent
of the "latest" pointer used by the standalone ESP Web Tools page.
`FIRMWARE_VERSION` is pinned in `const.py`.

**USB flash flow:**
1. User selects serial port via Web Serial API
2. esptool.js detects chip, uploads stub, flashes firmware + appends a
   2 KB `0xFF` write at `0x9000` to erase the otadata partition. Without
   this the bootloader keeps booting whichever ota_X partition the previous
   OTA wrote to — even though we just wrote firmware.bin to ota_0.
3. MAC detected from esptool terminal output during `loader.main()`
4. `beforeFlash` callback checks MAC against installed devices — if original
   firmware with ESPHome entry, confirms and deletes the old entry
5. After flash, `transport.disconnect()` releases reader (port stays open
   via CH340 monkey-patch — see Serial Port Lifecycle below)

**WiFi check / auto-skip** (wifi variants only, runs immediately after flash):
1. `queryImprovState` does an Improv handshake and reads `CURRENT_STATE`.
   If the device boots into `PROVISIONED` (already had creds in NVS), it
   delegates to `detectIpAddress` which polls `GET_CURRENT_STATE` every
   2 s for up to 30 s waiting for a non-`0.0.0.0` IP (cold-boot DHCP can
   take 7–20 s).
2. If a real IP arrives → skip WiFi setup, go straight to HA-add.
3. Otherwise (unprovisioned, or no IP within budget) → fall through to the
   WiFi provisioning flow below.
4. Cancel during this phase aborts the polling loop via `AbortSignal` and
   awaits the in-flight promise before closing the port — closing while a
   reader lock is still held leaves the port unusable for retries.

**WiFi provisioning flow** (used when auto-skip falls through):
1. WiFi scan via Improv SCAN command
2. User selects network, enters password
3. Send credentials via Improv WIFI_SETTINGS command
4. Wait for PROVISIONING (0x03) → PROVISIONED (0x04) state transition
   (confirms creds saved to NVS)
5. `detectIpAddress` polls until a non-`0.0.0.0` IP is returned
6. Auto-add device to HA via `eppgrid/add_esphome_device` WebSocket API

**Error / retry routing:** The error state carries the `lastStep` it
transitioned from plus the `variant` for flash-phase errors. The Retry
button re-runs the flash for `connecting`/`flashing`/`wifi_check` failures
and the WiFi-config flow for everything else. Start Over always resets
to the variant picker.

**Serial port lifecycle (CH340 workaround):**
`transport.disconnect()` calls `port.close()` internally. On CH340 USB-serial
chips (VendorID 0x1a86, ProductID 0x55d3), closing and reopening leaves the
port in a zombie state. Fixed by monkey-patching `port.close` to a no-op
before creating Transport, restoring after disconnect. Port stays open for
WiFi provisioning after flash.

**Firmware updates** for Everything Presence Pro Grid devices use a custom
ESPHome API action, `set_update_manifest`, which sets the source URL on the
device's `http_request`-platform `update` entity and then calls `update.perform`
on it. The flow is triggered by the integration via the `eppgrid/update_firmware`
WebSocket command. Raw OTA push is not used — newer ESPHome uses NOISE
encryption which is incompatible with direct protocol implementation.
Original firmware devices can only be converted via USB flash.

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

**room-geometry.ts** — `computeSensorFov(perspective)` derives sensor
position and look-direction in room-space from the perspective transform.
`isCellInSensorRange(col, row, fov, roomWidth, maxRangeMm)` checks whether
a cell falls within the 120° FOV cone and max range — used by `<epp-grid>`
to render out-of-range cells with a cross-hatched pattern and block painting.
`autoDetectionRange()` computes range from the furthest room cell.

**zone-defaults.ts** — `Zone0Config` (zone 0 settings: type + timing) and
`ZoneConfig` (named zones: `Zone0Config` + name + color) interfaces,
`ZONE_TYPE_DEFAULTS` with thresholds per zone type, color palette
(7 colorblind-friendly colors), `getZoneThresholds()` resolver.

### Local Zone Engine Replica (`lib/zone-engine.ts`)

The frontend contains a pure-function replica of the firmware's zone engine
state machine for live preview in the editor. It implements the same algorithms:

- Target → grid cell mapping
- Continuity check (Chebyshev ≤ 5 cells)
- Entry-point gating
- Trigger/renew threshold comparison
- CLEAR/OCCUPIED/PENDING state machine with timeouts
- Handoff detection with accelerated timeout
- Sensor presence state machine (active→pending→inactive) with force-clear

**Keeping the C++ and TypeScript implementations in sync is critical.**

## Firmware ↔ TypeScript Sync Requirements

The zone engine must behave identically in firmware and frontend:

| Algorithm | C++ (firmware) | TypeScript (frontend) |
|-----------|---------------|----------------------|
| Cell encoding | `epp_grid.h` | `grid.ts` |
| Target → cell | `epp_zone_engine.cpp` | `coordinates.ts` |
| Zone state machine | `epp_zone_engine.cpp` | `lib/zone-engine.ts` |
| Sensor state machine | `epp_zone_engine.cpp` | `lib/zone-engine.ts` |
| Zone type defaults | `epp_component.cpp` | `zone-defaults.ts` |
| Perspective transform | `epp_calibration.h` | `perspective.ts` |

## Testing

### C++ (doctest)

Tests in `firmware/lib/epp_zone_engine/tests/`:
zone engine, grid, calibration, rolling window.

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
- **firmware.yml** — C++ tests + ESPHome compilation for all 8 variants (on push to main touching `firmware/`)
- **hacs.yml** — HACS repository structure validation
- **hassfest.yml** — manifest.json schema validation

### Firmware Release Deployment

Firmware binaries and manifests are hosted on **GitHub Releases** and proxied
through the HA backend at `/api/eppgrid/firmware/` to avoid CORS issues
(GitHub Releases serves with `application/octet-stream` and no CORS headers).
The firmware version is pinned by `FIRMWARE_VERSION` in `const.py`. The
proxy fetches from the version-pinned release URL, so installs from the
panel are always reproducible — independent of which release the GitHub
"latest" pointer happens to refer to.

**Release script (`bin/release.sh`)** — opens a release PR. Pre-flights
semver, on-main, clean-tree, tag-not-exists, and origin-up-to-date. Bumps
`manifest.json` (always) and `FIRMWARE_VERSION` (only when `firmware/`
changed since the previous tag) so the integration version and firmware
version remain independent — they only re-align when the firmware actually
changes.

**firmware-release.yml** — Triggered by tag push (`v*`). First runs
`.github/scripts/validate-release.sh`, which fails the workflow if
`manifest.json` ≠ tag, or if the three firmware-version files (manifest
template, `FIRMWARE_VERSION`, etc.) disagree. If the tag bumps the firmware
version it compiles the variants, generates ESP Web Tools manifests, and
publishes them as release assets. Tags `make_latest=true` only for
firmware-changing non-pre-release tags; pre-releases (`-alpha`, `-beta`,
`-rc`) are never auto-promoted.

**pages.yml** — Triggers on push to main *and* on `release: released`.
Stages `fw/` from the GitHub `latest` release via `gh api /releases/latest`
(simpler than scanning + filtering). Promoting a pre-release to latest in
the GitHub UI re-fires this workflow without needing a fresh tag.
