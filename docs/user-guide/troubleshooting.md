# Troubleshooting

This page handles the conceptual "why does X behave this way?" questions that don't fit a feature page, and walks through how to collect diagnostics and open a GitHub issue when something's actually broken. For specific symptom-based fixes (e.g. "my automation isn't firing", "targets drift", "HACS install doesn't show up"), jump to the relevant feature page's Troubleshooting section — the list at the bottom of this page links to each one.

## FAQ

**Why is my CO2 sensor showing `unavailable`?**

The SCD4x CO2 sensor is disabled by default in Home Assistant — enable it on the device page to get readings. It also takes about 5 minutes after power-on to warm up; until then it reports `unavailable` even once enabled.

**Do I need to use all the exposed entities?**

No. Most users want only **Occupancy**, the per-zone presence entities (for zones they care about), and the environmental sensors. **Motion Presence** and **Static Presence** are debug-visibility entities showing which specific component is contributing to Occupancy — leave them disabled unless you need that level of detail.

**Do I need to re-calibrate if I just rename a zone?**

No. Calibration is per-device and independent of zone names. Only re-calibrate if the sensor has moved, the room has been rearranged, or you've swapped the hardware.

**What's the difference between `Zone Rest of Room` and `Occupancy`?**

`Zone Rest of Room` (zone 0) fires when a target is in the room but outside any named zone. `Occupancy` is the combined "any presence signal, anywhere in the room" output from the firmware — it fires whenever the PIR (passive infrared) motion sensor, LD2450, or SEN0609 reports presence. They overlap but aren't the same: use Occupancy as the fast trigger for general automations, not zone 0.

**Why do my zone entities disappear from HA when I delete a zone?**

Expected behaviour. Deleting a zone in the panel removes its cells from the device's config; the integration auto-disables the corresponding `zone_<N>_presence` and `zone_<N>_target_count` entities because they no longer have meaning. Recreate the zone in the same slot to get them back; Home Assistant remembers previously-tracked entities by unique ID.

**Why doesn't the integration see my device?**

The integration only picks up devices running Everything Presence Pro Grid firmware. It looks for a **Firmware Version** sensor on the ESPHome device — if that sensor doesn't exist, the device is still running the original firmware. The flasher tab in the panel can see devices on original firmware (so you can upgrade them), but the main device list won't include them until they've been flashed.

**What's the max number of zones?**

Seven named zones, plus zone 0 ("Rest of Room") as the always-present fallback. The **Add zone** button greys out when all seven named-zone slots are used.

**Does ceiling-mounting ever work?**

No. The LD2450's 35° pitch cone only reaches a small circle of floor directly below a ceiling-mounted device — most of the room ends up in the sensor's blind spot. The sensor is designed for wall mounting. See [Placement](placement.md) for the full argument.

## Getting help

If none of the per-page troubleshooting tables covers your problem, the next step is to collect diagnostics and open a GitHub issue.

### Collect diagnostics first

1. In Home Assistant, go to **Settings → Devices & Services**.
2. Find **Everything Presence Pro Grid** in the integration list.
3. Click the three-dot menu on the integration card → **Download diagnostics**.
4. Save the JSON file; you'll attach it to the GitHub issue.

The diagnostics dump contains the integration's device config, entity states, and any recent error traces — without it, most issue reports can't be debugged.

!!! example "Screenshot placeholder"
    **The HA diagnostics download menu on the integration card.** `troubleshooting/diagnostics-download.png`

### Open a GitHub issue

There isn't a repo-level issue template yet, so include the following in the issue description:

- **Home Assistant version** (e.g. 2025.3.2)
- **Everything Presence Pro Grid integration version** (from HACS or `manifest.json`)
- **Device firmware version** (from the device's Firmware Version sensor)
- **Steps to reproduce** — numbered, starting from a known state
- **Expected vs actual behaviour**
- **Diagnostics JSON** — attach the file from the previous step
- **Relevant HA log excerpts** (if any) — check Settings → System → Logs, filter for `eppgrid`

Open the issue at [github.com/clintongormley/everything-presence-pro-grid/issues](https://github.com/clintongormley/everything-presence-pro-grid/issues).

## Where to look first

Pick the feature that most closely matches where things are going wrong:

- **[Installation](installation.md#troubleshooting)** — HACS install, panel not appearing in the sidebar.
- **[Flashing firmware](flashing-firmware.md#troubleshooting)** — USB flash failures, browser picker empty, device not showing in HA after flash.
- **[Firmware upgrades](firmware-upgrades.md#troubleshooting)** — OTA errors, integration/firmware version mismatches.
- **[Calibration](calibration.md#troubleshooting)** — wizard capture issues, skewed grids after save.
- **[Zones](zones.md#troubleshooting)** — missing zone entities, zones never firing, zone flapping.
- **[Overlays](overlays.md#troubleshooting)** — paint refused, ghosts persisting despite overlays.
- **[Furniture](furniture.md#troubleshooting)** — items not appearing, rotation handle missing.
- **[Live view](live-view.md#troubleshooting)** — blank grid, drifting targets, sensors missing from sidebar.
- **[Automations](automations.md#troubleshooting)** — entities not firing, wrong triggers, timing surprises.

Looking for contributor documentation? See [Developers](../developers/index.md) for the codebase walkthrough and contribution guide.
