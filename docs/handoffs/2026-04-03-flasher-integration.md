# Flasher Integration into HA Frontend

**Date:** 2026-04-03
**Branch:** `flasher`
**PR:** #44
**Status:** USB flashing works, post-flash boot loop issue needs investigation

## What was done

### Brainstorming & Design
- Designed the full flasher integration: OTA flash, USB flash, WiFi provisioning, dashboard strategy, Lovelace cards
- Decomposed into 3 sub-projects: (1) firmware variant simplification, (2) sidebar panel toggle, (3) flasher integration
- Specs and plans written for all 3 (in `docs/superpowers/specs/` and `docs/superpowers/plans/`)
- Sub-projects 1 and 2 have specs+plans ready but are NOT implemented yet

### Sub-project 3: Flasher Integration (implemented)

**Backend (Python):**
- `device_manager.py` — `list_flashable_devices()` discovers EPP devices by manufacturer/model in HA device registry, classifies as `original` or `eppgrid` firmware
- `websocket_api.py` — 4 new commands:
  - `eppgrid/list_flashable_devices` — returns all EPP devices
  - `eppgrid/flash_ota` — orchestrates OTA: download firmware -> delete old device -> push OTA -> wait reboot -> auto-add to ESPHome (progress streamed via events)
  - `eppgrid/delete_esphome_device` — validates ESPHome domain before deleting
  - `eppgrid/add_esphome_device` — triggers ESPHome config flow with host IP
- `ota.py` — ESPHome OTA TCP protocol (port 3232), manifest fetching from GitHub releases
- `const.py` — `FIRMWARE_VERSION`, `FIRMWARE_VARIANTS` mapping (wifi->wifi-ble-co2, ethernet->ethernet-ble-co2)
- All privileged commands have `@require_admin`
- Uses shared HA aiohttp session, passes user context to config flows

**Frontend (TypeScript/Lit):**
- `flasher-controller.ts` — reactive controller for device discovery, OTA progress state machine
- `epp-flasher-view.ts` — Flash Firmware tab UI: device list, OTA progress, USB section, WiFi provisioning UI, variant selector
- `epp-flasher-card.ts` / `epp-device-card.ts` — Lovelace card wrappers
- `strategy.ts` — HA dashboard strategy generating two-view config
- `improv-serial.ts` — Improv Serial protocol parser (WiFi scan/provision)
- `eppgrid-panel.ts` — tab bar routing (Device Configuration / Flash Firmware)
- `styles.ts` — flasher styles, variant selector, progress UI
- `translations/en.json` — all flasher strings localized
- `index.ts` — registers cards and strategy

**USB Flashing:**
- ESP Web Tools loaded in an iframe (`usb-flasher.html`) to avoid custom element conflicts with HA's scoped registry
- Manifest URL served from local static path (`/eppgrid_static/firmware/...`)
- Variant selector (WiFi/Ethernet) updates the iframe manifest URL

**CI/CD:**
- `firmware-release.yml` — builds `wifi-ble-co2` and `ethernet-ble-co2` variants, creates GitHub release with OTA binaries, deploys to GitHub Pages
- `pages.yml` — updated to include firmware assets alongside firmware-builder tool
- All GitHub Actions updated to v5 (Node.js 24 compatible)
- GitHub Pages enabled on the repo (source: GitHub Actions, no branch restrictions)

**Tests:**
- 241 backend tests passing (92% coverage)
- 1606 frontend tests passing (97% coverage)

### Key decisions made
- **2 firmware variants only:** wifi-ble-co2 and ethernet-ble-co2 (everything included)
- **ESP Web Tools in iframe:** avoids `md-focus-ring` / Material Design custom element conflicts with HA
- **Download firmware before deleting device:** prevents orphaning if download fails
- **`FIRMWARE_VERSION` in const.py:** embedded version, bumped at release time (firmware versioning independent of integration — to be formalized)
- **GitHub Pages for firmware hosting:** CORS-enabled, unlike GitHub Releases
- **Manifest URL from local static path** for USB (iframe same-origin), GitHub Releases for OTA (server-side, no CORS needed)
- **CO2 scripts use `!extend`** in co2-base.yaml to override placeholders in base YAML

### Bug fixes during testing
- Tab bar rendered horizontally (left side) instead of at top — fixed with `.tab-layout` column wrapper
- OTA flow deleted device before downloading firmware — reordered
- Stale device list after OTA — refresh on tab switch and flash-complete
- ESP Web Tools CDN clash with HA custom elements — moved to iframe
- CO2 firmware build failures — duplicate script IDs fixed with `!extend`
- GitHub Pages deployment blocked by branch policy — removed restriction
- Various review feedback: require_admin, shared session, bounds checking, localization

## Current state / What's broken

### Boot loop after USB flash
The device was successfully flashed via USB (ESP Web Tools reported success), but after flashing it enters a boot loop:
```
invalid header: 0x6e697472
ets Jul 29 2019 12:21:46
rst:0x10 (RTCWDT_RTC_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)
```

**`0x6e697472`** = ASCII "nitr" — this is the ESP32 ROM bootloader failing to find a valid app header in flash. The firmware binary was written but the partition table or bootloader may be wrong.

