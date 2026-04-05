# Flash Firmware Tab Rework

**Date:** 2026-04-05
**Status:** Approved

## Problem

The Flash Firmware tab currently offers OTA flashing for installed devices using a raw ESPHome OTA protocol (`push_ota`). This doesn't work because:

1. **Original firmware devices**: Newer ESPHome uses NOISE-encrypted OTA. Our plaintext protocol is rejected.
2. **EPP Grid firmware devices**: Updates should use ESPHome's built-in `update.install` service, which handles protocol details transparently. The device's `http_request` update component already points to our GitHub releases manifest.

The raw OTA code path (frontend confirm+delete, backend `push_ota`) is unnecessary and broken.

## Design

### Flash Firmware Tab — Installed Devices List

Shows all devices (both `original` and `eppgrid` firmware types):

- **Original firmware**: Shown with "Original" badge. No action button — USB flash is the only conversion path.
- **EPP Grid firmware, update available**: Shown with "EPP Grid" badge + "Update" button. Clicking calls `update_firmware` WS command (which calls `update.install`).
- **EPP Grid firmware, up to date**: Shown with "EPP Grid" badge. No action button.

The rest of the tab (USB Flash, USB WiFi Config) is unchanged.

### Backend

**Remove:**
- `flash_ota` WS handler (`websocket_flash_ota`)
- `push_ota()` and `fetch_firmware_binary()` from `ota.py`
- `_wait_for_device_online()` helper
- `OTA_PORT` constant

**Keep:**
- `update_firmware` WS handler (calls `update.install` via ESPHome update entity)
- `delete_esphome_device` / `add_esphome_device` (used by USB flash `beforeFlash`)

**Note:** `ota.py` can be deleted entirely — nothing will import from it after the removal.

**Add:**
- `update_available` boolean field in `list_flashable_devices` response, derived from the device's ESPHome update entity state.

### Frontend

**Remove:**
- `OtaProgress`, `OtaStep` types
- `_renderOtaProgress()` method and `.ota-status` styles
- `flash-ota` event dispatch and handler in panel
- `otaProgress`, `flashingMac` properties on flasher view and controller
- Confirm dialog for OTA flashing (variant selector + Flash button per device)
- `startOtaFlash()` from `FlasherController`

**Change:**
- Device list row: original devices get no action button. EPP Grid devices with `update_available === true` get an "Update" button that calls `update_firmware` WS command. EPP Grid devices without updates get no button.
- Flash button behavior: only the USB flash path remains for new device setup.

**Keep:**
- USB flash flow (connect, variant select, flash, WiFi provision)
- USB WiFi config flow
- Device list rendering (names, hosts, firmware badges, offline badges)

### Device Configuration Tab

Unchanged. The existing "Update Firmware" button (protocol mismatch banner) continues to work via `update_firmware` WS command.
