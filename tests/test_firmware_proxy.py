"""Tests for the firmware proxy HTTP view."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

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


class TestFirmwareProxyView:
    def test_url_pattern(self, view):
        assert view.url == "/api/eppgrid/firmware/{filename}"

    def test_does_not_require_auth(self, view):
        assert view.requires_auth is False

    async def test_rejects_invalid_filename(self, hass: HomeAssistant, view):
        request = make_request(hass)
        resp = await view.get(request, "malicious-file.exe")
        assert resp.status == 400

    async def test_rejects_filename_without_prefix(self, hass: HomeAssistant, view):
        request = make_request(hass)
        resp = await view.get(request, "bootloader.bin")
        assert resp.status == 400

    async def test_proxies_manifest_json(self, hass: HomeAssistant, view):
        request = make_request(hass)
        manifest_data = b'{"builds": []}'

        mock_resp = AsyncMock()
        mock_resp.status = 200
        mock_resp.read = AsyncMock(return_value=manifest_data)

        mock_session = AsyncMock()
        mock_session.get = AsyncMock(return_value=mock_resp)

        with patch(
            "custom_components.eppgrid.firmware_proxy.async_get_clientsession",
            return_value=mock_session,
        ):
            resp = await view.get(request, "everything-presence-pro-wifi-ble-co2-manifest.json")

        assert resp.status == 200
        assert resp.body == manifest_data
        assert resp.content_type == "application/json"

    async def test_proxies_binary_file(self, hass: HomeAssistant, view):
        request = make_request(hass)
        binary_data = b"\x00\x01\x02\x03"

        mock_resp = AsyncMock()
        mock_resp.status = 200
        mock_resp.read = AsyncMock(return_value=binary_data)

        mock_session = AsyncMock()
        mock_session.get = AsyncMock(return_value=mock_resp)

        with patch(
            "custom_components.eppgrid.firmware_proxy.async_get_clientsession",
            return_value=mock_session,
        ):
            resp = await view.get(request, "everything-presence-pro-wifi-ble-co2-bootloader.bin")

        assert resp.status == 200
        assert resp.body == binary_data
        assert resp.content_type == "application/octet-stream"

    async def test_returns_404_when_upstream_not_found(self, hass: HomeAssistant, view):
        request = make_request(hass)

        mock_resp = AsyncMock()
        mock_resp.status = 404

        mock_session = AsyncMock()
        mock_session.get = AsyncMock(return_value=mock_resp)

        with patch(
            "custom_components.eppgrid.firmware_proxy.async_get_clientsession",
            return_value=mock_session,
        ):
            resp = await view.get(request, "everything-presence-pro-wifi-ble-co2-manifest.json")

        assert resp.status == 404

    async def test_returns_502_on_network_error(self, hass: HomeAssistant, view):
        request = make_request(hass)

        mock_session = AsyncMock()
        mock_session.get = AsyncMock(side_effect=Exception("network error"))

        with patch(
            "custom_components.eppgrid.firmware_proxy.async_get_clientsession",
            return_value=mock_session,
        ):
            resp = await view.get(request, "everything-presence-pro-wifi-ble-co2-manifest.json")

        assert resp.status == 502

    async def test_fetches_from_correct_url(self, hass: HomeAssistant, view):
        request = make_request(hass)

        mock_resp = AsyncMock()
        mock_resp.status = 200
        mock_resp.read = AsyncMock(return_value=b"{}")

        mock_session = AsyncMock()
        mock_session.get = AsyncMock(return_value=mock_resp)

        with patch(
            "custom_components.eppgrid.firmware_proxy.async_get_clientsession",
            return_value=mock_session,
        ):
            await view.get(request, "everything-presence-pro-wifi-ble-co2-manifest.json")

        call_url = mock_session.get.call_args[0][0]
        assert "releases/download/v0.1.0-alpha.2" in call_url
        assert call_url.endswith("everything-presence-pro-wifi-ble-co2-manifest.json")
