"""Tests for flasher WebSocket API commands."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid import async_setup_entry
from custom_components.eppgrid.const import DOMAIN

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def setup_integration(hass: HomeAssistant, config_entry: MockConfigEntry) -> MagicMock:
    """Set up the integration with a mocked DeviceManager and return the mock."""
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
        mock_dm.list_flashable_devices = AsyncMock(return_value=[])
        mock_dm._push_config_to_device = AsyncMock()
        mock_dm._push_pipeline_to_device = AsyncMock()
        mock_dm._entity_update_macs = set()
        mock_dm.async_update_zone_entities = AsyncMock()
        mock_dm.async_open_session = AsyncMock(return_value=None)
        mock_dm.async_close_session = AsyncMock()
        mock_dm.get_session = MagicMock(return_value=None)
        mock_dm.read_firmware_version.return_value = FIRMWARE_VERSION

        await async_setup_entry(hass, config_entry)

    return mock_dm


async def call_async_handler(hass, handler, connection, msg):
    """Call a @websocket_api.async_response handler and flush the task queue."""
    handler(hass, connection, msg)
    await hass.async_block_till_done()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestListFlashableDevices:
    """Tests for eppgrid/list_flashable_devices."""

    async def test_returns_flashable_devices(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """list_flashable_devices returns devices from manager."""
        mock_dm = await setup_integration(hass, config_entry)
        device = {
            "mac": "AA:BB:CC:DD:EE:FF",
            "name": "EPP Device",
            "host": "192.168.1.50",
            "firmware_type": "original",
            "firmware_version": "1.8.0",
            "config_entry_id": "abc123",
        }
        mock_dm.list_flashable_devices = AsyncMock(return_value=[device])

        from custom_components.eppgrid.websocket_api import websocket_list_flashable_devices

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/list_flashable_devices"}

        await call_async_handler(hass, websocket_list_flashable_devices, connection, msg)

        connection.send_result.assert_called_once()
        result = connection.send_result.call_args[0]
        assert result[0] == 1
        assert len(result[1]["devices"]) == 1
        assert result[1]["devices"][0]["mac"] == "AA:BB:CC:DD:EE:FF"
        assert result[1]["firmware_base_url"] == "/api/eppgrid/firmware"
        assert "latest_firmware_version" in result[1]
        assert "integration_version" in result[1]

    async def test_not_ready(self, hass: HomeAssistant) -> None:
        """list_flashable_devices returns error when integration not loaded."""
        from custom_components.eppgrid.websocket_api import websocket_list_flashable_devices

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/list_flashable_devices"}

        await call_async_handler(hass, websocket_list_flashable_devices, connection, msg)

        connection.send_error.assert_called_once_with(
            1,
            "not_ready",
            "Integration not loaded",
            translation_domain=DOMAIN,
            translation_key="integration_not_loaded",
        )


class TestSubscribeFlashableDevices:
    """Tests for eppgrid/subscribe_flashable_devices."""

    async def test_subscribe_sends_initial_list(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """subscribe_flashable_devices sends the current list immediately."""
        mock_dm = await setup_integration(hass, config_entry)
        device = {"mac": "AA:BB:CC:DD:EE:FF", "name": "EPP", "firmware_type": "original"}
        mock_dm.list_flashable_devices = AsyncMock(return_value=[device])
        mock_dm.on_device_list_changed = MagicMock(return_value=lambda: None)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_flashable_devices

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 30, "type": "eppgrid/subscribe_flashable_devices"}

        await call_async_handler(hass, websocket_subscribe_flashable_devices, connection, msg)

        connection.send_result.assert_called_once_with(30)
        connection.send_message.assert_called_once()
        event_msg = connection.send_message.call_args[0][0]
        assert event_msg["id"] == 30
        assert event_msg["event"]["devices"][0]["mac"] == "AA:BB:CC:DD:EE:FF"
        assert "firmware_base_url" in event_msg["event"]
        assert "integration_version" in event_msg["event"]
        assert 30 in connection.subscriptions

    async def test_subscribe_pushes_updates(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Device list change callback pushes updated flashable list."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.list_flashable_devices = AsyncMock(return_value=[])

        captured_cb = None

        def capture_on_changed(cb):
            nonlocal captured_cb
            captured_cb = cb
            return lambda: None

        mock_dm.on_device_list_changed = MagicMock(side_effect=capture_on_changed)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_flashable_devices

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 31, "type": "eppgrid/subscribe_flashable_devices"}

        await call_async_handler(hass, websocket_subscribe_flashable_devices, connection, msg)

        # Simulate device list change
        device = {"mac": "AA:BB:CC:DD:EE:FF", "name": "EPP"}
        mock_dm.list_flashable_devices = AsyncMock(return_value=[device])
        assert captured_cb is not None
        captured_cb()
        await hass.async_block_till_done()

        assert connection.send_message.call_count == 2

    async def test_unsubscribe_removes_callback(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Unsubscribing cleans up the callback."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.list_flashable_devices = AsyncMock(return_value=[])

        unsub_inner = MagicMock()
        mock_dm.on_device_list_changed = MagicMock(return_value=unsub_inner)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_flashable_devices

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 32, "type": "eppgrid/subscribe_flashable_devices"}

        await call_async_handler(hass, websocket_subscribe_flashable_devices, connection, msg)

        connection.subscriptions[32]()
        unsub_inner.assert_called_once()

    async def test_send_update_swallows_post_close_send_message_failure(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """If the WS connection closes mid-send, send_message raises — the
        update task must not propagate that as an unhandled exception, just
        log and move on. Otherwise a stale subscription noises the logs and
        could destabilise other callbacks."""

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.list_flashable_devices = AsyncMock(return_value=[])

        captured_cb = None

        def capture_on_changed(cb):
            nonlocal captured_cb
            captured_cb = cb
            return lambda: None

        mock_dm.on_device_list_changed = MagicMock(side_effect=capture_on_changed)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_flashable_devices

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 33, "type": "eppgrid/subscribe_flashable_devices"}

        await call_async_handler(hass, websocket_subscribe_flashable_devices, connection, msg)

        # Now make send_message raise as if connection was closed
        connection.send_message.side_effect = ConnectionResetError("connection closed")
        captured_cb()
        # Must not raise unhandled — just complete the task.
        await hass.async_block_till_done()

    async def test_unsubscribe_cancels_in_flight_send_update(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """An in-flight `_send_update` triggered by `_on_changed` must be
        cancelled when the subscription unsubs — otherwise it can outlive
        the connection and try to call send_message on a dead channel."""
        import asyncio

        mock_dm = await setup_integration(hass, config_entry)

        list_started = asyncio.Event()
        list_release = asyncio.Event()

        async def slow_list():
            list_started.set()
            await list_release.wait()
            return []

        mock_dm.list_flashable_devices = AsyncMock(side_effect=slow_list)

        captured_cb = None

        def capture_on_changed(cb):
            nonlocal captured_cb
            captured_cb = cb
            return lambda: None

        mock_dm.on_device_list_changed = MagicMock(side_effect=capture_on_changed)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_flashable_devices

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 34, "type": "eppgrid/subscribe_flashable_devices"}

        await call_async_handler(hass, websocket_subscribe_flashable_devices, connection, msg)
        # Initial _send_update has finished by now (it ran with slow_list which
        # would block; release for that one).
        # Wait for the initial send to finish:
        # Actually the initial send is awaited inside the handler, so we need
        # to release it before call_async_handler returns. Adjusting:

        # Re-do with the initial _send_update unblocked.
        list_release.set()
        await hass.async_block_till_done()
        list_release.clear()
        list_started.clear()

        # Now trigger an _on_changed → kicks off a new _send_update task
        captured_cb()
        await list_started.wait()

        # Track whatever task is in flight
        in_flight_tasks = [t for t in asyncio.all_tasks() if "_send_update" in repr(t.get_coro()) and not t.done()]
        assert in_flight_tasks, "expected an in-flight _send_update task"

        # Now unsubscribe
        connection.subscriptions[34]()

        # The pending task must be cancelled (or at least not call send_message
        # after unsub). Release the slow list and verify no send_message after
        # unsub for the new event.
        send_count_before = connection.send_message.call_count
        list_release.set()
        await hass.async_block_till_done()
        # The cancelled task should not have produced a new send_message
        assert connection.send_message.call_count == send_count_before


class TestDeleteEsphomeDevice:
    """Tests for eppgrid/delete_esphome_device."""

    async def test_deletes_config_entry(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """delete_esphome_device calls hass.config_entries.async_remove."""
        await setup_integration(hass, config_entry)

        # Create a real ESPHome config entry so async_get_entry finds it
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.42"})
        esphome_entry.add_to_hass(hass)

        from custom_components.eppgrid.websocket_api import websocket_delete_esphome_device

        connection = MagicMock()
        msg = {
            "id": 2,
            "type": "eppgrid/delete_esphome_device",
            "config_entry_id": esphome_entry.entry_id,
        }

        with patch.object(hass.config_entries, "async_remove", new_callable=AsyncMock) as mock_remove:
            await call_async_handler(hass, websocket_delete_esphome_device, connection, msg)

        mock_remove.assert_awaited_once_with(esphome_entry.entry_id)
        connection.send_result.assert_called_once_with(2)
        connection.send_error.assert_not_called()

    async def test_delete_fails(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """delete_esphome_device sends error when async_remove raises."""
        await setup_integration(hass, config_entry)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.42"})
        esphome_entry.add_to_hass(hass)

        from custom_components.eppgrid.websocket_api import websocket_delete_esphome_device

        connection = MagicMock()
        msg = {
            "id": 3,
            "type": "eppgrid/delete_esphome_device",
            "config_entry_id": esphome_entry.entry_id,
        }

        with patch.object(
            hass.config_entries,
            "async_remove",
            new_callable=AsyncMock,
            side_effect=Exception("not found"),
        ):
            await call_async_handler(hass, websocket_delete_esphome_device, connection, msg)

        connection.send_error.assert_called_once_with(3, "delete_failed", "not found")
        connection.send_result.assert_not_called()

    async def test_delete_rejects_non_esphome_entry(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """delete_esphome_device rejects entries that aren't ESPHome."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_delete_esphome_device

        connection = MagicMock()
        msg = {
            "id": 4,
            "type": "eppgrid/delete_esphome_device",
            "config_entry_id": config_entry.entry_id,  # eppgrid entry, not esphome
        }

        await call_async_handler(hass, websocket_delete_esphome_device, connection, msg)

        connection.send_error.assert_called_once_with(
            4,
            "invalid_entry",
            "Only ESPHome config entries can be deleted by this command",
            translation_domain=DOMAIN,
            translation_key="only_esphome_can_be_deleted",
        )


