"""DeviceConnection.async_clear_heatmap sends the epp_clear_heatmap service."""

from unittest.mock import AsyncMock

import pytest

from custom_components.eppgrid.device_manager._connection import DeviceConnection


@pytest.mark.asyncio
async def test_async_clear_heatmap_executes_service():
    conn = DeviceConnection.__new__(DeviceConnection)
    conn.async_execute_service = AsyncMock(return_value=None)

    await conn.async_clear_heatmap()

    conn.async_execute_service.assert_awaited_once_with("epp_clear_heatmap", {})
