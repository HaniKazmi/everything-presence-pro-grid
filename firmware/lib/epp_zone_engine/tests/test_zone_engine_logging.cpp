#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>
#include "epp_grid.h"
#include "epp_zone_engine.h"

#include <cstring>
#include <string>

using namespace epp;

// ---------------------------------------------------------------------------
// Shared helpers (same grid layout as test_zone_engine.cpp)
// ---------------------------------------------------------------------------

static constexpr float X_OFF = 8.0f * GRID_CELL_SIZE_MM;

static Grid make_grid() {
    Grid grid(0.0f, 0.0f, GRID_COLS, GRID_ROWS, GRID_CELL_SIZE_MM);
    for (int r = 0; r < 4; ++r) {
        for (int c = 8; c < 12; ++c) {
            grid.cell(r * GRID_COLS + c) = CELL_ROOM_BIT;
        }
    }
    // Zone 1 on cell (col=9, row=1)
    grid.cell(1 * GRID_COLS + 9) = CELL_ROOM_BIT | (1 << CELL_ZONE_SHIFT);
    return grid;
}

static ZoneEngine make_engine() {
    Grid grid = make_grid();

    ZoneConfig zone1{};
    zone1.id = 1;
    zone1.type = ZoneType::ENTRANCE;
    zone1.trigger = 3;
    zone1.renew = 2;
    zone1.timeout = 5.0f;
    zone1.handoff_timeout = 1.0f;
    zone1.entry_point = true;

    ZoneConfig zone0{};
    zone0.id = 0;
    zone0.type = ZoneType::NORMAL;
    zone0.trigger = 5;
    zone0.renew = 3;
    zone0.timeout = 10.0f;
    zone0.handoff_timeout = 3.0f;
    zone0.entry_point = false;

    ZoneConfig zones[] = {zone1, zone0};

    ZoneEngine engine;
    engine.set_grid(grid);
    engine.set_zones(zones, 2);
    return engine;
}

static WindowOutput make_window_0() {
    WindowOutput wo{};
    wo.total_frames = RAW_FPS;
    return wo;
}

static WindowOutput make_window_1(float x, float y, int fc) {
    WindowOutput wo{};
    wo.total_frames = RAW_FPS;
    wo.targets[0].median_x = x;
    wo.targets[0].median_y = y;
    wo.targets[0].frame_count = fc;
    wo.targets[0].active = (fc > 0);
    return wo;
}

static WindowOutput make_window_2(float x1, float y1, int fc1,
                                   float x2, float y2, int fc2) {
    WindowOutput wo{};
    wo.total_frames = RAW_FPS;
    wo.targets[0] = {x1, y1, fc1, (fc1 > 0)};
    wo.targets[1] = {x2, y2, fc2, (fc2 > 0)};
    return wo;
}

// ---------------------------------------------------------------------------
// Log search helpers
// ---------------------------------------------------------------------------

static bool has_log(const ProcessingResult& r, LogLevel level, const char* substr) {
    for (int i = 0; i < r.log_count; ++i) {
        if (r.log[i].level == level && strstr(r.log[i].message, substr) != nullptr) {
            return true;
        }
    }
    return false;
}

static bool has_info(const ProcessingResult& r, const char* substr) {
    return has_log(r, LogLevel::INFO, substr);
}

static bool has_debug(const ProcessingResult& r, const char* substr) {
    return has_log(r, LogLevel::DEBUG, substr);
}

// ---------------------------------------------------------------------------
// Infrastructure tests
// ---------------------------------------------------------------------------

TEST_CASE("log: result starts with zero log entries") {
    ZoneEngine engine = make_engine();
    const ProcessingResult& r = engine.tick(make_window_0(), 100.0f);
    CHECK(r.log_count == 0);
}

// ---------------------------------------------------------------------------
// Zone state transition logs (INFO)
// ---------------------------------------------------------------------------

TEST_CASE("log: zone CLEAR -> OCCUPIED produces info log") {
    ZoneEngine engine = make_engine();
    // Zone 1 (entry point), trigger=3 → immediate confirmation
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 3), 100.0f);
    CHECK(r.zone_occupancy[1]);
    CHECK(has_info(r, "Zone 1"));
    CHECK(has_info(r, "occupied"));
}

TEST_CASE("log: zone OCCUPIED -> PENDING produces info log") {
    ZoneEngine engine = make_engine();
    // Occupy zone 1
    engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f);
    // Target disappears → PENDING
    const ProcessingResult& r = engine.tick(make_window_0(), 101.0f);
    CHECK(r.zone_occupancy[1]);  // still true (pending)
    CHECK(has_info(r, "Zone 1"));
    CHECK(has_info(r, "pending"));
}

