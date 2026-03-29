# Debug Log Level Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add six runtime-controllable log level selects to the firmware so users can enable/disable debug logs per category without reflashing.

**Architecture:** Each category maps to one or more ESP-IDF log tags. Template select components expose log level options (None/Error/Warning/Info/Debug) in Home Assistant. On value change, the select's `on_value` lambda calls `esp_log_level_set()` for each tag in that category. An early `on_boot` handler sets the default to Warning so the device is quiet by default.

**Tech Stack:** ESPHome YAML, ESP-IDF logging API (`esp_log_level_set`)

**Spec:** `docs/superpowers/specs/2026-03-29-debug-log-levels-design.md`

---

### Task 1: Add on_boot handler and base log level selects

**Files:**
- Modify: `firmware/common/everything-presence-pro-base.yaml:5-18` (on_boot section)
- Modify: `firmware/common/everything-presence-pro-base.yaml:543-589` (select section)

- [ ] **Step 1: Add early on_boot handler for log suppression**

Add a new `on_boot` entry with priority 200 (before the existing priority 375 entry) to set the global log level to Warning immediately on boot:

In `firmware/common/everything-presence-pro-base.yaml`, change the existing `on_boot` section from:

```yaml
  on_boot:
    - priority: 375
      then:
```

To:

```yaml
  on_boot:
    - priority: 200
      then:
        - lambda: |-
            esp_log_level_set("*", ESP_LOG_WARN);
    - priority: 375
      then:
```

This suppresses all debug/info logs during early boot before the select components restore their values.

- [ ] **Step 2: Add system log level select**

Add after the LED Mode select (after line 589) in the `select:` section:

```yaml
  - platform: template
    name: "System Log Level"
    id: log_level_system
    icon: "mdi:math-log"
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
            esp_log_level_t level;
            if (x == "None") level = ESP_LOG_NONE;
            else if (x == "Error") level = ESP_LOG_ERROR;
            else if (x == "Warning") level = ESP_LOG_WARN;
            else if (x == "Info") level = ESP_LOG_INFO;
            else level = ESP_LOG_DEBUG;
            esp_log_level_set("*", level);
```

The `"*"` wildcard sets the default level for any tag not explicitly overridden by another category select. This covers `"fw"`, `"api"`, `"ota"`, `"mdns"`, `"i2c"`, sensor tags, and all other framework tags.

- [ ] **Step 3: Add EPP log level select**

Add immediately after the system select:

```yaml
  - platform: template
    name: "EPP Log Level"
    id: log_level_epp
    icon: "mdi:math-log"
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
            esp_log_level_t level;
            if (x == "None") level = ESP_LOG_NONE;
            else if (x == "Error") level = ESP_LOG_ERROR;
            else if (x == "Warning") level = ESP_LOG_WARN;
            else if (x == "Info") level = ESP_LOG_INFO;
            else level = ESP_LOG_DEBUG;
            esp_log_level_set("epp", level);
```

- [ ] **Step 4: Add LED log level select**

Add immediately after the EPP select:

```yaml
  - platform: template
    name: "LED Log Level"
    id: log_level_led
    icon: "mdi:math-log"
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
            esp_log_level_t level;
            if (x == "None") level = ESP_LOG_NONE;
            else if (x == "Error") level = ESP_LOG_ERROR;
            else if (x == "Warning") level = ESP_LOG_WARN;
            else if (x == "Info") level = ESP_LOG_INFO;
            else level = ESP_LOG_DEBUG;
            esp_log_level_set("control_leds", level);
```

- [ ] **Step 5: Add networking log level select**

Add immediately after the LED select. Sets both WiFi and Ethernet tags regardless of variant (unused tags are harmless no-ops):

```yaml
  - platform: template
    name: "Network Log Level"
    id: log_level_networking
    icon: "mdi:math-log"
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
            esp_log_level_t level;
            if (x == "None") level = ESP_LOG_NONE;
            else if (x == "Error") level = ESP_LOG_ERROR;
            else if (x == "Warning") level = ESP_LOG_WARN;
            else if (x == "Info") level = ESP_LOG_INFO;
            else level = ESP_LOG_DEBUG;
            esp_log_level_set("wifi", level);
            esp_log_level_set("esp_netif", level);
            esp_log_level_set("dhcp", level);
            esp_log_level_set("eth", level);
            esp_log_level_set("esp_eth", level);
            esp_log_level_set("phy", level);
```

- [ ] **Step 6: Build wifi variant to verify compilation**

