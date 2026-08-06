"""DeviceConnection.async_clear_heatmap confirms the clear via a response-returning action.

epp_clear_heatmap used to be fire-and-forget: the call returned success even when the
device never received (or applied) it -- e.g. an unreachable/offline device. It's now a
CONFIRMED action (mirrors async_fetch_build_flags): the connection awaits a response and
raises when the device doesn't confirm, rather than reporting a silent false success.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from homeassistant.exceptions import HomeAssistantError

from custom_components.eppgrid.device_manager._connection import DeviceConnection


@pytest.mark.asyncio
async def test_async_clear_heatmap_confirms_via_response():
    """A confirmed response calls through with return_response=True and succeeds."""
    conn = DeviceConnection.__new__(DeviceConnection)
    conn.async_execute_service = AsyncMock(return_value=SimpleNamespace(response_data=b'{"cleared": true}'))

    await conn.async_clear_heatmap()

    conn.async_execute_service.assert_awaited_once_with("epp_clear_heatmap", {}, return_response=True, timeout=10.0)


@pytest.mark.asyncio
async def test_async_clear_heatmap_raises_on_none_response():
    """No response at all (e.g. malformed/dropped reply) is not a silent success."""
    conn = DeviceConnection.__new__(DeviceConnection)
    conn.async_execute_service = AsyncMock(return_value=None)

    with pytest.raises(HomeAssistantError, match="did not confirm"):
        await conn.async_clear_heatmap()


@pytest.mark.asyncio
async def test_async_clear_heatmap_raises_on_empty_response_data():
    """A response object with empty/falsy response_data is also not a confirmation."""
    conn = DeviceConnection.__new__(DeviceConnection)
    conn.async_execute_service = AsyncMock(return_value=SimpleNamespace(response_data=b""))

    with pytest.raises(HomeAssistantError, match="did not confirm"):
        await conn.async_clear_heatmap()


@pytest.mark.asyncio
async def test_async_clear_heatmap_propagates_timeout():
    """An unreachable/offline device times out -- and that must raise, not report success."""
    conn = DeviceConnection.__new__(DeviceConnection)
    conn.async_execute_service = AsyncMock(side_effect=TimeoutError())

    with pytest.raises(TimeoutError):
        await conn.async_clear_heatmap()


@pytest.mark.asyncio
async def test_async_clear_heatmap_propagates_service_unavailable():
    """Firmware that predates the action raises HomeAssistantError via async_execute_service."""
    conn = DeviceConnection.__new__(DeviceConnection)
    conn.async_execute_service = AsyncMock(side_effect=HomeAssistantError("service unavailable"))

    with pytest.raises(HomeAssistantError, match="service unavailable"):
        await conn.async_clear_heatmap()
