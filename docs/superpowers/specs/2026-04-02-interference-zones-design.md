# Interference Zones Design

## Overview

Add per-cell interference overlays to the EPP Grid. Interference is a boolean flag (on/off) that marks cells where persistent movement sources (fans, curtains) cause false detections. A separate "suppress" mode fully blocks detection on a cell. Together these two modes — interference source and suppress — let users eliminate ghost targets without reducing sensitivity in clean areas.

A new "Overlays" tab in the editor sidebar houses entry/exit, interference, and suppress overlays, keeping the zones tab focused on detection zone management.

On the live view, a target context menu lets users quickly dismiss a target, mark a cell as an interference source, or suppress detection on a cell.

## Cell Byte Encoding

Bits 5-7, previously reserved as "training", are repurposed for interference:

```
Bit 0:     CELL_ROOM_BIT            (inside/outside room)
Bits 1-3:  CELL_ZONE_MASK           (zone 0-7)
Bit 4:     CELL_OVERLAY_ENTRY       (entry/exit overlay)
Bits 5-7:  CELL_INTERFERENCE_MASK   (interference level)
```

### Interference values (bits 5-7)

| Stored value | Meaning |
|---|---|
| 0 | No interference |
| 1 | Interference source |
| 2 | Suppress detection |
| 3-7 | Reserved (unused) |

### New constants (synced across all three codebases)

- `CELL_INTERFERENCE_MASK = 0xE0` (bits 5-7)
- `CELL_INTERFERENCE_SHIFT = 5`
- `CELL_INTERFERENCE_SUPPRESS = 2`

### Mutual exclusivity

Setting interference on a cell clears entry/exit (bit 4). Setting entry/exit clears interference (bits 5-7). Enforced at the data level in paint/set functions.

## Zone Engine Changes

Both the TypeScript frontend engine (`zone-engine.ts`) and C++ firmware engine (`epp_zone_engine.cpp`) receive the same logic.

### Suppress (value 2)

The cell is treated as if no target is present:

- Target does not contribute frame counts to any zone from that cell
- Effectively invisible, like being outside the room
- The cell remains part of the room boundary for zone geometry purposes

### No first appearance rule

Targets cannot originate in interference cells when the zone is CLEAR. They must have continuity from a clean zone (i.e. the target must have been tracked in a non-interference cell on the previous frame within Chebyshev distance). Once the zone is already OCCUPIED, targets can be re-confirmed in interference cells normally.

This prevents fans and other persistent motion sources from ever triggering a zone on their own — they can only sustain occupancy that was established by a real person entering from a clean cell.

### Renew threshold = 9

When a target is in an interference cell and the zone is occupied, the renew threshold is forced to 9 (maximum signal strength required). This means weak/intermittent interference sources like fans cannot sustain occupancy — only a strong, consistent signal (i.e. a real person) can keep the zone occupied through an interference cell.

The trigger threshold is NOT modified by interference.

### Unaffected

- `timeout` and `handoff_timeout` are not modified by interference.
- Entry/exit overlay behavior is unchanged. Instant entry is suppressed when a target is on an interference cell (overlay on a neighbour must not negate the raised threshold).

## Frontend: Overlays Tab

### Tab structure

Editor sidebar tabs change from `"zones" | "furniture"` to `"zones" | "overlays" | "furniture"`.

The sidebar title updates to match the active tab. The entry/exit overlay toggle moves from the bottom of the zones sidebar into the new overlays tab.

### New component: `epp-overlay-sidebar.ts`

Three overlay items:

1. **Entry / Exit** — click to activate painting mode. Same behavior as today, relocated from the zones tab.

2. **Interference** — click to activate painting mode. Paints cells with interference value 1.

3. **Suppress** — click to activate painting mode. Paints cells with interference value 2 (suppress).

No level selector — interference is a simple on/off toggle, and suppress is a separate item.

### Painting behavior

- Clicking/dragging inside-room cells sets the selected overlay
- Clicking a cell that already has the same overlay clears it (toggle off)
- Painting interference or suppress clears entry/exit on that cell (data-level enforcement)
- Painting entry/exit clears interference on that cell (data-level enforcement)
- Cannot paint on outside-room cells

### Tab isolation

Each tab's painting mode is independent. Switching tabs deactivates the previous tab's painting — the grid only responds to the active tab. Same pattern as zones/furniture today.

### Overlay mode cleared on exit

When exiting the editor (cancel or save), the overlay mode is reset to null so no painting mode carries over to the live view.

### Cell rendering in `epp-grid.ts`

Interference uses **opaque red (`#cc3333`) diagonal stripes at -45°** (entry/exit uses +45° grey):

| Value | Pattern |
|---|---|
| 1 (interference) | `-45°` stripes: `repeating-linear-gradient(-45deg, transparent, transparent 5px, #cc3333 5px, #cc3333 7px)` |
| 7 (suppress) | Cross-hatch (both directions): `-45°` + `+45°` stripes at the same density |

## Live View: Target Context Menu

On the live overview, clicking a target dot shows a context menu with three options:

### 1. Delete target

Sends a `dismiss_target` command to firmware with the target index and current cell index. Firmware stores the dismissed cell per target slot in ephemeral RAM (not persisted). While the target remains at the dismissed cell, it is skipped by the zone engine. When the target moves to a different cell, the dismiss auto-clears and the target is tracked normally again. On dismiss, the zone is immediately reset to CLEAR.

The frontend also tracks dismissed targets locally to hide the dot while the target stays at the dismissed cell.

### 2. Mark as interference source

Sets interference level 1 on the target's current cell. The change is persisted immediately: grid bytes are updated and pushed to firmware via `set_room_layout`.

### 3. Suppress detection

Sets interference level 2 (suppress) on the target's current cell. The change is persisted immediately: grid bytes are updated and pushed to firmware via `set_room_layout`.

### Target dots hidden on interference cells

When a target is on an interference cell and the zone is not occupied, the target dot is hidden in the live view. This reflects the no-first-appearance rule — an unconfirmed target in an interference cell is not a real presence, so showing a dot would be misleading.

## Firmware: Raw Target Position Publishing

For unconfirmed targets (dismissed, suppressed, or blocked by the no-first-appearance rule), firmware publishes the raw target position (median x/y) with status INACTIVE and the actual signal strength. This allows the frontend to process the position against its own (possibly edited) grid for display purposes.

## Data Flow & Persistence

No new storage, protocol, or entity changes:

- **Grid bytes** already carry bits 5-7 through the full pipeline: frontend -> `set_room_layout` -> integration storage -> firmware `Grid::load_from_bytes()`
- **Config protocol version**: no bump needed. The bits were reserved; old firmware ignores them. New firmware reads them; old frontend sends 0s in bits 5-7, meaning "no interference" — backward compatible.
- **No new HA entities** — interference is a per-cell modifier, not a zone-level feature.
- **`dismiss_target` command** — new websocket command `eppgrid/dismiss_target` routes through the active session to the firmware `epp_dismiss_target` ESPHome action. Ephemeral only (not persisted).

## Out of Scope

- **Interference interaction with overlay exit handoff** — interference cells don't affect entry/exit behavior since the two are mutually exclusive at the data level.
