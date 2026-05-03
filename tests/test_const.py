"""Tests for module-level constants and helpers."""

from __future__ import annotations

from custom_components.eppgrid.const import NUM_ZONE_SLOTS
from custom_components.eppgrid.const import empty_zone_slots


class TestEmptyZoneSlots:
    """empty_zone_slots() must return a fresh, mutable copy each call."""

    def test_returns_correct_shape(self) -> None:
        slots = empty_zone_slots()
        assert len(slots) == NUM_ZONE_SLOTS
        assert slots[0] == {"type": "default"}
        assert all(slot is None for slot in slots[1:])

    def test_returns_fresh_list_each_call(self) -> None:
        a = empty_zone_slots()
        b = empty_zone_slots()
        assert a is not b
        assert a[0] is not b[0]

    def test_mutation_does_not_leak_across_calls(self) -> None:
        a = empty_zone_slots()
        a[0]["type"] = "mutated"
        a[1] = {"name": "Zone1"}

        b = empty_zone_slots()
        assert b[0]["type"] == "default"
        assert b[1] is None
