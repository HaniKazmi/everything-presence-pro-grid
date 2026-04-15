# Live overview

The live overview is the default content of the Device Configuration tab when you're not in an editor mode. It shows the calibrated grid with your zones, overlays, and furniture in place, and updates live as the sensor tracks targets. This page covers how to read it.

## The grid

The grid is a top-down view of your room after calibration. Each cell is the unit of detection; the zone engine decides presence and target counts in terms of cells.

- Zones are drawn as coloured regions using the colour you picked in the zones editor.
- Overlays show as hatched patterns: Entry/Exit cells use a grey 45° diagonal stripe; Interference cells use a single red -45° diagonal stripe; Suppress cells use red cross-hatching (both diagonals).
- Furniture sits on top of zones and overlays as a visual layer.
- Below the grid, the panel shows the room's width × depth plus the distance to the furthest point the sensor can still track (useful for sanity-checking that important corners are inside the LD2450's 6-metre tracking range).

!!! example "Screenshot placeholder"
    **Live overview showing a dressed room with multiple zones, a couple of overlays, and two live target markers.** `live-overview/populated.png`

## Target markers

The LD2450 tracks up to 3 targets at a time. Each is drawn as a dot on the grid:

- **Per-target colours** — each tracked target slot has its own colour from a fixed palette, so you can tell separate targets apart at a glance. The colour identifies the slot, not the movement state; it stays the same as the target moves around.
- **Optional signal label** — a target may show its signal-strength value as a small label next to the dot.

Targets move smoothly because the firmware applies a rolling-median filter before the perspective transform. Jitter you occasionally see is real radar noise, not a bug.

## Zone occupancy glow

When a zone is occupied, its colour brightens and gets a subtle glow. This is the most direct visual confirmation that automations are about to fire for that zone — if the glow is on, the corresponding `binary_sensor.<device>_zone_N_presence` entity in Home Assistant is `on`.

A good sanity-check workflow when setting up automations:

1. Walk into the zone.
2. Look at the live overview — does the zone glow?
3. Check Home Assistant — is the entity on?

If step 2 happens but step 3 doesn't, it's usually the Zone Presence device toggle that's off. See [Detection zones](detection-zones.md#entities-exposed-in-home-assistant).

## Environmental sensors

The live sidebar next to the grid has an **Environment** section. It's not overlaid on the grid — it's a side panel with live readings from the device's environmental sensors:

- **Illuminance** (lux)
- **Temperature** (°C)
- **Humidity** (%)
- **CO2** (ppm) — only shown if the CO2 entity has been enabled on the device in Home Assistant

These come from the firmware's environmental entities; the live overview just shows them in one place. If a value is missing, the corresponding entity is disabled on the device page.

!!! example "Screenshot placeholder"
    **Close-up of the Environment section in the live sidebar.** `live-overview/environment-sidebar.png`

## What you get by default

Once the device is connected and calibrated, Home Assistant has these entities ready. Some are enabled out of the box; others light up as you configure zones or flip the relevant device toggle.

**Diagnostic**

- **Firmware Version** — the firmware build currently running on the device.
- **Firmware Update** — the ESPHome update entity that handles OTA upgrades.

**Environmental**

- **Illuminance** (lux), **Temperature** (°C), **Humidity** (%) — enabled by default.
- **CO2** (ppm) — only if the CO2 module is fitted. Disabled by default.

**Presence**

- **Occupancy** — combined presence signal. Enabled by default. This is the one you'll usually automate against.
- **Motion Presence** — the PIR (passive infrared) sensor as a binary sensor. Disabled by default.
- **Static Presence** — the SEN0609 static-presence sensor. Disabled by default.

**Zones**

- **Zone 0 Presence** through **Zone 7 Presence** — one per zone.
- **Zone 0 Target Count** through **Zone 7 Target Count** — one per zone.

Zone pairs stay disabled until you paint the zone and enable its toggles in settings. **Zone 0** is the "rest of room" fallback — any target outside a named zone.

See [Settings → Entities](settings/entities.md) for the full list and how to enable or rename individual entities.

## Connection and firmware-status banners

When something's wrong, the live grid is replaced by a banner rather than being shown with stale data.

- **Offline device** — a connection banner tells you the device has dropped off the network. The grid is hidden until the device reconnects. If this sticks, check that the device is still powered and on the network.
- **Firmware / integration version mismatch** — a protocol banner appears when the integration is older than the device firmware, or vice versa. The banner explains which side to update. Usually: open HACS to update the integration, or the Flash Firmware tab to OTA-update the device.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Grid is blank or shows no sensor data | Device is offline | Check **Settings → Devices & Services → ESPHome** — the device should be listed and marked online. |
| Targets jump around or drift outside walls | Calibration is off | Re-run the calibration wizard. See [Calibration](calibration.md). |
| Zone colour never highlights, even when someone's in the zone | Zone Presence toggle is off at the device level, or the zone has zero cells painted | Enable **Zone Presence** on the device page; check the zone has cells in the [Detection zones](detection-zones.md) editor. |
| Target stuck on a fixed cell with nobody there | Interference source at that cell (fan, curtain, reflective surface) | Add an Interference overlay at that cell. If it's still problematic, escalate to Suppress. See [Overlays](overlays.md). |
| Environmental sensor values missing from the sidebar | Corresponding entity is disabled on the device page | Enable the entity in Home Assistant: go to the device page → entities → enable the missing one. CO2 in particular is disabled by default. |

See also: the [central Troubleshooting](troubleshooting.md) page for conceptual FAQ and how to open a GitHub issue.

## Where to next

- **[Detection zones →](detection-zones.md)** — paint named regions on the grid so each one fires its own presence entity.
