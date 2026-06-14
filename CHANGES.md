# Changelog

User-facing changes to Everything Presence Pro Grid. For full release assets
and firmware downloads, see the
[GitHub releases page](https://github.com/clintongormley/everything-presence-pro-grid/releases).

## v1.1.0 — 2026-06-14

### New features

- **Device Groups.** Combine several Everything Presence Pro Grid devices into
  one logical presence sensor. A group exposes merged presence and per-zone
  sensors under a single Home Assistant device and turns on whenever any member
  device detects presence — so a room covered by several radars reports one
  occupancy entity. Set groups up on the new **Device Groups** page, with an
  optional "rest of room" zone, cross-device zone merging, and area assignment.
- **Configurable sensor-assisted clear.** You can now control how the zone
  engine clears pending zones when a room empties. A per-device toggle (on by
  default) and a grace delay (0–600 seconds; 0 clears immediately) replace the
  previous always-immediate behaviour. Turning the toggle off falls back to
  each zone's own clear timeout.
- **Zone colour presets.** Recolouring a zone opens a palette of preset
  swatches, with a marker showing colours already used by another zone. The
  system colour picker is still available as a custom-colour option.

### Improvements

- The Logging settings always show the **Bluetooth** and **CO₂** log-level
  rows instead of hiding them based on the build.

### Fixes

- Setting the firmware **System** log category to Debug no longer floods the
  log with messages from other categories.

### Documentation

- Added a Device Groups guide.
- Documented that the motion sensor's detection range cannot be tuned, with
  corner-mount placement advice for avoiding detections through open doorways.
