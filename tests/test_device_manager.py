"""Tests for DeviceManager: discovery, connections, config push, entity management."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid.const import MAX_ZONES
from custom_components.eppgrid.device_manager import DeviceConnection
from custom_components.eppgrid.device_manager import DeviceManager
from custom_components.eppgrid.device_manager import ManagedDevice
from custom_components.eppgrid.device_manager import _extract_host
from custom_components.eppgrid.device_manager import _extract_mac
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
        assert result[0]["current_connection_count"] is None

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

    async def test_concurrent_open_session_connects_once(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Concurrent open_session calls for same MAC only connect once."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")

        connect_count = 0

        async def slow_connect():
            nonlocal connect_count
            connect_count += 1
            await asyncio.sleep(0.01)  # yield so other tasks interleave

        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_conn_cls:
            mock_conn = mock_conn_cls.return_value
            mock_conn.async_connect = slow_connect
            mock_conn.async_disconnect = AsyncMock()
            mock_conn.connected = True

            results = await asyncio.gather(
                manager.async_open_session("AA:BB:CC:DD:EE:FF"),
                manager.async_open_session("AA:BB:CC:DD:EE:FF"),
                manager.async_open_session("AA:BB:CC:DD:EE:FF"),
            )

            # All three should get the same connection
            assert all(r is mock_conn for r in results)
            # Only one connect attempt
            assert connect_count == 1

    async def test_multiple_state_changes_push_config_once(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Multiple entities becoming available should only push config once."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
        )

        # Create multiple entities on the same device
        entities = []
        for i in range(5):
            entry = ent_reg.async_get_or_create(
                "sensor",
                "esphome",
                unique_id=f"esphome_aabbccddeeff_sensor_{i}",
                config_entry=esphome_entry,
                device_id=device.id,
            )
            entities.append(entry)

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP Device", host="192.168.1.50"
        )

        # Register the state_changed listener
        hass.bus.async_listen("state_changed", manager._on_state_changed)

        with patch.object(manager, "_push_config_to_device", new_callable=AsyncMock) as mock_push:
            # Fire state_changed for all entities in the same tick
            # (unavailable → available)
            for entry in entities:
                hass.states.async_set(entry.entity_id, "unavailable")
            await hass.async_block_till_done()

            for entry in entities:
                hass.states.async_set(entry.entity_id, "online")
            await hass.async_block_till_done()

            mock_push.assert_called_once_with("AA:BB:CC:DD:EE:FF")

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

    async def test_read_current_connection_count_returns_value(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """read_current_connection_count returns the integer sensor value."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Test",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Test",
        )

        entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="esphome_aabbccddeeff_current_connections",
            suggested_object_id="epp_current_connections",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        hass.states.async_set(entry.entity_id, "2")

        result = manager.read_current_connection_count(device.id)
        assert result == 2

    async def test_read_current_connection_count_returns_none_when_device_missing(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """read_current_connection_count returns None when device_id is None."""
        result = manager.read_current_connection_count(None)
        assert result is None

    async def test_read_current_connection_count_returns_none_when_sensor_unavailable(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """read_current_connection_count returns None when the sensor state is unavailable."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Test",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Test",
        )

        entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="esphome_aabbccddeeff_current_connections",
            suggested_object_id="epp_current_connections",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        hass.states.async_set(entry.entity_id, "unavailable")

        result = manager.read_current_connection_count(device.id)
        assert result is None


# ---------------------------------------------------------------------------
# TestProtocolVersion tests
# ---------------------------------------------------------------------------


class TestProtocolVersion:
    """Tests for config protocol version detection."""

    async def test_list_devices_includes_protocol_status_compatible(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """list_devices reads live state and reports compatible when versions match."""
        from custom_components.eppgrid.const import CONFIG_PROTOCOL_VERSION

        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
        )

        proto_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="esphome_aabbccddeeff_config_protocol",
            suggested_object_id="epp_config_protocol",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        hass.states.async_set(proto_entry.entity_id, str(CONFIG_PROTOCOL_VERSION))

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            available=True,
            device_id=device.id,
        )
        result = manager.list_devices()
        assert len(result) == 1
        assert result[0]["config_protocol_status"] == "compatible"

    async def test_list_devices_protocol_status_firmware_behind(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """list_devices reports firmware_behind when no protocol entity exists."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            available=True,
            device_id="fake_device_id",
        )
        result = manager.list_devices()
        assert result[0]["config_protocol_status"] == "firmware_behind"

    async def test_list_devices_protocol_status_firmware_ahead(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """list_devices reports firmware_ahead when device protocol is higher."""
        from custom_components.eppgrid.const import CONFIG_PROTOCOL_VERSION

        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
        )

        proto_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="esphome_aabbccddeeff_config_protocol",
            suggested_object_id="epp_config_protocol",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        hass.states.async_set(proto_entry.entity_id, str(CONFIG_PROTOCOL_VERSION + 1))

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            available=True,
            device_id=device.id,
        )
        result = manager.list_devices()
        assert result[0]["config_protocol_status"] == "firmware_ahead"

    async def test_list_devices_reads_protocol_live(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """list_devices picks up protocol changes without re-discovery."""
        from custom_components.eppgrid.const import CONFIG_PROTOCOL_VERSION

        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
        )

        proto_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="esphome_aabbccddeeff_config_protocol",
            suggested_object_id="epp_config_protocol",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            available=True,
            device_id=device.id,
        )

        # State starts unavailable → unavailable (not firmware_behind)
        hass.states.async_set(proto_entry.entity_id, "unavailable")
        result = manager.list_devices()
        assert result[0]["config_protocol_status"] == "unavailable"

        # State updates to compatible version → compatible (no re-discovery needed)
        hass.states.async_set(proto_entry.entity_id, str(CONFIG_PROTOCOL_VERSION))
        result = manager.list_devices()
        assert result[0]["config_protocol_status"] == "compatible"

    async def test_discover_does_not_cache_config_protocol(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """async_discover no longer caches config_protocol on the device."""
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

        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="esphome_aabbccddeeff_zone_engine_version",
            suggested_object_id="epp_zone_engine_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

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
        # Protocol is read live, so list_devices should report compatible
        result = manager.list_devices()
        assert result[0]["config_protocol_status"] == "compatible"

    async def test_discover_no_protocol_entity_reports_firmware_behind(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """list_devices reports firmware_behind when no config_protocol entity exists."""
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
        result = manager.list_devices()
        assert result[0]["config_protocol_status"] == "firmware_behind"


# ---------------------------------------------------------------------------
# Push config tests
# ---------------------------------------------------------------------------


class TestPushConfig:
    """Tests for DeviceConnection.async_push_config — grid, zones, settings."""

    async def test_push_config_grid(self) -> None:
        """push_config sends base64-encoded grid data with origin."""
        conn = DeviceConnection("192.168.1.100")

        mock_perspective = MagicMock()
        mock_perspective.name = "epp_set_perspective"
        mock_grid = MagicMock()
        mock_grid.name = "epp_set_grid"
        mock_zones = MagicMock()
        mock_zones.name = "epp_set_zones"

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_perspective, mock_grid, mock_zones]))
            mock_client.execute_service = AsyncMock()
            mock_client.disconnect = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "calibration": {
                        "perspective": [1.0] * 8,
                        "room_width": 3000.0,
                        "room_depth": 4000.0,
                    },
                    "room_layout": {
                        "grid_bytes": [0] * 100,
                        "zone_slots": [{"name": "Office"}] + [None] * (MAX_ZONES - 1),
                        "room_type": "normal",
                    },
                }
            )

            # Should have called perspective, grid, and zones
            assert mock_client.execute_service.await_count == 3
            # Check grid call has grid_data (base64)
            grid_call = mock_client.execute_service.call_args_list[1]
            assert "grid_data" in grid_call[0][1]
            assert "origin_x" in grid_call[0][1]

    async def test_push_config_zones(self) -> None:
        """push_config sends zone configuration JSON."""
        conn = DeviceConnection("192.168.1.100")

        mock_zones = MagicMock()
        mock_zones.name = "epp_set_zones"

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_zones]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "room_layout": {
                        "zone_slots": [{"name": "Living"}] + [None] * (MAX_ZONES - 1),
                        "room_type": "hallway",
                        "room_trigger": 3,
                        "room_renew": 2,
                        "room_timeout": 5.0,
                        "room_handoff_timeout": 2.0,
                        "room_entry_point": True,
                    },
                }
            )

            mock_client.execute_service.assert_awaited_once()
            call_data = mock_client.execute_service.call_args[0][1]
            assert "zones_json" in call_data

    async def test_push_config_settings(self) -> None:
        """push_config pushes device settings (env_calibration, motion_timeout, etc.)."""
        conn = DeviceConnection("192.168.1.100")

        mock_env = MagicMock()
        mock_env.name = "epp_set_env_calibration"
        mock_motion = MagicMock()
        mock_motion.name = "epp_set_motion_timeout"

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_env, mock_motion]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "env_calibration": {"temperature_offset": -1.5},
                    "motion_timeout": {"timeout": 30.0},
                }
            )

            assert mock_client.execute_service.await_count == 2

    async def test_push_config_already_connected_noop(self) -> None:
        """async_connect is a no-op when already connected."""
        conn = DeviceConnection("192.168.1.100")

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], []))

            await conn.async_connect()
            assert conn.connected

            # Second connect should be a no-op
            await conn.async_connect()
            mock_client.connect.assert_awaited_once()


