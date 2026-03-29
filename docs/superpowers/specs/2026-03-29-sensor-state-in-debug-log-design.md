# Sensor State in Debug Log

## Problem

The detection events debug log shows target and zone events but not static
presence, motion presence, or occupancy. Users always want to see these sensors
alongside tracking data to understand the full presence picture. Additionally,
when all non-tracking sensors are inactive and no zones have active targets,
pending zones should clear immediately rather than waiting for their timeout.

## Design

### Hardware timeout change

Set static presence and motion hardware timeouts to 1 second (debounce only).
The user-configured timeout values from `set_static_presence` (timeout field)
and `set_motion_timeout` (timeout field) become the **software** timeout
managed by the zone engine. From the user's perspective, the timeout settings
behave identically — only the implementation layer changes.

### Zone engine — sensor state tracking

Feed static and motion binary sensor states into the zone engine's `tick()`
method. The zone engine tracks each sensor through a three-state lifecycle:

- **active** — binary sensor is ON (hardware detecting presence)
- **pending** — binary sensor went OFF, software timeout countdown running
- **inactive** — software timeout expired

New fields added to `ProcessingResult` (C++) / `ZoneEngineResult` (TS):

| Field | Type | Description |
|-------|------|-------------|
| `static_state` | `SensorPresenceState` | active / pending / inactive |
| `motion_state` | `SensorPresenceState` | active / pending / inactive |
| `occupancy` | `bool` | true if any zone occupied/pending OR static active/pending OR motion active/pending |

The zone engine needs new configuration inputs for the sensor timeouts:

- `static_timeout` — seconds (from `set_static_presence` timeout field)
- `motion_timeout` — seconds (from `set_motion_timeout` timeout field)

And per-tick inputs for the raw binary sensor states:

- `static_on` — bool (current hardware binary sensor state)
- `motion_on` — bool (current hardware binary sensor state)

### Force-clear behavior

After the zone state machine step in `tick()`, add a new step:

> If both `static_state` and `motion_state` are **inactive** AND no zones are
> in OCCUPIED state (all are PENDING_CLEAR or CLEAR), immediately transition
> all PENDING_CLEAR zones to CLEAR.

This means: when every presence indicator agrees nobody is there, don't wait
for individual zone timeouts — clear immediately.

### Debug log format

Add a sensor prefix section to the debug log string. Current format:

```
T0:Z1:A:5 T1:Z0:P:3|Z0:O:1 Z1:O:1
```

New format — three pipe-delimited sections (sensors | targets | zones):

```
S:A M:P Occ:1|T0:Z1:A:5|Z0:O:1 Z1:O:1
```

- `S` = static presence: `A` (active), `P` (pending), `I` (inactive)
- `M` = motion presence: `A` (active), `P` (pending), `I` (inactive)
- `Occ` = occupancy: `1` (on), `0` (off)

### Enriched log (frontend prettifier)

The `enrichDebugLog()` method in `target-controller.ts` is updated to parse
and render the new sensor section. Enriched output:

```
Static: active, Motion: pending, Occ: on | T0→Entrance(active,5) | Entrance: occupied(1)
```

When all sensors are inactive and all zones are clear:

```
Static: inactive, Motion: inactive, Occ: off | no targets | all clear
```

### Parity — firmware + frontend

Both the firmware zone engine (C++) and frontend zone engine (TypeScript) get
these changes to stay in sync:

**Firmware (C++):**
- `epp_zone_engine.h/.cpp` — add sensor state tracking fields, timeout config,
  force-clear logic, and new result fields to `ProcessingResult`
- `epp_types.h` — add `SensorPresenceState` enum (ACTIVE, PENDING, INACTIVE)
- `epp_component.h/.cpp` — add binary sensor input setters for static/motion,
  feed states into zone engine, include sensor section in debug log JSON

**Frontend (TypeScript):**
- `zone-engine.ts` — add `staticPresence`/`motionPresence` booleans and
  timeout values to `ZoneEngineParams`, add sensor state tracking to engine
  state, add force-clear logic, add sensor fields to `ZoneEngineResult`
- `target-controller.ts` — pass sensor state through to zone engine, update
  `_buildFrontendDebugLog()` to include sensor section, update
  `enrichDebugLog()` to parse and prettify the new sensor prefix
- `device-controller.ts` — no changes needed (sensor data already flows
  through `TargetData.sensors`)

**Backend (Python):**
- `websocket_api.py` — parse new sensor fields from zone state JSON if present
  (firmware adds them); no other changes needed since sensor binary states
  already flow through the subscription

### Test coverage

- Firmware C++ tests: sensor state transitions (active→pending→inactive),
  force-clear behavior, debug log format with sensor prefix
- Frontend TS tests: zone engine with sensor inputs, force-clear parity,
  `enrichDebugLog()` parsing of new format
- Parity tests: verify firmware and frontend produce identical results for
  the same sensor + target + zone scenarios
