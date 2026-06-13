"""Tests for the (mac, slot) -> entity_id resolver."""

from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from custom_components.eppgrid.device_groups._registry import build_source_states
from custom_components.eppgrid.device_groups._registry import resolve_entity_id
from custom_components.eppgrid.device_groups._registry import zone_name_from_store


class _FakeStore:
    def __init__(self, devices: dict) -> None:
        self.devices = devices


class TestZoneNameFromStore:
    def test_reads_name_from_zone_slots_dict(self) -> None:
        """room_layout is persisted as {grid_bytes, zone_slots, furniture};
        zone names live at room_layout['zone_slots'][idx]['name']."""
        store = _FakeStore(
            {
                "AA:BB:CC:DD:EE:FF": {
                    "room_layout": {
                        "grid_bytes": [0] * 400,
                        "zone_slots": [
                            {"name": "Room", "type": "default"},
                            None,
                            {"name": "Bed", "type": "presence"},
                            None,
                            None,
                            None,
                            None,
                            None,
                        ],
                        "furniture": [],
                    }
                }
            }
        )
        # Named zones use the same "Zone {name}" structure as the real sensors.
        assert zone_name_from_store(store, "AA:BB:CC:DD:EE:FF", 2) == "Zone Bed"
        # An empty (None) slot has no name.
        assert zone_name_from_store(store, "AA:BB:CC:DD:EE:FF", 1) is None
        # Out-of-range index.
        assert zone_name_from_store(store, "AA:BB:CC:DD:EE:FF", 7) is None

    def test_missing_layout_returns_none(self) -> None:
        store = _FakeStore({"AA:BB:CC:DD:EE:FF": {}})
        assert zone_name_from_store(store, "AA:BB:CC:DD:EE:FF", 2) is None

    def test_unknown_mac_returns_none(self) -> None:
        assert zone_name_from_store(_FakeStore({}), "ZZ:ZZ:ZZ:ZZ:ZZ:ZZ", 2) is None

    def test_zone_0_is_rest_of_room(self) -> None:
        """Zone 0 is the always-present rest-of-room zone, named like the real
        sensor ('Zone Rest of Room') regardless of any slot-0 name."""
        store = _FakeStore({"AA": {"room_layout": {"zone_slots": [{"type": "default"}, None]}}})
        assert zone_name_from_store(store, "AA", 0) == "Zone Rest of Room"

    def test_zone_0_is_rest_of_room_with_no_layout(self) -> None:
        assert zone_name_from_store(_FakeStore({"AA": {}}), "AA", 0) == "Zone Rest of Room"


def _add_entity(hass: HomeAssistant, mac: str, slot: str, *, disabled: bool = False) -> str:
    """Register a fake ESPHome binary_sensor with the integration's unique_id pattern."""
    registry = er.async_get(hass)
    entry = registry.async_get_or_create(
        domain="binary_sensor",
        platform="esphome",
        unique_id=f"{mac}-binary_sensor-{slot}",
        original_name=slot.replace("_", " ").title(),
    )
    if disabled:
        registry.async_update_entity(entry.entity_id, disabled_by=er.RegistryEntryDisabler.USER)
    return entry.entity_id


class TestResolveEntityId:
    async def test_returns_entity_id_for_enabled_source(self, hass: HomeAssistant) -> None:
        entity_id = _add_entity(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
        result = resolve_entity_id(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
        assert result == entity_id

    async def test_returns_none_for_missing_source(self, hass: HomeAssistant) -> None:
        assert resolve_entity_id(hass, "AA:BB:CC:DD:EE:FF", "occupancy") is None

    async def test_returns_entity_id_even_when_disabled(self, hass: HomeAssistant) -> None:
        """Caller decides what disabled means; resolver just locates the entity."""
        entity_id = _add_entity(hass, "AA:BB:CC:DD:EE:FF", "static_presence", disabled=True)
        result = resolve_entity_id(hass, "AA:BB:CC:DD:EE:FF", "static_presence")
        assert result == entity_id


class TestBuildSourceStates:
    async def test_builds_source_state_for_known_macs(self, hass: HomeAssistant) -> None:
        _add_entity(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
        _add_entity(hass, "AA:BB:CC:DD:EE:FF", "static_presence", disabled=True)
        _add_entity(hass, "AA:BB:CC:DD:EE:FF", "zone_2_presence")

        def name_for(mac: str) -> str:
            return {"AA:BB:CC:DD:EE:FF": "Master Bedroom Left"}.get(mac, mac)

        def zone_name_for(mac: str, idx: int) -> str | None:
            return {("AA:BB:CC:DD:EE:FF", 2): "Bed Left"}.get((mac, idx))

        sources = build_source_states(
            hass,
            macs=["AA:BB:CC:DD:EE:FF"],
            device_name_fn=name_for,
            zone_name_fn=zone_name_for,
        )
        assert len(sources) == 1
        src = sources[0]
        assert src.mac == "AA:BB:CC:DD:EE:FF"
        assert src.name == "Master Bedroom Left"
        assert src.enabled_presence == ["occupancy"]  # static_presence is disabled
        assert len(src.zones) == 1
        assert src.zones[0].index == 2
        assert src.zones[0].name == "Bed Left"
        assert src.zones[0].enabled is True

    async def test_includes_zone_0_rest_of_room_when_enabled(self, hass: HomeAssistant) -> None:
        """Zone 0 (rest of room) is exposed like any other zone when its entity
        is enabled and it has a name (defaulted to 'Rest of room')."""
        _add_entity(hass, "AA:BB:CC:DD:EE:FF", "zone_0_presence")

        sources = build_source_states(
            hass,
            macs=["AA:BB:CC:DD:EE:FF"],
            device_name_fn=lambda m: m,
            zone_name_fn=lambda m, i: "Rest of room" if i == 0 else None,
        )
        zone_indexes = [z.index for z in sources[0].zones]
        assert 0 in zone_indexes
        zone0 = next(z for z in sources[0].zones if z.index == 0)
        assert zone0.name == "Rest of room"
        assert zone0.enabled is True

    async def test_skips_unknown_macs_gracefully(self, hass: HomeAssistant) -> None:
        sources = build_source_states(
            hass,
            macs=["DEAD:DEAD:DEAD:DEAD:DEAD:DE"],
            device_name_fn=lambda m: m,
            zone_name_fn=lambda m, i: None,
        )
        # No entries in the registry → empty enabled_presence + zones, but the
        # SourceState still exists so the caller can mark the group as needing
        # repair.
        assert len(sources) == 1
        assert sources[0].enabled_presence == []
        assert sources[0].zones == []
