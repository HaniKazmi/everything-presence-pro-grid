"""Tests for ESPHome OTA protocol implementation."""

from __future__ import annotations

import asyncio
import hashlib
from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest

from custom_components.eppgrid.ota import OTAError
from custom_components.eppgrid.ota import fetch_firmware_binary
from custom_components.eppgrid.ota import push_ota

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _async_context_manager(mock_obj):
    """Wrap a mock in an async context manager."""
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=mock_obj)
    cm.__aexit__ = AsyncMock(return_value=False)
    return cm


# ---------------------------------------------------------------------------
# TestFetchFirmwareBinary
# ---------------------------------------------------------------------------


class TestFetchFirmwareBinary:
    """Tests for fetch_firmware_binary()."""

    async def test_fetches_binary_from_manifest(self) -> None:
        """Fetches manifest then downloads binary, returning bytes."""
        binary_data = b"\x00\x01\x02\x03" * 256

        manifest_json = {
            "builds": [
                {
                    "ota": {
                        "path": "https://example.com/firmware.bin",
                    }
                }
            ]
        }

        # Mock manifest response
        mock_manifest_resp = MagicMock()
        mock_manifest_resp.json = AsyncMock(return_value=manifest_json)
        mock_manifest_resp.raise_for_status = MagicMock()

        # Mock binary response
        mock_binary_resp = MagicMock()
        mock_binary_resp.read = AsyncMock(return_value=binary_data)
        mock_binary_resp.raise_for_status = MagicMock()

        mock_session = MagicMock()
        mock_session.get = MagicMock(
            side_effect=[
                _async_context_manager(mock_manifest_resp),
                _async_context_manager(mock_binary_resp),
            ]
        )

        result = await fetch_firmware_binary(mock_session, "wifi")

        assert result == binary_data

    async def test_raises_on_no_ota_build(self) -> None:
        """Raises OTAError when manifest has builds but no 'ota' key."""
        manifest_json = {
            "builds": [
                {
                    "chipFamily": "ESP32-S3",
                    # no "ota" key
                }
            ]
        }

        mock_manifest_resp = MagicMock()
        mock_manifest_resp.json = AsyncMock(return_value=manifest_json)
        mock_manifest_resp.raise_for_status = MagicMock()

        mock_session = MagicMock()
        mock_session.get = MagicMock(return_value=_async_context_manager(mock_manifest_resp))

        with pytest.raises(OTAError, match="No OTA build"):
            await fetch_firmware_binary(mock_session, "wifi")

    async def test_uses_correct_manifest_url(self) -> None:
        """Fetches manifest from the expected URL for the given variant."""
        from custom_components.eppgrid.const import MANIFEST_BASE_URL

        binary_data = b"\xde\xad\xbe\xef"
        manifest_json = {"builds": [{"ota": {"path": "https://example.com/fw.bin"}}]}

        mock_manifest_resp = MagicMock()
        mock_manifest_resp.json = AsyncMock(return_value=manifest_json)
        mock_manifest_resp.raise_for_status = MagicMock()

        mock_binary_resp = MagicMock()
        mock_binary_resp.read = AsyncMock(return_value=binary_data)
        mock_binary_resp.raise_for_status = MagicMock()

        captured_urls = []

        def mock_get(url, **kwargs):
            captured_urls.append(url)
            if "manifest" in url:
                return _async_context_manager(mock_manifest_resp)
            return _async_context_manager(mock_binary_resp)

        mock_session = MagicMock()
        mock_session.get = mock_get

        await fetch_firmware_binary(mock_session, "wifi")

        assert captured_urls[0] == f"{MANIFEST_BASE_URL}/everything-presence-pro-wifi-ble-co2-manifest.json"


# ---------------------------------------------------------------------------
# TestPushOta
# ---------------------------------------------------------------------------


