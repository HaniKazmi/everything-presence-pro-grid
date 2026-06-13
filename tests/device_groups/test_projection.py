"""Tests for derive_exposed_entities — the single source of truth for
which entities a device group exposes given its definition + source state."""

from __future__ import annotations

from custom_components.eppgrid.device_groups._projection import SourceState
from custom_components.eppgrid.device_groups._projection import ZoneState
from custom_components.eppgrid.device_groups._projection import derive_exposed_entities


def _source(mac: str, name: str, enabled_presence: list[str], zones: list[ZoneState]) -> SourceState:
    return SourceState(mac=mac, name=name, enabled_presence=enabled_presence, zones=zones)


class TestPresenceProjection:
    def test_no_sources_exposes_nothing(self) -> None:
        result = derive_exposed_entities(sources=[], zone_groups=[])
        assert result["presence"] == []
        assert result["zones"] == []

    def test_union_of_enabled_presence_across_sources(self) -> None:
        sources = [
            _source("AA", "Left", ["occupancy"], []),
            _source("BB", "Right", ["occupancy", "static_presence"], []),
        ]
        result = derive_exposed_entities(sources=sources, zone_groups=[])
        # Preserves PRESENCE_SLOTS order, not insertion order.
        assert result["presence"] == ["occupancy", "static_presence"]

    def test_presence_disabled_on_all_sources_is_excluded(self) -> None:
        sources = [_source("AA", "Left", ["occupancy"], [])]
        result = derive_exposed_entities(sources=sources, zone_groups=[])
        assert "static_presence" not in result["presence"]


class TestZoneProjection:
    def test_unmerged_zones_pass_through_with_original_name(self) -> None:
        sources = [
            _source("AA", "Left", [], [ZoneState(index=2, name="Desk", enabled=True)]),
        ]
        result = derive_exposed_entities(sources=sources, zone_groups=[])
        assert result["zones"] == [
            {"kind": "passthrough", "mac": "AA", "zone_index": 2, "name": "Desk", "available": True},
        ]

    def test_disabled_zones_are_excluded(self) -> None:
        sources = [
            _source("AA", "Left", [], [ZoneState(index=2, name="Desk", enabled=False)]),
        ]
        result = derive_exposed_entities(sources=sources, zone_groups=[])
        assert result["zones"] == []

    def test_passthrough_name_collision_prefixes_source_name(self) -> None:
        sources = [
            _source("AA", "Left", [], [ZoneState(index=2, name="Desk", enabled=True)]),
            _source("BB", "Right", [], [ZoneState(index=3, name="Desk", enabled=True)]),
        ]
        result = derive_exposed_entities(sources=sources, zone_groups=[])
        names = sorted(z["name"] for z in result["zones"])
        assert names == ["Left Desk", "Right Desk"]

    def test_zone_in_group_does_not_also_passthrough(self) -> None:
        sources = [
            _source("AA", "Left", [], [ZoneState(index=2, name="Bed Left", enabled=True)]),
            _source("BB", "Right", [], [ZoneState(index=3, name="Bed Right", enabled=True)]),
        ]
        zone_groups = [
            {
                "id": "g1",
                "name": "Bed",
                "members": [
                    {"mac": "AA", "zone_index": 2},
                    {"mac": "BB", "zone_index": 3},
                ],
            }
        ]
        result = derive_exposed_entities(sources=sources, zone_groups=zone_groups)
        assert result["zones"] == [
            {"kind": "group", "id": "g1", "name": "Zone Bed", "available": True},
        ]

    def test_group_with_only_disabled_members_marked_unavailable(self) -> None:
        sources = [
            _source("AA", "Left", [], [ZoneState(index=2, name="Bed L", enabled=False)]),
        ]
        zone_groups = [
            {
                "id": "g1",
                "name": "Bed",
                "members": [{"mac": "AA", "zone_index": 2}],
            }
        ]
        result = derive_exposed_entities(sources=sources, zone_groups=zone_groups)
        assert result["zones"] == [
            {"kind": "group", "id": "g1", "name": "Zone Bed", "available": False},
        ]

    def test_group_partially_available_is_available(self) -> None:
        """If ANY member is enabled the group entity is available."""
        sources = [
            _source("AA", "Left", [], [ZoneState(index=2, name="Bed L", enabled=True)]),
            _source("BB", "Right", [], [ZoneState(index=3, name="Bed R", enabled=False)]),
        ]
        zone_groups = [
            {
                "id": "g1",
                "name": "Bed",
                "members": [
                    {"mac": "AA", "zone_index": 2},
                    {"mac": "BB", "zone_index": 3},
                ],
            }
        ]
        result = derive_exposed_entities(sources=sources, zone_groups=zone_groups)
        assert result["zones"][0]["available"] is True

    def test_group_with_no_members_excluded(self) -> None:
        """A zone group whose member list is empty doesn't expose an entity."""
        zone_groups = [{"id": "g1", "name": "Empty", "members": []}]
        result = derive_exposed_entities(sources=[], zone_groups=zone_groups)
        assert result["zones"] == [
            {"kind": "group", "id": "g1", "name": "Zone Empty", "available": False},
        ]

    def test_zones_sorted_by_source_then_index(self) -> None:
        """Stable order for UI/registry: source order, then zone_index."""
        sources = [
            _source(
                "AA",
                "Left",
                [],
                [
                    ZoneState(index=3, name="Sofa", enabled=True),
                    ZoneState(index=2, name="Desk", enabled=True),
                ],
            ),
            _source(
                "BB",
                "Right",
                [],
                [
                    ZoneState(index=1, name="Door", enabled=True),
                ],
            ),
        ]
        result = derive_exposed_entities(sources=sources, zone_groups=[])
        names = [z["name"] for z in result["zones"]]
        assert names == ["Desk", "Sofa", "Door"]