TEST_CASE("log: zone PENDING -> CLEAR produces info log") {
    ZoneEngine engine = make_engine();
    engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f);
    engine.tick(make_window_0(), 101.0f);
    // Past timeout (entrance timeout=5s)
    const ProcessingResult& r = engine.tick(make_window_0(), 107.0f);
    CHECK_FALSE(r.zone_occupancy[1]);
    CHECK(has_info(r, "Zone 1"));
    CHECK(has_info(r, "clear"));
}

TEST_CASE("log: no zone transition → no zone info log") {
    ZoneEngine engine = make_engine();
    // First tick: CLEAR → OCCUPIED (has log)
    engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f);
    // Second tick: still OCCUPIED, no state change
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 5), 101.0f);
    CHECK_FALSE(has_info(r, "Zone 1"));
}

// ---------------------------------------------------------------------------
// Target tracking debug logs — event-driven (transitions only)
// ---------------------------------------------------------------------------

TEST_CASE("log: target newly confirmed in zone produces debug log") {
    ZoneEngine engine = make_engine();
    // Zone 1 entry point, signal=5 → first confirmation
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f);
    CHECK(has_debug(r, "T0"));
    CHECK(has_debug(r, "entered"));
    CHECK(has_debug(r, "zone 1"));
}

TEST_CASE("log: stably confirmed target does NOT re-log every tick") {
    ZoneEngine engine = make_engine();
    // First tick: enter zone 1 (logs)
    engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f);
    // Second tick: still in zone 1 — no debug log
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 5), 101.0f);
    CHECK_FALSE(has_debug(r, "T0"));
}

TEST_CASE("log: target gating produces debug log") {
    ZoneEngine engine = make_engine();
    // Zone 0 (non-entry), signal=7 meets gated threshold → gate_count=1
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 150, 150, 7), 100.0f);
    CHECK_FALSE(r.zone_occupancy[0]);
    CHECK(has_debug(r, "T0"));
    CHECK(has_debug(r, "gating"));
}

TEST_CASE("log: target below threshold only logs on drop from confirmed") {
    ZoneEngine engine = make_engine();
    float t = 100.0f;

    // First tick: weak signal, never confirmed — no log (noise)
    const ProcessingResult& r1 = engine.tick(make_window_1(X_OFF + 450, 450, 2), t);
    CHECK_FALSE(has_debug(r1, "below"));

    // Confirm target in zone 1
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t + 1.0f);

    // Signal drops below threshold — NOW it should log
    const ProcessingResult& r3 = engine.tick(make_window_1(X_OFF + 450, 450, 1), t + 2.0f);
    CHECK(has_debug(r3, "T0"));
    CHECK(has_debug(r3, "below"));
}

TEST_CASE("log: target outside room only logs on transition from in-room") {
    ZoneEngine engine = make_engine();
    float t = 100.0f;

    // Target appears outside room — no log (was never in room)
    const ProcessingResult& r1 = engine.tick(make_window_1(9000, 9000, 9), t);
    CHECK_FALSE(has_debug(r1, "outside"));

    // Target enters room
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t + 1.0f);

    // Target leaves room — NOW it should log
    const ProcessingResult& r3 = engine.tick(make_window_1(9000, 9000, 9), t + 2.0f);
    CHECK(has_debug(r3, "T0"));
    CHECK(has_debug(r3, "left room"));
}

TEST_CASE("log: stably outside-room target does NOT re-log every tick") {
    ZoneEngine engine = make_engine();
    float t = 100.0f;

    // Enter room then leave
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t);
    engine.tick(make_window_1(9000, 9000, 9), t + 1.0f);  // logs "left room"

    // Still outside — no log
    const ProcessingResult& r = engine.tick(make_window_1(9000, 9000, 9), t + 2.0f);
    CHECK_FALSE(has_debug(r, "left room"));
}

// ---------------------------------------------------------------------------
// Handoff logs
// ---------------------------------------------------------------------------

TEST_CASE("log: handoff produces debug log") {
    ZoneEngine engine = make_engine();
    // Establish in zone 1
    engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f);
    // Move to zone 0 → handoff
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 150, 150, 7), 101.0f);
    CHECK(has_debug(r, "T0"));
    CHECK(has_debug(r, "handoff"));
    CHECK(has_debug(r, "zone 1"));
    CHECK(has_debug(r, "zone 0"));
}

// ---------------------------------------------------------------------------
// Sensor state transition logs (INFO)
// ---------------------------------------------------------------------------

TEST_CASE("log: static INACTIVE -> ACTIVE produces info log") {
    ZoneEngine engine = make_engine();
    SensorInput sensors;
    sensors.static_on = true;
    sensors.static_timeout = 5.0f;
    const ProcessingResult& r = engine.tick(make_window_0(), 100.0f, sensors);
    CHECK(has_info(r, "Static"));
    CHECK(has_info(r, "active"));
}