class TestPushOta:
    """Tests for push_ota()."""

    async def test_successful_push(self) -> None:
        """Full happy-path: sends magic, sizes, MD5, streams chunks, reads OKs."""
        firmware = b"\xab\xcd" * 4096  # 8192 bytes exactly

        # Reader returns 0x00 (OK) for every status read
        mock_reader = AsyncMock()
        mock_reader.read = AsyncMock(return_value=b"\x00")

        mock_writer = MagicMock()
        mock_writer.write = MagicMock()
        mock_writer.drain = AsyncMock()
        mock_writer.close = MagicMock()
        mock_writer.wait_closed = AsyncMock()

        with patch(
            "asyncio.open_connection",
            new_callable=AsyncMock,
            return_value=(mock_reader, mock_writer),
        ):
            await push_ota("192.168.1.50", firmware)

        # Writer.write must have been called (magic byte among others)
        mock_writer.write.assert_called()

    async def test_push_connection_refused(self) -> None:
        """Raises OTAError when connection is refused."""
        firmware = b"\xab\xcd" * 100

        with (
            patch(
                "asyncio.open_connection",
                new_callable=AsyncMock,
                side_effect=ConnectionRefusedError("refused"),
            ),
            pytest.raises(OTAError, match=r"[Cc]onnect"),
        ):
            await push_ota("192.168.1.50", firmware)

    async def test_push_bad_status(self) -> None:
        """Raises OTAError when device returns non-zero status."""
        firmware = b"\xab\xcd" * 100

        # Return error status (0x01) on first read
        mock_reader = AsyncMock()
        mock_reader.read = AsyncMock(return_value=b"\x01")

        mock_writer = MagicMock()
        mock_writer.write = MagicMock()
        mock_writer.drain = AsyncMock()
        mock_writer.close = MagicMock()
        mock_writer.wait_closed = AsyncMock()

        with (
            patch(
                "asyncio.open_connection",
                new_callable=AsyncMock,
                return_value=(mock_reader, mock_writer),
            ),
            pytest.raises(OTAError),
        ):
            await push_ota("192.168.1.50", firmware)

    async def test_progress_callback_called(self) -> None:
        """on_progress callback is invoked during firmware streaming."""
        chunk_size = 8192
        firmware = b"\xab" * (chunk_size * 3)  # 3 chunks

        mock_reader = AsyncMock()
        mock_reader.read = AsyncMock(return_value=b"\x00")

        mock_writer = MagicMock()
        mock_writer.write = MagicMock()
        mock_writer.drain = AsyncMock()
        mock_writer.close = MagicMock()
        mock_writer.wait_closed = AsyncMock()

        progress_calls = []

        def on_progress(sent, total):
            progress_calls.append((sent, total))

        with patch(
            "asyncio.open_connection",
            new_callable=AsyncMock,
            return_value=(mock_reader, mock_writer),
        ):
            await push_ota("192.168.1.50", firmware, on_progress=on_progress)

        # Should have been called at least once per chunk
        assert len(progress_calls) >= 3
        # Final call should report total bytes sent
        assert progress_calls[-1][0] == len(firmware)
        assert progress_calls[-1][1] == len(firmware)

    async def test_sends_correct_md5(self) -> None:
        """Verifies the correct MD5 hash is sent to the device."""
        firmware = b"\xde\xad\xbe\xef" * 512
        expected_md5 = hashlib.md5(firmware).hexdigest().encode("ascii")

        mock_reader = AsyncMock()
        mock_reader.read = AsyncMock(return_value=b"\x00")

        written_data = []

        mock_writer = MagicMock()
        mock_writer.write = MagicMock(side_effect=lambda data: written_data.append(data))
        mock_writer.drain = AsyncMock()
        mock_writer.close = MagicMock()
        mock_writer.wait_closed = AsyncMock()

        with patch(
            "asyncio.open_connection",
            new_callable=AsyncMock,
            return_value=(mock_reader, mock_writer),
        ):
            await push_ota("192.168.1.50", firmware)

        # MD5 hash (32 ASCII bytes) should appear in the written data
        all_written = b"".join(written_data)
        assert expected_md5 in all_written

    async def test_connection_always_closed(self) -> None:
        """Writer is closed even when an error occurs mid-transfer."""
        firmware = b"\xab\xcd" * 100

        mock_reader = AsyncMock()
        # Return OK for first read, then error status on second
        mock_reader.read = AsyncMock(side_effect=[b"\x00", b"\x01"])

        mock_writer = MagicMock()
        mock_writer.write = MagicMock()
        mock_writer.drain = AsyncMock()
        mock_writer.close = MagicMock()
        mock_writer.wait_closed = AsyncMock()

        with (
            patch(
                "asyncio.open_connection",
                new_callable=AsyncMock,
                return_value=(mock_reader, mock_writer),
            ),
            pytest.raises(OTAError),
        ):
            await push_ota("192.168.1.50", firmware)

        mock_writer.close.assert_called_once()

    async def test_push_os_error(self) -> None:
        """Raises OTAError when connection raises a generic OSError."""
        firmware = b"\xab\xcd" * 100

        with (
            patch(
                "asyncio.open_connection",
                new_callable=AsyncMock,
                side_effect=OSError("Network unreachable"),
            ),
            pytest.raises(OTAError, match="Cannot connect"),
        ):
            await push_ota("192.168.1.50", firmware)

    async def test_wait_closed_exception_suppressed(self) -> None:
        """Exception from wait_closed() is suppressed; OTA error still propagates."""
        firmware = b"\xab\xcd" * 100

        mock_reader = AsyncMock()
        mock_reader.read = AsyncMock(return_value=b"\x01")  # Bad status

        mock_writer = MagicMock()
        mock_writer.write = MagicMock()
        mock_writer.drain = AsyncMock()
        mock_writer.close = MagicMock()
        mock_writer.wait_closed = AsyncMock(side_effect=OSError("pipe broken"))

        with (
            patch(
                "asyncio.open_connection",
                new_callable=AsyncMock,
                return_value=(mock_reader, mock_writer),
            ),
            pytest.raises(OTAError),
        ):
            await push_ota("192.168.1.50", firmware)

        mock_writer.close.assert_called_once()

    async def test_connection_closed_mid_transfer(self) -> None:
        """Raises OTAError when device closes connection (empty read) mid-handshake."""
        firmware = b"\xab\xcd" * 100

        mock_reader = AsyncMock()
        # First read returns empty bytes (connection closed)
        mock_reader.read = AsyncMock(return_value=b"")

        mock_writer = MagicMock()
        mock_writer.write = MagicMock()
        mock_writer.drain = AsyncMock()
        mock_writer.close = MagicMock()
        mock_writer.wait_closed = AsyncMock()

        with (
            patch(
                "asyncio.open_connection",
                new_callable=AsyncMock,
                return_value=(mock_reader, mock_writer),
            ),
            pytest.raises(OTAError, match="closed unexpectedly"),
        ):
            await push_ota("192.168.1.50", firmware)

    async def test_read_timeout_raises_ota_error(self) -> None:
        """Raises OTAError when a status read times out."""
        firmware = b"\xab\xcd" * 100

        mock_reader = AsyncMock()
        # Simulate a hanging read by raising TimeoutError via wait_for
        mock_reader.read = AsyncMock(side_effect=asyncio.TimeoutError)

        mock_writer = MagicMock()
        mock_writer.write = MagicMock()
        mock_writer.drain = AsyncMock()
        mock_writer.close = MagicMock()
        mock_writer.wait_closed = AsyncMock()

        with (
            patch(
                "asyncio.open_connection",
                new_callable=AsyncMock,
                return_value=(mock_reader, mock_writer),
            ),
            patch("asyncio.wait_for", side_effect=asyncio.TimeoutError),
            pytest.raises(OTAError, match=r"[Tt]imed out"),
        ):
            await push_ota("192.168.1.50", firmware, timeout=5.0)

    async def test_connection_timeout_raises_ota_error(self) -> None:
        """Raises OTAError when the TCP connection itself times out."""
        firmware = b"\xab\xcd" * 100

        with (
            patch(
                "asyncio.open_connection",
                new_callable=AsyncMock,
                side_effect=asyncio.TimeoutError,
            ),
            patch("asyncio.wait_for", side_effect=asyncio.TimeoutError),
            pytest.raises(OTAError, match=r"[Tt]imed out"),
        ):
            await push_ota("192.168.1.50", firmware, timeout=1.0)
