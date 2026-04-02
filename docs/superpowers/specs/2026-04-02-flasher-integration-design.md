# Flasher Integration Design

## Goal

Integrate the standalone firmware flasher into the EPP Grid integration frontend so users can flash devices (OTA or USB) and configure WiFi without leaving Home Assistant. Provide a dashboard strategy and custom Lovelace cards so the UI is accessible via sidebar panel or user-created dashboards.

## Context

The standalone flasher (`tools/firmware-builder/index.html`) uses ESP Web Tools for USB serial flashing and Improv Serial for WiFi provisioning. It works but lives outside HA. Meanwhile, the integration already has OTA firmware update support (`eppgrid/update_firmware`) and device discovery for EPP Grid firmware devices.

This design adds: discovery of original-firmware devices, OTA flash with automatic device cleanup and re-addition, USB flashing with WiFi provisioning, and a two-tab UI accessible via sidebar panel, dashboard strategy, or standalone Lovelace cards.

**Depends on:**
- Sub-project 1: Firmware variant simplification (2 variants: wifi-full, ethernet-full)
- Sub-project 2: Sidebar panel toggle (dynamic panel registration)

## Architecture

### Frontend Components

| Component | Purpose |
|-----------|---------|
| `epp-flasher-view.ts` | Flash Firmware tab — device list, OTA trigger, USB flash wrapper, WiFi provisioning |
| `epp-flasher-card.ts` | Thin Lovelace card wrapper loading `epp-flasher-view` |
| `epp-device-card.ts` | Thin Lovelace card wrapper loading the existing panel content |
| `controllers/flasher-controller.ts` | Reactive controller: device discovery, OTA orchestration, serial state, WiFi provisioning state |
| `strategy.ts` | HA dashboard strategy generating a two-view dashboard |
| `eppgrid-panel.ts` | Extended with tab bar routing between Device Configuration and Flash Firmware |

### Backend Websocket Commands

**`eppgrid/list_flashable_devices`**

Scans the HA entity/device registry for ESPHome devices with project name `EverythingSmartTechnology.Everything Presence Pro`. Returns all EPP devices regardless of firmware type.

```json
[
  {
    "mac": "aa:bb:cc:dd:ee:ff",
    "name": "Presence Pro Kitchen",
    "host": "192.168.1.42",
    "available": true,
    "firmware_type": "original",
    "firmware_version": "1.8.0",
    "esphome_config_entry_id": "abc123"
  },
  {
    "mac": "11:22:33:44:55:66",
    "name": "Presence Pro Office",
    "host": "192.168.1.43",
    "available": true,
    "firmware_type": "eppgrid",
    "firmware_version": "1.0.0",
    "esphome_config_entry_id": "def456"
  }
]
```

- `firmware_type: "original"` — device has no `zone_engine_version` entity
- `firmware_type: "eppgrid"` — device has `zone_engine_version` entity (already managed by our integration)
- `firmware_version` — from the ESPHome project version in the HA device registry (exposed via device info)
- Network type (WiFi vs Ethernet) is not reliably detectable for original-firmware devices, so the variant selector always lets the user choose

**`eppgrid/flash_ota`**

Input: `{ mac, variant }`. Returns a websocket subscription streaming progress events:

```json
{ "step": "removing_old_device", "status": "in_progress" }
{ "step": "flashing", "status": "in_progress", "progress": 60 }
{ "step": "waiting_for_reboot", "status": "in_progress" }
{ "step": "adding_to_esphome", "status": "in_progress" }
{ "step": "complete", "status": "success" }
```

Orchestration sequence:
1. Delete old ESPHome config entry (removes device + entities)
2. Fetch the firmware manifest JSON from GitHub releases for the selected variant
3. Download the firmware binary from the manifest's URL
4. Push firmware to device via the ESPHome OTA protocol — TCP connection to port 3232 (ESP-IDF default), binary upload with handshake. This is the same protocol ESPHome Dashboard uses. Works for both original and EPP Grid firmware devices since all have `ota: platform: esphome` configured.
5. Wait for device to come back online (mDNS or TCP poll on port 6053)
6. Auto-add to ESPHome via `config_entries.flow.async_init("esphome", data={"host": ip})`
7. Wait for our integration to discover the device (`zone_engine_version` entity appears)

**`eppgrid/add_esphome_device`**

Input: `{ host }`. Triggers `hass.config_entries.flow.async_init("esphome", data={"host": host})`. Used by both OTA and USB paths after device is on the network.

**`eppgrid/delete_esphome_device`**

Input: `{ config_entry_id }`. Calls `hass.config_entries.async_remove(config_entry_id)`. Separated from `flash_ota` so the USB path can call it independently.

## Flash Firmware Tab UI

Two sections: network devices (primary) and USB (secondary).

### Network Devices Section

Lists all discovered EPP devices with: name, IP, network type (WiFi/Ethernet), firmware type and version, availability status, and a "Flash" button.

### USB Section

