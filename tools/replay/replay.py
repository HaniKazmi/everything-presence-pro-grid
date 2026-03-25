#!/usr/bin/env python3
"""Replay tool: feed recorded sensor data through Python and C++ zone engines, compare outputs.

Usage:
    python tools/replay/replay.py --recording data.jsonl --config config.json [--cpp-binary ./replay]

The config JSON uses the same format as get_config_data():
{
    "calibration": {"perspective": [...], "room_width": ..., "room_depth": ...},
    "grid_origin_x": ..., "grid_origin_y": ..., "grid_cols": 20, "grid_rows": 20,
    "room_layout": {"grid_bytes": [...]},
    "zones": [{"id": 1, "name": "Zone 1", "type": "normal", ...}, ...]
}
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

# Add the project root to sys.path so we can import custom_components
_project_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_project_root))

from custom_components.eppgrid.calibration import SensorTransform
from custom_components.eppgrid.const import GRID_COLS
from custom_components.eppgrid.const import GRID_ROWS
from custom_components.eppgrid.const import MAX_TARGETS
from custom_components.eppgrid.const import ZONE_TYPE_DEFAULTS
from custom_components.eppgrid.const import ZONE_TYPE_NORMAL
from custom_components.eppgrid.zone_engine import Grid
from custom_components.eppgrid.zone_engine import Zone
from custom_components.eppgrid.zone_engine import ZoneEngine


def load_config(config_path: str) -> dict:
    """Load zone engine configuration from JSON file."""
    with open(config_path) as f:
        return json.load(f)


def build_transform(config: dict) -> SensorTransform:
    """Build SensorTransform from config."""
    cal = config.get("calibration", {})
    return SensorTransform(
        perspective=cal.get("perspective"),
        room_width=cal.get("room_width", 0.0),
        room_depth=cal.get("room_depth", 0.0),
    )


def build_grid(config: dict) -> Grid:
    """Build Grid from config."""
    cols = config.get("grid_cols", GRID_COLS)
    rows = config.get("grid_rows", GRID_ROWS)
    origin_x = config.get("grid_origin_x", 0.0)
    origin_y = config.get("grid_origin_y", 0.0)
    grid = Grid(origin_x=origin_x, origin_y=origin_y, cols=cols, rows=rows)

    # Load grid bytes from room_layout if present
    room_layout = config.get("room_layout", {})
    grid_bytes = room_layout.get("grid_bytes")
    if grid_bytes and isinstance(grid_bytes, list):
        grid.load_from_bytes(bytes(grid_bytes))
    return grid


def build_zones(config: dict) -> list[Zone]:
    """Build Zone list from config."""
    zones = []
    for z in config.get("zones", []):
        ztype = z.get("type", ZONE_TYPE_NORMAL)
        defaults = ZONE_TYPE_DEFAULTS.get(ztype, ZONE_TYPE_DEFAULTS[ZONE_TYPE_NORMAL])
        zones.append(
            Zone(
                id=z["id"],
                name=z.get("name", f"Zone {z['id']}"),
                type=ztype,
                color=z.get("color", ""),
                trigger=z.get("trigger", defaults["trigger"]),
                renew=z.get("renew", defaults["renew"]),
                timeout=z.get("timeout", defaults["timeout"]),
                handoff_timeout=z.get("handoff_timeout", defaults["handoff_timeout"]),
                entry_point=z.get("entry_point", False),
            )
        )
    return zones


def run_python_replay(
    recording_path: str,
    transform: SensorTransform,
    grid: Grid,
    zones: list[Zone],
) -> list[dict]:
    """Replay recording through the Python zone engine."""
    engine = ZoneEngine(grid=grid, zones=zones)

    # Apply room-level zone settings if present
    results = []

    with open(recording_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            frame = json.loads(line)
            t = frame["t"]
            targets_data = frame["targets"]

            # Build calibrated targets (same logic as coordinator._schedule_rebuild)
            calibrated: list[tuple[float, float, bool]] = []
            for i in range(MAX_TARGETS):
                if i < len(targets_data):
                    td = targets_data[i]
                    active = td.get("active", False)
                    raw_x = td.get("x", 0.0)
                    raw_y = td.get("y", 0.0)

                    # Gate y==0 (same as coordinator)
                    if active and raw_y == 0:
                        active = False

                    if active:
                        cx, cy = transform.apply(raw_x, raw_y)
                        cell = grid.xy_to_cell(cx, cy)
                        inside = cell is not None and grid.cell_is_room(cell)
                        calibrated.append((cx, cy, inside))
                    else:
                        calibrated.append((0.0, 0.0, False))
                else:
                    calibrated.append((0.0, 0.0, False))

            result = engine.feed_raw(calibrated, t)
            if result is not None:
                results.append(
                    {
                        "t": t,
                        "zone_occupancy": {str(k): v for k, v in result.zone_occupancy.items()},
                        "tracking_present": result.device_tracking_present,
                        "targets": [
                            {
                                "x": tr.x,
                                "y": tr.y,
                                "status": tr.status.value,
                                "signal": tr.signal,
                            }
                            for tr in result.targets
                        ],
                    }
                )

    return results


def run_cpp_replay(
    recording_path: str,
    config_path: str,
    cpp_binary: str,
) -> list[dict]:
    """Replay recording through the C++ zone engine binary."""
    with open(recording_path) as f:
        recording_data = f.read()

    proc = subprocess.run(
        [cpp_binary, config_path],
        input=recording_data,
        capture_output=True,
        text=True,
        timeout=60,
    )

    if proc.returncode != 0:
        print(f"C++ binary failed (exit {proc.returncode}):", file=sys.stderr)
        print(proc.stderr, file=sys.stderr)
        return []

    results = []
    for line in proc.stdout.strip().split("\n"):
        if line:
            results.append(json.loads(line))
    return results


def compare_results(py_results: list[dict], cpp_results: list[dict]) -> tuple[int, list[str]]:
    """Compare Python and C++ results tick-by-tick. Returns (total_ticks, divergences)."""
    divergences: list[str] = []
    n = min(len(py_results), len(cpp_results))

    if len(py_results) != len(cpp_results):
        divergences.append(f"Tick count mismatch: Python={len(py_results)}, C++={len(cpp_results)}")

    for i in range(n):
        py = py_results[i]
        cpp = cpp_results[i]
        tick_divs: list[str] = []

        # Compare zone occupancy
        py_occ = py.get("zone_occupancy", {})
        cpp_occ = cpp.get("zone_occupancy", {})
        all_zones = set(py_occ.keys()) | set(cpp_occ.keys())
        for zid in sorted(all_zones):
            py_val = py_occ.get(zid, False)
            cpp_val = cpp_occ.get(zid, False)
            if py_val != cpp_val:
                tick_divs.append(f"zone {zid}: Python={py_val}, C++={cpp_val}")

        # Compare tracking_present
        if py.get("tracking_present") != cpp.get("tracking_present"):
            tick_divs.append(
                f"tracking_present: Python={py.get('tracking_present')}, C++={cpp.get('tracking_present')}"
            )

        # Compare target count and statuses
        py_targets = py.get("targets", [])
        cpp_targets = cpp.get("targets", [])
        if len(py_targets) != len(cpp_targets):
            tick_divs.append(f"target count: Python={len(py_targets)}, C++={len(cpp_targets)}")
        else:
            for j in range(len(py_targets)):
                pt = py_targets[j]
                ct = cpp_targets[j]
                if pt.get("status") != ct.get("status"):
                    tick_divs.append(f"target {j} status: Python={pt.get('status')}, C++={ct.get('status')}")
                # Compare positions with tolerance (float precision)
                px, py_y = pt.get("x", 0), pt.get("y", 0)
                cx, cy = ct.get("x", 0), ct.get("y", 0)
                if abs(px - cx) > 1.0 or abs(py_y - cy) > 1.0:
                    tick_divs.append(f"target {j} position: Python=({px:.1f},{py_y:.1f}), C++=({cx:.1f},{cy:.1f})")

        if tick_divs:
            t = py.get("t", i)
            divergences.append(f"Tick {i} (t={t:.3f}): " + "; ".join(tick_divs))

    return n, divergences


def main() -> None:
    parser = argparse.ArgumentParser(description="Replay LD2450 recordings through Python and C++ zone engines")
    parser.add_argument("--recording", required=True, help="Path to JSONL recording file")
    parser.add_argument("--config", required=True, help="Path to zone engine config JSON")
    parser.add_argument(
        "--cpp-binary",
        default=None,
        help="Path to C++ replay binary (skip C++ comparison if not provided)",
    )
    parser.add_argument(
        "--python-only",
        action="store_true",
        help="Only run Python replay, output results as JSONL",
    )
    args = parser.parse_args()

    config = load_config(args.config)
    transform = build_transform(config)
    grid = build_grid(config)
    zones = build_zones(config)

    print(f"Config loaded: {len(zones)} zones, grid {grid.cols}x{grid.rows}", file=sys.stderr)

    # Run Python replay
    print("Running Python replay...", file=sys.stderr)
    t0 = time.monotonic()
    py_results = run_python_replay(args.recording, transform, grid, zones)
    t1 = time.monotonic()
    print(
        f"Python: {len(py_results)} ticks in {t1 - t0:.3f}s",
        file=sys.stderr,
    )

    if args.python_only:
        for r in py_results:
            print(json.dumps(r))
        return

    if args.cpp_binary is None:
        # Try default build location
        default_path = Path(__file__).resolve().parents[2] / "firmware" / "lib" / "epp_zone_engine" / "build" / "replay"
        if default_path.exists():
            args.cpp_binary = str(default_path)
        else:
            print(
                "No C++ binary found. Use --cpp-binary or build the replay tool first.",
                file=sys.stderr,
            )
            print(f"Python results: {len(py_results)} ticks")
            for r in py_results:
                print(json.dumps(r))
            return

    # Run C++ replay
    print("Running C++ replay...", file=sys.stderr)
    t0 = time.monotonic()
    cpp_results = run_cpp_replay(args.recording, args.config, args.cpp_binary)
    t1 = time.monotonic()
    print(
        f"C++: {len(cpp_results)} ticks in {t1 - t0:.3f}s",
        file=sys.stderr,
    )

    # Compare
    total, divergences = compare_results(py_results, cpp_results)
    print(f"\n{'=' * 60}")
    print(f"Comparison: {total} ticks, {len(divergences)} divergences")
    print(f"{'=' * 60}")

    if divergences:
        for d in divergences:
            print(f"  DIVERGE: {d}")
        sys.exit(1)
    else:
        print("  All ticks match.")


if __name__ == "__main__":
    main()
