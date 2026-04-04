# Direct USB Flash with esptool.js

**Date:** 2026-04-03
**Branch:** `flasher`
**Status:** Design approved, ready for implementation

## Goal

Replace the iframe-based ESP Web Tools USB flasher with direct `esptool.js` integration. This gives us control of the serial port after flashing, enabling an inline Improv Serial flow for WiFi provisioning and automatic device addition — all without leaving the HA panel.

## Decision: esptool.js over ESP Web Tools

`<esp-web-install-button>` registers Material Design custom elements globally, conflicting with HA's scoped custom element registry. It also provides its own UI dialogs we can't style, and the serial port handoff after flash is uncertain.

`esptool.js` (the library ESP Web Tools wraps) is pure JS with no custom elements. ~50-60 lines to implement the flash step. We own the serial port the entire time, enabling seamless transition to Improv Serial after flashing.

## Architecture

```
View (renders state, dispatches events)
  ↕ properties + events
Controller (reactive state, calls service)
  ↕ async calls + callbacks
USB Flash Service (orchestrates serial flow)
  ↕ uses
improv-serial.ts (packet build/parse + serial I/O)
esptool-js (flash firmware)
Web Serial API (browser)
```

### File Changes

**New files:**
- `frontend/src/lib/usb-flash-service.ts` — orchestrates the full USB flash flow

**Modified files:**
- `frontend/src/lib/improv-serial.ts` — add serial I/O wrappers (`sendImprovPacket`, `readImprovResponse`, `drainSerial`)
- `frontend/src/controllers/flasher-controller.ts` — add `startUsbFlash(variant)`, USB state management
- `frontend/src/components/epp-flasher-view.ts` — replace iframe with inline USB flash UI

**Deleted files:**
- `custom_components/eppgrid/frontend/usb-flasher.html` — no longer needed

**New dependency:**
- `esptool-js` npm package

## State Machine

Linear flow with error handling at each step:

```
idle → connecting → flashing → wifi_scan → wifi_provision → reading_ip → adding_device → complete
                                                                                          
Any state can → error (with retry back to appropriate state)
```

### States

| State | What's happening | User sees |
|-------|-----------------|-----------|
| `idle` | Nothing | Variant selector + "Flash via USB" button |
| `connecting` | Browser serial port picker open | Browser's native port dialog |
| `flashing` | esptool.js writing firmware | Progress bar (% from esptool callback) |
| `wifi_scan` | Improv CMD_WIFI_SCAN sent | "Scanning for networks..." spinner |
| `wifi_provision` | User picks network, enters password | Network list + password input + "Connect" button |
| `reading_ip` | Watching serial for IP Address pattern | "Connecting to WiFi..." spinner |
| `adding_device` | Calling `eppgrid/add_esphome_device` | "Adding device..." spinner |
| `complete` | Device added | IP + "Go to Device Configuration" button |
| `error` | Any step failed | Error message + "Retry" button |

### Retry Behavior

- Flash error → retry from `connecting` (re-request port)
- WiFi/Improv error → retry from `wifi_scan` (port still open)
- Add device error → retry from `adding_device`

## esptool.js Flash Step

```typescript
// 1. User selects port
const port = await navigator.serial.requestPort();

// 2. Create esptool transport + loader
const transport = new Transport(port);
const loader = new ESPLoader({ transport, baudrate: 115200 });

// 3. Detect chip
await loader.main();

// 4. Fetch manifest + download firmware binaries
const manifestUrl = `${MANIFEST_BASE_URL}/${variant}/manifest.json`;
const manifest = await fetch(manifestUrl).then(r => r.json());
const fileArray = await Promise.all(
  manifest.builds[0].parts.map(part =>
    fetch(resolveUrl(manifestUrl, part.path)).then(r => r.arrayBuffer())
      .then(data => ({ data, address: part.offset }))
  )
);

// 5. Flash with progress
await loader.writeFlash({
  fileArray,
  flashSize: "keep",
  reportProgress: (fileIndex, written, total) => {
    onProgress(Math.round((written / total) * 100));
  }
});

// 6. Reset + disconnect transport
await loader.hardReset();
await transport.disconnect();
```

### Error Handling

- Port selection cancelled → stay at `idle`
- Chip detection fails → `error` ("Could not connect to device. Hold BOOT button and try again.")
- Download fails → `error` ("Failed to download firmware")
- Flash fails → `error` (esptool error message)

## Post-Flash Improv Serial Flow

