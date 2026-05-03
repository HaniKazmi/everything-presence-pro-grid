"""Tests for diagnostic dump."""

from __future__ import annotations

from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid.const import DOMAIN
from custom_components.eppgrid.const import FIRMWARE_VERSION
from custom_components.eppgrid.device_manager import DeviceManager
from custom_components.eppgrid.device_manager import ManagedDevice
from custom_components.eppgrid.diagnostics import async_get_config_entry_diagnostics
from custom_components.eppgrid.storage import EPPGridStore


@pytest.fixture
def store(hass: HomeAssistant) -> EPPGridStore:
    """Create a store instance."""
    return EPPGridStore(hass)


@pytest.fixture
def manager(hass: HomeAssistant, store: EPPGridStore) -> DeviceManager:
    """Create a DeviceManager and register it on hass.data."""
    mgr = DeviceManager(hass, store)
    hass.data[DOMAIN] = mgr
    return mgr


class TestDiagnosticDump:
    """Tests for async_get_config_entry_diagnostics."""

    async def test_empty_state(
        self, hass: HomeAssistant, config_entry: MockConfigEntry, manager: DeviceManager
    ) -> None:
        """Dump with no devices returns empty collections."""
        result = await async_get_config_entry_diagnostics(hass, config_entry)

        assert result["firmware_version"] == FIRMWARE_VERSION
        assert "integration_version" in result
        assert result["devices"] == []
        assert result["stored_configs"] == {}
        assert result["configurations"] == {}
        assert result["entity_states"] == {}

    async def test_with_device_and_config(
        self, hass: HomeAssistant, config_entry: MockConfigEntry, manager: DeviceManager, store: EPPGridStore
    ) -> None:
        """Dump includes device info, stored config, and configurations."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="Office", host="192.168.1.100")
        store.devices[mac] = {
            "calibration": {"perspective": [1.0] * 8, "room_width": 3000.0},
            "settings": {"timeout": 10},
        }
        store.configurations["bedroom"] = {"grid_bytes": [0] * 400}
        manager._build_flags[mac] = {"has_ble": True}

        result = await async_get_config_entry_diagnostics(hass, config_entry)

        assert len(result["devices"]) == 1
        dev = result["devices"][0]
        assert dev["mac"] == mac
        assert dev["name"] == "Office"
        assert dev["host"] == "192.168.1.100"

        assert mac in result["stored_configs"]
        assert result["stored_configs"][mac]["calibration"]["room_width"] == 3000.0

        assert "bedroom" in result["configurations"]
        assert result["configurations"]["bedroom"]["grid_bytes"] == [0] * 400

    async def test_entity_states_collected(
        self, hass: HomeAssistant, config_entry: MockConfigEntry, manager: DeviceManager
    ) -> None:
        """Dump collects entity states for each device."""
        mac = "AA:BB:CC:DD:EE:FF"

        # Register a HA device for this managed device
        dev_reg = dr.async_get(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=config_entry.entry_id,
            identifiers={("esphome", "test_device")},
            name="Office",
        )
        manager.devices[mac] = ManagedDevice(mac=mac, name="Office", host="192.168.1.100", device_id=device.id)

        # Register an entity for the device
        ent_reg = er.async_get(hass)
        ent_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            "office_zone_1_presence",
            config_entry=config_entry,
            device_id=device.id,
        )
        entity_id = ent_entry.entity_id
        hass.states.async_set(entity_id, "on")

        result = await async_get_config_entry_diagnostics(hass, config_entry)

        assert mac in result["entity_states"]
        assert result["entity_states"][mac][entity_id] == "on"

    async def test_entity_states_skips_devices_without_device_id(
        self, hass: HomeAssistant, config_entry: MockConfigEntry, manager: DeviceManager
    ) -> None:
        """Devices without a device_id get an empty entity_states dict."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="Office", host="192.168.1.100", device_id=None)

        result = await async_get_config_entry_diagnostics(hass, config_entry)

        assert result["entity_states"][mac] == {}

    async def test_integration_version_uses_loader(
        self, hass: HomeAssistant, config_entry: MockConfigEntry, manager: DeviceManager
    ) -> None:
        """integration_version is read from async_get_loaded_integration, not a static manifest cache."""
        fake_integration = MagicMock()
        fake_integration.version = "9.9.9-test"
        with patch(
            "custom_components.eppgrid.diagnostics.async_get_loaded_integration",
            return_value=fake_integration,
        ):
            result = await async_get_config_entry_diagnostics(hass, config_entry)

        assert result["integration_version"] == "9.9.9-test"
