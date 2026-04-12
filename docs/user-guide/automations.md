# Automations

Motion sensors in Home Assistant are typically a single boolean — "somebody's there / nobody's there" — and that's what causes rooms to go dark while someone's reading, or lights to flap on and off when someone walks past the door. Everything Presence Pro Grid solves that on the device side: the **Occupancy** binary sensor is the firmware's combined output from the PIR, LD2450 moving-target detection, and SEN0609 static-presence detection. When someone's in the room — whether they're moving, still, or somewhere in between — Occupancy stays on. When they're really gone, it goes off.

This page walks through how to use Occupancy and the per-zone entities to build reliable automations.

## The three phases of presence

Think of a typical "someone walks in, uses the room, leaves" sequence as three phases. Each phase wants a different signal.

- **Fast trigger** — low-latency "somebody just walked in" signal. Use the **Occupancy** binary sensor: `binary_sensor.<device>_occupancy`. Turn on general room lighting. Tolerate false positives — a light briefly on by mistake is forgivable.
- **Zone-specific** — someone is in a named region. Use `binary_sensor.<device>_zone_<N>_presence`. Fire targeted actions: mirror light, shower light, extractor fan, radiator, desk lamp.
- **Empty gate** — Occupancy has been off for a real timeout window. Turn things off. Because the firmware folds still-but-breathing detection into Occupancy on the device, you don't need to combine multiple entities — a simple `Occupancy → off` trigger with a `for:` duration is enough.

!!! example "Screenshot placeholder"
    **Phase timeline — a horizontal time axis showing the three phases firing in sequence as someone enters, uses a zone, settles still, and eventually leaves.** `automations/phase-timeline.png`

## What about `Motion Presence` and `Static Presence`?

The firmware publishes these as separate entities (both disabled by default) so you can see which specific presence component is contributing. They're useful for debugging a zone that's misbehaving or an automation that's firing at the wrong moment, but you don't normally automate against them directly:

- **`binary_sensor.<device>_motion_presence`** — the LD2450 moving-target stream on its own. Narrower than Occupancy; drops within seconds if the person stops moving.
- **`binary_sensor.<device>_static_presence`** — the SEN0609 still-presence stream on its own.

Occupancy is what the firmware has *already* combined, and is the right automation trigger in almost every case. Enable the individual entities if you want to peek under the hood; leave them disabled otherwise.

## Sensor-to-phase mapping

Quick reference:

- **Fast trigger:** `binary_sensor.<device>_occupancy`, or an entry-specific zone: `binary_sensor.<device>_zone_<N>_presence`.
- **Zone-specific:** `binary_sensor.<device>_zone_<N>_presence`. Cross-reference with `sensor.<device>_zone_<N>_target_count` when the number of people matters.
- **Empty gate:** `binary_sensor.<device>_occupancy` off for a duration, using `for:` in the automation trigger. Use 2 minutes for a bathroom, 5 minutes for a bedroom, depending on how patient the room should be.

!!! note
    The integration renames zone entities by friendly name (`Zone <name>` in the HA UI) — but **entity IDs stay as `zone_<N>_presence`** where `<N>` is 0–7. Use entity IDs (not display names) in automations so they keep working if you rename a zone.

## Worked example: bathroom

A bathroom with a **Shower** zone (slot 1) and a **Toilet** zone (slot 2) defined. The aim:

- Main light on the moment anyone enters.
- Mirror light when someone's in front of the mirror.
- Extractor fan on after someone's been in the shower for two minutes (turning on instantly is noisy and looks odd).
- Everything off two minutes after Occupancy drops.

Mapping to the three phases:

- **Fast trigger** → main light on.
- **Zone-specific** → mirror light and extractor fan.
- **Empty gate** → all off two minutes after Occupancy drops. Because Occupancy already includes static presence, a simple `off` trigger with a `for:` duration works — no need to combine multiple entities.

The extractor fan is the most interesting automation because it combines zone presence with a duration and a paired off-action:

```yaml
# Extractor fan: on after 2 minutes of someone in the shower zone,
# off when the shower zone has been empty for 1 minute.
alias: Bathroom extractor fan (shower-zone-driven)
mode: restart
trigger:
  - platform: state
    entity_id: binary_sensor.bathroom_epp_zone_1_presence  # Shower zone
    to: "on"
    for: "00:02:00"
    id: shower_on
  - platform: state
    entity_id: binary_sensor.bathroom_epp_zone_1_presence
    to: "off"
    for: "00:01:00"
    id: shower_off
action:
  - choose:
      - conditions:
          - condition: trigger
            id: shower_on
        sequence:
          - service: switch.turn_on
            target:
              entity_id: switch.bathroom_extractor_fan
      - conditions:
          - condition: trigger
            id: shower_off
        sequence:
          - service: switch.turn_off
            target:
              entity_id: switch.bathroom_extractor_fan
```

Substitute `binary_sensor.bathroom_epp_zone_1_presence` and `switch.bathroom_extractor_fan` with your own device and shower-zone slot.

The rest of the bathroom in sketch form (automations similar in shape to the above, so not shown in full):

- **Main light:** trigger on `binary_sensor.bathroom_epp_occupancy` going `on`, action `light.turn_on`.
- **Mirror light:** trigger on the mirror zone's `zone_<N>_presence` state.
- **Everything off:** trigger on `binary_sensor.bathroom_epp_occupancy` going `off` with `for: "00:02:00"`, action turns off the lights and fan.

