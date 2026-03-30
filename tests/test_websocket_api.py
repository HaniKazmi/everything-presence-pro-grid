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

    async def test_get_config_includes_entity_states(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """get_config includes entity enabled/disabled states from HA registry."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {}}
        mock_dm._store.get_device = MagicMock(return_value={"settings": {}})

        from custom_components.eppgrid.websocket_api import websocket_get_config

        entity_states = {"room_occupancy": True, "zone_presence": False}

        with patch(
            "custom_components.eppgrid.websocket_api._get_entity_states",
            return_value=entity_states,
        ) as mock_get_entities:
            connection = MagicMock()
            msg = {"id": 2, "type": "eppgrid/get_config", "mac": "AA:BB:CC:DD:EE:FF"}

            websocket_get_config(hass, connection, msg)

            mock_get_entities.assert_called_once_with(hass, "AA:BB:CC:DD:EE:FF")
            result = connection.send_result.call_args[0]
            assert result[1]["config"]["entities"] == entity_states

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
    """Tests for the unified eppgrid/set_settings command."""

    async def test_set_settings_stores_all_values(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_settings stores all values under device_config['settings']."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 11,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": -1.5,
            "humidity_offset": 2.0,
            "illuminance_offset": -10.0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 4.0,
            "static_auto_distance": False,
            "static_min_distance": 0.3,
            "static_max_distance": 8.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": 0.0,
            "entities": {"room_occupancy": True, "zone_presence": False},
        }

        await call_async_handler(hass, websocket_set_settings, connection, msg)

        settings = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert settings["temperature_offset"] == -1.5
        assert settings["humidity_offset"] == 2.0
        assert settings["illuminance_offset"] == -10.0
        assert settings["motion_timeout"] == 5.0
        assert settings["target_auto_distance"] is True
        assert settings["target_max_distance"] == 4.0
        assert settings["static_auto_distance"] is False
        assert settings["static_min_distance"] == 0.3
        assert settings["static_max_distance"] == 8.0
        assert settings["static_trigger_threshold"] == 3
        assert settings["static_renew_threshold"] == 3
        assert settings["static_timeout"] == 30.0
        assert settings["static_on_delay"] == 0.0
        mock_dm._store.async_save.assert_awaited()
        mock_dm._push_config_to_device.assert_awaited_with("AA:BB:CC:DD:EE:FF")
        connection.send_result.assert_called_once_with(11)

    async def test_set_settings_applies_entity_changes(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_settings calls _apply_entity_states when entities dict is provided."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        with patch(
            "custom_components.eppgrid.websocket_api._apply_entity_states"
        ) as mock_apply:
            connection = MagicMock()
            msg = {
                "id": 11,
                "type": "eppgrid/set_settings",
                "mac": "AA:BB:CC:DD:EE:FF",
                "temperature_offset": -1.5,
                "humidity_offset": 2.0,
                "illuminance_offset": -10.0,
                "motion_timeout": 5.0,
                "target_auto_distance": True,
                "target_max_distance": 4.0,
                "static_auto_distance": False,
                "static_min_distance": 0.3,
                "static_max_distance": 8.0,
                "static_trigger_threshold": 3,
                "static_renew_threshold": 3,
                "static_timeout": 30.0,
                "static_on_delay": 0.0,
                "entities": {"room_occupancy": True, "env_illuminance": False},
            }

            await call_async_handler(hass, websocket_set_settings, connection, msg)

            mock_apply.assert_called_once_with(
                hass, "AA:BB:CC:DD:EE:FF", {"room_occupancy": True, "env_illuminance": False}
            )

    async def test_set_settings_zone_presence_false_does_not_reenable_zone0(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """zone_presence=false should NOT call async_update_zone_entities (which re-enables zone 0)."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 11,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": 0,
            "humidity_offset": 0,
            "illuminance_offset": 0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 6.0,
            "static_auto_distance": True,
            "static_min_distance": 0.3,
            "static_max_distance": 16.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": 0.0,
            "entities": {"zone_presence": False},
        }

        with patch(
            "custom_components.eppgrid.websocket_api._apply_entity_states"
        ):
            mock_dm.async_update_zone_entities = AsyncMock()
            await call_async_handler(hass, websocket_set_settings, connection, msg)

            # async_update_zone_entities should NOT be called when disabling zones
            # — _apply_entity_states already disabled all zone entities
            mock_dm.async_update_zone_entities.assert_not_awaited()

    async def test_set_settings_zone_presence_true_calls_update_zone_entities(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """zone_presence=true should call async_update_zone_entities with layout."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 11,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": 0,
            "humidity_offset": 0,
            "illuminance_offset": 0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 6.0,
            "static_auto_distance": True,
            "static_min_distance": 0.3,
            "static_max_distance": 16.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": 0.0,
            "entities": {"zone_presence": True},
        }

        with patch(
            "custom_components.eppgrid.websocket_api._apply_entity_states"
        ):
            mock_dm.async_update_zone_entities = AsyncMock()
            await call_async_handler(hass, websocket_set_settings, connection, msg)

            mock_dm.async_update_zone_entities.assert_awaited_once()

    async def test_set_settings_entities_not_stored(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """entities dict from the message is NOT stored in device_config['settings']."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 11,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": -1.5,
            "humidity_offset": 2.0,
            "illuminance_offset": -10.0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 4.0,
            "static_auto_distance": False,
            "static_min_distance": 0.3,
            "static_max_distance": 8.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": 0.0,
            "entities": {"room_occupancy": True, "zone_presence": False},
        }

        await call_async_handler(hass, websocket_set_settings, connection, msg)

        settings = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert "entities" not in settings

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


