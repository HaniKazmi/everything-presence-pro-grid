# Debug Log Level Controls

## Problem

The ESP sensor transmits all debug-level logs over the network to Home Assistant via the ESPHome API. These are discarded by HA unless debug logging is enabled, but the network traffic still occurs. There is no way to selectively control which log categories are sent or at what verbosity.

## Solution

A single API action (`epp_set_log_level`) that accepts a category and level, calling `esp_log_level_set()` at runtime for the appropriate ESP-IDF tags. The firmware compiles at DEBUG level (all log calls present in binary), but runtime filtering suppresses transmission of messages below the selected level.

The frontend settings panel will provide the UI for calling this action (implemented separately after rebasing on the settings branch).

## Categories

| Category | Tags |
|----------|------|
| **epp** | `"epp"` |
| **led** | `"control_leds"` |
| **networking** | `"wifi"`, `"esp_netif"`, `"dhcp"`, `"eth"`, `"esp_eth"`, `"phy"` |
| **ble** | `"bt"`, `"btm"`, `"bta"`, `"hci"`, `"gap"`, `"controller"` |
| **co2** | `"scd4x"` |
| **system** | `"*"` (wildcard catch-all) |

### Notes

- **system** uses the `"*"` wildcard, which sets the default level for any tag not explicitly overridden by another category. Tags like `"fw"`, `"api"`, `"ota"`, `"mdns"`, `"i2c"`, sensor tags, etc. all fall under system.
- **networking** sets both WiFi and Ethernet tags regardless of variant (unused tags are harmless no-ops).
- **ble** and **co2** categories are handled by the same action — the frontend should only show controls for categories relevant to the device's variant.
- The BLE tag list may be incomplete — ESP-IDF's Bluetooth stack may use additional tags. Unmatched tags fall through to system's `"*"` wildcard.

## API Action

```yaml
- action: epp_set_log_level
  variables:
    category: string   # system, epp, led, networking, ble, co2
    level: string       # None, Error, Warning, Info, Debug
  then:
    - lambda: |-
        # Maps level string to esp_log_level_t, then calls
        # esp_log_level_set() for each tag in the category
```

Valid levels: None, Error, Warning, Info, Debug

## Boot Sequence

1. **Early `on_boot` handler** (priority 200 — after hardware init, before network): Sets `esp_log_level_set("*", ESP_LOG_WARN)` to suppress noisy framework logs during initialization.
2. **Frontend** sends `epp_set_log_level` actions after connecting to set per-category levels based on user preferences.

### Order of Operations

`esp_log_level_set()` per-tag always takes precedence over the `"*"` wildcard. So when system sets `"*"` to one level and epp overrides `"epp"` to another, the per-tag override wins.

## Implementation Location

- **`firmware/common/everything-presence-pro-base.yaml`**: `epp_set_log_level` API action + `on_boot` handler
- **Frontend settings panel**: UI controls (to be implemented after rebasing on settings branch)

No C++ changes required. All firmware implementation is in YAML lambdas.

## Testing

Manual testing on device:

1. Flash firmware — device defaults to Warning level (on_boot handler)
2. Call `epp_set_log_level` with category=epp, level=Debug — verify EPP debug logs appear
3. Call with category=epp, level=Warning — verify EPP debug logs stop
4. Call with category=system, level=Error — verify only errors from framework
5. Call with category=system, level=Error then category=epp, level=Debug — verify EPP debug logs flow while framework stays at Error only
6. Reboot device — levels reset to Warning (no persistence without frontend re-sending)
