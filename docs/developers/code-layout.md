# Code layout

Quick orientation: the repository is four subsystems plus CI glue. This page walks through each so you can answer "where does X live?" without grepping.

```
everything-presence-pro-grid/
├── custom_components/eppgrid/   # Python HA integration
├── frontend/                    # TypeScript/Lit panel
├── firmware/                    # ESPHome + C++ zone engine
├── docs/                        # This site
├── scripts/hooks/pre-push       # Pre-push hook (required to be set up)
├── tests/                       # Python tests
├── .github/workflows/           # CI
├── pyproject.toml               # Python config (ruff, pytest)
├── requirements_test.txt        # Python dev deps
├── requirements-docs.txt        # Docs deps
├── mkdocs.yml                   # Docs site config
├── hacs.json                    # HACS metadata
└── README.md
```

## Integration (`custom_components/eppgrid/`)

Python HA custom component. Thin by design — it does no signal processing. Its job is to discover devices, manage connections, relay state to the panel, and persist config.

Key files:

- **`__init__.py`** — `async_setup_entry`, storage init, device-manager startup, WebSocket command registration, frontend-panel registration (with cache-busting).
- **`config_flow.py`** — HA config flow. Mostly a shell because the integration's real "discovery" happens by scanning the entity registry for ESPHome devices that match the hardware signature (see `device_manager.py`).
- **`device_manager.py`** — the workhorse. Scans the entity registry for Everything Presence Pro devices running the right firmware, opens `aioesphomeapi` connections on demand, pushes saved config, manages entity enable/disable based on settings, subscribes to device logs.
- **`websocket_api.py`** — relay layer between the panel and the device. Handles WebSocket commands like `eppgrid/set_setup`, `eppgrid/set_room_layout`, `eppgrid/update_firmware`, and subscription streams (`subscribe_raw_targets`, `subscribe_grid_targets`, `subscribe_ota_progress`).
- **`storage.py`** — per-device config persistence via HA's `Store` API. Calibration, room layout, zone slots, furniture, sensor settings.
- **`firmware_proxy.py`** — constructs the firmware-manifest URL from the configured base URL and device variant.
- **`diagnostics.py`** — HA diagnostics platform. Lets users download a JSON dump of integration state for issue reports.
- **`const.py`** — constants. Notably `MANIFEST_BASE_URL` (the Pages site URL) and `FIRMWARE_VERSION` (the integration's expected firmware version).
- **`sensor.py`** / **`binary_sensor.py`** — placeholder platforms. The integration doesn't create its own entities; these modules exist because HA expects them for the platforms to register.
- **`strings.json`** and **`translations/en.json`** — user-facing strings. The pre-push hook checks these stay in sync.
- **`frontend/eppgrid-panel.js`** — the built frontend bundle (tracked in git — see [Contributing](contributing.md)).

For the flow of data through these files at runtime, see [Architecture](architecture.md).

## Frontend (`frontend/src/`)

TypeScript/Lit panel. Runs inside the Home Assistant iframe.

- **`eppgrid-panel.ts`** — top-level `<eppgrid-panel>` custom element. Tab bar (Device Configuration / Flash Firmware), global state, event routing, setup step management.
- **`components/`** — Lit components for the visual surfaces:
    - `epp-grid.ts` — the grid canvas (rendering, mouse events, target dots).
    - `epp-wizard.ts` — calibration wizard (guide + corner capture).
    - `epp-flasher-view.ts` — firmware flasher UI.
    - `epp-zone-sidebar.ts`, `epp-overlay-sidebar.ts`, `epp-furniture-sidebar.ts`, `epp-furniture-overlay.ts`, `epp-live-sidebar.ts` — editor-mode sidebars.
    - `epp-settings-view.ts`, `epp-device-card.ts`, `epp-flasher-card.ts` — supporting UI.
- **`controllers/`** — Lit reactive controllers:
    - `grid-state-controller.ts` — mutable grid state (cells, room boundary, overlays).
    - `flasher-controller.ts` — USB flasher state machine.
    - `ota-controller.ts`, `protocol-controller.ts` — OTA progress, protocol/version banners.
- **`lib/`** — pure-logic modules (no Lit, no HA, testable in isolation):
    - `zone-engine.ts` — state-machine replica of the firmware's zone engine. Kept deliberately in sync so the frontend previews match firmware behaviour.
    - `perspective.ts` — homography math (solve + apply + invert).
    - `grid.ts` — cell byte encoding (zone, overlay, interference level).
    - `cell-painting.ts` — click/drag painting for zones, overlays, and room boundaries.
    - `coordinates.ts` — target → grid cell mapping via the perspective transform.
    - `furniture.ts` — furniture presets and item creation.
    - `improv-serial.ts`, `usb-flash-service.ts` — USB flashing primitives.
    - `heatmap.ts` — live-view target rendering.
    - `zone-defaults.ts` — default thresholds per zone type.
    - `room-geometry.ts`, `canvas-serialization.ts`, `sticker-thumbnail.ts` — supporting utilities.
- **`types.ts`, `localize.ts`, `strategy.ts`, `constants.ts`, `styles.ts`** — cross-cutting utilities.
- **`translations/en.json`** — user-facing strings for the panel.
- **`__tests__/`** — Vitest specs mirroring the source tree. See [Contributing](contributing.md) for how to run them.
- **`rollup.config.js`** — bundles TypeScript source to `custom_components/eppgrid/frontend/eppgrid-panel.js`, which is committed to git so Home Assistant serves it without a build step.

## Firmware (`firmware/`)

ESPHome-based, with a custom C++ component and a standalone zone-engine library.

- **`variants/`** — the shipping firmware variants:
    - `wifi-ble-co2.yaml` — Wi-Fi, with BLE and CO2.
    - `ethernet-ble-co2.yaml` — Ethernet, with BLE and CO2.
- **`common/`** — shared YAML:
    - `everything-presence-pro-base.yaml` — entity declarations, device config, update component, custom-action wiring.
    - `co2-base.yaml` — SCD4x CO2 sensor YAML snippet.
- **`components/epp/`** — custom ESPHome component (C++) that wires the zone engine into the ESPHome component lifecycle. Reads LD2450 frames, runs them through the rolling-median filter and perspective transform, pushes results to the zone-engine library.
- **`lib/epp_zone_engine/`** — the zone engine library, pure logic, no ESPHome dependencies:
    - `src/` — implementation.
    - `include/` — public headers.
    - `tests/` — unit tests.
    - `CMakeLists.txt` — build.

The zone engine library builds and tests standalone via CMake, which is what the pre-push hook runs when firmware code changes. See [Contributing](contributing.md).

## Docs (`docs/`)

This site. MkDocs Material source.

- `user-guide/` — the user-facing pages.
- `developers/` — this section.
- `images/` — screenshot placeholders and the logo.
- `superpowers/` — planning and spec documents. Gitignored; not published to the site.
- `mkdocs.yml` (in repo root) — site config, nav, theme, plugins.

## CI (`.github/workflows/`)

- **`tests.yml`** — Python (HA 2025.2.0 floor, HA stable, HA dev), Frontend (Vitest + coverage), C++ tests (CMake + CTest).
- **`firmware.yml`** — compiles each firmware variant.
- **`hacs.yml`** — HACS integration validation.
- **`hassfest.yml`** — HA integration metadata validation.
- **`codeql.yml`** — CodeQL analysis (Python, JS/TS, C/C++).
- **`pages.yml`** — builds and deploys this docs site to GitHub Pages, and stages `fw/` from the latest release so firmware manifests stay reachable.
- **`firmware-release.yml`** — publishes firmware artefacts on release.

---

See [Contributing](contributing.md) for how to actually build and test these, and [Architecture](architecture.md) for the runtime data flow between them.
