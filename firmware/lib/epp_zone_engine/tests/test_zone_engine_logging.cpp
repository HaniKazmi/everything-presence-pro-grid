#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>
#include "epp_grid.h"
#include "epp_zone_engine.h"

#include <cstring>

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
    // Zone 1 on cell (col=9, row=1), with entry overlay kind
    grid.cell(1 * GRID_COLS + 9) = CELL_ROOM_BIT |
                                    (1 << CELL_ZONE_SHIFT) |
                                    (CELL_OVERLAY_ENTRY << CELL_OVERLAY_SHIFT);
    return grid;
}

static ZoneEngine make_engine() {
    Grid grid = make_grid();

    ZoneConfig zone1{};
    zone1.id = 1;
    zone1.trigger = 3;
    zone1.renew = 2;
    zone1.timeout = 5.0f;
    zone1.handoff_timeout = 1.0f;

    ZoneConfig zone0{};
    zone0.id = 0;
    zone0.trigger = 5;
    zone0.renew = 3;
    zone0.timeout = 10.0f;
    zone0.handoff_timeout = 3.0f;

    ZoneConfig zones[] = {zone1, zone0};

    ZoneEngine engine;
    engine.set_grid(grid);
    engine.set_zones(zones, 2);
    return engine;
}

static WindowOutput make_window_0() {
    WindowOutput wo{};
    wo.total_frames = CANONICAL_FRAMES;
    return wo;
}

static WindowOutput make_window_1(float x, float y, int fc) {
    WindowOutput wo{};
    wo.total_frames = CANONICAL_FRAMES;
    wo.targets[0].median_x = x;
    wo.targets[0].median_y = y;
    wo.targets[0].frame_count = fc;
    wo.targets[0].active = (fc > 0);
    return wo;
}

static WindowOutput make_window_2(float x1, float y1, int fc1,
                                   float x2, float y2, int fc2) {
    WindowOutput wo{};
    wo.total_frames = CANONICAL_FRAMES;
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
// Structured-event search helpers
// ---------------------------------------------------------------------------

// Return a pointer to the first event of `type`, or nullptr if none.
static const Event* find_event(const ProcessingResult& r, EventType type) {
    for (int i = 0; i < r.event_count; ++i) {
        if (r.events[i].type == type) return &r.events[i];
    }
    return nullptr;
}

// Return a pointer to the first event of `type` whose p0 matches, or nullptr.
static const Event* find_event_p0(const ProcessingResult& r, EventType type, int p0) {
    for (int i = 0; i < r.event_count; ++i) {
        if (r.events[i].type == type && r.events[i].p0 == p0) return &r.events[i];
    }
    return nullptr;
}

// Count events of `type`.
static int count_events(const ProcessingResult& r, EventType type) {
    int n = 0;
    for (int i = 0; i < r.event_count; ++i) {
        if (r.events[i].type == type) ++n;
    }
    return n;
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
    // Past timeout (custom zone timeout=5s)
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

TEST_CASE("log: confirmed target leaving room emits TARGET_LEFT event") {
    ZoneEngine engine = make_engine();
    float t = 100.0f;

    // Target appears outside room — no event (was never in room)
    const ProcessingResult& r1 = engine.tick(make_window_1(9000, 9000, 9), t);
    CHECK(find_event(r1, EventType::TARGET_LEFT) == nullptr);

    // Target enters room and is confirmed in zone 1 (entry point)
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t + 1.0f);

    // Target leaves room — must emit the structured TARGET_LEFT event the panel
    // consumes (this was previously only logged on the serial line).
    const ProcessingResult& r3 = engine.tick(make_window_1(9000, 9000, 9), t + 2.0f);
    const Event* left = find_event_p0(r3, EventType::TARGET_LEFT, 0);
    CHECK(left != nullptr);
    // Exactly one TARGET_LEFT — the confirmed-leave and bare-leave branches are
    // mutually exclusive on prev_zone, so no double-emit.
    CHECK(count_events(r3, EventType::TARGET_LEFT) == 1);
    // The serial "left room" line is still emitted via emit_event_.
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

    // Use zone 0 (no overlay, timeout=10s) to avoid overlay exit handoff
    // accelerating the pending timeout. Need 2 gating ticks to confirm.
    engine.tick(make_window_1(X_OFF + 150, 150, 7), t, sensors);
    engine.tick(make_window_1(X_OFF + 150, 150, 7), t + 0.5f, sensors);
    // Target disappears → zone 0 pending
    engine.tick(make_window_0(), t + 1.0f, sensors);
    // Sensors off
    sensors.static_on = false;
    sensors.motion_on = false;
    engine.tick(make_window_0(), t + 2.0f, sensors);
    // Sensors expired → force-clear fires
    const ProcessingResult& r = engine.tick(make_window_0(), t + 3.5f, sensors);
    CHECK_FALSE(r.zone_occupancy[0]);
    CHECK(has_info(r, "force-clear"));
    // Force-clear must also emit the matching state-transition log so
    // consumers see "Zone 0: clear" — not just "force-clear" — even though
    // step 3 saw the zone in PENDING_CLEAR state on the same tick.
    CHECK(has_info(r, "Zone 0: clear"));
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

// ---------------------------------------------------------------------------
// Structured detection-log events (Event buffer, parallel to LogEntry)
// ---------------------------------------------------------------------------

TEST_CASE("event: result starts with zero events") {
    ZoneEngine engine = make_engine();
    const ProcessingResult& r = engine.tick(make_window_0(), 100.0f);
    CHECK(r.event_count == 0);
}

TEST_CASE("event: static sensor activation emits STATIC active (p0==0)") {
    ZoneEngine engine = make_engine();
    SensorInput sensors;
    sensors.static_on = true;
    sensors.static_timeout = 5.0f;
    const ProcessingResult& r = engine.tick(make_window_0(), 100.0f, sensors);
    REQUIRE(r.static_state == SensorPresenceState::ACTIVE);
    const Event* e = find_event(r, EventType::STATIC);
    REQUIRE(e != nullptr);
    CHECK(e->p0 == 0);  // 0 == active
    // Serial parity preserved alongside the structured event.
    CHECK(has_info(r, "Static: active"));
}

TEST_CASE("event: motion sensor activation emits MOTION active (p0==0)") {
    ZoneEngine engine = make_engine();
    SensorInput sensors;
    sensors.motion_on = true;
    sensors.motion_timeout = 3.0f;
    const ProcessingResult& r = engine.tick(make_window_0(), 100.0f, sensors);
    const Event* e = find_event(r, EventType::MOTION);
    REQUIRE(e != nullptr);
    CHECK(e->p0 == 0);  // 0 == active
}

TEST_CASE("event: target entering a zone emits ZONE occupied (p1==1)") {
    ZoneEngine engine = make_engine();
    // Zone 1 (entry overlay, trigger=3) → confirmed on first tick.
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 3), 100.0f);
    REQUIRE(r.zone_occupancy[1]);
    const Event* e = find_event_p0(r, EventType::ZONE, 1);  // zone id 1
    REQUIRE(e != nullptr);
    CHECK(e->p1 == 1);  // 1 == occupied
    // The same tick also emits TARGET_ENTERED for the entering target.
    const Event* te = find_event(r, EventType::TARGET_ENTERED);
    REQUIRE(te != nullptr);
    CHECK(te->p0 == 0);  // target id 0
    CHECK(te->p1 == 1);  // zone id 1
}

