"""Tests for DeviceManager: discovery, connections, config push, entity management."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid.device_manager import DeviceConnection
from custom_components.eppgrid.device_manager import DeviceManager
from custom_components.eppgrid.device_manager import ManagedDevice
from custom_components.eppgrid.storage import EPPGridStore

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def store(hass: HomeAssistant) -> EPPGridStore:
    """Create a store instance."""
    s = EPPGridStore(hass)
    return s


@pytest.fixture
def manager(hass: HomeAssistant, store: EPPGridStore) -> DeviceManager:
    """Create a DeviceManager."""
    return DeviceManager(hass, store)


# ---------------------------------------------------------------------------
# DeviceConnection tests
# ---------------------------------------------------------------------------


class TestDeviceConnection:
    """Tests for DeviceConnection API wrapper."""

    async def test_connect_and_disconnect(self) -> None:
        """Connect opens client, disconnect clears state."""
        conn = DeviceConnection("192.168.1.100")
        assert not conn.connected

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], []))
            mock_client.disconnect = AsyncMock()

            await conn.async_connect()
            assert conn.connected
            mock_client.connect.assert_awaited_once()

            await conn.async_disconnect()
            assert not conn.connected
            mock_client.disconnect.assert_awaited_once()

    async def test_connect_failure_disconnects(self) -> None:
        """Failed connect cleans up the client."""
        conn = DeviceConnection("192.168.1.100")

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock(side_effect=ConnectionError("timeout"))
            mock_client.disconnect = AsyncMock()

            with pytest.raises(ConnectionError):
                await conn.async_connect()

            assert not conn.connected
            mock_client.disconnect.assert_awaited_once()

    async def test_subscribe_states_fans_out(self) -> None:
        """subscribe_states dispatches to all subscribers."""
        conn = DeviceConnection("192.168.1.100")

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], []))
            mock_client.disconnect = AsyncMock()
            mock_client.subscribe_states = MagicMock()

            await conn.async_connect()

            cb1 = MagicMock()
            cb2 = MagicMock()
            conn.subscribe_states(cb1)
            conn.subscribe_states(cb2)

            # Simulate a state dispatch
            conn._dispatch_state("fake_state")
            cb1.assert_called_once_with("fake_state")
            cb2.assert_called_once_with("fake_state")

    async def test_unsubscribe_states(self) -> None:
        """unsubscribe_states removes the callback."""
        conn = DeviceConnection("192.168.1.100")

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], []))
            mock_client.subscribe_states = MagicMock()

            await conn.async_connect()

            cb = MagicMock()
            conn.subscribe_states(cb)
            conn.unsubscribe_states(cb)

            conn._dispatch_state("state")
            cb.assert_not_called()

    async def test_push_config_perspective(self) -> None:
        """push_config sends perspective coefficients to device."""
        conn = DeviceConnection("192.168.1.100")

        mock_service = MagicMock()
        mock_service.name = "epp_set_perspective"

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_service]))
            mock_client.execute_service = AsyncMock()
            mock_client.disconnect = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "calibration": {
                        "perspective": [1.0] * 8,
                        "room_width": 3000.0,
                        "room_depth": 4000.0,
                    }
                }
            )

            mock_client.execute_service.assert_awaited_once()
            call_args = mock_client.execute_service.call_args
            assert call_args[0][0] == mock_service
            assert call_args[0][1]["room_width"] == 3000.0

    async def test_push_config_no_client(self) -> None:
        """push_config is a no-op when not connected."""
        conn = DeviceConnection("192.168.1.100")
        # Should not raise
        await conn.async_push_config({"calibration": {"perspective": [1.0] * 8}})


# ---------------------------------------------------------------------------
# DeviceManager tests
# ---------------------------------------------------------------------------


class TestDeviceManager:
    """Tests for DeviceManager discovery and session management."""

    async def test_discover_finds_zone_engine_device(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Discover finds ESPHome devices with zone_engine_version entity."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        # Create a config entry for the ESPHome device
        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Living Room",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Living Room",
        )

        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="esphome_aabbccddeeff_zone_engine_version",
            suggested_object_id="epp_zone_engine_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        await manager.async_discover()

        assert "AA:BB:CC:DD:EE:FF" in manager.devices
        dev = manager.devices["AA:BB:CC:DD:EE:FF"]
        assert dev.name == "EPP Living Room"
        assert dev.host == "192.168.1.50"

    async def test_discover_ignores_non_zone_engine(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Entities without zone_engine_version are ignored."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.60"},
            title="Random Sensor",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "11:22:33:44:55:66")},
            name="Random Sensor",
        )

        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="esphome_112233445566_temperature",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        await manager.async_discover()
        assert len(manager.devices) == 0

    async def test_list_devices(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """list_devices returns serializable device list."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            available=True,
        )
        result = manager.list_devices()
        assert len(result) == 1
        assert result[0]["mac"] == "AA:BB:CC:DD:EE:FF"
        assert result[0]["name"] == "EPP Device"
        assert result[0]["available"] is True
        assert result[0]["configured"] is False

    async def test_list_devices_with_stored_config(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """list_devices uses stored name when config exists."""
        store.devices["AA:BB:CC:DD:EE:FF"] = {"name": "Custom Name"}
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP Device", host="192.168.1.50"
        )
        result = manager.list_devices()
        assert result[0]["name"] == "Custom Name"
        assert result[0]["configured"] is True

    async def test_open_and_close_session(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Open session creates a connection, close session cleans it up."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")

        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_conn_cls:
            mock_conn = mock_conn_cls.return_value
            mock_conn.async_connect = AsyncMock()
            mock_conn.async_disconnect = AsyncMock()
            mock_conn.connected = True

            conn = await manager.async_open_session("AA:BB:CC:DD:EE:FF")
            assert conn is mock_conn

            # get_session returns the active connection
            assert manager.get_session("AA:BB:CC:DD:EE:FF") is mock_conn

            await manager.async_close_session("AA:BB:CC:DD:EE:FF")
            mock_conn.async_disconnect.assert_awaited_once()

            # After close, get_session returns None
            assert manager.get_session("AA:BB:CC:DD:EE:FF") is None

    async def test_open_session_unknown_device(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Open session returns None for unknown device."""
        conn = await manager.async_open_session("00:00:00:00:00:00")
        assert conn is None

    async def test_open_session_no_host(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Open session returns None when device has no host."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host=None)
        conn = await manager.async_open_session("AA:BB:CC:DD:EE:FF")
        assert conn is None

    async def test_stop_closes_connections(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """async_stop closes all active connections."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")

        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_conn_cls:
            mock_conn = mock_conn_cls.return_value
            mock_conn.async_connect = AsyncMock()
            mock_conn.async_disconnect = AsyncMock()
            mock_conn.connected = True

            await manager.async_open_session("AA:BB:CC:DD:EE:FF")
            await manager.async_stop()

            mock_conn.async_disconnect.assert_awaited()