class TestEntityMapping:
    """Tests for entity object_id mapping with real unique_id patterns."""

    def test_object_id_extraction(self) -> None:
        """_object_id_from_unique_id extracts the part after the last dash."""
        from custom_components.eppgrid.websocket_api import _object_id_from_unique_id

        assert _object_id_from_unique_id("E0:8C:FE:D3:FD:C8-binary_sensor-occupancy") == "occupancy"
        assert _object_id_from_unique_id("E0:8C:FE:D3:FD:C8-binary_sensor-motion_presence") == "motion_presence"
        assert _object_id_from_unique_id("E0:8C:FE:D3:FD:C8-binary_sensor-zone_0_occupancy") == "zone_0_occupancy"
        assert _object_id_from_unique_id("E0:8C:FE:D3:FD:C8-sensor-temperature") == "temperature"
        assert _object_id_from_unique_id("E0:8C:FE:D3:FD:C8-text_sensor-target_0_position") == "target_0_position"

    def test_entity_key_mapping_room_entities(self) -> None:
        """Room-level entities map to their correct keys."""
        from custom_components.eppgrid.websocket_api import _entity_key_for_object_id

        assert _entity_key_for_object_id("occupancy") == "room_occupancy"
        assert _entity_key_for_object_id("static_presence") == "room_static_presence"
        assert _entity_key_for_object_id("motion_presence") == "room_motion_presence"
        assert _entity_key_for_object_id("target_presence") == "room_target_presence"

    def test_entity_key_mapping_env_sensors(self) -> None:
        """Environmental sensors map to their correct keys."""
        from custom_components.eppgrid.websocket_api import _entity_key_for_object_id

        assert _entity_key_for_object_id("temperature") == "env_temperature"
        assert _entity_key_for_object_id("humidity") == "env_humidity"
        assert _entity_key_for_object_id("illuminance") == "env_illuminance"

    def test_entity_key_mapping_zone_entities(self) -> None:
        """Zone occupancy entities map to zone_presence category."""
        from custom_components.eppgrid.websocket_api import _entity_key_for_object_id

        assert _entity_key_for_object_id("zone_0_occupancy") == "zone_presence"
        assert _entity_key_for_object_id("zone_7_occupancy") == "zone_presence"
        # zone_tracking is a separate entity, not a zone occupancy
        assert _entity_key_for_object_id("zone_tracking") is None

    def test_entity_key_mapping_target_entities(self) -> None:
        """Target entities map to target_xy category."""
        from custom_components.eppgrid.websocket_api import _entity_key_for_object_id

        assert _entity_key_for_object_id("target_0_position") == "target_xy"
        assert _entity_key_for_object_id("target_2_position") == "target_xy"

    def test_entity_key_mapping_underscore_format(self) -> None:
        """Full unique_ids with underscore format (older ESPHome) map correctly."""
        from custom_components.eppgrid.websocket_api import _entity_key_for_object_id

        # Room-level entities
        assert _entity_key_for_object_id("esphome_aabbccddeeff_occupancy") == "room_occupancy"
        assert _entity_key_for_object_id("esphome_aabbccddeeff_static_presence") == "room_static_presence"
        assert _entity_key_for_object_id("esphome_aabbccddeeff_motion_presence") == "room_motion_presence"
        assert _entity_key_for_object_id("esphome_aabbccddeeff_temperature") == "env_temperature"
        # Zone entities
        assert _entity_key_for_object_id("esphome_aabbccddeeff_zone_0_occupancy") == "zone_presence"
        assert _entity_key_for_object_id("esphome_aabbccddeeff_zone_7_occupancy") == "zone_presence"
        # Target entities
        assert _entity_key_for_object_id("esphome_aabbccddeeff_target_0_position") == "target_xy"

    def test_entity_key_mapping_unknown(self) -> None:
        """Unknown object_ids return None."""
        from custom_components.eppgrid.websocket_api import _entity_key_for_object_id

        assert _entity_key_for_object_id("config_protocol") is None
        assert _entity_key_for_object_id("zone_engine_version") is None
        assert _entity_key_for_object_id("esphome_aabbccddeeff_zone_engine_version") is None
        assert _entity_key_for_object_id("led") is None
        assert _entity_key_for_object_id("relay_output") is None


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

        connection.send_error.assert_called_once_with(25, "connection_failed", "Failed to connect to device")

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
                "websocket_set_settings",
                {
                    "mac": "AA:BB",
                    "temperature_offset": 0,
                    "humidity_offset": 0,
                    "illuminance_offset": 0,
                    "motion_timeout": 5.0,
                    "target_auto_distance": True,
                    "target_max_distance": 4.0,
                    "static_auto_distance": False,
                    "static_min_distance": 0.3,
                    "static_max_distance": 8.0,
                    "static_trigger_threshold": 3,
                    "static_renew_threshold": 3,
                    "static_timeout": 30.0,
                    "static_on_delay": 0.0,
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
            (
                "websocket_set_detection_preview",
                {
                    "mac": "AA:BB",
                    "target_max_distance": 3.0,
                    "static_min_distance": 0.5,
                    "static_max_distance": 6.0,
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

        # Zone state now triggers send_message so sensor state changes
        # appear in the detection log without delay
        connection.send_message.assert_called_once()
        event = connection.send_message.call_args[0][0]
        assert event["event"]["zones"]["debug_log"] == "test debug"
        assert event["event"]["sensors"]["target_presence"] is True

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


class TestWebSocketDetectionPreview:
    """Tests for eppgrid/set_detection_preview."""

    async def test_set_detection_preview_pushes_without_saving(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_detection_preview pushes merged preview to device without persisting."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm._store.devices["AA:BB:CC:DD:EE:FF"] = {
            "settings": {
                "static_trigger_threshold": 5,
                "static_renew_threshold": 4,
                "static_timeout": 20.0,
                "static_on_delay": 1.0,
            }
        }

        mock_session = MagicMock()
        mock_session.async_push_detection_preview = AsyncMock()
        mock_dm.get_session.return_value = mock_session

        from custom_components.eppgrid.websocket_api import websocket_set_detection_preview

        connection = MagicMock()
        msg = {
            "id": 20,
            "type": "eppgrid/set_detection_preview",
            "mac": "AA:BB:CC:DD:EE:FF",
            "target_max_distance": 3.0,
            "static_min_distance": 0.5,
            "static_max_distance": 6.0,
        }

        await call_async_handler(hass, websocket_set_detection_preview, connection, msg)

        # Verify merged preview was pushed (preview distances + stored non-distance settings)
        mock_session.async_push_detection_preview.assert_awaited_once()
        preview = mock_session.async_push_detection_preview.call_args[0][0]
        assert preview["target_max_distance"] == 3.0
        assert preview["static_min_distance"] == 0.5
        assert preview["static_max_distance"] == 6.0
        assert preview["static_trigger_threshold"] == 5
        assert preview["static_renew_threshold"] == 4
        assert preview["static_timeout"] == 20.0
        assert preview["static_on_delay"] == 1.0

        # Must NOT persist
        mock_dm._store.async_save.assert_not_awaited()

        connection.send_result.assert_called_once_with(20)

    async def test_set_detection_preview_no_session(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_detection_preview is a no-op when no session exists."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.get_session.return_value = None

        from custom_components.eppgrid.websocket_api import websocket_set_detection_preview

        connection = MagicMock()
        msg = {
            "id": 20,
            "type": "eppgrid/set_detection_preview",
            "mac": "AA:BB:CC:DD:EE:FF",
            "target_max_distance": 3.0,
            "static_min_distance": 0.5,
            "static_max_distance": 6.0,
        }

        await call_async_handler(hass, websocket_set_detection_preview, connection, msg)

        connection.send_result.assert_called_once_with(20)


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
                "websocket_set_settings",
                {
                    "temperature_offset": 0.0,
                    "humidity_offset": 0.0,
                    "illuminance_offset": 0.0,
                    "motion_timeout": 5.0,
                    "target_auto_distance": True,
                    "target_max_distance": 4.0,
                    "static_auto_distance": False,
                    "static_min_distance": 0.3,
                    "static_max_distance": 8.0,
                    "static_trigger_threshold": 3,
                    "static_renew_threshold": 3,
                    "static_timeout": 30.0,
                    "static_on_delay": 0.0,
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
