# Firmware Phase 2: C++ Zone Engine Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Python zone engine (`zone_engine.py`, `calibration.py`, `const.py`) to C++ as a host-testable library, validated by shared parity test fixtures across C++, Python, and TypeScript.

**Architecture:** Direct port of the Python zone engine algorithms to C++. The library uses fixed-size arrays (no heap allocation in hot path), standard C++17 only. Tests use doctest and shared JSON parity fixtures. The Python `statistics.median()` is implemented as a simple sort-and-pick for the small arrays involved (max 10 elements).

**Tech Stack:** C++17, doctest, CMake, nlohmann/json (for test fixtures only — not linked into the library itself)

**Spec:** `docs/superpowers/specs/2026-03-24-firmware-integration-design.md`

**Working directory:** `/workspaces/ha-dev/everything-presence-pro-grid/.worktrees/firmware/`

**Reference files (Python source to port):**
- `custom_components/eppgrid/zone_engine.py` — Grid, TumblingWindow, ZoneEngine, ProcessingResult
- `custom_components/eppgrid/calibration.py` — SensorTransform
- `custom_components/eppgrid/const.py` — Constants, zone type defaults, threshold_to_frame_count
- `tests/test_zone_engine_parity.py` — Existing Python parity tests (scenarios to extract)

---

## File Structure

### Modified Files
- `firmware/lib/epp_zone_engine/include/epp_types.h` — Add zone type defaults, threshold_to_frame_count
- `firmware/lib/epp_zone_engine/include/epp_grid.h` — Full Grid implementation
- `firmware/lib/epp_zone_engine/include/epp_calibration.h` — Full SensorTransform implementation
- `firmware/lib/epp_zone_engine/include/epp_tumbling_window.h` — Full TumblingWindow implementation
- `firmware/lib/epp_zone_engine/include/epp_zone_engine.h` — Full ZoneEngine implementation
- `firmware/lib/epp_zone_engine/src/epp_grid.cpp` — Grid methods
- `firmware/lib/epp_zone_engine/src/epp_calibration.cpp` — SensorTransform::apply
- `firmware/lib/epp_zone_engine/src/epp_tumbling_window.cpp` — TumblingWindow methods
- `firmware/lib/epp_zone_engine/src/epp_zone_engine.cpp` — ZoneEngine::tick, state machine
- `firmware/lib/epp_zone_engine/CMakeLists.txt` — Add nlohmann/json for tests
- `firmware/lib/epp_zone_engine/tests/CMakeLists.txt` — Add new test files
- `firmware/lib/epp_zone_engine/tests/test_grid.cpp` — Full grid tests

### New Files
- `firmware/lib/epp_zone_engine/tests/test_calibration.cpp` — SensorTransform tests
- `firmware/lib/epp_zone_engine/tests/test_tumbling_window.cpp` — TumblingWindow tests
- `firmware/lib/epp_zone_engine/tests/test_zone_engine.cpp` — ZoneEngine unit tests
- `firmware/lib/epp_zone_engine/tests/test_parity.cpp` — Shared parity fixture tests
- `tests/fixtures/parity_scenarios.json` — Shared test scenarios
- `tests/test_zone_engine_parity_fixtures.py` — Python parity tests from fixtures

---

## Tasks

### Task 1: Implement Grid class

Port `zone_engine.py` Grid class to C++. Methods: constructor, `xy_to_cell`, `cell_zone`, `cell_is_room`, `load_from_bytes`.

**Files:**
- Modify: `firmware/lib/epp_zone_engine/include/epp_types.h` — Add threshold_to_frame_count, zone type constants
- Modify: `firmware/lib/epp_zone_engine/include/epp_grid.h` — Full Grid class
- Modify: `firmware/lib/epp_zone_engine/src/epp_grid.cpp` — Grid implementation
- Modify: `firmware/lib/epp_zone_engine/tests/test_grid.cpp` — Full tests

**Reference:** `custom_components/eppgrid/zone_engine.py:114-216` (Grid class), `custom_components/eppgrid/const.py` (constants)

- [ ] **Step 1: Update epp_types.h with zone type defaults and threshold function**

Add to `epp_types.h`:
- Zone type string constants (ZONE_TYPE_NORMAL, etc.)
- ZoneTypeDefaults struct with trigger, renew, timeout, handoff_timeout
- Array of defaults indexed by zone type enum
- `threshold_to_frame_count()` inline function: `return std::max(1, threshold);`
- ENTRY_POINT_ZONE_TYPES — entrance is the only entry point type

- [ ] **Step 2: Write Grid tests in test_grid.cpp**

