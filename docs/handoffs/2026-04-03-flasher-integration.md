# Flasher Integration into HA Frontend

**Date:** 2026-04-03
**Branch:** `flasher`
**PR:** #44
**Status:** USB flashing works end-to-end (flash + WiFi provisioning via ESP Web Tools). Next: replace iframe approach with direct control.

## Current state

### What works
- **USB flashing via ESP Web Tools in iframe** — boots correctly with bootloader (0x1000) + partition table (0x8000) + app (0x10000) at correct offsets
- **WiFi provisioning** — ESP Web Tools detects Improv Serial after flash, offers WiFi config, device connects to network
- **Firmware builds** — CI builds `wifi-ble-co2` and `ethernet-ble-co2` variants, deploys to GitHub Pages and GitHub Releases
- **Tab bar UI** — Device Configuration / Flash Firmware tabs work
- **Flashable device discovery** — backend discovers EPP devices (original + EPP Grid firmware)
- **OTA flash backend** — WS commands implemented (untested with real device)
- **All tests pass** — 241 backend, 1606 frontend

### What needs work

#### Priority 1: Replace iframe with direct serial control

**Problem:** ESP Web Tools runs in an iframe, which means we lose control of the serial port after flashing. We can't read the device IP, can't run our own Improv Serial flow, and the user sees ESP Web Tools' UI instead of ours.

**Decision:** Drop the iframe. Use ESP Web Tools' `<esp-web-install-button>` directly in our component's shadow DOM, then take over the serial port for WiFi provisioning.

**Approach:**
1. The custom element conflict (`md-focus-ring already defined`) happened because ESP Web Tools' script registered Material Design components on the global `customElements`. HA uses a scoped custom element registry polyfill. If we load ESP Web Tools dynamically inside our Lit component (which has its own shadow DOM), the scoped registry should isolate the registrations. Try this first — it may just work.

2. If shadow DOM scoping doesn't solve the conflict, use `esptool.js` directly (the low-level library ESP Web Tools wraps) for the flash step. This avoids loading ESP Web Tools' UI components entirely.

3. After flashing, we own the serial port. Run our Improv Serial flow:
   - WiFi scan via `CMD_WIFI_SCAN` (already implemented in `improv-serial.ts`)
   - WiFi provisioning via `CMD_WIFI_SETTINGS` (already implemented)
   - Read IP from Improv response or ESPHome log output
   - Call `eppgrid/add_esphome_device` with the IP
   - Switch to Device Configuration tab

**Reference:** The standalone firmware builder (`tools/firmware-builder/index.html`) already implements the complete post-flash serial flow — WiFi scan, provisioning, IP retrieval. The Improv Serial implementation is at lines 771-921. Copy the pattern.

**Files to change:**
- `frontend/src/components/epp-flasher-view.ts` — replace iframe with direct ESP Web Tools / esptool.js integration
- `custom_components/eppgrid/frontend/usb-flasher.html` — can be removed once iframe is gone
- `frontend/src/lib/improv-serial.ts` — already has packet building/parsing, may need serial port I/O wrappers

#### Priority 2: Test OTA flash end-to-end
The OTA path (backend `flash_ota` WS command) hasn't been tested with a real device. The flow: download firmware → delete old ESPHome entry → push via OTA protocol (port 3232) → wait for reboot → auto-add.

#### Priority 3: Sub-projects 1 and 2
- **Firmware variant simplification** — collapse 8 variant YAMLs to 2 (specs+plans ready)
- **Sidebar panel toggle** — wire up dynamic register/unregister (specs+plans ready)

## Key files

### Backend
- `custom_components/eppgrid/const.py` — `FIRMWARE_VERSION = "v0.1.0-alpha.2"`, `FIRMWARE_VARIANTS` mapping
- `custom_components/eppgrid/ota.py` — `fetch_firmware_binary()`, `push_ota()`
- `custom_components/eppgrid/websocket_api.py` — 4 flasher WS commands (list, flash_ota, delete, add)
- `custom_components/eppgrid/device_manager.py` — `list_flashable_devices()`
- `custom_components/eppgrid/frontend/usb-flasher.html` — iframe page (to be removed)

### Frontend
- `frontend/src/components/epp-flasher-view.ts` — Flash Firmware tab (main file to rework)
- `frontend/src/controllers/flasher-controller.ts` — device discovery, OTA progress
- `frontend/src/lib/improv-serial.ts` — Improv Serial protocol (ready to use)
- `frontend/src/eppgrid-panel.ts` — tab bar routing
- `frontend/src/translations/en.json` — flasher translation keys

### Reference
- `tools/firmware-builder/index.html` — standalone flasher with full serial flow (lines 771-921 for Improv)
- `docs/handoffs/2026-04-03-usb-flasher-fixes.md` — previous session's CORS/styling fixes

### CI/CD
- `.github/workflows/firmware-release.yml` — builds wifi-ble-co2 + ethernet-ble-co2, creates release, deploys Pages
- Firmware served from GitHub Pages: `https://clintongormley.github.io/everything-presence-pro-grid/firmware/`

## Decisions made this session
- **2 firmware variants:** wifi-ble-co2 and ethernet-ble-co2 (everything included)
- **Both `improv_serial` and `esp32_improv`** in BLE WiFi variants (USB + BLE provisioning)
- **`FIRMWARE_VERSION` in const.py** — embedded, bumped at release time
- **Firmware versioning independent of integration** — to be formalized (e.g. `fw-v*` tags)
- **Download firmware before deleting device** in OTA flow
- **Flash with 3 parts** at ESP-IDF offsets (bootloader 0x1000, partitions 0x8000, app 0x10000)
- **Shadow DOM scoping** preferred over iframe for ESP Web Tools integration
- **GitHub Pages** for firmware hosting (CORS-enabled)

## Tags & Releases
- `v0.1.0-alpha.2` — current (wifi-ble-co2 + ethernet-ble-co2 with correct flash offsets and improv_serial)
- Release: https://github.com/clintongormley/everything-presence-pro-grid/releases/tag/v0.1.0-alpha.2
- Pages: https://clintongormley.github.io/everything-presence-pro-grid/