!!! example "Screenshot placeholder"
    **Top-down sketch of the bathroom with Shower and Toilet zones marked and the sensor in a corner.** `automations/bathroom-layout.png`

## Worked example: bedroom

A bedroom with a **Bed** zone (slot 1) painted on the grid. The aim:

- Main lights on the moment anyone enters.
- Dim the main lights and turn on bedside reading lights when someone climbs into the Bed zone.
- Lights stay on while someone's in bed reading or asleep — because Occupancy keeps them marked as present, not just the LD2450's moving-target signal.
- Everything off five minutes after Occupancy drops (longer than the bathroom — real beds produce real stillness, and someone re-entering the room after a quick break shouldn't cause the lights to flash off and back on).

Mapping to the three phases:

- **Fast trigger** → main lights on.
- **Zone-specific** → Bed zone dims the main light and turns on the reading lights.
- **Empty gate** → lights off five minutes after Occupancy drops.

The Bed-zone automation is the one worth seeing as YAML — it demonstrates a single trigger driving several parallel light actions:

```yaml
# Bed mode: dim main light and turn on reading lights when someone climbs into bed;
# restore when they leave.
alias: Bedroom bed mode
mode: restart
trigger:
  - platform: state
    entity_id: binary_sensor.bedroom_epp_zone_1_presence  # Bed zone
    to: "on"
    id: bed_on
  - platform: state
    entity_id: binary_sensor.bedroom_epp_zone_1_presence
    to: "off"
    for: "00:00:30"   # small debounce so turning over doesn't flap
    id: bed_off
action:
  - choose:
      - conditions:
          - condition: trigger
            id: bed_on
        sequence:
          - service: light.turn_on
            target:
              entity_id: light.bedroom_main
            data:
              brightness_pct: 15
          - service: light.turn_on
            target:
              entity_id:
                - light.bedroom_reading_left
                - light.bedroom_reading_right
      - conditions:
          - condition: trigger
            id: bed_off
        sequence:
          - service: light.turn_on
            target:
              entity_id: light.bedroom_main
            data:
              brightness_pct: 100
          - service: light.turn_off
            target:
              entity_id:
                - light.bedroom_reading_left
                - light.bedroom_reading_right
```

The rest of the bedroom in sketch form:

- **Main lights:** trigger on `binary_sensor.bedroom_epp_occupancy` going `on` with a **condition** that the room was previously empty (Occupancy was `off` right before the trigger). Action `light.turn_on`.
- **Everything off:** trigger on `binary_sensor.bedroom_epp_occupancy` going `off` with `for: "00:05:00"`, action turns everything off.

!!! tip
    Use Occupancy in the bedroom's empty gate, not `Motion Presence`. The LD2450's moving-target signal drops within seconds when someone stops moving, so a bedroom gated on `Motion Presence` goes dark the moment the reader settles down. Occupancy folds in the SEN0609 static sensor on the device, so it stays `on` while the person is still but breathing.

!!! example "Screenshot placeholder"
    **Top-down sketch of the bedroom with the Bed zone marked and the sensor in a corner.** `automations/bedroom-layout.png`

## Pitfalls

Common traps to avoid when wiring up automations:

!!! warning
    - **Don't automate against `Motion Presence` alone.** It's only the LD2450's moving-target stream; it drops within seconds when the person stops moving. Use `Occupancy` as the combined "someone's in this room" trigger — the firmware already folds the static and moving signals into it on the device.
    - **Don't forget to enable `Zone Presence` at the device level.** The per-zone binary sensors only exist in HA when the device-level toggle is on. If your zone automations aren't firing, check this first.
    - **Don't use a short timeout on the empty gate.** Anything under two minutes will drop out on someone who's only been still for a moment.
    - **Don't automate directly on `Static Presence` for general room presence.** It's published as a debug/visibility signal, disabled by default. Occupancy is the combined output that includes static presence — automate against that.
    - **Don't confuse `Zone Rest of Room` with `Occupancy`.** Rest of Room (zone 0) means a target is in the room but outside any named zone; Occupancy means any presence anywhere. They overlap, but use Occupancy for the fast trigger, not zone 0.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Automation referencing `zone_<N>_presence` never fires | Device-level **Zone Presence** toggle is off — the entity is disabled in Home Assistant's entity registry | Enable **Zone Presence** on the device page. See [Zones](zones.md#troubleshooting). |
| Automation referencing **Static Presence** always reports off | Static Presence entity is disabled on the device page (default) | Enable the Static Presence entity in Home Assistant. Usually you don't need it — **Occupancy** already folds it in. |
| Lights turn off on someone who's clearly still present | Empty-gate timeout too short, or you're gating on `Motion Presence` instead of `Occupancy` | Gate on `binary_sensor.<device>_occupancy` with `for: "00:02:00"` or longer. Occupancy already includes static presence on the device. |
| Bed / sofa / reading-chair zone flaps on and off | Zone type is "Normal" — fall-off too fast | Change the zone's type to **Rest** in the [Zones](zones.md) editor. |
| Automation fires on a quick pass-through a hallway | Zone type is "Normal" — entry threshold too quick | Change the zone's type to **Thoroughfare** in the [Zones](zones.md) editor. |

See also: the [central Troubleshooting](troubleshooting.md) page for conceptual FAQ and how to open a GitHub issue.

## Where to next

- **[Firmware →](firmware.md)** — keep firmware up to date over the air, or flash a fresh device.
