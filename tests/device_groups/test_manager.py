"""Tests for DeviceGroupManager CRUD and persistence."""

from __future__ import annotations

import pytest
from homeassistant.core import HomeAssistant

from custom_components.eppgrid.device_groups import DeviceGroupManager
from custom_components.eppgrid.storage import EPPGridStore


@pytest.fixture
async def store(hass: HomeAssistant) -> EPPGridStore:
    s = EPPGridStore(hass)
    await s.async_load()
    return s


@pytest.fixture
async def manager(hass: HomeAssistant, store: EPPGridStore) -> DeviceGroupManager:
    m = DeviceGroupManager(hass, store)
    await m.async_start()
    yield m
    await m.async_stop()


class TestCrud:
    async def test_create_returns_new_record_with_id(self, manager: DeviceGroupManager) -> None:
        group = await manager.async_create(
            name="Master Bedroom Presence",
            sources=["AA:BB:CC:DD:EE:FF"],
            area_id=None,
        )
        assert group["id"]
        assert group["name"] == "Master Bedroom Presence"
        assert group["sources"] == ["AA:BB:CC:DD:EE:FF"]
        assert group["zone_groups"] == []

    async def test_list_returns_all_groups(self, manager: DeviceGroupManager) -> None:
        a = await manager.async_create(name="A", sources=["AA:BB:CC:DD:EE:FF"])
        b = await manager.async_create(name="B", sources=["11:22:33:44:55:66"])
        ids = [g["id"] for g in manager.list_groups()]
        assert a["id"] in ids
        assert b["id"] in ids

    async def test_update_full_payload_replaces_record(self, manager: DeviceGroupManager) -> None:
        group = await manager.async_create(name="Old", sources=["AA:BB:CC:DD:EE:FF"])
        updated = await manager.async_update(
            id=group["id"],
            name="New",
            sources=["11:22:33:44:55:66"],
            area_id="bedroom",
            zone_groups=[{"id": "g1", "name": "Bed", "members": [{"mac": "11:22:33:44:55:66", "zone_index": 2}]}],
        )
        assert updated["name"] == "New"
        assert updated["sources"] == ["11:22:33:44:55:66"]
        assert updated["area_id"] == "bedroom"
        assert len(updated["zone_groups"]) == 1

    async def test_update_unknown_id_raises(self, manager: DeviceGroupManager) -> None:
        with pytest.raises(KeyError):
            await manager.async_update(id="nope", name="x", sources=[], area_id=None, zone_groups=[])

    async def test_delete_removes_record(self, manager: DeviceGroupManager) -> None:
        group = await manager.async_create(name="A", sources=["AA:BB:CC:DD:EE:FF"])
        await manager.async_delete(group["id"])
        assert manager.list_groups() == []

    async def test_delete_unknown_id_raises(self, manager: DeviceGroupManager) -> None:
        with pytest.raises(KeyError):
            await manager.async_delete("nope")


