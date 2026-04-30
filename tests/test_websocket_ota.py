"""Tests for OTA progress WebSocket subscription."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid import async_setup_entry
from custom_components.eppgrid import websocket_api as ws_module
from custom_components.eppgrid.const import DOMAIN


@pytest.fixture(autouse=True)
def _clear_registered():
    ws_module._REGISTERED.clear()


async def setup_integration(hass: HomeAssistant, config_entry: MockConfigEntry) -> MagicMock:
    from custom_components.eppgrid.const import FIRMWARE_VERSION

    if hass.http is None:
        hass.http = MagicMock()

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=test",
        ),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        mock_dm.async_stop = AsyncMock()
        mock_dm._store = MagicMock()
        mock_dm._store.devices = {}
        mock_dm._store.configurations = {}
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


def make_mock_device_conn(entities=None, services=None):
    conn = MagicMock()
    conn.connected = True
    conn._entities = entities or []
    conn.subscribe_states = MagicMock()
    conn.unsubscribe_states = MagicMock()
    conn.add_log_callback = MagicMock()
    conn.remove_log_callback = MagicMock()
    # By default, expose epp_set_log_level so subscribe_ota_progress can bump
    # the device's log level. Pass services={} to simulate older firmware
    # without the action.
    if services is None:
        services = {"epp_set_log_level": MagicMock()}
    conn._services = services
    conn._client = MagicMock()
    conn._client.execute_service = AsyncMock()
    return conn


def make_update_state(
    *,
    in_progress=False,
    has_progress=False,
    progress=0.0,
    current_version="0.89.0",
    latest_version="0.90.0-alpha",
    key=1,
    missing_state=False,
):
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
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        await setup_integration(hass, config_entry)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        hass.data.pop("eppgrid", None)
        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        connection.send_error.assert_called_once_with(
            1,
            "not_ready",
            "Integration not loaded",
            translation_domain=DOMAIN,
            translation_key="integration_not_loaded",
        )

    async def test_sends_error_when_no_session(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.get_session.return_value = None
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        connection.send_error.assert_called_once_with(
            1,
            "no_session",
            "Device not available",
            translation_domain=DOMAIN,
            translation_key="device_not_available",
        )

    async def test_subscribes_and_sends_result(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
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

    async def test_bumps_device_log_level_to_error_on_subscribe(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """The firmware silences logs to NONE on boot to keep API traffic low.
        That means the integration's existing ERROR-log surface in _on_log
        never fires — even fatal OTA failures stay invisible. Bumping the
        device's system log level to Error when the user opens the OTA panel
        keeps the surface working without flooding the API in steady state.
        """
        log_svc = MagicMock()
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn(services={"epp_set_log_level": log_svc})
        mock_dm.get_session.return_value = device_conn
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        device_conn._client.execute_service.assert_awaited_once_with(log_svc, {"category": "system", "level": "Error"})

    async def test_skips_log_bump_when_service_missing(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Older firmware does not expose epp_set_log_level. Subscribe must
        still succeed (silently no-op the bump) instead of erroring out."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn(services={})
        mock_dm.get_session.return_value = device_conn
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        device_conn._client.execute_service.assert_not_awaited()
        connection.send_result.assert_called_once_with(1)

    async def test_forwards_progress_events(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
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
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
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
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
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
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
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
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
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
        assert (
            event_message(
                1,
                {
                    "state": "error",
                    "message": "Update failed \u2014 firmware version unchanged",
                    "error_key": "flasher.errors.ota_failed_version_unchanged",
                },
            )
            in calls
        )

    async def test_unsubscribe_cleans_up(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
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
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
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
        log_msg.message = (
            "[E][http_request.update:098][update_task]: Failed to fetch manifest from https://example.com/manifest.json"
        )
        on_log(log_msg)

        from homeassistant.components.websocket_api import event_message

        connection.send_message.assert_called_once()
        sent = connection.send_message.call_args[0][0]
        assert sent == event_message(
            1,
            {
                "state": "error",
                "message": "Failed to fetch manifest from https://example.com/manifest.json",
            },
        )

    async def test_ignores_non_http_request_log_errors(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
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

    async def test_forwards_http_request_idf_errors(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Real failure mode: when the OTA bin fetch fails at the IDF HTTP
        client layer, the actionable log line is tagged http_request.idf,
        not http_request.ota / .update. Captured live during the
        cross-origin-redirect heap exhaustion that motivated this PR.
        """
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
        log_msg.message = "[E][http_request.idf:133]: HTTP Request failed: ESP_ERR_HTTP_CONNECT"
        on_log(log_msg)

        from homeassistant.components.websocket_api import event_message

        connection.send_message.assert_called_once()
        sent = connection.send_message.call_args[0][0]
        assert sent == event_message(
            1,
            {"state": "error", "message": "HTTP Request failed: ESP_ERR_HTTP_CONNECT"},
        )

    async def test_forwards_actionable_set_error_flag_messages(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Component-level error flags carry the actionable failure message
        as a suffix, e.g. `http_request.update set Error flag: Failed to
        install firmware`. The previous filter blanket-skipped any line
        containing 'set Error flag', dropping these. Forward them when the
        suffix is non-trivial.
        """
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
        log_msg.message = "[E][component:420]: http_request.update set Error flag: Failed to install firmware"
        on_log(log_msg)

        from homeassistant.components.websocket_api import event_message

        connection.send_message.assert_called_once()
        sent = connection.send_message.call_args[0][0]
        assert sent == event_message(
            1,
            {
                "state": "error",
                "message": "http_request.update set Error flag: Failed to install firmware",
            },
        )

    async def test_ignores_unspecified_set_error_flag(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """The vague `http_request set Error flag: unspecified` line carries
        no actionable detail and is emitted alongside the more specific lines.
        Drop it so the user sees the useful message, not the noise."""
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
        log_msg.message = "[E][component:420]: http_request set Error flag: unspecified"
        on_log(log_msg)

        connection.send_message.assert_not_called()

    async def test_ignores_cleared_error_flag(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Component recovery noise; existing behaviour preserved."""
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
        log_msg.message = "[E][component:420]: http_request.update cleared Error flag"
        on_log(log_msg)

        connection.send_message.assert_not_called()

    async def test_subscribes_logs_when_unsub_logs_is_none(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """When device_conn._unsub_logs is None, subscribe_logs is called."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        device_conn._unsub_logs = None
        device_conn.subscribe_logs = MagicMock()
        mock_dm.get_session.return_value = device_conn
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        device_conn.subscribe_logs.assert_called_once()

    async def test_on_log_ignores_after_done(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Log callback is ignored once a terminal event has been sent."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.get_session.return_value = device_conn
        from aioesphomeapi import LogLevel as ESPLogLevel

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_state = device_conn.subscribe_states.call_args[0][0]
        on_log = device_conn.add_log_callback.call_args[0][0]

        # Send progress then success to mark done
        on_state(make_update_state(in_progress=True, has_progress=True, progress=100.0))
        on_state(make_update_state(in_progress=False, current_version="0.90.0-alpha", latest_version="0.90.0-alpha"))
        connection.send_message.reset_mock()

        # Now send a log — should be ignored since done=True
        log_msg = MagicMock()
        log_msg.level = ESPLogLevel.LOG_LEVEL_ERROR
        log_msg.message = "[E][http_request.ota:100]: Some error"
        on_log(log_msg)
        connection.send_message.assert_not_called()

    async def test_on_log_ignores_non_error_level(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Log callback ignores non-ERROR level messages."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.get_session.return_value = device_conn
        from aioesphomeapi import LogLevel as ESPLogLevel

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_log = device_conn.add_log_callback.call_args[0][0]

        log_msg = MagicMock()
        log_msg.level = ESPLogLevel.LOG_LEVEL_INFO
        log_msg.message = "[I][http_request.ota:100]: Downloading firmware"
        on_log(log_msg)
        connection.send_message.assert_not_called()

    async def test_on_log_decodes_bytes_message(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Log callback decodes bytes messages."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.get_session.return_value = device_conn
        from aioesphomeapi import LogLevel as ESPLogLevel

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_log = device_conn.add_log_callback.call_args[0][0]

        log_msg = MagicMock()
        log_msg.level = ESPLogLevel.LOG_LEVEL_ERROR
        log_msg.message = b"[E][http_request.ota:100]: OTA download failed"
        on_log(log_msg)

        from homeassistant.components.websocket_api import event_message

        connection.send_message.assert_called_once()
        sent = connection.send_message.call_args[0][0]
        assert sent == event_message(1, {"state": "error", "message": "OTA download failed"})

    async def test_on_log_ignores_empty_message(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Log callback ignores empty messages after stripping."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.get_session.return_value = device_conn
        from aioesphomeapi import LogLevel as ESPLogLevel

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_log = device_conn.add_log_callback.call_args[0][0]

        log_msg = MagicMock()
        log_msg.level = ESPLogLevel.LOG_LEVEL_ERROR
        log_msg.message = "   \n"
        on_log(log_msg)
        connection.send_message.assert_not_called()

    async def test_unsubscribe_closes_opened_session(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """When OTA handler opened the session, unsubscribe closes it."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        # get_session returns None first (no existing session), then the opened one
        mock_dm.get_session.return_value = None
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        # Trigger unsubscribe
        connection.subscriptions[1]()
        await hass.async_block_till_done()
        mock_dm.async_close_session.assert_awaited_once_with("AA:BB:CC:DD:EE:FF")

    async def test_ignores_cleared_error_flag_log(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
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
