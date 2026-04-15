"""HTTP proxy for firmware manifests and binaries from GitHub Releases."""

from __future__ import annotations

import re

from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import MANIFEST_BASE_URL

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
            return web.Response(status=400, text="Invalid filename")

        hass: HomeAssistant = request.app["hass"]
        session = async_get_clientsession(hass)
        url = f"{MANIFEST_BASE_URL}/{filename}"

        try:
            async with session.get(url) as resp:
                if resp.status != 200:
                    return web.Response(status=resp.status, text=f"Upstream returned {resp.status}")

                data = await resp.read()
                content_type = "application/json" if filename.endswith(".json") else "application/octet-stream"
                return web.Response(body=data, content_type=content_type)
        except Exception:
            return web.Response(status=502, text="Failed to fetch firmware")
