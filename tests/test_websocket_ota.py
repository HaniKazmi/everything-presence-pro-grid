"""Tests for OTA progress WebSocket subscription."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid import async_setup_entry
from custom_components.eppgrid import websocket_api as ws_module


@pytest.fixture(autouse=True)
def _clear_registered():
    ws_module._REGISTERED.clear()


async def setup_integration(hass: HomeAssistant, config_entry: MockConfigEntry) -> MagicMock:
    from custom_components.eppgrid.const import FIRMWARE_VERSION

    if hass.http is None:
        hass.http = MagicMock()

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
        mock_dm._push_pipeline_to_device = AsyncMock()
        mock_dm._entity_update_macs = set()
        mock_dm.async_update_zone_entities = AsyncMock()
        mock_dm.async_open_session = AsyncMock(return_value=None)
        mock_dm.async_close_session = AsyncMock()
        mock_dm.get_session = MagicMock(return_value=None)
        mock_dm.read_firmware_version.return_value = FIRMWARE_VERSION
        mock_dm._build_flags = {}

        await async_setup_entry(hass, config_entry)

    return mock_dm


async def call_async_handler(hass, handler, connection, msg):
    handler(hass, connection, msg)
    await hass.async_block_till_done()


def make_mock_device_conn(entities=None):
    conn = MagicMock()
    conn.connected = True
    conn._entities = entities or []
    conn.subscribe_states = MagicMock()
    conn.unsubscribe_states = MagicMock()
    conn.add_log_callback = MagicMock()
    conn.remove_log_callback = MagicMock()
    return conn


def make_update_state(*, in_progress=False, has_progress=False, progress=0.0,
                      current_version="0.89.0", latest_version="0.90.0-alpha",
                      key=1, missing_state=False):
    from aioesphomeapi import UpdateState

    return UpdateState(
        key=key,
        missing_state=missing_state,
        in_progress=in_progress,
        has_progress=has_progress,
        progress=progress,
        current_version=current_version,
        latest_version=latest_version,
    )


class TestSubscribeOtaProgress:

    async def test_sends_error_when_integration_not_loaded(
        self, hass: HomeAssistant, config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress
        hass.data.pop("eppgrid", None)
        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        connection.send_error.assert_called_once_with(1, "not_ready", "Integration not loaded")

    async def test_sends_error_when_no_session(
        self, hass: HomeAssistant, config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.get_session.return_value = None
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress
        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        connection.send_error.assert_called_once_with(1, "no_session", "No active session for device")

    async def test_subscribes_and_sends_result(
        self, hass: HomeAssistant, config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.get_session.return_value = device_conn
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress
        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        device_conn.subscribe_states.assert_called_once()
        connection.send_result.assert_called_once_with(1)
        assert 1 in connection.subscriptions

    async def test_forwards_progress_events(
        self, hass: HomeAssistant, config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.get_session.return_value = device_conn
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress
        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        on_state = device_conn.subscribe_states.call_args[0][0]
        state = make_update_state(in_progress=True, has_progress=True, progress=65.0)
        on_state(state)
        from homeassistant.components.websocket_api import event_message
        connection.send_message.assert_called_once()
        sent = connection.send_message.call_args[0][0]
        assert sent == event_message(1, {"state": "updating", "progress": 65.0})

    async def test_forwards_indeterminate_progress(
        self, hass: HomeAssistant, config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.get_session.return_value = device_conn
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress
        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        on_state = device_conn.subscribe_states.call_args[0][0]
        state = make_update_state(in_progress=True, has_progress=False)
        on_state(state)
        from homeassistant.components.websocket_api import event_message
        connection.send_message.assert_called_once()
        sent = connection.send_message.call_args[0][0]
        assert sent == event_message(1, {"state": "updating", "progress": None})

    async def test_ignores_non_update_states(
        self, hass: HomeAssistant, config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.get_session.return_value = device_conn
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress
        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        on_state = device_conn.subscribe_states.call_args[0][0]
        from aioesphomeapi import SensorState
        sensor_state = SensorState(key=1, state=42.0, missing_state=False)
        on_state(sensor_state)
        connection.send_message.assert_not_called()

    async def test_sends_success_on_version_match(
        self, hass: HomeAssistant, config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.get_session.return_value = device_conn
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress
        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        on_state = device_conn.subscribe_states.call_args[0][0]
        on_state(make_update_state(in_progress=True, has_progress=True, progress=100.0))
        on_state(make_update_state(in_progress=False, current_version="0.90.0-alpha", latest_version="0.90.0-alpha"))
        from homeassistant.components.websocket_api import event_message
        calls = [c[0][0] for c in connection.send_message.call_args_list]
        assert event_message(1, {"state": "success", "version": "0.90.0-alpha"}) in calls

    async def test_sends_error_on_version_mismatch(
        self, hass: HomeAssistant, config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.get_session.return_value = device_conn
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress
        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        on_state = device_conn.subscribe_states.call_args[0][0]
        on_state(make_update_state(in_progress=True, has_progress=True, progress=30.0))
        on_state(make_update_state(in_progress=False, current_version="0.89.0", latest_version="0.90.0-alpha"))
        from homeassistant.components.websocket_api import event_message
        calls = [c[0][0] for c in connection.send_message.call_args_list]
        assert event_message(1, {"state": "error", "message": "Update failed \u2014 firmware version unchanged"}) in calls

    async def test_unsubscribe_cleans_up(
        self, hass: HomeAssistant, config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.get_session.return_value = device_conn
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress
        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        on_state = device_conn.subscribe_states.call_args[0][0]
        on_log = device_conn.add_log_callback.call_args[0][0]
        connection.subscriptions[1]()
        device_conn.unsubscribe_states.assert_called_once_with(on_state)
        device_conn.remove_log_callback.assert_called_once_with(on_log)

    async def test_forwards_device_log_errors(
        self, hass: HomeAssistant, config_entry: MockConfigEntry,
    ) -> None:
        """When device logs an http_request error, emit error event immediately."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.get_session.return_value = device_conn
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress
        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_log = device_conn.add_log_callback.call_args[0][0]

        # Simulate an ESPHome error log message
        from aioesphomeapi import LogLevel as ESPLogLevel
        log_msg = MagicMock()
        log_msg.level = ESPLogLevel.LOG_LEVEL_ERROR
        log_msg.message = "[E][http_request.update:098][update_task]: Failed to fetch manifest from https://example.com/manifest.json"
        on_log(log_msg)

        from homeassistant.components.websocket_api import event_message
        connection.send_message.assert_called_once()
        sent = connection.send_message.call_args[0][0]
        assert sent == event_message(1, {
            "state": "error",
            "message": "Failed to fetch manifest from https://example.com/manifest.json",
        })

    async def test_ignores_non_http_request_log_errors(
        self, hass: HomeAssistant, config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.get_session.return_value = device_conn
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress
        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_log = device_conn.add_log_callback.call_args[0][0]

        from aioesphomeapi import LogLevel as ESPLogLevel
        log_msg = MagicMock()
        log_msg.level = ESPLogLevel.LOG_LEVEL_ERROR
        log_msg.message = "[E][wifi:123]: Connection lost"
        on_log(log_msg)

        connection.send_message.assert_not_called()

    async def test_ignores_cleared_error_flag_log(
        self, hass: HomeAssistant, config_entry: MockConfigEntry,
    ) -> None:
        """The 'cleared Error flag' log from http_request is not an actual error."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.get_session.return_value = device_conn
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress
        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_log = device_conn.add_log_callback.call_args[0][0]

        from aioesphomeapi import LogLevel as ESPLogLevel
        log_msg = MagicMock()
        log_msg.level = ESPLogLevel.LOG_LEVEL_ERROR
        log_msg.message = "[E][component:433]: http_request.update cleared Error flag"
        on_log(log_msg)

        connection.send_message.assert_not_called()
