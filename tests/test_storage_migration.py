"""Tests for EPPGridStore version migration."""

from __future__ import annotations

from homeassistant.core import HomeAssistant

from custom_components.eppgrid.const import DOMAIN
from custom_components.eppgrid.storage import STORAGE_VERSION
from custom_components.eppgrid.storage import EPPGridStore


def test_storage_version_is_two() -> None:
    """Bumped to v2 to add device_groups."""
    assert STORAGE_VERSION == 2


async def test_migration_from_v1_adds_empty_device_groups(hass: HomeAssistant, hass_storage: dict) -> None:
    """A v1 dict (no device_groups key) migrates to v2 with [] added."""
    hass_storage[DOMAIN] = {
        "version": 1,
        "key": DOMAIN,
        "data": {
            "devices": {"AA:BB:CC:DD:EE:FF": {"calibration": {}}},
            "configurations": {"bedroom": {"grid_bytes": [0]}},
            "sidebar_panel": False,
            "show_room_calibration_tutorial": True,
        },
    }
    store = EPPGridStore(hass)
    await store.async_load()

    # Existing keys preserved.
    assert "AA:BB:CC:DD:EE:FF" in store.devices
    assert "bedroom" in store.configurations
    assert store.sidebar_panel is False
    # New key initialized empty.
    assert store.device_groups == []


async def test_fresh_store_has_empty_device_groups(hass: HomeAssistant) -> None:
    """A fresh store (no data on disk) initializes device_groups=[]."""
    store = EPPGridStore(hass)
    await store.async_load()
    assert store.device_groups == []


async def test_save_round_trip_persists_device_groups(hass: HomeAssistant) -> None:
    """Saving and re-loading preserves device_groups list."""
    store = EPPGridStore(hass)
    await store.async_load()
    store.device_groups = [
        {
            "id": "abc",
            "name": "Master Bedroom",
            "area_id": "master_bedroom",
            "sources": ["AA:BB:CC:DD:EE:FF"],
            "zone_groups": [],
        }
    ]
    await store.async_save()

    store2 = EPPGridStore(hass)
    await store2.async_load()
    assert len(store2.device_groups) == 1
    assert store2.device_groups[0]["name"] == "Master Bedroom"
