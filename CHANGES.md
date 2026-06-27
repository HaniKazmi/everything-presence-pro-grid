# Changelog

User-facing changes to Everything Presence Pro Grid. For full release assets
and firmware downloads, see the
[GitHub releases page](https://github.com/clintongormley/everything-presence-pro-grid/releases).

## v1.3.0

### New features

- **Overview dashboard card.** Add a live map and/or sensor panel for any
  Everything Presence Pro Grid device directly to a Home Assistant dashboard.
  The card is configured through the visual editor — pick the device, choose
  whether to show the map, the sensors, or both, and control which sensor
  groups and map layers appear. Non-admin household users can view dashboards
  that include this card without needing admin access.

## v1.2.3 — 2026-06-24

### Fixes

- **The panel reloads itself after an update.** After Everything Presence Pro
  Grid updates to a new version, the panel now notices the new interface and
  reloads automatically, so you see the latest version instead of a stale,
  cached one. Previously you might have needed to refresh the page by hand
  after updating.

## v1.2.2 — 2026-06-22

### Fixes

- **The firmware flasher now lists devices in a predictable order.** Devices
  used to appear in whatever order they were discovered; they're now sorted
  alphabetically by name, so the same device is always in the same place.
- **Calibration controls stay inside their box on narrow layouts.** On narrow
  screens — and when the editor column tightens on desktop — the uncalibrated
  field-of-view diagram and the "Calibrate room size" button could spill
  outside their card. Both now scale and wrap to fit.

## v1.2.1 — 2026-06-21

### Fixes

- **Updating several devices at once is now reliable.** When you started
  firmware updates on multiple devices together, some could fail to start and
  stay on the old version. The panel now retries those automatically, and the
  firmware waits until the update is ready before starting, so batch updates
  complete. The automatic retry also helps devices still on older firmware; the
  firmware-side fix takes effect once they're on v1.2.1.

## v1.2.0 — 2026-06-21

### Interface

- **Redesigned, responsive interface.** The panel now works on phones and
  tablets — larger touch targets, a bottom-sheet zone editor on small screens,
  and a side-by-side editor with a full-width live grid on desktop.
- **Follows your Home Assistant theme.** Colours, surfaces, and dark mode are
  now driven by your active theme, so the panel matches the rest of Home
  Assistant instead of using fixed styling.

### New features

- **Device Groups editor redesigned.** Pick which devices to include and which
  sensors to import — toggle off any presence sensor or zone you don't need.
  Presence coverage and device availability are shown inline so you can see at
  a glance what each sensor contributes.

### Breaking changes

- **Device groups now expose a single combined Rest of room sensor** instead of
  one per source device. Automations that referenced a group's per-device
  Rest-of-room sensor should be repointed to the combined sensor, or to the
  physical device's own Rest-of-room entity.

### Improvements

- **Smoother device setup after flashing.** Once a newly flashed device is on
  your network, the panel adds it and opens a dialog to set its name and area
  straight away. The previous flow could silently skip naming when it couldn't
  match the new device, leaving the setup banner nagging.
- **Flash firmware from your browser over HTTPS.** When the in-panel USB
  flasher is unavailable — most often because you reach Home Assistant over
  plain HTTP, which browsers block from USB access — the panel now explains why
  and links to a new web flasher that runs over HTTPS and flashes either
  firmware variant directly, instead of showing a misleading "requires Chrome
  or Edge" message.
- **More reliable firmware updates.** Updates now succeed on devices that were
  low on memory and previously failed with a connection error — the device is
  restarted to free memory before the update runs. If an update still can't
  proceed for lack of memory, the panel now explains that clearly instead of
  showing a generic error.
- **Detection log now shows a readable event timeline** — zone and sensor
  transitions, room occupancy, sensor-assisted clears, stuck-target dismissals,
  and target movement — instead of a raw state dump. Requires firmware v1.2.0.

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
