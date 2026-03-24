#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>
#include "epp_grid.h"
#include "epp_tumbling_window.h"
#include "epp_zone_engine.h"

using namespace epp;

// ---------------------------------------------------------------------------
// Shared helpers matching the Python parity test setup
// ---------------------------------------------------------------------------

// Grid-space offset: room x=0 starts at col 8 -> x_offset = 8 * 300 = 2400
static constexpr float X_OFF = 8.0f * GRID_CELL_SIZE_MM;

static Grid make_parity_grid() {
    // 20x20, room cells at cols 8-11 rows 0-3
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

static ZoneEngine make_parity_engine() {
    Grid grid = make_parity_grid();

    // Zone 1: entrance, trigger=3, renew=2, timeout=5, handoff_timeout=1, entry_point=true
    ZoneConfig zone1{};
    zone1.id = 1;
    zone1.type = ZoneType::ENTRANCE;
    zone1.trigger = 3;
    zone1.renew = 2;
    zone1.timeout = 5.0f;
    zone1.handoff_timeout = 1.0f;
    zone1.entry_point = true;

    // Zone 0: normal, trigger=5, renew=3, timeout=10, handoff_timeout=3, entry_point=false
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

/// Build a WindowOutput from up to MAX_TARGETS (x, y, frame_count) values.
/// Targets with frame_count=0 are marked inactive.
struct TargetSpec {
    float x;
    float y;
    int frame_count;
};

static WindowOutput make_window(const TargetSpec specs[], int count) {
    WindowOutput wo{};
    wo.total_frames = RAW_FPS;
    for (int i = 0; i < count && i < MAX_TARGETS; ++i) {
        wo.targets[i].median_x = specs[i].x;
        wo.targets[i].median_y = specs[i].y;
        wo.targets[i].frame_count = specs[i].frame_count;
        wo.targets[i].active = (specs[i].frame_count > 0);
    }
    return wo;
}

// Convenience overloads
static WindowOutput make_window_0() {
    return make_window(nullptr, 0);
}

static WindowOutput make_window_1(float x, float y, int fc) {
    TargetSpec specs[] = {{x, y, fc}};
    return make_window(specs, 1);
}

static WindowOutput make_window_2(float x1, float y1, int fc1,
                                   float x2, float y2, int fc2) {
    TargetSpec specs[] = {{x1, y1, fc1}, {x2, y2, fc2}};
    return make_window(specs, 2);
}

// ---------------------------------------------------------------------------
// Parity tests
// ---------------------------------------------------------------------------

TEST_CASE("no targets → all zones clear") {
    ZoneEngine engine = make_parity_engine();
    const ProcessingResult& r = engine.tick(make_window_0(), 100.0f);
    CHECK_FALSE(r.zone_occupancy[0]);
    CHECK_FALSE(r.zone_occupancy[1]);
}

TEST_CASE("inactive target → all zones clear") {
    ZoneEngine engine = make_parity_engine();
    // frame_count=0 means inactive
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 0), 100.0f);
    CHECK_FALSE(r.zone_occupancy[0]);
    CHECK_FALSE(r.zone_occupancy[1]);
}

TEST_CASE("target in entrance zone with signal >= trigger → zone 1 occupied") {
    ZoneEngine engine = make_parity_engine();
    // Zone 1 at cell (9,1): x = 9*300 + 150 = 2850, y = 1*300 + 150 = 450
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 3), 100.0f);
    CHECK(r.zone_occupancy[1]);
    CHECK_FALSE(r.zone_occupancy[0]);
}

TEST_CASE("target below trigger → zone stays clear") {
    ZoneEngine engine = make_parity_engine();
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 2), 100.0f);
    CHECK_FALSE(r.zone_occupancy[1]);
}

TEST_CASE("zone 0 gating: needs 2 consecutive qualifying ticks") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // Zone 0: trigger=5, gated threshold = min(5+2, 8) = 7
    // First tick: signal=7 meets gated threshold, gate_count=1
    const ProcessingResult& r1 = engine.tick(make_window_1(X_OFF + 150, 150, 7), t);
    CHECK_FALSE(r1.zone_occupancy[0]);

    // Second tick: continuous from tick 1, bypasses gating → confirmed
    const ProcessingResult& r2 = engine.tick(make_window_1(X_OFF + 150, 150, 7), t + 1.0f);
    CHECK(r2.zone_occupancy[0]);
}

TEST_CASE("entry point bypasses gating") {
    ZoneEngine engine = make_parity_engine();
    // Zone 1 is entrance (entry_point=True), trigger=3
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 3), 100.0f);
    CHECK(r.zone_occupancy[1]);
}

