# Overlays

Overlays change how the zone engine reacts to radar signals in specific cells. They don't define where targets are counted — that's what [zones](detection-zones.md) do — but they tell the engine whether to trust, doubt, or ignore what it sees. A cell can belong to a zone and carry an overlay at the same time.

There are three overlay types:

| Overlay | Appearance | Purpose |
| --- | --- | --- |
| **Entry/Exit** | ![Dark diagonal stripes](../images/overlays/entry-exit.png) | Mark entrances and exits to a room |
| **Interference** | ![Red diagonal stripes](../images/overlays/interference.png)   | Mark cells near noise sources such as fans or curtains |
| **Suppress** | ![Red cross-hatch stripes](../images/overlays/suppress.png)  | Mark cells to ignore entirely |

## Drawing overlays

1. Switch to the **Overlays** editor mode in the sidebar.
2. Click the overlay-type button you want (Entry/Exit, Interference, or Suppress). 
3. Click-and-drag on the grid to paint cells, with the same interaction as zone painting. The stroke's action (paint or erase) is decided by the first cell you press on: if that cell already has the overlay, the stroke erases; otherwise it paints.
4. Click the active overlay-type button again to exit paint mode.

Only one overlay-type paint mode is active at a time — clicking another overlay type switches to it.

!!! note
    Overlays only paint on cells that are **inside the room**. If a cell near a wall refuses to paint, extend the room boundary first via the Room zone in the [Detection zones](detection-zones.md) editor.

!!! example "Screenshot placeholder"
    **Overlays sidebar with the three type buttons (Entry/Exit, Interference, Suppress), with Interference active.** `overlays/sidebar-buttons.png`

!!! example "Screenshot placeholder"
    **Grid with entry/exit cells painted across a doorway and an interference region painted around a ceiling fan.** `overlays/mixed-overlays.png`

---

## Entry/Exit

### When to use it

- Every door or archway the room opens onto.
- Windows that are large enough and low enough for someone to climb through, if you want those tracked the same as a door.

Paint the overlay across the entire walkable area of the opening, not just a single cell at the edge.

### How it affects detection

The Entry/Exit overlay changes two things about how the zone engine handles targets on those cells:

**Instant entry.** Normally, when a target appears in a zone that is currently clear, the engine applies *gating* — it requires two consecutive frames at a raised threshold before it will activate the zone. This guards against transient ghost detections. On an Entry/Exit cell, gating is bypassed: the zone activates immediately on a single frame at the normal trigger threshold. A target appearing at a doorway is almost certainly a real person walking in, not a sensor ghost.

**Faster exit.** When the last target in a zone disappears from a non-overlay cell, the zone waits for the full **Presence timeout** before clearing. When the last target disappears from an Entry/Exit cell, the zone uses the shorter **Handoff timeout** instead. This prevents lights from staying on after someone walks out through a doorway. The default Handoff timeout varies by zone type: 3 seconds for Default zones, 1 second for Transit zones, and 10 seconds for Bed and Seating zones.

---

## Interference

### When to use it

- Ceiling fans and oscillating pedestal fans — the blades produce real radar returns.
- Curtains and blinds that move in a draught.
- Large reflective surfaces near the sensor — mirrors, glass cabinets, metal radiators.
- TV screens on walls (some LCDs produce interference).

Interference is the right tool when the cell occasionally has a real person too. A living-room ceiling fan is a classic case: you don't want the fan triggering presence, but you do want to detect someone sitting underneath it.

### How it affects detection

The Interference overlay makes the zone engine much harder to convince in three ways:

**No first appearance.** A target cannot originate on an interference cell when the zone is clear. It must have been tracked continuously from a clean cell first. Once the zone is already occupied, targets can still be detected on interference cells — the restriction only applies to the initial activation. This prevents a fan from triggering a zone on its own.

**Hardened renew threshold.** When a zone is already occupied, the engine normally uses the zone's configured renew threshold to decide whether a target is still present. On interference cells, the renew threshold is forced to the maximum signal level (9). This means only a very strong radar return — a real person, not fan blades — can sustain occupancy.

**Blocks instant entry.** Even if a cell has both the Entry/Exit and Interference overlays, the instant-entry bypass is disabled. The interference flag takes precedence, so gating still applies.

---

## Suppress

### When to use it

- Plants in stable positions that consistently show up as false targets.
- Fish tanks, aquarium pumps, or other fixed moving-fluid setups.
- Robot vacuums parked on their dock.
- Any cell where you've tried Interference and it wasn't strong enough.

Suppress is a hammer — it blocks detection entirely. Use it sparingly, and prefer Interference first.

### How it affects detection

**Complete rejection.** The zone engine skips suppressed cells entirely. No target tracking, no zone entry, no signal processing — as far as the engine is concerned, nothing exists in those cells.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Clicking a cell doesn't paint an overlay | No overlay-type paint mode is active | Click **Entry/Exit**, **Interference**, or **Suppress** in the sidebar first; that button stays depressed while paint mode is active. |
| Cell outside the room won't accept overlay paint | Overlays can't paint outside the room boundary | Extend the Room zone (zone 0) in the [Detection zones](detection-zones.md) editor to include the cell, then paint the overlay. |
| Interference overlay painted but ghosts still appear | Interference threshold isn't strong enough for that source | Escalate those cells to **Suppress**. Suppress blocks the cells entirely rather than just raising detection thresholds. |
| Entry/Exit overlay painted at the doorway but zones still flap on entry | Overlay doesn't cover the full walkable area of the doorway | Paint overlay cells covering the entire door opening, not just one cell to the side of it. |

See also: the [central Troubleshooting](troubleshooting.md) page for conceptual FAQ and how to open a GitHub issue.

## Where to next

- **[How detection works →](how-detection-works.md)** — the engine behind the scenes: signal strength, the zone state machine, gating, and the Occupancy entity.
- **[Furniture →](furniture.md)** — place furniture on the grid so you can read the live overview at a glance.
