# Introduction

Everything Presence Pro Grid is a Home Assistant custom integration for the Everything Presence Pro mmWave radar sensor. It replaces the default firmware with a perspective-calibrated grid, on-chip zone processing, and a live visual panel that tells you what the sensor is actually seeing.

This page covers why it exists, what it does differently from the default firmware, and the design principles that guided its development.

!!! example "Screenshot placeholder"
    **Hero shot — the live view panel showing a calibrated room grid with active zones, target markers, and furniture overlay.** `introduction/hero.png`

## The problem

If you have used an Everything Presence Pro device with the default firmware, or any raw LD2450-based setup, you have probably run into some combination of the following:

- **Zones are defined in sensor-space rectangles, but sensor space is distorted.** The LD2450 reports target positions in its own polar-derived coordinate system. Straight physical lines — walls, the edge of a bed, the run of a sofa — are **not straight** in sensor space. A rectangular zone in that space does not map to a rectangular region of your room. You end up eyeballing zone boundaries and accepting that they will cover more (or less) than you intended.
- **Angle accuracy is poor.** Without calibration, target positions drift, especially near the edges of the field of view.
- **Native resolution is coarse** — roughly 30 cm — which makes small zones unreliable.
- **Default firmware caps you at four zones plus two exclusion zones.** Fine for a small room, cramped anywhere else.
- **High-frequency target streams flood Home Assistant.** The default firmware publishes raw target positions continuously, producing log churn, network traffic, and a long list of entities you didn't ask for.
- **You cannot see what the sensor is actually deciding.** You get the output — occupied or not — without any visibility into why.

!!! example "Screenshot placeholder"
    **Before/after comparison — a distorted rectangular zone in raw sensor space next to the same room mapped onto a perspective-corrected grid.** `introduction/before-after.png`

## What Everything Presence Pro Grid does differently

### Perspective-corrected grid

A four-corner calibration wizard maps the distorted radar view onto a rectilinear room grid. You point the wizard at the four corners of your room; it computes a perspective transform that unwarps the sensor's view into something that matches the physical floor plan. Walls are straight again, and targets sit where they actually are.

!!! example "Screenshot placeholder"
    **Calibration wizard capturing the four corners of a room, showing the resulting grid overlay.** `introduction/calibration-wizard.png`

### Rolling-median smoothing

Raw target positions are noisy frame to frame. A rolling median filter on each target stream removes outliers before the perspective transform, so movement is smooth and spurious positions do not create ghost activity.

### Finer effective resolution

Grid cells on the corrected view are finer than any rectangular zone in raw sensor space — and they describe regions of the physical room, not regions of the sensor's coordinate system.

### Seven named zones

Up to seven zones — versus four in the default firmware — each with its own occupancy, motion, and target-count entities. Each zone has a name, a colour, a behaviour type (Normal, Thoroughfare, Rest, or Custom), and optional furniture on the grid for visual context.

!!! example "Screenshot placeholder"
    **Zone editor with seven zones painted on the grid, each a different colour.** `introduction/zone-editor.png`

### Entrance/exit overlay

Mark doorways on the grid. Targets that appear or disappear near entry or exit cells are classified as expected events — someone walking in or out — rather than as ghosts or sudden occupancy changes. Zones near doors stop flapping every time someone crosses a threshold.

### Interference source overlay

Some ghost detections have obvious causes: a ceiling fan, a curtain, a reflective surface. Mark them as interference sources on the grid so detections near them are explainable and suppressible.

### Intelligent target tracking with zone handoff

Radar doesn't track targets perfectly frame to frame — targets briefly vanish and reappear, sometimes in an adjacent cell. Naive zone logic would treat every blip as an occupancy change. The zone engine tracks target identity across the grid: when a target disappears from one zone and reappears in an adjacent zone shortly after, it's treated as a single zone-to-zone handoff rather than one zone emptying and another filling independently. Combined with the entrance/exit overlay, this keeps zone occupancy stable under noisy tracking.

### Zone engine on the chip

The zone engine runs in firmware on the ESP32. Home Assistant receives state changes — "kitchen zone became occupied" — not raw target streams. Network noise drops, log churn drops, and HA only sees the events you care about.

### Furniture editor

Drop furniture onto the grid so you (and future you) understand what the grid means at a glance. Furniture is overlay-only — it doesn't change detection — but it makes the live view interpretable as an actual room rather than coloured cells.

!!! example "Screenshot placeholder"
    **Furniture editor with furniture placed against the zone layout.** `introduction/floor-plan.png`

### Integrated firmware flasher and OTA

Flash the initial firmware and push over-the-air updates from the HA panel. No ESPHome Builder dance, no YAML editing.

### Live view

A live panel in Home Assistant shows the grid, the active zones, the tracked targets, and the overlays — in real time. Ghost detections become explainable: you can see the noise source, see the target position, and decide whether to add an interference overlay or tune sensitivity.

!!! example "Screenshot placeholder"
    **Live view — targets moving across zones, with overlays visible.** `introduction/live-view.png`

## Design principles

Eight principles guided the design. They are held to across changes.

1. **It just works, yet is fully configurable.** Sensible defaults mean a new user gets a working setup without reading docs. Everything is exposed to advanced users who want to tune it.

2. **Low network noise.** Publish events and state changes, not continuous target streams. Your HA database and event bus stay quiet.

3. **Low impact on Home Assistant.** You opt in to the entities you want. Unused features do not clutter the entity registry.

4. **Processing on the chip.** Compute where it is cheap — the ESP32 — not where it is expensive (Home Assistant). The zone engine runs in firmware.

5. **Local-first.** No cloud, no external services, no telemetry. Everything runs on your network.

6. **Observable.** The frontend shows what the firmware is actually doing, live. Nothing is hidden behind a black box.

7. **Frontend/firmware parity.** The frontend's zone engine is kept in sync with the firmware's, so previews in the editor match real-world behaviour.

8. **Calibration over hardware.** Accuracy comes from math — the perspective transform and the rolling median — not from a more expensive sensor.

## Where to next

- **[Hardware →](hardware.md)** — what's inside the device, and why.
- **[Installation →](installation.md)** — install the integration and set up your hardware.
- **[Getting started →](getting-started/pairing.md)** — pair your device, first boot, walk through calibration.
