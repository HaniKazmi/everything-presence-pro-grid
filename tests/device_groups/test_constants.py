"""The reserved combined-Rest-of-Room identifiers are part of the device-group
contract: the projection, aggregator, entities, and WS schema all key off them,
and REST_OF_ROOM_NAME must equal what zone 0 resolves to so the py<->ts
projection parity holds."""

from __future__ import annotations

from custom_components.eppgrid.const import REST_OF_ROOM_ID
from custom_components.eppgrid.const import REST_OF_ROOM_NAME
from custom_components.eppgrid.device_manager._helpers import _resolve_zone_name


def test_rest_of_room_id_is_reserved_literal() -> None:
    assert REST_OF_ROOM_ID == "rest_of_room"


def test_rest_of_room_name_matches_zone_zero_resolution() -> None:
    """The combined-RoR display name must byte-match the per-device zone-0 name
    so a group's combined Rest of Room reads identically to a device's own."""
    assert REST_OF_ROOM_NAME == "Zone Rest of Room"
    assert _resolve_zone_name("en", index=0, zone_name=None, target_count=False) == REST_OF_ROOM_NAME
