"""End-to-end pipeline flow tests: settings → compute → push to device."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import MagicMock

from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid.device_manager import DeviceManager
from tests.test_websocket_api import setup_integration


class TestEndToEndPipelineFlow:
    """Verify the full flow: settings change → pipeline compute → intervals pushed."""

    async def test_full_flow_entities_enabled_with_frontend(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """With target_xy enabled at 2Hz and frontend subscribed, all intervals set."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {
            "settings": {
                "target_xy": True,
                "zone_presence": True,
                "target_update_rate_ms": 500,
                "zone_update_rate_ms": 1000,
            },
            "pipeline": {"window_duration": 800},
        }

        mock_session = MagicMock()
        mock_session.raw_target_subs = 0
        mock_session.grid_target_subs = 1  # Frontend connected
        mock_session._services = {"epp_set_pipeline": MagicMock()}
        mock_session._client = MagicMock()
        mock_session._client.execute_service = AsyncMock()
        mock_session.connected = True
        mock_dm.get_session = MagicMock(return_value=mock_session)

        # Use the real _push_pipeline_to_device method
        mock_dm._push_pipeline_to_device = lambda m: DeviceManager._push_pipeline_to_device(mock_dm, m)

        await mock_dm._push_pipeline_to_device(mac)

        call_args = mock_session._client.execute_service.call_args
        pipeline = call_args[0][1]
        assert pipeline["entity_target_interval"] == 500
        assert pipeline["entity_zone_interval"] == 1000
        assert pipeline["display_interval"] == 200
        assert pipeline["zone_state_interval"] == 1000
        assert pipeline["window_duration"] == 800

    async def test_full_flow_no_entities_no_frontend(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """With nothing enabled and no frontend, all intervals are 0."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {}

        mock_session = MagicMock()
        mock_session.raw_target_subs = 0
        mock_session.grid_target_subs = 0
        mock_session._services = {"epp_set_pipeline": MagicMock()}
        mock_session._client = MagicMock()
        mock_session._client.execute_service = AsyncMock()
        mock_session.connected = True
        mock_dm.get_session = MagicMock(return_value=mock_session)

        mock_dm._push_pipeline_to_device = lambda m: DeviceManager._push_pipeline_to_device(mock_dm, m)

        await mock_dm._push_pipeline_to_device(mac)

        call_args = mock_session._client.execute_service.call_args
        pipeline = call_args[0][1]
        assert pipeline["entity_target_interval"] == 0
        assert pipeline["entity_zone_interval"] == 0
        assert pipeline["display_interval"] == 0
        assert pipeline["zone_state_interval"] == 0

    async def test_raw_subscribers_only_enables_display(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Raw target subscribers enable display but not zone_state."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {}

        mock_session = MagicMock()
        mock_session.raw_target_subs = 1  # Calibration wizard open
        mock_session.grid_target_subs = 0
        mock_session._services = {"epp_set_pipeline": MagicMock()}
        mock_session._client = MagicMock()
        mock_session._client.execute_service = AsyncMock()
        mock_session.connected = True
        mock_dm.get_session = MagicMock(return_value=mock_session)

        mock_dm._push_pipeline_to_device = lambda m: DeviceManager._push_pipeline_to_device(mock_dm, m)

        await mock_dm._push_pipeline_to_device(mac)

        call_args = mock_session._client.execute_service.call_args
        pipeline = call_args[0][1]
        assert pipeline["display_interval"] == 200
        assert pipeline["zone_state_interval"] == 0  # Only grid subs trigger zone state

    async def test_rate_ignored_when_entities_disabled(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Configured rate is ignored when all entities in group are disabled."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {
            "settings": {
                "target_xy": False,
                "target_active": False,
                "target_signal": False,
                "target_zone": False,
                "target_update_rate_ms": 500,
            },
        }

        mock_session = MagicMock()
        mock_session.raw_target_subs = 0
        mock_session.grid_target_subs = 0
        mock_session._services = {"epp_set_pipeline": MagicMock()}
        mock_session._client = MagicMock()
        mock_session._client.execute_service = AsyncMock()
        mock_session.connected = True
        mock_dm.get_session = MagicMock(return_value=mock_session)

        mock_dm._push_pipeline_to_device = lambda m: DeviceManager._push_pipeline_to_device(mock_dm, m)

        await mock_dm._push_pipeline_to_device(mac)

        call_args = mock_session._client.execute_service.call_args
        pipeline = call_args[0][1]
        assert pipeline["entity_target_interval"] == 0  # Rate ignored, entities all off