After flash + device reset, re-open the serial port for Improv communication.

### Serial Reconnection

```typescript
await port.open({ baudRate: 115200 });
const reader = port.readable.getReader();
const writer = port.writable.getWriter();
```

### WiFi Scan

1. Wait ~2-3 seconds for device boot + Improv initialization
2. Send `buildScanCommand()` via writer
3. Read responses, parse with `parseImprovPackets()` + `parseScanResults()`
4. Return `WifiNetwork[]` to controller → view renders network list

### WiFi Provisioning

1. Send `buildWifiCommand(ssid, password)` via writer
2. Read Improv response for success/failure
3. On success, transition to `reading_ip`

### IP Detection (two strategies)

1. **Improv response** — CMD_WIFI_SETTINGS response may contain redirect URL with IP
2. **Log parsing fallback** — read serial output, match `IP Address: (\d+\.\d+\.\d+\.\d+)` (same as firmware builder)

Timeout: 30 seconds. No IP → `error` ("Connected to WiFi but couldn't detect IP address").

### Device Auto-Add

1. Call `eppgrid/add_esphome_device` WS command with detected IP
2. Close serial port
3. Transition to `complete`

## Serial I/O Additions to improv-serial.ts

New functions alongside existing packet build/parse:

```typescript
async function sendImprovPacket(
  writer: WritableStreamDefaultWriter,
  packet: Uint8Array
): Promise<void>

async function readImprovResponse(
  reader: ReadableStreamDefaultReader,
  timeoutMs: number
): Promise<ImprovPacket[]>

async function drainSerial(
  reader: ReadableStreamDefaultReader,
  timeoutMs: number
): Promise<void>
```

- `sendImprovPacket` — writes packet bytes to serial writer
- `readImprovResponse` — reads chunks, feeds to `parseImprovPackets()`, returns valid packets before timeout
- `drainSerial` — reads and discards buffered data before starting fresh communication

## View Changes

### Replaced

- Iframe rendering (`<iframe src="/eppgrid_static/usb-flasher.html?manifest=...">`)
- `postMessage` listener for iframe state changes

### Reused

- WiFi provisioning UI (`_renderWifiProvisioning`) — network list, manual SSID, password field
- Variant selector (WiFi/Ethernet radio buttons)
- Browser warning (Chrome/Edge required, `_hasWebSerial` check)

### Added

- USB flash progress steps (similar to existing OTA progress pattern)
- State-driven rendering based on `usbFlashState`

### Unchanged

- OTA flash flow (network device list, confirm dialog, OTA progress)
- Tab bar routing
- Existing translation keys (add a few new ones for USB progress steps)

## Testing Strategy (TDD)

### usb-flash-service.ts (~10-12 tests)

- Flash sequence calls esptool.js in correct order
- Progress callback fires with correct percentages
- Manifest fetch + binary download with URL resolution
- Post-flash serial reconnection sequence
- WiFi scan sends correct packet, returns parsed networks
- WiFi provision sends correct packet, detects success
- IP detection from Improv response
- IP detection from log output fallback
- Timeout when no IP found
- Error handling at each step
- Serial port closed on error cleanup

### improv-serial.ts I/O wrappers (~4-5 tests)

- `sendImprovPacket` writes bytes to writer
- `readImprovResponse` reads chunks, parses packets, respects timeout
- `drainSerial` discards buffered data
- Timeout behavior (rejects after deadline)

### flasher-controller.ts USB additions (~5-6 tests)

- `startUsbFlash` calls service with correct variant
- State transitions update reactive properties
- WiFi scan/provision events delegated to service
- Error state set on service failure
- Serial port cleaned up on `hostDisconnected`

### epp-flasher-view.ts view tests (~8-10 tests)

- Each `usbFlashState` renders correct UI section
- Progress bar reflects `usbProgress` percentage
- WiFi network list rendered from `wifiNetworks`
- Variant selector dispatches correct variant
- Flash button dispatches `usb-flash` event
- Error state shows message + retry button
- Retry dispatches correct event

### Mocking Strategy

- `esptool-js` — mock `Transport`, `ESPLoader` classes (hardware)
- `navigator.serial` — mock `requestPort()` with fake readable/writable streams
- `fetch` — mock for manifest + binary downloads
- Real `improv-serial.ts` packet build/parse (pure logic, no mocks)
- WS calls via existing mock pattern

Total: ~30 new tests. Existing improv-serial tests unchanged.
