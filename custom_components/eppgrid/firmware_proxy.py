"""HTTP proxy for firmware manifests and binaries from GitHub Releases."""

from __future__ import annotations

import logging
import re

from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import MANIFEST_BASE_URL

_LOGGER = logging.getLogger(__name__)

# Only allow expected firmware filenames (no path traversal)
_VALID_FILENAME = re.compile(r"^[a-z0-9][a-z0-9._-]*\.(json|bin|ota\.bin)$")


class FirmwareProxyView(HomeAssistantView):
    """Proxy GET requests for firmware assets from GitHub Releases."""

    url = "/api/eppgrid/firmware/{filename}"
    name = "api:eppgrid:firmware"
    requires_auth = False  # The panel already handles auth

    async def get(self, request: web.Request, filename: str) -> web.Response:
        """Fetch a firmware file from GitHub Releases and return it."""
        if not _VALID_FILENAME.match(filename):
            _LOGGER.warning("firmware-proxy: rejected invalid filename %s", filename)
            return web.Response(status=400, text="Invalid filename")

        hass: HomeAssistant = request.app["hass"]
        session = async_get_clientsession(hass)
        url = f"{MANIFEST_BASE_URL}/{filename}"

        _LOGGER.info("firmware-proxy: fetching %s", url)
        try:
            async with session.get(url) as resp:
                if resp.status != 200:
                    _LOGGER.warning("firmware-proxy: upstream %s returned %s", url, resp.status)
                    return web.Response(status=resp.status, text=f"Upstream returned {resp.status}")

                data = await resp.read()
                content_type = "application/json" if filename.endswith(".json") else "application/octet-stream"
                _LOGGER.info(
                    "firmware-proxy: served %s (%d bytes, %s)",
                    filename,
                    len(data),
                    content_type,
                )
                return web.Response(body=data, content_type=content_type)
        except Exception as err:
            _LOGGER.exception("firmware-proxy: failed to fetch %s: %s", url, err)
            return web.Response(status=502, text="Failed to fetch firmware")
