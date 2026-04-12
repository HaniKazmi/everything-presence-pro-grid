"""Everything Presence Pro Grid — calibration UI and device management."""

from __future__ import annotations

import hashlib
import logging
import os

from homeassistant.components import panel_custom
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .device_manager import DeviceManager
from .firmware_proxy import FirmwareProxyView
from .storage import EPPGridStore
from .websocket_api import async_register_websocket_commands

_LOGGER = logging.getLogger(__name__)

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")

# Key in hass.data marking that the frontend bundle has been registered.
# Used to make _register_frontend_resources idempotent across reloads.
_FRONTEND_REGISTERED_KEY = f"{DOMAIN}_frontend_module_url"


def _hash_file(path: str) -> str:
    """Return MD5 hash prefix of a file for cache-busting."""
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()[:8]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Everything Presence Pro Grid from a config entry."""
    store = EPPGridStore(hass)
    await store.async_load()

    manager = DeviceManager(hass, store)

    # Register the frontend bundle as a global module URL so the Lovelace
    # cards are available on any dashboard, not just the sidebar panel page.
    module_url = await _register_frontend_resources(hass)

    if store.sidebar_panel:
        await _register_panel(hass, module_url)

    hass.data[DOMAIN] = manager
    async_register_websocket_commands(hass, manager)
    hass.http.register_view(FirmwareProxyView())
    await manager.async_start()

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    manager = hass.data.pop(DOMAIN, None)
    if manager is not None:
        await manager.async_stop()
    # Allow WS commands to be re-registered on next setup
    from .websocket_api import _REGISTERED

    _REGISTERED.discard(DOMAIN)
    return True


async def _register_frontend_resources(hass: HomeAssistant) -> str:
    """Register the static path and add the JS bundle as a global frontend module.

    Returns the versioned module URL. Idempotent across reloads — subsequent
    calls return the cached URL without re-registering the static path.
    """
    cached = hass.data.get(_FRONTEND_REGISTERED_KEY)
    if cached:
        return cached

    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                url_path=f"/{DOMAIN}_static",
                path=FRONTEND_DIR,
                cache_headers=False,
            )
        ]
    )

    js_path = os.path.join(FRONTEND_DIR, "eppgrid-panel.js")
    try:
        js_hash = await hass.async_add_executor_job(_hash_file, js_path)
    except OSError:
        js_hash = "0"

    module_url = f"/{DOMAIN}_static/eppgrid-panel.js?v={js_hash}"
    add_extra_js_url(hass, module_url)
    hass.data[_FRONTEND_REGISTERED_KEY] = module_url
    return module_url


async def _register_panel(hass: HomeAssistant, module_url: str) -> None:
    """Register the frontend sidebar panel."""
    await panel_custom.async_register_panel(
        hass=hass,
        frontend_url_path=DOMAIN,
        webcomponent_name="eppgrid-panel",
        module_url=module_url,
        sidebar_title="Everything Presence Pro Grid",
        sidebar_icon="mdi:radar",
        require_admin=False,
        config={},
    )