Test cases matching Python test coverage:
- `xy_to_cell` returns correct cell index for valid coordinates
- `xy_to_cell` returns -1 for out-of-bounds coordinates
- `cell_zone` extracts zone ID correctly from cell byte
- `cell_is_room` checks room bit correctly
- `load_from_bytes` populates cells array
- Origin offset shifts mapping correctly

- [ ] **Step 3: Run tests — verify they fail**

```bash
cd firmware/lib/epp_zone_engine && cmake -B build -DCMAKE_BUILD_TYPE=Debug && cmake --build build && cd build && ctest --output-on-failure
```

- [ ] **Step 4: Implement Grid class**

In `epp_grid.h` — declare full interface:
```cpp
class Grid {
public:
    Grid(float origin_x = 0.0f, float origin_y = 0.0f,
         int cols = GRID_COLS, int rows = GRID_ROWS,
         int cell_size = GRID_CELL_SIZE_MM);

    int xy_to_cell(float x, float y) const;  // returns -1 if outside
    int cell_zone(int cell_index) const;
    bool cell_is_room(int cell_index) const;
    void load_from_bytes(const uint8_t* data, int len);

    float origin_x() const { return origin_x_; }
    float origin_y() const { return origin_y_; }
    int cols() const { return cols_; }
    int rows() const { return rows_; }
    int cell_size() const { return cell_size_; }
    int cell_count() const { return cols_ * rows_; }
    uint8_t& cell(int index) { return cells_[index]; }
    const uint8_t& cell(int index) const { return cells_[index]; }

private:
    std::array<uint8_t, GRID_CELL_COUNT> cells_{};
    float origin_x_;
    float origin_y_;
    int cols_;
    int rows_;
    int cell_size_;
};
```

In `epp_grid.cpp` — implement methods matching Python exactly.

- [ ] **Step 5: Run tests — verify they pass**
- [ ] **Step 6: Commit**

```bash
git add firmware/lib/epp_zone_engine/ && git commit -m "Implement C++ Grid class with tests"
```

---

### Task 2: Implement SensorTransform

Port `calibration.py` SensorTransform to C++. Just the `apply()` method — serialization is not needed in the library.

**Files:**
- Modify: `firmware/lib/epp_zone_engine/include/epp_calibration.h`
- Modify: `firmware/lib/epp_zone_engine/src/epp_calibration.cpp`
- Create: `firmware/lib/epp_zone_engine/tests/test_calibration.cpp`

**Reference:** `custom_components/eppgrid/calibration.py`

- [ ] **Step 1: Write SensorTransform tests**

Test cases:
- Identity-like transform returns input unchanged
- Known perspective coefficients produce expected output
- Zero denominator returns input (safety)
- No coefficients set returns input unchanged

- [ ] **Step 2: Run tests — verify they fail**
- [ ] **Step 3: Implement SensorTransform**

```cpp
class SensorTransform {
public:
    SensorTransform() = default;
    void set_coefficients(const float coeffs[8], float room_width, float room_depth);
    bool has_perspective() const { return has_perspective_; }
    std::pair<float, float> apply(float x, float y) const;
    float room_width() const { return room_width_; }
    float room_depth() const { return room_depth_; }

private:
    float coeffs_[8]{};
    float room_width_ = 0.0f;
    float room_depth_ = 0.0f;
    bool has_perspective_ = false;
};
```

`apply()` matches Python exactly:
```
denom = g*x + h*y + 1.0
if abs(denom) < 1e-10: return (x, y)
rx = (a*x + b*y + c) / denom
ry = (d*x + e*y + f) / denom
```

- [ ] **Step 4: Run tests — verify they pass**
- [ ] **Step 5: Commit**

---

### Task 3: Implement TumblingWindow

Port `zone_engine.py` TumblingWindow to C++. Accumulates raw frames over 1 second, emits per-target median positions and frame counts.

**Files:**
- Modify: `firmware/lib/epp_zone_engine/include/epp_tumbling_window.h`
- Modify: `firmware/lib/epp_zone_engine/src/epp_tumbling_window.cpp`
- Create: `firmware/lib/epp_zone_engine/tests/test_tumbling_window.cpp`

**Reference:** `custom_components/eppgrid/zone_engine.py:219-313` (TumblingWindow class)

- [ ] **Step 1: Write TumblingWindow tests**

Test cases:
- Feeding frames within 1s window does not emit
- Feeding frame after 1s emits WindowOutput with median positions
- Inactive targets (active=false) don't contribute to median
- Frame count reflects number of active frames per target
- Multiple targets accumulate independently
- Window resets after emit

