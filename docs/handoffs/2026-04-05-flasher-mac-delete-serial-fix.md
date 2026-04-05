# Flasher: MAC Extract, Pre-Flash Delete, Serial Port Fix — Handoff

**Date:** 2026-04-05
**Branch:** `temp` (worktree at `/Users/clintongormley/workspace/worktrees/epp-flasher`)
**Base:** `3dad367` (Merge PR #44 — WiFi USB flashing fully working)
**Current HEAD:** `b5f0346`
**Status:** Flash + WiFi scan works. WiFi provisioning sends command but device doesn't apply credentials. Need to debug why Improv WIFI_SETTINGS isn't being processed.

## What was done

### Features implemented (all with TDD, all tests passing: 1767 frontend, 250 backend)

1. **UX improvements** — variant selector styling, offline badge, ethernet complete message, connection UX (connecting screen, offline banner, protocolOk unavailable)

2. **MAC extraction** — `onMac` callback on `flashFirmware` detects MAC from esptool terminal output during `loader.main()`

3. **beforeFlash callback** — async hook after chip detection, before flash write. If it throws, flash aborts but `transport.disconnect()` still runs (finally block)

4. **Pre-flash ESPHome delete (USB)** — `_handleUsbFlash` passes `beforeFlash` that checks MAC against `flashableDevices`, shows `window.confirm()` for original firmware, deletes ESPHome config entry

5. **Pre-flash delete + post-flash add (OTA)** — same confirm+delete in `@flash-ota` handler, plus `addEsphomeDevice(host)` after successful OTA when `esphome_config_entry_id` is null

6. **Firmware proxy** — HTTP view at `/api/eppgrid/firmware/{filename}` proxies from GitHub Releases (pinned by `FIRMWARE_VERSION` in `const.py`). No more CORS issues. Frontend gets URL from `list_flashable_devices` response.

7. **CH340 serial port fix** — `transport.disconnect()` calling `port.close()` makes CH340 USB-serial chips unusable on reopen. Fixed by monkey-patching `port.close` before creating Transport so disconnect releases reader lock without closing port.

8. **DTR=false in all RTS resets** — Transport leaves DTR in undefined state. All `setSignals` calls now explicitly set `dataTerminalReady: false`.

9. **Handshake retry** — 5 attempts with 2s delay for Improv handshake after flash (device needs time to boot).

10. **WiFi flow improvements** — `wifi_connecting` step for immediate feedback, retry goes to WiFi config (not reflash) when port is open, empty WiFi scan proceeds to manual SSID entry.

11. **Reader before RTS reset** — get IP detection reader BEFORE the provision RTS reset so we capture the PROVISIONING state packet (was being lost during the 5s wait).

### Firmware deployed
- Compiled locally from this worktree with clean build (`rm -rf .esphome`)
- Uploaded to GitHub Release `v0.1.0-alpha.2` (replaced wifi-ble-co2 assets)
- **Important:** Always clean build firmware — stale cache causes ESP-IDF memory layout assertion crashes

## What's broken: WiFi provisioning

### Symptom
After selecting a WiFi network and entering password:
1. `runWifiProvision(writer, ssid, password)` succeeds (no error)
2. Device is RTS-reset (reboots)
3. Device boots with OLD WiFi settings (doesn't apply the new ones)
4. `detectIpAddress` times out

### Device logs after provision + reboot
```
[D][wifi:636]: Loaded settings: foo    ← still the old (bad) SSID
[D][wifi:1282]: Starting scan
```
No Improv-related log lines — the device never received/processed the WIFI_SETTINGS command.

### What we know
- `runWifiProvision` calls `sendImprovPacket(writer, buildWifiCommand(ssid, password))` — this returns without error
- The writer was obtained fresh: `const writer = port.writable.getWriter()` after releasing the scan's writer
- The Improv packet format matches the spec (verified in `buildWifiCommand`)
- **But the device shows no sign of receiving it** — no Improv log, WiFi settings unchanged

### Likely causes
1. **Writer not functional** — the writer "succeeds" but data doesn't reach the device. The scan's writer was released, but maybe the port's writable stream is in a bad state after the monkey-patch (we blocked `port.close` during flash)
2. **Timing** — the provision happens while the device is still in the middle of the scan response. The scan reader was released, but maybe there's buffered data that confuses the Improv state machine on the device side
3. **Improv serial not active** — after the scan completes, the device's Improv component might enter a different state where it doesn't accept WIFI_SETTINGS

### Debugging approach
- Add `console.log` to `sendImprovPacket` to log the raw bytes being written
- Check if the writer.write() actually completes
- Compare with the working flow at 3dad367 — was there anything different about the writer lifecycle?
- Check ESPHome improv_serial source to understand state machine after scan

## Serial port lifecycle (current understanding)

```
flashFirmware:
  port.close = async () => {}     // monkey-patch: block Transport from closing
  transport = new Transport(port)  // Transport opens port internally
  loader.main()                    // detect chip, upload stub
  beforeFlash(mac)                 // pre-flash delete hook
  writeFlash()                     // flash firmware
  loader.after("hard_reset")       // RTS toggle, device reboots
  transport.disconnect()           // releases reader lock, calls our no-op close
  port.close = originalClose       // restore real close

runWifiScan:
  port is still OPEN (Transport didn't close it)
  setSignals(DTR=false, RTS=true/false)  // reset device
  drain stale data
  handshake (5 retries)
  scan command → collect networks
  returns { writer, reader, networks }  // locks held

_handleWifiProvision:
  release scan's writer/reader
  get fresh writer + reader
  runWifiProvision(writer, ssid, password)   ← THIS ISN'T REACHING THE DEVICE
  get ipReader BEFORE RTS reset
  RTS reset (device reboots with new creds)
  detectIpAddress(ipReader, 35000)
```

## Files changed

| File | Changes |
|------|---------|
| `frontend/src/lib/usb-flash-service.ts` | MAC extraction, beforeFlash, baseUrl, monkey-patch port.close, DTR fix, handshake retry |
| `frontend/src/eppgrid-panel.ts` | beforeFlash wiring, OTA delete+add, retry→wifi, wifi_connecting, reader-before-reset |
| `frontend/src/components/epp-flasher-view.ts` | UX improvements, wifi_connecting step |
| `frontend/src/controllers/flasher-controller.ts` | firmwareBaseUrl field |
| `frontend/src/types.ts` | variant field, wifi_connecting step |
| `frontend/src/translations/en.json` | New translations |
| `frontend/src/styles.ts` | Offline badge, usb-complete layout |
| `custom_components/eppgrid/firmware_proxy.py` | NEW: HTTP firmware proxy view |
| `custom_components/eppgrid/websocket_api.py` | firmware_base_url in response |
| `custom_components/eppgrid/__init__.py` | Register firmware proxy view |
| `docs/architecture.md` | USB flash + firmware release docs |

## Next session priorities

1. **Fix WiFi provisioning** — debug why `sendImprovPacket` with WIFI_SETTINGS doesn't reach the device
2. **Test full flow end-to-end** — flash → WiFi → IP detection → add to ESPHome
3. **Handle NVS** — consider `eraseAll: true` for clean flash, or handle preserved WiFi creds gracefully
4. **Remove debug logging** — clean up console.log statements once flow is working
5. **Handoff cleanup** — the plan doc at `docs/superpowers/plans/2026-04-05-flasher-mac-extract-and-delete.md` is stale, update or remove
