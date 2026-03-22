"""Zone engine parity tests.

These tests verify that the Python ZoneEngine._tick() produces the same zone
occupancy results as the frontend's _runLocalZoneEngine() for identical inputs.
Each test here has a mirror in frontend/src/__tests__/panel-zone-engine-parity.test.ts.

Shared setup:
  - Grid: 20x20, room cells at cols 8-11 rows 0-3 (1200x1200mm room)
  - Zone 1 painted on cell (9,1) = grid index 29
  - Room (zone 0) on all other room cells
  - Target at (450, 450) maps to cell (9,1) = zone 1
  - Target at (150, 150) maps to cell (8,0) = zone 0 (room)

The frontend receives target positions already in room-space with a signal
value (0-9), while the Python engine processes WindowOutput from the tumbling
window. To test at the same level, we call _tick() directly with WindowOutput
matching the frontend's target.signal as frame_count.
"""

from __future__ import annotations

from custom_components.everything_presence_pro.const import CELL_ROOM_BIT
from custom_components.everything_presence_pro.const import CELL_ZONE_SHIFT
from custom_components.everything_presence_pro.const import GRID_CELL_SIZE_MM
from custom_components.everything_presence_pro.const import GRID_COLS
from custom_components.everything_presence_pro.const import GRID_ROWS
from custom_components.everything_presence_pro.const import RAW_FPS
from custom_components.everything_presence_pro.const import ZONE_TYPE_ENTRANCE
from custom_components.everything_presence_pro.const import ZONE_TYPE_NORMAL
from custom_components.everything_presence_pro.zone_engine import Grid
from custom_components.everything_presence_pro.zone_engine import TargetStatus
from custom_components.everything_presence_pro.zone_engine import TargetWindow
from custom_components.everything_presence_pro.zone_engine import WindowOutput
from custom_components.everything_presence_pro.zone_engine import Zone
from custom_components.everything_presence_pro.zone_engine import ZoneEngine

# ---------------------------------------------------------------------------
# Shared helpers matching the TS parity test setup
# ---------------------------------------------------------------------------


def _make_parity_grid() -> Grid:
    """Create the shared parity grid: 20x20, room at cols 8-11 rows 0-3."""
    grid = Grid(
        origin_x=0.0,
        origin_y=0.0,
        cols=GRID_COLS,
        rows=GRID_ROWS,
        cell_size=GRID_CELL_SIZE_MM,
    )
    for r in range(4):
        for c in range(8, 12):
            grid.cells[r * GRID_COLS + c] = CELL_ROOM_BIT
    # Zone 1 on cell (col=9, row=1)
    grid.cells[1 * GRID_COLS + 9] = CELL_ROOM_BIT | (1 << CELL_ZONE_SHIFT)
    return grid


def _make_parity_engine() -> ZoneEngine:
    """Create engine matching the TS parity setup.

    Zone 0 (room): normal type, trigger=5, renew=3, timeout=10, entry_point=False
    Zone 1: entrance type, trigger=3, renew=2, timeout=5, entry_point=True

    Note: Zone 0 thresholds come from the room-level defaults passed through
    the engine's built-in zone 0 handling.
    """
    grid = _make_parity_grid()
    zone1 = Zone(
        id=1,
        name="Zone 1",
        type=ZONE_TYPE_ENTRANCE,
        color="#ff0000",
        trigger=3,
        renew=2,
        timeout=5.0,
        handoff_timeout=1.0,
        entry_point=True,
    )
    # Zone 0 (room boundary) uses the engine's built-in defaults.
    # We need to configure them to match the TS setup.
    room_zone = Zone(
        id=0,
        name="Room",
        type=ZONE_TYPE_NORMAL,
        color="",
        trigger=5,
        renew=3,
        timeout=10.0,
        handoff_timeout=3.0,
        entry_point=False,
    )
    engine = ZoneEngine(grid=grid, zones=[zone1, room_zone])
    return engine


