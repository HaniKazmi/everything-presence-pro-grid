"""Tests for WebSocket API commands."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid import async_setup_entry
from custom_components.eppgrid import websocket_api as ws_module

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _clear_registered():
    """Clear the module-global _REGISTERED set between tests."""
    ws_module._REGISTERED.clear()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def setup_integration(hass: HomeAssistant, config_entry: MockConfigEntry) -> MagicMock:
    """Set up the integration with a mocked DeviceManager and return the mock."""
    from custom_components.eppgrid.const import CONFIG_PROTOCOL_VERSION

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        mock_dm.async_stop = AsyncMock()
        mock_dm._store = MagicMock()
        mock_dm._store.devices = {}
        mock_dm._store.templates = {}
        mock_dm._store.async_save = AsyncMock()
        mock_dm.devices = {}
        mock_dm.list_devices.return_value = []
        mock_dm._push_config_to_device = AsyncMock()
        mock_dm.async_update_zone_entities = AsyncMock()
        mock_dm.async_open_session = AsyncMock(return_value=None)
        mock_dm.async_close_session = AsyncMock()
        mock_dm.get_session = MagicMock(return_value=None)
        mock_dm.read_config_protocol.return_value = CONFIG_PROTOCOL_VERSION

        await async_setup_entry(hass, config_entry)

    return mock_dm


async def call_async_handler(hass, handler, connection, msg):
    """Call a @websocket_api.async_response handler and flush the task queue."""
    handler(hass, connection, msg)
    await hass.async_block_till_done()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestWebSocketListDevices:
    """Tests for eppgrid/list_devices."""

    async def test_list_devices(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """list_devices returns device list from manager."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.list_devices.return_value = [
            {"mac": "AA:BB:CC:DD:EE:FF", "name": "EPP", "host": "192.168.1.50", "available": True, "configured": True}
        ]

        from custom_components.eppgrid.websocket_api import websocket_list_devices

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/list_devices"}

        websocket_list_devices(hass, connection, msg)

        connection.send_result.assert_called_once()
        result = connection.send_result.call_args[0]
        assert result[0] == 1
        assert len(result[1]["devices"]) == 1
        assert result[1]["devices"][0]["mac"] == "AA:BB:CC:DD:EE:FF"

    async def test_list_devices_not_ready(self, hass: HomeAssistant) -> None:
        """list_devices returns error when integration not loaded."""
        from custom_components.eppgrid.websocket_api import websocket_list_devices

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/list_devices"}

        websocket_list_devices(hass, connection, msg)
        connection.send_error.assert_called_once_with(1, "not_ready", "Integration not loaded")


