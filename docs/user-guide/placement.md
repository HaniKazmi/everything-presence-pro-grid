# Placement

Where you physically mount the device matters as much as any configuration setting. The LD2450's field of view and the two radars' effective ranges decide what's possible — good placement gives you a room that calibrates cleanly and leaves all the important zones inside the tracking circle. This page walks through those decisions.

## Corner mount (recommended)

Mount the device in a room corner, flush with the wall or with a small tilt into the room.

**Why a corner works:** the LD2450's 120° azimuth FOV is wider than a room corner's 90° internal angle, so the FOV cone naturally fits a corner without spilling into the wall behind it. From a corner, one sensor can cover a rectangular room's entire interior without dead spots.

**Why a mid-wall mount is harder:** with 120° FOV, the device sees ±60° of the wall it's mounted on. Anything closer than that angle's projection to the opposite wall falls outside the FOV, so a mid-wall mount typically leaves triangular dead zones at the ends of the mounting wall unless the room is narrower than the FOV can cover.

Practical guidance:

1. Pick the corner opposite the door, or the corner that gives the clearest view of the cells you care about most.
2. Mount flush with the wall, or with a small tilt if you need to reach further corners.
3. Avoid corners blocked by furniture or walls on either side of the device — the FOV needs to project into open space.

!!! example "Screenshot placeholder"
    **Top-down diagram of a rectangular room with a corner-mounted sensor and the 120° cone overlaid showing full coverage.** `placement/corner-mount-fov.png`

## Mounting height (1.5–2 m)

The LD2450's 35° pitch FOV needs a mounting height in this range so the detection cone reaches the floor from a useful distance.

- **Too low** (below ~1.2 m) — the cone aims mostly at the opposite wall and clips the floor short of the far corners. Targets walking into the far end of the room disappear because they're below the cone.
- **Too high** (above ~2.2 m on a wall mount, or anywhere on a ceiling) — coverage drops off directly beneath the device, because the cone's upper edge angles away from the near-floor region. The sensor sees the middle and far parts of the room fine but loses anyone close by.
- **Around 1.8 m** (roughly shoulder-to-eye height) tends to be the sweet spot for typical rooms. It gets the near-floor region into the cone and still reaches the far corners.

If your room is unusually tall, bias toward the lower end of the range. If it's long and narrow, bias toward the higher end so the cone reaches the far end.

!!! example "Screenshot placeholder"
    **Side-view diagram showing three mounting heights with the resulting pitch cone and floor coverage drawn on each.** `placement/height-comparison.png`

## Ceiling mount (not recommended)

Don't ceiling-mount the device. From directly overhead, the 35° pitch cone only reaches the floor in a small circle immediately beneath — for a 2.5 m ceiling, the usable coverage circle is roughly 1.6 m across. Everything outside that small circle falls below the cone's edge and out of detection.

This is structural to the hardware and can't be corrected with calibration or config. The LD2450's pitch FOV is designed for wall mounting; from the ceiling, most of the room ends up in the cone's blind spot regardless of how you orient the device.

!!! warning
    Ceiling mounting is not supported. If you've mounted a device on the ceiling in a previous installation, move it to a wall corner before running calibration.

!!! example "Screenshot placeholder"
    **Ceiling-mount anti-pattern showing a small circle of coverage on the floor with the rest of the room shaded as out-of-range.** `placement/ceiling-antipattern.png`

## Tracking range vs static-presence range

The two radars have different effective ranges, and the difference affects where you should place zones.

- **LD2450 tracking circle — 6 m.** Inside this circle, the sensor reports 2D target coordinates, which the zone engine uses for per-zone presence and target-count entities. Outside this circle, the LD2450 can still see radar returns but can't localise them into coordinates.
- **SEN0609 presence circle — 16 m.** Inside this much larger circle, the SEN0609 reports binary "someone is here" presence. No coordinates, just a single signal.

Practical consequence:

- **Zones of interest must fit inside the 6 m tracking circle.** A zone at 7 m from the sensor won't get per-target counts or movement-based zone-entry events; it'll still contribute to room-level occupancy through the SEN0609 and the combined Occupancy sensor, but not through zone-specific entities.
- For larger rooms, this is usually the main constraint on where to mount the sensor — pick a corner that puts your important zones inside the 6 m circle.

!!! example "Screenshot placeholder"
    **Top-down view of a room with the sensor in a corner and concentric 6 m (tracking) and 16 m (static-presence) circles drawn around it.** `placement/range-circles.png`

## Obstructions and interference

The sensor needs a clear line of sight to the room corners — calibration measures the four corners from the sensor's perspective, and anything that obstructs a corner will either force you to enter offsets manually or throw the perspective transform off. Move large furniture out of the corners before calibrating if you can; if you can't, use the wizard's offset fields to compensate.

Known noise sources (ceiling fans, billowing curtains, large reflective surfaces) inside the FOV will produce radar returns — the radar sees the motion even though there's no person involved. Don't try to avoid them by adjusting mounting; handle them after the fact with Interference or Suppress overlays. See [Overlays](overlays.md#when-to-use-each) for which tool fits which situation.

## Worked example: a 4 × 5 m living room

Concrete end-to-end placement walkthrough.

- **Room:** 4 m × 5 m. One door on the short wall. A ceiling fan in the centre. A sofa against the long wall opposite the door.
- **Mount location:** the corner diagonally opposite the door, on the long wall.
- **Mount height:** 1.8 m.
- **Orientation:** angled slightly into the room, so the 120° FOV covers the whole floor.
- **Zones of interest:**
    - "Sofa" — ~2 m from the sensor, comfortably inside the 6 m tracking circle.
    - "Doorway" — ~5 m from the sensor, still inside the tracking circle.
- **Follow-ups after calibration:**
    - Entry/Exit overlay painted across the doorway cells.
    - Interference overlay on the ceiling-fan cell.

That setup covers the whole room with tracking coverage, gives you zone-level granularity for both named zones, keeps the sensor out of sight-lines and foot traffic, and lets the SEN0609 pick up on people still at rest.

!!! example "Screenshot placeholder"
    **Top-down diagram of the example room with sensor position, 6 m / 16 m circles, named zones, and overlays marked.** `placement/example-room.png`

## Where to next

- **[Installation →](installation.md)** — install the integration now that you know where to put the device.
