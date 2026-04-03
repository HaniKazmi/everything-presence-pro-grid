"""Tests for flashable device discovery."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid.device_manager import DeviceManager
from custom_components.eppgrid.storage import EPPGridStore


@pytest.fixture
def mock_store():
    store = MagicMock(spec=EPPGridStore)
    store.devices = {}
    store.templates = {}
    store.sidebar_panel = True
    store.get_device = MagicMock(return_value=None)
    return store


def _create_esphome_device(
    hass,
    dev_reg: dr.DeviceRegistry,
    ent_reg: er.EntityRegistry,
    *,
    mac: str,
    name: str,
    host: str,
    has_zone_engine: bool = False,
    firmware_version: str = "1.8.0",
) -> tuple[dr.DeviceEntry, MockConfigEntry]:
    """Create a mock ESPHome device with appropriate entities."""
    esphome_entry = MockConfigEntry(
        domain="esphome",
        data={"host": host},
        title=name,
    )
    esphome_entry.add_to_hass(hass)

    device = dev_reg.async_get_or_create(
        config_entry_id=esphome_entry.entry_id,
        connections={(dr.CONNECTION_NETWORK_MAC, mac)},
        name=name,
        manufacturer="EverythingSmartTechnology",
        model="Everything Presence Pro",
        sw_version=firmware_version,
    )
    # Every ESPHome device has a firmware_version entity
    ent_reg.async_get_or_create(
        "sensor",
        "esphome",
        f"{mac}-firmware_version",
        device_id=device.id,
        config_entry=esphome_entry,
    )
    if has_zone_engine:
        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            f"{mac}-zone_engine_version",
            device_id=device.id,
            config_entry=esphome_entry,
        )
    return device, esphome_entry


class TestListFlashableDevices:
    """Tests for DeviceManager.list_flashable_devices."""

    async def test_discovers_original_firmware_device(self, hass: HomeAssistant, mock_store) -> None:
        """Original-firmware EPP devices are returned with firmware_type=original."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        _device, esphome_entry = _create_esphome_device(
            hass,
            dev_reg,
            ent_reg,
            mac="AA:BB:CC:DD:EE:FF",
            name="Presence Pro Kitchen",
            host="192.168.1.42",
            has_zone_engine=False,
            firmware_version="1.8.0",
        )

        manager = DeviceManager(hass, mock_store)
        result = await manager.list_flashable_devices()

        assert len(result) == 1
        dev = result[0]
        assert dev["mac"] == "AA:BB:CC:DD:EE:FF"
        assert dev["name"] == "Presence Pro Kitchen"
        assert dev["host"] == "192.168.1.42"
        assert dev["available"] is False
        assert dev["firmware_type"] == "original"
        assert dev["firmware_version"] == "1.8.0"
        assert dev["esphome_config_entry_id"] == esphome_entry.entry_id

    async def test_discovers_eppgrid_firmware_device(self, hass: HomeAssistant, mock_store) -> None:
        """EPP Grid firmware devices are returned with firmware_type=eppgrid."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        _create_esphome_device(
            hass,
            dev_reg,
            ent_reg,
            mac="11:22:33:44:55:66",
            name="Presence Pro Office",
            host="192.168.1.43",
            has_zone_engine=True,
            firmware_version="1.0.0",
        )

        manager = DeviceManager(hass, mock_store)
        result = await manager.list_flashable_devices()

        assert len(result) == 1
        assert result[0]["firmware_type"] == "eppgrid"

    async def test_ignores_non_epp_esphome_devices(self, hass: HomeAssistant, mock_store) -> None:
        """Non-EPP ESPHome devices are not returned."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        # Create a generic ESPHome device with different manufacturer
        other_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.99"},
            title="Some Other Device",
        )
        other_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=other_entry.entry_id,
            connections={(dr.CONNECTION_NETWORK_MAC, "FF:FF:FF:FF:FF:FF")},
            name="Some Other Device",
            manufacturer="SomeOtherBrand",
            model="Generic Sensor",
        )
        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            "ff:ff:ff:ff:ff:ff-firmware_version",
            device_id=device.id,
            config_entry=other_entry,
        )

        manager = DeviceManager(hass, mock_store)
        result = await manager.list_flashable_devices()

        assert len(result) == 0

    async def test_returns_both_firmware_types(self, hass: HomeAssistant, mock_store) -> None:
        """Both original and eppgrid devices appear together."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        _create_esphome_device(
            hass,
            dev_reg,
            ent_reg,
            mac="AA:BB:CC:DD:EE:FF",
            name="Original",
            host="192.168.1.42",
            has_zone_engine=False,
        )
        _create_esphome_device(
            hass,
            dev_reg,
            ent_reg,
            mac="11:22:33:44:55:66",
            name="EPP Grid",
            host="192.168.1.43",
            has_zone_engine=True,
        )

        manager = DeviceManager(hass, mock_store)
        result = await manager.list_flashable_devices()

        assert len(result) == 2
        types = {d["firmware_type"] for d in result}
        assert types == {"original", "eppgrid"}
