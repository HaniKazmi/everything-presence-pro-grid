# First boot

Once Everything Presence Pro Grid has paired with your device, you're ready to open the panel and take a look around. This page covers what you'll see in the panel on first open and which entities Home Assistant has created for you.

## The panel

Open **Everything Presence Pro Grid** from the Home Assistant sidebar. The panel has two top-level tabs:

- **Device Configuration** — the default view. This is where you'll spend most of your time. It shows the live grid, your zones and overlays, and editors for each. On first open, the grid is visible but empty because no zones have been configured yet.
- **Flash Firmware** — the firmware flasher. You don't need this for day-to-day use; it's for flashing new devices or updating firmware on existing ones. See [Firmware](../firmware.md) for more.

Inside the Device Configuration tab, a sidebar lets you switch between three editing modes: **Zones**, **Overlays** (entrance/exit and interference), and **Furniture**. All three are empty until you use them.

!!! example "Screenshot placeholder"
    **The Device Configuration tab on first open — calibrated grid visible, no zones, no overlays, no furniture.** `first-boot/panel-first-open.png`

## Default entities

Everything Presence Pro Grid does not create Home Assistant entities itself. All entities come from the device firmware, and Home Assistant registers them via the ESPHome integration. The integration's role is to expose or hide entities based on what you have configured in the panel.

What you get on first boot, from the firmware:

**Diagnostic**

- **Firmware version** — the firmware build currently running on the device.
- **Zone engine version** — the compatibility version of the on-chip zone engine. The integration uses this to decide whether it can talk to the device.

**Environmental**

- **Illuminance** (from the BH1750 sensor, in lux).
- **Temperature** (from the SHTC3 sensor, in °C).
- **Humidity** (from the SHTC3 sensor, as a percentage).
- **CO2** (from the MH-Z19 sensor, in ppm). Both current firmware variants include the CO2 sensor.

**Presence**

- **PIR motion** — a binary sensor that goes on when the PIR detects motion.
- **Static presence** — a binary sensor backed by the SEN0609 module, which detects still-but-breathing occupants that the radar and PIR may miss.

**Zone entities (disabled by default)**

- `zone_0_presence` through `zone_7_presence` (binary sensors).
- `zone_0_target_count` through `zone_7_target_count` (sensors).

Each pair is disabled until you create the corresponding zone in the panel's zone editor and enable the relevant toggles in settings. `zone_0` is reserved as the fallback zone ("rest of room") — it catches any target that isn't inside one of your named zones.

!!! note
    Everything Presence Pro Grid's design is opt-in. You get the environmental and presence sensors straight away, but zone-specific entities only appear once you configure zones. This keeps your Home Assistant entity registry uncluttered when you have several devices and only use a few zones on each.

## What's not exposed by default

Raw LD2450 target coordinates are not published as HA entities. The zone engine on the device consumes them directly and publishes higher-level state (zone presence, target count) instead. If you want the raw target stream for debugging or custom integrations, you can enable it in the panel's settings; the integration will then expose the target entities that ESPHome already publishes.

## Where to next

- **[Calibration →](calibration.md)** — run the four-corner wizard so the grid matches the real geometry of your room. This is the single most important thing to do before creating zones.