Run: `cd firmware && esphome compile variants/wifi.yaml`

Expected: Successful compilation with no errors. The new select components and on_boot handler should compile without issues.

- [ ] **Step 7: Commit**

```bash
git add firmware/common/everything-presence-pro-base.yaml
git commit -m "feat: add runtime log level selects for system, epp, led, networking"
```

---

### Task 2: Add BLE log level select

**Files:**
- Modify: `firmware/common/bluetooth-base.yaml`

- [ ] **Step 1: Add BLE log level select**

Add a `select:` section to `firmware/common/bluetooth-base.yaml` after the existing `bluetooth_proxy` config:

```yaml
select:
  - platform: template
    name: "BLE Log Level"
    id: log_level_ble
    icon: "mdi:math-log"
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
            esp_log_level_t level;
            if (x == "None") level = ESP_LOG_NONE;
            else if (x == "Error") level = ESP_LOG_ERROR;
            else if (x == "Warning") level = ESP_LOG_WARN;
            else if (x == "Info") level = ESP_LOG_INFO;
            else level = ESP_LOG_DEBUG;
            esp_log_level_set("bt", level);
            esp_log_level_set("btm", level);
            esp_log_level_set("bta", level);
            esp_log_level_set("hci", level);
            esp_log_level_set("gap", level);
            esp_log_level_set("controller", level);
```

This select only exists in variants that include `bluetooth-base.yaml` (wifi-ble, ethernet-ble, wifi-ble-co2, ethernet-ble-co2). On non-BLE variants, BLE-related tags fall through to the system select's `"*"` wildcard.

- [ ] **Step 2: Build wifi-ble variant to verify**

Run: `cd firmware && esphome compile variants/wifi-ble.yaml`

Expected: Successful compilation. The BLE select merges cleanly with the base selects.

- [ ] **Step 3: Commit**

```bash
git add firmware/common/bluetooth-base.yaml
git commit -m "feat: add BLE log level select for bluetooth variants"
```

---

### Task 3: Add CO2 log level select

**Files:**
- Modify: `firmware/common/co2-base.yaml`

- [ ] **Step 1: Add CO2 log level select**

Add a `select:` section to `firmware/common/co2-base.yaml` after the existing `button:` section:

```yaml
select:
  - platform: template
    name: "CO2 Log Level"
    id: log_level_co2
    icon: "mdi:math-log"
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
            esp_log_level_t level;
            if (x == "None") level = ESP_LOG_NONE;
            else if (x == "Error") level = ESP_LOG_ERROR;
            else if (x == "Warning") level = ESP_LOG_WARN;
            else if (x == "Info") level = ESP_LOG_INFO;
            else level = ESP_LOG_DEBUG;
            esp_log_level_set("scd4x", level);
```

This select only exists in variants that include `co2-base.yaml`.

- [ ] **Step 2: Build wifi-ble-co2 variant to verify all selects together**

Run: `cd firmware && esphome compile variants/wifi-ble-co2.yaml`

Expected: Successful compilation with all 6 log level selects (system, epp, led, networking from base + ble from bluetooth-base + co2 from co2-base).

- [ ] **Step 3: Commit**

```bash
git add firmware/common/co2-base.yaml
git commit -m "feat: add CO2 log level select for CO2 variants"
```

---

### Task 4: Manual verification

- [ ] **Step 1: Flash and verify default behavior**

Flash the wifi variant to a device:

Run: `cd firmware && esphome run variants/wifi.yaml`

After boot, check HA logs for the device. Expected: only WARNING and ERROR level messages appear. No DEBUG or INFO messages should be transmitted.

- [ ] **Step 2: Test per-category level changes**

In HA, find the device's config entities. Set "EPP Log Level" to "Debug". Trigger some zone activity.

Expected: EPP debug messages (zone occupancy changes, target tracking) appear in HA logs. Other categories (LED, networking, system) remain at Warning level — no debug noise from them.

Set "EPP Log Level" back to "Warning". Expected: EPP debug messages stop.

- [ ] **Step 3: Test system vs category override**

Set "System Log Level" to "Error" and "EPP Log Level" to "Debug".

Expected: Only errors from framework/system tags, but full debug output from EPP. Per-tag overrides take precedence over the `"*"` wildcard.

- [ ] **Step 4: Test persistence across reboot**

Set "EPP Log Level" to "Debug", then restart the device.

Expected: After reboot, the EPP select restores to "Debug" and EPP debug messages resume. The `restore_value: true` setting persists the selection across reboots.