class TestWebSocketGetConfig:
    """Tests for eppgrid/get_config."""

    async def test_get_config(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """get_config returns stored config for a device."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm._store.get_device = MagicMock(return_value={"calibration": {"perspective": [1.0] * 8}})

        from custom_components.eppgrid.websocket_api import websocket_get_config

        connection = MagicMock()
        msg = {"id": 2, "type": "eppgrid/get_config", "mac": "AA:BB:CC:DD:EE:FF"}

        websocket_get_config(hass, connection, msg)

        connection.send_result.assert_called_once()
        result = connection.send_result.call_args[0]
        assert result[1]["config"]["calibration"]["perspective"] == [1.0] * 8

    async def test_get_config_not_ready(self, hass: HomeAssistant) -> None:
        """get_config returns error when integration not loaded."""
        from custom_components.eppgrid.websocket_api import websocket_get_config

        connection = MagicMock()
        msg = {"id": 2, "type": "eppgrid/get_config", "mac": "AA:BB:CC:DD:EE:FF"}

        websocket_get_config(hass, connection, msg)
        connection.send_error.assert_called_once()


class TestWebSocketSetSetup:
    """Tests for eppgrid/set_setup (perspective calibration)."""

    async def test_set_setup_saves_and_pushes(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_setup saves calibration and pushes to device."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        connection = MagicMock()
        msg = {
            "id": 3,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }

        await call_async_handler(hass, websocket_set_setup, connection, msg)

        assert "AA:BB:CC:DD:EE:FF" in mock_dm._store.devices
        cal = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["calibration"]
        assert cal["room_width"] == 3000.0
        assert cal["room_depth"] == 4000.0

        mock_dm._store.async_save.assert_awaited()
        mock_dm._push_config_to_device.assert_awaited_with("AA:BB:CC:DD:EE:FF")
        connection.send_result.assert_called_once_with(3)

    async def test_set_setup_clears_room_layout(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_setup clears existing room layout when calibration changes."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm._store.devices["AA:BB:CC:DD:EE:FF"] = {
            "room_layout": {"grid_bytes": [1] * 400},
        }

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        connection = MagicMock()
        msg = {
            "id": 4,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0] * 8,
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }

        await call_async_handler(hass, websocket_set_setup, connection, msg)

        assert "room_layout" not in mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]

    async def test_set_setup_not_ready(self, hass: HomeAssistant) -> None:
        """set_setup returns error when integration not loaded."""
        from custom_components.eppgrid.websocket_api import websocket_set_setup

        connection = MagicMock()
        msg = {
            "id": 3,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0] * 8,
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }

        await call_async_handler(hass, websocket_set_setup, connection, msg)
        connection.send_error.assert_called_once()


class TestWebSocketSetRoomLayout:
    """Tests for eppgrid/set_room_layout."""

    async def test_set_room_layout(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_room_layout saves layout and pushes to device."""
        from custom_components.eppgrid.const import CONFIG_PROTOCOL_VERSION
        from custom_components.eppgrid.device_manager import ManagedDevice

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP",
            host="192.168.1.50",
        )
        mock_dm.read_config_protocol.return_value = CONFIG_PROTOCOL_VERSION

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        zone_slots = [{"name": "Office", "type": "normal"}]
        connection = MagicMock()
        msg = {
            "id": 5,
            "type": "eppgrid/set_room_layout",
            "mac": "AA:BB:CC:DD:EE:FF",
            "grid_bytes": [1] * 400,
            "zone_slots": zone_slots,
            "room_type": "normal",
            "furniture": [],
        }

        await call_async_handler(hass, websocket_set_room_layout, connection, msg)

        layout = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["room_layout"]
        assert layout["room_type"] == "normal"
        assert layout["zone_slots"] == zone_slots
        mock_dm._store.async_save.assert_awaited()
        mock_dm._push_config_to_device.assert_awaited()
        mock_dm.async_update_zone_entities.assert_awaited_with("AA:BB:CC:DD:EE:FF", zone_slots)
        connection.send_result.assert_called_once_with(5)


