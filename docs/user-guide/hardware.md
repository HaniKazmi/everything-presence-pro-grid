# Hardware

An Everything Presence Pro device is a small sensor cluster, not a single chip. It carries two different mmWave radars, a PIR (passive infrared) motion sensor, environmental sensors (illuminance, temperature, humidity, CO2), and a network interface. Everything Presence Pro Grid's reliability comes from using all of them together — no single sensor is enough on its own. This page covers what each one does and how they complement each other.

## Motion — fast infrared motion sensor

A traditional PIR (passive infrared) motion sensor ([Panasonic EKMC1603111](https://industrial.panasonic.com/ww/products/pt/papirs/models/EKMC1603111)) is mounted on the device as a low-latency trigger. It sees heat-signature movement and reacts faster than either mmWave radar.

- **Field of view:** 102° azimuth × 92° pitch.
- **Detection segments:** 92 (lens elements that divide the field of view into discrete sensing zones).
- **Detection range:** up to 12 m.
- **Strength:** sub-second latency on entry, and a wider field of view than either radar.
- **Weakness:** triggers only on heat-signature movement; goes quiet within seconds of stillness.

## The mmWave radars

The device carries two mmWave radars, each for a different job.

### LD2450 — movement tracker

The [LD2450](https://www.tinytronics.nl/product_files/006000_HLK-LD2450-Instruction-Manual.pdf) is the workhorse. It's a phase-coded mmWave radar that reports 2D coordinates for each of three moving target it sees. Everything Presence Pro Grid uses those coordinates to drive zone detection and target-count entities.

- **Field of view:** 120° azimuth × 35° pitch.
- **Tracking depth:** up to 6 m.
- **Concurrent targets:** up to 3.
- **Strength:** multi-target tracking with real coordinates.
- **Weakness:** loses people who are genuinely still (reading, sleeping) after a few seconds, because the tracking relies on frame-to-frame radar signal changes.

### SEN0609 — static-presence radar

The [SEN0609](https://docs.rs-online.com/b042/A700000013081548.pdf) is a DFRobot static-presence mmWave module that fills in where the LD2450 drops off. It reports binary presence only — "someone is here" or "not here" — with no coordinates.

- **Field of view:** 100° azimuth × 40° pitch.
- **Range:** up to 16 m.
- **Strength:** catches still-but-breathing occupants (reading, sleeping, showering) that the LD2450 loses. Much longer range than the LD2450's tracking circle.
- **Weakness:** no per-target information — just a single room-wide presence signal.

## Environmental sensors

Three environmental sensors ride along with the presence sensors. They're independent of presence detection — they just report room state.

- **BH1750** — digital lux meter for illuminance. Enabled by default.
- **SHTC3** — temperature and humidity sensor. Both enabled by default.
- **SCD4x / SCD40** — CO2 sensor. **Optional add-on** — not included with the device. Fit it yourself following the [installation guide](https://docs.everythingsmart.io/s/products/doc/integrate-the-carbon-dioxide-co2-module-biegKGfCWu). Disabled by default in Home Assistant; enable it from the device page once fitted.

!!! note
    The device runs warm, and ceiling or upper-corner mounting puts it where heat collects. Temperature and humidity readings skew higher than actual room conditions — useful for trends and deltas, but not reliable for climate control.

## LED and relay

The device has a front LED which can reflect device state (occupancy, CO2 level) or be driven directly from your own automations. It also has a solid state relay output which can be used to make the device a smart sensor in your alarm system.

See the [hardware overview](https://docs.everythingsmart.io/s/products/doc/hardware-overview-gqc0XAh0e5) for relay wiring and ratings.

## Connectivity

The two current firmware variants differ only in which network interface is active:

- **`wifi-ble-co2`** — Wi-Fi. Needs SSID and password at flash time.
- **`ethernet-ble-co2`** — Ethernet. Plug in, power up, and the device shows up on the LAN. Supports Power over Ethernet (PoE), so a single cable handles data and power.

Both variants also include **Bluetooth LE**. Home Assistant exposes each device as a Bluetooth proxy for nearby BLE devices (temperature tags, buttons, presence badges). If you've got BLE hardware scattered around the house, each Everything Presence Pro device effectively becomes another reception point.

## How the sensors complement each other

Each sensor has a blind spot that at least one other covers:

- **Motion** sees heat-signature movement with the lowest latency.
- **LD2450** sees movement with coordinates, inside 6 m.
- **SEN0609** sees stillness without coordinates, out to 16 m.
- **Environmental sensors** report room state independently of presence.

![Azimuth coverage — LD2450, SEN0609, Motion overlaid at the same scale.](../images/hardware/azimuth-coverage.svg){ width="100%" }

![Pitch coverage — LD2450, SEN0609, Motion overlaid at the same scale.](../images/hardware/pitch-coverage.svg){ width="100%" }

The **Occupancy** binary sensor you'll typically automate against in Home Assistant is the *combined* output of all the presence signals — not any one sensor alone. That's why the device is a cluster rather than just an LD2450 board: each sensor individually has failure modes that the others cover.

A concrete example: someone walks into a bedroom, climbs into bed, and stays still while reading. The motion sensor catches the entry in a fraction of a second. The LD2450 tracks them moving to the bed. When they settle in and stop moving, the LD2450 drops them — but the SEN0609 keeps the room marked as occupied, so the lights don't turn off. The BH1750 reports falling illuminance as the sun sets, which you can use to trigger a reading light; the SHTC3 reports the room's temperature and humidity for the thermostat.

## Where to next

- **[Installation →](installation.md)** — install the integration and start flashing.
