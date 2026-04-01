# LED Settings Integration

## Summary

Bring LED control into the EPP Grid settings panel, replacing the firmware-side ESPHome entities with integration-managed settings that flow through the standard settings pipeline.

## Two Independent Controls

### 1. RGB LED (SK6812)

New "LED" accordion section in the settings view:

- **Mode** (select): Manual Control | Presence | Environmental | Environmental + Presence
  - Environmental options only visible when `co2Enabled: true`
- **Brightness** (slider): 10%–100%, default 100% (stored as 0.1–1.0)
- **Presence Color** (color picker): RGB hex string, default `#CC33FF` (magenta)

### 2. SEN0609 Indicator LED

- **Enabled** (toggle): on/off, default on
- Lives in the LED accordion section, visually separated
- Hardware supports on/off only (no color/brightness control)

## CO2 Environmental Thresholds (Fixed)

| CO2 Level | Color | Effect |
|-----------|-------|--------|
| < 800 ppm | Green (0%, 100%, 0%) | Steady glow |
| 800–1200 ppm | Amber (100%, 60%, 0%) | "Environmental Warning" pulse |
| > 1200 ppm | Red (100%, 0%, 0%) | "Environmental Alert" pulse |

## Data Flow

```
Frontend save → WebSocket set_settings → Backend persist → Device push
```

### Frontend → Backend

Add to `save` event detail and `set_settings` WS schema:

- `led_mode`: string — one of the four mode options
- `led_brightness`: float — 0.1–1.0
- `led_presence_color`: string — hex RGB e.g. `"#CC33FF"`
- `static_led_enabled`: bool — SEN0609 toggle

### Backend Persistence

Stored in `device_config["settings"]` alongside existing keys.

### Backend → Firmware

1. **RGB LED**: New `epp_set_led` ESPHome action
   - Parameters: `mode` (string), `brightness` (float), `presence_red` (float), `presence_green` (float), `presence_blue` (float)
   - Sets `led_mode_select`, `led_brightness_multiplier`, and presence color globals
   - Triggers `control_leds`

2. **SEN0609 LED**: Existing `epp_set_static_presence` action
   - Change `led_enabled` from hardcoded `True` to `settings.get("static_led_enabled", True)`

## Firmware Changes

### New API Action: `epp_set_led`

Accepts mode, brightness, and presence RGB. Sets the select entity, number entity, and new globals, then calls `control_leds`.

### New Globals

```yaml
globals:
  - id: presence_color_red
    type: float
    restore_value: true
    initial_value: '0.8'   # 80% = #CC
  - id: presence_color_green
    type: float
    restore_value: true
    initial_value: '0.2'   # 20% = #33
  - id: presence_color_blue
    type: float
    restore_value: true
    initial_value: '1.0'   # 100% = #FF
```

### Updated Scripts

- `control_leds_presence`: Use `presence_color_*` globals instead of hardcoded magenta
- `update_environmental_led`: Implement CO2 threshold logic (base version turns LED off; CO2 builds override)
- `control_leds_environmental_presence`: Alternate between environmental and presence display

### Logging

All LED state changes logged with `ESP_LOGD("control_leds", ...)` tag, visible via the existing "LED" log category in the settings panel.

## Frontend Changes

### Settings View

New "LED" accordion section with:
- Mode dropdown (ha-select)
- Brightness slider (input range)
- Presence color picker (input type=color)
- SEN0609 LED toggle (checkbox)

Environmental mode options conditionally rendered based on `co2Enabled`.

### Properties

New properties on `EppSettingsView`:
- `ledMode: string` — default "Manual Control"
- `ledBrightness: number` — default 1.0
- `ledPresenceColor: string` — default "#CC33FF"
- `staticLedEnabled: boolean` — default true

### Translations

Labels and tooltips for all new settings in `en.json`.

## Files Changed

| File | Change |
|------|--------|
| `firmware/common/everything-presence-pro-base.yaml` | New action, globals, CO2 thresholds, updated scripts |
| `custom_components/eppgrid/websocket_api.py` | Schema + keys for LED settings |
| `custom_components/eppgrid/device_manager.py` | Push `epp_set_led`, dynamic `led_enabled` |
| `frontend/src/components/epp-settings-view.ts` | LED accordion section, new properties |
| `frontend/src/translations/en.json` | Labels and tooltips |
| `docs/backend-data-catalog.md` | Document new settings and action |