class TestAddEsphomeDevice:
    """Tests for eppgrid/add_esphome_device."""

    @pytest.mark.parametrize(
        ("flow_result", "expected"),
        [
            ({"type": "create_entry"}, {"type": "added"}),
            ({"type": "form"}, {"type": "needs_auth"}),
            ({"type": "form", "flow_id": "x"}, {"type": "needs_auth"}),
            (
                {"type": "form", "errors": {}},
                {"type": "needs_auth"},
            ),
            (
                {
                    "type": "form",
                    "step_id": "user",
                    "errors": {"base": "connection_error"},
                },
                {"type": "cannot_connect"},
            ),
            (
                {
                    "type": "form",
                    "step_id": "user",
                    "errors": {"base": "resolve_error"},
                },
                {"type": "cannot_connect"},
            ),
            (
                {
                    "type": "form",
                    "step_id": "user",
                    "errors": {"base": "cannot_connect"},
                },
                {"type": "cannot_connect"},
            ),
            (
                {
                    "type": "form",
                    "step_id": "encryption_key",
                    "errors": {"base": "invalid_psk"},
                },
                {"type": "needs_auth"},
            ),
            (
                {"type": "abort", "reason": "already_configured"},
                {"type": "already_added"},
            ),
            (
                {"type": "abort", "reason": "already_configured_updates"},
                {"type": "already_added"},
            ),
            (
                {"type": "abort", "reason": "cannot_connect"},
                {"type": "cannot_connect"},
            ),
            (
                {"type": "abort", "reason": "connection_error"},
                {"type": "cannot_connect"},
            ),
            (
                {"type": "abort", "reason": "invalid_auth"},
                {"type": "failed", "reason": "invalid_auth"},
            ),
            (
                {"type": "abort", "reason": ""},
                {"type": "failed", "reason": "unknown"},
            ),
            (
                {"type": "abort"},
                {"type": "failed", "reason": "unknown"},
            ),
            (
                {"type": "progress"},
                {"type": "failed", "reason": "progress"},
            ),
            (
                {"type": "menu"},
                {"type": "failed", "reason": "menu"},
            ),
        ],
    )
    def test_map_esphome_flow_result(self, flow_result: dict, expected: dict) -> None:
        """_map_esphome_flow_result translates config-flow results to HaAddResult."""
        from custom_components.eppgrid.websocket_api import _map_esphome_flow_result

        assert _map_esphome_flow_result(flow_result) == expected

    async def test_triggers_config_flow(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """add_esphome_device triggers esphome config flow and sends mapped result."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_add_esphome_device

        connection = MagicMock()
        msg = {
            "id": 4,
            "type": "eppgrid/add_esphome_device",
            "host": "192.168.1.99",
        }

        flow_result = {"type": "create_entry", "title": "esphome-device"}
        with patch.object(
            hass.config_entries.flow,
            "async_init",
            new_callable=AsyncMock,
            return_value=flow_result,
        ) as mock_init:
            await call_async_handler(hass, websocket_add_esphome_device, connection, msg)

        mock_init.assert_awaited_once()
        call_kwargs = mock_init.call_args
        assert call_kwargs[0][0] == "esphome"
        assert call_kwargs[1]["context"]["source"] == "user"
        assert call_kwargs[1]["data"] == {"host": "192.168.1.99", "port": 6053}
        connection.send_result.assert_called_once()
        msg_id, payload = connection.send_result.call_args[0]
        assert msg_id == 4
        assert payload["type"] == "added"

    async def test_skips_flow_when_host_already_configured(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """If an ESPHome entry already points at the host, skip the flow."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_add_esphome_device

        # Add a pre-existing ESPHome config entry pointing at our target host.
        existing = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50", "port": 6053},
            title="existing-device",
        )
        existing.add_to_hass(hass)

        connection = MagicMock()
        msg = {
            "id": 7,
            "type": "eppgrid/add_esphome_device",
            "host": "192.168.1.50",
        }

        with patch.object(
            hass.config_entries.flow,
            "async_init",
            new_callable=AsyncMock,
        ) as mock_init:
            await call_async_handler(hass, websocket_add_esphome_device, connection, msg)

        mock_init.assert_not_awaited()
        connection.send_result.assert_called_once()
        msg_id, payload = connection.send_result.call_args[0]
        assert msg_id == 7
        assert payload == {"type": "already_added"}

    async def test_starts_flow_when_host_not_in_entries(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """If no ESPHome entry matches the host, start the config flow."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_add_esphome_device

        # Different host in an existing entry — should not short-circuit.
        existing = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50", "port": 6053},
            title="other-device",
        )
        existing.add_to_hass(hass)

        connection = MagicMock()
        msg = {
            "id": 8,
            "type": "eppgrid/add_esphome_device",
            "host": "192.168.1.99",
        }

        flow_result = {"type": "create_entry", "title": "new-device"}
        with patch.object(
            hass.config_entries.flow,
            "async_init",
            new_callable=AsyncMock,
            return_value=flow_result,
        ) as mock_init:
            await call_async_handler(hass, websocket_add_esphome_device, connection, msg)

        mock_init.assert_awaited_once()
        connection.send_result.assert_called_once()
        msg_id, payload = connection.send_result.call_args[0]
        assert msg_id == 8
        assert payload == {"type": "added"}
