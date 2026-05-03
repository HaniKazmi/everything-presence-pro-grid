"""HTTP proxy for firmware manifests and binaries from GitHub Releases."""

from __future__ import annotations

import logging
import re

import aiohttp
from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import MANIFEST_BASE_URL

_LOGGER = logging.getLogger(__name__)

# Only allow expected firmware filenames (no path traversal)
_VALID_FILENAME = re.compile(r"^[a-z0-9][a-z0-9._-]*\.(json|bin|ota\.bin)$")

# Cap on a single proxied response. Real firmware artifacts are ~1-2 MiB; 16 MiB
# leaves plenty of headroom while bounding the memory cost of a hostile or
# misconfigured upstream.
_MAX_RESPONSE_BYTES = 16 * 1024 * 1024

# Bound the upstream fetch to keep a stalled GitHub host from holding an HA
# event-loop slot indefinitely. total covers the whole exchange; sock_read
# guards against slow-loris bodies.
_UPSTREAM_TIMEOUT = aiohttp.ClientTimeout(total=60, sock_read=15)


class FirmwareProxyView(HomeAssistantView):
    """Proxy GET requests for firmware assets from GitHub Releases."""

    url = "/api/eppgrid/firmware/{filename}"
    name = "api:eppgrid:firmware"
    # Authenticated: the panel attaches an `Authorization: Bearer <token>`
    # header (`hass.auth.accessToken`) on its `fetch()` calls in
    # `usb-flash-service.ts`. Cookies aren't relied on because they aren't
    # reliable across HA reverse-proxy / Nabu Casa setups. Direct
    # unauthenticated GETs would let any LAN client (or anyone reachable via
    # Nabu Casa / a reverse proxy) use HA as a free firmware-download proxy
    # and DoS amplifier.
    requires_auth = True

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
            async with session.get(url, timeout=_UPSTREAM_TIMEOUT) as resp:
                if resp.status != 200:
                    _LOGGER.warning("firmware-proxy: upstream %s returned %s", url, resp.status)
                    return web.Response(status=resp.status, text=f"Upstream returned {resp.status}")

                # Fail fast if upstream advertises a body bigger than we'll accept.
                content_length_hdr = resp.headers.get("Content-Length")
                if content_length_hdr is not None:
                    try:
                        content_length = int(content_length_hdr)
                    except ValueError:
                        content_length = -1
                    if content_length > _MAX_RESPONSE_BYTES:
                        _LOGGER.warning(
                            "firmware-proxy: upstream %s advertises %d bytes (> %d cap)",
                            url,
                            content_length,
                            _MAX_RESPONSE_BYTES,
                        )
                        return web.Response(status=502, text="Firmware too large")

                # Stream-read with a running cap so a chunked-transfer upstream
                # can't bypass the Content-Length check above.
                chunks: list[bytes] = []
                total = 0
                async for chunk in resp.content.iter_chunked(64 * 1024):
                    total += len(chunk)
                    if total > _MAX_RESPONSE_BYTES:
                        _LOGGER.warning(
                            "firmware-proxy: streamed body for %s exceeded %d-byte cap",
                            url,
                            _MAX_RESPONSE_BYTES,
                        )
                        return web.Response(status=502, text="Firmware too large")
                    chunks.append(chunk)

                data = b"".join(chunks)
                content_type = "application/json" if filename.endswith(".json") else "application/octet-stream"
                _LOGGER.info(
                    "firmware-proxy: served %s (%d bytes, %s)",
                    filename,
                    len(data),
                    content_type,
                )
                return web.Response(body=data, content_type=content_type)
        except TimeoutError:
            _LOGGER.warning("firmware-proxy: upstream %s timed out", url)
            return web.Response(status=504, text="Upstream timeout")
        except Exception as err:
            _LOGGER.exception("firmware-proxy: failed to fetch %s: %s", url, err)
            return web.Response(status=502, text="Failed to fetch firmware")
