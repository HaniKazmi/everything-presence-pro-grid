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

    async def test_returns_flashable_devices(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
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

    async def test_not_ready(self, hass: HomeAssistant) -> None:
        """list_flashable_devices returns error when integration not loaded."""
        from custom_components.eppgrid.websocket_api import websocket_list_flashable_devices

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/list_flashable_devices"}

        await call_async_handler(hass, websocket_list_flashable_devices, connection, msg)

        connection.send_error.assert_called_once_with(1, "not_ready", "Integration not loaded")


class TestDeleteEsphomeDevice:
    """Tests for eppgrid/delete_esphome_device."""

    async def test_deletes_config_entry(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """delete_esphome_device calls hass.config_entries.async_remove."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_delete_esphome_device

        connection = MagicMock()
        msg = {
            "id": 2,
            "type": "eppgrid/delete_esphome_device",
            "config_entry_id": "entry-xyz",
        }

        with patch.object(hass.config_entries, "async_remove", new_callable=AsyncMock) as mock_remove:
            await call_async_handler(hass, websocket_delete_esphome_device, connection, msg)

        mock_remove.assert_awaited_once_with("entry-xyz")
        connection.send_result.assert_called_once_with(2)
        connection.send_error.assert_not_called()

    async def test_delete_fails(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """delete_esphome_device sends error when async_remove raises."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_delete_esphome_device

        connection = MagicMock()
        msg = {
            "id": 3,
            "type": "eppgrid/delete_esphome_device",
            "config_entry_id": "bad-entry",
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


class TestAddEsphomeDevice:
    """Tests for eppgrid/add_esphome_device."""

    async def test_triggers_config_flow(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
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

        mock_init.assert_awaited_once_with(
            "esphome",
            context={"source": "user"},
            data={"host": "192.168.1.99"},
        )
        connection.send_result.assert_called_once()
        result = connection.send_result.call_args[0]
        assert result[0] == 4
        assert result[1]["result"] == "form"


class TestFlashOta:
    """Tests for eppgrid/flash_ota."""

    async def test_flash_ota_streams_progress(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """flash_ota streams progress events and sends final success result."""
        mock_dm = await setup_integration(hass, config_entry)

        device = {
            "mac": "AA:BB:CC:DD:EE:FF",
            "name": "EPP Device",
            "host": "192.168.1.50",
            "firmware_type": "original",
            "firmware_version": "1.8.0",
            "esphome_config_entry_id": "old-entry-123",
        }
        mock_dm.list_flashable_devices = AsyncMock(return_value=[device])

        from custom_components.eppgrid.websocket_api import websocket_flash_ota

        connection = MagicMock()
        msg = {
            "id": 5,
            "type": "eppgrid/flash_ota",
            "mac": "AA:BB:CC:DD:EE:FF",
            "variant": "wifi",
        }

        with (
            patch.object(hass.config_entries, "async_remove", new_callable=AsyncMock) as mock_remove,
            patch(
                "custom_components.eppgrid.websocket_api.fetch_firmware_binary",
                new_callable=AsyncMock,
                return_value=b"firmware-bytes",
            ) as mock_fetch,
            patch(
                "custom_components.eppgrid.websocket_api.push_ota",
                new_callable=AsyncMock,
            ) as mock_push,
            patch(
                "custom_components.eppgrid.websocket_api._wait_for_device_online",
                new_callable=AsyncMock,
                return_value=True,
            ) as mock_wait,
            patch.object(
                hass.config_entries.flow,
                "async_init",
                new_callable=AsyncMock,
                return_value={"type": "form", "flow_id": "flow-abc"},
            ) as mock_flow,
        ):
            await call_async_handler(hass, websocket_flash_ota, connection, msg)

        # Verify orchestration calls
        mock_remove.assert_awaited_once_with("old-entry-123")
        mock_fetch.assert_awaited_once()
        mock_push.assert_awaited_once()
        mock_wait.assert_awaited_once_with(hass, "192.168.1.50")
        mock_flow.assert_awaited_once_with(
            "esphome", context={"source": "user"}, data={"host": "192.168.1.50"}
        )

        # Verify progress events were sent via send_message
        assert connection.send_message.call_count >= 4
        # Extract all event payloads
        events = [call.args[0] for call in connection.send_message.call_args_list]
        steps = [e["event"]["step"] for e in events]
        assert "removing_old_device" in steps
        assert "downloading_firmware" in steps
        assert "flashing" in steps
        assert "waiting_for_reboot" in steps
        assert "adding_to_esphome" in steps
        assert "complete" in steps

        # Final result should be success
        connection.send_result.assert_called_once_with(5, {"status": "success"})
        connection.send_error.assert_not_called()

    async def test_flash_ota_device_not_found(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """flash_ota sends error when device MAC is not in list_flashable_devices."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.list_flashable_devices = AsyncMock(return_value=[])

        from custom_components.eppgrid.websocket_api import websocket_flash_ota

        connection = MagicMock()
        msg = {
            "id": 6,
            "type": "eppgrid/flash_ota",
            "mac": "00:11:22:33:44:55",
            "variant": "wifi",
        }

        await call_async_handler(hass, websocket_flash_ota, connection, msg)

        connection.send_error.assert_called_once_with(
            6, "not_found", "Device 00:11:22:33:44:55 not found"
        )
        connection.send_result.assert_not_called()

    async def test_flash_ota_no_host(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """flash_ota sends error when device has no host IP."""
        mock_dm = await setup_integration(hass, config_entry)
        device = {
            "mac": "AA:BB:CC:DD:EE:FF",
            "name": "EPP Device",
            "host": None,
            "firmware_type": "original",
            "firmware_version": "1.8.0",
        }
        mock_dm.list_flashable_devices = AsyncMock(return_value=[device])

        from custom_components.eppgrid.websocket_api import websocket_flash_ota

        connection = MagicMock()
        msg = {
            "id": 7,
            "type": "eppgrid/flash_ota",
            "mac": "AA:BB:CC:DD:EE:FF",
            "variant": "wifi",
        }

        await call_async_handler(hass, websocket_flash_ota, connection, msg)

        connection.send_error.assert_called_once_with(7, "no_host", "Device has no known IP address")
        connection.send_result.assert_not_called()

    async def test_flash_ota_ota_error(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """flash_ota sends ota_failed error when OTAError is raised."""
        mock_dm = await setup_integration(hass, config_entry)
        device = {
            "mac": "AA:BB:CC:DD:EE:FF",
            "name": "EPP Device",
            "host": "192.168.1.50",
            "firmware_type": "original",
            "firmware_version": "1.8.0",
        }
        mock_dm.list_flashable_devices = AsyncMock(return_value=[device])

        from custom_components.eppgrid.websocket_api import websocket_flash_ota
        from custom_components.eppgrid.ota import OTAError

        connection = MagicMock()
        msg = {
            "id": 8,
            "type": "eppgrid/flash_ota",
            "mac": "AA:BB:CC:DD:EE:FF",
            "variant": "wifi",
        }

        with (
            patch(
                "custom_components.eppgrid.websocket_api.fetch_firmware_binary",
                new_callable=AsyncMock,
                return_value=b"firmware-bytes",
            ),
            patch(
                "custom_components.eppgrid.websocket_api.push_ota",
                new_callable=AsyncMock,
                side_effect=OTAError("Connection refused"),
            ),
        ):
            await call_async_handler(hass, websocket_flash_ota, connection, msg)

        connection.send_error.assert_called_once_with(8, "ota_failed", "Connection refused")
        connection.send_result.assert_not_called()

    async def test_flash_ota_reboot_timeout(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """flash_ota reports timeout when device doesn't come back online."""
        mock_dm = await setup_integration(hass, config_entry)
        device = {
            "mac": "AA:BB:CC:DD:EE:FF",
            "name": "EPP Device",
            "host": "192.168.1.50",
            "firmware_type": "original",
            "firmware_version": "1.8.0",
        }
        mock_dm.list_flashable_devices = AsyncMock(return_value=[device])

        from custom_components.eppgrid.websocket_api import websocket_flash_ota

        connection = MagicMock()
        msg = {
            "id": 9,
            "type": "eppgrid/flash_ota",
            "mac": "AA:BB:CC:DD:EE:FF",
            "variant": "wifi",
        }

        with (
            patch(
                "custom_components.eppgrid.websocket_api.fetch_firmware_binary",
                new_callable=AsyncMock,
                return_value=b"firmware-bytes",
            ),
            patch(
                "custom_components.eppgrid.websocket_api.push_ota",
                new_callable=AsyncMock,
            ),
            patch(
                "custom_components.eppgrid.websocket_api._wait_for_device_online",
                new_callable=AsyncMock,
                return_value=False,
            ),
        ):
            await call_async_handler(hass, websocket_flash_ota, connection, msg)

        connection.send_result.assert_called_once_with(9, {"status": "timeout"})
        connection.send_error.assert_not_called()

    async def test_flash_ota_skips_remove_when_no_config_entry(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """flash_ota skips ESPHome entry removal when device has no config_entry_id."""
        mock_dm = await setup_integration(hass, config_entry)
        device = {
            "mac": "AA:BB:CC:DD:EE:FF",
            "name": "EPP Device",
            "host": "192.168.1.50",
            "firmware_type": "original",
            "firmware_version": "1.8.0",
            # No esphome_config_entry_id key
        }
        mock_dm.list_flashable_devices = AsyncMock(return_value=[device])

        from custom_components.eppgrid.websocket_api import websocket_flash_ota

        connection = MagicMock()
        msg = {
            "id": 10,
            "type": "eppgrid/flash_ota",
            "mac": "AA:BB:CC:DD:EE:FF",
            "variant": "wifi",
        }

        with (
            patch.object(hass.config_entries, "async_remove", new_callable=AsyncMock) as mock_remove,
            patch(
                "custom_components.eppgrid.websocket_api.fetch_firmware_binary",
                new_callable=AsyncMock,
                return_value=b"firmware-bytes",
            ),
            patch(
                "custom_components.eppgrid.websocket_api.push_ota",
                new_callable=AsyncMock,
            ),
            patch(
                "custom_components.eppgrid.websocket_api._wait_for_device_online",
                new_callable=AsyncMock,
                return_value=True,
            ),
            patch.object(
                hass.config_entries.flow,
                "async_init",
                new_callable=AsyncMock,
                return_value={"type": "form"},
            ),
        ):
            await call_async_handler(hass, websocket_flash_ota, connection, msg)

        mock_remove.assert_not_called()
        connection.send_result.assert_called_once_with(10, {"status": "success"})