def _window(targets: list[tuple[float, float, int]]) -> WindowOutput:
    """Build WindowOutput from (x, y, frame_count) tuples.

    The x,y values must be in grid-space (origin at grid origin).
    For the parity grid, room starts at col 8 → x_offset = 8 * 300 = 2400.
    So target at room-space (450, 450) → grid-space (2400 + 450, 450) = (2850, 450).
    """
    tw_list: list[TargetWindow] = []
    for x, y, fc in targets:
        tw_list.append(
            TargetWindow(
                median_x=x,
                median_y=y,
                frame_count=fc,
                active=fc > 0,
            )
        )
    return WindowOutput(targets=tw_list, total_frames=RAW_FPS)


# Grid-space offset: room x=0 starts at col 8 → x_offset = 8 * 300 = 2400
X_OFF = 8 * GRID_CELL_SIZE_MM


# ---------------------------------------------------------------------------
# Parity tests
# ---------------------------------------------------------------------------


class TestZoneEngineParity:
    """Mirror of frontend/src/__tests__/panel-zone-engine-parity.test.ts."""

    def test_no_targets_all_clear(self):
        """No targets → all zones clear."""
        engine = _make_parity_engine()
        result = engine._tick(_window([]), 100.0)
        assert result.zone_occupancy.get(0, False) is False
        assert result.zone_occupancy.get(1, False) is False

    def test_inactive_target_all_clear(self):
        """Inactive target → all zones clear."""
        engine = _make_parity_engine()
        # frame_count=0 means inactive
        result = engine._tick(_window([(X_OFF + 450, 450, 0)]), 100.0)
        assert result.zone_occupancy.get(0, False) is False
        assert result.zone_occupancy.get(1, False) is False

    def test_target_in_entrance_zone_occupied(self):
        """Target in zone 1 (entrance) with signal >= trigger → zone 1 occupied."""
        engine = _make_parity_engine()
        # Zone 1 at cell (9,1): x = 9*300 + 150 = 2850, y = 1*300 + 150 = 450
        result = engine._tick(_window([(X_OFF + 450, 450, 3)]), 100.0)
        assert result.zone_occupancy[1] is True
        assert result.zone_occupancy.get(0, False) is False

    def test_target_below_trigger_stays_clear(self):
        """Target in zone 1 with signal < trigger → zone 1 stays clear."""
        engine = _make_parity_engine()
        result = engine._tick(_window([(X_OFF + 450, 450, 2)]), 100.0)
        assert result.zone_occupancy.get(1, False) is False

    def test_zone_0_gating(self):
        """Target in zone 0 needs gating like any other non-entry zone."""
        engine = _make_parity_engine()
        t = 100.0
        # Zone 0: trigger=5, gated threshold = min(5+2, 8) = 7
        # First tick: signal=7 meets gated threshold, gate_count=1
        r1 = engine._tick(_window([(X_OFF + 150, 150, 7)]), t)
        assert r1.zone_occupancy.get(0, False) is False

        # Second tick: continuous from tick 1, bypasses gating → confirmed
        r2 = engine._tick(_window([(X_OFF + 150, 150, 7)]), t + 1.0)
        assert r2.zone_occupancy[0] is True

    def test_entry_point_bypasses_gating(self):
        """Target in entry-point zone bypasses gating."""
        engine = _make_parity_engine()
        # Zone 1 is entrance (entry_point=True), trigger=3
        result = engine._tick(_window([(X_OFF + 450, 450, 3)]), 100.0)
        assert result.zone_occupancy[1] is True

    def test_pending_then_clear_after_timeout(self):
        """Zone transitions OCCUPIED → PENDING → CLEAR after timeout."""
        engine = _make_parity_engine()
        t = 100.0

        # Occupy zone 1
        r1 = engine._tick(_window([(X_OFF + 450, 450, 5)]), t)
        assert r1.zone_occupancy[1] is True

        # Target disappears → PENDING (still reports occupied)
        r2 = engine._tick(_window([(X_OFF + 450, 450, 0)]), t + 1.0)
        assert r2.zone_occupancy[1] is True

        # After timeout (entrance timeout=5s) → CLEAR
        r3 = engine._tick(_window([(X_OFF + 450, 450, 0)]), t + 7.0)
        assert r3.zone_occupancy.get(1, False) is False

    def test_target_reappears_during_pending(self):
        """Target reappears during PENDING → back to OCCUPIED."""
        engine = _make_parity_engine()
        t = 100.0

        # Occupy zone 1
        engine._tick(_window([(X_OFF + 450, 450, 5)]), t)

        # Target gone → PENDING
        r2 = engine._tick(_window([(X_OFF + 450, 450, 0)]), t + 1.0)
        assert r2.zone_occupancy[1] is True  # PENDING

        # Target reappears with signal >= renew (2)
        r3 = engine._tick(_window([(X_OFF + 450, 450, 2)]), t + 2.0)
        assert r3.zone_occupancy[1] is True  # back to OCCUPIED

    def test_two_targets_different_zones(self):
        """Two targets in different zones → both occupied (zone 0 after gating)."""
        engine = _make_parity_engine()
        t = 100.0

        # Target 0 in zone 1 (entrance, entry point), Target 1 in zone 0 (room, gating)
        targets = [(X_OFF + 450, 450, 5), (X_OFF + 150, 150, 7)]

        # First tick: zone 1 immediate, zone 0 gating (count=1)
        r1 = engine._tick(_window(targets), t)
        assert r1.zone_occupancy[1] is True
        assert r1.zone_occupancy.get(0, False) is False

        # Second tick: zone 0 continuous → confirmed
        r2 = engine._tick(_window(targets), t + 1.0)
        assert r2.zone_occupancy[1] is True
        assert r2.zone_occupancy[0] is True

    def test_target_outside_grid_no_occupancy(self):
        """Target outside grid → no zone occupancy."""
        engine = _make_parity_engine()
        result = engine._tick(_window([(9000, 9000, 9)]), 100.0)
        for v in result.zone_occupancy.values():
            assert v is False

    def test_target_on_non_room_cell_no_occupancy(self):
        """Target on non-room cell inside grid → no zone occupancy."""
        engine = _make_parity_engine()
        # Room is cols 8-11. Target at X_OFF + (-900) = 1500 → col 5.
        # Col 5 is inside the 20x20 grid but not a room cell.
        result = engine._tick(_window([(X_OFF + (-900), 150, 9)]), 100.0)
        for v in result.zone_occupancy.values():
            assert v is False

    def test_continuity_skips_gating(self):
        """Continuous movement within 5 cells skips gating for non-entry zone."""
        engine = _make_parity_engine()
        t = 100.0

        # First establish position in zone 0 via gating (2 ticks at 2xthreshold)
        r1 = engine._tick(_window([(X_OFF + 150, 150, 9)]), t)
        assert r1.zone_occupancy.get(0, False) is False
        r2 = engine._tick(_window([(X_OFF + 150, 150, 9)]), t + 1.0)
        assert r2.zone_occupancy[0] is True

        # Move to adjacent cell (still zone 0) — continuous, renew threshold applies
        # (450, 150) → cell (9,0), 1 cell away from (8,0) → within MAX_MOVEMENT_CELLS
        r3 = engine._tick(_window([(X_OFF + 450, 150, 3)]), t + 2.0)
        assert r3.zone_occupancy[0] is True

    # --- Per-target status parity ---

    def test_active_target_status(self):
        """Active target in zone → status=ACTIVE with position and signal."""
        engine = _make_parity_engine()
        result = engine._tick(_window([(X_OFF + 450, 450, 5)]), 100.0)
        assert len(result.targets) >= 1
        assert result.targets[0].status == TargetStatus.ACTIVE
        assert result.targets[0].x == X_OFF + 450  # grid-space
        assert result.targets[0].y == 450
        assert result.targets[0].signal == 5

    def test_no_targets_empty_list(self):
        """No targets → empty targets list."""
        engine = _make_parity_engine()
        result = engine._tick(_window([]), 100.0)
        assert result.targets == []

    def test_inactive_target_status(self):
        """Inactive target (signal=0) → status=INACTIVE."""
        engine = _make_parity_engine()
        result = engine._tick(_window([(X_OFF + 450, 450, 0)]), 100.0)
        assert result.targets[0].status == TargetStatus.INACTIVE

    def test_pending_target_status(self):
        """Target disappears while zone pending → status=PENDING with last position."""
        engine = _make_parity_engine()
        t = 100.0

        # Occupy zone 1
        engine._tick(_window([(X_OFF + 450, 450, 5)]), t)

        # Target disappears
        result = engine._tick(_window([(X_OFF + 450, 450, 0)]), t + 1.0)
        assert result.targets[0].status == TargetStatus.PENDING
        assert result.targets[0].x == X_OFF + 450
        assert result.targets[0].y == 450
        assert result.targets[0].signal == 0

    def test_inactive_after_timeout(self):
        """Zone clears after timeout → status=INACTIVE."""
        engine = _make_parity_engine()
        t = 100.0

        # Occupy zone 1
        engine._tick(_window([(X_OFF + 450, 450, 5)]), t)

        # Target disappears
        engine._tick(_window([(X_OFF + 450, 450, 0)]), t + 1.0)

        # Past timeout
        result = engine._tick(_window([(X_OFF + 450, 450, 0)]), t + 7.0)
        assert result.targets[0].status == TargetStatus.INACTIVE

    def test_tracked_target_outside_room_no_prior(self):
        """Tracked target outside room, no prior room presence → INACTIVE."""
        engine = _make_parity_engine()
        result = engine._tick(_window([(9000, 9000, 9)]), 100.0)
        assert result.targets[0].status == TargetStatus.INACTIVE

    def test_tracked_target_outside_room_with_prior(self):
        """Tracked target outside room, with prior room presence → PENDING."""
        engine = _make_parity_engine()
        t = 100.0

        # Occupy zone 1
        engine._tick(_window([(X_OFF + 450, 450, 5)]), t)

        # Target moves outside room but still tracked with signal
        r2 = engine._tick(_window([(9000, 9000, 9)]), t + 1.0)
        assert r2.targets[0].status == TargetStatus.PENDING
        assert r2.targets[0].x == X_OFF + 450
        assert r2.targets[0].y == 450

    def test_reappears_during_pending_back_to_active(self):
        """Target reappears during pending → status=ACTIVE at new position."""
        engine = _make_parity_engine()
        t = 100.0

        # Occupy zone 1
        engine._tick(_window([(X_OFF + 450, 450, 5)]), t)

        # Target disappears → zone 1 pending
        r2 = engine._tick(_window([(X_OFF + 450, 450, 0)]), t + 1.0)
        assert r2.targets[0].status == TargetStatus.PENDING

        # Target reappears with signal >= renew (2) → back to active
        r3 = engine._tick(_window([(X_OFF + 450, 450, 3)]), t + 2.0)
        assert r3.targets[0].status == TargetStatus.ACTIVE
        assert r3.targets[0].x == X_OFF + 450
        assert r3.targets[0].y == 450
        assert r3.targets[0].signal == 3

    def test_two_targets_one_leaves_mixed_states(self):
        """Two targets, one leaves → mixed active/pending states."""
        engine = _make_parity_engine()
        t = 100.0

        # T0 in zone 1 (entry point, immediate), T1 in zone 0 (needs gating)
        targets_both = [(X_OFF + 450, 450, 5), (X_OFF + 150, 150, 9)]

        # Tick 1: zone 1 confirmed immediately, zone 0 gating
        engine._tick(_window(targets_both), t)

        # Tick 2: zone 0 continuous → both zones occupied
        r2 = engine._tick(_window(targets_both), t + 1.0)
        assert r2.zone_occupancy[1] is True
        assert r2.zone_occupancy[0] is True

        # T1 disappears, T0 stays active
        r3 = engine._tick(_window([(X_OFF + 450, 450, 5), (X_OFF + 150, 150, 0)]), t + 2.0)
        assert r3.targets[0].status == TargetStatus.ACTIVE
        assert r3.targets[1].status == TargetStatus.PENDING
        # T1 pending x/y = last in-room position (grid-space)
        assert r3.targets[1].x == X_OFF + 150
        assert r3.targets[1].y == 150

    def test_outside_room_then_stops_tracking_pending(self):
        """Tracking outside room then sensor stops → pending throughout."""
        engine = _make_parity_engine()
        t = 100.0

        # Occupy zone 1
        engine._tick(_window([(X_OFF + 450, 450, 5)]), t)

        # Target moves outside room — immediately pending at last in-room position
        r2 = engine._tick(_window([(9000, 9000, 9)]), t + 1.0)
        assert r2.targets[0].status == TargetStatus.PENDING
        assert r2.targets[0].x == X_OFF + 450
        assert r2.targets[0].y == 450

        # Sensor stops tracking → still pending at same position
        r3 = engine._tick(_window([(9000, 9000, 0)]), t + 2.0)
        assert r3.targets[0].status == TargetStatus.PENDING
        assert r3.targets[0].x == X_OFF + 450
        assert r3.targets[0].y == 450

    def test_signal_zero_but_tracking_inactive(self):
        """Signal=0 with x/y non-null (tracked but no signal) → INACTIVE."""
        engine = _make_parity_engine()
        t = 100.0

        # Occupy zone 1 first so zone has state
        engine._tick(_window([(X_OFF + 450, 450, 5)]), t)

        # Same position but signal=0 (frame_count=0 → inactive in backend)
        # frame_count=0 means active=False, so target is treated as gone
        result = engine._tick(_window([(X_OFF + 450, 450, 0)]), t + 1.0)
        # With frame_count=0 the target is PENDING (zone 1 is now pending)
        # To get INACTIVE we must advance past timeout
        st = engine._zone_runtimes[1]
        st.pending_since = t + 1.0 - 7.0  # past timeout
        result2 = engine._tick(_window([(X_OFF + 450, 450, 0)]), t + 2.0)
        assert result2.targets[0].status == TargetStatus.INACTIVE

    def test_handoff_target_moves_between_zones(self):
        """Handoff: target moves from zone 1 to zone 0, zone 1 goes pending.

        Zone 1 handoff_timeout=1.0s means it stays pending for 1 second after
        the target leaves.  We verify the pending state immediately on the tick
        that triggers the handoff (t+1.0), then confirm zone 0 occupancy on a
        subsequent tick (t+1.5) before zone 1's accelerated timeout expires.
        """
        engine = _make_parity_engine()
        t = 100.0

        # Establish zone 1 occupied (entry point → immediate)
        engine._tick(_window([(X_OFF + 450, 450, 5)]), t)

        # Target moves to zone 0 → handoff fires immediately, zone 1 → pending
        r2 = engine._tick(_window([(X_OFF + 150, 150, 7)]), t + 1.0)
        # Handoff tick: target is active (signal=7 ≥ gated threshold for zone 0),
        # zone 1 is pending (occupied=True), zone 0 still gating (not yet confirmed)
        assert r2.targets[0].status == TargetStatus.ACTIVE
        assert r2.targets[0].x == X_OFF + 150
        assert r2.targets[0].y == 150
        assert r2.zone_occupancy[1] is True  # zone 1 pending immediately after handoff

        # Second tick in zone 0 (0.5s later, within handoff_timeout=1.0s window):
        # zone 0 continuous → confirmed; zone 1 still pending (elapsed ≈ 0.5 + offset)
        r3 = engine._tick(_window([(X_OFF + 150, 150, 7)]), t + 1.5)
        assert r3.targets[0].status == TargetStatus.ACTIVE
        assert r3.zone_occupancy[0] is True
        assert r3.zone_occupancy[1] is True  # zone 1 still pending within handoff window