- [ ] **Step 2: Run tests — verify they fail**
- [ ] **Step 3: Implement TumblingWindow**

Key implementation detail: median for small arrays (max 10 elements). Use `std::nth_element` on a stack-allocated copy:

```cpp
float median(const float* data, int count) {
    float buf[RAW_FPS + 1];
    std::copy(data, data + count, buf);
    int mid = count / 2;
    std::nth_element(buf, buf + mid, buf + count);
    if (count % 2 == 0) {
        float a = buf[mid];
        std::nth_element(buf, buf + mid - 1, buf + count);
        return (a + buf[mid - 1]) / 2.0f;
    }
    return buf[mid];
}
```

Data structures — fixed arrays, no heap:
```cpp
struct TargetAccumulator {
    float xs[RAW_FPS + 1];
    float ys[RAW_FPS + 1];
    int count = 0;
};

class TumblingWindow {
public:
    explicit TumblingWindow(float interval_s = 1.0f);
    WindowOutput* feed(const TargetInput targets[], int count, float timestamp);
    void reset();

private:
    void accumulate(const TargetInput targets[], int count);
    void emit();

    float interval_s_;
    float window_start_ = -1.0f;
    int frame_count_ = 0;
    TargetAccumulator accum_[MAX_TARGETS];
    WindowOutput output_;  // reused buffer
};
```

- [ ] **Step 4: Run tests — verify they pass**
- [ ] **Step 5: Commit**

---

### Task 4: Implement ZoneEngine

Port `zone_engine.py` ZoneEngine._tick() to C++. This is the most complex piece — entry-point gating, continuity checks, handoff detection, state machine.

**Files:**
- Modify: `firmware/lib/epp_zone_engine/include/epp_zone_engine.h`
- Modify: `firmware/lib/epp_zone_engine/src/epp_zone_engine.cpp`
- Create: `firmware/lib/epp_zone_engine/tests/test_zone_engine.cpp`

**Reference:** `custom_components/eppgrid/zone_engine.py:402-737` (ZoneEngine class)

- [ ] **Step 1: Write ZoneEngine unit tests**

Test cases (distinct from parity tests — these test internal mechanics):
- No targets → all zones clear
- Target in entry point zone with signal >= trigger → zone occupied
- Target below trigger threshold → zone stays clear
- Non-entry zone requires 2 consecutive gating ticks
- Continuous movement skips gating
- OCCUPIED → PENDING when target disappears
- PENDING → CLEAR after timeout
- PENDING → OCCUPIED if target re-enters
- Handoff: target moves between zones, source zone gets accelerated timeout
- Target outside grid → no zone occupancy
- Target on non-room cell → no zone occupancy
- Per-target status: ACTIVE, PENDING, INACTIVE correctly assigned

- [ ] **Step 2: Run tests — verify they fail**
- [ ] **Step 3: Implement ZoneEngine**

Data structures:
```cpp
struct ZoneConfig {
    int id;
    char type[16];  // "normal", "entrance", etc.
    int trigger;
    int renew;
    float timeout;
    float handoff_timeout;
    bool entry_point;
};

struct ZoneRuntime {
    ZoneConfig config;
    ZoneState state = ZoneState::CLEAR;
    float pending_since = -1.0f;
    uint8_t confirmed_targets = 0;  // bitmask, MAX_TARGETS=3
};

struct TargetResult {
    float x = 0.0f;
    float y = 0.0f;
    TargetStatus status = TargetStatus::INACTIVE;
    int signal = 0;
};

struct ProcessingResult {
    bool device_tracking_present = false;
    bool zone_occupancy[MAX_ZONE_SLOTS]{};
    int zone_target_counts[MAX_ZONE_SLOTS]{};
    int frame_count = 0;
    TargetResult targets[MAX_TARGETS];
    int target_count = 0;
};

class ZoneEngine {
public:
    ZoneEngine();
    void set_grid(const Grid& grid);
    void set_zones(const ZoneConfig zones[], int count);
    const ProcessingResult& tick(const WindowOutput& window, float timestamp);

private:
    Grid grid_;
    ZoneRuntime zones_[MAX_ZONE_SLOTS];
    int zone_count_ = 0;

    // Per-target tracking state
    int target_prev_col_[MAX_TARGETS];
    int target_prev_row_[MAX_TARGETS];
    bool target_has_prev_[MAX_TARGETS];
    float target_prev_x_[MAX_TARGETS];
    float target_prev_y_[MAX_TARGETS];
    bool target_has_prev_xy_[MAX_TARGETS];
    int target_gate_count_[MAX_TARGETS];

    ProcessingResult result_;
};
```

