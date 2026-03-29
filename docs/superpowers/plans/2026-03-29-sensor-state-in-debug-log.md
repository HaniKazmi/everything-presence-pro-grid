# Sensor State in Debug Log — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add static/motion/occupancy sensor states to the detection events debug log, with software-managed sensor timeouts and force-clear of pending zones when all presence indicators are inactive.

**Architecture:** The zone engine (both C++ firmware and TypeScript frontend) gains sensor state tracking — it receives raw binary sensor booleans plus configured timeouts, runs its own active→pending→inactive state machine, and uses the result to force-clear pending zones. The debug log format gains a sensor prefix section (`S:A M:P Occ:1|...`). Hardware sensor timeouts are reduced to 1s (debounce only); the zone engine manages the real timeout.

**Tech Stack:** C++ (doctest), TypeScript (Vitest), ESPHome YAML, Python (HA integration)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `firmware/lib/epp_zone_engine/include/epp_types.h` | Modify | Add `SensorPresenceState` enum |
| `firmware/lib/epp_zone_engine/include/epp_zone_engine.h` | Modify | Add sensor inputs, timeout config, runtime state, result fields |
| `firmware/lib/epp_zone_engine/src/epp_zone_engine.cpp` | Modify | Sensor state machine + force-clear logic in `tick()` |
| `firmware/lib/epp_zone_engine/tests/test_zone_engine.cpp` | Modify | Tests for sensor state transitions and force-clear |
| `firmware/components/epp/epp_component.h` | Modify | Add binary sensor input pointers for static/motion |
| `firmware/components/epp/epp_component.cpp` | Modify | Feed sensor states to zone engine, add sensor section to debug log |
| `firmware/components/epp/__init__.py` | Modify | Add static/motion sensor schema + codegen |
| `firmware/common/everything-presence-pro-base.yaml` | Modify | Wire static/motion sensors into EPP component, reduce motion timeout to 1s |
| `firmware/common/sen0609-base.yaml` | Modify | (No changes needed — SEN0609 GPIO sensor has no configurable timeout in YAML) |
| `frontend/src/lib/zone-engine.ts` | Modify | Add sensor params, state tracking, force-clear logic, result fields |
| `frontend/src/lib/__tests__/zone-engine.test.ts` | Modify | Tests for sensor state transitions and force-clear |
| `frontend/src/controllers/target-controller.ts` | Modify | Pass sensor state to zone engine, update debug log building + enrichment |
| `custom_components/eppgrid/websocket_api.py` | Modify | Parse new sensor fields from zone state JSON |

---

### Task 1: Add SensorPresenceState enum and zone engine interface (C++)

**Files:**
- Modify: `firmware/lib/epp_zone_engine/include/epp_types.h`
- Modify: `firmware/lib/epp_zone_engine/include/epp_zone_engine.h`

- [ ] **Step 1: Add SensorPresenceState enum to epp_types.h**

In `firmware/lib/epp_zone_engine/include/epp_types.h`, add after the `ZoneState` enum (after line 41):

```cpp
// Sensor presence state (software-managed timeout)
enum class SensorPresenceState : uint8_t {
    INACTIVE = 0,
    ACTIVE = 1,
    PENDING = 2,
};
```

- [ ] **Step 2: Add sensor fields to ProcessingResult in epp_zone_engine.h**

In `firmware/lib/epp_zone_engine/include/epp_zone_engine.h`, add to `ProcessingResult` (after the `target_count` field on line 40):

```cpp
    SensorPresenceState static_state = SensorPresenceState::INACTIVE;
    SensorPresenceState motion_state = SensorPresenceState::INACTIVE;
    bool occupancy = false;
```

- [ ] **Step 3: Add sensor input struct**

In `firmware/lib/epp_zone_engine/include/epp_zone_engine.h`, add before the `ZoneRuntime` struct (before line 47):

```cpp
struct SensorInput {
    bool static_on = false;
    bool motion_on = false;
    float static_timeout = 10.0f;   // seconds
    float motion_timeout = 10.0f;   // seconds
};
```

- [ ] **Step 4: Add sensor runtime state and update tick() signature**

In `firmware/lib/epp_zone_engine/include/epp_zone_engine.h`, add to the `ZoneEngine` class private section (after line 81, the `target_gate_count_` line):

```cpp
    // Sensor presence state tracking
    SensorPresenceState static_state_ = SensorPresenceState::INACTIVE;
    SensorPresenceState motion_state_ = SensorPresenceState::INACTIVE;
    float static_pending_since_ = -1.0f;
    float motion_pending_since_ = -1.0f;
```

Update the `tick()` method signature (line 66) from:

```cpp
    const ProcessingResult& tick(const WindowOutput& window, float timestamp);
```

to:

```cpp
    const ProcessingResult& tick(const WindowOutput& window, float timestamp,
                                 const SensorInput& sensors = SensorInput{});
```

- [ ] **Step 5: Verify it compiles**

Run:
```bash
cd firmware/lib/epp_zone_engine && mkdir -p build && cd build && cmake .. && make epp_zone_engine_tests 2>&1 | tail -5
```
Expected: compiles successfully (tests still pass since sensor input defaults to inactive/inactive).

- [ ] **Step 6: Commit**

```bash
git add firmware/lib/epp_zone_engine/include/epp_types.h firmware/lib/epp_zone_engine/include/epp_zone_engine.h
git commit -m "feat: add SensorPresenceState enum and sensor input to zone engine interface"
```

---

### Task 2: Implement sensor state machine and force-clear in C++ zone engine

**Files:**
- Modify: `firmware/lib/epp_zone_engine/src/epp_zone_engine.cpp`
- Test: `firmware/lib/epp_zone_engine/tests/test_zone_engine.cpp`

- [ ] **Step 1: Write failing tests for sensor state transitions**

Add to `firmware/lib/epp_zone_engine/tests/test_zone_engine.cpp`:

```cpp
// ---------------------------------------------------------------------------
// Sensor presence state tests
// ---------------------------------------------------------------------------

TEST_CASE("sensor state: static active when binary sensor on") {
    ZoneEngine engine = make_parity_engine();
    SensorInput sensors;
    sensors.static_on = true;
    sensors.static_timeout = 5.0f;
    const ProcessingResult& r = engine.tick(make_window_0(), 100.0f, sensors);
    CHECK(r.static_state == SensorPresenceState::ACTIVE);
}

TEST_CASE("sensor state: static pending when binary sensor goes off") {
    ZoneEngine engine = make_parity_engine();
    SensorInput sensors;
    sensors.static_on = true;
    sensors.static_timeout = 5.0f;

    // Active
    engine.tick(make_window_0(), 100.0f, sensors);

    // Goes off -> pending
    sensors.static_on = false;
    const ProcessingResult& r = engine.tick(make_window_0(), 101.0f, sensors);
    CHECK(r.static_state == SensorPresenceState::PENDING);
}

TEST_CASE("sensor state: static inactive after timeout") {
    ZoneEngine engine = make_parity_engine();
    SensorInput sensors;
    sensors.static_on = true;
    sensors.static_timeout = 5.0f;

    // Active
    engine.tick(make_window_0(), 100.0f, sensors);

    // Goes off
    sensors.static_on = false;
    engine.tick(make_window_0(), 101.0f, sensors);

    // Past timeout -> inactive
    const ProcessingResult& r = engine.tick(make_window_0(), 107.0f, sensors);
    CHECK(r.static_state == SensorPresenceState::INACTIVE);
}

TEST_CASE("sensor state: static reactivates during pending") {
    ZoneEngine engine = make_parity_engine();
    SensorInput sensors;
    sensors.static_on = true;
    sensors.static_timeout = 5.0f;

    // Active -> off -> pending
    engine.tick(make_window_0(), 100.0f, sensors);
    sensors.static_on = false;
    engine.tick(make_window_0(), 101.0f, sensors);

    // Back on -> active
    sensors.static_on = true;
    const ProcessingResult& r = engine.tick(make_window_0(), 102.0f, sensors);
    CHECK(r.static_state == SensorPresenceState::ACTIVE);
}

TEST_CASE("sensor state: motion follows same lifecycle as static") {
    ZoneEngine engine = make_parity_engine();
    SensorInput sensors;
    sensors.motion_on = true;
    sensors.motion_timeout = 3.0f;

    // Active
    const ProcessingResult& r1 = engine.tick(make_window_0(), 100.0f, sensors);
    CHECK(r1.motion_state == SensorPresenceState::ACTIVE);

    // Off -> pending
    sensors.motion_on = false;
    const ProcessingResult& r2 = engine.tick(make_window_0(), 101.0f, sensors);
    CHECK(r2.motion_state == SensorPresenceState::PENDING);

    // Past timeout -> inactive
    const ProcessingResult& r3 = engine.tick(make_window_0(), 105.0f, sensors);
    CHECK(r3.motion_state == SensorPresenceState::INACTIVE);
}

TEST_CASE("sensor state: default SensorInput gives inactive for both") {
    ZoneEngine engine = make_parity_engine();
    const ProcessingResult& r = engine.tick(make_window_0(), 100.0f);
    CHECK(r.static_state == SensorPresenceState::INACTIVE);
    CHECK(r.motion_state == SensorPresenceState::INACTIVE);
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd firmware/lib/epp_zone_engine/build && cmake .. && make epp_zone_engine_tests && ctest -R epp_zone_engine_tests -V 2>&1 | tail -20
```
Expected: new tests FAIL (sensor state not yet implemented).

- [ ] **Step 3: Implement sensor state machine in tick()**

In `firmware/lib/epp_zone_engine/src/epp_zone_engine.cpp`, update the `tick()` signature (line 85):

```cpp
const ProcessingResult& ZoneEngine::tick(const WindowOutput& window, float timestamp,
                                         const SensorInput& sensors) {
```

Add the sensor state machine after Step 5 (cleanup) and before Step 6 (device_tracking_present), just before line 375:

```cpp
    // -----------------------------------------------------------------------
    // Step 5b: Sensor presence state machine
    // -----------------------------------------------------------------------

    // Static presence
    if (sensors.static_on) {
        static_state_ = SensorPresenceState::ACTIVE;
        static_pending_since_ = -1.0f;
    } else if (static_state_ == SensorPresenceState::ACTIVE) {
        static_state_ = SensorPresenceState::PENDING;
        static_pending_since_ = timestamp;
    } else if (static_state_ == SensorPresenceState::PENDING) {
        if (static_pending_since_ >= 0.0f &&
            (timestamp - static_pending_since_) >= sensors.static_timeout) {
            static_state_ = SensorPresenceState::INACTIVE;
            static_pending_since_ = -1.0f;
        }
    }

    // Motion presence
    if (sensors.motion_on) {
        motion_state_ = SensorPresenceState::ACTIVE;
        motion_pending_since_ = -1.0f;
    } else if (motion_state_ == SensorPresenceState::ACTIVE) {
        motion_state_ = SensorPresenceState::PENDING;
        motion_pending_since_ = timestamp;
    } else if (motion_state_ == SensorPresenceState::PENDING) {
        if (motion_pending_since_ >= 0.0f &&
            (timestamp - motion_pending_since_) >= sensors.motion_timeout) {
            motion_state_ = SensorPresenceState::INACTIVE;
            motion_pending_since_ = -1.0f;
        }
    }

    result_.static_state = static_state_;
    result_.motion_state = motion_state_;
```

- [ ] **Step 4: Run tests to verify sensor state tests pass**

Run:
```bash
cd firmware/lib/epp_zone_engine/build && make epp_zone_engine_tests && ctest -R epp_zone_engine_tests -V 2>&1 | tail -20
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add firmware/lib/epp_zone_engine/src/epp_zone_engine.cpp firmware/lib/epp_zone_engine/tests/test_zone_engine.cpp
git commit -m "feat: implement sensor presence state machine in C++ zone engine"
```