TEST_CASE("PENDING then CLEAR after timeout") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // Occupy zone 1
    const ProcessingResult& r1 = engine.tick(make_window_1(X_OFF + 450, 450, 5), t);
    CHECK(r1.zone_occupancy[1]);

    // Target disappears → PENDING (still reports occupied)
    const ProcessingResult& r2 = engine.tick(make_window_1(X_OFF + 450, 450, 0), t + 1.0f);
    CHECK(r2.zone_occupancy[1]);

    // After timeout (entrance timeout=5s) → CLEAR
    const ProcessingResult& r3 = engine.tick(make_window_1(X_OFF + 450, 450, 0), t + 7.0f);
    CHECK_FALSE(r3.zone_occupancy[1]);
}

TEST_CASE("target reappears during pending → OCCUPIED") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // Occupy zone 1
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t);

    // Target gone → PENDING
    const ProcessingResult& r2 = engine.tick(make_window_1(X_OFF + 450, 450, 0), t + 1.0f);
    CHECK(r2.zone_occupancy[1]);  // PENDING

    // Target reappears with signal >= renew (2)
    const ProcessingResult& r3 = engine.tick(make_window_1(X_OFF + 450, 450, 2), t + 2.0f);
    CHECK(r3.zone_occupancy[1]);  // back to OCCUPIED
}

TEST_CASE("two targets in different zones") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // Target 0 in zone 1 (entrance, entry point), Target 1 in zone 0 (room, gating)
    // First tick: zone 1 immediate, zone 0 gating (count=1)
    const ProcessingResult& r1 = engine.tick(
        make_window_2(X_OFF + 450, 450, 5, X_OFF + 150, 150, 7), t);
    CHECK(r1.zone_occupancy[1]);
    CHECK_FALSE(r1.zone_occupancy[0]);

    // Second tick: zone 0 continuous → confirmed
    const ProcessingResult& r2 = engine.tick(
        make_window_2(X_OFF + 450, 450, 5, X_OFF + 150, 150, 7), t + 1.0f);
    CHECK(r2.zone_occupancy[1]);
    CHECK(r2.zone_occupancy[0]);
}

TEST_CASE("target outside grid → no occupancy") {
    ZoneEngine engine = make_parity_engine();
    const ProcessingResult& r = engine.tick(make_window_1(9000, 9000, 9), 100.0f);
    CHECK_FALSE(r.zone_occupancy[0]);
    CHECK_FALSE(r.zone_occupancy[1]);
}

TEST_CASE("target on non-room cell → no occupancy") {
    ZoneEngine engine = make_parity_engine();
    // Room is cols 8-11. Target at X_OFF + (-900) = 1500 → col 5.
    // Col 5 is inside the 20x20 grid but not a room cell.
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + (-900), 150, 9), 100.0f);
    CHECK_FALSE(r.zone_occupancy[0]);
    CHECK_FALSE(r.zone_occupancy[1]);
}

TEST_CASE("continuity skips gating") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // First establish position in zone 0 via gating (2 ticks at >= gated threshold)
    const ProcessingResult& r1 = engine.tick(make_window_1(X_OFF + 150, 150, 9), t);
    CHECK_FALSE(r1.zone_occupancy[0]);
    const ProcessingResult& r2 = engine.tick(make_window_1(X_OFF + 150, 150, 9), t + 1.0f);
    CHECK(r2.zone_occupancy[0]);

    // Move to adjacent cell (still zone 0) — continuous, renew threshold applies
    // (450, 150) → cell (9,0), 1 cell away from (8,0) → within MAX_MOVEMENT_CELLS
    const ProcessingResult& r3 = engine.tick(make_window_1(X_OFF + 450, 150, 3), t + 2.0f);
    CHECK(r3.zone_occupancy[0]);
}

TEST_CASE("active target status is correct") {
    ZoneEngine engine = make_parity_engine();
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f);
    REQUIRE(r.target_count >= 1);
    CHECK(r.targets[0].status == TargetStatus::ACTIVE);
    CHECK(r.targets[0].x == doctest::Approx(X_OFF + 450));
    CHECK(r.targets[0].y == doctest::Approx(450));
    CHECK(r.targets[0].signal == 5);
}

TEST_CASE("pending target status at last in-room position") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // Occupy zone 1
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t);

    // Target disappears
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 0), t + 1.0f);
    CHECK(r.targets[0].status == TargetStatus::PENDING);
    CHECK(r.targets[0].x == doctest::Approx(X_OFF + 450));
    CHECK(r.targets[0].y == doctest::Approx(450));
    CHECK(r.targets[0].signal == 0);
}

