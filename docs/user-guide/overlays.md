# Overlays

Overlays are an extra layer of information the zone engine uses when interpreting the grid. They don't define where targets are counted — that's zones — but they do change how the engine reacts to appearances, disappearances, and detections in specific cells. This page covers the three overlay types and when to use each.

## The three overlay types

Everything Presence Pro Grid has three overlay types, all optional, all independent of zones. A single cell can belong to a zone **and** carry an overlay at the same time.

- **Entry/Exit** — mark doorway cells. Targets that appear or disappear near these cells are classified as expected transitions (someone walking in or out) rather than ghost detections. Zones near doors stop flapping every time someone crosses the threshold.
- **Interference** — mark cells near noise sources like ceiling fans, billowing curtains, or reflective surfaces. The zone engine raises its thresholds in those cells: targets can't originate there, they need a stronger radar return to sustain occupancy, and instant-entry from the entry/exit overlay is disabled. False positives from fans and curtains go away, while real people still register if they're actually present.
- **Suppress** — mark cells you want the engine to **ignore entirely**. Unlike Interference (which makes detection harder), Suppress makes it impossible: no target counts, no zone entry, nothing happens in those cells. Use it for regions that produce consistent radar returns with no chance of a real person being there (a swaying plant you can't move, an oscillating fan on a fixed path).

Think of it as a gradient: zones are "pay attention here", Interference is "be sceptical here", Suppress is "don't look here at all".

## Drawing overlays

1. Switch to the **Overlays** editor mode in the sidebar.
2. Click the overlay-type button you want (Entry/Exit, Interference, or Suppress). That button stays depressed to show which paint mode is active.
3. Click-and-drag on the grid to paint cells, same interaction as zone painting. The stroke's action (paint or erase) is decided by the first cell you press on: if that cell already has the overlay, the stroke erases; otherwise it paints.
4. Click the active overlay-type button again to exit paint mode.

Only one overlay-type paint mode is active at a time — clicking another overlay type switches to it.

!!! note
    Overlays only paint on cells that are **inside the room**. Painting a cell outside the room is a no-op — the engine doesn't track anything there anyway. If a cell near a wall refuses to paint, extend the room boundary first via the Room zone in the [Zones](zones.md) editor.

!!! example "Screenshot placeholder"
    **Overlays sidebar with the three type buttons (Entry/Exit, Interference, Suppress), with Interference active.** `overlays/sidebar-buttons.png`

!!! example "Screenshot placeholder"
    **Grid with entry/exit cells painted across a doorway and an interference region painted around a ceiling fan.** `overlays/mixed-overlays.png`

## When to use each

### Entry/Exit

- Every door or archway the room opens onto.
- Windows that are large enough and low enough for someone to climb through, if you want those tracked the same as a door.

The zone engine uses entry/exit cells to decide whether a new target is "a person walking in" (expected event) or "a ghost that just appeared in the middle of the room" (suspicious event — treated as low confidence until the target persists).

### Interference

- Ceiling fans and oscillating pedestal fans — the blades produce real radar returns.
- Curtains and blinds that move in a draught.
- Large reflective surfaces near the sensor — mirrors, glass cabinets, metal radiators.
- TV screens on walls (some LCDs produce interference).

Interference is the right tool when the cell occasionally has a real person too. A living-room ceiling fan is a classic case: you don't want the fan triggering presence, but you do want to detect someone sitting underneath it.

### Suppress

- Plants in stable positions that consistently show up as false targets.
- Fish tanks, aquarium pumps, or other fixed moving-fluid setups.
- Robot vacuums parked on their dock.
- Any cell where you've tried Interference and it wasn't strong enough.

Suppress is a hammer — it blocks detection in those cells entirely. Use it sparingly, and prefer Interference first.

## Interaction with zones

Overlays and zones are independent layers. A cell can be part of a zone *and* carry an overlay — the zone decides which detection events belong to which named region, and the overlay adjusts how the engine reacts to the radar signal itself.

Common combinations:

- A doorway cell is usually part of the Room zone (fallback) **and** carries Entry/Exit.
- A cell under a ceiling fan might be part of a "Living Room" zone **and** carry Interference.
- A cell behind a plant might be part of a "Kitchen" zone **and** carry Suppress.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Clicking a cell doesn't paint an overlay | No overlay-type paint mode is active | Click **Entry/Exit**, **Interference**, or **Suppress** in the sidebar first; that button stays depressed while paint mode is active. |
| Cell outside the room won't accept overlay paint | Overlays can't paint outside the room boundary | Extend the Room zone (zone 0) in the [Zones](zones.md) editor to include the cell, then paint the overlay. |
| Interference overlay painted but ghosts still appear | Interference threshold isn't strong enough for that source | Escalate those cells to **Suppress**. Suppress blocks the cells entirely rather than just raising detection thresholds. |
| Entry/Exit overlay painted at the doorway but zones still flap on entry | Overlay doesn't cover the full walkable area of the doorway | Paint overlay cells covering the entire door opening, not just one cell to the side of it. |

See also: the [central Troubleshooting](troubleshooting.md) page for conceptual FAQ and how to open a GitHub issue.

## Where to next

- **[Furniture →](furniture.md)** — place furniture on the grid so you can read the live view at a glance.
