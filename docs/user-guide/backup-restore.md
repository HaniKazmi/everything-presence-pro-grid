# Backup and restore

A **backup** is a saved snapshot of everything the panel knows about a device — *except* the four-corner calibration. Make a backup, recalibrate the device, restore the backup, and you're back where you started without re-painting zones, re-placing furniture, or re-tuning settings.

Backups are stored in the integration on your Home Assistant instance, so they survive panel reloads and follow the device through firmware upgrades.

## When to use it

The main use case is **recalibration**. The four-corner calibration is the one thing that can't be replayed automatically — it's specific to where the device is mounted, and any of the following invalidates it:

- You moved or rotated the sensor — even a small angle change throws the perspective transform off.
- You moved a wall, knocked one through, or otherwise reshaped the room.
- You replaced the device, or re-flashed firmware that wiped its calibration.

Without a backup, you'd lose all your zone painting, overlays, furniture, and tuned settings each time. With one, the typical flow is:

1. **Backup** the current configuration.
2. **Recalibrate** the room (which deletes zones, overlays, and furniture as part of resetting the grid).
3. **Restore** the backup. Zones, overlays, furniture, and settings come back.

It's also worth backing up before any sweeping change you might want to undo — re-doing a tricky overlay layout, experimenting with a different zone shape, or trying a Custom-zone tuning.

## What's in a backup

Everything from the panel that isn't the calibration itself:

- **Room boundary and dimensions** — the painted room shape and its width × depth in metres.
- **Zones** — all eight slots: room (zone 0) and the seven user-paintable zones, with each zone's name, colour, type, and (for **Custom** zones) the four thresholds Trigger / Renew / Presence timeout / Handoff timeout.
- **Overlays** — Entry/Exit, Interference, Suppress markings on every cell.
- **Furniture** — every placed item with position, size, rotation, and icon.
- **Settings**, in full:
    - Detection ranges (target / static, auto and manual values)
    - Sensor calibration (motion timeout, static delay/timeout, static trigger/renew thresholds, environmental offsets)
    - LED mode, brightness, occupancy colour
    - Relay trigger and contact mode
    - Per-component log levels
    - Entity enable/disable flags
    - Update rates (zone and target)

## What's *not* in a backup

| Excluded | Why |
| --- | --- |
| **The four-corner calibration** (perspective transform) | Specific to where the device is physically mounted. Two devices in the same kind of room will have different transforms; the same device after being moved will too. |

The room *dimensions* travel with the backup (so the grid stays coherent), but the perspective transform that maps radar coordinates onto that grid does not. After restoring on a freshly-calibrated device, the grid is the right shape and the zones land in the right cells; the calibration you just did is what tells the radar where to put targets within them.

## Saving a backup

1. Open the sidebar overflow menu (⋯) and click **Backup configuration**.
2. Enter a name and click **Save**.

Backups are stored per-Home-Assistant-instance, not per-device, so any backup you save can be restored onto any device on the same HA instance.

## Restoring a backup

1. Open the sidebar overflow menu and click **Restore configuration**. A grid of saved backups appears, each with a thumbnail showing its zones and furniture.
2. Click a card to apply it. The panel immediately replaces the current grid, zones, overlays, furniture, and settings with the backup's contents and pushes the new configuration to the device.

There's no confirmation dialog and no preview — clicking a card applies it straight away. If you want to keep the current state before trying something else, save a fresh backup first.

![Restore configuration dialog.](../images/backup-restore/restore.png "Restore configuration dialog.")

## Deleting a backup

Open the Restore dialog, hover a card, and click the **X** in the top-right corner. The backup is deleted immediately — no confirmation, no undo. Deleting only removes it from the library; any device that previously had it applied keeps its current configuration.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Restore dialog says "No configurations" | No backup has been saved on this Home Assistant instance yet | Save a backup first from any device. Backups are shared across all devices in the same HA instance. |
| Restored backup but the radar puts targets in the wrong cells | The device's calibration doesn't match the room dimensions in the backup | Recalibrate the device. The backup's grid is fine; the perspective transform needs to be redone. |

See also: the [central Troubleshooting](troubleshooting.md) page for conceptual FAQ and how to open a GitHub issue.

## Where to next

- **[Calibration →](calibration.md)** — the one thing a backup doesn't restore for you.