The `tick()` method must match `zone_engine.py:_tick()` exactly:
1. Evaluate each target: cell → zone → continuity check → gating → confirm
2. Handoff detection: targets that changed zones
3. State machine per zone: CLEAR/OCCUPIED/PENDING transitions
4. Build per-target results with status
5. Clean up stale confirmed_targets
6. Compute device_tracking_present

- [ ] **Step 4: Run tests — verify they pass**
- [ ] **Step 5: Commit**

---

### Task 5: Create shared parity fixtures

Extract the test scenarios from `tests/test_zone_engine_parity.py` into a JSON fixture file. All three languages will consume these fixtures.

**Files:**
- Create: `tests/fixtures/parity_scenarios.json`

**Reference:** `tests/test_zone_engine_parity.py` — all test methods become JSON scenarios

- [ ] **Step 1: Create the parity fixtures JSON**

Extract every test from `test_zone_engine_parity.py` into the JSON format defined in the spec. Each test becomes a scenario with grid setup, zone configs, tick sequence, and expected outputs.

Key mapping:
- `_make_parity_grid()` → grid config in each scenario
- `_make_parity_engine()` → zone configs
- `_window()` calls → ticks array
- assertions → expected array
- Grid-space coordinates (include X_OFF = 2400)

- [ ] **Step 2: Verify fixture is valid JSON**

```bash
python3 -c "import json; json.load(open('tests/fixtures/parity_scenarios.json'))"
```

- [ ] **Step 3: Commit**

---

### Task 6: Write C++ parity tests consuming fixtures

Add a test file that reads the JSON fixtures and runs each scenario through the C++ ZoneEngine.

**Files:**
- Modify: `firmware/lib/epp_zone_engine/CMakeLists.txt` — Add nlohmann/json dependency
- Modify: `firmware/lib/epp_zone_engine/tests/CMakeLists.txt` — Add test_parity.cpp, pass fixture path
- Create: `firmware/lib/epp_zone_engine/tests/test_parity.cpp`

- [ ] **Step 1: Add nlohmann/json to CMakeLists.txt**

Add FetchContent for nlohmann/json (used only in tests, not the library itself).

- [ ] **Step 2: Write test_parity.cpp**

Reads `parity_scenarios.json`, for each scenario:
1. Build grid from room_cells and zone_cells
2. Create ZoneEngine with zone configs
3. For each tick: build WindowOutput, call tick(), compare results against expected

The fixture path is passed via CMake define: `-DEPP_FIXTURE_PATH=...`

- [ ] **Step 3: Run tests — verify all parity scenarios pass**

```bash
cd firmware/lib/epp_zone_engine && cmake -B build -DCMAKE_BUILD_TYPE=Debug && cmake --build build && cd build && ctest --output-on-failure
```

- [ ] **Step 4: Commit**

---

### Task 7: Migrate Python parity tests to consume fixtures

Add a new test file that reads the same JSON fixtures and runs them through the Python ZoneEngine.

**Files:**
- Create: `tests/test_zone_engine_parity_fixtures.py`

**Note:** The existing `test_zone_engine_parity.py` stays as-is (it's the hand-written version). The new file runs the SAME scenarios from the JSON fixtures through the Python engine. Both must pass.

- [ ] **Step 1: Write test_zone_engine_parity_fixtures.py**

Read `tests/fixtures/parity_scenarios.json`. For each scenario:
1. Build Grid from room_cells and zone_cells
2. Create ZoneEngine with zone configs
3. For each tick: build WindowOutput, call _tick(), assert expected results

- [ ] **Step 2: Run tests**

```bash
pytest tests/test_zone_engine_parity_fixtures.py -v
```

Expected: All scenarios pass (since the fixtures were extracted from the existing Python tests).

- [ ] **Step 3: Commit**

---

### Task 8: Final verification

- [ ] **Step 1: Run all C++ tests**

```bash
cd firmware/lib/epp_zone_engine && cmake -B build -DCMAKE_BUILD_TYPE=Debug && cmake --build build && cd build && ctest --output-on-failure
```

Expected: All tests pass including parity fixtures.

- [ ] **Step 2: Run all Python tests**

```bash
pytest tests/ -v
```

Expected: All 328+ tests pass including new fixture-based parity tests.

- [ ] **Step 3: Verify firmware still compiles**

```bash
esphome compile firmware/variants/wifi.yaml
```

Expected: Success (library changes don't affect firmware compile yet — component doesn't use the library).

- [ ] **Step 4: Clean up build artifacts**

```bash
rm -rf firmware/lib/epp_zone_engine/build
```
