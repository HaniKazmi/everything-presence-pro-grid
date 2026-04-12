# Live view

The live view is the default content of the Device Configuration tab when you're not in an editor mode. It shows the calibrated grid with your zones, overlays, and furniture in place, and updates live as the sensor tracks targets. This page covers how to read it.

## The grid

The grid is a top-down view of your room after calibration. Each cell is the unit of detection; the zone engine decides presence and target counts in terms of cells.

- Zones are drawn as coloured regions using the colour you picked in the zones editor.
- Overlays show as hatched patterns: Entry/Exit cells use a grey 45° diagonal stripe; Interference cells use a single red -45° diagonal stripe; Suppress cells use red cross-hatching (both diagonals).
- Furniture sits on top of zones and overlays as a visual layer.
- Below the grid, the panel shows the room's width × depth plus the distance to the furthest point the sensor can still track (useful for sanity-checking that important corners are inside the LD2450's 6-metre tracking range).

!!! example "Screenshot placeholder"
    **Live view showing a dressed room with multiple zones, a couple of overlays, and two live target markers.** `live-view/populated.png`

## Target markers

The LD2450 tracks up to 3 targets at a time. Each is drawn as a dot on the grid:

- **Per-target colours** — each tracked target slot has its own colour from a fixed palette, so you can tell separate targets apart at a glance. The colour identifies the slot, not the movement state; it stays the same as the target moves around.
- **Optional signal label** — a target may show its signal-strength value as a small label next to the dot.

Targets move smoothly because the firmware applies a rolling-median filter before the perspective transform. Jitter you occasionally see is real radar noise, not a bug.

## Zone occupancy glow

When a zone is occupied, its colour brightens and gets a subtle glow. This is the most direct visual confirmation that automations are about to fire for that zone — if the glow is on, the corresponding `binary_sensor.<device>_zone_N_presence` entity in Home Assistant is `on`.

A good sanity-check workflow when setting up automations:

1. Walk into the zone.
2. Look at the live view — does the zone glow?
3. Check Home Assistant — is the entity on?

If step 2 happens but step 3 doesn't, it's usually the Zone Presence device toggle that's off. See [Zones](zones.md#entities-exposed-in-home-assistant).

## Environmental sensors

The live sidebar next to the grid has an **Environment** section. It's not overlaid on the grid — it's a side panel with live readings from the device's environmental sensors:

- **Illuminance** (lux)
- **Temperature** (°C)
- **Humidity** (%)
- **CO2** (ppm) — only shown if the CO2 entity has been enabled on the device in Home Assistant

These read directly from the firmware entities described in [First boot](getting-started/first-boot.md); the live view just displays them in one place for convenience. If a value is missing from the sidebar, check that the corresponding entity is enabled on the device page in Home Assistant.

!!! example "Screenshot placeholder"
    **Close-up of the Environment section in the live sidebar.** `live-view/environment-sidebar.png`

## Connection and firmware-status banners

When something's wrong, the live grid is replaced by a banner rather than being shown with stale data.

- **Offline device** — a connection banner tells you the device has dropped off the network. The grid is hidden until the device reconnects. If this sticks, check that the device is still powered and on the network.
- **Firmware / integration version mismatch** — a protocol banner appears when the integration is older than the device firmware, or vice versa. The banner explains which side to update. Usually: open HACS to update the integration, or the Flash Firmware tab to OTA-update the device.

## Troubleshooting quick checks

If something in the live view looks wrong, the most common causes:

- **Grid is skewed, or targets drift outside walls.** → the calibration needs redoing. See [Calibration](getting-started/calibration.md).
- **No target markers at all, but someone's moving.** → check the device is online (no connection banner); check Home Assistant's binary sensors (Occupancy, Motion Presence, Static Presence) are firing; try power-cycling the device.
- **Ghost detections near a fixed fixture.** → add an Interference overlay at that cell. If Interference isn't strong enough, escalate to Suppress. See [Overlays](overlays.md).
- **Real targets show up fine but zones don't glow.** → Zone Presence is turned off at the device level. See [Zones](zones.md#entities-exposed-in-home-assistant).

## Where to next

- **[Automations →](automations.md)** — put it all to use: worked examples for bathroom and bedroom automations in Home Assistant.
- **[Firmware →](firmware.md)** — keep firmware up to date over the air, or flash a fresh device.