TEST_CASE("event: zone OCCUPIED -> PENDING emits ZONE pending (p1==2)") {
    ZoneEngine engine = make_engine();
    engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f);  // occupy zone 1
    const ProcessingResult& r = engine.tick(make_window_0(), 101.0f);  // target gone -> pending
    const Event* e = find_event_p0(r, EventType::ZONE, 1);
    REQUIRE(e != nullptr);
    CHECK(e->p1 == 2);  // 2 == pending
}

TEST_CASE("event: occupancy turning on emits OCCUPANCY (p0==1)") {
    ZoneEngine engine = make_engine();
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f);
    REQUIRE(r.occupancy);
    const Event* e = find_event(r, EventType::OCCUPANCY);
    REQUIRE(e != nullptr);
    CHECK(e->p0 == 1);  // on
}

TEST_CASE("event: mmwave turning on emits MMWAVE (p0==1)") {
    ZoneEngine engine = make_engine();
    // Zone OCCUPIED with no sensors -> mmwave on (combines static + tracker).
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f);
    REQUIRE(r.mmwave);
    const Event* e = find_event(r, EventType::MMWAVE);
    REQUIRE(e != nullptr);
    CHECK(e->p0 == 1);  // on
}

TEST_CASE("event: assisted-clear of an empty room emits FORCE_CLEAR for the zone") {
    ZoneEngine engine = make_engine();
    float t = 100.0f;
    SensorInput sensors;
    // Short sensor timeouts so they expire well before the zone's own 10s timeout.
    sensors.static_on = true;  sensors.static_timeout = 1.0f;
    sensors.motion_on = true;  sensors.motion_timeout = 1.0f;

    // Confirm zone 0 (no overlay → 2 gating ticks) so we exercise the
    // sensor-assisted clear path without overlay exit handoff.
    engine.tick(make_window_1(X_OFF + 150, 150, 7), t, sensors);
    engine.tick(make_window_1(X_OFF + 150, 150, 7), t + 0.5f, sensors);
    engine.tick(make_window_0(), t + 1.0f, sensors);  // zone 0 -> PENDING_CLEAR

    // Both sensors go inactive; once they expire the empty room is force-cleared.
    sensors.static_on = false;  sensors.motion_on = false;
    engine.tick(make_window_0(), t + 2.0f, sensors);  // sensors pending
    const ProcessingResult& r = engine.tick(make_window_0(), t + 3.5f, sensors);
    REQUIRE_FALSE(r.zone_occupancy[0]);  // force-cleared
    const Event* e = find_event_p0(r, EventType::FORCE_CLEAR, 0);  // zone id 0
    REQUIRE(e != nullptr);
    // The force-clear tick must also surface the resulting ZONE clear transition.
    const Event* ze = find_event_p0(r, EventType::ZONE, 0);
    REQUIRE(ze != nullptr);
    CHECK(ze->p1 == 0);  // 0 == clear
    CHECK(ze->p2 == 3);  // 3 == force (sensor-assisted)
}

