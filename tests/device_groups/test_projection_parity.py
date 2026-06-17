"""Shared-fixture parity tests for the projection.

`custom_components/eppgrid/device_groups/_projection.py` (Python) and
`frontend/src/lib/device-groups-projection.ts` (TS) are hand-maintained mirrors
that MUST produce identical output. Both are driven by the SAME fixture:

    tests/fixtures/device_groups_projection_parity.json

  - Python side: this file (pytest)
  - TS side:     frontend/src/__tests__/device-groups-projection-parity.test.ts (vitest)

Edit the fixture -> run BOTH suites. If only one mirror is updated, its suite
fails here, turning silent drift loud.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from custom_components.eppgrid.device_groups._projection import SourceState
from custom_components.eppgrid.device_groups._projection import ZoneState
from custom_components.eppgrid.device_groups._projection import derive_exposed_entities

_FIXTURE = Path(__file__).parents[1] / "fixtures" / "device_groups_projection_parity.json"
_SCENARIOS = json.loads(_FIXTURE.read_text())["scenarios"]


def _to_sources(raw: list[dict]) -> list[SourceState]:
    return [
        SourceState(
            mac=s["mac"],
            name=s["name"],
            enabled_presence=list(s["enabled_presence"]),
            zones=[ZoneState(index=z["index"], name=z["name"], enabled=z["enabled"]) for z in s["zones"]],
        )
        for s in raw
    ]


@pytest.mark.parametrize("scenario", _SCENARIOS, ids=[s["name"] for s in _SCENARIOS])
def test_projection_parity(scenario: dict) -> None:
    excluded = scenario.get("excluded", {})
    result = derive_exposed_entities(
        _to_sources(scenario["sources"]),
        scenario["zone_groups"],
        excluded_presence=excluded.get("presence", []),
        excluded_zones=excluded.get("zones", []),
        excluded_zone_groups=excluded.get("zoneGroups", []),
    )
    assert result == scenario["expected"]
