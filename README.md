# Everything Presence Pro Grid

[![Tests](https://github.com/clintongormley/everything-presence-pro-grid/actions/workflows/tests.yml/badge.svg)](https://github.com/clintongormley/everything-presence-pro-grid/actions/workflows/tests.yml)
[![HACS Validation](https://github.com/clintongormley/everything-presence-pro-grid/actions/workflows/hacs.yml/badge.svg)](https://github.com/clintongormley/everything-presence-pro-grid/actions/workflows/hacs.yml)
[![Hassfest](https://github.com/clintongormley/everything-presence-pro-grid/actions/workflows/hassfest.yml/badge.svg)](https://github.com/clintongormley/everything-presence-pro-grid/actions/workflows/hassfest.yml)

A Home Assistant custom integration for the [Everything Presence Pro](https://shop.everythingsmart.io/products/everything-presence-pro) mmWave radar sensor. It runs smoothed target tracking and zone detection on the device, and provides a panel for configuration, calibration, live view, and firmware flashing.

📖 **Full documentation:** <https://clintongormley.github.io/everything-presence-pro-grid/>

![Live overview showing a calibrated room grid with zones, target markers, and furniture overlay.](docs/images/introduction/overview.png)

## What is the Everything Presence Pro?

The Everything Presence Pro (EPP) combines three sensors:

- **PIR motion sensor** — low-latency trigger for lights the moment someone enters.
- **Target tracking radar (LD2450)** — tracks up to three targets and lets automations react to zone transitions (extractor fan on when the toilet is in use, towel rail on when someone showers).
- **Static presence radar (DFRobot SEN0609)** — detects ongoing presence through breathing-level movement, so lights don't switch off on someone sitting still.

## What this integration does differently

The stock firmware sends raw, noisy, polar-projection radar data to Home Assistant. This integration replaces that with:

- **Perspective-corrected grid.** A four-corner calibration wizard maps the sensor view onto your room. Walls are straight; zones line up with real-world geometry. Cells are 30 cm × 30 cm.
- **Seven painted zones** plus a "Rest of room" fallback. Polygonal, can be discontinuous, drawn by clicking grid cells.
- **Zone types** (`Thoroughfare`, `Bed`, …) preset sensitivity and hysteresis for the zone's purpose; `Custom` exposes the underlying parameters.
- **Cross-zone target tracking.** Targets are followed as they move between zones.
- **Overlays** for refining detection — mark doorways (Entry/Exit) and noise sources (Interference/Suppress).
- **Furniture layout.** Drop furniture stickers on the grid so the live view is readable.
- **On-chip processing.** Home Assistant gets a single `Occupancy` binary sensor plus per-zone presence sensors, instead of a stream of coordinates.
- **Rolling-median smoothing** of target positions, so radar jitter doesn't trigger ghost detections.
- **Built-in flasher** for installing and updating firmware from the panel.

![Calibration wizard capturing the four corners of a room.](docs/images/introduction/calibration-wizard.png)

## Typical entities

Most rooms only need:

- `binary_sensor.<device>_occupancy` — combines motion, static presence, and target tracking into a single presence signal.
- `binary_sensor.<device>_zone_<N>_presence` — one per named zone.
- The environmental sensors (illuminance, temperature, humidity, CO2 if fitted).

See the [Automations guide](https://clintongormley.github.io/everything-presence-pro-grid/user-guide/automations/) for worked examples.

## Installation

### HACS (recommended)

1. Open HACS in Home Assistant.
2. Add this repository as a custom repository (category: Integration).
3. Search for "Everything Presence Pro Grid" and install.
4. Restart Home Assistant.
5. Go to **Settings → Devices & Services → Add Integration** and choose **Everything Presence Pro Grid**.

### Manual

Copy the `custom_components/eppgrid` directory to your Home Assistant `custom_components` folder and restart Home Assistant.

See the [Installation guide](https://clintongormley.github.io/everything-presence-pro-grid/user-guide/installation/) for the full walkthrough, including hardware setup, placement, calibration, and firmware flashing.

## Development

Enable the repo's pre-push hook (runs format/lint/tests/coverage for Python, C++, and TypeScript):

```sh
git config core.hooksPath scripts/hooks
```

## Links

- [Documentation](https://clintongormley.github.io/everything-presence-pro-grid/)
- [Everything Presence Pro hardware](https://shop.everythingsmart.io/products/everything-presence-pro)
- [Everything Smart Technology](https://shop.everythingsmart.io/)