TEST_CASE("log: static ACTIVE -> PENDING produces info log") {
    ZoneEngine engine = make_engine();
    SensorInput sensors;
    sensors.static_on = true;
    sensors.static_timeout = 5.0f;
    engine.tick(make_window_0(), 100.0f, sensors);
    sensors.static_on = false;
    const ProcessingResult& r = engine.tick(make_window_0(), 101.0f, sensors);
    CHECK(has_info(r, "Static"));
    CHECK(has_info(r, "pending"));
}

TEST_CASE("log: static PENDING -> INACTIVE produces info log") {
    ZoneEngine engine = make_engine();
    SensorInput sensors;
    sensors.static_on = true;
    sensors.static_timeout = 5.0f;
    engine.tick(make_window_0(), 100.0f, sensors);
    sensors.static_on = false;
    engine.tick(make_window_0(), 101.0f, sensors);
    const ProcessingResult& r = engine.tick(make_window_0(), 107.0f, sensors);
    CHECK(has_info(r, "Static"));
    CHECK(has_info(r, "inactive"));
}

TEST_CASE("log: motion transitions produce info logs") {
    ZoneEngine engine = make_engine();
    SensorInput sensors;
    sensors.motion_on = true;
    sensors.motion_timeout = 3.0f;
    const ProcessingResult& r1 = engine.tick(make_window_0(), 100.0f, sensors);
    CHECK(has_info(r1, "Motion"));
    CHECK(has_info(r1, "active"));

    sensors.motion_on = false;
    const ProcessingResult& r2 = engine.tick(make_window_0(), 101.0f, sensors);
    CHECK(has_info(r2, "Motion"));
    CHECK(has_info(r2, "pending"));

    const ProcessingResult& r3 = engine.tick(make_window_0(), 105.0f, sensors);
    CHECK(has_info(r3, "Motion"));
    CHECK(has_info(r3, "inactive"));
}

TEST_CASE("log: sensor stays same state → no sensor info log") {
    ZoneEngine engine = make_engine();
    SensorInput sensors;
    sensors.static_on = true;
    sensors.static_timeout = 5.0f;
    engine.tick(make_window_0(), 100.0f, sensors);
    // Still on → still ACTIVE, no transition
    const ProcessingResult& r = engine.tick(make_window_0(), 101.0f, sensors);
    CHECK_FALSE(has_info(r, "Static"));
}

// ---------------------------------------------------------------------------
// Force-clear logs (INFO)
// ---------------------------------------------------------------------------

TEST_CASE("log: force-clear produces info log") {
    ZoneEngine engine = make_engine();
    float t = 100.0f;
    SensorInput sensors;
    sensors.static_on = true;
    sensors.static_timeout = 1.0f;
    sensors.motion_on = true;
    sensors.motion_timeout = 1.0f;

    // Occupy zone 1, sensors active
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t, sensors);
    // Target disappears → zone pending
    engine.tick(make_window_0(), t + 1.0f, sensors);
    // Sensors off
    sensors.static_on = false;
    sensors.motion_on = false;
    engine.tick(make_window_0(), t + 2.0f, sensors);
    // Sensors expired → force-clear fires
    const ProcessingResult& r = engine.tick(make_window_0(), t + 3.5f, sensors);
    CHECK_FALSE(r.zone_occupancy[1]);
    CHECK(has_info(r, "force-clear"));
}

// ---------------------------------------------------------------------------
// Occupancy change logs (INFO)
// ---------------------------------------------------------------------------

TEST_CASE("log: occupancy on produces info log") {
    ZoneEngine engine = make_engine();
    // Target triggers zone 1 → occupancy on
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f);
    CHECK(r.occupancy);
    CHECK(has_info(r, "Occupancy"));
    CHECK(has_info(r, "on"));
}

TEST_CASE("log: occupancy off produces info log") {
    ZoneEngine engine = make_engine();
    // Occupy then clear
    engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f);
    engine.tick(make_window_0(), 101.0f);
    // Past timeout
    const ProcessingResult& r = engine.tick(make_window_0(), 107.0f);
    CHECK_FALSE(r.occupancy);
    CHECK(has_info(r, "Occupancy"));
    CHECK(has_info(r, "off"));
}

TEST_CASE("log: occupancy unchanged → no occupancy log") {
    ZoneEngine engine = make_engine();
    // Two ticks with no targets → occupancy stays false
    engine.tick(make_window_0(), 100.0f);
    const ProcessingResult& r = engine.tick(make_window_0(), 101.0f);
    CHECK_FALSE(has_info(r, "Occupancy"));
}