---

### Task 3: Implement force-clear and occupancy in C++ zone engine

**Files:**
- Modify: `firmware/lib/epp_zone_engine/src/epp_zone_engine.cpp`
- Test: `firmware/lib/epp_zone_engine/tests/test_zone_engine.cpp`

- [ ] **Step 1: Write failing tests for force-clear and occupancy**

Add to `firmware/lib/epp_zone_engine/tests/test_zone_engine.cpp`:

```cpp
TEST_CASE("force-clear: pending zones cleared when sensors inactive and no active zones") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;
    SensorInput sensors;
    sensors.static_on = true;
    sensors.static_timeout = 5.0f;
    sensors.motion_on = true;
    sensors.motion_timeout = 3.0f;

    // Occupy zone 1 with target + sensors active
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t, sensors);

    // Target disappears, sensors still active -> zone 1 pending
    const ProcessingResult& r1 = engine.tick(make_window_0(), t + 1.0f, sensors);
    CHECK(r1.zone_occupancy[1]);  // still occupied (pending)

    // Sensors go off -> both pending
    sensors.static_on = false;
    sensors.motion_on = false;
    const ProcessingResult& r2 = engine.tick(make_window_0(), t + 2.0f, sensors);
    CHECK(r2.zone_occupancy[1]);  // sensors pending, zone still pending

    // Motion timeout expires (3s) -> motion inactive, static still pending
    const ProcessingResult& r3 = engine.tick(make_window_0(), t + 5.5f, sensors);
    CHECK(r3.zone_occupancy[1]);  // static still pending, so no force-clear

    // Static timeout expires (5s from t+1) -> both inactive, no active zones -> force-clear
    const ProcessingResult& r4 = engine.tick(make_window_0(), t + 7.0f, sensors);
    CHECK_FALSE(r4.zone_occupancy[1]);  // force-cleared!
}

TEST_CASE("force-clear: does NOT clear if a zone has active targets") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;
    SensorInput sensors;
    sensors.static_on = true;
    sensors.static_timeout = 2.0f;
    sensors.motion_timeout = 2.0f;

    // Occupy zone 1 with target + static sensor
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t, sensors);

    // Static goes off, but target is still active in zone 1
    sensors.static_on = false;
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t + 1.0f, sensors);

    // Static timeout expires -> sensors inactive, but zone 1 is OCCUPIED (active target)
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 5), t + 4.0f, sensors);
    CHECK(r.zone_occupancy[1]);  // NOT force-cleared, zone has active target
}

TEST_CASE("occupancy: true when any zone occupied or sensor active/pending") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;
    SensorInput sensors;

    // No sensors, no targets -> occupancy false
    const ProcessingResult& r1 = engine.tick(make_window_0(), t, sensors);
    CHECK_FALSE(r1.occupancy);

    // Static on -> occupancy true
    sensors.static_on = true;
    sensors.static_timeout = 5.0f;
    const ProcessingResult& r2 = engine.tick(make_window_0(), t + 1.0f, sensors);
    CHECK(r2.occupancy);

    // Static off -> pending -> occupancy still true
    sensors.static_on = false;
    const ProcessingResult& r3 = engine.tick(make_window_0(), t + 2.0f, sensors);
    CHECK(r3.occupancy);

    // Past timeout -> inactive -> occupancy false
    const ProcessingResult& r4 = engine.tick(make_window_0(), t + 8.0f, sensors);
    CHECK_FALSE(r4.occupancy);
}

TEST_CASE("occupancy: true when zone occupied even if sensors inactive") {
    ZoneEngine engine = make_parity_engine();
    SensorInput sensors;  // both off
    // Occupy zone 1 with target
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f, sensors);
    CHECK(r.zone_occupancy[1]);
    CHECK(r.occupancy);  // zone occupied -> occupancy true
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd firmware/lib/epp_zone_engine/build && cmake .. && make epp_zone_engine_tests && ctest -R epp_zone_engine_tests -V 2>&1 | tail -30
```
Expected: new force-clear and occupancy tests FAIL.

- [ ] **Step 3: Implement force-clear logic**

In `firmware/lib/epp_zone_engine/src/epp_zone_engine.cpp`, add after the sensor state machine block (after `result_.motion_state = motion_state_;`):

```cpp
    // -----------------------------------------------------------------------
    // Step 5c: Force-clear pending zones when all sensors inactive
    // -----------------------------------------------------------------------
    if (static_state_ == SensorPresenceState::INACTIVE &&
        motion_state_ == SensorPresenceState::INACTIVE) {
        // Check if any zone is OCCUPIED (not just PENDING_CLEAR)
        bool any_occupied = false;
        for (int zi = 0; zi < zone_count_; ++zi) {
            if (!zone_enabled_[zi]) continue;
            if (zones_[zi].state == ZoneState::OCCUPIED) {
                any_occupied = true;
                break;
            }
        }
        // If no zones are actively occupied, force-clear all pending zones
        if (!any_occupied) {
            for (int zi = 0; zi < zone_count_; ++zi) {
                if (!zone_enabled_[zi]) continue;
                if (zones_[zi].state == ZoneState::PENDING_CLEAR) {
                    zones_[zi].state = ZoneState::CLEAR;
                    zones_[zi].pending_since = -1.0f;
                    zones_[zi].confirmed_targets = 0;
                    int zid = zones_[zi].config.id;
                    result_.zone_occupancy[zid] = false;
                    result_.zone_states[zid] = ZoneState::CLEAR;
                }
            }
        }
    }
```

- [ ] **Step 4: Implement occupancy computation**

In the same file, add after the force-clear block (and before the existing `device_tracking_present` step):

