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
    store.configurations = {}
    store.sidebar_panel = True
    return store


def _create_esphome_device(
    hass,
    dev_reg: dr.DeviceRegistry,
    ent_reg: er.EntityRegistry,
    *,
    mac: str,
    name: str,
    host: str,
    has_firmware_version: bool = False,
    firmware_version: str = "1.8.0",
    update_available: bool | None = None,
) -> tuple[dr.DeviceEntry, MockConfigEntry]:
    """Create a mock ESPHome device with appropriate entities.

    Args:
        has_firmware_version: If True, creates our custom firmware_version text sensor
            (the EPP Grid firmware marker). Original firmware devices do not have this.
        update_available: If True/False, creates an ESPHome update entity with
            state "on"/"off". If None, no update entity is created.
    """
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
    if has_firmware_version:
        # EPP Grid firmware devices expose our custom Firmware Version text sensor
        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            f"{mac}-firmware_version",
            device_id=device.id,
            config_entry=esphome_entry,
        )
    if update_available is not None:
        update_entity = ent_reg.async_get_or_create(
            "update",
            "esphome",
            f"{mac}-update",
            device_id=device.id,
            config_entry=esphome_entry,
        )
        hass.states.async_set(
            update_entity.entity_id,
            "on" if update_available else "off",
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
            has_firmware_version=False,
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
            has_firmware_version=True,
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
            has_firmware_version=False,
        )
        _create_esphome_device(
            hass,
            dev_reg,
            ent_reg,
            mac="11:22:33:44:55:66",
            name="EPP Grid",
            host="192.168.1.43",
            has_firmware_version=True,
        )

        manager = DeviceManager(hass, mock_store)
        result = await manager.list_flashable_devices()

        assert len(result) == 2
        types = {d["firmware_type"] for d in result}
        assert types == {"original", "eppgrid"}

    async def test_update_available_true_when_update_entity_on(self, hass: HomeAssistant, mock_store) -> None:
        """Device with ESPHome update entity in state 'on' returns update_available=True."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        _create_esphome_device(
            hass,
            dev_reg,
            ent_reg,
            mac="AA:BB:CC:DD:EE:FF",
            name="Presence Pro Kitchen",
            host="192.168.1.42",
            update_available=True,
        )

        manager = DeviceManager(hass, mock_store)
        result = await manager.list_flashable_devices()

        assert len(result) == 1
        dev = result[0]
        assert "update_available" in dev
        assert dev["update_available"] is True

    async def test_update_available_false_when_update_entity_off(self, hass: HomeAssistant, mock_store) -> None:
        """Device with ESPHome update entity in state 'off' returns update_available=False."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        _create_esphome_device(
            hass,
            dev_reg,
            ent_reg,
            mac="AA:BB:CC:DD:EE:FF",
            name="Presence Pro Kitchen",
            host="192.168.1.42",
            update_available=False,
        )

        manager = DeviceManager(hass, mock_store)
        result = await manager.list_flashable_devices()

        assert len(result) == 1
        dev = result[0]
        assert "update_available" in dev
        assert dev["update_available"] is False

    async def test_update_available_false_when_no_update_entity(self, hass: HomeAssistant, mock_store) -> None:
        """Device without an update entity returns update_available=False."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        _create_esphome_device(
            hass,
            dev_reg,
            ent_reg,
            mac="AA:BB:CC:DD:EE:FF",
            name="Presence Pro Kitchen",
            host="192.168.1.42",
            # No update_available parameter → no update entity created
        )

        manager = DeviceManager(hass, mock_store)
        result = await manager.list_flashable_devices()

        assert len(result) == 1
        dev = result[0]
        assert "update_available" in dev
        assert isinstance(dev["update_available"], bool)
        assert dev["update_available"] is False

    async def test_update_available_skips_disabled_update_entity(self, hass: HomeAssistant, mock_store) -> None:
        """A disabled (state-less) update entity must not short-circuit the search.

        With include_disabled_entities=True, registry entries appear before
        their state is published. Loop must continue past a state-less update
        entity to find a sibling that does have a published state.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        _device, esphome_entry = _create_esphome_device(
            hass,
            dev_reg,
            ent_reg,
            mac="AA:BB:CC:DD:EE:FF",
            name="Presence Pro Kitchen",
            host="192.168.1.42",
        )

        # First update entity: disabled / no state published.
        ent_reg.async_get_or_create(
            "update",
            "esphome",
            "AA:BB:CC:DD:EE:FF-update_disabled",
            device_id=_device.id,
            config_entry=esphome_entry,
            disabled_by=er.RegistryEntryDisabler.USER,
        )

        # Second update entity: enabled with state "on".
        on_entity = ent_reg.async_get_or_create(
            "update",
            "esphome",
            "AA:BB:CC:DD:EE:FF-update",
            device_id=_device.id,
            config_entry=esphome_entry,
        )
        hass.states.async_set(on_entity.entity_id, "on")

        manager = DeviceManager(hass, mock_store)
        result = await manager.list_flashable_devices()

        assert len(result) == 1
        assert result[0]["update_available"] is True

    async def test_availability_with_user_disabled_entity_is_live(self, hass: HomeAssistant, mock_store) -> None:
        """Online device whose only entity is user-disabled is reported available.

        Regression for the availability scan switching to
        `include_disabled_entities=True`. Before the fix the scan filtered out
        disabled entities, so a device with all entities user-disabled looked
        like it had zero entities and was reported as unavailable — even when
        the underlying device was responding fine. This test pins the new
        behaviour: a disabled-but-live entity contributes to availability.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        device, esphome_entry = _create_esphome_device(
            hass,
            dev_reg,
            ent_reg,
            mac="AA:BB:CC:DD:EE:FF",
            name="Presence Pro Disabled",
            host="192.168.1.42",
        )

        # Create one entity with a live state, then mark it user-disabled.
        ent = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            "AA:BB:CC:DD:EE:FF-occupancy",
            device_id=device.id,
            config_entry=esphome_entry,
        )
        hass.states.async_set(ent.entity_id, "on")
        ent_reg.async_update_entity(ent.entity_id, disabled_by=er.RegistryEntryDisabler.USER)

        manager = DeviceManager(hass, mock_store)
        result = await manager.list_flashable_devices()

        assert len(result) == 1
        assert result[0]["available"] is True

    async def test_availability_with_only_unavailable_disabled_entity_is_offline(
        self, hass: HomeAssistant, mock_store
    ) -> None:
        """Inverse case: a user-disabled entity that's also `unavailable`
        should not flip availability to True. Pins that
        `include_disabled_entities=True` doesn't accidentally treat
        disabled+unavailable entities as live."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        device, esphome_entry = _create_esphome_device(
            hass,
            dev_reg,
            ent_reg,
            mac="AA:BB:CC:DD:EE:FF",
            name="Presence Pro Disabled Offline",
            host="192.168.1.42",
        )

        ent = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            "AA:BB:CC:DD:EE:FF-occupancy",
            device_id=device.id,
            config_entry=esphome_entry,
        )
        hass.states.async_set(ent.entity_id, "unavailable")
        ent_reg.async_update_entity(ent.entity_id, disabled_by=er.RegistryEntryDisabler.USER)

        manager = DeviceManager(hass, mock_store)
        result = await manager.list_flashable_devices()

        assert len(result) == 1
        assert result[0]["available"] is False
