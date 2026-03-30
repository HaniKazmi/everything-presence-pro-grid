# Debug Log Level Controls

## Problem

The ESP sensor transmits all debug-level logs over the network to Home Assistant via the ESPHome API. These are discarded by HA unless debug logging is enabled, but the network traffic still occurs. There is no way to selectively control which log categories are sent or at what verbosity.

## Solution

Runtime log level controls spanning firmware, backend, and frontend:

1. **Firmware**: An `epp_set_log_level` API action that accepts a category and level, calling `esp_log_level_set()` for the appropriate ESP-IDF tags. An `on_boot` handler defaults all logs to Warning.
2. **Backend**: The HA integration persists log levels in device config storage, re-sends them on device reconnect, and exposes build flags to the frontend.
3. **Frontend**: A "Logging" accordion section in the settings panel with per-category dropdowns, following the existing settings save flow.

## Categories

| Category | Tags | Visibility |
|----------|------|------------|
| **system** | `"*"` (wildcard catch-all) | Always |
| **epp** | `"epp"` | Always |
| **led** | `"control_leds"` | Always |
| **networking** | `"wifi"`, `"esp_netif"`, `"dhcp"`, `"eth"`, `"esp_eth"`, `"phy"` | Always |
| **ble** | `"bt"`, `"btm"`, `"bta"`, `"hci"`, `"gap"`, `"controller"` | Only when `bluetooth_enabled` build flag is true |
| **co2** | `"scd4x"` | Only when `co2_enabled` build flag is true |

### Notes

- **system** uses the `"*"` wildcard, which sets the default level for any tag not explicitly overridden. Tags like `"fw"`, `"api"`, `"ota"`, `"mdns"`, `"i2c"`, sensor tags, etc. all fall under system.
- **networking** sets both WiFi and Ethernet tags regardless of variant (unused tags are harmless no-ops).
- The BLE tag list may be incomplete — ESP-IDF's Bluetooth stack may use additional tags. Unmatched tags fall through to system's `"*"` wildcard.
- Visibility is determined by compile-time build flags from the `get_build_flags` firmware API action, not by runtime hardware detection.

## Firmware

### API Action

```yaml
- action: epp_set_log_level
  variables:
    category: string   # system, epp, led, networking, ble, co2
    level: string       # None, Error, Warning, Info, Debug
```

Maps the level string to `esp_log_level_t` and calls `esp_log_level_set()` for each tag in the category.

### Boot Sequence

An `on_boot` handler at priority 200 calls `esp_log_level_set("*", ESP_LOG_WARN)` to suppress noisy framework logs during initialization. Log levels are not persisted on-device — they reset to Warning on every reboot. The backend re-sends stored levels on reconnect.

### Order of Operations

`esp_log_level_set()` per-tag always takes precedence over the `"*"` wildcard. So when system sets `"*"` to one level and epp overrides `"epp"` to another, the per-tag override wins.

**Already implemented** in `firmware/common/everything-presence-pro-base.yaml`.

## Backend

### Build Flags

The backend fetches build flags from the device via the `get_build_flags` firmware API action on device connect. The flags (`bluetooth_enabled`, `co2_enabled`, `ethernet_enabled`) are included in the device info sent to the frontend so it can conditionally render BLE/CO2 log level rows.

### Persistence

Log levels are stored in the integration's device config storage (alongside existing settings like detection ranges, sensor offsets, etc.). The `eppgrid/set_settings` WebSocket handler accepts an optional `log_levels` dict:

```python
{
  "type": "eppgrid/set_settings",
  "mac": "...",
  "log_levels": {
    "system": "Warning",
    "epp": "Debug",
    "led": "Warning",
    "networking": "Warning",
    "ble": "Warning",     # only if bluetooth_enabled
    "co2": "Warning"      # only if co2_enabled
  },
  # ... existing settings fields unchanged
}
```

### Reconnect

On device connect, the integration reads stored log levels from config and calls `epp_set_log_level` for each stored category. This restores the user's log level preferences after a device reboot.

## Frontend

### UI Structure

A new "Logging" accordion section in the settings panel, after the existing sections (reporting, detection, sensitivity). Contains one setting row per category:

- **Label** — category name (e.g. "EPP", "LED", "Network", "System")
- **Dropdown** (`<ha-select>`) — options: None / Error / Warning / Info / Debug, default: Warning
- **Reset button** (mdi:restart) — resets that dropdown to "Warning"
- **Info tooltip** (mdi:help-circle-outline) — explains what that category covers

### Conditional Rendering

- System, EPP, LED, Network rows are always shown
- BLE row is shown only when `bluetooth_enabled` is true in build flags
- CO2 row is shown only when `co2_enabled` is true in build flags

### Data Flow

1. User changes a dropdown → marks dirty via `_overrides` (same non-reactive pattern as other settings)
2. User clicks Save → emits `save` event with `log_levels` dict in the payload
3. Parent panel calls `eppgrid/set_settings` which persists levels and sends them to firmware

### Initial State

On load, dropdowns are populated from the stored config received from the backend. If no log levels have been saved yet, all default to "Warning".

## Testing

### Frontend Tests

- Logging accordion renders with correct categories
- BLE/CO2 rows hidden when build flags are false
- Dropdown changes set dirty flag
- Reset button returns dropdown to "Warning"
- Save emits payload with `log_levels` dict
- Tooltips display correct text

### Backend Tests

- `set_settings` with `log_levels` persists to storage
- On device reconnect, stored log levels are sent to firmware
- Build flags are fetched and included in device info
- Missing `log_levels` in payload doesn't break existing settings flow
