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
    if hass.http is None:
        hass.http = MagicMock()

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=deadbeef",
        ),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        result = await async_setup_entry(hass, config_entry)

    assert result is True
    assert DOMAIN in hass.data
    mock_dm.async_start.assert_awaited_once()


async def test_setup_entry_registers_frontend_resources_always(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """Frontend resources are registered even when sidebar_panel is disabled so Lovelace cards work on dashboards."""
    if hass.http is None:
        hass.http = MagicMock()

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch("custom_components.eppgrid.EPPGridStore") as mock_store_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=deadbeef",
        ) as mock_resources,
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock) as mock_panel,
    ):
        mock_store = mock_store_cls.return_value
        mock_store.async_load = AsyncMock()
        mock_store.sidebar_panel = False
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        await async_setup_entry(hass, config_entry)

    mock_resources.assert_awaited_once_with(hass)
    mock_panel.assert_not_awaited()


async def test_setup_entry_registers_panel_when_enabled(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """Panel is registered with the versioned module URL when sidebar_panel is True."""
    if hass.http is None:
        hass.http = MagicMock()

    module_url = "/eppgrid_static/eppgrid-panel.js?v=deadbeef"
    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources", new_callable=AsyncMock, return_value=module_url
        ),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock) as mock_panel,
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        await async_setup_entry(hass, config_entry)

    mock_panel.assert_awaited_once_with(hass, module_url)


async def test_setup_entry_skips_panel_when_disabled(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """Panel is not registered when sidebar_panel is False."""
    if hass.http is None:
        hass.http = MagicMock()

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch("custom_components.eppgrid.EPPGridStore") as mock_store_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=deadbeef",
        ),
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
    if hass.http is None:
        hass.http = MagicMock()

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=deadbeef",
        ),
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


async def test_setup_entry_registers_update_listener(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """Setup adds an update listener so options changes trigger a config-entry reload."""
    if hass.http is None:
        hass.http = MagicMock()

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=deadbeef",
        ),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
        patch.object(hass.config_entries, "async_reload", new_callable=AsyncMock) as mock_reload,
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        await async_setup_entry(hass, config_entry)

        # Simulate an options update — the listener registered during setup
        # should request a reload.
        hass.config_entries.async_update_entry(config_entry, options={"sidebar_panel": False})
        await hass.async_block_till_done()

    mock_reload.assert_awaited_with(config_entry.entry_id)


async def test_unload_entry_removes_panel_and_js_url(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """Unload removes the sidebar panel and the previously-registered JS URL."""
    if hass.http is None:
        hass.http = MagicMock()

    module_url = "/eppgrid_static/eppgrid-panel.js?v=deadbeef"
    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value=module_url,
        ),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
        patch("custom_components.eppgrid.async_remove_panel") as mock_remove_panel,
        patch("custom_components.eppgrid.remove_extra_js_url") as mock_remove_js,
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        mock_dm.async_stop = AsyncMock()
        await async_setup_entry(hass, config_entry)
        # Panel registration tracks the URL on hass.data so unload can remove it.
        hass.data[f"{DOMAIN}_js_url"] = module_url

        await async_unload_entry(hass, config_entry)

    mock_remove_panel.assert_called_once()
    mock_remove_js.assert_called_once_with(hass, module_url)


async def test_unload_entry_skips_panel_when_not_registered(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """Unload does not call async_remove_panel when sidebar panel was disabled."""
    if hass.http is None:
        hass.http = MagicMock()

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch("custom_components.eppgrid.EPPGridStore") as mock_store_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=deadbeef",
        ),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
        patch("custom_components.eppgrid.async_remove_panel") as mock_remove_panel,
        patch("custom_components.eppgrid.remove_extra_js_url"),
    ):
        mock_store = mock_store_cls.return_value
        mock_store.async_load = AsyncMock()
        mock_store.sidebar_panel = False
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        mock_dm.async_stop = AsyncMock()
        await async_setup_entry(hass, config_entry)

        await async_unload_entry(hass, config_entry)

    mock_remove_panel.assert_not_called()


async def test_register_panel(hass: HomeAssistant) -> None:
    """_register_panel registers the panel with the given module URL."""
    from custom_components.eppgrid import _register_panel

    module_url = "/eppgrid_static/eppgrid-panel.js?v=abcd1234"
    with patch("custom_components.eppgrid.panel_custom.async_register_panel", new_callable=AsyncMock) as mock_panel:
        await _register_panel(hass, module_url)

    mock_panel.assert_awaited_once()
    call_kwargs = mock_panel.call_args[1]
    assert call_kwargs["module_url"] == module_url