TEST_CASE("event: zone CLEAR via timeout carries reason 0 (p2==0)") {
    ZoneEngine engine = make_engine();
    // Occupy zone 0 (no overlay → gating) so the clear is a plain timeout, not
    // an overlay-exit handoff.
    engine.tick(make_window_1(X_OFF + 150, 150, 7), 100.0f);
    engine.tick(make_window_1(X_OFF + 150, 150, 7), 100.5f);  // continuous → occupied
    engine.tick(make_window_0(), 101.0f);  // target gone → PENDING_CLEAR (timeout)
    // Zone 0 timeout is 10s — clear well past it.
    const ProcessingResult& r = engine.tick(make_window_0(), 112.0f);
    REQUIRE_FALSE(r.zone_occupancy[0]);
    const Event* ze = find_event_p0(r, EventType::ZONE, 0);
    REQUIRE(ze != nullptr);
    CHECK(ze->p1 == 0);  // clear
    CHECK(ze->p2 == 0);  // timeout
}

TEST_CASE("event: zone CLEAR via handoff carries reason 1 (p2==1)") {
    ZoneEngine engine = make_engine();
    // Occupy zone 1 (entry overlay → immediate).
    engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f);
    // Target moves to zone 0 → handoff accelerates zone 1's pending clear to its
    // 1s handoff_timeout. Two ticks in zone 0 confirm it (gating) while zone 1
    // counts down.
    engine.tick(make_window_1(X_OFF + 150, 150, 7), 100.1f);  // handoff fires
    // Past zone 1's handoff_timeout (1s from ~100.1) → zone 1 clears via handoff.
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 150, 150, 7), 101.5f);
    REQUIRE_FALSE(r.zone_occupancy[1]);
    const Event* ze = find_event_p0(r, EventType::ZONE, 1);
    REQUIRE(ze != nullptr);
    CHECK(ze->p1 == 0);  // clear
    CHECK(ze->p2 == 1);  // handoff
}

TEST_CASE("event: zone CLEAR via overlay exit carries reason 2 (p2==2)") {
    ZoneEngine engine = make_engine();
    // Occupy zone 1 (entry overlay → immediate). The target's last in-room cell
    // is the entry-overlay cell, so when it disappears Step 2b accelerates the
    // pending clear via the overlay-exit path (reason 2).
    engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f);
    engine.tick(make_window_0(), 100.1f);  // target gone from overlay cell → overlay exit
    // Past zone 1's handoff_timeout (1s) → clears via overlay exit.
    const ProcessingResult& r = engine.tick(make_window_0(), 101.5f);
    REQUIRE_FALSE(r.zone_occupancy[1]);
    const Event* ze = find_event_p0(r, EventType::ZONE, 1);
    REQUIRE(ze != nullptr);
    CHECK(ze->p1 == 0);  // clear
    CHECK(ze->p2 == 2);  // overlay exit
}

TEST_CASE("event: handoff between zones emits TARGET_MOVED") {
    ZoneEngine engine = make_engine();
    engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f);  // zone 1
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 150, 150, 7), 101.0f);
    const Event* e = find_event(r, EventType::TARGET_MOVED);
    REQUIRE(e != nullptr);
    CHECK(e->p0 == 0);  // target id 0
    CHECK(e->p1 == 1);  // from zone 1
    CHECK(e->p2 == 0);  // to zone 0
}

TEST_CASE("event: stuck target auto-dismiss emits STUCK_DISMISS with seconds") {
    ZoneEngine engine = make_engine();
    engine.set_stuck_target_timeout(5.0f);
    float t = 100.0f;
    const float X = X_OFF + 450.0f;
    const float Y = 450.0f;
    engine.tick(make_window_1(X, Y, 3), t);
    engine.tick(make_window_1(X, Y, 3), t + 4.9f);
    const ProcessingResult& r = engine.tick(make_window_1(X, Y, 3), t + 5.1f);
    const Event* e = find_event(r, EventType::STUCK_DISMISS);
    REQUIRE(e != nullptr);
    CHECK(e->p0 == 0);  // target id 0
    CHECK(e->p1 == 5);  // 5s timeout
}

TEST_CASE("event: target leaving the room (unconfirmed) emits TARGET_LEFT") {
    ZoneEngine engine = make_engine();
    float t = 100.0f;
    // Target in room (zone 0 cell) but below trigger → never confirmed, but
    // in_room is set. Then it leaves the room while still active.
    engine.tick(make_window_1(X_OFF + 150, 150, 2), t);  // in-room, unconfirmed
    const ProcessingResult& r = engine.tick(make_window_1(9000, 9000, 9), t + 1.0f);
    const Event* e = find_event(r, EventType::TARGET_LEFT);
    REQUIRE(e != nullptr);
    CHECK(e->p0 == 0);  // target id 0
}
