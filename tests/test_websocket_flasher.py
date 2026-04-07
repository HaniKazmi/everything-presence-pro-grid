"""Tests for flasher WebSocket API commands."""

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
        mock_dm.list_flashable_devices = AsyncMock(return_value=[])
        mock_dm._push_config_to_device = AsyncMock()
        mock_dm._push_pipeline_to_device = AsyncMock()
        mock_dm._entity_update_macs = set()
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

    async def test_not_ready(self, hass: HomeAssistant) -> None:
        """list_flashable_devices returns error when integration not loaded."""
        from custom_components.eppgrid.websocket_api import websocket_list_flashable_devices

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/list_flashable_devices"}

        await call_async_handler(hass, websocket_list_flashable_devices, connection, msg)

        connection.send_error.assert_called_once_with(1, "not_ready", "Integration not loaded")


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
            4, "invalid_entry", "Only ESPHome config entries can be deleted by this command"
        )


class TestAddEsphomeDevice:
    """Tests for eppgrid/add_esphome_device."""

    async def test_triggers_config_flow(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """add_esphome_device triggers esphome config flow with host."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_add_esphome_device

        connection = MagicMock()
        msg = {
            "id": 4,
            "type": "eppgrid/add_esphome_device",
            "host": "192.168.1.99",
        }

        flow_result = {"type": "form", "flow_id": "flow-abc"}
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
        result = connection.send_result.call_args[0]
        assert result[0] == 4
        assert result[1]["result"] == "form"