async def test_register_frontend_resources_registers_static_path_and_js(hass: HomeAssistant) -> None:
    """_register_frontend_resources registers the static path and adds the JS bundle as a global module URL."""
    from custom_components.eppgrid import _register_frontend_resources

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    with (
        patch("custom_components.eppgrid._hash_file", return_value="abcd1234"),
        patch("custom_components.eppgrid.add_extra_js_url") as mock_add_js,
    ):
        module_url = await _register_frontend_resources(hass)

    hass.http.async_register_static_paths.assert_awaited_once()
    mock_add_js.assert_called_once_with(hass, module_url)
    assert module_url == "/eppgrid_static/eppgrid-panel.js?v=abcd1234"


async def test_register_frontend_resources_hash_oserror(hass: HomeAssistant) -> None:
    """_register_frontend_resources falls back to '0' hash on OSError."""
    from custom_components.eppgrid import _register_frontend_resources

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    async def executor_raises(func, *args):
        raise OSError("not found")

    with (
        patch.object(hass, "async_add_executor_job", side_effect=executor_raises),
        patch("custom_components.eppgrid.add_extra_js_url"),
    ):
        module_url = await _register_frontend_resources(hass)

    assert module_url.endswith("?v=0")


async def test_register_frontend_resources_registers_static_path_once(hass: HomeAssistant) -> None:
    """Static path registers once; add_extra_js_url is called every call so new hashes are picked up."""
    from custom_components.eppgrid import _register_frontend_resources

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    with (
        patch("custom_components.eppgrid._hash_file", return_value="abcd1234"),
        patch("custom_components.eppgrid.add_extra_js_url") as mock_add_js,
        patch("custom_components.eppgrid.remove_extra_js_url"),
    ):
        first = await _register_frontend_resources(hass)
        second = await _register_frontend_resources(hass)

    assert first == second
    hass.http.async_register_static_paths.assert_awaited_once()
    assert mock_add_js.call_count == 2


async def test_register_frontend_resources_recomputes_hash_on_reload(hass: HomeAssistant) -> None:
    """If the bundle changes between calls, the new hash is reflected in the returned URL."""
    from custom_components.eppgrid import _register_frontend_resources

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    hashes = iter(["abcd1234", "ef567890"])
    with (
        patch("custom_components.eppgrid._hash_file", side_effect=lambda _p: next(hashes)),
        patch("custom_components.eppgrid.add_extra_js_url"),
        patch("custom_components.eppgrid.remove_extra_js_url"),
    ):
        first = await _register_frontend_resources(hass)
        second = await _register_frontend_resources(hass)

    assert first.endswith("v=abcd1234")
    assert second.endswith("v=ef567890")
    hass.http.async_register_static_paths.assert_awaited_once()


async def test_register_frontend_resources_removes_previous_url_before_adding_new(
    hass: HomeAssistant,
) -> None:
    """Re-register removes the previously-registered URL before adding the new one."""
    from custom_components.eppgrid import _register_frontend_resources

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    hashes = iter(["abcd1234", "ef567890"])
    with (
        patch("custom_components.eppgrid._hash_file", side_effect=lambda _p: next(hashes)),
        patch("custom_components.eppgrid.add_extra_js_url"),
        patch("custom_components.eppgrid.remove_extra_js_url") as mock_remove_js,
    ):
        first = await _register_frontend_resources(hass)
        await _register_frontend_resources(hass)

    mock_remove_js.assert_called_once_with(hass, first)
    assert hass.data[f"{DOMAIN}_js_url"].endswith("v=ef567890")


async def test_register_frontend_resources_first_call_does_not_remove(hass: HomeAssistant) -> None:
    """First call has nothing to remove."""
    from custom_components.eppgrid import _register_frontend_resources

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    with (
        patch("custom_components.eppgrid._hash_file", return_value="abcd1234"),
        patch("custom_components.eppgrid.add_extra_js_url"),
        patch("custom_components.eppgrid.remove_extra_js_url") as mock_remove_js,
    ):
        await _register_frontend_resources(hass)

    mock_remove_js.assert_not_called()


async def test_hash_file(tmp_path) -> None:
    """_hash_file returns first 8 chars of MD5 hex digest."""
    from custom_components.eppgrid import _hash_file

    test_file = tmp_path / "test.js"
    test_file.write_bytes(b"hello world")

    result = _hash_file(str(test_file))
    assert len(result) == 8
    assert result.isalnum()
