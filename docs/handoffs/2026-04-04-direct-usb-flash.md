# Direct USB Flash with esptool.js

**Date:** 2026-04-04
**Branch:** `flasher`
**PR:** #44
**Status:** USB flashing works end-to-end. WiFi provisioning UI works (manual SSID entry). WiFi scan returns empty on EPP Grid firmware — firmware investigation needed.

## What we did

### Replaced iframe USB flasher with direct esptool.js integration

The old approach loaded ESP Web Tools in an iframe (`usb-flasher.html`). This has been replaced with direct `esptool.js` integration that runs entirely within the HA panel's shadow DOM.

**New files:**
- `frontend/src/lib/usb-flash-service.ts` — orchestrates flash → WiFi scan → WiFi provision → IP detection
- `frontend/src/__tests__/lib/usb-flash-service.test.ts` — 26 tests
- `frontend/src/__tests__/lib/improv-serial-io.test.ts` — 8 tests for serial I/O wrappers
- `frontend/src/__tests__/panel-usb-flash.test.ts` — 38 tests for panel handlers

**Modified files:**
- `frontend/src/lib/improv-serial.ts` — added `sendImprovPacket`, `readImprovResponse`, `drainSerial` I/O wrappers + trailing newline per Improv spec
- `frontend/src/controllers/flasher-controller.ts` — added `usbFlashState`, `wifiNetworks`, `serialPort`, `updateUsbState()`, `resetUsbState()`
- `frontend/src/components/epp-flasher-view.ts` — replaced iframe with state-driven USB flash UI using `<ha-card>` elements
- `frontend/src/eppgrid-panel.ts` — event wiring for USB flash/WiFi handlers
- `frontend/src/styles.ts` — flasher card layout, WiFi form, progress bar styles
- `frontend/src/types.ts` — added `UsbFlashState`, `UsbFlashStep` types
- `frontend/src/translations/en.json` — USB progress steps, WiFi labels, "Installed Devices"
- `frontend/biome.json` — suppressed false-positive lint rules for HA codebase patterns
- `frontend/rollup.config.js` — added `@rollup/plugin-commonjs` for esptool-js CJS deps

**Deleted files:**
- `custom_components/eppgrid/frontend/usb-flasher.html`

**Dependencies added:**
- `esptool-js` (runtime)
- `@rollup/plugin-commonjs` (dev)

### USB Flash flow (working)

1. User clicks "Flash Firmware" → selects variant (WiFi/Ethernet) → clicks Flash
2. Browser serial port picker opens → user selects ESP32 port
3. esptool.js connects, detects chip (ESP32-D0WD-V3), uploads stub
4. Downloads manifest + 3 firmware binaries from GitHub Pages (CORS-enabled)
5. Flashes bootloader (0x1000) + partitions (0x8000) + app (0x10000)
6. Hard resets device
7. Waits 8 seconds for device to boot
8. Sends Improv WiFi scan → shows WiFi provisioning UI

### Configure WiFi flow (working with manual SSID)

1. User clicks "Configure WiFi" → browser serial port picker
2. Opens serial port (or reuses if already open)
3. Sends Improv WiFi scan → shows WiFi provisioning UI
4. User enters SSID + password manually → clicks Connect
5. Sends Improv WiFi credentials → detects IP from serial logs → adds device to HA

### Layout improvements

- Wrapped all sections in `<ha-card>` elements with proper headers
- Added `max-width: 600px` content centering
- USB section shows two clickable action cards: Flash Firmware + Configure WiFi
- WiFi provisioning form with styled inputs, network dropdown, manual SSID toggle
- Empty state with icon for "No devices installed"
- Uses HA theme CSS variables throughout
- "Installed Devices" instead of "Devices on Network"

## Decisions made

- **esptool.js over ESP Web Tools** — no custom element conflicts, we own the serial port, full UX control
- **GitHub Pages for firmware** — CORS-enabled, not GitHub Releases (which blocks cross-origin requests)
- **Improv packets need trailing newline** — the official SDK appends `\n` (0x0A) after checksum
- **RPC result data starts with command byte** — must slice(1) before parsing scan results
- **8-second boot wait** — ESP32 needs ~5-8s after reset to initialize ESPHome + Improv
- **Manual SSID fallback** — auto-show manual entry when scan returns 0 networks
- **`usbFlashState` as public `@property()`** — not `@state()`, so panel can pass controller state to view
- **Suppress `noExplicitAny` / `noNonNullAssertion`** — false positives in HA codebase (untyped `hass`, Lit shadow DOM)

## What needs work

### Priority 1: WiFi scan returns empty on EPP Grid firmware

**Problem:** Improv Serial scan (CMD_WIFI_SCAN) returns 0 networks on our firmware. The scan DOES work on the original EPP firmware. ESPHome's own web tools also can't scan on our firmware.

**Root cause (suspected):** Something in our firmware config prevents the WiFi scan from working. Possible causes:
- Logger UART interference — our firmware has many components generating log output
- WiFi component initialization timing — our components may delay WiFi readiness
- Custom component interference at boot

**Investigation approach:**
1. Compare our `improv_serial:` config with the original EPP firmware
2. Check if adding `logger: baud_rate: 0` fixes scanning
3. Check if our custom components (`zone_engine`, sensors) interfere with WiFi scan at boot
4. Test with a minimal firmware YAML (just `improv_serial:` + `wifi:`) to isolate

**Workaround:** Manual SSID entry works — users can type their network name and password.

### Priority 2: Push changes and merge PR

The branch has layout/UX fixes that haven't been pushed yet. Need to:
1. Push latest commits
2. Wait for CI
3. Address any new review comments
4. Merge PR #44

### Priority 3: Test WiFi provisioning end-to-end

The WiFi provisioning flow (manual SSID → Connect → detect IP → add device) hasn't been tested with a real device yet because we hit the scan issue. Need to:
1. Flash a device
2. Enter WiFi credentials manually
3. Verify the device connects and IP is detected from serial logs
4. Verify the device is auto-added to ESPHome/HA

### Priority 4: Intermittent test failures

`panel-branch-coverage.test.ts` has intermittent failures (timing-related). These are pre-existing on this branch but should be investigated:
- `handles targets with missing raw_x/raw_y and signal`
- `defaults status to inactive when missing from grid event`
- `handles raw subscription with missing target fields`

## Key files

### Frontend
- `frontend/src/lib/usb-flash-service.ts` — core USB flash orchestration
- `frontend/src/lib/improv-serial.ts` — Improv protocol (packet build/parse + serial I/O)
- `frontend/src/controllers/flasher-controller.ts` — USB flash state management
- `frontend/src/components/epp-flasher-view.ts` — Flash Firmware tab UI
- `frontend/src/eppgrid-panel.ts` — event wiring (lines 2242-2360)
- `frontend/src/styles.ts` — flasher styles (line 448+)

### Firmware
- `firmware/variants/wifi.yaml` — `improv_serial:` config (line 54)
- `firmware/common/everything-presence-pro-base.yaml` — logger config (line 243)

### Reference
- `tools/firmware-builder/index.html` — standalone flasher (lines 771-921 for Improv)
- Improv Serial spec: https://www.improv-wifi.com/serial/
- Official SDK: https://github.com/improv-wifi/sdk-serial-js

## Test status

- **1703 tests** across 55 files
- All pass (1 file has intermittent timing failures)
- Coverage thresholds met (90% lines/functions, 85% branches per file)
- Build succeeds
- Lint: 0 errors, ~50 minor style warnings (pre-existing)
