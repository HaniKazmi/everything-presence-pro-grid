# Firmware Variant Simplification -- Implementation Plan

Spec: `docs/superpowers/specs/2026-04-02-firmware-variant-simplification-design.md`

## Steps

- [ ] **1. Update `firmware/variants/wifi.yaml`**
  - Add `bluetooth_base` and `co2_base` to packages (copy from `wifi-ble-co2.yaml`)
  - Set `device_config` substitutions: `co2_enabled: true`, `bluetooth_enabled: true`
  - Add `esp32_improv: authorizer: none` (from `wifi-ble.yaml`)
  - Keep existing `improv_serial:` (serial provisioning still useful for USB)
  - `dashboard_import.package_import_url` stays as `wifi.yaml@main` (already correct)
  - `update` manifest URL stays as `everything-presence-pro-wifi-manifest.json` (already correct)

- [ ] **2. Update `firmware/variants/ethernet.yaml`**
  - Add `bluetooth_base` and `co2_base` to packages (copy from `ethernet-ble-co2.yaml`)
  - Set `device_config` substitutions: `co2_enabled: true`, `bluetooth_enabled: true`
  - `dashboard_import.package_import_url` stays as `ethernet.yaml@main` (already correct)
  - `update` manifest URL stays as `everything-presence-pro-ethernet-manifest.json` (already correct)

- [ ] **3. Delete 6 redundant variant files**
  - `firmware/variants/wifi-ble.yaml`
  - `firmware/variants/wifi-co2.yaml`
  - `firmware/variants/wifi-ble-co2.yaml`
  - `firmware/variants/ethernet-ble.yaml`
  - `firmware/variants/ethernet-co2.yaml`
  - `firmware/variants/ethernet-ble-co2.yaml`

- [ ] **4. Update CI workflow `firmware.yml`**
  - File: `.github/workflows/firmware.yml`
  - Change main-push matrix from `["wifi","wifi-ble","wifi-co2","wifi-ble-co2","ethernet","ethernet-ble","ethernet-co2","ethernet-ble-co2"]` to `["wifi","ethernet"]`
  - PR matrix already uses `["wifi"]` only -- no change needed

- [ ] **5. Update CI workflow `firmware-release.yml`**
  - File: `.github/workflows/firmware-release.yml`
  - Change variant matrix from 8 entries to `["wifi", "ethernet"]`

- [ ] **6. Update VS Code tasks**
  - File: `.vscode/tasks.json`
  - Change `firmwareVariant` input options from 8 entries to `["wifi", "ethernet"]`

- [ ] **7. Simplify standalone flasher**
  - File: `tools/firmware-builder/index.html`
  - **HTML changes:**
    - Remove the BLE and CO2 checkbox section (the `.checkbox-list` div inside `firmware-options`)
    - Remove `net-mode-wifi` div (serial-only WiFi provisioning)
    - Rename `net-mode-wifi-ble` div to `net-mode-wifi` (BLE discovery is now the only WiFi mode)
  - **CSS changes:**
    - Remove `.checkbox-list`, `.checkbox-item`, `.checkbox-label` style rules (no longer used)
  - **JS changes:**
    - `getVariant()`: return just `document.querySelector('input[name="network"]:checked').value` (remove BLE/CO2 logic)
    - `getNetMode()`: return `ethernet` if ethernet selected, else `wifi` (remove BLE branch)
    - `updateNetworkTab()`: toggle between `net-mode-wifi` and `net-mode-ethernet` only
    - Remove event listeners for `#ble` and `#co2` checkboxes
    - `onTabActivated()`: WiFi always shows BLE discovery message; remove serial-only WiFi provisioning branch
    - Remove `wifi-form-section` references and improv serial provisioning code (WiFi devices now use BLE for provisioning via HA, not serial)

- [ ] **8. Compile-test both variants**
  - Run `esphome compile firmware/variants/wifi.yaml`
  - Run `esphome compile firmware/variants/ethernet.yaml`
  - Both must succeed

- [ ] **9. Manual test**
  - Open `tools/firmware-builder/index.html` in browser
  - Verify only WiFi/Ethernet toggle visible, no BLE/CO2 checkboxes
  - Verify manifest URLs resolve to `everything-presence-pro-wifi-manifest.json` and `everything-presence-pro-ethernet-manifest.json`
  - Flash WiFi variant to device, confirm BLE discovery and CO2 sensor work