class TestValidation:
    async def test_empty_name_rejected(self, manager: DeviceGroupManager) -> None:
        with pytest.raises(ValueError, match="name"):
            await manager.async_create(name="", sources=["AA:BB:CC:DD:EE:FF"])

    async def test_no_sources_rejected(self, manager: DeviceGroupManager) -> None:
        with pytest.raises(ValueError, match="sources"):
            await manager.async_create(name="A", sources=[])

    async def test_too_many_sources_rejected(self, manager: DeviceGroupManager) -> None:
        macs = [f"AA:BB:CC:DD:EE:{i:02X}" for i in range(9)]
        with pytest.raises(ValueError, match="sources"):
            await manager.async_create(name="A", sources=macs)

    async def test_name_too_long_rejected(self, manager: DeviceGroupManager) -> None:
        with pytest.raises(ValueError, match="name"):
            await manager.async_create(name="x" * 129, sources=["AA:BB:CC:DD:EE:FF"])

    async def test_too_many_groups_rejected(self, hass, store, manager: DeviceGroupManager) -> None:
        from custom_components.eppgrid.const import MAX_DEVICE_GROUPS

        for i in range(MAX_DEVICE_GROUPS):
            await manager.async_create(name=f"G{i}", sources=["AA:BB:CC:DD:EE:FF"])
        with pytest.raises(ValueError, match="too many device groups"):
            await manager.async_create(name="overflow", sources=["AA:BB:CC:DD:EE:FF"])

    async def test_malformed_zone_group_rejected(self, manager: DeviceGroupManager) -> None:
        group = await manager.async_create(name="A", sources=["AA:BB:CC:DD:EE:FF"])
        with pytest.raises(ValueError, match="zone group"):
            await manager.async_update(
                id=group["id"],
                name="A",
                sources=["AA:BB:CC:DD:EE:FF"],
                area_id=None,
                zone_groups=[{"id": "g1", "name": "Bed", "members": [{"mac": "AA:BB:CC:DD:EE:FF"}]}],
            )

    async def test_too_many_zone_groups_rejected(self, manager: DeviceGroupManager) -> None:
        from custom_components.eppgrid.const import MAX_ZONE_GROUPS_PER_DEVICE_GROUP

        many = [{"id": f"g{i}", "name": f"G{i}", "members": []} for i in range(MAX_ZONE_GROUPS_PER_DEVICE_GROUP + 1)]
        with pytest.raises(ValueError, match="too many zone groups"):
            await manager.async_create(name="A", sources=["AA:BB:CC:DD:EE:FF"], zone_groups=many)

    async def test_zone_group_missing_id_or_name_rejected(self, manager: DeviceGroupManager) -> None:
        with pytest.raises(ValueError, match="zone group needs id and name"):
            await manager.async_create(
                name="A",
                sources=["AA:BB:CC:DD:EE:FF"],
                zone_groups=[{"id": "g1", "members": []}],
            )

    async def test_get_group_returns_copy_or_none(self, manager: DeviceGroupManager) -> None:
        group = await manager.async_create(name="A", sources=["AA:BB:CC:DD:EE:FF"])
        found = manager.get_group(group["id"])
        assert found is not None
        assert found["name"] == "A"
        assert manager.get_group("nonexistent") is None


class TestPersistence:
    async def test_changes_persist_across_manager_lifecycle(self, hass: HomeAssistant, store: EPPGridStore) -> None:
        m1 = DeviceGroupManager(hass, store)
        await m1.async_start()
        await m1.async_create(name="A", sources=["AA:BB:CC:DD:EE:FF"])
        await m1.async_stop()

        # New store, new manager — data should reload from disk.
        store2 = EPPGridStore(hass)
        await store2.async_load()
        m2 = DeviceGroupManager(hass, store2)
        await m2.async_start()
        try:
            assert len(m2.list_groups()) == 1
            assert m2.list_groups()[0]["name"] == "A"
        finally:
            await m2.async_stop()


class TestChangeNotification:
    async def test_listener_fires_on_create(self, manager: DeviceGroupManager) -> None:
        events = []
        unsub = manager.on_change(lambda: events.append(True))
        try:
            await manager.async_create(name="A", sources=["AA:BB:CC:DD:EE:FF"])
            assert len(events) == 1
        finally:
            unsub()

    async def test_listener_fires_on_update(self, manager: DeviceGroupManager) -> None:
        group = await manager.async_create(name="A", sources=["AA:BB:CC:DD:EE:FF"])
        events = []
        unsub = manager.on_change(lambda: events.append(True))
        try:
            await manager.async_update(
                id=group["id"],
                name="B",
                sources=["AA:BB:CC:DD:EE:FF"],
                area_id=None,
                zone_groups=[],
            )
            assert len(events) == 1
        finally:
            unsub()

    async def test_listener_fires_on_delete(self, manager: DeviceGroupManager) -> None:
        group = await manager.async_create(name="A", sources=["AA:BB:CC:DD:EE:FF"])
        events = []
        unsub = manager.on_change(lambda: events.append(True))
        try:
            await manager.async_delete(group["id"])
            assert len(events) == 1
        finally:
            unsub()

    async def test_listener_unsub_works(self, manager: DeviceGroupManager) -> None:
        events = []
        unsub = manager.on_change(lambda: events.append(True))
        unsub()
        await manager.async_create(name="A", sources=["AA:BB:CC:DD:EE:FF"])
        assert events == []


