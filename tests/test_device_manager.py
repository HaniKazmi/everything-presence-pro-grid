"""Tests for DeviceManager: discovery, connections, config push, entity management."""

from __future__ import annotations

import asyncio
import json
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
from custom_components.eppgrid.device_manager import _compare_firmware_version
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

    async def test_push_config_settings_translation(self) -> None:
        """Settings values are correctly translated to firmware service calls."""
        conn = DeviceConnection("192.168.1.100")

        # Create mock services for all settings-related firmware calls
        svc_env = MagicMock()
        svc_env.name = "epp_set_env_calibration"
        svc_motion = MagicMock()
        svc_motion.name = "epp_set_motion_timeout"
        svc_tracking = MagicMock()
        svc_tracking.name = "epp_set_tracking"
        svc_static = MagicMock()
        svc_static.name = "epp_set_static_presence"

        services = [svc_env, svc_motion, svc_tracking, svc_static]

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], services))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "settings": {
                        "temperature_offset": 1.5,
                        "humidity_offset": -2.0,
                        "illuminance_offset": 10.0,
                        "motion_timeout": 8.0,
                        "target_max_distance": 4.5,
                        "static_min_distance": 0.5,
                        "static_max_distance": 12.0,
                        "static_trigger_threshold": 4,
                        "static_renew_threshold": 2,
                        "static_timeout": 45.0,
                        "static_on_delay": 1.5,
                    }
                }
            )

            calls = mock_client.execute_service.await_args_list
            payloads = {c.args[0].name: c.args[1] for c in calls}

            # env_calibration: values passed through unchanged
            assert payloads["epp_set_env_calibration"] == {
                "temperature_offset": 1.5,
                "humidity_offset": -2.0,
                "illuminance_offset": 10.0,
            }

            # motion_timeout: value passed through
            assert payloads["epp_set_motion_timeout"] == {"timeout": 8.0}

            # tracking: meters converted to millimeters
            assert payloads["epp_set_tracking"] == {"max_range": 4500.0}

            # static_presence: thresholds inverted (10 - value),
            # trigger_range set to max_distance, led_enabled hardcoded True
            assert payloads["epp_set_static_presence"] == {
                "min_range": 0.5,
                "max_range": 12.0,
                "trigger_range": 12.0,
                "trigger_sensitivity": 6,  # 10 - 4
                "sustain_sensitivity": 8,  # 10 - 2
                "timeout": 45.0,
                "on_delay": 1.5,
                "led_enabled": True,
            }

    async def test_push_config_settings_defaults(self) -> None:
        """Missing settings keys fall back to correct defaults."""
        conn = DeviceConnection("192.168.1.100")

        svc_env = MagicMock()
        svc_env.name = "epp_set_env_calibration"
        svc_motion = MagicMock()
        svc_motion.name = "epp_set_motion_timeout"
        svc_tracking = MagicMock()
        svc_tracking.name = "epp_set_tracking"
        svc_static = MagicMock()
        svc_static.name = "epp_set_static_presence"

        services = [svc_env, svc_motion, svc_tracking, svc_static]

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], services))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            # Only provide one key — rest should use defaults
            await conn.async_push_config({"settings": {"temperature_offset": 2.0}})

            calls = mock_client.execute_service.await_args_list
            payloads = {c.args[0].name: c.args[1] for c in calls}

            assert payloads["epp_set_env_calibration"] == {
                "temperature_offset": 2.0,
                "humidity_offset": 0.0,
                "illuminance_offset": 0.0,
            }
            assert payloads["epp_set_motion_timeout"] == {"timeout": 5.0}
            assert payloads["epp_set_tracking"] == {"max_range": 6000.0}
            assert payloads["epp_set_static_presence"] == {
                "min_range": 0.3,
                "max_range": 16.0,
                "trigger_range": 16.0,
                "trigger_sensitivity": 7,  # 10 - 3
                "sustain_sensitivity": 7,  # 10 - 3
                "timeout": 30.0,
                "on_delay": 0.0,
                "led_enabled": True,
            }


# ---------------------------------------------------------------------------
# DeviceManager tests
# ---------------------------------------------------------------------------


class TestDeviceManager:
    """Tests for DeviceManager discovery and session management."""

    async def test_discover_finds_firmware_version_device(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Discover finds ESPHome devices with firmware_version entity."""
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
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )

        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            suggested_object_id="epp_firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        await manager.async_discover()

        assert "AA:BB:CC:DD:EE:FF" in manager.devices
        dev = manager.devices["AA:BB:CC:DD:EE:FF"]
        assert dev.name == "EPP Living Room"
        assert dev.host == "192.168.1.50"

    async def test_discover_syncs_zone_entities_with_empty_layout_when_no_config(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Discovery syncs zone entities with an empty layout when no stored config.

        Covers the re-add case: stale zone entities from a previous installation
        must be reset, so we always call async_update_zone_entities. With no
        stored config, the empty fallback layout disables all zones and clears
        custom names.
        """
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
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP New",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )

        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            suggested_object_id="epp_firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        with patch.object(manager, "async_update_zone_entities", new_callable=AsyncMock) as mock_update:
            await manager.async_discover()

        mock_update.assert_awaited_once()
        mac_arg, zone_slots_arg = mock_update.await_args.args
        assert mac_arg == "AA:BB:CC:DD:EE:FF"
        # Empty fallback: zone 0 is a dict, all named slots are None.
        assert isinstance(zone_slots_arg[0], dict)
        assert all(slot is None for slot in zone_slots_arg[1:])

    async def test_discover_ignores_non_firmware_version(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Entities without firmware_version are ignored."""
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
            unique_id="11:22:33:44:55:66-sensor-temperature",
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

    async def test_list_devices_uses_fresh_name_from_registry(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """list_devices reads the live device-registry name, not the cached one."""
        dev_reg = dr.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="Old Name",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )
        # ManagedDevice was discovered with the old name
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="Old Name",
            host="192.168.1.50",
            device_id=device.id,
        )

        # Simulate a rename via ESPHome / HA UI
        dev_reg.async_update_device(device.id, name_by_user="Renamed Device")

        result = manager.list_devices()
        assert result[0]["name"] == "Renamed Device"

    async def test_list_devices_includes_area_name(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """list_devices includes the device's area name when assigned."""
        from homeassistant.helpers import area_registry as ar

        area_reg = ar.async_get(hass)
        area = area_reg.async_create("Living Room")

        dev_reg = dr.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )
        dev_reg.async_update_device(device.id, area_id=area.id)

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            device_id=device.id,
        )

        result = manager.list_devices()
        assert result[0]["area"] == "Living Room"

    async def test_list_devices_area_is_none_when_unassigned(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """list_devices returns area=None when the device has no area assigned."""
        dev_reg = dr.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            device_id=device.id,
        )

        result = manager.list_devices()
        assert result[0]["area"] is None

    async def test_list_devices_area_is_none_when_no_device_in_registry(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """list_devices returns area=None when no device registry entry exists."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            device_id=None,
        )
        result = manager.list_devices()
        assert result[0]["area"] is None
        assert result[0]["name"] == "EPP Device"

    async def test_list_devices_reports_live_availability_not_stale_flag(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Even if ManagedDevice.available hasn't been flipped yet, list_devices
        should return True when the underlying ESPHome entities are online."""
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
            connections={("mac", "aa:bb:cc:dd:ee:01")},
            name="New Device",
        )

        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:01-sensor-online_entity",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        # Register the device in manager
        manager.devices["AA:BB:CC:DD:EE:01"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:01",
            name="New Device",
            host="192.168.1.50",
            device_id=device.id,
        )

        # Set entity to an online state (not unavailable, not unknown)
        hass.states.async_set(entity.entity_id, "25.5")

        # Force the cached flag to False to simulate stale state
        manager.devices["AA:BB:CC:DD:EE:01"].available = False

        # list_devices should return live availability via _is_device_available
        result = manager.list_devices()
        device_entry = next(d for d in result if d["mac"] == "AA:BB:CC:DD:EE:01")
        assert device_entry["available"] is True

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
                unique_id=f"AA:BB:CC:DD:EE:FF-sensor-sensor_{i}",
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
            unique_id="AA:BB:CC:DD:EE:FF-sensor-current_connections",
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
            unique_id="AA:BB:CC:DD:EE:FF-sensor-current_connections",
            suggested_object_id="epp_current_connections",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        hass.states.async_set(entry.entity_id, "unavailable")

        result = manager.read_current_connection_count(device.id)
        assert result is None


# ---------------------------------------------------------------------------
# TestFirmwareVersion tests
# ---------------------------------------------------------------------------


