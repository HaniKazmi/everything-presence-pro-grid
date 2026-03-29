# Debug Log Level Controls

## Problem

The ESP sensor transmits all debug-level logs over the network to Home Assistant via the ESPHome API. These are discarded by HA unless debug logging is enabled, but the network traffic still occurs. There is no way to selectively control which log categories are sent or at what verbosity.

## Solution

Six runtime-controllable log level selects exposed as Home Assistant entities. Each select controls a category of log output by calling `esp_log_level_set()` at runtime. The firmware continues to compile at DEBUG level (all log calls present in binary), but runtime filtering suppresses transmission of messages below the selected level.

## Categories

| Category | Select ID | Tags | Location |
|----------|-----------|------|----------|
| **epp** | `log_level_epp` | `"epp"` | `everything-presence-pro-base.yaml` |
| **led** | `log_level_led` | `"control_leds"` | `everything-presence-pro-base.yaml` |
| **networking** | `log_level_networking` | WiFi: `"wifi"`, `"esp_netif"`, `"dhcp"` / Ethernet: `"eth"`, `"esp_eth"`, `"phy"` | `everything-presence-pro-base.yaml` |
| **ble** | `log_level_ble` | `"bt"`, `"btm"`, `"bta"`, `"hci"`, `"gap"`, `"controller"` | `bluetooth-base.yaml` |
| **co2** | `log_level_co2` | `"scd4x"` | `co2-base.yaml` |
| **system** | `log_level_system` | `"*"` (wildcard catch-all) | `everything-presence-pro-base.yaml` |

### Notes

- **system** uses the `"*"` wildcard, which sets the default level for any tag not explicitly overridden by another category. Tags like `"fw"`, `"api"`, `"ota"`, `"mdns"`, `"i2c"`, sensor tags, etc. all fall under system.
- **networking** uses a compile-time conditional to select WiFi vs Ethernet tags based on the `ethernet_enabled` device config flag.
- **ble** and **co2** selects only exist in variants that include those features (gated by existing `bluetooth_enabled` / `co2_enabled` device config flags in the variant YAML files).
- The BLE tag list may be incomplete — ESP-IDF's Bluetooth stack may use additional tags. Unmatched tags fall through to system's `"*"` wildcard.

## Select Configuration

Each select follows the existing template select pattern used by `led_mode_select`, `relay_contact_mode`, etc:

```yaml
select:
  - platform: template
    name: "EPP Log Level"
    id: log_level_epp
    icon: "mdi:bug"
    entity_category: config
    optimistic: true
    restore_value: true
    initial_option: "Warning"
    options:
      - "None"
      - "Error"
      - "Warning"
      - "Info"
      - "Debug"
    on_value:
      then:
        - lambda: |-
            auto level = ESP_LOG_WARN;
            if (x == "None") level = ESP_LOG_NONE;
            else if (x == "Error") level = ESP_LOG_ERROR;
            else if (x == "Warning") level = ESP_LOG_WARN;
            else if (x == "Info") level = ESP_LOG_INFO;
            else if (x == "Debug") level = ESP_LOG_DEBUG;
            esp_log_level_set("epp", level);
```

## Boot Sequence

1. **Early `on_boot` handler** (priority 200 — after hardware init, before network): Sets `esp_log_level_set("*", ESP_LOG_WARN)` to suppress noisy framework logs during initialization, before select components have restored their values.
2. **Select restore**: Each select restores its persisted value (or `initial_option: "Warning"` on first boot) and fires `on_value`, calling `esp_log_level_set()` for its tags.

### Order of Operations

`esp_log_level_set()` per-tag always takes precedence over the `"*"` wildcard. So when system sets `"*"` to one level and epp overrides `"epp"` to another, the per-tag override wins. No re-apply of other categories is needed when system changes.

## Implementation Location

- **`firmware/common/everything-presence-pro-base.yaml`**: epp, led, networking, and system selects + `on_boot` handler
- **`firmware/common/bluetooth-base.yaml`**: ble select
- **`firmware/common/co2-base.yaml`**: co2 select

No C++ changes required. All implementation is in YAML lambdas.

## Testing

Manual testing on device:

1. Flash firmware with all selects at Warning (default)
2. Verify only WARNING/ERROR level logs appear in HA
3. Change epp to Debug — verify EPP debug logs appear, others remain quiet
4. Change epp back to Warning — verify EPP debug logs stop
5. Change system to Error — verify only errors come through from framework
6. Change system to Error, epp to Debug — verify EPP debug logs flow while framework stays at Error only
7. Reboot device — verify selects restore their values and levels are correctly reapplied
