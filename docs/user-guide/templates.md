# Templates

A template is a saved snapshot of a room layout — grid, zones, overlays, and furniture — that you can reuse on any device. Useful when you have multiple sensors covering similar rooms (a guest bedroom matching the main bedroom, a stack of identical offices, a cluster of meeting rooms) or when you want to park a configuration before experimenting and roll back cleanly.

Templates are **global to the Home Assistant instance**, not tied to a single device. Save a template from one device, load it on another.

## Saving a template

1. Get the current device's layout how you want it — calibration, zones painted, overlays marked, furniture placed.
2. Open the sidebar overflow menu (⋯) and click **Save template**.
3. Enter a name and click **Save**. The template is stored in the integration's storage and appears in every device's Load dialog from that point on.

![Save template dialog.](../images/templates/save-dialog.png "Save template dialog.")

!!! example "Screenshot placeholder"
    **Overflow menu showing Save template and Load template entries.** `templates/overflow-menu.png`

## Loading a template

1. Open the sidebar overflow menu and click **Load template**. A grid of saved templates appears, each with a thumbnail showing its zones and furniture, and the room's calibrated dimensions.
2. Click a template card to apply it. The panel immediately replaces the current grid, zones, overlays, and furniture with the template's contents and pushes the new config to the device.

There's no confirmation dialog and no "preview" — clicking a card applies it straight away. If you want to keep the current layout before trying something new, save it as a template first.

!!! example "Screenshot placeholder"
    **Load template dialog with a grid of thumbnails.** `templates/load-dialog.png`

## Deleting a template

Open the Load template dialog, hover a template card, and click the **×** in the top-right corner. The template is deleted immediately — no confirmation, no undo. Deleting a template only removes it from the library; any device that previously had it applied keeps its current layout.

## What a template contains

| Saved in template | Not saved in template |
| --- | --- |
| Room boundary and dimensions (width × depth) | Device calibration (perspective corners) |
| Zone cells, names, colours, and type | Custom-zone thresholds for *non-custom* zones |
| Overlays (Entry/Exit, Interference, Suppress) | Device-level settings — motion timeout, target distances, LED behaviour, relay, entity toggles, environmental offsets |
| Furniture placement | |
| Custom-zone thresholds for **Custom** zones only | |

A few details worth knowing:

- **Calibration does not transfer.** Template loading skips the four-corner calibration — that's specific to how each individual sensor is mounted in its room. Calibrate each device separately. The template carries the resulting room *dimensions* so the grid lines up, but not the perspective transform.
- **Zone thresholds behave differently for Custom vs built-in types.** When you save a template, the built-in zone types (Default, Bed, Seating, Transit) store only the type name; the thresholds come from the defaults table at load time. Custom zones, on the other hand, store their four thresholds (Trigger, Renew, Presence timeout, Handoff timeout) explicitly and restore them exactly. If you tune a zone as Custom and expect that tuning to travel with the template, it does.
- **Device settings are per-device.** Anything configured under [Settings](settings/index.md) — detection timeouts, LED/relay, enabled entities — is not part of the template. Configure those once per device.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Load template dialog says "No templates" | No template has been saved on this Home Assistant instance yet, or you're looking at a different HA instance | Save a template first from any device. Templates are shared across all devices in the same HA instance. |
| Template loads but room dimensions don't match the device | The template was saved on a device with a different calibrated room size | Either re-calibrate the device to match, or save a fresh template from the correctly-calibrated device. |
| Loaded a template but the sensor behaves differently to the source device | Device-level settings (motion timeout, detection thresholds, etc.) aren't part of templates | Match the source device's [Settings](settings/index.md) manually. Only grid, zones, overlays, and furniture travel with a template. |
| "Template is in an old format — please re-save it" error when loading | Template was saved by a pre-v0.94 version of the integration | Re-create the template from a current device layout. Old templates can't be auto-migrated. |

See also: the [central Troubleshooting](troubleshooting.md) page for conceptual FAQ and how to open a GitHub issue.

## Where to next

- **[Settings →](settings/index.md)** — configure the per-device options that templates don't carry.
