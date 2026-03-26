"""Zone engine parity tests driven by shared JSON fixtures.

These tests load scenarios from tests/fixtures/parity_scenarios.json and run
them through the Python ZoneEngine._tick(), verifying zone occupancy and
per-target status results.  The same fixture file is consumed by the C++ and
(later) TypeScript parity test suites.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from custom_components.eppgrid.const import CELL_ROOM_BIT
from custom_components.eppgrid.const import CELL_ZONE_SHIFT
from custom_components.eppgrid.const import GRID_CELL_SIZE_MM
from custom_components.eppgrid.const import GRID_COLS
from custom_components.eppgrid.const import GRID_ROWS
from custom_components.eppgrid.const import RAW_FPS
from custom_components.eppgrid.zone_engine import Grid
from custom_components.eppgrid.zone_engine import TargetWindow
from custom_components.eppgrid.zone_engine import WindowOutput
from custom_components.eppgrid.zone_engine import Zone
from custom_components.eppgrid.zone_engine import ZoneEngine

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "parity_scenarios.json"

ZONE_TYPE_MAP = {
    "normal": "normal",
    "entrance": "entrance",
    "thoroughfare": "thoroughfare",
    "rest": "rest",
    "custom": "custom",
}


def load_fixtures() -> dict:
    """Load the shared parity fixtures JSON."""
    with open(FIXTURE_PATH) as f:
        return json.load(f)


def build_grid(grid_config: dict) -> Grid:
    """Build a Grid from the fixture grid configuration."""
    grid = Grid(
        origin_x=0.0,
        origin_y=0.0,
        cols=GRID_COLS,
        rows=GRID_ROWS,
        cell_size=GRID_CELL_SIZE_MM,
    )
    for col, row in grid_config["room_cells"]:
        grid.cells[row * GRID_COLS + col] = CELL_ROOM_BIT
    for zone_id_str, cells in grid_config["zone_cells"].items():
        zone_id = int(zone_id_str)
        for col, row in cells:
            grid.cells[row * GRID_COLS + col] = CELL_ROOM_BIT | (zone_id << CELL_ZONE_SHIFT)
    return grid


def build_zones(zone_configs: dict) -> list[Zone]:
    """Build Zone objects from the fixture zone configuration."""
    zones: list[Zone] = []
    for zid_str, cfg in zone_configs.items():
        zid = int(zid_str)
        zones.append(
            Zone(
                id=zid,
                name=f"Zone {zid}",
                type=cfg["type"],
                trigger=cfg["trigger"],
                renew=cfg["renew"],
                timeout=cfg["timeout"],
                handoff_timeout=cfg["handoff_timeout"],
                entry_point=cfg["entry_point"],
            )
        )
    return zones


def build_window(tick_data: dict) -> WindowOutput:
    """Build a WindowOutput from a fixture tick."""
    targets: list[TargetWindow] = []
    for t in tick_data.get("targets", []):
        fc = t["frames"]
        targets.append(
            TargetWindow(
                median_x=t["x"],
                median_y=t["y"],
                frame_count=fc,
                active=fc > 0,
            )
        )
    return WindowOutput(targets=targets, total_frames=RAW_FPS)


fixtures = load_fixtures()


@pytest.mark.parametrize("name", list(fixtures["scenarios"].keys()))
def test_parity_scenario(name: str) -> None:
    """Run a single parity scenario from the shared JSON fixtures."""
    scenario = fixtures["scenarios"][name]
    grid = build_grid(fixtures["grid"])
    zones = build_zones(fixtures["zones"])
    engine = ZoneEngine(grid=grid, zones=zones)

    for i, tick in enumerate(scenario["ticks"]):
        expected = scenario["expected"][i]
        window = build_window(tick)
        result = engine._tick(window, tick["t"])

        # Check zone occupancy
        for zid_str, exp_occ in expected["zone_occupancy"].items():
            zid = int(zid_str)
            actual = result.zone_occupancy.get(zid, False)
            assert actual == exp_occ, f"Tick {i}: zone {zid} occupancy: expected {exp_occ}, got {actual}"

        # Check target status if specified
        if "targets" in expected:
            assert len(result.targets) == len(expected["targets"]), (
                f"Tick {i}: expected {len(expected['targets'])} targets, got {len(result.targets)}"
            )
            for j, exp_t in enumerate(expected["targets"]):
                assert j < len(result.targets), f"Tick {i}: missing target {j}"
                actual_t = result.targets[j]
                assert actual_t.status == exp_t["status"], (
                    f"Tick {i}: target {j} status: expected {exp_t['status']}, got {actual_t.status}"
                )
                if "x" in exp_t:
                    assert actual_t.x == pytest.approx(exp_t["x"]), f"Tick {i}: target {j} x"
                    assert actual_t.y == pytest.approx(exp_t["y"]), f"Tick {i}: target {j} y"
                if "signal" in exp_t:
                    assert actual_t.signal == exp_t["signal"], f"Tick {i}: target {j} signal"