# ---------------------------------------------------------------------------
# TestProtocolVersion tests
# ---------------------------------------------------------------------------


class TestProtocolVersion:
    """Tests for config protocol version detection."""

    async def test_list_devices_includes_protocol_status_compatible(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """list_devices includes config_protocol_status when versions match."""
        from custom_components.eppgrid.const import CONFIG_PROTOCOL_VERSION

        assert CONFIG_PROTOCOL_VERSION == 1  # Sanity check

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            available=True,
            config_protocol=CONFIG_PROTOCOL_VERSION,
        )
        result = manager.list_devices()
        assert len(result) == 1
        assert result[0]["config_protocol_status"] == "compatible"

    async def test_list_devices_protocol_status_firmware_behind(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """list_devices reports firmware_behind when device protocol is lower."""

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            available=True,
            config_protocol=0,  # Legacy/unknown firmware
        )
        result = manager.list_devices()
        assert result[0]["config_protocol_status"] == "firmware_behind"

    async def test_list_devices_protocol_status_firmware_ahead(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """list_devices reports firmware_ahead when device protocol is higher."""
        from custom_components.eppgrid.const import CONFIG_PROTOCOL_VERSION

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            available=True,
            config_protocol=CONFIG_PROTOCOL_VERSION + 1,
        )
        result = manager.list_devices()
        assert result[0]["config_protocol_status"] == "firmware_ahead"

    async def test_discover_reads_config_protocol_from_state(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """async_discover reads Config Protocol sensor state into config_protocol field."""
        from custom_components.eppgrid.const import CONFIG_PROTOCOL_VERSION

        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Living Room",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Living Room",
        )

        # Create zone_engine_version entity (required for discovery)
        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="esphome_aabbccddeeff_zone_engine_version",
            suggested_object_id="epp_zone_engine_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        # Create config_protocol entity and set its HA state
        proto_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="esphome_aabbccddeeff_config_protocol",
            suggested_object_id="epp_config_protocol",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        hass.states.async_set(proto_entry.entity_id, str(CONFIG_PROTOCOL_VERSION))

        await manager.async_discover()

        assert "AA:BB:CC:DD:EE:FF" in manager.devices
        dev = manager.devices["AA:BB:CC:DD:EE:FF"]
        assert dev.config_protocol == CONFIG_PROTOCOL_VERSION

    async def test_discover_defaults_config_protocol_to_zero_when_missing(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """async_discover defaults config_protocol to 0 when no sensor entity exists."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Living Room",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Living Room",
        )

        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="esphome_aabbccddeeff_zone_engine_version",
            suggested_object_id="epp_zone_engine_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        # No config_protocol entity created

        await manager.async_discover()

        assert "AA:BB:CC:DD:EE:FF" in manager.devices
        dev = manager.devices["AA:BB:CC:DD:EE:FF"]
        assert dev.config_protocol == 0