TEST_CASE("inactive after timeout") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // Occupy zone 1
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t);

    // Target disappears
    engine.tick(make_window_1(X_OFF + 450, 450, 0), t + 1.0f);

    // Past timeout
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 0), t + 7.0f);
    CHECK(r.targets[0].status == TargetStatus::INACTIVE);
}

TEST_CASE("handoff: target moves zones, source gets accelerated timeout") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // Establish zone 1 occupied (entry point → immediate)
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t);

    // Target moves to zone 0 → handoff fires immediately, zone 1 → pending
    const ProcessingResult& r2 = engine.tick(make_window_1(X_OFF + 150, 150, 7), t + 1.0f);
    // Handoff tick: target is active (signal=7 >= gated threshold for zone 0),
    // zone 1 is pending (occupied=True), zone 0 still gating (not yet confirmed)
    CHECK(r2.targets[0].status == TargetStatus::ACTIVE);
    CHECK(r2.targets[0].x == doctest::Approx(X_OFF + 150));
    CHECK(r2.targets[0].y == doctest::Approx(150));
    CHECK(r2.zone_occupancy[1]);  // zone 1 pending immediately after handoff

    // Second tick in zone 0 (0.5s later, within handoff_timeout=1.0s window):
    // zone 0 continuous → confirmed; zone 1 still pending (elapsed ≈ 0.5 + offset)
    const ProcessingResult& r3 = engine.tick(make_window_1(X_OFF + 150, 150, 7), t + 1.5f);
    CHECK(r3.targets[0].status == TargetStatus::ACTIVE);
    CHECK(r3.zone_occupancy[0]);
    CHECK(r3.zone_occupancy[1]);  // zone 1 still pending within handoff window
}

TEST_CASE("no targets → target_count is MAX_TARGETS with all INACTIVE") {
    ZoneEngine engine = make_parity_engine();
    const ProcessingResult& r = engine.tick(make_window_0(), 100.0f);
    // All 3 target slots should be INACTIVE
    CHECK(r.target_count == MAX_TARGETS);
    for (int i = 0; i < MAX_TARGETS; ++i) {
        CHECK(r.targets[i].status == TargetStatus::INACTIVE);
    }
}

TEST_CASE("tracked target outside room with prior presence → PENDING") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // Occupy zone 1
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t);

    // Target moves outside room but still tracked with signal
    const ProcessingResult& r2 = engine.tick(make_window_1(9000, 9000, 9), t + 1.0f);
    CHECK(r2.targets[0].status == TargetStatus::PENDING);
    CHECK(r2.targets[0].x == doctest::Approx(X_OFF + 450));
    CHECK(r2.targets[0].y == doctest::Approx(450));
}

TEST_CASE("device_tracking_present when any zone occupied") {
    ZoneEngine engine = make_parity_engine();

    // No targets → not present
    const ProcessingResult& r1 = engine.tick(make_window_0(), 100.0f);
    CHECK_FALSE(r1.device_tracking_present);

    // Target in zone 1 → present
    const ProcessingResult& r2 = engine.tick(make_window_1(X_OFF + 450, 450, 5), 101.0f);
    CHECK(r2.device_tracking_present);
}

TEST_CASE("two targets one leaves → mixed active/pending states") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // T0 in zone 1 (entry point, immediate), T1 in zone 0 (needs gating)
    // Tick 1: zone 1 confirmed immediately, zone 0 gating
    engine.tick(make_window_2(X_OFF + 450, 450, 5, X_OFF + 150, 150, 9), t);

    // Tick 2: zone 0 continuous → both zones occupied
    const ProcessingResult& r2 = engine.tick(
        make_window_2(X_OFF + 450, 450, 5, X_OFF + 150, 150, 9), t + 1.0f);
    CHECK(r2.zone_occupancy[1]);
    CHECK(r2.zone_occupancy[0]);

    // T1 disappears, T0 stays active
    const ProcessingResult& r3 = engine.tick(
        make_window_2(X_OFF + 450, 450, 5, X_OFF + 150, 150, 0), t + 2.0f);
    CHECK(r3.targets[0].status == TargetStatus::ACTIVE);
    CHECK(r3.targets[1].status == TargetStatus::PENDING);
    // T1 pending x/y = last in-room position (grid-space)
    CHECK(r3.targets[1].x == doctest::Approx(X_OFF + 150));
    CHECK(r3.targets[1].y == doctest::Approx(150));
}
