# Conditional Entity Publishing

Reduce network traffic by only publishing entity data when consumers need it.

## Problem

The firmware publishes ALL entity states unconditionally on every throttle tick, regardless of whether anything is listening. The biggest offenders:

- Target position text sensors: 6 sensors × 5 Hz = 30 publishes/sec
- Zone state JSON: ~500 bytes/sec at 1 Hz
- Zone occupancy binary sensors: 8 sensors at 1 Hz

When no frontend is open and the user hasn't enabled the relevant HA entities, this is pure waste.

## Design

### Two-tier publishing

**Tier 1 — Transport (frontend display):**
Text sensors with `disabled_by_default: true`. High-frequency, only published when the frontend has active WebSocket subscriptions. Remain in ESPHome entity list (ESPHome's `internal: true` excludes entities from both `list_entities_services()` and `subscribe_states()`, so it cannot be used for transport). These appear in HA's entity registry but are not useful for automations.

| Entity | Rate when active | Subscriber trigger |
|--------|-----------------|-------------------|
| Raw Target 1-3 | 200 ms (5 Hz) | `subscribe_raw_targets` |
| Target 1-3 Position | 200 ms (5 Hz) | `subscribe_grid_targets` |
| Zone State (JSON) | 1000 ms (1 Hz) | `subscribe_grid_targets` |

**Tier 2 — HA entities (automations):**
Proper structured ESPHome sensors/binary sensors. Published at a user-configured maximum Hz. `disabled_by_default: true`. ESPHome's built-in dedup means unchanged values produce no network traffic.

Per target (× 3, labeled 1-3):

| Entity | Type | Unit | Source |
|--------|------|------|--------|
| `target_1_x` | sensor | mm | `result.targets[0].x` |
| `target_1_y` | sensor | mm | `result.targets[0].y` |
| `target_1_signal` | sensor | — | `result.targets[0].signal` |
| `target_1_active` | binary_sensor | — | `status != INACTIVE` |
| `target_1_zone` | sensor | — | `grid_.xy_to_cell()` → `cell_zone()`, NaN when inactive |

Per zone (× 8):

| Entity | Type | Source |
|--------|------|--------|
| `zone_0_presence` | binary_sensor | Existing zone occupancy, renamed |
| `zone_0_target_count` | sensor | `result.zone_target_counts[0]` |

Room level:

| Entity | Type | Source |
|--------|------|--------|
| `target_count` | sensor | count of targets where `status != INACTIVE` |

Total: 15 new target entities + 8 new zone target count sensors + 1 room target count = 24 new entities. Plus 8 existing zone occupancy renamed from `zone_N_occupancy` to `zone_N_presence`.

### Five publish timers

The current 2 firmware publish timers split into 5:

| Timer | Interval | Publishes |
|-------|----------|-----------|
| `entity_target` | User Hz → ms (0 = skip) | target_N_{x,y,signal,active,zone}, target_count |
| `entity_zone` | User Hz → ms (0 = skip) | zone_N_{presence,target_count} |
| `display` | 200 ms when frontend subscribed, 0 otherwise | Internal text sensors: raw targets + grid target positions |
| `zone_state` | 1000 ms when frontend subscribed, 0 otherwise | Internal text sensor: zone state JSON |
| `system` | Fixed 1000 ms, always runs | Device tracking, static/motion/occupancy outputs, relay evaluation |

The processing pipeline (rolling median → transform → zone engine) runs every frame regardless — only the output publishing is gated.

Hz dropdown options: 5 Hz (200 ms), 2 Hz (500 ms), 1 Hz (1000 ms), 0.5 Hz (2000 ms). Default: 1 Hz.

### Pipeline action

`epp_set_pipeline` expands from 3 to 5 parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `entity_target_interval` | int | ms between target entity publishes (0 = disabled) |
| `entity_zone_interval` | int | ms between zone entity publishes (0 = disabled) |
| `display_interval` | int | ms between internal display text sensor publishes (0 = disabled) |
| `zone_state_interval` | int | ms between zone state JSON publishes (0 = disabled) |
| `window_duration` | int | Rolling median window duration (unchanged) |

### Integration interval management

A single `_compute_pipeline()` function derives all intervals from current state:

- `entity_target_interval`: User Hz setting, or 0 if no target entity is enabled (target_xy, target_active, target_signal, target_zone all off)
- `entity_zone_interval`: User Hz setting, or 0 if no zone entity is enabled (zone_presence and zone_target_count both off)
- `display_interval`: 200 if `raw_target_subscribers > 0` or `grid_target_subscribers > 0`, else 0
- `zone_state_interval`: 1000 if `grid_target_subscribers > 0`, else 0
- `window_duration`: Unchanged from stored config

Three triggers cause a recompute + push:

1. **Frontend subscribes/unsubscribes** — `subscribe_raw_targets` or `subscribe_grid_targets` changes refcount
2. **User changes Hz dropdown** — new rate stored in settings
3. **User toggles entity category** — entity enabled/disabled in HA registry

Refcounting lives in `DeviceConnection`:
- `raw_target_subscribers: int` — incremented by `websocket_subscribe_raw_targets`, decremented on connection close
- `grid_target_subscribers: int` — incremented by `websocket_subscribe_grid_targets`, decremented on connection close

On each trigger: recompute full pipeline, push once via `epp_set_pipeline`.

### Frontend settings UI

Two new groups in the Reporting section of settings:

**Zone level:**

| Control | Type | Effect |
|---------|------|--------|
| Presence | toggle | Enable/disable `zone_N_presence` entities |
| Target Count | toggle | Enable/disable `zone_N_target_count` entities |
| Update rate | select (5/2/1/0.5 Hz) | Controls `entity_zone` timer. Disabled when both toggles are off |

**Target level:**

| Control | Type | Effect |
|---------|------|--------|
| XY Position | toggle | Enable/disable `target_N_x`, `target_N_y` entities |
| Active | toggle | Enable/disable `target_N_active` entities |
| Signal | toggle | Enable/disable `target_N_signal` entities |
| Zone | toggle | Enable/disable `target_N_zone` entities |
| Update rate | select (5/2/1/0.5 Hz) | Controls `entity_target` timer. Disabled when all toggles are off |

Individual toggles control HA entity enable/disable only. The firmware publishes all entities in a group at the group rate — per-attribute firmware flags are unnecessary since the per-entity overhead at 1 Hz is negligible.

### Entity naming

- Targets are labeled 1-3 (user-facing), mapping to firmware indices 0-2
- Zones are labeled 0-7 (matching zone engine slot IDs)
- Zone presence entities renamed from `zone_N_occupancy` to `zone_N_presence`

### What doesn't change

- Processing pipeline (rolling median → transform → zone engine) — always runs every frame
- `window_duration_ms` — stays as-is
- Config protocol version — no bump (not released yet)
- System binary sensors (occupancy, static/motion presence, device tracking) — always publish at 1 Hz
- Relay evaluation — always runs at 1 Hz

## Verified

- **`internal: true` is not viable:** Tested on hardware — ESPHome's `internal: true` excludes entities from both `list_entities_services()` and `subscribe_states()`. Transport text sensors must remain as regular entities with `disabled_by_default: true`.
