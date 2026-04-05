# Flasher: MAC Extract, Pre-Flash Delete, Serial Port Fix — Handoff

**Date:** 2026-04-05
**Branch:** `temp` (worktree at `/Users/clintongormley/workspace/worktrees/epp-flasher`)
**Base:** `3dad367` (Merge PR #44 — WiFi USB flashing fully working)
**Current HEAD:** `31e92d2` (24 commits)
**Tests:** 1767 frontend, 250 backend — all passing
**Status:** USB flash + WiFi provision flow fully working end-to-end. Several items still need testing/cleanup.

## What was done

### Features implemented (all with TDD)

1. **UX improvements** — variant selector styling (`appearance="accent"/"outlined"`), offline badge on device list, ethernet complete message with link to `/config/devices/dashboard`, connection UX (connecting screen when reconnecting, offline vs connection-failed banner split, protocolOk treats "unavailable" as compatible), `wifi_connecting` step for immediate feedback

2. **MAC extraction** — `onMac` callback on `flashFirmware` detects MAC from esptool terminal output during `loader.main()`. The terminal's `writeLine` watches for `MAC: xx:xx:xx:xx:xx:xx` pattern and calls back with uppercased MAC.

3. **beforeFlash callback** — async hook called after `loader.main()` (MAC available) but before `writeFlash()`. If it throws, flash aborts but `transport.disconnect()` still runs (finally block). Receives detected MAC or undefined.

4. **Pre-flash ESPHome delete (USB)** — `_handleUsbFlash` passes `beforeFlash` that checks MAC against `ctrl.flashableDevices`, shows `window.confirm()` for `firmware_type === "original"` with `esphome_config_entry_id`, deletes via `ctrl.deleteEsphomeDevice()`. Cancel throws "Flash cancelled".

5. **Pre-flash delete + post-flash add (OTA)** — same confirm+delete in `@flash-ota` handler. After successful OTA (`ctrl.otaProgress?.status === "success"`), calls `addEsphomeDevice(host)` if `esphome_config_entry_id` is null. Sets `device.esphome_config_entry_id = null` after delete to track state.

6. **Firmware proxy** — `custom_components/eppgrid/firmware_proxy.py`: HTTP view at `/api/eppgrid/firmware/{filename}` proxies manifest and binary downloads from GitHub Releases. URL is pinned by `FIRMWARE_VERSION` in `const.py`. Frontend gets the URL via `firmware_base_url` field in the `list_flashable_devices` WS response. No more CORS issues, no dependency on GitHub Pages.

7. **Ethernet complete with variant** — `ctrl.updateUsbState({ step: "complete", variant })` passes variant so the view can show ethernet-specific messaging.

### Serial port fixes (critical discoveries)

8. **CH340 zombie port fix** — `transport.disconnect()` calls `port.close()` internally (see esptool.js source: `async disconnect(){...await this.device.close()...}`). On CH340 USB-serial chips (VendorID 0x1a86, ProductID 0x55d3), closing and reopening the port leaves it in a zombie state: `port.open()` succeeds, `readable`/`writable` are truthy, but zero bytes flow in either direction. Fixed by monkey-patching `port.close` to a no-op before creating Transport, then restoring `originalClose` after disconnect. Transport still releases its reader lock via `reader.cancel()` + `waitForUnlock()`, just doesn't close the port.

   **Why monkey-patch?** `transport.disconnect()` is called in the `finally` block of `flashFirmware` — it ALWAYS runs. We can't prevent it from being called. And esptool.js's Transport API doesn't offer a "release locks but don't close port" method. The monkey-patch is a workaround for what is arguably a bug in the CH340 driver or Chrome's WebSerial implementation — the port should work after close+reopen but doesn't. This should be investigated further: either find a proper fix in the Transport API, report the Chrome/CH340 bug, or find a different way to release the reader lock without disconnect.

9. **DTR=false in all RTS resets** — esptool's `hard_reset` leaves DTR=true, RTS=false. Some CH340 chips need DTR=false to forward received data. All `port.setSignals` calls now explicitly include `dataTerminalReady: false`.

10. **Handshake retry** — 5 attempts with 2s delay between, 3s timeout per attempt. Device needs time to boot after flash + RTS reset before Improv is ready.

11. **No RTS reset for WiFi provision** — The previous code sent WiFi credentials via Improv, then did an RTS reset (rebooting the device) and waited for it to reconnect. This killed the WiFi connection attempt before creds were saved to NVS. The fix: Improv handles WiFi connection in-session. After sending WIFI_SETTINGS, the device enters PROVISIONING (0x03), connects to WiFi, sends PROVISIONED (0x04), then RPC_RESULT with the IP URL. `detectIpAddress` reads from the same reader — no reboot, no data loss.

### Firmware deployed
- Compiled locally from this worktree with clean build (`rm -rf .esphome`)
- Uploaded to GitHub Release `v0.1.0-alpha.2` (replaced wifi-ble-co2 assets)
- **Important:** Always clean build firmware — stale ESPHome build cache causes ESP-IDF `s_prepare_reserved_regions` assertion crash that boot-loops the device

## Serial port lifecycle (final working state)

```
flashFirmware(port, variant, onProgress, options):
  port.close = async () => {}     // monkey-patch: block Transport from closing
  transport = new Transport(port)  // Transport opens port, starts readLoop
  terminal watches for MAC → options.onMac(mac)
  loader.main("default_reset")    // detect chip, upload stub — MAC printed here
  options.beforeFlash(mac)         // pre-flash delete hook (may throw to abort)
  fetch manifest + binaries via /api/eppgrid/firmware/ proxy
  writeFlash(...)                  // flash firmware
  loader.after("hard_reset")      // RTS toggle, device reboots
  transport.disconnect()           // releases reader lock, calls our no-op close
  port.close = originalClose       // restore real close method
  // Port is still OPEN after return

runWifiScan(port):
  port is OPEN (Transport didn't close it) — OR — port is closed (standalone scan)
  if (!port.readable) → port.open()
  setSignals(DTR=false, RTS=true → wait 200ms → RTS=false)  // reset device
  drain stale serial data (200ms timeout)
  handshake with retry (5 attempts, 2s delay, 3s timeout each)
    send GET_CURRENT_STATE → read Improv response
  send GET_INFO, wait 500ms
  send SCAN → collect RPC_RESULT networks (3 retry attempts)
  return { writer, reader, networks }  // locks held

_handleWifiProvision(ssid, password):
  release scan's writer/reader
  get fresh writer + reader from port
  runWifiProvision(writer, ssid, password)  // sends WIFI_SETTINGS Improv packet
  // NO RTS reset — Improv connects to WiFi in-session
  detectIpAddress(reader, 35000)  // reads PROVISIONING → PROVISIONED → RPC_RESULT
  reader.releaseLock(), writer.releaseLock()
  port.close(), serialPort = null
  if (ip) → addEsphomeDevice(ip)
```

## What's been tested and verified working

- **USB flash + WiFi scan** — flash completes, networks listed ✓
- **WiFi provision with good creds** — IP detected (192.168.20.214) ✓
- **WiFi provision with bad creds** — error "WiFi connection failed" shown ✓
- **Bad creds → retry → good creds** — full retry flow works ✓
- **Configure WiFi standalone** (no flash) — scan + provision works ✓
- **Retry after WiFi error** — goes back to WiFi config, not reflash ✓
- **Firmware proxy** — manifest + binaries download through HA proxy ✓
- **MAC detection** — MAC logged during flash ✓
- **Device already on WiFi** — scan still works (cached results) ✓

## Not yet tested

1. **Ethernet flash** — does the ethernet complete message show with link to devices dashboard?
2. **Pre-flash ESPHome delete (USB)** — need a device with `firmware_type === "original"` and `esphome_config_entry_id` to test the confirm dialog + delete flow
3. **Cancel confirm dialog** — does it abort the flash correctly?
4. **OTA flash** — the entire OTA path (delete + flash + add) hasn't been tested
5. **Add to ESPHome after WiFi provision** — `addEsphomeDevice(ip)` runs in the `_handleWifiProvision` code, but need to verify the device actually appears in HA
6. **Chrome crash on retry** — happened earlier when the port was in zombie state; may be fixed now but needs verification
7. **Port cleanup after errors** — if flash fails mid-way, is the port properly cleaned up?
8. **Port cleanup after successful provision** — does `port.close()` work at the end?

## Still TODO

9. **Remove debug logging** — `sendImprovPacket` logs TX hex, `readImprovResponse` logs RX packets, `_handleWifiProvision` logs flow steps. Strip once confident.
10. **NVS / eraseAll** — flash uses `eraseAll: false` so old WiFi creds survive. Now that Improv provision works in-session (no reboot needed), this is less of an issue — the user always enters new creds. But consider `eraseAll: true` for truly fresh devices.
11. **Monkey-patch investigation** — the `port.close` monkey-patch is a workaround. The root cause is that CH340 USB-serial chips don't recover from close+reopen via WebSerial. Options to investigate:
    - Report Chrome bug for CH340 close/reopen
    - Check if newer esptool.js versions offer a "release reader without closing port" API
    - Check if the issue is specific to macOS + Chrome + CH340 or more widespread
12. **Plan doc cleanup** — `docs/superpowers/plans/2026-04-05-flasher-mac-extract-and-delete.md` is stale
13. **Biome lint on all changes** — some files may have been modified after the last biome pass

## Files changed (from 3dad367)

| File | Changes |
|------|---------|
| `frontend/src/lib/usb-flash-service.ts` | MAC extraction (terminal + onMac), beforeFlash callback, baseUrl from proxy, monkey-patch port.close, DTR=false in setSignals, handshake retry (5×2s), console.log in terminal |
| `frontend/src/lib/improv-serial.ts` | Debug logging in sendImprovPacket (TX hex) and readImprovResponse (RX packets) |
| `frontend/src/eppgrid-panel.ts` | beforeFlash wiring in _handleUsbFlash, OTA delete+add in @flash-ota, wifi_connecting step, no-RTS provision, retry→wifi when port open, empty networks OK, DTR in provision reset, connection UX (reconnecting screen, offline banner, protocolOk unavailable) |
| `frontend/src/components/epp-flasher-view.ts` | Variant selector appearance, offline badge, ethernet complete, wifi complete cleanup, OTA progress refactor, wifi_connecting step |
| `frontend/src/controllers/flasher-controller.ts` | firmwareBaseUrl field stored from loadDevices response |
| `frontend/src/types.ts` | variant field on UsbFlashState, wifi_connecting step |
| `frontend/src/translations/en.json` | Ethernet complete, wifi_connecting, confirm_delete_message, connection.connecting/offline, shortened connection.failed |
| `frontend/src/styles.ts` | Offline badge, usb-complete layout (max-width, margins) |
| `custom_components/eppgrid/firmware_proxy.py` | NEW: FirmwareProxyView HTTP endpoint |
| `custom_components/eppgrid/websocket_api.py` | firmware_base_url in list_flashable_devices response |
| `custom_components/eppgrid/__init__.py` | Register FirmwareProxyView |
| `tests/test_firmware_proxy.py` | NEW: 9 tests for proxy view |
| `tests/test_websocket_flasher.py` | Updated for firmware_base_url, hass.http mock |
| `tests/test_init.py` | Added hass.http mock for setup_entry tests |
| `tests/test_websocket_api.py` | Added hass.http mock |
| `docs/architecture.md` | USB flash flow + firmware release deployment docs |
| `frontend/src/__tests__/lib/usb-flash-service.test.ts` | Tests for onMac, beforeFlash, baseUrl, handshake retry, DTR |
| `frontend/src/__tests__/panel-usb-flash.test.ts` | Tests for beforeFlash wiring, pre-flash delete, OTA delete+add, retry→wifi, no-RTS provision |
| `frontend/src/__tests__/components/epp-flasher-view.test.ts` | Tests for variant selector, offline badge, ethernet complete, wifi complete |
| `frontend/src/__tests__/panel-protocol-banner.test.ts` | Tests for reconnecting screen, protocolOk unavailable |
| `frontend/src/__tests__/panel-config.test.ts` | Tests for offline banner |
| `frontend/src/__tests__/controllers/flasher-controller.test.ts` | Tests for firmwareBaseUrl |
