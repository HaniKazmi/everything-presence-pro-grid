"""Tests for EPPGridStore."""

from __future__ import annotations

import pytest
from homeassistant.core import HomeAssistant

from custom_components.eppgrid.storage import EPPGridStore


@pytest.fixture
def store(hass: HomeAssistant) -> EPPGridStore:
    """Create a fresh store instance."""
    return EPPGridStore(hass)


class TestEPPGridStore:
    """Tests for EPPGridStore persistence."""

    async def test_load_empty(self, hass: HomeAssistant, store: EPPGridStore) -> None:
        """Loading with no stored data gives empty defaults."""
        await store.async_load()
        assert store.devices == {}
        assert store.configurations == {}
        assert store.sidebar_panel is True
        assert store.show_room_calibration_tutorial is True

    async def test_save_and_load_roundtrip(self, hass: HomeAssistant, store: EPPGridStore) -> None:
        """Data survives save/load cycle."""
        await store.async_load()
        store.devices["AA:BB:CC:DD:EE:FF"] = {
            "calibration": {"perspective": [1.0] * 8, "room_width": 3000.0, "room_depth": 4000.0},
        }
        store.configurations["bedroom"] = {"grid_bytes": [1] * 400}
        store.sidebar_panel = False
        store.show_room_calibration_tutorial = False
        await store.async_save()

        store2 = EPPGridStore(hass)
        await store2.async_load()
        assert "AA:BB:CC:DD:EE:FF" in store2.devices
        assert store2.devices["AA:BB:CC:DD:EE:FF"]["calibration"]["room_width"] == 3000.0
        assert "bedroom" in store2.configurations
        assert store2.sidebar_panel is False
        assert store2.show_room_calibration_tutorial is False

    async def test_get_device_returns_none_for_unknown(self, store: EPPGridStore) -> None:
        """get_device returns None for unknown MAC."""
        await store.async_load()
        assert store.get_device("00:00:00:00:00:00") is None

    async def test_get_device_returns_config(self, store: EPPGridStore) -> None:
        """get_device returns stored config for known MAC."""
        await store.async_load()
        config = {"calibration": {"perspective": [0.5] * 8}}
        store.devices["AA:BB:CC:DD:EE:FF"] = config
        assert store.get_device("AA:BB:CC:DD:EE:FF") is config

    async def test_multiple_devices(self, hass: HomeAssistant, store: EPPGridStore) -> None:
        """Store handles multiple devices independently."""
        await store.async_load()
        store.devices["AA:BB:CC:DD:EE:01"] = {"name": "device1"}
        store.devices["AA:BB:CC:DD:EE:02"] = {"name": "device2"}
        await store.async_save()

        store2 = EPPGridStore(hass)
        await store2.async_load()
        assert store2.devices["AA:BB:CC:DD:EE:01"]["name"] == "device1"
        assert store2.devices["AA:BB:CC:DD:EE:02"]["name"] == "device2"

    async def test_legacy_templates_key_is_ignored(self, hass: HomeAssistant) -> None:
        """Legacy `templates` key from pre-rename storage is not migrated."""
        seed_store = EPPGridStore(hass)
        await seed_store._store.async_save(
            {
                "devices": {},
                "templates": {"Bedroom": {"grid": [0], "zones": []}},
                "sidebar_panel": True,
                "show_room_calibration_tutorial": True,
            }
        )

        store = EPPGridStore(hass)
        await store.async_load()

        assert store.configurations == {}