class TestFirmwareVersion:
    """Tests for firmware version detection and comparison."""

    # --- _compare_firmware_version helper ---

    def test_compare_firmware_version_compatible(self) -> None:
        """Returns 'compatible' when device version matches required version."""
        from custom_components.eppgrid.const import FIRMWARE_VERSION

        assert _compare_firmware_version(FIRMWARE_VERSION) == "compatible"

    def test_compare_firmware_version_behind(self) -> None:
        """Returns 'firmware_behind' when device version is older."""
        assert _compare_firmware_version("0.1.0") == "firmware_behind"

    def test_compare_firmware_version_ahead(self) -> None:
        """Returns 'firmware_ahead' when device version is newer."""
        assert _compare_firmware_version("99.0.0") == "firmware_ahead"

    def test_compare_firmware_version_invalid(self) -> None:
        """Returns 'firmware_behind' for unparseable version strings."""
        assert _compare_firmware_version("not-a-version") == "firmware_behind"

    def test_compare_firmware_version_zero(self) -> None:
        """Returns 'firmware_behind' for '0.0.0' (missing entity sentinel)."""
        assert _compare_firmware_version("0.0.0") == "firmware_behind"

    # --- read_firmware_version ---

    async def test_read_firmware_version_returns_version_string(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """read_firmware_version returns version string from text sensor state."""
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

        fw_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            suggested_object_id="epp_firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        hass.states.async_set(fw_entry.entity_id, "0.90.0-alpha")

        result = manager.read_firmware_version(device.id)
        assert result == "0.90.0-alpha"

    async def test_read_firmware_version_returns_none_when_unavailable(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """read_firmware_version returns None when state is unavailable."""
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

        fw_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            suggested_object_id="epp_firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        hass.states.async_set(fw_entry.entity_id, "unavailable")

        result = manager.read_firmware_version(device.id)
        assert result is None

    async def test_read_firmware_version_returns_zero_when_device_id_none(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """read_firmware_version returns '0.0.0' when device_id is None."""
        result = manager.read_firmware_version(None)
        assert result == "0.0.0"

    async def test_read_firmware_version_returns_zero_when_no_entity(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """read_firmware_version returns '0.0.0' when no firmware_version entity exists."""
        dev_reg = dr.async_get(hass)

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
        # No firmware_version entity created

        result = manager.read_firmware_version(device.id)
        assert result == "0.0.0"

    # --- list_devices firmware_status ---

    async def test_list_devices_includes_firmware_status_compatible(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """list_devices reads live firmware version and reports compatible when versions match."""
        from custom_components.eppgrid.const import FIRMWARE_VERSION

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

        fw_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            suggested_object_id="epp_firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        hass.states.async_set(fw_entry.entity_id, FIRMWARE_VERSION)

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            available=True,
            device_id=device.id,
        )
        result = manager.list_devices()
        assert len(result) == 1
        assert result[0]["firmware_status"] == "compatible"

    async def test_list_devices_firmware_status_firmware_behind(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """list_devices reports firmware_behind when no firmware_version entity exists."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            available=True,
            device_id="fake_device_id",
        )
        result = manager.list_devices()
        assert result[0]["firmware_status"] == "firmware_behind"

    async def test_list_devices_firmware_status_firmware_ahead(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """list_devices reports firmware_ahead when device firmware is newer."""
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

        fw_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            suggested_object_id="epp_firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        hass.states.async_set(fw_entry.entity_id, "99.0.0")

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            available=True,
            device_id=device.id,
        )
        result = manager.list_devices()
        assert result[0]["firmware_status"] == "firmware_ahead"

    async def test_list_devices_reads_firmware_version_live(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """list_devices picks up firmware version changes without re-discovery."""
        from custom_components.eppgrid.const import FIRMWARE_VERSION

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

        fw_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            suggested_object_id="epp_firmware_version",
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

        # State starts unavailable → None → unavailable
        hass.states.async_set(fw_entry.entity_id, "unavailable")
        result = manager.list_devices()
        assert result[0]["firmware_status"] == "unavailable"

        # State updates to compatible version → compatible
        hass.states.async_set(fw_entry.entity_id, FIRMWARE_VERSION)
        result = manager.list_devices()
        assert result[0]["firmware_status"] == "compatible"

    async def test_discover_does_not_cache_firmware_version(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """async_discover detects firmware_version entities and list_devices reports compatible."""
        from custom_components.eppgrid.const import FIRMWARE_VERSION

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
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )

        fw_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            suggested_object_id="epp_firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        hass.states.async_set(fw_entry.entity_id, FIRMWARE_VERSION)

        await manager.async_discover()

        assert "AA:BB:CC:DD:EE:FF" in manager.devices
        # Firmware version is read live, so list_devices should report compatible
        result = manager.list_devices()
        assert result[0]["firmware_status"] == "compatible"

    async def test_discover_no_firmware_version_entity_reports_unavailable(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """list_devices reports unavailable when firmware_version entity has no state."""
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
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )

        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            suggested_object_id="epp_firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        # No firmware state entity with a version value

        await manager.async_discover()

        assert "AA:BB:CC:DD:EE:FF" in manager.devices
        result = manager.list_devices()
        assert result[0]["firmware_status"] == "unavailable"


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
                        "zone_slots": [
                            {"type": "normal", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
                            {"name": "Office"},
                        ]
                        + [None] * (MAX_ZONES - 1),
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
                        "zone_slots": [
                            {"type": "hallway", "trigger": 3, "renew": 2, "timeout": 5.0, "handoff_timeout": 2.0},
                            {"name": "Living"},
                        ]
                        + [None] * (MAX_ZONES - 1),
                    },
                }
            )

            mock_client.execute_service.assert_awaited_once()
            call_data = mock_client.execute_service.call_args[0][1]
            assert "zones_json" in call_data

    async def test_push_config_skips_zones_on_malformed_length(self, caplog: pytest.LogCaptureFixture) -> None:
        """Malformed zone_slots (wrong length) skips zone push, logs a warning, other pushes still run."""
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

            await conn.async_connect()
            import logging

            with caplog.at_level(logging.WARNING, logger="custom_components.eppgrid.device_manager"):
                await conn.async_push_config(
                    {
                        "calibration": {
                            "perspective": [1.0] * 8,
                            "room_width": 3000.0,
                            "room_depth": 4000.0,
                        },
                        "room_layout": {
                            "grid_bytes": [0] * 100,
                            # Length-7: malformed, missing zone 0 slot.
                            "zone_slots": [{"name": "X", "color": "#000", "type": "normal"}] + [None] * 6,
                        },
                    }
                )

            # Warning logged about the malformed slots.
            assert any("zone_slots" in rec.getMessage().lower() for rec in caplog.records)
            # Perspective + grid pushed, but NOT zones.
            call_services = [c[0][0] for c in mock_client.execute_service.await_args_list]
            assert mock_perspective in call_services
            assert mock_grid in call_services
            assert mock_zones not in call_services

    async def test_push_config_skips_zones_on_non_dict_slot_0(self, caplog: pytest.LogCaptureFixture) -> None:
        """Malformed zone_slots (slot 0 not a dict) skips zone push; grid push still runs."""
        conn = DeviceConnection("192.168.1.100")

        mock_grid = MagicMock()
        mock_grid.name = "epp_set_grid"
        mock_zones = MagicMock()
        mock_zones.name = "epp_set_zones"

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_grid, mock_zones]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            import logging

            with caplog.at_level(logging.WARNING, logger="custom_components.eppgrid.device_manager"):
                await conn.async_push_config(
                    {
                        "calibration": {"room_width": 3000.0},
                        "room_layout": {
                            "grid_bytes": [0] * 100,
                            "zone_slots": [None] * 8,  # slot 0 null = malformed
                        },
                    }
                )

            assert any("zone_slots" in rec.getMessage().lower() for rec in caplog.records)
            call_services = [c[0][0] for c in mock_client.execute_service.await_args_list]
            assert mock_grid in call_services
            assert mock_zones not in call_services

    async def test_push_config_expands_non_custom_zone_timing(self) -> None:
        """Non-custom zones get timing filled in from ZONE_TYPE_DEFAULTS before push."""
        conn = DeviceConnection("192.168.1.100")

        mock_zones = MagicMock()
        mock_zones.name = "epp_set_zones"

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_zones]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            # Slot 0 = rest, slot 1 = thoroughfare — both non-custom, stored
            # without timing. Expansion should fill each with its type defaults.
            await conn.async_push_config(
                {
                    "room_layout": {
                        "zone_slots": [
                            {"type": "rest"},
                            {"name": "Hall", "color": "#abc", "type": "thoroughfare"},
                        ]
                        + [None] * (MAX_ZONES - 1),
                    },
                }
            )

            mock_client.execute_service.assert_awaited_once()
            call_data = mock_client.execute_service.call_args[0][1]
            pushed = json.loads(call_data["zones_json"])
            slots = pushed["zone_slots"]
            # Zone 0 (rest) defaults: trigger=7, renew=1, timeout=30, handoff=10.
            assert slots[0] == {
                "type": "rest",
                "trigger": 7,
                "renew": 1,
                "timeout": 30.0,
                "handoff_timeout": 10.0,
            }
            # Zone 1 (thoroughfare): trigger=3, renew=2, timeout=3, handoff=1.
            # name/color must be preserved.
            assert slots[1] == {
                "name": "Hall",
                "color": "#abc",
                "type": "thoroughfare",
                "trigger": 3,
                "renew": 2,
                "timeout": 3.0,
                "handoff_timeout": 1.0,
            }

    async def test_push_config_passes_through_custom_timing(self) -> None:
        """Custom zones honour user-supplied timing — no expansion, no mutation."""
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
                        "zone_slots": [
                            {
                                "type": "custom",
                                "trigger": 6,
                                "renew": 4,
                                "timeout": 20.0,
                                "handoff_timeout": 5.0,
                            },
                            {
                                "name": "Lab",
                                "color": "#def",
                                "type": "custom",
                                "trigger": 8,
                                "renew": 4,
                                "timeout": 45.0,
                                "handoff_timeout": 12.0,
                            },
                        ]
                        + [None] * (MAX_ZONES - 1),
                    },
                }
            )

            call_data = mock_client.execute_service.call_args[0][1]
            pushed = json.loads(call_data["zones_json"])
            slots = pushed["zone_slots"]
            assert slots[0] == {
                "type": "custom",
                "trigger": 6,
                "renew": 4,
                "timeout": 20.0,
                "handoff_timeout": 5.0,
            }
            assert slots[1] == {
                "name": "Lab",
                "color": "#def",
                "type": "custom",
                "trigger": 8,
                "renew": 4,
                "timeout": 45.0,
                "handoff_timeout": 12.0,
            }

    async def test_push_config_expansion_preserves_name_and_color(self) -> None:
        """Expanded non-custom named zone keeps its name and color fields."""
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
                        "zone_slots": [
                            {"type": "normal"},
                            {"name": "Office", "color": "#CFDB70", "type": "normal"},
                        ]
                        + [None] * (MAX_ZONES - 1),
                    },
                }
            )

            call_data = mock_client.execute_service.call_args[0][1]
            pushed = json.loads(call_data["zones_json"])
            slot = pushed["zone_slots"][1]
            assert slot["name"] == "Office"
            assert slot["color"] == "#CFDB70"
            assert slot["type"] == "normal"
            assert slot["trigger"] == 5
            assert slot["renew"] == 3
            assert slot["timeout"] == 10.0
            assert slot["handoff_timeout"] == 3.0

    async def test_push_config_expansion_does_not_mutate_source(self) -> None:
        """Expansion copies per slot — the original zone_slots dict is untouched."""
        conn = DeviceConnection("192.168.1.100")

        mock_zones = MagicMock()
        mock_zones.name = "epp_set_zones"

        source_slot = {"type": "normal"}
        named_slot = {"name": "Office", "color": "#CFDB70", "type": "normal"}

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_zones]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "room_layout": {
                        "zone_slots": [source_slot, named_slot] + [None] * (MAX_ZONES - 1),
                    },
                }
            )

            # Originals must be untouched (no timing fields leaked in).
            assert source_slot == {"type": "normal"}
            assert named_slot == {"name": "Office", "color": "#CFDB70", "type": "normal"}

    async def test_push_config_overwrites_stale_timing_on_non_custom(self) -> None:
        """Non-custom zones: stale stored timing is overwritten by type defaults.

        ZONE_TYPE_DEFAULTS is the single source of truth for non-custom types,
        so bumping the defaults in code rolls through to every device. If the
        store somehow holds leftover timing values for a non-custom zone (e.g.
        from before the serializer stripped them), they must not survive the
        expansion — the type defaults are authoritative.
        """
        conn = DeviceConnection("192.168.1.100")

        mock_zones = MagicMock()
        mock_zones.name = "epp_set_zones"

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_zones]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            # Stale timing on a "rest" zone — defaults say 7/1/30/10, but the
            # stored slot has 99/99/99/99. After expansion, defaults must win.
            await conn.async_push_config(
                {
                    "room_layout": {
                        "zone_slots": [
                            {
                                "type": "rest",
                                "trigger": 99,
                                "renew": 99,
                                "timeout": 99.0,
                                "handoff_timeout": 99.0,
                            },
                        ]
                        + [None] * MAX_ZONES,
                    },
                }
            )

            call_data = mock_client.execute_service.call_args[0][1]
            pushed = json.loads(call_data["zones_json"])
            slot = pushed["zone_slots"][0]
            assert slot["trigger"] == 7
            assert slot["renew"] == 1
            assert slot["timeout"] == 30.0
            assert slot["handoff_timeout"] == 10.0

    async def test_push_config_settings(self) -> None:
        """push_config reads unified settings key and pushes to 4 firmware actions."""
        conn = DeviceConnection("192.168.1.100")

        mock_env = MagicMock()
        mock_env.name = "epp_set_env_calibration"
        mock_motion = MagicMock()
        mock_motion.name = "epp_set_motion_timeout"
        mock_tracking = MagicMock()
        mock_tracking.name = "epp_set_tracking"
        mock_static = MagicMock()
        mock_static.name = "epp_set_static_presence"

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(
                return_value=([], [mock_env, mock_motion, mock_tracking, mock_static])
            )
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "settings": {
                        "temperature_offset": -1.5,
                        "humidity_offset": 2.0,
                        "illuminance_offset": -10.0,
                        "motion_timeout": 5.0,
                        "target_max_distance": 4.0,
                        "static_min_distance": 0.3,
                        "static_max_distance": 8.0,
                        "static_trigger_threshold": 3,
                        "static_renew_threshold": 3,
                        "static_timeout": 30.0,
                        "static_on_delay": 0.0,
                    },
                }
            )

            # All 4 firmware actions should be called
            assert mock_client.execute_service.await_count == 4

            calls = mock_client.execute_service.call_args_list

            # Find calls by service mock object
            call_by_service = {call[0][0].name: call[0][1] for call in calls}

            # env calibration: values passed through
            env_data = call_by_service["epp_set_env_calibration"]
            assert env_data["temperature_offset"] == -1.5
            assert env_data["humidity_offset"] == 2.0
            assert env_data["illuminance_offset"] == -10.0

            # motion timeout
            motion_data = call_by_service["epp_set_motion_timeout"]
            assert motion_data["timeout"] == 5.0

            # tracking
            tracking_data = call_by_service["epp_set_tracking"]
            assert tracking_data["max_range"] == 4000.0  # meters → mm

            # static presence: firmware inversion
            static_data = call_by_service["epp_set_static_presence"]
            assert static_data["min_range"] == 0.3
            assert static_data["max_range"] == 8.0
            assert static_data["trigger_range"] == 8.0  # same as max_range
            assert static_data["trigger_sensitivity"] == 7  # 10 - 3
            assert static_data["sustain_sensitivity"] == 7  # 10 - 3
            assert static_data["timeout"] == 30.0
            assert static_data["on_delay"] == 0.0
            assert static_data["led_enabled"] is True

    async def test_push_config_log_levels(self) -> None:
        """push_config sends each log level category/level pair via epp_set_log_level."""
        conn = DeviceConnection("192.168.1.100")

        mock_log_level = MagicMock()
        mock_log_level.name = "epp_set_log_level"

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_log_level]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "log_levels": {"system": "Debug", "networking": "Info"},
                }
            )

            assert mock_client.execute_service.await_count == 2
            calls = mock_client.execute_service.call_args_list
            call_data = [call[0][1] for call in calls]
            assert {"category": "system", "level": "Debug"} in call_data
            assert {"category": "networking", "level": "Info"} in call_data

    async def test_push_config_log_levels_no_service(self) -> None:
        """push_config skips log levels when epp_set_log_level service is not available."""
        conn = DeviceConnection("192.168.1.100")

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], []))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "log_levels": {"epp": "Debug"},
                }
            )

            # No service available, so no calls
            mock_client.execute_service.assert_not_awaited()

    async def test_push_config_no_log_levels(self) -> None:
        """push_config does nothing for log levels when config has no log_levels key."""
        conn = DeviceConnection("192.168.1.100")

        mock_log_level = MagicMock()
        mock_log_level.name = "epp_set_log_level"

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_log_level]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config({"settings": {}})

            # No log levels in config, no calls
            mock_client.execute_service.assert_not_awaited()

    async def test_push_config_led_settings(self) -> None:
        """push_config sends LED mode, brightness, and presence color via epp_set_led."""
        conn = DeviceConnection("192.168.1.100")

        mock_env = MagicMock()
        mock_env.name = "epp_set_env_calibration"
        mock_motion = MagicMock()
        mock_motion.name = "epp_set_motion_timeout"
        mock_tracking = MagicMock()
        mock_tracking.name = "epp_set_tracking"
        mock_static = MagicMock()
        mock_static.name = "epp_set_static_presence"
        mock_led = MagicMock()
        mock_led.name = "epp_set_led"

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(
                return_value=([], [mock_env, mock_motion, mock_tracking, mock_static, mock_led])
            )
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "settings": {
                        "temperature_offset": 0.0,
                        "humidity_offset": 0.0,
                        "illuminance_offset": 0.0,
                        "motion_timeout": 5.0,
                        "target_max_distance": 6.0,
                        "static_min_distance": 0.3,
                        "static_max_distance": 16.0,
                        "static_trigger_threshold": 3,
                        "static_renew_threshold": 3,
                        "static_timeout": 30.0,
                        "static_on_delay": 0.0,
                        "led_mode": "Presence",
                        "led_brightness": 0.8,
                        "led_presence_color": "#66CC00",
                    },
                }
            )

            calls = mock_client.execute_service.call_args_list
            call_by_service = {call[0][0].name: call[0][1] for call in calls}

            # epp_set_led should be called with parsed color
            assert "epp_set_led" in call_by_service
            led_data = call_by_service["epp_set_led"]
            assert led_data["mode"] == "Presence"
            assert led_data["brightness"] == 0.8
            assert abs(led_data["presence_red"] - 0.4) < 0.01  # 0x66/0xFF ≈ 0.4
            assert abs(led_data["presence_green"] - 0.8) < 0.01  # 0xCC/0xFF ≈ 0.8
            assert abs(led_data["presence_blue"] - 0.0) < 0.01  # 0x00/0xFF = 0.0

            # led_enabled always hardcoded True
            static_data = call_by_service["epp_set_static_presence"]
            assert static_data["led_enabled"] is True

    async def test_push_config_led_defaults_when_absent(self) -> None:
        """push_config uses LED defaults when settings lack LED keys."""
        conn = DeviceConnection("192.168.1.100")

        mock_static = MagicMock()
        mock_static.name = "epp_set_static_presence"
        mock_led = MagicMock()
        mock_led.name = "epp_set_led"

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_static, mock_led]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config({"settings": {}})

            calls = mock_client.execute_service.call_args_list
            call_by_service = {call[0][0].name: call[0][1] for call in calls}

            led_data = call_by_service["epp_set_led"]
            assert led_data["mode"] == "Manual Control"
            assert led_data["brightness"] == 1.0
            # Default color #CC33FF → red≈0.8, green≈0.2, blue=1.0
            assert abs(led_data["presence_red"] - 0.8) < 0.01
            assert abs(led_data["presence_green"] - 0.2) < 0.01
            assert abs(led_data["presence_blue"] - 1.0) < 0.01

            static_data = call_by_service["epp_set_static_presence"]
            assert static_data["led_enabled"] is True

    async def test_push_config_relay_settings(self) -> None:
        """push_config sends relay trigger_mode and contact_mode via epp_set_relay."""
        conn = DeviceConnection("192.168.1.100")

        mock_relay = MagicMock()
        mock_relay.name = "epp_set_relay"

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_relay]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "settings": {
                        "relay_trigger_mode": "presence",
                        "relay_contact_mode": "nc",
                    }
                }
            )

            mock_client.execute_service.assert_any_await(
                mock_relay,
                {"trigger_mode": "presence", "contact_mode": "nc"},
            )

    async def test_push_config_relay_settings_defaults(self) -> None:
        """push_config uses defaults when relay keys absent."""
        conn = DeviceConnection("192.168.1.100")

        mock_relay = MagicMock()
        mock_relay.name = "epp_set_relay"

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_relay]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config({"settings": {}})

            mock_client.execute_service.assert_any_await(
                mock_relay,
                {"trigger_mode": "disabled", "contact_mode": "no"},
            )

    async def test_push_config_relay_no_service(self) -> None:
        """push_config skips relay when service not registered."""
        conn = DeviceConnection("192.168.1.100")

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], []))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "settings": {
                        "relay_trigger_mode": "motion",
                        "relay_contact_mode": "no",
                    }
                }
            )

            mock_client.execute_service.assert_not_awaited()

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
            unique_id="AA:BB:CC:DD:EE:04-sensor-firmware_version",
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
            unique_id="AA:BB:CC:DD:EE:05-sensor-something",
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
            unique_id="AA:BB:CC:DD:EE:FF-sensor-temperature",
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

    async def test_on_state_changed_treats_unknown_like_unavailable(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Unknown → value transition should fire availability, matching unavailable → value.

        Newly-added ESPHome entities can start in 'unknown' state and move directly
        to a value without passing through 'unavailable'. The availability transition
        must still be detected so the frontend sees the device come online.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.51"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:02")},
            name="EPP Device 2",
        )

        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:02-sensor-temperature",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:02"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:02", name="EPP", host="192.168.1.51", device_id=device.id
        )

        with patch.object(manager, "_push_config_to_device", new_callable=AsyncMock) as mock_push:
            old_state = MagicMock()
            old_state.state = "unknown"
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

        mock_push.assert_awaited_once_with("AA:BB:CC:DD:EE:02")

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

    async def test_on_state_changed_value_to_unknown_marks_offline(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """value → unknown is treated as going offline.

        ESPHome sensors transitioning to 'unknown' means the device has
        stopped publishing readings. Subscribers should see the availability
        flip so the UI reflects the true state.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.52"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:03")},
            name="EPP Device 3",
        )

        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:03-sensor-temperature",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:03"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:03", name="EPP", host="192.168.1.52", device_id=device.id
        )
        manager._pushing.add("AA:BB:CC:DD:EE:03")

        fire_calls: list[None] = []
        manager.on_device_list_changed(lambda: fire_calls.append(None))

        old_state = MagicMock()
        old_state.state = "25.5"
        new_state = MagicMock()
        new_state.state = "unknown"

        event = MagicMock()
        event.data = {
            "entity_id": entity.entity_id,
            "old_state": old_state,
            "new_state": new_state,
        }
        manager._on_state_changed(event)
        await hass.async_block_till_done()

        assert "AA:BB:CC:DD:EE:03" not in manager._pushing
        assert len(fire_calls) == 1

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

    async def test_on_state_changed_device_goes_unavailable(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Device going unavailable clears pushing set and fires device list changed."""
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
            unique_id="AA:BB:CC:DD:EE:FF-sensor-unavail",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._pushing.add("AA:BB:CC:DD:EE:FF")

        with patch.object(manager, "_fire_device_list_changed") as mock_fire:
            old_state = MagicMock()
            old_state.state = "25.5"
            new_state = MagicMock()
            new_state.state = STATE_UNAVAILABLE

            event = MagicMock()
            event.data = {
                "entity_id": entity.entity_id,
                "old_state": old_state,
                "new_state": new_state,
            }
            manager._on_state_changed(event)
            await hass.async_block_till_done()

        assert "AA:BB:CC:DD:EE:FF" not in manager._pushing
        mock_fire.assert_called_once()

    async def test_is_device_available_all_unavailable(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """_is_device_available returns False when all ESPHome entities are unavailable."""
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

        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-avail_check",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )

        # Set entity state to unavailable
        hass.states.async_set("sensor.esphome_aabbccddeeff_avail_check", STATE_UNAVAILABLE)

        assert manager._is_device_available("AA:BB:CC:DD:EE:FF") is False

    async def test_is_device_available_some_available(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """_is_device_available returns True when at least one ESPHome entity is available."""
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
            unique_id="AA:BB:CC:DD:EE:FF-sensor-avail_ok",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )

        # Set entity state to a normal value using the actual registered entity_id
        hass.states.async_set(entity.entity_id, "25.5")

        assert manager._is_device_available("AA:BB:CC:DD:EE:FF") is True

    async def test_open_session_returns_none_when_unavailable(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """async_open_session returns None when _is_device_available is False."""
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

        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-session_check",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )

        # All entities unavailable
        hass.states.async_set("sensor.esphome_aabbccddeeff_session_check", STATE_UNAVAILABLE)

        result = await manager.async_open_session("AA:BB:CC:DD:EE:FF")
        assert result is None

    async def test_push_config_to_device_no_config(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device fetches build flags when no stored config."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")
        # store has no config for this MAC
        with patch.object(manager, "_fetch_build_flags", new_callable=AsyncMock) as mock_fetch:
            await manager._push_config_to_device("AA:BB:CC:DD:EE:FF")
            mock_fetch.assert_awaited_once_with("AA:BB:CC:DD:EE:FF")

    async def test_push_config_to_device_opens_session(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device creates a temporary connection and pushes."""
        store.devices["AA:BB:CC:DD:EE:FF"] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_push_config = AsyncMock()
        mock_conn.async_fetch_build_flags = AsyncMock(return_value={})
        mock_conn.async_disconnect = AsyncMock()

        with patch(
            "custom_components.eppgrid.device_manager.DeviceConnection",
            return_value=mock_conn,
        ):
            await manager._push_config_to_device("AA:BB:CC:DD:EE:FF")

        mock_conn.async_connect.assert_awaited_once()
        mock_conn.async_push_config.assert_awaited_once()
        mock_conn.async_disconnect.assert_awaited_once()

    async def test_push_config_to_device_handles_error(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device logs warning on push failure."""
        store.devices["AA:BB:CC:DD:EE:FF"] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_push_config = AsyncMock(side_effect=ConnectionError("timeout"))
        mock_conn.async_disconnect = AsyncMock()

        with patch(
            "custom_components.eppgrid.device_manager.DeviceConnection",
            return_value=mock_conn,
        ):
            # Should not raise
            await manager._push_config_to_device("AA:BB:CC:DD:EE:FF")

        mock_conn.async_disconnect.assert_awaited_once()

    async def test_push_config_to_device_no_host(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device returns False when device has no host."""
        store.devices["AA:BB:CC:DD:EE:FF"] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host=None)

        result = await manager._push_config_to_device("AA:BB:CC:DD:EE:FF")
        assert result is False

    async def test_push_config_uses_session_when_available(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device uses existing session connection instead of temporary."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        session_conn = MagicMock()
        session_conn.connected = True
        session_conn.raw_target_subs = 0
        session_conn.grid_target_subs = 0
        session_conn.async_push_config = AsyncMock()
        session_conn.async_fetch_build_flags = AsyncMock(return_value={})
        session_conn._services = {}
        manager._active_connections[mac] = session_conn

        result = await manager._push_config_to_device(mac)

        assert result is True
        session_conn.async_push_config.assert_awaited_once()

    async def test_push_config_falls_back_to_temporary_when_no_session(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device creates temporary connection when no session exists."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        # No session in _active_connections
        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_push_config = AsyncMock()
        mock_conn.async_fetch_build_flags = AsyncMock(return_value={})
        mock_conn.async_disconnect = AsyncMock()
        mock_conn._services = {}
        mock_conn._client = MagicMock()

        with patch(
            "custom_components.eppgrid.device_manager.DeviceConnection",
            return_value=mock_conn,
        ):
            result = await manager._push_config_to_device(mac)

        assert result is True
        mock_conn.async_connect.assert_awaited_once()
        mock_conn.async_push_config.assert_awaited_once()
        mock_conn.async_disconnect.assert_awaited_once()

    async def test_push_config_skips_disconnected_session(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device ignores disconnected session and uses temporary."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        stale_conn = MagicMock()
        stale_conn.connected = False
        manager._active_connections[mac] = stale_conn

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_push_config = AsyncMock()
        mock_conn.async_fetch_build_flags = AsyncMock(return_value={})
        mock_conn.async_disconnect = AsyncMock()
        mock_conn._services = {}
        mock_conn._client = MagicMock()

        with patch(
            "custom_components.eppgrid.device_manager.DeviceConnection",
            return_value=mock_conn,
        ):
            result = await manager._push_config_to_device(mac)

        assert result is True
        mock_conn.async_connect.assert_awaited_once()
        mock_conn.async_push_config.assert_awaited_once()
        mock_conn.async_disconnect.assert_awaited_once()

    async def test_push_config_session_failure_returns_false(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device returns False when session push raises."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        session_conn = MagicMock()
        session_conn.connected = True
        session_conn.async_push_config = AsyncMock(side_effect=ConnectionError("lost"))
        session_conn.async_disconnect = AsyncMock()
        manager._active_connections[mac] = session_conn

        result = await manager._push_config_to_device(mac)

        assert result is False
        assert mac not in manager._active_connections

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

    async def test_on_device_available_skips_push_when_entity_update_guard_set(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_on_device_available skips push when entity update guard is set."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        # Simulate: entity update guard was set by websocket_set_settings
        manager._entity_update_macs.add(mac)
        manager._pushing.add(mac)

        with patch.object(manager, "_push_config_to_device", new_callable=AsyncMock) as mock_push:
            await manager._on_device_available(mac)

        mock_push.assert_not_awaited()
        # Guard stays set — cleared by 60-second timer, not by skip path
        assert mac in manager._entity_update_macs
        assert mac in manager._pushing

    async def test_on_device_removed_cleans_up(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Device registry removal cleans up stored settings and runtime state."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50", device_id="dev123")
        manager._store.devices[mac] = {"settings": {"led_mode": "Manual"}}
        manager._build_flags[mac] = {"has_co2": True}
        manager._entity_update_macs.add(mac)

        # Pre-populate templates that should survive
        manager._store.templates["Living Room"] = {"grid_bytes": [1, 2, 3]}

        with patch.object(manager, "async_close_session", new_callable=AsyncMock) as mock_close:
            event = MagicMock()
            event.data = {"action": "remove", "device_id": "dev123"}
            manager._on_device_registry_updated(event)
            await hass.async_block_till_done()

        mock_close.assert_awaited_once_with(mac)
        assert mac not in manager._store.devices
        assert mac not in manager.devices
        assert mac not in manager._build_flags
        assert mac not in manager._entity_update_macs
        assert "Living Room" in manager._store.templates

    async def test_on_device_removed_notifies_subscribers(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Device removal fires device list callbacks."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50", device_id="dev123")

        cb = MagicMock()
        unsub = manager.on_device_list_changed(cb)

        with patch.object(manager, "async_close_session", new_callable=AsyncMock):
            event = MagicMock()
            event.data = {"action": "remove", "device_id": "dev123"}
            manager._on_device_registry_updated(event)
            await hass.async_block_till_done()

        cb.assert_called_once()
        unsub()

    async def test_discovery_notifies_subscribers(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Discovering a new device fires device list callbacks."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )
        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="aabbccddeeff-firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        cb = MagicMock()
        manager.on_device_list_changed(cb)

        await manager.async_discover()

        cb.assert_called_once()

    async def test_discovery_resets_stale_zone_entities_on_readd(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Re-adding a deleted device resets leftover zone entity names and disables them.

        When a user deletes a device and re-adds it, ESPHome/HA may leave stale
        zone entity registry entries with custom names ("Zone Cupboard") and
        disabled_by=None. On rediscovery with no stored layout, EPP must reset
        those entries so the device looks fresh.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )
        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="aabbccddeeff-firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        # Leftover zone entities from prior configuration — custom names,
        # enabled. Simulate state after delete+readd where HA didn't purge them.
        zone0 = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_0_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        ent_reg.async_update_entity(zone0.entity_id, name="Zone Rest of Room", disabled_by=None)
        zone1 = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_1_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        ent_reg.async_update_entity(zone1.entity_id, name="Zone Cupboard", disabled_by=None)
        zone1_tc = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-zone_1_target_count",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        ent_reg.async_update_entity(zone1_tc.entity_id, name="Zone Cupboard Target Count", disabled_by=None)

        # No stored layout — device was deleted, so storage was cleared.
        assert manager._store.get_device("AA:BB:CC:DD:EE:FF") is None

        await manager.async_discover()

        # All stale zone entities reset: no custom name, disabled by integration.
        zone0_after = ent_reg.async_get(zone0.entity_id)
        assert zone0_after.name is None
        assert zone0_after.disabled_by == er.RegistryEntryDisabler.INTEGRATION

        zone1_after = ent_reg.async_get(zone1.entity_id)
        assert zone1_after.name is None
        assert zone1_after.disabled_by == er.RegistryEntryDisabler.INTEGRATION

        zone1_tc_after = ent_reg.async_get(zone1_tc.entity_id)
        assert zone1_tc_after.name is None
        assert zone1_tc_after.disabled_by == er.RegistryEntryDisabler.INTEGRATION

    async def test_on_device_removed_ignores_unknown_device(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Device removal for unknown device_id is a no-op."""
        with patch.object(manager, "async_close_session", new_callable=AsyncMock) as mock_close:
            event = MagicMock()
            event.data = {"action": "remove", "device_id": "unknown"}
            manager._on_device_registry_updated(event)
            await hass.async_block_till_done()

        mock_close.assert_not_awaited()

    async def test_on_managed_device_updated_fires_callback(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Update events for managed devices fire device list callbacks (e.g. rename)."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50", device_id="dev123")
        manager._store.devices[mac] = {"settings": {}}

        cb = MagicMock()
        manager.on_device_list_changed(cb)

        event = MagicMock()
        event.data = {"action": "update", "device_id": "dev123"}
        manager._on_device_registry_updated(event)
        await hass.async_block_till_done()

        # Device is still present (update is not remove)
        assert mac in manager.devices
        assert mac in manager._store.devices
        # Callback fired so subscribers re-fetch the list
        cb.assert_called_once()

    async def test_on_unmanaged_device_updated_does_not_fire(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Update events for devices we don't manage don't fire the callback."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id="dev123"
        )

        cb = MagicMock()
        manager.on_device_list_changed(cb)

        event = MagicMock()
        event.data = {"action": "update", "device_id": "some_other_device"}
        manager._on_device_registry_updated(event)
        await hass.async_block_till_done()

        cb.assert_not_called()


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

        assert len(manager._unsub_listeners) == 3

        # Cleanup
        await manager.async_stop()
        assert len(manager._unsub_listeners) == 0


# ---------------------------------------------------------------------------
# Zone entity management tests
# ---------------------------------------------------------------------------


class TestZoneEntities:
    """Tests for async_update_zone_entities."""

    async def test_update_zone_entities_calibrated(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Calibrated device enables zone 0 as 'Zone Rest of Room'."""
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
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_0_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone1_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_1_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone2_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_2_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_presence": True}}

        zone_slots = [
            {"type": "normal", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
            {"name": "Office"},
        ] + [None] * (MAX_ZONES - 1)
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        # Zone 0 should be enabled with name "Zone Rest of Room"
        zone0 = ent_reg.async_get(zone0_entry.entity_id)
        assert zone0.disabled_by is None
        assert zone0.name == "Zone Rest of Room"

        # Zone 1 should be enabled and renamed "Zone Office"
        zone1 = ent_reg.async_get(zone1_entry.entity_id)
        assert zone1.disabled_by is None
        assert zone1.name == "Zone Office"

        # Zone 2 should be disabled (unused)
        zone2 = ent_reg.async_get(zone2_entry.entity_id)
        assert zone2.disabled_by == er.RegistryEntryDisabler.INTEGRATION

    async def test_update_zone_entities_disables_unused(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Unused zone slots are disabled by integration."""
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
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_0_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone1_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_1_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_presence": True}}

        # No named zones
        zone_slots = [
            {"type": "normal", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
        ] + [None] * MAX_ZONES
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        # Zone 0 always enabled
        zone0 = ent_reg.async_get(zone0_entry.entity_id)
        assert zone0.disabled_by is None

        # Zone 1 unused — disabled
        zone1 = ent_reg.async_get(zone1_entry.entity_id)
        assert zone1.disabled_by == er.RegistryEntryDisabler.INTEGRATION

    async def test_update_zone_entities_respects_user_disabled(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Named zone with disabled_by=USER is not re-enabled."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )

        zone1_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_1_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        # User explicitly disabled this entity
        ent_reg.async_update_entity(zone1_entry.entity_id, disabled_by=er.RegistryEntryDisabler.USER)

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_presence": True}}

        zone_slots = [
            {"type": "normal", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
            {"name": "Office"},
        ] + [None] * (MAX_ZONES - 1)
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        # Zone 1 should remain user-disabled
        zone1 = ent_reg.async_get(zone1_entry.entity_id)
        assert zone1.disabled_by == er.RegistryEntryDisabler.USER

    async def test_update_zone_entities_unknown_device(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Unknown device is a no-op."""
        await manager.async_update_zone_entities("00:00:00:00:00:00", [None] * (MAX_ZONES + 1))
        # Should not raise

    async def test_update_zone_entities_indexes_named_zones_by_slot_position(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Zone N's name comes from zone_slots[N] (length-8 indexing), not [N-1]."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )

        zone1_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_1_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone2_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_2_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_presence": True}}

        # Length-8 slots: index 0 = zone 0, index 1 = "Kitchen", index 2 = "Bedroom".
        zone_slots = [
            {"type": "normal", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
            {"name": "Kitchen"},
            {"name": "Bedroom"},
            None,
            None,
            None,
            None,
            None,
        ]
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        assert ent_reg.async_get(zone1_entry.entity_id).name == "Zone Kitchen"
        assert ent_reg.async_get(zone2_entry.entity_id).name == "Zone Bedroom"

    async def test_update_zone_entities_target_count_only_for_existing_zones(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """zone_target_count entities are only enabled for zones that exist in the grid."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )

        # Create zone_target_count entities
        ztc0 = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-zone_0_target_count",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        ztc1 = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-zone_1_target_count",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        ztc2 = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-zone_2_target_count",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_target_count": True}}

        # Only zone 0 (room) + zone 1 (named "Office") exist
        zone_slots = [
            {"type": "normal", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
            {"name": "Office"},
        ] + [None] * (MAX_ZONES - 1)
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        # Zone 0 target count should be enabled with room name
        ztc0_entry = ent_reg.async_get(ztc0.entity_id)
        assert ztc0_entry.disabled_by is None
        assert ztc0_entry.name == "Zone Rest of Room Target Count"
        # Zone 1 target count should be enabled with zone name
        ztc1_entry = ent_reg.async_get(ztc1.entity_id)
        assert ztc1_entry.disabled_by is None
        assert ztc1_entry.name == "Zone Office Target Count"
        # Zone 2 target count should be disabled (unused slot)
        assert ent_reg.async_get(ztc2.entity_id).disabled_by == er.RegistryEntryDisabler.INTEGRATION

    async def test_update_zone_entities_tolerates_malformed_slot(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Malformed zone slots (missing 'name', non-dict) don't crash entity updates.

        Even if corrupt data ever reaches storage, async_update_zone_entities
        must use `.get('name')` with a fallback rather than raising KeyError.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )

        # Create zone 1 entities for both presence + target_count
        zone1_pres = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_1_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone1_tc = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-zone_1_target_count",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone2_pres = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_2_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_presence": True, "zone_target_count": True}}

        # Slot 1 is a dict without 'name'; slot 2 is a non-dict (malformed).
        zone_slots = [
            {"type": "normal"},
            {"color": "#ff0000", "type": "normal"},  # missing 'name'
            "not a dict",  # non-dict malformed slot
            None,
            None,
            None,
            None,
            None,
        ]

        # Must not raise.
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        # Slot 1 (dict without name) should still be enabled, with a default fallback name.
        z1p = ent_reg.async_get(zone1_pres.entity_id)
        assert z1p.disabled_by is None
        assert z1p.name  # not empty
        z1tc = ent_reg.async_get(zone1_tc.entity_id)
        assert z1tc.disabled_by is None
        assert z1tc.name

        # Slot 2 ("not a dict") is treated as non-existent → disabled by integration.
        z2p = ent_reg.async_get(zone2_pres.entity_id)
        assert z2p.disabled_by == er.RegistryEntryDisabler.INTEGRATION

    async def test_update_zone_entities_target_count_disabled_when_setting_off(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """zone_target_count entities are all disabled when setting is off."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )

        ztc0 = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-zone_0_target_count",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_target_count": False}}

        zone_slots = [
            {"type": "normal", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
            {"name": "Office"},
        ] + [None] * (MAX_ZONES - 1)
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        # Even zone 0 should be disabled when zone_target_count setting is off
        assert ent_reg.async_get(ztc0.entity_id).disabled_by == er.RegistryEntryDisabler.INTEGRATION

    async def test_update_zone_entities_fail_closed_on_legacy_length_7(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Legacy length-7 layout in storage disables all zone entities (fail-closed).

        Before the length-8 migration, storage held a length-7 zone_slots list
        where index 0 was the FIRST named zone (not zone 0 / room). If discovery
        replays that legacy shape through async_update_zone_entities, we MUST
        NOT silently shift indices — instead treat every zone as non-existent
        so the user sees entities disabled until they re-save their layout via
        the panel with the new length-8 shape.
        """
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
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_0_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone1_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_1_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone1_tc = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-zone_1_target_count",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_presence": True, "zone_target_count": True}}

        # Legacy length-7 layout: index 0 was once "first named zone".
        zone_slots = [{"name": "Office"}] + [None] * 6
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        # Zone 0 MUST be disabled — we cannot trust any index semantics.
        assert ent_reg.async_get(zone0_entry.entity_id).disabled_by == er.RegistryEntryDisabler.INTEGRATION
        # Zone 1 entities MUST be disabled — do not silently adopt the old "Office" name.
        assert ent_reg.async_get(zone1_entry.entity_id).disabled_by == er.RegistryEntryDisabler.INTEGRATION
        assert ent_reg.async_get(zone1_tc.entity_id).disabled_by == er.RegistryEntryDisabler.INTEGRATION

    async def test_update_zone_entities_fail_closed_when_slot0_is_none(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Length-8 zone_slots with slot 0 = None disables all zone entities."""
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
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_0_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone1_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_1_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_presence": True}}

        zone_slots = [None] * (MAX_ZONES + 1)  # slot 0 is None — malformed
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        assert ent_reg.async_get(zone0_entry.entity_id).disabled_by == er.RegistryEntryDisabler.INTEGRATION
        assert ent_reg.async_get(zone1_entry.entity_id).disabled_by == er.RegistryEntryDisabler.INTEGRATION

    async def test_update_zone_entities_fail_closed_when_slot0_not_dict(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Length-8 zone_slots with slot 0 = non-dict (e.g. list) disables all zone entities."""
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
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_0_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone1_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_1_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_presence": True}}

        # Slot 0 is a list — not a dict. Malformed.
        zone_slots: list = [["not", "a", "dict"]] + [None] * MAX_ZONES
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        assert ent_reg.async_get(zone0_entry.entity_id).disabled_by == er.RegistryEntryDisabler.INTEGRATION
        assert ent_reg.async_get(zone1_entry.entity_id).disabled_by == er.RegistryEntryDisabler.INTEGRATION


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


# ---------------------------------------------------------------------------
# Build flags tests
# ---------------------------------------------------------------------------


class TestBuildFlags:
    """Tests for async_fetch_build_flags, caching, and list_devices exposure."""

    async def test_fetch_build_flags_returns_dict(self) -> None:
        """async_fetch_build_flags returns response dict from get_build_flags action."""
        conn = DeviceConnection("192.168.1.100")

        mock_svc = MagicMock()
        mock_svc.name = "get_build_flags"

        expected_flags = {
            "bluetooth_enabled": True,
            "co2_enabled": False,
            "ethernet_enabled": True,
            "board_revision": "1.1",
            "sensor_variant": "ld2450",
            "firmware_channel": "stable",
            "model": "pro",
        }

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_svc]))
            mock_resp = MagicMock()
            mock_resp.response_data = json.dumps(expected_flags).encode()
            mock_client.execute_service = AsyncMock(return_value=mock_resp)
            mock_client.disconnect = AsyncMock()

            await conn.async_connect()
            result = await conn.async_fetch_build_flags()

        assert result == expected_flags

    async def test_fetch_build_flags_no_service(self) -> None:
        """async_fetch_build_flags returns empty dict when service not available."""
        conn = DeviceConnection("192.168.1.100")

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], []))
            mock_client.disconnect = AsyncMock()

            await conn.async_connect()
            result = await conn.async_fetch_build_flags()

        assert result == {}

    async def test_fetch_build_flags_exception_returns_empty(self) -> None:
        """async_fetch_build_flags returns empty dict on exception."""
        conn = DeviceConnection("192.168.1.100")

        mock_svc = MagicMock()
        mock_svc.name = "get_build_flags"

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_svc]))
            mock_client.execute_service = AsyncMock(side_effect=ConnectionError("timeout"))
            mock_client.disconnect = AsyncMock()

            await conn.async_connect()
            result = await conn.async_fetch_build_flags()

        assert result == {}

    async def test_fetch_build_flags_non_dict_returns_empty(self) -> None:
        """async_fetch_build_flags returns empty dict when response is not a dict."""
        conn = DeviceConnection("192.168.1.100")

        mock_svc = MagicMock()
        mock_svc.name = "get_build_flags"

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_svc]))
            mock_client.execute_service = AsyncMock(return_value=None)
            mock_client.disconnect = AsyncMock()

            await conn.async_connect()
            result = await conn.async_fetch_build_flags()

        assert result == {}

    async def test_push_config_caches_build_flags_temporary_conn(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device caches build flags after push via temporary connection."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        expected_flags = {"bluetooth_enabled": True, "model": "pro"}

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_push_config = AsyncMock()
        mock_conn.async_fetch_build_flags = AsyncMock(return_value=expected_flags)
        mock_conn.async_disconnect = AsyncMock()
        mock_conn._services = {}
        mock_conn._client = MagicMock()

        with patch(
            "custom_components.eppgrid.device_manager.DeviceConnection",
            return_value=mock_conn,
        ):
            result = await manager._push_config_to_device(mac)

        assert result is True
        mock_conn.async_fetch_build_flags.assert_awaited_once()
        assert manager._build_flags[mac] == expected_flags

    async def test_push_config_caches_build_flags_session_conn(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device caches build flags after push via session connection."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        expected_flags = {"co2_enabled": True, "board_revision": "1.2"}

        session_conn = MagicMock()
        session_conn.connected = True
        session_conn.raw_target_subs = 0
        session_conn.grid_target_subs = 0
        session_conn.async_push_config = AsyncMock()
        session_conn.async_fetch_build_flags = AsyncMock(return_value=expected_flags)
        session_conn._services = {}
        manager._active_connections[mac] = session_conn

        result = await manager._push_config_to_device(mac)

        assert result is True
        session_conn.async_fetch_build_flags.assert_awaited_once()
        assert manager._build_flags[mac] == expected_flags

    async def test_push_config_negative_caches_empty_flags(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device caches empty build flags so a second save doesn't re-fetch."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_push_config = AsyncMock()
        mock_conn.async_fetch_build_flags = AsyncMock(return_value={})
        mock_conn.async_disconnect = AsyncMock()
        mock_conn._services = {}
        mock_conn._client = MagicMock()

        with patch(
            "custom_components.eppgrid.device_manager.DeviceConnection",
            return_value=mock_conn,
        ):
            await manager._push_config_to_device(mac)
            # second save — must not re-fetch
            await manager._push_config_to_device(mac)

        assert mac in manager._build_flags
        assert manager._build_flags[mac] == {}
        mock_conn.async_fetch_build_flags.assert_awaited_once()

    async def test_fetch_build_flags_negative_caches_empty(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_fetch_build_flags caches empty result so a second call doesn't re-fetch."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        session_conn = MagicMock()
        session_conn.connected = True
        session_conn.raw_target_subs = 0
        session_conn.grid_target_subs = 0
        session_conn.async_fetch_build_flags = AsyncMock(return_value={})
        manager._active_connections[mac] = session_conn

        await manager._fetch_build_flags(mac)
        await manager._fetch_build_flags(mac)

        assert manager._build_flags[mac] == {}
        session_conn.async_fetch_build_flags.assert_awaited_once()

    async def test_list_devices_includes_build_flags(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """list_devices spreads cached build flags into device info."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP Device", host="192.168.1.50", available=True)
        manager._build_flags[mac] = {
            "bluetooth_enabled": True,
            "co2_enabled": False,
            "ethernet_enabled": True,
            "board_revision": "1.1",
            "sensor_variant": "ld2450",
            "firmware_channel": "stable",
            "model": "pro",
        }

        result = manager.list_devices()
        assert len(result) == 1
        assert result[0]["bluetooth_enabled"] is True
        assert result[0]["co2_enabled"] is False
        assert result[0]["ethernet_enabled"] is True
        assert result[0]["board_revision"] == "1.1"
        assert result[0]["sensor_variant"] == "ld2450"
        assert result[0]["firmware_channel"] == "stable"
        assert result[0]["model"] == "pro"

    async def test_push_config_skips_fetch_when_cached_session(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device skips build-flags fetch when cached (session path)."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._build_flags[mac] = {"model": "pro"}

        session_conn = MagicMock()
        session_conn.connected = True
        session_conn.raw_target_subs = 0
        session_conn.grid_target_subs = 0
        session_conn.async_push_config = AsyncMock()
        session_conn.async_fetch_build_flags = AsyncMock(return_value={})
        session_conn._services = {}
        manager._active_connections[mac] = session_conn

        result = await manager._push_config_to_device(mac)

        assert result is True
        session_conn.async_fetch_build_flags.assert_not_awaited()
        assert manager._build_flags[mac] == {"model": "pro"}

    async def test_push_config_skips_fetch_when_cached_temporary(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device skips build-flags fetch when cached (temp-connection path)."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._build_flags[mac] = {"model": "pro"}

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_push_config = AsyncMock()
        mock_conn.async_fetch_build_flags = AsyncMock(return_value={})
        mock_conn.async_disconnect = AsyncMock()
        mock_conn._services = {}
        mock_conn._client = MagicMock()

        with patch(
            "custom_components.eppgrid.device_manager.DeviceConnection",
            return_value=mock_conn,
        ):
            result = await manager._push_config_to_device(mac)

        assert result is True
        mock_conn.async_fetch_build_flags.assert_not_awaited()
        assert manager._build_flags[mac] == {"model": "pro"}

    async def test_fetch_build_flags_skips_when_cached_session(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_fetch_build_flags skips when already cached (session path)."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._build_flags[mac] = {"model": "pro"}

        session_conn = MagicMock()
        session_conn.connected = True
        session_conn.raw_target_subs = 0
        session_conn.grid_target_subs = 0
        session_conn.async_fetch_build_flags = AsyncMock(return_value={})
        manager._active_connections[mac] = session_conn

        await manager._fetch_build_flags(mac)

        session_conn.async_fetch_build_flags.assert_not_awaited()

    async def test_fetch_build_flags_skips_when_cached_temporary(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_fetch_build_flags skips when already cached (temp-connection path)."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._build_flags[mac] = {"model": "pro"}

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_fetch_build_flags = AsyncMock(return_value={})
        mock_conn.async_disconnect = AsyncMock()

        with patch(
            "custom_components.eppgrid.device_manager.DeviceConnection",
            return_value=mock_conn,
        ):
            await manager._fetch_build_flags(mac)

        mock_conn.async_fetch_build_flags.assert_not_awaited()
        mock_conn.async_connect.assert_not_awaited()

    async def test_fetch_build_flags_times_out_fast(self) -> None:
        """async_fetch_build_flags returns {} within timeout when execute_service hangs."""
        conn = DeviceConnection("192.168.1.100")

        mock_svc = MagicMock()
        mock_svc.name = "get_build_flags"

        async def hang(*_args: object, **_kwargs: object) -> None:
            await asyncio.sleep(60)
            return None

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_svc]))
            mock_client.execute_service = AsyncMock(side_effect=hang)
            mock_client.disconnect = AsyncMock()

            await conn.async_connect()
            loop = asyncio.get_running_loop()
            start = loop.time()
            result = await conn.async_fetch_build_flags(timeout=0.05)
            elapsed = loop.time() - start

        assert result == {}
        # Tight bound proves the override was honored (not the 2.0s default).
        assert elapsed < 0.5, f"expected timeout~=0.05s, took {elapsed:.3f}s"

    async def test_list_devices_no_build_flags(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """list_devices works without cached build flags (no extra keys)."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP Device", host="192.168.1.50", available=True)
        # No build flags cached

        result = manager.list_devices()
        assert len(result) == 1
        assert "bluetooth_enabled" not in result[0]
        assert "model" not in result[0]


def test_dismiss_target_service_missing_raises_translation_keyed_error():
    """When epp_dismiss_target service is missing, raise HomeAssistantError with translation metadata."""
    from homeassistant.exceptions import HomeAssistantError

    from custom_components.eppgrid.const import DOMAIN
    from custom_components.eppgrid.device_manager import _raise_service_unavailable

    with pytest.raises(HomeAssistantError) as exc:
        _raise_service_unavailable("epp_dismiss_target")

    assert exc.value.translation_domain == DOMAIN
    assert exc.value.translation_key == "service_not_available"
    assert exc.value.translation_placeholders == {"service": "epp_dismiss_target"}


def test_zone_entity_names_resolve_english():
    """Zone name resolver must look up the requested language and interpolate user name."""
    from custom_components.eppgrid.device_manager import _resolve_zone_name

    assert _resolve_zone_name("en", index=0, zone_name=None, target_count=False) == "Zone Rest of Room"
    assert _resolve_zone_name("en", index=1, zone_name="Kitchen", target_count=False) == "Zone Kitchen"
    assert _resolve_zone_name("en", index=0, zone_name=None, target_count=True) == "Zone Rest of Room Target Count"
    assert _resolve_zone_name("en", index=1, zone_name="Kitchen", target_count=True) == "Zone Kitchen Target Count"


def test_zone_entity_names_resolve_spanish():
    """Spanish locale returns Castilian zone names with prefix translated, user name verbatim."""
    from custom_components.eppgrid.device_manager import _resolve_zone_name

    assert _resolve_zone_name("es", index=1, zone_name="Cocina", target_count=False) == "Zona Cocina"
    assert _resolve_zone_name("es-ES", index=1, zone_name="Cocina", target_count=False) == "Zona Cocina"
    assert (
        _resolve_zone_name("es", index=0, zone_name=None, target_count=True)
        == "Número de objetivos en zona Resto de la habitación"
    )


def test_resolve_zone_name_falls_back_to_english_for_unknown_language():
    """Unknown languages fall back to English."""
    from custom_components.eppgrid.device_manager import _resolve_zone_name

    assert _resolve_zone_name("xx", index=0, zone_name=None, target_count=False) == "Zone Rest of Room"
    assert _resolve_zone_name("zz-ZZ", index=1, zone_name="Kitchen", target_count=False) == "Zone Kitchen"


def test_resolve_zone_name_strips_redundant_zone_prefix():
    """Names already starting with the localized prefix must not be double-prefixed."""
    from custom_components.eppgrid.device_manager import _resolve_zone_name

    # English: default "Zone 1" → "Zone 1", not "Zone Zone 1"
    assert _resolve_zone_name("en", index=1, zone_name="Zone 1", target_count=False) == "Zone 1"
    assert _resolve_zone_name("en", index=2, zone_name="Zone 2", target_count=True) == "Zone 2 Target Count"

    # English: custom name starting with "Zone" → no double prefix
    assert _resolve_zone_name("en", index=1, zone_name="Zone of Danger", target_count=False) == "Zone of Danger"

    # Spanish: name starting with "Zona" → no double prefix
    assert _resolve_zone_name("es", index=1, zone_name="Zona Cocina", target_count=False) == "Zona Cocina"

    # Spanish: English default "Zone 1" → localized "Zona 1"
    assert _resolve_zone_name("es", index=3, zone_name="Zone 3", target_count=False) == "Zona 3"

    # Names not starting with the prefix still get it
    assert _resolve_zone_name("en", index=1, zone_name="Kitchen", target_count=False) == "Zone Kitchen"


def test_zone_type_defaults_match_frontend():
    """Python ZONE_TYPE_DEFAULTS must match frontend/src/lib/zone-defaults.ts.

    The two tables are the single source of truth for non-custom zone timing
    — if they drift, upgrade rollouts silently diverge between the frontend
    display (resolveZone0Params / getZoneThresholds) and what the backend
    actually pushes to firmware. Keep them in lockstep.
    """
    import re
    from pathlib import Path

    from custom_components.eppgrid.device_manager import ZONE_TYPE_DEFAULTS

    ts_path = Path(__file__).parent.parent / "frontend/src/lib/zone-defaults.ts"
    ts_source = ts_path.read_text()
    assert "ZONE_TYPE_DEFAULTS" in ts_source, "zone-defaults.ts missing ZONE_TYPE_DEFAULTS"

    # Entries look like:
    #   normal: { trigger: 5, renew: 3, timeout: 10, handoff_timeout: 3 },
    # Match those directly anywhere in the file — only ZONE_TYPE_DEFAULTS
    # uses exactly this 4-field shape with these field names in order.
    entry_re = re.compile(
        r"(\w+):\s*\{\s*"
        r"trigger:\s*(\d+(?:\.\d+)?),\s*"
        r"renew:\s*(\d+(?:\.\d+)?),\s*"
        r"timeout:\s*(\d+(?:\.\d+)?),\s*"
        r"handoff_timeout:\s*(\d+(?:\.\d+)?)\s*\}"
    )
    ts_defaults: dict[str, dict[str, float]] = {}
    for name, t, r, to, h in entry_re.findall(ts_source):
        ts_defaults[name] = {
            "trigger": float(t),
            "renew": float(r),
            "timeout": float(to),
            "handoff_timeout": float(h),
        }

    assert ts_defaults, "Failed to parse any entries from ZONE_TYPE_DEFAULTS"

    # Every type in the Python table must exist in TS with identical values.
    # (TS may have extra types like "custom"; we only assert shared keys match.)
    for type_name, fields in ZONE_TYPE_DEFAULTS.items():
        assert type_name in ts_defaults, f"type {type_name!r} missing from TS ZONE_TYPE_DEFAULTS"
        for field_name, py_value in fields.items():
            ts_value = ts_defaults[type_name][field_name]
            assert float(ts_value) == float(py_value), f"{type_name}.{field_name}: Python={py_value} vs TS={ts_value}"
