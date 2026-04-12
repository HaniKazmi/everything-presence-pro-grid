# Hardware

An Everything Presence Pro device is a small sensor cluster, not a single chip. It carries two different mmWave radars, a PIR motion sensor, environmental sensors (illuminance, temperature, humidity, CO2), and a network interface. Everything Presence Pro Grid's reliability comes from using all of them together — no single sensor is enough on its own. This page covers what each one does and how they complement each other.

## The mmWave radars

The device carries two mmWave radars, each for a different job.

### LD2450 — movement tracker

The LD2450 is the workhorse. It's a phase-coded mmWave radar that reports 2D coordinates for each moving target it sees. Everything Presence Pro Grid uses those coordinates to drive zone detection and target-count entities.

- **Field of view:** 120° azimuth × 35° pitch.
- **Tracking depth:** up to 6 m.
- **Concurrent targets:** up to 3.
- **Strength:** multi-target tracking with real coordinates.
- **Weakness:** loses people who are genuinely still (reading, sleeping) after a few seconds, because the tracking relies on frame-to-frame radar signal changes.

### SEN0609 — static-presence radar

The SEN0609 is a DFRobot static-presence mmWave module that fills in where the LD2450 drops off. It reports binary presence only — "someone is here" or "not here" — with no coordinates.

- **Range:** up to 16 m.
- **Strength:** catches still-but-breathing occupants (reading, sleeping, showering) that the LD2450 loses. Much longer range than the LD2450's tracking circle.
- **Weakness:** no per-target information — just a single room-wide presence signal.

!!! example "Screenshot placeholder"
    **Labelled photo or diagram of the device showing where the LD2450 and SEN0609 sit on the PCB.** `hardware/sensor-layout.png`

## PIR — fast motion trigger

A traditional passive infrared motion sensor is mounted on the device as a low-latency trigger. It sees heat-signature movement and reacts faster than either mmWave radar.

The PIR is **internal to the firmware** — it doesn't appear as its own entity in Home Assistant. Instead, the firmware combines the PIR with the two radars into the user-visible **Occupancy** binary sensor. When you see Occupancy trip almost instantly as someone walks into the room, that's the PIR contributing.

## Environmental sensors

Three environmental sensors ride along with the presence sensors. They're independent of presence detection — they just report room state.

- **BH1750** — digital lux meter for illuminance. Enabled by default.
- **SHTC3** — temperature and humidity sensor. Both enabled by default.
- **SCD4x / SCD40** — CO2 sensor (photoacoustic / NDIR class). Present on both current firmware variants, but **disabled by default** in Home Assistant. Enable it on the device page if you want CO2 readings (useful for ventilation automations and air-quality monitoring).

## Connectivity

The two current firmware variants differ only in which network interface is active:

- **`wifi-ble-co2`** — Wi-Fi. Needs SSID and password at flash time.
- **`ethernet-ble-co2`** — Ethernet. Plug in, power up, and the device shows up on the LAN.

Both variants also include **Bluetooth LE**. Home Assistant exposes each device as a Bluetooth proxy for nearby BLE devices (temperature tags, buttons, presence badges). If you've got BLE hardware scattered around the house, each Everything Presence Pro device effectively becomes another reception point.

## How the sensors complement each other

Each sensor has a blind spot that at least one other covers:

- **LD2450** sees movement with coordinates, inside 6 m.
- **SEN0609** sees stillness without coordinates, out to 16 m.
- **PIR** sees heat-signature movement with the lowest latency.
- **Environmental sensors** report room state independently of presence.

The **Occupancy** binary sensor you'll typically automate against in Home Assistant is the *combined* output of all the presence signals — not any one sensor alone. That's why the device is a cluster rather than just an LD2450 board: each sensor individually has failure modes that the others cover.

A concrete example: someone walks into a bedroom, climbs into bed, and stays still while reading. The PIR catches the entry in a fraction of a second. The LD2450 tracks them moving to the bed. When they settle in and stop moving, the LD2450 drops them — but the SEN0609 keeps the room marked as occupied, so the lights don't turn off. The BH1750 reports falling illuminance as the sun sets, which you can use to trigger a reading light; the SHTC3 reports the room's temperature and humidity for the thermostat.

!!! example "Screenshot placeholder"
    **Diagram showing the overlap of sensor coverage — LD2450 coordinates inside 6 m, SEN0609 static presence out to 16 m, PIR instant trigger, environmental sensors throughout.** `hardware/sensor-complementarity.png`

## Where to next

- **[Placement →](placement.md)** — where to physically mount the device for best coverage, given these sensor ranges and fields of view.
