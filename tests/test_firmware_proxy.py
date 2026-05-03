"""Tests for the firmware proxy HTTP view."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import aiohttp
import pytest
from homeassistant.core import HomeAssistant

from custom_components.eppgrid.firmware_proxy import FirmwareProxyView


@pytest.fixture
def view():
    return FirmwareProxyView()


def make_request(hass, filename="everything-presence-pro-wifi-ble-co2-manifest.json"):
    """Create a mock aiohttp request."""
    app = {"hass": hass}
    request = MagicMock()
    request.app = app
    return request


async def _async_iter(items):
    for item in items:
        yield item


def _mock_response(*, status=200, body=b"", headers=None, chunks=None):
    """Create a mock aiohttp ClientResponse that supports iter_chunked()."""
    resp = AsyncMock()
    resp.status = status
    resp.headers = headers or {}
    chunks_to_yield = chunks if chunks is not None else ([body] if body else [])
    resp.content = MagicMock()
    resp.content.iter_chunked = MagicMock(return_value=_async_iter(chunks_to_yield))
    return resp


def _mock_session(mock_resp=None, side_effect=None):
    """Create a mock session whose .get() returns an async context manager."""
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=mock_resp)
    cm.__aexit__ = AsyncMock(return_value=False)

    mock_session = MagicMock()
    if side_effect:
        mock_session.get = MagicMock(side_effect=side_effect)
    else:
        mock_session.get = MagicMock(return_value=cm)
    return mock_session


class TestFirmwareProxyView:
    def test_url_pattern(self, view):
        assert view.url == "/api/eppgrid/firmware/{filename}"

    def test_requires_auth(self, view):
        # Unauthenticated direct GETs would let any LAN client (or anyone reachable
        # via Nabu Casa / a reverse proxy) use HA as a free firmware-download proxy
        # and DoS amplifier. The panel runs in the browser and cannot gate this URL.
        assert view.requires_auth is True

    async def test_rejects_invalid_filename(self, hass: HomeAssistant, view):
        request = make_request(hass)
        resp = await view.get(request, "malicious-file.exe")
        assert resp.status == 400

    async def test_accepts_short_firmware_filenames(self, hass: HomeAssistant, view):
        request = make_request(hass)
        mock_resp = _mock_response(status=200, body=b"\x00")

        with patch(
            "custom_components.eppgrid.firmware_proxy.async_get_clientsession",
            return_value=_mock_session(mock_resp),
        ):
            resp = await view.get(request, "wifi.ota.bin")

        assert resp.status == 200

    async def test_proxies_manifest_json(self, hass: HomeAssistant, view):
        request = make_request(hass)
        manifest_data = b'{"builds": []}'

        mock_resp = _mock_response(status=200, body=manifest_data)

        with patch(
            "custom_components.eppgrid.firmware_proxy.async_get_clientsession",
            return_value=_mock_session(mock_resp),
        ):
            resp = await view.get(request, "everything-presence-pro-wifi-ble-co2-manifest.json")

        assert resp.status == 200
        assert resp.body == manifest_data
        assert resp.content_type == "application/json"

    async def test_proxies_binary_file(self, hass: HomeAssistant, view):
        request = make_request(hass)
        binary_data = b"\x00\x01\x02\x03"

        mock_resp = _mock_response(status=200, body=binary_data)

        with patch(
            "custom_components.eppgrid.firmware_proxy.async_get_clientsession",
            return_value=_mock_session(mock_resp),
        ):
            resp = await view.get(request, "everything-presence-pro-wifi-ble-co2-bootloader.bin")

        assert resp.status == 200
        assert resp.body == binary_data
        assert resp.content_type == "application/octet-stream"

    async def test_proxies_multi_chunk_body(self, hass: HomeAssistant, view):
        """Streamed responses with no Content-Length must concatenate correctly."""
        request = make_request(hass)
        chunks = [b"\xaa" * 100, b"\xbb" * 50, b"\xcc" * 25]

        mock_resp = _mock_response(status=200, chunks=chunks, headers={})

        with patch(
            "custom_components.eppgrid.firmware_proxy.async_get_clientsession",
            return_value=_mock_session(mock_resp),
        ):
            resp = await view.get(request, "everything-presence-pro-wifi-ble-co2-bootloader.bin")

        assert resp.status == 200
        assert resp.body == b"".join(chunks)

    async def test_returns_404_when_upstream_not_found(self, hass: HomeAssistant, view):
        request = make_request(hass)

        mock_resp = _mock_response(status=404)

        with patch(
            "custom_components.eppgrid.firmware_proxy.async_get_clientsession",
            return_value=_mock_session(mock_resp),
        ):
            resp = await view.get(request, "everything-presence-pro-wifi-ble-co2-manifest.json")

        assert resp.status == 404

    async def test_propagates_upstream_5xx(self, hass: HomeAssistant, view):
        request = make_request(hass)

        mock_resp = _mock_response(status=500)

        with patch(
            "custom_components.eppgrid.firmware_proxy.async_get_clientsession",
            return_value=_mock_session(mock_resp),
        ):
            resp = await view.get(request, "everything-presence-pro-wifi-ble-co2-manifest.json")

        assert resp.status == 500
        assert "500" in resp.text

    async def test_returns_502_on_network_error(self, hass: HomeAssistant, view):
        request = make_request(hass)

        with patch(
            "custom_components.eppgrid.firmware_proxy.async_get_clientsession",
            return_value=_mock_session(side_effect=Exception("network error")),
        ):
            resp = await view.get(request, "everything-presence-pro-wifi-ble-co2-manifest.json")

        assert resp.status == 502

    async def test_returns_504_on_upstream_timeout(self, hass: HomeAssistant, view):
        """A stalled upstream must return a bounded error, not hang forever."""
        request = make_request(hass)

        with patch(
            "custom_components.eppgrid.firmware_proxy.async_get_clientsession",
            return_value=_mock_session(side_effect=TimeoutError()),
        ):
            resp = await view.get(request, "everything-presence-pro-wifi-ble-co2-manifest.json")

        assert resp.status == 504

    async def test_passes_timeout_to_session_get(self, hass: HomeAssistant, view):
        """Upstream fetch must use a bounded ClientTimeout to prevent slow-loris hangs."""
        request = make_request(hass)
        mock_resp = _mock_response(status=200, body=b"{}")

        session = _mock_session(mock_resp)
        with patch(
            "custom_components.eppgrid.firmware_proxy.async_get_clientsession",
            return_value=session,
        ):
            await view.get(request, "everything-presence-pro-wifi-ble-co2-manifest.json")

        _, kwargs = session.get.call_args
        timeout = kwargs.get("timeout")
        assert isinstance(timeout, aiohttp.ClientTimeout)
        assert timeout.total is not None and timeout.total <= 120

    async def test_returns_502_on_oversize_content_length(self, hass: HomeAssistant, view):
        """If upstream advertises Content-Length > size cap, refuse with 502."""
        request = make_request(hass)
        huge = 17 * 1024 * 1024  # 17 MiB > 16 MiB cap
        mock_resp = _mock_response(
            status=200,
            body=b"",
            headers={"Content-Length": str(huge)},
        )

        with patch(
            "custom_components.eppgrid.firmware_proxy.async_get_clientsession",
            return_value=_mock_session(mock_resp),
        ):
            resp = await view.get(request, "everything-presence-pro-wifi-ble-co2-manifest.json")

        assert resp.status == 502

    async def test_returns_502_when_streamed_body_exceeds_cap(self, hass: HomeAssistant, view):
        """If upstream sends chunks totaling > size cap without Content-Length, abort."""
        request = make_request(hass)
        # 17 chunks of 1 MiB each = 17 MiB, no Content-Length header
        chunks = [b"\x00" * (1024 * 1024) for _ in range(17)]
        mock_resp = _mock_response(status=200, chunks=chunks, headers={})

        with patch(
            "custom_components.eppgrid.firmware_proxy.async_get_clientsession",
            return_value=_mock_session(mock_resp),
        ):
            resp = await view.get(request, "everything-presence-pro-wifi-ble-co2-manifest.json")

        assert resp.status == 502

    async def test_fetches_from_correct_url(self, hass: HomeAssistant, view):
        request = make_request(hass)

        mock_resp = _mock_response(status=200, body=b"{}")

        session = _mock_session(mock_resp)
        with patch(
            "custom_components.eppgrid.firmware_proxy.async_get_clientsession",
            return_value=session,
        ):
            await view.get(request, "everything-presence-pro-wifi-ble-co2-manifest.json")

        from custom_components.eppgrid.const import FIRMWARE_VERSION

        call_url = session.get.call_args[0][0]
        assert (
            f"github.com/clintongormley/everything-presence-pro-grid/releases/download/v{FIRMWARE_VERSION}/" in call_url
        )
        assert call_url.endswith("everything-presence-pro-wifi-ble-co2-manifest.json")
