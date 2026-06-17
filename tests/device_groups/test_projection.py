"""Tests for derive_exposed_entities — the single source of truth for
which entities a device group exposes given its definition + source state."""

from __future__ import annotations

from custom_components.eppgrid.const import REST_OF_ROOM_ID
from custom_components.eppgrid.const import REST_OF_ROOM_NAME
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

    def test_group_with_no_members_projected_unavailable(self) -> None:
        """A zone group with no members is still projected, marked unavailable."""
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


class TestExclusions:
    def test_excluded_presence_slot_is_dropped(self) -> None:
        sources = [_source("AA", "Left", ["occupancy", "static_presence"], [])]
        result = derive_exposed_entities(sources=sources, zone_groups=[], excluded_presence=["static_presence"])
        assert result["presence"] == ["occupancy"]

    def test_excluded_passthrough_zone_is_dropped(self) -> None:
        sources = [
            _source(
                "AA",
                "Left",
                [],
                [
                    ZoneState(index=2, name="Desk", enabled=True),
                    ZoneState(index=3, name="Sofa", enabled=True),
                ],
            ),
        ]
        result = derive_exposed_entities(
            sources=sources, zone_groups=[], excluded_zones=[{"mac": "AA", "zone_index": 2}]
        )
        names = [z["name"] for z in result["zones"]]
        assert names == ["Sofa"]

    def test_excluded_zone_group_is_dropped(self) -> None:
        sources = [
            _source("AA", "Left", [], [ZoneState(index=2, name="Bed L", enabled=True)]),
            _source("BB", "Right", [], [ZoneState(index=3, name="Bed R", enabled=True)]),
        ]
        zone_groups = [
            {"id": "g1", "name": "Bed", "members": [{"mac": "AA", "zone_index": 2}, {"mac": "BB", "zone_index": 3}]}
        ]
        result = derive_exposed_entities(sources=sources, zone_groups=zone_groups, excluded_zone_groups=["g1"])
        assert result["zones"] == []

    def test_excluding_a_zone_group_still_keeps_its_members_out_of_passthrough(self) -> None:
        """An excluded merge produces no group entity AND its members stay merged
        (they don't fall back to individual passthroughs)."""
        sources = [
            _source("AA", "Left", [], [ZoneState(index=2, name="Bed L", enabled=True)]),
        ]
        zone_groups = [{"id": "g1", "name": "Bed", "members": [{"mac": "AA", "zone_index": 2}]}]
        result = derive_exposed_entities(sources=sources, zone_groups=zone_groups, excluded_zone_groups=["g1"])
        assert result["zones"] == []

    def test_default_none_exclusions_behave_like_empty(self) -> None:
        sources = [_source("AA", "Left", ["occupancy"], [ZoneState(index=2, name="Desk", enabled=True)])]
        result = derive_exposed_entities(sources=sources, zone_groups=[])
        assert result["presence"] == ["occupancy"]
        assert [z["name"] for z in result["zones"]] == ["Desk"]


class TestCombinedRestOfRoom:
    def test_combined_ror_emitted_when_a_source_has_enabled_zone_zero(self) -> None:
        sources = [
            _source("AA", "Left", [], [ZoneState(index=0, name="Zone Rest of Room", enabled=True)]),
        ]
        result = derive_exposed_entities(sources=sources, zone_groups=[])
        assert result["zones"] == [
            {"kind": "group", "id": REST_OF_ROOM_ID, "name": REST_OF_ROOM_NAME, "available": True},
        ]

    def test_combined_ror_is_first_in_zone_order(self) -> None:
        """Order is [combined RoR] + [merged groups] + [passthroughs]."""
        sources = [
            _source(
                "AA",
                "Left",
                [],
                [
                    ZoneState(index=0, name="Zone Rest of Room", enabled=True),
                    ZoneState(index=2, name="Desk", enabled=True),
                ],
            ),
        ]
        result = derive_exposed_entities(sources=sources, zone_groups=[])
        assert [z["id"] if z["kind"] == "group" else z["name"] for z in result["zones"]] == [
            REST_OF_ROOM_ID,
            "Desk",
        ]

    def test_combined_ror_available_is_or_of_member_enabled(self) -> None:
        sources = [
            _source("AA", "Left", [], [ZoneState(index=0, name="Zone Rest of Room", enabled=False)]),
            _source("BB", "Right", [], [ZoneState(index=0, name="Zone Rest of Room", enabled=True)]),
        ]
        result = derive_exposed_entities(sources=sources, zone_groups=[])
        assert result["zones"][0] == {
            "kind": "group",
            "id": REST_OF_ROOM_ID,
            "name": REST_OF_ROOM_NAME,
            "available": True,
        }

    def test_combined_ror_not_emitted_when_no_source_has_zone_zero(self) -> None:
        sources = [_source("AA", "Left", [], [ZoneState(index=2, name="Desk", enabled=True)])]
        result = derive_exposed_entities(sources=sources, zone_groups=[])
        assert all(z.get("id") != REST_OF_ROOM_ID for z in result["zones"])

    def test_combined_ror_emitted_even_when_all_zone_zero_disabled(self) -> None:
        """Like merged groups, the combined RoR appears (marked unavailable) as
        long as a source HAS a zone 0, so the user can still see/toggle it."""
        sources = [_source("AA", "Left", [], [ZoneState(index=0, name="Zone Rest of Room", enabled=False)])]
        result = derive_exposed_entities(sources=sources, zone_groups=[])
        assert result["zones"] == [
            {"kind": "group", "id": REST_OF_ROOM_ID, "name": REST_OF_ROOM_NAME, "available": False},
        ]

    def test_combined_ror_dropped_when_excluded(self) -> None:
        sources = [_source("AA", "Left", [], [ZoneState(index=0, name="Zone Rest of Room", enabled=True)])]
        result = derive_exposed_entities(sources=sources, zone_groups=[], excluded_zone_groups=[REST_OF_ROOM_ID])
        assert result["zones"] == []
