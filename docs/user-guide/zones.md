# Zones

A zone is a named set of grid cells — typically a region of your room you care about, like "Desk", "Sofa", or "Doorway". Each zone gets its own occupancy and target-count entities in Home Assistant, which you can wire up in automations. This page covers creating zones, painting cells into them, tuning their behaviour, and what entities end up in HA.

## The zone list

Open the Device Configuration tab and switch the sidebar to the **Zones** editor mode. The sidebar shows two things:

- A permanent **Room** entry at the top — this is the zone 0 fallback (see below).
- A list of your named zones. You can have up to 7. The **Add zone** button is disabled once all seven slots are used.

!!! example "Screenshot placeholder"
    **Zones sidebar with the Room entry at the top and the Add zone button, before any named zones exist.** `zones/empty-list.png`

## The Room zone (zone 0)

The first entry in the list, labelled **Room**, is zone 0 — the "rest of room" fallback. Any target the sensor sees that isn't inside one of your named zones counts as being in the Room zone. It's always present and can't be deleted.

Painting the Room zone is different from painting a named zone: you're editing the room **boundary** rather than a zone interior.

- Click a cell **outside** the current room → the cell is added to the room.
- Click a cell **inside** the current room → the cell is removed from the room (it's no longer considered part of your room at all).

Keep the room boundary tight to your real walls. Cells outside the room are ignored by the zone engine; overlays and named zones can't be painted on them either.

## Creating and painting a named zone

Once calibration is done and the room boundary looks right, add your first named zone:

1. Click **Add zone** in the sidebar. A new zone appears, selected and ready to paint, with a default name and colour.
2. On the grid, click-and-drag to paint cells into the zone. The action for the whole drag — paint or erase — is decided by the cell you first press on: if it's already part of the zone, the stroke erases; otherwise the stroke paints.
3. Release the mouse to commit the stroke.

!!! tip
    Short strokes are your friend. Each drag is one paint-or-erase decision; if you try to do too much in one stroke and pass through both painted and unpainted cells, you'll have to undo and retry with a shorter stroke.

!!! example "Screenshot placeholder"
    **Mid-drag painting a zone — cells being added to a new "Sofa" zone.** `zones/painting.png`

## Renaming, recolouring, deleting

- **Rename** — click the zone name field in the sidebar; edit inline; the new name takes effect immediately.
- **Recolour** — click the colour swatch next to the zone name; a colour picker appears. Pick a colour that stands out against your other zones; the live view uses it to shade the zone.
- **Delete** — click the **×** button on the zone's sidebar row. The zone and its cells disappear; any cells that were in the zone fall back into the Room zone.

## Per-zone settings

Each zone has a **type**, which picks sensible defaults for four behaviour thresholds. For most rooms, one of the built-in types works without further tuning.

- **Default** — balanced defaults. Use for living-room zones, kitchen zones, generic "somebody's in this area" detection.
- **Bed** — long presence timeout for bedroom monitoring. Designed for someone lying still in bed for extended periods (10-minute presence timeout, slower trigger).
- **Seating** — for sofas, reading chairs, dining seats. Slower trigger but a longer hold-on so brief stillness doesn't drop presence.
- **Transit** — fast fall-off. Use for hallways and doorways where you want presence to drop quickly after someone has walked through, so it doesn't keep a light on forever.
- **Custom** — expose the four thresholds below for direct tuning.

The four thresholds (editable in Custom mode):

- **Trigger** — how quickly a target inside the zone counts as "present". Lower = faster trigger.
- **Renew** — how quickly the presence counter refreshes while the zone stays occupied.
- **Presence timeout** — how long after the last target leaves before the zone's presence binary sensor drops to off.
- **Handoff timeout** — the window during which a target disappearing from this zone and reappearing in a neighbouring zone is treated as a handoff, not a new event. Longer = more tolerant of dropouts during handoff, shorter = faster distinction between a handoff and a re-entry.

!!! example "Screenshot placeholder"
    **A zone selected with its type dropdown and custom threshold controls visible.** `zones/zone-settings.png`

## Entities exposed in Home Assistant

Zones don't create entities on their own — the firmware publishes every possible zone entity up front, and the integration enables or hides them based on your settings. Two **device-level** toggles control what's exposed:

- **Zone Presence** — if enabled, Home Assistant sees a `binary_sensor.<device>_zone_N_presence` entity for every active zone slot. The integration renames these to follow the zone: a named zone becomes `Zone <name>` (e.g. `Zone Sofa`), and Zone 0 becomes `Zone Rest of Room`. Zone 0's presence sensor is `on` whenever the sensor sees a target anywhere in the room that isn't inside one of your named zones.
- **Zone Target Count** — if enabled, Home Assistant sees a `sensor.<device>_zone_N_target_count` entity per active zone slot, with the same `Zone <name>` / `Zone Rest of Room` display-name treatment. Reports the number of tracked targets currently inside that zone.

Both toggles are device-wide, not per-zone. Turning **Zone Presence** on gives you presence sensors for every zone on the device at once; turning it off hides all of them. If you only care about three of your seven zones, you still get all seven presence sensors — just leave them disabled in Home Assistant's entity registry for the ones you don't need.

!!! note
    The device-level toggles live in the settings area of the panel rather than on individual zones. If you've just created a new zone and its entities aren't appearing in Home Assistant, double-check that Zone Presence (and/or Zone Target Count) is turned on at the device level.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| New zone created in the panel but no `zone_<N>_presence` entity visible in Home Assistant | The device-level **Zone Presence** toggle is off — the entity is disabled in the HA entity registry | Enable **Zone Presence** on the device page. If you want to see the entity in "disabled" state meanwhile, set Home Assistant's entity-registry filter to "Include disabled entities". |
| Renamed a zone but the HA entity display name still says "Zone N Presence" | Integration hasn't refreshed the entity registry entry yet | Reload the **Everything Presence Pro Grid** integration from Settings → Devices & Services, or reboot the device. |
| Zone never fires even with obvious presence | Zone has no cells painted, or cells are outside the room boundary | Reopen the zone in the editor and verify cells are painted inside the room. Cells outside the room boundary don't get tracked. |
| `Zone Rest of Room` is always `on`, even when nobody's in the room | An interference source is inside the room but outside any named zone | Paint an Interference overlay on the problem cells. See [Overlays](overlays.md). |
| Zone flaps on and off on someone who isn't moving much | Zone type is "Default" — presence timeout is short | Change the zone's type to **Seating** (sofa, chair), **Bed** (bedroom), or **Custom** with a longer Presence timeout. |

See also: the [central Troubleshooting](troubleshooting.md) page for conceptual FAQ and how to open a GitHub issue.

## Where to next

- **[Overlays →](overlays.md)** — mark doorways and interference sources on the grid to refine how the zone engine interprets events.