**Root cause hypothesis:** The manifest only specifies a single `parts` entry with `offset: 0`:
```json
{"path": "everything-presence-pro-wifi-ble-co2.bin", "offset": 0}
```
But ESP-IDF firmware needs:
1. Bootloader at offset 0x1000
2. Partition table at offset 0x8000
3. App firmware at offset 0x10000

The `firmware.bin` from ESPHome is the **app binary only** (goes at 0x10000). Writing it at offset 0 overwrites the bootloader and partition table, which causes the boot loop.

**Fix needed:** The manifest should include all three parts with correct offsets, OR we need to use the combined/factory binary that includes everything. ESPHome generates:
- `firmware.bin` — app only
- `firmware.ota.bin` — OTA update binary (app only, for OTA protocol)
- `firmware-factory.bin` — full flash image (bootloader + partition table + app) — **this is what ESP Web Tools needs**

The release workflow at `firmware-release.yml` line 36 copies `firmware.bin` but should copy `firmware-factory.bin` for the USB flash manifest, and keep `firmware.ota.bin` for OTA.

### Post-flash UX
After ESP Web Tools finishes, the user sees "Install Firmware" and "Logs and Console" buttons. There's no automatic transition back to the flasher UI or WiFi provisioning. This needs thought:
- Should we detect flash completion via `postMessage` from the iframe and auto-navigate?
- WiFi provisioning needs to happen after flash — currently not wired up

## What remains

### Must fix
1. **Fix USB flash manifest** — use `firmware-factory.bin` at correct offsets (bootloader 0x1000, partition table 0x8000, app 0x10000), or use the combined factory image at offset 0
2. **Test OTA flash end-to-end** — the OTA path uses `firmware.ota.bin` via the ESPHome OTA protocol which should be correct, but hasn't been tested with a real device yet
3. **Test WiFi provisioning** — the Improv Serial UI exists but isn't wired to actual serial communication yet
4. **Post-USB-flash flow** — detect completion, transition to WiFi provisioning or auto-add

### Should do before merge
5. **Sub-project 1: Firmware variant simplification** — collapse 8 YAML variants to 2, update standalone flasher HTML (specs+plans ready)
6. **Sub-project 2: Sidebar panel toggle** — wire up the existing option to dynamically register/unregister panel (specs+plans ready)
7. **Firmware versioning** — formalize separate firmware version tag scheme (e.g. `fw-v*`)

### Nice to have
8. **Dashboard strategy** — needs manual testing (create dashboard via HA Settings)
9. **Lovelace cards** — need manual testing
10. **Post-flash auto-add to ESPHome** — currently only in OTA path, USB path needs wiring

## File inventory

### Backend
- `custom_components/eppgrid/const.py` — FIRMWARE_VERSION, FIRMWARE_VARIANTS, EPP_MANUFACTURER/MODEL, OTA_PORT
- `custom_components/eppgrid/device_manager.py` — list_flashable_devices()
- `custom_components/eppgrid/ota.py` — fetch_firmware_binary(), push_ota(), OTAError
- `custom_components/eppgrid/websocket_api.py` — 4 new WS commands
- `custom_components/eppgrid/frontend/usb-flasher.html` — iframe page for ESP Web Tools
- `tests/test_device_manager_flasher.py` — 4 tests
- `tests/test_ota.py` — 14 tests
- `tests/test_websocket_flasher.py` — 12 tests

### Frontend
- `frontend/src/types.ts` — FlashableDevice, OtaProgress, OtaStep
- `frontend/src/controllers/flasher-controller.ts` — FlasherController
- `frontend/src/components/epp-flasher-view.ts` — Flash Firmware view
- `frontend/src/components/epp-flasher-card.ts` — Lovelace card
- `frontend/src/components/epp-device-card.ts` — Lovelace card
- `frontend/src/lib/improv-serial.ts` — Improv Serial protocol
- `frontend/src/strategy.ts` — Dashboard strategy
- `frontend/src/eppgrid-panel.ts` — tab bar routing
- `frontend/src/styles.ts` — flasher styles
- `frontend/src/translations/en.json` — flasher translation keys
- `frontend/src/index.ts` — card/strategy registration

### CI/CD
- `.github/workflows/firmware-release.yml` — 2-variant build + release + Pages deploy
- `.github/workflows/pages.yml` — combined site deploy
- `firmware/common/co2-base.yaml` — !extend fix for LED scripts

### Specs & Plans (not yet implemented)
- `docs/superpowers/specs/2026-04-02-firmware-variant-simplification-design.md`
- `docs/superpowers/plans/2026-04-02-firmware-variant-simplification-plan.md`
- `docs/superpowers/specs/2026-04-02-sidebar-panel-toggle-design.md`
- `docs/superpowers/plans/2026-04-02-sidebar-panel-toggle.md`
- `docs/superpowers/specs/2026-04-02-flasher-integration-design.md`
- `docs/superpowers/plans/2026-04-02-flasher-integration-plan.md`

## Tags & Releases
- `v0.1.0-alpha.1` — first alpha (all 8 variants)
- `v0.1.0-alpha.2` — current alpha (wifi-ble-co2 + ethernet-ble-co2), Pages deployment working
- Release assets at: https://github.com/clintongormley/everything-presence-pro-grid/releases/tag/v0.1.0-alpha.2
- Pages at: https://clintongormley.github.io/everything-presence-pro-grid/