class TestWebSocketTemplates:
    """Tests for template CRUD commands."""

    async def test_list_templates(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """list_templates returns stored templates."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm._store.templates = {"bedroom": {"grid_bytes": [1] * 400}}

        from custom_components.eppgrid.websocket_api import websocket_list_templates

        connection = MagicMock()
        msg = {"id": 6, "type": "eppgrid/list_templates"}

        websocket_list_templates(hass, connection, msg)

        result = connection.send_result.call_args[0]
        assert "bedroom" in result[1]["templates"]

    async def test_save_template(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """save_template stores a new template."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_save_template

        connection = MagicMock()
        msg = {
            "id": 7,
            "type": "eppgrid/save_template",
            "name": "office",
            "template": {"grid_bytes": [0] * 400},
        }

        await call_async_handler(hass, websocket_save_template, connection, msg)

        assert "office" in mock_dm._store.templates
        mock_dm._store.async_save.assert_awaited()
        connection.send_result.assert_called_once_with(7)

    async def test_delete_template(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """delete_template removes a template."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm._store.templates["old"] = {"data": True}

        from custom_components.eppgrid.websocket_api import websocket_delete_template

        connection = MagicMock()
        msg = {"id": 8, "type": "eppgrid/delete_template", "name": "old"}

        await call_async_handler(hass, websocket_delete_template, connection, msg)

        assert "old" not in mock_dm._store.templates
        mock_dm._store.async_save.assert_awaited()

    async def test_apply_template(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """apply_template copies template to device config."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm._store.templates["bedroom"] = {"grid_bytes": [1] * 400, "zone_slots": []}

        from custom_components.eppgrid.websocket_api import websocket_apply_template

        connection = MagicMock()
        msg = {
            "id": 9,
            "type": "eppgrid/apply_template",
            "mac": "AA:BB:CC:DD:EE:FF",
            "template_name": "bedroom",
        }

        await call_async_handler(hass, websocket_apply_template, connection, msg)

        layout = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["room_layout"]
        assert layout["grid_bytes"] == [1] * 400
        mock_dm._store.async_save.assert_awaited()

    async def test_apply_template_not_found(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """apply_template returns error for unknown template."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_apply_template

        connection = MagicMock()
        msg = {
            "id": 10,
            "type": "eppgrid/apply_template",
            "mac": "AA:BB:CC:DD:EE:FF",
            "template_name": "nonexistent",
        }

        await call_async_handler(hass, websocket_apply_template, connection, msg)

        connection.send_error.assert_called_once_with(10, "not_found", "Template not found")


class TestWebSocketSettings:
    """Tests for settings commands (env_calibration, motion_timeout, etc.)."""

    async def test_set_env_calibration(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_env_calibration saves offsets and pushes to device."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_env_calibration

        connection = MagicMock()
        msg = {
            "id": 11,
            "type": "eppgrid/set_env_calibration",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": -1.5,
            "humidity_offset": 2.0,
            "illuminance_offset": -10.0,
        }

        await call_async_handler(hass, websocket_set_env_calibration, connection, msg)

        env = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["env_calibration"]
        assert env["temperature_offset"] == -1.5
        assert env["humidity_offset"] == 2.0
        mock_dm._store.async_save.assert_awaited()
        mock_dm._push_config_to_device.assert_awaited()

    async def test_set_motion_timeout(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_motion_timeout saves and pushes."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_motion_timeout

        connection = MagicMock()
        msg = {"id": 12, "type": "eppgrid/set_motion_timeout", "mac": "AA:BB:CC:DD:EE:FF", "timeout": 30.0}

        await call_async_handler(hass, websocket_set_motion_timeout, connection, msg)

        assert mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["motion_timeout"]["timeout"] == 30.0
        connection.send_result.assert_called_once_with(12)

    async def test_set_tracking(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_tracking saves max_range and pushes."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_tracking

        connection = MagicMock()
        msg = {"id": 13, "type": "eppgrid/set_tracking", "mac": "AA:BB:CC:DD:EE:FF", "max_range": 5000.0}

        await call_async_handler(hass, websocket_set_tracking, connection, msg)

        assert mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["tracking"]["max_range"] == 5000.0

    async def test_set_static_presence(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_static_presence saves full config and pushes."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_static_presence

        connection = MagicMock()
        msg = {
            "id": 14,
            "type": "eppgrid/set_static_presence",
            "mac": "AA:BB:CC:DD:EE:FF",
            "min_range": 0.0,
            "max_range": 6000.0,
            "trigger_range": 3000.0,
            "sustain_sensitivity": 3,
            "trigger_sensitivity": 5,
            "timeout": 10.0,
            "on_delay": 0.5,
            "led_enabled": True,
        }

        await call_async_handler(hass, websocket_set_static_presence, connection, msg)

        sp = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["static_presence"]
        assert sp["max_range"] == 6000.0
        assert sp["led_enabled"] is True

    async def test_set_pipeline(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_pipeline saves pipeline settings and pushes."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_pipeline

        connection = MagicMock()
        msg = {
            "id": 15,
            "type": "eppgrid/set_pipeline",
            "mac": "AA:BB:CC:DD:EE:FF",
            "display_interval_ms": 200,
            "zone_publish_interval_ms": 1000,
            "window_duration_ms": 1000,
        }

        await call_async_handler(hass, websocket_set_pipeline, connection, msg)

        pipeline = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["pipeline"]
        assert pipeline["display_interval"] == 200
        assert pipeline["zone_publish_interval"] == 1000
        assert pipeline["window_duration"] == 1000


class TestWebSocketEntityEnabled:
    """Tests for eppgrid/set_entity_enabled."""

    async def test_set_entity_enabled(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_entity_enabled enables entities in the registry."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_entity_enabled

        with patch("custom_components.eppgrid.websocket_api.er.async_get") as mock_er:
            mock_registry = mock_er.return_value

            connection = MagicMock()
            msg = {
                "id": 16,
                "type": "eppgrid/set_entity_enabled",
                "mac": "AA:BB:CC:DD:EE:FF",
                "entity_id": "binary_sensor.epp_zone_1_occupancy",
                "enabled": True,
            }

            websocket_set_entity_enabled(hass, connection, msg)

            mock_registry.async_update_entity.assert_called_once_with(
                "binary_sensor.epp_zone_1_occupancy", disabled_by=None
            )
            connection.send_result.assert_called_once_with(16)

    async def test_set_entity_disabled(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_entity_enabled disables entities with INTEGRATION disabler."""
        await setup_integration(hass, config_entry)

        from homeassistant.helpers.entity_registry import RegistryEntryDisabler

        from custom_components.eppgrid.websocket_api import websocket_set_entity_enabled

        with patch("custom_components.eppgrid.websocket_api.er.async_get") as mock_er:
            mock_registry = mock_er.return_value

            connection = MagicMock()
            msg = {
                "id": 17,
                "type": "eppgrid/set_entity_enabled",
                "mac": "AA:BB:CC:DD:EE:FF",
                "entity_id": "binary_sensor.epp_zone_1_occupancy",
                "enabled": False,
            }

            websocket_set_entity_enabled(hass, connection, msg)

            mock_registry.async_update_entity.assert_called_once_with(
                "binary_sensor.epp_zone_1_occupancy",
                disabled_by=RegistryEntryDisabler.INTEGRATION,
            )


class TestWebSocketSubscriptions:
    """Tests for subscription commands (subscribe_device, subscribe_raw_targets, subscribe_grid_targets)."""

    async def test_subscribe_device_opens_session(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """subscribe_device opens a session and registers unsubscribe."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_conn = MagicMock()
        mock_dm.async_open_session = AsyncMock(return_value=mock_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_device

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 20, "type": "eppgrid/subscribe_device", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_device, connection, msg)

        mock_dm.async_open_session.assert_awaited_with("AA:BB:CC:DD:EE:FF")
        connection.send_result.assert_called_once_with(20)
        assert 20 in connection.subscriptions

    async def test_subscribe_device_connection_error(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """subscribe_device returns connection_failed when device rejects connection."""
        from aioesphomeapi.core import SocketClosedAPIError

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.async_open_session = AsyncMock(side_effect=SocketClosedAPIError("EOF received"))

        from custom_components.eppgrid.websocket_api import websocket_subscribe_device

        connection = MagicMock()
        msg = {"id": 25, "type": "eppgrid/subscribe_device", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_device, connection, msg)

        connection.send_error.assert_called_once_with(
            25, "connection_failed", "Failed to connect to device"
        )

    async def test_subscribe_device_not_found(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """subscribe_device returns error when device not available."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.async_open_session = AsyncMock(return_value=None)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_device

        connection = MagicMock()
        msg = {"id": 21, "type": "eppgrid/subscribe_device", "mac": "00:00:00:00:00:00"}

        await call_async_handler(hass, websocket_subscribe_device, connection, msg)

        connection.send_error.assert_called_once_with(21, "not_found", "Device not available")

    async def test_subscribe_raw_targets_no_session(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """subscribe_raw_targets returns error without active session."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        msg = {"id": 22, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        connection.send_error.assert_called_once_with(
            22, "no_session", "No active session — call subscribe_device first"
        )

    async def test_subscribe_raw_targets_with_session(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """subscribe_raw_targets registers state callback and unsubscribe."""
        mock_dm = await setup_integration(hass, config_entry)

        mock_device_conn = MagicMock()
        mock_device_conn._entities = []
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 23, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        connection.send_result.assert_called_once_with(23)
        mock_device_conn.subscribe_states.assert_called_once()
        assert 23 in connection.subscriptions

    async def test_subscribe_grid_targets_no_session(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """subscribe_grid_targets returns error without active session."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        msg = {"id": 24, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        connection.send_error.assert_called_once()

    async def test_subscribe_grid_targets_with_session(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """subscribe_grid_targets registers state callback and unsubscribe."""
        mock_dm = await setup_integration(hass, config_entry)

        mock_device_conn = MagicMock()
        mock_device_conn._entities = []
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 25, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        connection.send_result.assert_called_once_with(25)
        mock_device_conn.subscribe_states.assert_called_once()
        assert 25 in connection.subscriptions


class TestUpdateFirmware:
    """Tests for eppgrid/update_firmware."""

    async def test_update_firmware_calls_install(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """update_firmware triggers OTA via hass.services.async_call."""
        from homeassistant.helpers import device_registry as dr
        from homeassistant.helpers import entity_registry as er

        mock_dm = await setup_integration(hass, config_entry)

        # Register a real device in the device registry
        dev_reg = dr.async_get(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=config_entry.entry_id,
            identifiers={("eppgrid", "AA:BB:CC:DD:EE:FF")},
            name="EPP Grid",
        )

        mock_dm.devices = {"AA:BB:CC:DD:EE:FF": MagicMock(device_id=device.id)}

        # Register a mock update entity in the entity registry for this device
        ent_reg = er.async_get(hass)
        ent_reg.async_get_or_create(
            domain="update",
            platform="esphome",
            unique_id="device_123_firmware",
            suggested_object_id="epp_firmware",
            config_entry=config_entry,
            device_id=device.id,
        )

        from custom_components.eppgrid.websocket_api import websocket_update_firmware

        connection = MagicMock()
        msg = {"id": 20, "type": "eppgrid/update_firmware", "mac": "AA:BB:CC:DD:EE:FF"}

        with patch("homeassistant.core.ServiceRegistry.async_call", new_callable=AsyncMock) as mock_async_call:
            await call_async_handler(hass, websocket_update_firmware, connection, msg)

        connection.send_result.assert_called_once()
        mock_async_call.assert_awaited_once()
        call_args = mock_async_call.call_args
        assert call_args[0][0] == "update"
        assert call_args[0][1] == "install"
        assert "entity_id" in call_args[0][2]

    async def test_update_firmware_device_not_found(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """update_firmware returns error when device not found."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {}

        from custom_components.eppgrid.websocket_api import websocket_update_firmware

        connection = MagicMock()
        msg = {"id": 21, "type": "eppgrid/update_firmware", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_update_firmware, connection, msg)

        connection.send_error.assert_called_once_with(21, "not_found", "Device not found")

    async def test_update_firmware_no_update_entity(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """update_firmware returns error when no update entity found."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {"AA:BB:CC:DD:EE:FF": MagicMock(device_id="device_123")}

        from custom_components.eppgrid.websocket_api import websocket_update_firmware

        connection = MagicMock()
        msg = {"id": 22, "type": "eppgrid/update_firmware", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_update_firmware, connection, msg)

        connection.send_error.assert_called_once_with(22, "no_update_entity", "No update entity found for device")

    async def test_update_firmware_not_ready(self, hass: HomeAssistant) -> None:
        """update_firmware returns error when integration not loaded."""
        from custom_components.eppgrid.websocket_api import websocket_update_firmware

        connection = MagicMock()
        msg = {"id": 23, "type": "eppgrid/update_firmware", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_update_firmware, connection, msg)

        connection.send_error.assert_called_once_with(23, "not_ready", "Integration not loaded")


class TestNotReadyGuards:
    """Handlers not covered by per-class tests return not_ready when integration not loaded."""

    @pytest.mark.parametrize(
        "handler_name,extra_fields,is_async",
        [
            ("websocket_set_room_layout", {"mac": "AA:BB", "grid_bytes": [], "zone_slots": [], "room_type": "n"}, True),
            ("websocket_list_templates", {}, False),
            ("websocket_save_template", {"name": "t", "template": {}}, True),
            ("websocket_delete_template", {"name": "t"}, True),
            ("websocket_apply_template", {"mac": "AA:BB", "template_name": "t"}, True),
            ("websocket_subscribe_device", {"mac": "AA:BB"}, True),
            ("websocket_subscribe_raw_targets", {"mac": "AA:BB"}, True),
            ("websocket_subscribe_grid_targets", {"mac": "AA:BB"}, True),
            ("websocket_set_entity_enabled", {"mac": "AA:BB", "entity_id": "e", "enabled": True}, False),
            (
                "websocket_set_env_calibration",
                {"mac": "AA:BB", "temperature_offset": 0, "humidity_offset": 0, "illuminance_offset": 0},
                True,
            ),
            ("websocket_set_motion_timeout", {"mac": "AA:BB", "timeout": 5.0}, True),
            ("websocket_set_tracking", {"mac": "AA:BB", "max_range": 6000.0}, True),
            (
                "websocket_set_static_presence",
                {
                    "mac": "AA:BB",
                    "min_range": 0,
                    "max_range": 6000,
                    "trigger_range": 2500,
                    "sustain_sensitivity": 3,
                    "trigger_sensitivity": 5,
                    "timeout": 10,
                    "on_delay": 0,
                    "led_enabled": True,
                },
                True,
            ),
            (
                "websocket_set_pipeline",
                {
                    "mac": "AA:BB",
                    "display_interval_ms": 200,
                    "zone_publish_interval_ms": 1000,
                    "window_duration_ms": 1000,
                },
                True,
            ),
        ],
    )
    async def test_not_ready(self, hass: HomeAssistant, handler_name: str, extra_fields: dict, is_async: bool) -> None:
        """Handler returns not_ready when integration not loaded."""
        import custom_components.eppgrid.websocket_api as ws

        handler = getattr(ws, handler_name)
        connection = MagicMock()
        msg = {"id": 1, "type": f"eppgrid/{handler_name.replace('websocket_', '')}"}
        msg.update(extra_fields)

        if is_async:
            await call_async_handler(hass, handler, connection, msg)
        else:
            handler(hass, connection, msg)

        connection.send_error.assert_called_once_with(1, "not_ready", "Integration not loaded")


class TestSubscriptionCallbacks:
    """Tests for _on_state callbacks in subscribe_raw_targets and subscribe_grid_targets."""

    async def test_raw_targets_on_state_parses_position(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """_on_state in subscribe_raw_targets parses TextSensorState with coordinates."""
        mock_dm = await setup_integration(hass, config_entry)

        # Create mock entities with key and name attributes
        raw0 = MagicMock()
        raw0.key = 100
        raw0.name = "Raw Target 0"
        raw1 = MagicMock()
        raw1.key = 101
        raw1.name = "Raw Target 1"

        mock_device_conn = MagicMock()
        mock_device_conn._entities = [raw0, raw1]
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 30, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        # Get the registered _on_state callback
        on_state = mock_device_conn.subscribe_states.call_args[0][0]

        from aioesphomeapi import TextSensorState

        state = TextSensorState(key=100, state="1500.5,2300.2", missing_state=False)
        on_state(state)

        # Should have sent a message with parsed targets
        connection.send_message.assert_called_once()
        event_data = connection.send_message.call_args[0][0]
        # event_message returns a dict
        assert "targets" in event_data.get("event", event_data)

    async def test_raw_targets_on_state_empty_clears(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Empty state clears raw target to null coordinates."""
        mock_dm = await setup_integration(hass, config_entry)

        raw0 = MagicMock()
        raw0.key = 100
        raw0.name = "Raw Target 0"

        mock_device_conn = MagicMock()
        mock_device_conn._entities = [raw0]
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 31, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.call_args[0][0]

        from aioesphomeapi import TextSensorState

        state = TextSensorState(key=100, state="", missing_state=False)
        on_state(state)

        connection.send_message.assert_called_once()

    async def test_raw_targets_on_state_ignores_non_text(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Non-TextSensorState is ignored."""
        mock_dm = await setup_integration(hass, config_entry)

        raw0 = MagicMock()
        raw0.key = 100
        raw0.name = "Raw Target 0"

        mock_device_conn = MagicMock()
        mock_device_conn._entities = [raw0]
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 32, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.call_args[0][0]

        from aioesphomeapi import BinarySensorState

        state = BinarySensorState(key=100, state=True, missing_state=False)
        on_state(state)

        connection.send_message.assert_not_called()

    async def test_raw_targets_unsub(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Unsubscribe callback removes state subscription."""
        mock_dm = await setup_integration(hass, config_entry)

        mock_device_conn = MagicMock()
        mock_device_conn._entities = []
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 33, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        # Call unsubscribe
        connection.subscriptions[33]()
        mock_device_conn.unsubscribe_states.assert_called_once()

    async def test_grid_targets_on_state_target_position(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """_on_state in subscribe_grid_targets parses target position TextSensorState."""
        mock_dm = await setup_integration(hass, config_entry)

        target0 = MagicMock()
        target0.key = 200
        target0.name = "Target 0 Position"

        mock_device_conn = MagicMock()
        mock_device_conn._entities = [target0]
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 40, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.call_args[0][0]

        from aioesphomeapi import TextSensorState

        # Position with status field
        state = TextSensorState(key=200, state="1500.0,2000.0,active", missing_state=False)
        on_state(state)

        connection.send_message.assert_called_once()
        event_msg = connection.send_message.call_args[0][0]
        event = event_msg.get("event", event_msg)
        assert "targets" in event
        assert "sensors" in event
        assert "zones" in event

    async def test_grid_targets_on_state_empty_position(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Empty position resets target to inactive."""
        mock_dm = await setup_integration(hass, config_entry)

        target0 = MagicMock()
        target0.key = 200
        target0.name = "Target 0 Position"

        mock_device_conn = MagicMock()
        mock_device_conn._entities = [target0]
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 41, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.call_args[0][0]

        from aioesphomeapi import TextSensorState

        state = TextSensorState(key=200, state="", missing_state=False)
        on_state(state)

        connection.send_message.assert_called_once()

    async def test_grid_targets_on_state_zone_state_json(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Zone state JSON is parsed for occupancy and target signal/status."""
        import json

        mock_dm = await setup_integration(hass, config_entry)

        zone_state_entity = MagicMock()
        zone_state_entity.key = 300
        zone_state_entity.name = "Zone State"

        mock_device_conn = MagicMock()
        mock_device_conn._entities = [zone_state_entity]
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 42, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.call_args[0][0]

        from aioesphomeapi import TextSensorState

        zone_json = json.dumps(
            {
                "targets": [
                    {"signal": 80, "status": "active"},
                    {"signal": 0, "status": "inactive"},
                ],
                "zones": {"occupancy": [True, False, False], "tracking": True},
                "frame_count": 42,
                "debug_log": "test debug",
            }
        )
        state = TextSensorState(key=300, state=zone_json, missing_state=False)
        on_state(state)

        # Zone state doesn't trigger send_message directly (only target positions do)
        connection.send_message.assert_not_called()

    async def test_grid_targets_on_state_binary_sensor(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """BinarySensorState updates sensor data."""
        mock_dm = await setup_integration(hass, config_entry)

        occupancy = MagicMock()
        occupancy.key = 400
        occupancy.name = "Occupancy"

        mock_device_conn = MagicMock()
        mock_device_conn._entities = [occupancy]
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 43, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.call_args[0][0]

        from aioesphomeapi import BinarySensorState

        state = BinarySensorState(key=400, state=True, missing_state=False)
        on_state(state)

        # Binary sensor updates don't trigger send_message (only target positions do)
        connection.send_message.assert_not_called()

    async def test_grid_targets_on_state_numeric_sensor(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """SensorState updates numeric sensor data."""
        mock_dm = await setup_integration(hass, config_entry)

        temp = MagicMock()
        temp.key = 500
        temp.name = "Temperature"

        mock_device_conn = MagicMock()
        mock_device_conn._entities = [temp]
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 44, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.call_args[0][0]

        from aioesphomeapi import SensorState

        state = SensorState(key=500, state=22.5, missing_state=False)
        on_state(state)

        # NaN handling — should not trigger send_message either
        nan_state = SensorState(key=500, state=float("nan"), missing_state=False)
        on_state(nan_state)

        # Numeric sensor updates don't trigger send_message (only target positions do)
        connection.send_message.assert_not_called()

    async def test_grid_targets_unsub(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Unsubscribe callback removes state subscription."""
        mock_dm = await setup_integration(hass, config_entry)

        mock_device_conn = MagicMock()
        mock_device_conn._entities = []
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 45, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        connection.subscriptions[45]()
        mock_device_conn.unsubscribe_states.assert_called_once()

    async def test_subscribe_device_unsub(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """subscribe_device unsub callback closes session."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_conn = MagicMock()
        mock_dm.async_open_session = AsyncMock(return_value=mock_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_device

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 46, "type": "eppgrid/subscribe_device", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_device, connection, msg)

        # Call the unsub callback
        connection.subscriptions[46]()
        await hass.async_block_till_done()

        mock_dm.async_close_session.assert_called()


class TestUpdateFirmwareError:
    """Test update_firmware exception path."""

    async def test_update_firmware_service_error(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """update_firmware returns error when service call raises."""
        from homeassistant.helpers import device_registry as dr
        from homeassistant.helpers import entity_registry as er

        mock_dm = await setup_integration(hass, config_entry)

        dev_reg = dr.async_get(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=config_entry.entry_id,
            identifiers={("eppgrid", "AA:BB:CC:DD:EE:FF")},
            name="EPP Grid",
        )

        mock_dm.devices = {"AA:BB:CC:DD:EE:FF": MagicMock(device_id=device.id)}

        ent_reg = er.async_get(hass)
        ent_reg.async_get_or_create(
            domain="update",
            platform="esphome",
            unique_id="device_err_firmware",
            suggested_object_id="epp_firmware_err",
            config_entry=config_entry,
            device_id=device.id,
        )

        from custom_components.eppgrid.websocket_api import websocket_update_firmware

        connection = MagicMock()
        msg = {"id": 50, "type": "eppgrid/update_firmware", "mac": "AA:BB:CC:DD:EE:FF"}

        with patch(
            "homeassistant.core.ServiceRegistry.async_call",
            new_callable=AsyncMock,
            side_effect=Exception("OTA failed"),
        ):
            await call_async_handler(hass, websocket_update_firmware, connection, msg)

        connection.send_error.assert_called_once()
        args = connection.send_error.call_args[0]
        assert args[1] == "update_failed"
        assert "OTA failed" in args[2]


class TestProtocolVersionGuard:
    """Config commands are blocked when protocol versions don't match."""

    async def test_set_setup_blocked_when_firmware_behind(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_setup returns error when firmware protocol is behind."""
        from custom_components.eppgrid.device_manager import ManagedDevice

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:FF": ManagedDevice(
                mac="AA:BB:CC:DD:EE:FF",
                name="EPP",
                host="192.168.1.50",
            )
        }
        mock_dm.read_config_protocol.return_value = 0  # behind

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        connection = MagicMock()
        msg = {
            "id": 10,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }

        await call_async_handler(hass, websocket_set_setup, connection, msg)

        connection.send_error.assert_called_once()
        args = connection.send_error.call_args[0]
        assert args[1] == "firmware_behind"

    async def test_set_setup_blocked_when_firmware_ahead(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_setup returns error when firmware protocol is ahead."""
        from custom_components.eppgrid.device_manager import ManagedDevice

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:FF": ManagedDevice(
                mac="AA:BB:CC:DD:EE:FF",
                name="EPP",
                host="192.168.1.50",
            )
        }
        mock_dm.read_config_protocol.return_value = 99  # ahead

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        connection = MagicMock()
        msg = {
            "id": 11,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }

        await call_async_handler(hass, websocket_set_setup, connection, msg)

        connection.send_error.assert_called_once()
        args = connection.send_error.call_args[0]
        assert args[1] == "firmware_ahead"

    async def test_set_setup_allowed_when_compatible(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_setup proceeds normally when protocol versions match."""
        from custom_components.eppgrid.const import CONFIG_PROTOCOL_VERSION
        from custom_components.eppgrid.device_manager import ManagedDevice

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:FF": ManagedDevice(
                mac="AA:BB:CC:DD:EE:FF",
                name="EPP",
                host="192.168.1.50",
            )
        }
        mock_dm.read_config_protocol.return_value = CONFIG_PROTOCOL_VERSION

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        connection = MagicMock()
        msg = {
            "id": 12,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }

        await call_async_handler(hass, websocket_set_setup, connection, msg)

        # Should not send error — proceeds to save config
        connection.send_error.assert_not_called()
        connection.send_result.assert_called_once()

    @pytest.mark.parametrize(
        "handler_name,extra_fields",
        [
            (
                "websocket_set_room_layout",
                {"grid_bytes": [0] * 400, "zone_slots": [None] * 7, "room_type": "normal"},
            ),
            (
                "websocket_set_entity_enabled",
                {"entity_id": "binary_sensor.test", "enabled": True},
            ),
            (
                "websocket_set_env_calibration",
                {"temperature_offset": 0.0, "humidity_offset": 0.0, "illuminance_offset": 0.0},
            ),
            ("websocket_set_motion_timeout", {"timeout": 5.0}),
            ("websocket_set_tracking", {"max_range": 6000.0}),
            (
                "websocket_set_static_presence",
                {
                    "min_range": 0.0,
                    "max_range": 6000.0,
                    "trigger_range": 2500.0,
                    "sustain_sensitivity": 3,
                    "trigger_sensitivity": 5,
                    "timeout": 10.0,
                    "on_delay": 0.0,
                    "led_enabled": True,
                },
            ),
            (
                "websocket_set_pipeline",
                {"display_interval_ms": 200, "zone_publish_interval_ms": 1000, "window_duration_ms": 1000},
            ),
        ],
    )
    async def test_protocol_guard_blocks_all_config_commands(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
        handler_name: str,
        extra_fields: dict,
    ) -> None:
        """All config commands are blocked when firmware protocol is behind."""
        from custom_components.eppgrid.device_manager import ManagedDevice

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:FF": ManagedDevice(
                mac="AA:BB:CC:DD:EE:FF",
                name="EPP",
                host="192.168.1.50",
            )
        }
        mock_dm.read_config_protocol.return_value = 0

        import custom_components.eppgrid.websocket_api as ws

        handler = getattr(ws, handler_name)
        connection = MagicMock()
        msg = {"id": 100, "type": f"eppgrid/{handler_name.replace('websocket_', '')}", "mac": "AA:BB:CC:DD:EE:FF"}
        msg.update(extra_fields)

        if hasattr(handler, "__wrapped__"):
            # async_response handlers
            await call_async_handler(hass, handler, connection, msg)
        else:
            # sync handlers
            handler(hass, connection, msg)

        connection.send_error.assert_called_once()
        args = connection.send_error.call_args[0]
        assert args[1] == "firmware_behind"
