---
hide:
  - navigation
  - toc
---

# Everything Presence Pro Grid

**Room-level presence detection that actually knows where your walls are.**

Everything Presence Pro Grid is a Home Assistant custom integration for the Everything Presence Pro mmWave radar sensor. It replaces the default firmware with a perspective-calibrated grid, up to seven named zones, on-chip zone processing, and a live visual panel — so you know what the sensor sees, why it decided what it did, and your automations fire on events rather than raw radar noise.

!!! example "Screenshot placeholder"
    **Hero shot — the live view panel showing a calibrated grid with active zones and target markers.** `index/hero.png`

[Install](user-guide/installation.md){ .md-button .md-button--primary }
[Getting started](user-guide/getting-started/pairing.md){ .md-button }

---

## Why EPP Grid?

- **Perspective-corrected grid.** A four-corner calibration wizard maps the distorted radar view onto a rectilinear room grid. Walls are straight, targets sit where they actually are.
- **Seven named zones** with per-zone occupancy, motion, and target-count entities — plus entrance/exit overlays and interference-source overlays.
- **Processing on the chip.** The zone engine runs on the ESP32. Home Assistant receives state changes, not raw streams.
- **Observable.** The frontend shows exactly what the firmware is deciding, live.

[Read the full introduction →](user-guide/introduction.md)

## For developers

Architecture, data catalog, and contribution guide for the integration itself live under [Developers](developers/index.md).