# ---------------------------------------------------------------------------
# Event callback tests
# ---------------------------------------------------------------------------


class TestEventCallbacks:
    """Tests for _on_entity_registry_updated, _on_state_changed, _on_device_available."""

    async def test_on_entity_registry_updated_triggers_discover(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """New ESPHome entity creation triggers re-discovery."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP New",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "ff:ee:dd:cc:bb:aa")},
            name="EPP New",
        )

        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="esphome_new_zone_engine_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        with patch.object(manager, "async_discover", new_callable=AsyncMock) as mock_discover:
            event = MagicMock()
            event.data = {"action": "create", "entity_id": entity.entity_id}
            manager._on_entity_registry_updated(event)
            await hass.async_block_till_done()

        mock_discover.assert_awaited_once()

    async def test_on_entity_registry_updated_ignores_non_create(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Non-create actions are ignored."""
        event = MagicMock()
        event.data = {"action": "update", "entity_id": "sensor.test"}

        with patch.object(manager, "async_discover", new_callable=AsyncMock) as mock_discover:
            manager._on_entity_registry_updated(event)
            await hass.async_block_till_done()

        mock_discover.assert_not_awaited()

    async def test_on_entity_registry_updated_ignores_known_device(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Entities belonging to already-discovered devices are skipped."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Known",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Known",
        )

        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="esphome_known_something",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        # Pre-populate the device as already discovered
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP Known", host="192.168.1.50"
        )

        with patch.object(manager, "async_discover", new_callable=AsyncMock) as mock_discover:
            event = MagicMock()
            event.data = {"action": "create", "entity_id": entity.entity_id}
            manager._on_entity_registry_updated(event)
            await hass.async_block_till_done()

        mock_discover.assert_not_awaited()

    async def test_on_entity_registry_updated_ignores_non_esphome(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Non-ESPHome entities are ignored."""
        ent_reg = er.async_get(hass)

        other_entry = MockConfigEntry(domain="other", data={}, title="Other")
        other_entry.add_to_hass(hass)

        entity = ent_reg.async_get_or_create(
            "sensor",
            "other",
            unique_id="other_sensor_1",
            config_entry=other_entry,
        )

        with patch.object(manager, "async_discover", new_callable=AsyncMock) as mock_discover:
            event = MagicMock()
            event.data = {"action": "create", "entity_id": entity.entity_id}
            manager._on_entity_registry_updated(event)
            await hass.async_block_till_done()

        mock_discover.assert_not_awaited()

    async def test_on_state_changed_pushes_config(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Device coming online triggers config push."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
        )

        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="esphome_aabbccddeeff_temperature",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )

        with patch.object(manager, "_push_config_to_device", new_callable=AsyncMock) as mock_push:
            old_state = MagicMock()
            old_state.state = STATE_UNAVAILABLE
            new_state = MagicMock()
            new_state.state = "25.5"

            event = MagicMock()
            event.data = {
                "entity_id": entity.entity_id,
                "old_state": old_state,
                "new_state": new_state,
            }
            manager._on_state_changed(event)
            await hass.async_block_till_done()

        mock_push.assert_awaited_once_with("AA:BB:CC:DD:EE:FF")

    async def test_on_state_changed_ignores_still_unavailable(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """State change from unavailable to unavailable is ignored."""
        with patch.object(manager, "_on_device_available", new_callable=AsyncMock) as mock_avail:
            old_state = MagicMock()
            old_state.state = STATE_UNAVAILABLE
            new_state = MagicMock()
            new_state.state = STATE_UNAVAILABLE

            event = MagicMock()
            event.data = {
                "entity_id": "sensor.test",
                "old_state": old_state,
                "new_state": new_state,
            }
            manager._on_state_changed(event)
            await hass.async_block_till_done()

        mock_avail.assert_not_awaited()

    async def test_on_state_changed_ignores_none_states(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Missing old/new state is ignored."""
        event = MagicMock()
        event.data = {"entity_id": "sensor.test", "old_state": None, "new_state": MagicMock()}

        with patch.object(manager, "_on_device_available", new_callable=AsyncMock) as mock_avail:
            manager._on_state_changed(event)
            await hass.async_block_till_done()

        mock_avail.assert_not_awaited()

    async def test_on_state_changed_ignores_non_esphome(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """State change on non-ESPHome entity is ignored."""
        ent_reg = er.async_get(hass)
        other_entry = MockConfigEntry(domain="other", data={}, title="Other")
        other_entry.add_to_hass(hass)
        entity = ent_reg.async_get_or_create("sensor", "other", unique_id="other_1", config_entry=other_entry)

        with patch.object(manager, "_on_device_available", new_callable=AsyncMock) as mock_avail:
            old_state = MagicMock()
            old_state.state = STATE_UNAVAILABLE
            new_state = MagicMock()
            new_state.state = "20.0"

            event = MagicMock()
            event.data = {"entity_id": entity.entity_id, "old_state": old_state, "new_state": new_state}
            manager._on_state_changed(event)
            await hass.async_block_till_done()

        mock_avail.assert_not_awaited()

    async def test_push_config_to_device_no_config(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device is a no-op when no stored config."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")
        # store has no config for this MAC
        await manager._push_config_to_device("AA:BB:CC:DD:EE:FF")
        # Should not raise

    async def test_push_config_to_device_opens_session(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device opens session and pushes."""
        store.devices["AA:BB:CC:DD:EE:FF"] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")

        mock_conn = MagicMock()
        mock_conn.async_push_config = AsyncMock()

        with patch.object(manager, "async_open_session", new_callable=AsyncMock, return_value=mock_conn):
            await manager._push_config_to_device("AA:BB:CC:DD:EE:FF")

        mock_conn.async_push_config.assert_awaited_once()

    async def test_push_config_to_device_handles_error(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device logs warning on push failure."""
        store.devices["AA:BB:CC:DD:EE:FF"] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")

        mock_conn = MagicMock()
        mock_conn.async_push_config = AsyncMock(side_effect=ConnectionError("timeout"))

        with patch.object(manager, "async_open_session", new_callable=AsyncMock, return_value=mock_conn):
            # Should not raise
            await manager._push_config_to_device("AA:BB:CC:DD:EE:FF")

    async def test_push_config_to_device_no_session(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device is a no-op when session cannot be opened."""
        store.devices["AA:BB:CC:DD:EE:FF"] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")

        with patch.object(manager, "async_open_session", new_callable=AsyncMock, return_value=None):
            await manager._push_config_to_device("AA:BB:CC:DD:EE:FF")

    async def test_on_device_available_retries_after_stale_connection(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_on_device_available closes stale session and retries once on push failure."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        manager._pushing.add(mac)
        push_results = [False, True]  # first push fails, retry succeeds
        with (
            patch.object(
                manager, "_push_config_to_device", new_callable=AsyncMock, side_effect=push_results
            ) as mock_push,
            patch.object(manager, "async_close_session", new_callable=AsyncMock) as mock_close,
            patch("custom_components.eppgrid.device_manager.asyncio.sleep", new_callable=AsyncMock) as mock_sleep,
        ):
            await manager._on_device_available(mac)

        assert mock_push.await_count == 2
        mock_close.assert_awaited_once_with(mac)
        mock_sleep.assert_awaited_once_with(5)
        # Guard stays set on success (not discarded)
        assert mac in manager._pushing

    async def test_on_device_available_clears_guard_after_both_failures(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_on_device_available clears _pushing guard only after both attempts fail."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._pushing.add(mac)

        with (
            patch.object(manager, "_push_config_to_device", new_callable=AsyncMock, return_value=False) as mock_push,
            patch.object(manager, "async_close_session", new_callable=AsyncMock),
            patch("custom_components.eppgrid.device_manager.asyncio.sleep", new_callable=AsyncMock),
        ):
            await manager._on_device_available(mac)

        assert mock_push.await_count == 2
        assert mac not in manager._pushing


# ---------------------------------------------------------------------------
# Stale connection and start/stop tests
# ---------------------------------------------------------------------------


class TestSessionLifecycle:
    """Tests for session edge cases and async_start/async_stop."""

    async def test_open_session_stale_reconnects(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Open session cleans up stale connection and reconnects."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")

        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_conn_cls:
            stale_conn = MagicMock()
            stale_conn.connected = False
            stale_conn.async_disconnect = AsyncMock()

            new_conn = MagicMock()
            new_conn.async_connect = AsyncMock()
            new_conn.connected = True

            # First call returns stale, second returns new
            mock_conn_cls.return_value = new_conn

            # Pre-populate with stale connection
            manager._active_connections["AA:BB:CC:DD:EE:FF"] = stale_conn

            result = await manager.async_open_session("AA:BB:CC:DD:EE:FF")

        stale_conn.async_disconnect.assert_awaited_once()
        new_conn.async_connect.assert_awaited_once()
        assert result is new_conn

    async def test_async_start_registers_listeners(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """async_start discovers devices and registers event listeners."""
        with patch.object(manager, "async_discover", new_callable=AsyncMock):
            await manager.async_start()

        assert len(manager._unsub_listeners) == 2

        # Cleanup
        await manager.async_stop()
        assert len(manager._unsub_listeners) == 0


# ---------------------------------------------------------------------------
# Zone entity management tests
# ---------------------------------------------------------------------------


class TestZoneEntities:
    """Tests for async_update_zone_entities."""

    async def test_update_zone_entities_calibrated(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Calibrated device enables zone 0 as 'Rest of Room Occupancy'."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )

        # Create zone entities and keep references
        zone0_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="esphome_aabbccddeeff_zone_0_occupancy",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone1_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="esphome_aabbccddeeff_zone_1_occupancy",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone2_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="esphome_aabbccddeeff_zone_2_occupancy",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"calibration": {"perspective": [1.0] * 8}}

        zone_slots = [{"name": "Office"}] + [None] * (MAX_ZONES - 1)
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        # Zone 0 should be enabled with name "Rest of Room Occupancy"
        zone0 = ent_reg.async_get(zone0_entry.entity_id)
        assert zone0.disabled_by is None
        assert zone0.name == "Rest of Room Occupancy"

        # Zone 1 should be enabled and renamed "Office"
        zone1 = ent_reg.async_get(zone1_entry.entity_id)
        assert zone1.disabled_by is None
        assert zone1.name == "Office"

        # Zone 2 should be disabled (unused)
        zone2 = ent_reg.async_get(zone2_entry.entity_id)
        assert zone2.disabled_by == er.RegistryEntryDisabler.INTEGRATION

    async def test_update_zone_entities_uncalibrated(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Uncalibrated device disables zone 0."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )

        zone0_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="esphome_aabbccddeeff_zone_0_occupancy",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        # No calibration in store

        zone_slots = [None] * MAX_ZONES
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        zone0 = ent_reg.async_get(zone0_entry.entity_id)
        assert zone0.disabled_by == er.RegistryEntryDisabler.INTEGRATION

    async def test_update_zone_entities_unknown_device(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Unknown device is a no-op."""
        await manager.async_update_zone_entities("00:00:00:00:00:00", [None] * MAX_ZONES)
        # Should not raise


# ---------------------------------------------------------------------------
# Helper function tests
# ---------------------------------------------------------------------------


class TestHelpers:
    """Tests for _extract_mac, _extract_host."""

    async def test_extract_mac_no_mac_connection(self, hass: HomeAssistant) -> None:
        """Returns None when device has no MAC connection."""
        dev_reg = dr.async_get(hass)
        entry = MockConfigEntry(domain="test", data={}, title="Test")
        entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=entry.entry_id,
            identifiers={("test", "123")},
            name="No MAC Device",
        )
        assert _extract_mac(device) is None

    async def test_extract_host_no_config_entry(self, hass: HomeAssistant) -> None:
        """Returns None when config_entry_id is None."""
        dev_reg = dr.async_get(hass)
        entry = MockConfigEntry(domain="test", data={}, title="Test")
        entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=entry.entry_id,
            identifiers={("test", "456")},
        )
        assert _extract_host(device, None, hass) is None

    async def test_extract_host_missing_entry(self, hass: HomeAssistant) -> None:
        """Returns None when config entry doesn't exist."""
        dev_reg = dr.async_get(hass)
        entry = MockConfigEntry(domain="test", data={}, title="Test")
        entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=entry.entry_id,
            identifiers={("test", "789")},
        )
        assert _extract_host(device, "nonexistent_entry_id", hass) is None

    async def test_extract_host_returns_host(self, hass: HomeAssistant) -> None:
        """Returns host from ESPHome config entry."""
        dev_reg = dr.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.99"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            identifiers={("esphome", "abc")},
        )
        assert _extract_host(device, esphome_entry.entry_id, hass) == "192.168.1.99"
