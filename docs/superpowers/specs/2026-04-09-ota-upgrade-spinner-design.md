# OTA Upgrade Progress Indicator

## Problem

When a user triggers an OTA firmware update on an installed device from the Flash tab device list, the "Update" button is fire-and-forget. There is no progress feedback, no success confirmation, and no error reporting. The user has no idea if the update is working, complete, or failed.

## Solution

Replace the "Update" button with an inline circular progress indicator that tracks the OTA through all phases: downloading/installing, rebooting, and reconnection with version confirmation.

## States

Each device tracks its own OTA state independently, allowing parallel updates.

### State Machine

```
idle → updating → rebooting → success → idle
                ↘ error ↗ (retry returns to idle, re-click triggers new update)
```

### 1. Idle

The existing "Update" `ha-button`. No changes.

### 2. Updating

- 32px SVG circular progress ring replaces the Update button inline in the device row
- Percentage (0-100%) displayed in the center of the ring
- Track: light gray, fill: `--primary-color`
- Driven by ESPHome `UpdateState.progress` via new WebSocket subscription

### 3. Rebooting

- Indeterminate spinning ring (same 32px size, no percentage text)
- Triggered when:
  - `UpdateState.progress` reaches 100%, OR
  - `UpdateState.in_progress` transitions from true to false, OR
  - Device disconnects after update was in progress

### 4. Success

- Green checkmark icon (✓) inline where the spinner was
- Shown when device reconnects with `current_version` matching the expected `latest_version`
- Auto-dismissed after ~5 seconds, at which point the device row updates naturally (firmware_status no longer "firmware_behind", so the Update button disappears)

### 5. Error

- Red ✗ icon + "Retry" button inline
- Clicking the ✗ icon shows a small inline popover/tooltip with the error message
- "Retry" resets state to idle so the user can click Update again
- Error triggers:
  - Connection lost during update (device disconnects and doesn't reconnect within timeout)
  - Device reports update failure via `UpdateState`
  - Timeout: no progress change for 60 seconds

## Backend

### New WebSocket Command: `eppgrid/subscribe_ota_progress`

Request:
```json
{
  "type": "eppgrid/subscribe_ota_progress",
  "mac": "AA:BB:CC:DD:EE:FF"
}
```

Behavior:
1. Connects to the device via `aioesphomeapi` (reuses existing connection from device manager)
2. Subscribes to entity state updates, filtering for `UpdateState` entities
3. Forwards state changes to the frontend as WebSocket events:

```json
{
  "type": "event",
  "event": {
    "state": "updating",
    "progress": 65.0,
    "has_progress": true
  }
}
```

```json
{
  "type": "event",
  "event": {
    "state": "rebooting"
  }
}
```

```json
{
  "type": "event",
  "event": {
    "state": "success",
    "version": "0.90.0-alpha"
  }
}
```

```json
{
  "type": "event",
  "event": {
    "state": "error",
    "message": "Connection lost during update"
  }
}
```

State transitions managed server-side:
- `UpdateState.in_progress=true` + `has_progress=true` → emit `updating` with `progress`
- `UpdateState.in_progress=true` + `has_progress=false` → emit `updating` with no progress (indeterminate)
- Progress reaches 100% or device disconnects after updating → emit `rebooting`
- Device reconnects with correct version → emit `success`
- Device reconnects with wrong version → emit `error`
- No state change for 60s during update → emit `error` with timeout message
- Connection lost and no reconnect within 60s → emit `error`

### Changes to `websocket_update_firmware`

The existing handler triggers the update and returns. No changes needed — the progress subscription is separate from the trigger command.

## Frontend

### FlasherController Changes

Add an `otaStates` reactive map: `Map<string, OtaDeviceState>` keyed by MAC address.

```typescript
interface OtaDeviceState {
  state: "updating" | "rebooting" | "success" | "error";
  progress: number | null;  // 0-100 or null for indeterminate
  error: string | null;
  unsubscribe: (() => void) | null;
}
```

When the user clicks "Update":
1. Set `otaStates[mac] = { state: "updating", progress: 0, error: null }`
2. Call existing `eppgrid/update_firmware` to trigger the update
3. Subscribe to `eppgrid/subscribe_ota_progress` for that MAC
4. Update `otaStates[mac]` as events arrive

### EppFlasherView Changes

In the device row rendering, replace the Update button with the appropriate inline widget based on `otaState`:

- `updating` → SVG circular progress ring (32px) with percentage center text
- `rebooting` → CSS-animated indeterminate spinning ring (32px)
- `success` → Green ✓ icon, auto-clear after 5s
- `error` → Red ✗ (clickable, shows error popover) + "Retry" ha-button

### Error Popover

Small positioned tooltip that appears below/above the ✗ icon on click:
- Shows the error message text
- Dismisses on click outside or on the ✗ again
- Styled with `--error-color` background, white text, subtle shadow

### New Styles

- `.ota-progress` — SVG ring container (32px)
- `.ota-spinner` — indeterminate spin animation
- `.ota-success` — green checkmark
- `.ota-error` — red ✗ + retry layout
- `.ota-error-popover` — positioned tooltip for error detail

## Localization Keys

- `flasher.ota_updating` — "Updating..."
- `flasher.ota_rebooting` — "Rebooting..."
- `flasher.ota_success` — "Updated"
- `flasher.ota_error` — "Update failed"
- `flasher.ota_timeout` — "Update timed out"
- `flasher.ota_connection_lost` — "Connection lost during update"
- `flasher.ota_retry` — "Retry"

## Testing

### Backend
- WebSocket handler correctly subscribes to UpdateState and emits progress events
- State machine transitions: updating → rebooting → success
- Error paths: connection lost, timeout, wrong version after reboot
- Parallel subscriptions for multiple MACs

### Frontend
- OTA state map updates correctly from WebSocket events
- Each state renders the correct inline widget
- Error popover shows/hides on click
- Success auto-dismisses after timeout
- Multiple devices can be in different states simultaneously
- Retry resets state and allows re-triggering