```cpp
    // -----------------------------------------------------------------------
    // Step 5d: Compute occupancy (any zone occupied/pending OR sensor active/pending)
    // -----------------------------------------------------------------------
    result_.occupancy = false;
    if (static_state_ != SensorPresenceState::INACTIVE ||
        motion_state_ != SensorPresenceState::INACTIVE) {
        result_.occupancy = true;
    } else {
        for (int zi = 0; zi < zone_count_; ++zi) {
            if (!zone_enabled_[zi]) continue;
            if (result_.zone_occupancy[zones_[zi].config.id]) {
                result_.occupancy = true;
                break;
            }
        }
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
cd firmware/lib/epp_zone_engine/build && make epp_zone_engine_tests && ctest -R epp_zone_engine_tests -V 2>&1 | tail -20
```
Expected: all tests PASS.

- [ ] **Step 6: Run ALL firmware tests to verify no regressions**

Run:
```bash
cd firmware/lib/epp_zone_engine/build && make && ctest -V 2>&1 | tail -20
```
Expected: all tests PASS (existing tests use default `SensorInput{}` which is inactive/inactive).

- [ ] **Step 7: Commit**

```bash
git add firmware/lib/epp_zone_engine/src/epp_zone_engine.cpp firmware/lib/epp_zone_engine/tests/test_zone_engine.cpp
git commit -m "feat: add force-clear and occupancy to C++ zone engine"
```

---

### Task 4: Add sensor state to TypeScript zone engine

**Files:**
- Modify: `frontend/src/lib/zone-engine.ts`
- Test: `frontend/src/lib/__tests__/zone-engine.test.ts`

- [ ] **Step 1: Write failing tests for sensor state transitions**

Add to `frontend/src/lib/__tests__/zone-engine.test.ts`:

```typescript
	it("sensor state: static active when sensor on", () => {
		const params = makeDefaultParams({
			targets: [],
			staticPresence: true,
			staticTimeout: 5,
		});
		const result = runLocalZoneEngine(state, params);
		expect(result.staticState).toBe("active");
	});

	it("sensor state: static pending when sensor goes off", () => {
		const now = Date.now() / 1000;
		const params1 = makeDefaultParams({
			targets: [],
			staticPresence: true,
			staticTimeout: 5,
			now,
		});
		runLocalZoneEngine(state, params1);

		const params2 = makeDefaultParams({
			targets: [],
			staticPresence: false,
			staticTimeout: 5,
			now: now + 1,
		});
		const result = runLocalZoneEngine(state, params2);
		expect(result.staticState).toBe("pending");
	});

	it("sensor state: static inactive after timeout", () => {
		const now = Date.now() / 1000;
		runLocalZoneEngine(state, makeDefaultParams({
			targets: [], staticPresence: true, staticTimeout: 5, now,
		}));
		runLocalZoneEngine(state, makeDefaultParams({
			targets: [], staticPresence: false, staticTimeout: 5, now: now + 1,
		}));
		const result = runLocalZoneEngine(state, makeDefaultParams({
			targets: [], staticPresence: false, staticTimeout: 5, now: now + 7,
		}));
		expect(result.staticState).toBe("inactive");
	});

	it("sensor state: static reactivates during pending", () => {
		const now = Date.now() / 1000;
		runLocalZoneEngine(state, makeDefaultParams({
			targets: [], staticPresence: true, staticTimeout: 5, now,
		}));
		runLocalZoneEngine(state, makeDefaultParams({
			targets: [], staticPresence: false, staticTimeout: 5, now: now + 1,
		}));
		const result = runLocalZoneEngine(state, makeDefaultParams({
			targets: [], staticPresence: true, staticTimeout: 5, now: now + 2,
		}));
		expect(result.staticState).toBe("active");
	});

	it("sensor state: motion follows same lifecycle", () => {
		const now = Date.now() / 1000;
		const r1 = runLocalZoneEngine(state, makeDefaultParams({
			targets: [], motionPresence: true, motionTimeout: 3, now,
		}));
		expect(r1.motionState).toBe("active");

		const r2 = runLocalZoneEngine(state, makeDefaultParams({
			targets: [], motionPresence: false, motionTimeout: 3, now: now + 1,
		}));
		expect(r2.motionState).toBe("pending");

		const r3 = runLocalZoneEngine(state, makeDefaultParams({
			targets: [], motionPresence: false, motionTimeout: 3, now: now + 5,
		}));
		expect(r3.motionState).toBe("inactive");
	});

	it("sensor state: defaults to inactive when not provided", () => {
		const params = makeDefaultParams({ targets: [] });
		const result = runLocalZoneEngine(state, params);
		expect(result.staticState).toBe("inactive");
		expect(result.motionState).toBe("inactive");
	});

	it("force-clear: pending zones cleared when sensors inactive and no active zones", () => {
		const now = Date.now() / 1000;

		// Occupy zone 1 with target + sensors
		runLocalZoneEngine(state, makeDefaultParams({
			targets: [makeTarget(450, 450, 5)],
			staticPresence: true, staticTimeout: 5,
			motionPresence: true, motionTimeout: 3,
			now,
		}));

		// Target disappears, sensors still on
		runLocalZoneEngine(state, makeDefaultParams({
			targets: [makeNullTarget()],
			staticPresence: true, staticTimeout: 5,
			motionPresence: true, motionTimeout: 3,
			now: now + 1,
		}));

		// Sensors go off
		runLocalZoneEngine(state, makeDefaultParams({
			targets: [makeNullTarget()],
			staticPresence: false, staticTimeout: 5,
			motionPresence: false, motionTimeout: 3,
			now: now + 2,
		}));

		// Both sensor timeouts expire -> force-clear
		const result = runLocalZoneEngine(state, makeDefaultParams({
			targets: [makeNullTarget()],
			staticPresence: false, staticTimeout: 5,
			motionPresence: false, motionTimeout: 3,
			now: now + 8,
		}));
		expect(result.occupancy[1]).toBe(false);
	});

	it("force-clear: does NOT clear if a zone has active targets", () => {
		const now = Date.now() / 1000;

		// Occupy zone 1 with target + static sensor
		runLocalZoneEngine(state, makeDefaultParams({
			targets: [makeTarget(450, 450, 5)],
			staticPresence: true, staticTimeout: 2,
			now,
		}));

		// Static goes off, target still active
		runLocalZoneEngine(state, makeDefaultParams({
			targets: [makeTarget(450, 450, 5)],
			staticPresence: false, staticTimeout: 2,
			now: now + 1,
		}));

		// Static timeout expires, but zone 1 OCCUPIED (active target) -> no force-clear
		const result = runLocalZoneEngine(state, makeDefaultParams({
			targets: [makeTarget(450, 450, 5)],
			staticPresence: false, staticTimeout: 2,
			now: now + 4,
		}));
		expect(result.occupancy[1]).toBe(true);
	});

	it("occupancy result: true when sensor active/pending, false when all inactive", () => {
		const now = Date.now() / 1000;
		const r1 = runLocalZoneEngine(state, makeDefaultParams({
			targets: [], now,
		}));
		expect(r1.sensorOccupancy).toBe(false);

		const r2 = runLocalZoneEngine(state, makeDefaultParams({
			targets: [], staticPresence: true, staticTimeout: 5, now: now + 1,
		}));
		expect(r2.sensorOccupancy).toBe(true);

		// Static off -> pending -> still occupied
		const r3 = runLocalZoneEngine(state, makeDefaultParams({
			targets: [], staticPresence: false, staticTimeout: 5, now: now + 2,
		}));
		expect(r3.sensorOccupancy).toBe(true);

		// Past timeout -> inactive -> not occupied
		const r4 = runLocalZoneEngine(state, makeDefaultParams({
			targets: [], staticPresence: false, staticTimeout: 5, now: now + 8,
		}));
		expect(r4.sensorOccupancy).toBe(false);
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd frontend && npm run test -- --run src/lib/__tests__/zone-engine.test.ts 2>&1 | tail -20
```
Expected: new tests FAIL (properties don't exist yet).

- [ ] **Step 3: Add sensor fields to ZoneEngineParams and ZoneEngineResult**

In `frontend/src/lib/zone-engine.ts`, add to `ZoneEngineParams` (after `roomEntryPoint`, before `now`):

```typescript
	staticPresence?: boolean;
	motionPresence?: boolean;
	staticTimeout?: number;  // seconds
	motionTimeout?: number;  // seconds
```

Add to `ZoneEngineResult` (after `targets`):

```typescript
	staticState: "active" | "pending" | "inactive";
	motionState: "active" | "pending" | "inactive";
	sensorOccupancy: boolean;
```

Add sensor state tracking to `ZoneEngineState` (after `targetPrevXY`):

```typescript
	staticState: "active" | "pending" | "inactive";
	motionState: "active" | "pending" | "inactive";
	staticPendingSince: number | null;
	motionPendingSince: number | null;
```

Update `createZoneEngineState()` to initialize the new fields:

```typescript
		staticState: "inactive",
		motionState: "inactive",
		staticPendingSince: null,
		motionPendingSince: null,
```

- [ ] **Step 4: Implement sensor state machine in runLocalZoneEngine**

In `frontend/src/lib/zone-engine.ts`, add after the existing cleanup step (after the `// Clean up stale confirmed targets` block, before `// Build per-target status`):

```typescript
	// Sensor presence state machine
	const staticOn = params.staticPresence ?? false;
	const motionOn = params.motionPresence ?? false;
	const staticTimeout = params.staticTimeout ?? 10;
	const motionTimeout = params.motionTimeout ?? 10;

	if (staticOn) {
		state.staticState = "active";
		state.staticPendingSince = null;
	} else if (state.staticState === "active") {
		state.staticState = "pending";
		state.staticPendingSince = now;
	} else if (state.staticState === "pending" && state.staticPendingSince !== null) {
		if (now - state.staticPendingSince >= staticTimeout) {
			state.staticState = "inactive";
			state.staticPendingSince = null;
		}
	}

	if (motionOn) {
		state.motionState = "active";
		state.motionPendingSince = null;
	} else if (state.motionState === "active") {
		state.motionState = "pending";
		state.motionPendingSince = now;
	} else if (state.motionState === "pending" && state.motionPendingSince !== null) {
		if (now - state.motionPendingSince >= motionTimeout) {
			state.motionState = "inactive";
			state.motionPendingSince = null;
		}
	}

	// Force-clear: when both sensors inactive and no zones OCCUPIED, clear pending zones
	if (state.staticState === "inactive" && state.motionState === "inactive") {
		let anyOccupied = false;
		for (const [, st] of state.localZoneState) {
			if (st.occupied && st.pendingSince === null) {
				anyOccupied = true;
				break;
			}
		}
		if (!anyOccupied) {
			for (const [zid, st] of state.localZoneState) {
				if (st.occupied && st.pendingSince !== null) {
					st.occupied = false;
					st.pendingSince = null;
					st.confirmedTargets.clear();
					occupancy[zid] = false;
				}
			}
		}
	}

	// Compute sensor occupancy
	const sensorOccupancy =
		state.staticState !== "inactive" ||
		state.motionState !== "inactive" ||
		Object.values(occupancy).some((v) => v);
```

- [ ] **Step 5: Add new fields to the return value**

Update the return statement of `runLocalZoneEngine` to include:

```typescript
	return {
		occupancy,
		targets: targetResults,
		staticState: state.staticState,
		motionState: state.motionState,
		sensorOccupancy,
	};
```

- [ ] **Step 6: Run tests to verify they pass**

Run:
```bash
cd frontend && npm run test -- --run src/lib/__tests__/zone-engine.test.ts 2>&1 | tail -20
```
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/zone-engine.ts frontend/src/lib/__tests__/zone-engine.test.ts
git commit -m "feat: add sensor state machine and force-clear to TypeScript zone engine"
```

---

### Task 5: Update debug log format in target-controller.ts

**Files:**
- Modify: `frontend/src/controllers/target-controller.ts`

- [ ] **Step 1: Update enrichDebugLog to parse sensor prefix**

In `frontend/src/controllers/target-controller.ts`, replace the `enrichDebugLog` method (lines 136-168) with:

```typescript
	enrichDebugLog(raw: string): string {
		const zoneName = (zid: number): string => {
			if (zid === 0) return "Room";
			const cfg = this.host._zoneConfigs[zid - 1];
			return cfg ? cfg.name : `Zone ${zid}`;
		};
		const statusName: Record<string, string> = {
			A: "active",
			P: "pending",
			I: "inactive",
			O: "occupied",
		};

		const parts = raw.split("|");

		// New 3-section format: sensors|targets|zones
		// Legacy 2-section format: targets|zones
		let sensorPart: string;
		let targetPart: string;
		let zonePart: string;

		if (parts.length >= 3) {
			sensorPart = parts[0];
			targetPart = parts[1];
			zonePart = parts[2];
		} else {
			sensorPart = "";
			targetPart = parts[0] || "";
			zonePart = parts[1] || "";
		}

		// Sensors section
		let sStr = "";
		if (sensorPart.trim()) {
			const sensorTokens = sensorPart.trim().split(/\s+/);
			const sensorLabels: string[] = [];
			for (const tok of sensorTokens) {
				const [key, val] = tok.split(":");
				if (key === "S") sensorLabels.push(`Static: ${statusName[val] ?? val}`);
				else if (key === "M") sensorLabels.push(`Motion: ${statusName[val] ?? val}`);
				else if (key === "Occ") sensorLabels.push(`Occ: ${val === "1" ? "on" : "off"}`);
			}
			sStr = sensorLabels.join(", ");
		}

		// Targets section
		const targets = (targetPart || "")
			.trim()
			.split(/\s+/)
			.filter(Boolean)
			.map((s) => {
				const [t, z, st, sig] = s.split(":");
				const zid = parseInt(z?.replace("Z", "") ?? "0");
				return `${t}→${zoneName(zid)}(${statusName[st] ?? st},${sig})`;
			});

		// Zones section
		const zones = (zonePart || "")
			.trim()
			.split(/\s+/)
			.filter(Boolean)
			.map((s) => {
				const [z, st, cnt] = s.split(":");
				const zid = parseInt(z?.replace("Z", "") ?? "0");
				return `${zoneName(zid)}: ${statusName[st] ?? st}(${cnt})`;
			});

		const tStr = targets.length ? targets.join(" ") : "no targets";
		const zStr = zones.length ? zones.join(", ") : "all clear";

		if (sStr) {
			return `${sStr} | ${tStr} | ${zStr}`;
		}
		return `${tStr} | ${zStr}`;
	}
```

- [ ] **Step 2: Update _buildFrontendDebugLog to include sensor prefix**

In the `_buildFrontendDebugLog` method, replace the final section that builds and appends the raw log (starting from `const raw =` near line 300) with:

```typescript
		// Sensor state prefix
		const staticCode = result.staticState === "active" ? "A" : result.staticState === "pending" ? "P" : "I";
		const motionCode = result.motionState === "active" ? "A" : result.motionState === "pending" ? "P" : "I";
		const occCode = result.sensorOccupancy ? "1" : "0";
		const sensorPrefix = `S:${staticCode} M:${motionCode} Occ:${occCode}`;

		const raw = `${sensorPrefix}|${targetParts.join(" ")}|${zoneParts.join(" ")}`;
		const body = this.enrichDebugLog(raw);
		this._appendFrontendDebugLog(body);
```

- [ ] **Step 3: Update appendBackendDebugLog to prepend sensor state**

The backend debug log comes from firmware and may or may not have the sensor prefix yet. Update `appendBackendDebugLog` to prepend sensor state from `this.host._sensorState` when the firmware log doesn't include it.

Replace the `appendBackendDebugLog` method (lines 193-212) with:

```typescript
	appendBackendDebugLog(rawDebugLog: string): void {
		// If the firmware log doesn't have the sensor prefix (no 3-section format),
		// prepend sensor state from the host's sensorState
		let enrichedRaw = rawDebugLog;
		const parts = rawDebugLog.split("|");
		if (parts.length < 3) {
			const ss = this.host._sensorState;
			const staticCode = ss?.static_presence ? "A" : "I";
			const motionCode = ss?.motion_presence ? "A" : "I";
			const occCode = ss?.occupancy ? "1" : "0";
			enrichedRaw = `S:${staticCode} M:${motionCode} Occ:${occCode}|${rawDebugLog}`;
		}

		const body = this.enrichDebugLog(enrichedRaw);
		if (body !== this.host._backendDebugLogPrev) {
			this.host._backendDebugLogPrev = body;
			const ts = new Date().toLocaleTimeString("en-GB", {
				hour12: false,
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				fractionalSecondDigits: 1,
			});
			this.host._backendDebugLogLines.push(`${ts} ${body}`);
			if (this.host._backendDebugLogLines.length > DEBUG_LOG_MAX) {
				this.host._backendDebugLogLines = this.host._backendDebugLogLines.slice(
					-DEBUG_LOG_MAX,
				);
			}
			this.host.requestUpdate();
		}
	}
```

- [ ] **Step 4: Update runLocalZoneEngine call to pass sensor params**

In the `runLocalZoneEngine()` method of `TargetController` (lines 103-124), update the call to pass sensor state:

```typescript
	runLocalZoneEngine(): ZoneEngineResult {
		const ss = this.host._sensorState;
		const result = runLocalZoneEngine(this._zoneEngineState, {
			targets: this.host._targets,
			grid: this.host._grid,
			roomWidth: this.host._roomWidth,
			roomDepth: this.host._roomDepth,
			zoneConfigs: this.host._zoneConfigs,
			roomType: this.host._roomType,
			roomTrigger: this.host._roomTrigger,
			roomRenew: this.host._roomRenew,
			roomTimeout: this.host._roomTimeout,
			roomHandoffTimeout: this.host._roomHandoffTimeout,
			roomEntryPoint: this.host._roomEntryPoint,
			staticPresence: ss?.static_presence ?? false,
			motionPresence: ss?.motion_presence ?? false,
			// Timeouts default to 10s — the real timeout logic runs on the firmware.
			// The frontend zone engine is a local replica for the zone editor preview.
			staticTimeout: 10,
			motionTimeout: 10,
		});

		// Build raw debug log (same format as firmware)
		if (this.host._showDebugLog) {
			this._buildFrontendDebugLog(result);
		}

		return result;
	}
```

- [ ] **Step 5: Run frontend tests**

Run:
```bash
cd frontend && npm run test -- --run 2>&1 | tail -20
```
Expected: all tests PASS.

- [ ] **Step 6: Build frontend**

Run:
```bash
cd frontend && npm run build 2>&1 | tail -10
```
Expected: builds successfully.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/controllers/target-controller.ts
git commit -m "feat: add sensor state to debug log format and enrichment"
```

---

### Task 6: Wire sensors into firmware EPP component

**Files:**
- Modify: `firmware/components/epp/epp_component.h`
- Modify: `firmware/components/epp/epp_component.cpp`
- Modify: `firmware/components/epp/__init__.py`
- Modify: `firmware/common/everything-presence-pro-base.yaml`

- [ ] **Step 1: Add sensor pointers and timeout members to epp_component.h**

In the public section (after `set_zone_publish_interval`, line 67), add:

```cpp
  void set_static_presence_sensor(esphome::binary_sensor::BinarySensor *sensor) {
    static_presence_sensor_ = sensor;
  }
  void set_motion_presence_sensor(esphome::binary_sensor::BinarySensor *sensor) {
    motion_presence_sensor_ = sensor;
  }
  void set_static_timeout(float timeout) { static_timeout_ = timeout; }
  void set_motion_timeout_value(float timeout) { motion_timeout_ = timeout; }
```

In the protected section (after `config_protocol_sensor_`, line 115), add:

```cpp
  // Sensor presence inputs (references to existing binary sensors)
  esphome::binary_sensor::BinarySensor *static_presence_sensor_{nullptr};
  esphome::binary_sensor::BinarySensor *motion_presence_sensor_{nullptr};
  float static_timeout_{10.0f};
  float motion_timeout_{10.0f};
```

- [ ] **Step 2: Feed sensor state to zone engine in loop()**

In `firmware/components/epp/epp_component.cpp`, in `loop()`, add before the `zone_engine_.tick()` call (before line 71):

```cpp
  // Build sensor input for zone engine
  SensorInput sensor_input;
  if (static_presence_sensor_ != nullptr)
    sensor_input.static_on = static_presence_sensor_->state;
  if (motion_presence_sensor_ != nullptr)
    sensor_input.motion_on = motion_presence_sensor_->state;
  sensor_input.static_timeout = static_timeout_;
  sensor_input.motion_timeout = motion_timeout_;
```

Update the `tick()` call (line 71) from:

```cpp
  const auto &result = zone_engine_.tick(zone_input, ts);
```

to:

```cpp
  const auto &result = zone_engine_.tick(zone_input, ts, sensor_input);
```

- [ ] **Step 3: Add sensor fields to zone state JSON and update debug log**

Compute sensor code strings once at the start of the zone state publish block. Then use them in both the JSON fields and the debug log.

Replace the entire zone state JSON building block (lines 128-184, inside the `if (zone_state_sensor_ != nullptr)` block) with:

```cpp
    if (zone_state_sensor_ != nullptr) {
      // Compute sensor state codes (used in JSON fields and debug log)
      const char *static_code = result.static_state == SensorPresenceState::ACTIVE ? "A" :
                                 result.static_state == SensorPresenceState::PENDING ? "P" : "I";
      const char *motion_code = result.motion_state == SensorPresenceState::ACTIVE ? "A" :
                                 result.motion_state == SensorPresenceState::PENDING ? "P" : "I";

      char json[512];
      int pos = snprintf(json, sizeof(json),
          "{\"targets\":[");
      for (int i = 0; i < NUM_TARGETS; i++) {
        const char *status_str = "inactive";
        if (i < result.target_count) {
          switch (result.targets[i].status) {
            case TargetStatus::ACTIVE: status_str = "active"; break;
            case TargetStatus::PENDING: status_str = "pending"; break;
            default: break;
          }
        }
        int signal = (i < result.target_count) ? result.targets[i].signal : 0;
        pos += snprintf(json + pos, sizeof(json) - pos,
            "%s{\"signal\":%d,\"status\":\"%s\"}",
            i > 0 ? "," : "", signal, status_str);
      }
      pos += snprintf(json + pos, sizeof(json) - pos,
          "],\"zones\":{\"occupancy\":[");
      for (int i = 0; i < MAX_ZONE_SLOTS; i++) {
        pos += snprintf(json + pos, sizeof(json) - pos,
            "%s%s", i > 0 ? "," : "",
            result.zone_occupancy[i] ? "true" : "false");
      }
      pos += snprintf(json + pos, sizeof(json) - pos,
          "],\"tracking\":%s},"
          "\"static_state\":\"%s\",\"motion_state\":\"%s\",\"occupancy\":%s,"
          "\"frame_count\":%d,\"debug_log\":\"",
          result.device_tracking_present ? "true" : "false",
          static_code, motion_code,
          result.occupancy ? "true" : "false",
          result.frame_count);

      // Debug log: "S:A M:P Occ:1|T0:Z1:A:5|Z0:O:1 Z1:O:1"
      // Sensor prefix
      pos += snprintf(json + pos, sizeof(json) - pos,
          "S:%s M:%s Occ:%d|", static_code, motion_code, result.occupancy ? 1 : 0);
      // Targets part
      bool first_target = true;
      for (int i = 0; i < result.target_count && i < NUM_TARGETS; i++) {
        if (result.targets[i].status == TargetStatus::INACTIVE) continue;
        const char *s = result.targets[i].status == TargetStatus::ACTIVE ? "A" : "P";
        int zone = 0;
        if (result.targets[i].x != 0.0f || result.targets[i].y != 0.0f) {
          auto cell = grid_.xy_to_cell(result.targets[i].x, result.targets[i].y);
          if (cell >= 0 && cell < GRID_CELL_COUNT) {
            zone = grid_.cell_zone(cell);
          }
        }
        pos += snprintf(json + pos, sizeof(json) - pos,
            "%sT%d:Z%d:%s:%d", first_target ? "" : " ", i, zone, s, result.targets[i].signal);
        first_target = false;
      }
      // Zones part
      pos += snprintf(json + pos, sizeof(json) - pos, "|");
      bool first_zone = true;
      for (int i = 0; i < MAX_ZONE_SLOTS; i++) {
        if (!result.zone_occupancy[i]) continue;
        const char *zs = result.zone_states[i] == epp::ZoneState::PENDING_CLEAR ? "P" : "O";
        pos += snprintf(json + pos, sizeof(json) - pos,
            "%sZ%d:%s:%d", first_zone ? "" : " ", i, zs, result.zone_target_counts[i]);
        first_zone = false;
      }
      pos += snprintf(json + pos, sizeof(json) - pos, "\"}");
      zone_state_sensor_->publish_state(json);
    }
```

Note: bumped json buffer from 384 to 512 to accommodate the new fields.

- [ ] **Step 4: Update __init__.py to accept sensor ID references**

In `firmware/components/epp/__init__.py`, add config constants (after line 26):

```python
CONF_STATIC_PRESENCE = "static_presence"
CONF_MOTION_PRESENCE = "motion_presence"
```

Add to `CONFIG_SCHEMA` (after the `config_protocol` line, before `).extend`):

```python
        cv.Optional(CONF_STATIC_PRESENCE): cv.use_id(binary_sensor.BinarySensor),
        cv.Optional(CONF_MOTION_PRESENCE): cv.use_id(binary_sensor.BinarySensor),
```

Add to `to_code` (after the config_protocol block):

```python
    # Static presence binary sensor input (reference to existing sensor)
    if CONF_STATIC_PRESENCE in config:
        sens = await cg.get_variable(config[CONF_STATIC_PRESENCE])
        cg.add(var.set_static_presence_sensor(sens))

    # Motion presence binary sensor input (reference to existing sensor)
    if CONF_MOTION_PRESENCE in config:
        sens = await cg.get_variable(config[CONF_MOTION_PRESENCE])
        cg.add(var.set_motion_presence_sensor(sens))
```

This uses `cv.use_id` to reference existing binary sensors by ID, rather than creating new ones.

- [ ] **Step 5: Wire sensors in YAML and reduce hardware motion timeout**

In `firmware/common/everything-presence-pro-base.yaml`, add sensor references to the `epp:` section (after `zone_state:`, around line 93):

```yaml
  static_presence: dfrobot_presence
  motion_presence: pir_motion
```

Change the `motion_timeout` global initial value (line 111) from `'10'` to `'1'`:

```yaml
  - id: motion_timeout
    type: float
    initial_value: '1'
```

Update the `epp_set_motion_timeout` action (around line 169) to also update the EPP component:

```yaml
    - action: epp_set_motion_timeout
      variables:
        timeout: float
      then:
        - lambda: |-
            id(motion_timeout) = 1;
            id(epp_component).set_motion_timeout_value(timeout);
```

Note: the hardware `motion_timeout` global stays at 1s for debounce; the real timeout goes to the EPP component.

Find the `epp_set_static_presence` action and add after the existing UART/timeout commands:

```yaml
            id(epp_component).set_static_timeout(timeout);
```

- [ ] **Step 6: Commit**

```bash
git add firmware/components/epp/epp_component.h firmware/components/epp/epp_component.cpp firmware/components/epp/__init__.py firmware/common/everything-presence-pro-base.yaml
git commit -m "feat: wire static/motion sensors into EPP component and zone engine"
```

---

### Task 7: Update Python websocket API to parse new zone state fields

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py`

- [ ] **Step 1: Parse new sensor fields from zone state JSON**

In `custom_components/eppgrid/websocket_api.py`, in the `_on_state` callback of `websocket_subscribe_grid_targets` (around line 540-558), update the zone state JSON parsing. After the existing `sensors["target_presence"]` line (line 556), add:

```python
                    # Parse sensor presence states from firmware
                    static_state = zs.get("static_state")
                    if static_state:
                        zones["static_state"] = static_state
                    motion_state = zs.get("motion_state")
                    if motion_state:
                        zones["motion_state"] = motion_state
                    fw_occupancy = zs.get("occupancy")
                    if fw_occupancy is not None:
                        zones["occupancy_state"] = fw_occupancy
```

- [ ] **Step 2: Commit**

```bash
git add custom_components/eppgrid/websocket_api.py
git commit -m "feat: parse sensor state fields from firmware zone state JSON"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run all firmware tests**

```bash
cd firmware/lib/epp_zone_engine/build && cmake .. && make && ctest -V 2>&1 | tail -30
```
Expected: all tests PASS.

- [ ] **Step 2: Run all frontend tests**

```bash
cd frontend && npm run test -- --run 2>&1 | tail -20
```
Expected: all tests PASS.

- [ ] **Step 3: Build frontend**

```bash
cd frontend && npm run build 2>&1 | tail -10
```
Expected: builds successfully.

- [ ] **Step 4: Run biome lint**

```bash
cd frontend && npx biome check src/ 2>&1 | tail -10
```
Expected: no lint errors.
