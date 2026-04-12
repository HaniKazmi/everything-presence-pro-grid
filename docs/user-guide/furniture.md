# Furniture

Furniture is a purely visual layer. You place icons for sofas, beds, tables, and appliances on the grid so the live view is immediately interpretable — the dot moving near the bottom-left is someone sitting on the sofa, not a ghost. Unlike zones and overlays, furniture **does not affect detection** at all; it's decoration that helps you and future you reason about what the sensor is seeing.

## Why place furniture

Without furniture, the live view is a coloured grid with dots moving on it. You can read it, but it takes effort. Adding furniture turns the grid into something that looks like your actual room:

- Real-time targets make intuitive sense ("that's someone walking past the dining table").
- Ghost detections become explainable ("that's always the ceiling fan over the reading chair").
- When you come back to tune zones six months from now, you still know what each cell represents.

!!! note
    Furniture has no effect on detection. Only the **Zones** editor (room boundary + named zones) and the **Overlays** editor (Entry/Exit, Interference, Suppress) change how the zone engine behaves. Anything you do in the Furniture editor is cosmetic.

## Adding furniture

1. Switch to the **Furniture** editor mode in the sidebar.
2. The sidebar shows a 2-column grid of furniture "stickers" covering 32 presets across the common categories:
    - **Seating** — armchair, sofa-2-seat, sofa-3-seat.
    - **Beds** — bed-single, bed-double.
    - **Tables** — desk, dining_table, round-table, side-table, counter, kitchen-island.
    - **Bathroom** — bath, shower, toilet, bidet, hot-tub.
    - **Kitchen** — fridge, oven-stove, washing-machine, cabinet, cupboard.
    - **Doors and windows** — door-left-swing, door-right-swing, sliding-door, window.
    - **Other** — tv, speaker, lamp, plant, carpet, cat-bed, dog-bed, car, pool.
3. Click a sticker. The item lands centred in the room at its default size (in millimetres, so real-world-accurate).
4. Drag the item to position it on the grid.

!!! example "Screenshot placeholder"
    **Furniture sidebar with the 32-preset sticker catalogue visible.** `furniture/sidebar-stickers.png`

## Moving, resizing, rotating

Select a furniture item on the grid by clicking it. Handles appear for every operation:

- **Move** — click and drag anywhere inside the item.
- **Resize** — drag one of the eight resize handles: four corners, four edges (cardinal directions). The defaults match typical real-world dimensions, but real rooms are full of non-standard furniture — resize to match what you actually have.
- **Rotate** — drag the circular handle on the rotation stem that extends above the item.
- **Delete** — click the red **×** button at the top right of the selected item.

!!! tip
    Use the door stickers (`door-left-swing`, `door-right-swing`, `sliding-door`) exactly where you've drawn Entry/Exit [overlays](overlays.md). It gives future-you a visible reminder of why those overlays are there — otherwise the hatched overlay cells look arbitrary.

!!! example "Screenshot placeholder"
    **Grid with a dressed room — bed, dining table and chairs, sofa, doors marked at entry points.** `furniture/dressed-room.png`

## Custom icons

If none of the 32 presets match what you want to represent, pick the custom-icon slot at the end of the sticker list. You can attach a custom SVG, and from there it behaves like any other furniture item: placed, moved, resized, rotated, deleted.

Useful for:

- Items specific to your layout that don't have a preset (e.g. wardrobes, bookshelves, specific appliances).
- Non-furniture annotations — a coloured marker to remind yourself something specific about that cell.

## Where to next

- **[Live view →](live-view.md)** — read the default view and the live data it shows.