class TestFullPayload:
    async def test_create_persists_zone_groups_and_exclusions(self, manager: DeviceGroupManager) -> None:
        """create must persist the FULL config in one step (the redesigned editor
        saves a new group's zone_groups + exclusions on first save)."""
        group = await manager.async_create(
            name="Bedroom",
            sources=["AA:BB:CC:DD:EE:FF", "11:22:33:44:55:66"],
            area_id="bedroom",
            zone_groups=[
                {
                    "id": "zg1",
                    "name": "Bed",
                    "members": [
                        {"mac": "AA:BB:CC:DD:EE:FF", "zone_index": 2},
                        {"mac": "11:22:33:44:55:66", "zone_index": 3},
                    ],
                }
            ],
            excluded_presence=["motion_presence"],
            excluded_zones=[{"mac": "AA:BB:CC:DD:EE:FF", "zone_index": 4}],
            excluded_zone_groups=["rest_of_room"],
        )
        assert group["area_id"] == "bedroom"
        assert len(group["zone_groups"]) == 1
        assert group["excluded_presence"] == ["motion_presence"]
        assert group["excluded_zones"] == [{"mac": "AA:BB:CC:DD:EE:FF", "zone_index": 4}]
        assert group["excluded_zone_groups"] == ["rest_of_room"]

    async def test_create_defaults_new_fields_to_empty(self, manager: DeviceGroupManager) -> None:
        group = await manager.async_create(name="A", sources=["AA:BB:CC:DD:EE:FF"])
        assert group["zone_groups"] == []
        assert group["excluded_presence"] == []
        assert group["excluded_zones"] == []
        assert group["excluded_zone_groups"] == []

    async def test_update_round_trips_exclusions(self, manager: DeviceGroupManager) -> None:
        group = await manager.async_create(name="A", sources=["AA:BB:CC:DD:EE:FF"])
        updated = await manager.async_update(
            id=group["id"],
            name="A",
            sources=["AA:BB:CC:DD:EE:FF"],
            area_id=None,
            zone_groups=[],
            excluded_presence=["occupancy"],
            excluded_zones=[{"mac": "AA:BB:CC:DD:EE:FF", "zone_index": 2}],
            excluded_zone_groups=["rest_of_room"],
        )
        assert updated["excluded_presence"] == ["occupancy"]
        assert updated["excluded_zones"] == [{"mac": "AA:BB:CC:DD:EE:FF", "zone_index": 2}]
        assert updated["excluded_zone_groups"] == ["rest_of_room"]

    async def test_update_defaults_missing_exclusions_to_empty(self, manager: DeviceGroupManager) -> None:
        """Omitting the exclusion kwargs (older WS payloads) defaults them to []."""
        group = await manager.async_create(name="A", sources=["AA:BB:CC:DD:EE:FF"])
        updated = await manager.async_update(
            id=group["id"], name="A", sources=["AA:BB:CC:DD:EE:FF"], area_id=None, zone_groups=[]
        )
        assert updated["excluded_presence"] == []
        assert updated["excluded_zones"] == []
        assert updated["excluded_zone_groups"] == []

    async def test_zone_index_zero_in_zone_group_rejected(self, manager: DeviceGroupManager) -> None:
        """zone_groups members are now restricted to zone index 1-7; the implicit
        combined Rest of Room replaces manual zone-0 merges."""
        with pytest.raises(ValueError, match="zone_index"):
            await manager.async_create(
                name="A",
                sources=["AA:BB:CC:DD:EE:FF"],
                zone_groups=[{"id": "zg1", "name": "RoR", "members": [{"mac": "AA:BB:CC:DD:EE:FF", "zone_index": 0}]}],
            )
