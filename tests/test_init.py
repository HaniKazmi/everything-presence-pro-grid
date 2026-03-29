"""Tests for integration setup and unload."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid import async_setup_entry
from custom_components.eppgrid import async_unload_entry
from custom_components.eppgrid.const import DOMAIN


async def test_setup_entry_registers_manager(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """Setup creates a DeviceManager and stores it in hass.data."""
    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        result = await async_setup_entry(hass, config_entry)

    assert result is True
    assert DOMAIN in hass.data
    mock_dm.async_start.assert_awaited_once()


async def test_setup_entry_registers_panel_when_enabled(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """Panel is registered when sidebar_panel is True (default)."""
    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock) as mock_panel,
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        await async_setup_entry(hass, config_entry)

    mock_panel.assert_awaited_once_with(hass)


async def test_setup_entry_skips_panel_when_disabled(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """Panel is not registered when sidebar_panel is False."""
    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch("custom_components.eppgrid.EPPGridStore") as mock_store_cls,
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock) as mock_panel,
    ):
        mock_store = mock_store_cls.return_value
        mock_store.async_load = AsyncMock()
        mock_store.sidebar_panel = False
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        await async_setup_entry(hass, config_entry)

    mock_panel.assert_not_awaited()


async def test_unload_entry_stops_manager(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """Unload stops the DeviceManager and removes from hass.data."""
    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        mock_dm.async_stop = AsyncMock()
        await async_setup_entry(hass, config_entry)

    result = await async_unload_entry(hass, config_entry)
    assert result is True
    assert DOMAIN not in hass.data
    mock_dm.async_stop.assert_awaited_once()


async def test_unload_entry_no_manager(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """Unload succeeds even if no manager was stored."""
    result = await async_unload_entry(hass, config_entry)
    assert result is True


async def test_register_panel(hass: HomeAssistant) -> None:
    """_register_panel registers static paths and panel."""
    from custom_components.eppgrid import _register_panel

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    with (
        patch("custom_components.eppgrid.panel_custom.async_register_panel", new_callable=AsyncMock) as mock_panel,
        patch("custom_components.eppgrid._hash_file", return_value="abcd1234"),
    ):
        await _register_panel(hass)

    hass.http.async_register_static_paths.assert_awaited_once()
    mock_panel.assert_awaited_once()
    call_kwargs = mock_panel.call_args[1]
    assert "abcd1234" in call_kwargs["module_url"]


async def test_register_panel_hash_oserror(hass: HomeAssistant) -> None:
    """_register_panel falls back to '0' hash on OSError."""
    from custom_components.eppgrid import _register_panel

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    async def executor_raises(func, *args):
        raise OSError("not found")

    with (
        patch("custom_components.eppgrid.panel_custom.async_register_panel", new_callable=AsyncMock) as mock_panel,
        patch.object(hass, "async_add_executor_job", side_effect=executor_raises),
    ):
        await _register_panel(hass)

    call_kwargs = mock_panel.call_args[1]
    assert "v=0" in call_kwargs["module_url"]


async def test_hash_file(tmp_path) -> None:
    """_hash_file returns first 8 chars of MD5 hex digest."""
    from custom_components.eppgrid import _hash_file

    test_file = tmp_path / "test.js"
    test_file.write_bytes(b"hello world")

    result = _hash_file(str(test_file))
    assert len(result) == 8
    assert result.isalnum()