"Connect a device via USB to flash firmware and configure WiFi." with a "Connect via USB" button. If `navigator.serial` is not available, show: "USB flashing requires Chrome or Edge browser."

### Cross-link from Device Configuration

When the Device Configuration tab has no EPP Grid firmware devices, it shows: "No devices with EPP Grid firmware found. Flash your devices from the Flash Firmware tab." with a link that navigates to the flasher tab/view.

## OTA Flash Flow

1. User clicks "Flash" on a network device
2. **Variant selection** — WiFi / Ethernet choice (user always selects; no auto-detection for original firmware)
3. **Confirmation dialog** — "This will replace the firmware on {name} ({ip}). The device will be temporarily unavailable. Continue?"
4. **Backend orchestration** — `eppgrid/flash_ota` subscription streams progress
5. **Progress UI** — step-by-step progress indicator with status for each phase
6. **Completion** — redirect to Device Configuration tab

### OTA Error Handling

- Device offline: "Device is unavailable. Check network connection."
- Flash fails: "Flash failed. Device may need USB recovery."
- Timeout waiting for reboot: "Device hasn't responded. It may still be updating — check again in a minute."

## USB Flash Flow

1. User clicks "Connect via USB"
2. **Serial connection** — `navigator.serial.requestPort()` prompts port selection. Read serial stream, parse ESPHome boot logs for device name and MAC.
3. **Device identity check** — if MAC matches an existing ESPHome device in HA, show warning: "This device is already configured as {name}. Flashing will replace its firmware and remove old entities." Flag for deletion.
4. **Variant selection** — WiFi / Ethernet choice
5. **Flash** — set ESP Web Tools `<esp-web-install-button>` manifest URL to selected variant and trigger flash. ESP Web Tools handles partition writing, progress, error recovery.
6. **Post-flash (WiFi variant)** — reconnect to serial, check WiFi status from log output:
   - **Connected:** show current network + IP, offer optional reconfigure via Improv Serial
   - **Not connected:** WiFi provisioning UI — scan button (Improv Serial `CMD_WIFI_SCAN 0x04`), network dropdown sorted by signal strength, manual SSID toggle for hidden networks, password field, configure button
7. **Post-flash (Ethernet variant)** — reconnect to serial, read IP from boot logs
8. **Cleanup & auto-add** — delete old ESPHome config entry if flagged, call `eppgrid/add_esphome_device` with IP, redirect to Device Configuration tab

### WiFi Scan via Improv Serial

Uses the existing Improv Serial protocol (`improv_serial:` in firmware). The scan flow:

- Send RPC command `0x04` (CMD_WIFI_SCAN) with empty data
- Parse RPC Result packets (`type 0x04`) from the serial stream, each containing: SSID, RSSI (as string), auth required ("YES"/"NO")
- Accumulate results until empty termination packet
- Display sorted by signal strength: `MyNetwork (-45 dBm)` with lock icon for auth-required networks

Serial stream contains interleaved ESPHome log text — parser must scan for the Improv header bytes (`49 4D 50 52 4F 56`) to find packet boundaries.

## Dashboard Strategy

### Strategy Registration

Register `eppgrid` as a HA dashboard strategy. When the user creates a new dashboard and selects "EPP Grid", it generates:

```yaml
views:
  - title: "Device Configuration"
    cards:
      - type: "custom:epp-device-card"
  - title: "Flash Firmware"
    cards:
      - type: "custom:epp-flasher-card"
```

### Card Registration

Both cards registered as custom Lovelace cards via `customElements.define()`. Thin wrappers that instantiate the corresponding Lit component and pass through the `hass` object.

### Access Paths

The same content is accessible via:
- **Sidebar panel** (if enabled) — single panel with internal tab bar
- **Dashboard strategy** — two-view dashboard, one card per view
- **Manual card placement** — user adds individual cards to any dashboard

## Testing

### Backend Tests

- `test_list_flashable_devices` — discovers original and eppgrid firmware devices, returns correct firmware_type and metadata
- `test_flash_ota` — mocks the OTA sequence (delete config entry, push firmware, wait for reboot, auto-add), verifies progress events
- `test_add_esphome_device` — triggers ESPHome config flow with correct host
- `test_delete_esphome_device` — removes config entry
- Error cases: device offline, flash failure, timeout, device not found

### Frontend Tests

- `flasher-controller` — device list fetching, OTA progress state machine, serial connection state
- `epp-flasher-view` — renders device list, shows USB section, handles browser capability detection
- `strategy` — generates correct dashboard config
- Card wrappers — pass through hass correctly
- Tab routing in panel — switches views, cross-link navigation

### Manual Testing

- OTA flash an original-firmware device, verify old entities removed, new device auto-added
- OTA flash an existing EPP Grid device (re-flash)
- USB flash a new device, WiFi scan + provision, verify auto-add
- USB flash a device already in HA, verify old device cleaned up
- Dashboard strategy creates correct two-tab dashboard
- Cards work when manually added to a dashboard
- Web Serial unavailable browser shows appropriate message
