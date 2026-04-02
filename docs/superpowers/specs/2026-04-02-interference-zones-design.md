# Interference Zones Design

## Overview

Add per-cell interference overlays to the EPP Grid. Interference zones increase the trigger and renew thresholds for cells where persistent movement sources (fans, curtains) cause false detections. Three levels of reduced detection sensitivity plus a full suppress mode allow fine-grained control.

A new "Overlays" tab in the editor sidebar houses both interference and entry/exit overlays, keeping the zones tab focused on detection zone management.

On the live view, a "Mark as ghost" action lets users quickly increase interference on a target's cell without leaving the live screen.

## Cell Byte Encoding

Bits 5-7, previously reserved as "training", are repurposed for interference:

```
Bit 0:     CELL_ROOM_BIT            (inside/outside room)
Bits 1-3:  CELL_ZONE_MASK           (zone 0-7)
Bit 4:     CELL_OVERLAY_ENTRY       (entry/exit overlay)
Bits 5-7:  CELL_INTERFERENCE_MASK   (interference level)
```

### Interference values (bits 5-7)

| Stored value | Meaning | Threshold adjustment |
|---|---|---|
| 0 | No interference | None |
| 1 | Level 1 | +2 to trigger and renew |
| 2 | Level 2 | +4 to trigger and renew |
| 3 | Level 3 | +6 to trigger and renew |
| 7 | Suppress | Skip cell entirely |
| 4-6 | Reserved | Unused |

Effective thresholds are capped: `min(zone.trigger + level * 2, 9)` and `min(zone.renew + level * 2, 9)`.

### New constants (synced across all three codebases)

- `CELL_INTERFERENCE_MASK = 0xE0` (bits 5-7)
- `CELL_INTERFERENCE_SHIFT = 5`
- `CELL_INTERFERENCE_SUPPRESS = 7`

### Mutual exclusivity

Setting interference on a cell clears entry/exit (bit 4). Setting entry/exit clears interference (bits 5-7). Enforced at the data level in paint/set functions.

## Zone Engine Changes

Both the TypeScript frontend engine (`zone-engine.ts`) and C++ firmware engine (`epp_zone_engine.cpp`) receive the same logic.

### Interference levels 1-3

When the zone engine resolves a target to a cell:

1. Read the cell's interference value: `(cell >> CELL_INTERFERENCE_SHIFT) & 0x07`
2. If value is 1-3, compute effective thresholds:
   - `effective_trigger = min(zone.trigger + value * 2, 9)`
   - `effective_renew = min(zone.renew + value * 2, 9)`
3. Use effective values for that target's frame-counting gating

### Suppress (value 7)

The cell is treated as if no target is present:

- Target does not contribute frame counts to any zone from that cell
- Effectively invisible, like being outside the room
- The cell remains part of the room boundary for zone geometry purposes

### Unaffected

- `timeout` and `handoff_timeout` are not modified by interference — only frame-counting thresholds are affected.
- Entry/exit overlay behavior is unchanged.

## Frontend: Overlays Tab

### Tab structure

Editor sidebar tabs change from `"zones" | "furniture"` to `"zones" | "overlays" | "furniture"`.

The sidebar title updates to match the active tab. The entry/exit overlay toggle moves from the bottom of the zones sidebar into the new overlays tab.

### New component: `epp-overlay-sidebar.ts`

Two overlay items:

1. **Entry / Exit** — click to activate painting mode. Same behavior as today, relocated from the zones tab.

2. **Interference** — click to activate painting mode. When active, a level selector appears:
   - Four buttons: `1`, `2`, `3`, `✕` (suppress)
   - Selected level is applied when painting cells
   - Default selection: `1`

### Painting behavior

- Clicking/dragging inside-room cells sets the selected interference level
- Clicking a cell that already has the same level clears it (toggle off)
- Painting interference clears entry/exit on that cell (data-level enforcement)
- Painting entry/exit clears interference on that cell (data-level enforcement)
- Cannot paint on outside-room cells

### Tab isolation

Each tab's painting mode is independent. Switching tabs deactivates the previous tab's painting — the grid only responds to the active tab. Same pattern as zones/furniture today.

### Cell rendering in `epp-grid.ts`

Interference uses **opaque red (`#cc3333`) diagonal stripes at -45°** (entry/exit uses +45° grey):

| Level | Pattern |
|---|---|
| 1 | `-45°` stripes, sparse: 8px transparent, 2px red |
| 2 | `-45°` stripes, medium: 5px transparent, 2px red |
| 3 | `-45°` stripes, dense: 3px transparent, 2px red |
| Suppress | Both `-45°` and `+45°` stripes at L2 density (5px/2px) |

CSS patterns:
- L1: `repeating-linear-gradient(-45deg, transparent, transparent 8px, #cc3333 8px, #cc3333 10px)`
- L2: `repeating-linear-gradient(-45deg, transparent, transparent 5px, #cc3333 5px, #cc3333 7px)`
- L3: `repeating-linear-gradient(-45deg, transparent, transparent 3px, #cc3333 3px, #cc3333 5px)`
- Suppress: L2 pattern in both directions: `repeating-linear-gradient(-45deg, transparent, transparent 5px, #cc3333 5px, #cc3333 7px), repeating-linear-gradient(45deg, transparent, transparent 5px, #cc3333 5px, #cc3333 7px)`

## Live View: Mark as Ghost

On the live overview, clicking a target dot shows a context menu with a "Mark as ghost" option.

### Behavior

- Increments the interference level on the target's current cell by 1
- Progression: 0 → 1 → 2 → 3 → 7 (suppress)
- Does not wrap back to 0 — undoing requires the overlays editor
- If the cell has an entry/exit overlay, it is cleared when interference is set
- The change is persisted immediately: grid bytes are updated and pushed to firmware via `set_room_layout`

### Rationale

Provides a quick "that's a ghost, reduce sensitivity here" workflow. Users observe false detections in real-time and can suppress them on the spot without switching to the editor.

## Data Flow & Persistence

No new storage, protocol, or entity changes:

- **Grid bytes** already carry bits 5-7 through the full pipeline: frontend → `set_room_layout` → integration storage → firmware `Grid::load_from_bytes()`
- **Config protocol version**: no bump needed. The bits were reserved; old firmware ignores them. New firmware reads them; old frontend sends 0s in bits 5-7, meaning "no interference" — backward compatible.
- **No new HA entities** — interference is a per-cell modifier, not a zone-level feature.

## Out of Scope

- **Dismiss stuck target** — temporarily hiding a target and only re-accepting it if it reappears in a different cell. Noted for a future spec.
- **Interference interaction with overlay exit handoff** — interference cells don't affect entry/exit behavior since the two are mutually exclusive at the data level.
