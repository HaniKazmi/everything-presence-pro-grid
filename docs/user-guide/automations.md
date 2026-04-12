# Automations

Motion sensors in Home Assistant are typically a single boolean — "somebody's there / nobody's there" — and that's what causes rooms to go dark while someone's reading, or lights to flap on and off when someone walks past the door. Everything Presence Pro Grid gives you several signals because a good presence automation needs different signals at different moments in the sequence.

## The four phases of presence

Think of a typical "someone walks in, uses the room, leaves" sequence as four phases. Each phase wants a different signal.

- **Fast trigger** — low-latency "somebody just walked in" signal. Use the **Occupancy** binary sensor (which folds the PIR, LD2450, and Static Presence into a single sub-second trigger), or a zone-entry event. Turn on general room lighting. Tolerate false positives — a light briefly on by mistake is forgivable.
- **Zone-specific** — someone is in a named region. Use `binary_sensor.<device>_zone_<N>_presence`. Fire targeted actions: mirror light, shower light, extractor fan, radiator, desk lamp.
- **Sustained** — someone's in the room but not moving. Use `binary_sensor.<device>_static_presence` (enable on the device page first — it's disabled by default). This keeps the room occupied when they're reading, showering, or sleeping; without it, the fast-movement signals drop out and automations "time out" on someone who's right there.
- **Empty** — all presence signals agree no one's there. Turn things off. The conservative gate — wait for Occupancy **and** Static Presence to both be off for a real timeout window (2–5 minutes, not seconds).

!!! example "Screenshot placeholder"
    **Phase timeline — a horizontal time axis showing the four phases firing in sequence as someone enters, uses a zone, settles still, and eventually leaves.** `automations/phase-timeline.png`

## Sensor-to-phase mapping

Quick reference — which entity to use for each phase.

- **Fast trigger:** `binary_sensor.<device>_occupancy`, or an entry-specific zone: `binary_sensor.<device>_zone_<N>_presence`.
- **Zone-specific:** `binary_sensor.<device>_zone_<N>_presence`. Cross-reference with `sensor.<device>_zone_<N>_target_count` when the number of people matters.
- **Sustained:** `binary_sensor.<device>_static_presence` (enable first — disabled by default).
- **Empty gate:** both `binary_sensor.<device>_occupancy` **and** `binary_sensor.<device>_static_presence` OFF, for a duration (`for:` in the automation trigger).

!!! note
    The integration renames zone entities by friendly name (`Zone <name>` in the HA UI) — but **entity IDs stay as `zone_<N>_presence`** where `<N>` is 0–7. Use entity IDs (not display names) in automations so they keep working if you rename a zone.

## Worked example: bathroom

A bathroom with a **Shower** zone (slot 1) and a **Toilet** zone (slot 2) defined. The aim:

- Main light on the moment anyone enters.
- Mirror light when someone's in front of the mirror.
- Extractor fan on after someone's been in the shower for two minutes (turning on instantly is noisy and looks odd).
- Everything off only when Occupancy **and** Static Presence have both been off for two minutes.

Mapping to the four phases:

- **Fast trigger** → main light on.
- **Zone-specific** → mirror light and extractor fan.
- **Sustained** (zone presence with a `for:` duration) → extractor fan arms after two minutes of shower-zone occupancy, and disarms after one minute of it being empty.
- **Empty gate** → all off when nobody's there.

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
- **Everything off:** use a **template trigger** that becomes `true` only when both Occupancy and Static Presence are `off`, with `for: "00:02:00"`. For example: `value_template: "{{ is_state('binary_sensor.bathroom_epp_occupancy', 'off') and is_state('binary_sensor.bathroom_epp_static_presence', 'off') }}"`. Action turns off all the lights and the fan.

!!! warning
    Don't just use "Occupancy → off" as the trigger with Static Presence as a condition. If Occupancy drops while Static Presence is still on, the trigger fires and the condition fails — then when Static Presence later drops there's no new trigger, so the automation never runs. The template-trigger pattern above evaluates whenever *either* sensor changes, so it catches whichever one drops last.

!!! example "Screenshot placeholder"
    **Top-down sketch of the bathroom with Shower and Toilet zones marked and the sensor in a corner.** `automations/bathroom-layout.png`

## Worked example: bedroom

A bedroom with a **Bed** zone (slot 1) painted on the grid. The aim:

- Main lights on the moment anyone enters.
- Dim the main lights and turn on bedside reading lights when someone climbs into the Bed zone.
- Stay "occupied" (so nothing times out) while the person is in bed still-but-breathing — rely on the Static Presence sensor.
- Everything off only when Static Presence has been off long enough to be confident the bed is actually empty.

Mapping to the four phases:

- **Fast trigger** → main lights on.
- **Zone-specific** → Bed zone dims the main light and turns on the reading lights.
- **Sustained** → Static Presence keeps the room marked occupied while they're still.
- **Empty gate** → lights off when Static Presence has been off for five minutes (longer than the bathroom — real beds produce real stillness).

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

- **Main lights:** trigger on `binary_sensor.bedroom_epp_occupancy` going `on` with a **condition** that the room was previously empty — i.e. both `binary_sensor.bedroom_epp_occupancy` and `binary_sensor.bedroom_epp_static_presence` were `off`. Action `light.turn_on`.
- **Everything off:** use a **template trigger** that becomes `true` only when both Occupancy and Static Presence are `off`, with `for: "00:05:00"`. For example: `value_template: "{{ is_state('binary_sensor.bedroom_epp_occupancy', 'off') and is_state('binary_sensor.bedroom_epp_static_presence', 'off') }}"`. Action turns everything off. The template trigger evaluates whenever either sensor changes, so it fires whichever one drops last — a simple "Occupancy off" trigger with a Static Presence condition would miss the case where Occupancy drops first.

!!! warning
    Don't leave Static Presence out of the bedroom's empty gate. Someone reading in bed is a non-moving target; the LD2450 will drop them within seconds. Without Static Presence in the off-gate, the bedroom will go dark on them within a minute, regardless of how long the `for:` timer is set to.

!!! example "Screenshot placeholder"
    **Top-down sketch of the bedroom with the Bed zone marked and the sensor in a corner.** `automations/bedroom-layout.png`

## Pitfalls

Common traps to avoid when wiring up automations:

!!! warning
    - **Don't automate against `Motion Presence` alone.** It's the narrower LD2450-only movement signal. Use `Occupancy` as the combined "someone's in this room" trigger.
    - **Don't forget to enable `Zone Presence` at the device level.** The per-zone binary sensors only exist in HA when the device-level toggle is on. If your zone automations aren't firing, check this first.
    - **Don't use a short timeout on the empty gate.** Anything under two minutes will drop out on someone who's only been still for a moment.
    - **Don't forget to enable the Static Presence entity.** It's disabled by default on the device page — automations that reference it will never fire (value stays `unavailable` / stuck off) until you enable it.
    - **Don't confuse `Zone Rest of Room` with `Occupancy`.** Rest of Room (zone 0) means a target is in the room but outside any named zone; Occupancy means any presence anywhere. They overlap, but use Occupancy for the fast trigger, not zone 0.

## Where to next

- **[Firmware →](firmware.md)** — keep firmware up to date over the air, or flash a fresh device.
