# First boot

Once Everything Presence Pro Grid has paired with your device, you're ready to open the panel and take a look around. This page covers what you'll see in the panel on first open and which entities Home Assistant has created for you.

## The panel

Open **Everything Presence Pro Grid** from the Home Assistant sidebar. The panel has two top-level tabs:

- **Device Configuration** — the default view and where you'll spend most of your time. Once the device is calibrated, this view shows the live grid, your zones and overlays, and editors for each. On first boot, before calibration has been run, the Device Configuration tab opens into the calibration wizard with the uncalibrated field-of-view shown — the calibrated grid appears only after you complete calibration.
- **Flash Firmware** — the firmware flasher. You don't need this for day-to-day use; it's for flashing new devices or updating firmware on existing ones. See [Firmware](../firmware.md) for more.

Once calibrated, the Device Configuration tab has a sidebar that switches between three editing modes: **Zones**, **Overlays** (entrance/exit and interference), and **Furniture**. All three are empty until you use them.

!!! example "Screenshot placeholder"
    **The Device Configuration tab on first boot — uncalibrated field-of-view with the calibration wizard, before any zones, overlays, or furniture exist.** `first-boot/panel-first-open.png`

## Default entities

Everything Presence Pro Grid does not create Home Assistant entities itself. All entities come from the device firmware, and Home Assistant registers them via the ESPHome integration. The integration's role is to expose or hide entities based on what you have configured in the panel.

What you get on first boot, from the firmware:

**Diagnostic**

- **Firmware Version** — the firmware build currently running on the device. The integration compares this against its own expected `FIRMWARE_VERSION` to decide whether it can talk to the device safely.
- **Firmware Update** — an ESPHome update entity that reports whether a newer firmware is available and performs the OTA when triggered. Visible on HA's Updates dashboard as well as inside the panel.

**Environmental**

- **Illuminance** (from the BH1750 sensor, in lux). Enabled by default.
- **Temperature** (from the SHTC3 sensor, in °C). Enabled by default.
- **Humidity** (from the SHTC3 sensor, as a percentage). Enabled by default.
- **CO2** (from the SCD4x/SCD40 sensor, in ppm) — present on both current firmware variants, but **disabled by default**. Enable it from the device page in Home Assistant if you want CO2 readings.

**Presence**

- **Occupancy** — the main presence binary sensor. Enabled by default. This is the one you'll typically automate against for "is someone in the room".
- **Motion Presence** — a motion-oriented presence binary sensor (LD2450 motion stream). Disabled by default.
- **Static Presence** — a static-presence binary sensor backed by the SEN0609 module, for still-but-breathing occupants. Disabled by default.

The internal PIR is used by the firmware as input to the on-chip presence logic but is not exposed to Home Assistant as its own entity.

**Zone entities**

- **Zone 0 Presence** through **Zone 7 Presence** (binary sensors; entity IDs like `binary_sensor.<device>_zone_0_presence`).
- **Zone 0 Target Count** through **Zone 7 Target Count** (sensors; entity IDs like `sensor.<device>_zone_0_target_count`).

In Home Assistant, these appear with the usual domain and device-name prefixes; the display names above are what you'll see in the UI. Most zone pairs are disabled on first boot and only become enabled once you configure the corresponding zone in the zone editor and turn on the relevant toggles in settings. **Zone 0** is reserved as the fallback zone ("rest of room") and catches any target that isn't inside a named zone; the calibration wizard may enable it automatically when zone presence is turned on.

!!! note
    Everything Presence Pro Grid's design is opt-in. You get the environmental and default-presence sensors straight away, while the motion/static-presence and zone entities are only enabled once you actively configure them. This keeps your Home Assistant entity registry uncluttered when you have several devices and use a subset of features on each.

## What's not exposed by default

Raw LD2450 target coordinates are not published as HA entities. The zone engine on the device consumes them directly and publishes higher-level state (zone presence, target count) instead. If you want the raw target stream for debugging or custom integrations, you can enable it in the panel's settings; the integration will then expose the target entities that ESPHome already publishes.

## Where to next

- **[Calibration →](calibration.md)** — run the four-corner wizard so the grid matches the real geometry of your room. This is the single most important thing to do before creating zones.
