# Firmware Variant Simplification

## Goal

Reduce firmware variants from 8 to 2 (`wifi` and `ethernet`). Both variants include BLE and CO2 compiled in, eliminating the combinatorial explosion of optional features. Users get a simpler choice (WiFi vs Ethernet) with all hardware features enabled by default.

## Current State

Eight variant YAML files exist in `firmware/variants/`, one for each combination of `{wifi,ethernet} x {ble,no-ble} x {co2,no-co2}`:

| Variant              | ethernet | bluetooth | co2 | packages                               |
|----------------------|----------|-----------|-----|----------------------------------------|
| wifi                 | no       | no        | no  | base, ld2450, sen0609                  |
| wifi-ble             | no       | yes       | no  | base, ld2450, sen0609, bluetooth       |
| wifi-co2             | no       | no        | yes | base, ld2450, sen0609, co2             |
| wifi-ble-co2         | no       | yes       | yes | base, ld2450, sen0609, bluetooth, co2  |
| ethernet             | yes      | no        | no  | base, ld2450, sen0609, ethernet        |
| ethernet-ble         | yes      | yes       | no  | base, ld2450, sen0609, ethernet, bluetooth |
| ethernet-co2         | yes      | no        | yes | base, ld2450, sen0609, ethernet, co2   |
| ethernet-ble-co2     | yes      | yes       | yes | base, ld2450, sen0609, ethernet, bluetooth, co2 |

The standalone flasher (`tools/firmware-builder/index.html`) presents WiFi/Ethernet radio buttons plus BLE and CO2 checkboxes, constructing a variant slug like `wifi-ble-co2` to select the manifest URL.

CI builds all 8 variants on push to main (`firmware.yml`) and on tag for releases (`firmware-release.yml`). VS Code `tasks.json` offers a picker with all 8 options.

Key pattern differences between WiFi and Ethernet variants:
- **WiFi variants without BLE**: include `improv_serial:` (serial-only WiFi provisioning)
- **WiFi variants with BLE**: include `esp32_improv: authorizer: none` (BLE-based WiFi provisioning), no `improv_serial:`
- **Ethernet variants**: no improv at all

## Design

### Remaining Variants

Keep two files:

1. **`firmware/variants/wifi.yaml`** -- equivalent to current `wifi-ble-co2.yaml`:
   - `device_config`: `co2_enabled: true`, `bluetooth_enabled: true`, `ethernet_enabled: false`
   - Packages: base, ld2450, sen0609, bluetooth, co2
   - Includes both `improv_serial:` AND `esp32_improv: authorizer: none` (serial for USB provisioning, BLE for wireless discovery)
   - `dashboard_import` URL points to `wifi.yaml` (itself)
   - Update manifest URL: `everything-presence-pro-wifi-manifest.json`

2. **`firmware/variants/ethernet.yaml`** -- equivalent to current `ethernet-ble-co2.yaml`:
   - `device_config`: `co2_enabled: true`, `bluetooth_enabled: true`, `ethernet_enabled: true`
   - Packages: base, ld2450, sen0609, ethernet, bluetooth, co2
   - No improv (ethernet doesn't need WiFi provisioning)
   - `dashboard_import` URL points to `ethernet.yaml` (itself)
   - Update manifest URL: `everything-presence-pro-ethernet-manifest.json`

### Deleted Variants

Remove 6 files: `wifi-ble.yaml`, `wifi-co2.yaml`, `wifi-ble-co2.yaml`, `ethernet-ble.yaml`, `ethernet-co2.yaml`, `ethernet-ble-co2.yaml`.

### Standalone Flasher

Simplify `tools/firmware-builder/index.html`:
- Remove BLE and CO2 checkboxes and all related CSS (`.checkbox-list`, `.checkbox-item` styles)
- `getVariant()` returns just the network radio value (`wifi` or `ethernet`)
- Remove `getNetMode()` since WiFi always has BLE now; the Network & Logs tab always shows the BLE discovery message for WiFi
- Remove the `net-mode-wifi` serial-only provisioning section (BLE is always available for WiFi)
- Keep `net-mode-wifi-ble` (rename to `net-mode-wifi`) and `net-mode-ethernet`

### CI Workflows

- **`firmware.yml`**: Change matrix to `["wifi","ethernet"]` for main-push builds; keep `["wifi"]` for PR builds
- **`firmware-release.yml`**: Change matrix to `["wifi","ethernet"]`

### VS Code Tasks

Update `.vscode/tasks.json` `firmwareVariant` input to offer only `["wifi", "ethernet"]`.

### Dev Builds

The memory note says dev builds use `wifi` (not `wifi-ble-co2`) because BLE is too slow. After this change, the `wifi` variant will include BLE. For dev iteration, developers can add `bluetooth_enabled: false` as a substitution override in a local `secrets.yaml` or pass it on the command line. No code change needed -- just a note in the commit message or a comment in `wifi.yaml`.

### OTA Updates for Existing Users

Existing devices running e.g. `wifi-ble-co2` firmware will have their OTA update URL pointing to `everything-presence-pro-wifi-ble-co2-manifest.json`. That URL will 404 after the next release since we stop publishing it. These users will need to reflash via USB using the web flasher. This is acceptable since this is a pre-release product with a small user base. No backwards compatibility code is needed.

## Testing

1. **Compile check**: `esphome compile firmware/variants/wifi.yaml` and `esphome compile firmware/variants/ethernet.yaml` both succeed
2. **Flash test**: Flash `wifi` variant to a physical device via USB, verify BLE discovery works in HA and CO2 sensor reports data
3. **Web flasher**: Open `tools/firmware-builder/index.html` locally, verify only WiFi/Ethernet toggle is shown, manifest URLs are correct, install button works
4. **CI dry run**: Push to a test branch, verify firmware workflow builds only 2 variants
