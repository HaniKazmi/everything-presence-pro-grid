"""ESPHome OTA protocol implementation for pushing firmware to devices."""

from __future__ import annotations

import asyncio
import contextlib
import hashlib
import struct
from collections.abc import Callable
from typing import Any

from .const import MANIFEST_BASE_URL
from .const import OTA_PORT

# OTA protocol constants
_MAGIC = 0x6C
_VERSION = 2
_AUTH_NONE = 0
_CHUNK_SIZE = 8192


class OTAError(Exception):
    """Raised when an OTA operation fails."""


async def fetch_firmware_binary(session: Any, variant: str) -> bytes:
    """Fetch the OTA firmware binary for a given variant.

    Fetches the manifest JSON, extracts the OTA binary URL, and downloads
    the binary.

    Args:
        session: aiohttp ClientSession to use for HTTP requests.
        variant: Firmware variant name (e.g. "wifi").

    Returns:
        The raw firmware binary bytes.

    Raises:
        OTAError: If no OTA build is found in the manifest.

    """
    manifest_url = f"{MANIFEST_BASE_URL}/everything-presence-pro-{variant}-manifest.json"

    async with session.get(manifest_url) as resp:
        resp.raise_for_status()
        manifest = await resp.json()

    # Find the first build with an "ota" key
    ota_path: str | None = None
    for build in manifest.get("builds", []):
        if "ota" in build:
            ota_path = build["ota"]["path"]
            break

    if ota_path is None:
        raise OTAError("No OTA build found in manifest")

    async with session.get(ota_path) as resp:
        resp.raise_for_status()
        binary = await resp.read()

    return binary


async def push_ota(
    host: str,
    firmware: bytes,
    port: int = OTA_PORT,
    password: str = "",
    timeout: float = 120.0,
    on_progress: Callable[[int, int], None] | None = None,
) -> None:
    """Push a firmware binary to a device using the ESPHome OTA protocol.

    Protocol steps:
      1. Send magic byte (0x6C) + version (2)
      2. Read OK status (0x00)
      3. Send auth type (0 = no auth)
      4. Read OK status
      5. Send firmware size (4 bytes big-endian)
      6. Read OK status
      7. Send MD5 hash (32 bytes ASCII hex)
      8. Read OK status
      9. Stream firmware in chunks (8192 bytes), calling on_progress callback
      10. Read upload OK status
      11. Read final apply OK status

    Args:
        host: Device hostname or IP address.
        firmware: Raw firmware binary bytes.
        port: OTA TCP port (default 3232).
        password: OTA password (currently unused; reserved for future use).
        timeout: Connection and operation timeout in seconds.
        on_progress: Optional callback(sent_bytes, total_bytes) called during upload.

    Raises:
        OTAError: On connection failure or non-OK status from device.

    """
    try:
        reader, writer = await asyncio.wait_for(asyncio.open_connection(host, port), timeout=timeout)
    except TimeoutError as exc:
        raise OTAError(f"Connection to {host}:{port} timed out") from exc
    except ConnectionRefusedError as exc:
        raise OTAError(f"Connection refused to {host}:{port}") from exc
    except OSError as exc:
        raise OTAError(f"Cannot connect to {host}:{port}: {exc}") from exc

    try:
        await _run_ota_protocol(reader, writer, firmware, on_progress, timeout=timeout)
    finally:
        writer.close()
        with contextlib.suppress(Exception):
            await writer.wait_closed()


async def _run_ota_protocol(
    reader: asyncio.StreamReader,
    writer: asyncio.StreamWriter,
    firmware: bytes,
    on_progress: Callable[[int, int], None] | None,
    timeout: float = 120.0,
) -> None:
    """Execute the OTA handshake and data transfer."""
    total = len(firmware)
    md5 = hashlib.md5(firmware).hexdigest().encode("ascii")

    # Step 1: Send magic + version
    writer.write(bytes([_MAGIC, _VERSION]))
    await writer.drain()

    # Step 2: Read OK
    await _read_ok(reader, "after magic/version", timeout=timeout)

    # Step 3: Send auth type (no auth)
    writer.write(bytes([_AUTH_NONE]))
    await writer.drain()

    # Step 4: Read OK
    await _read_ok(reader, "after auth type", timeout=timeout)

    # Step 5: Send firmware size (4 bytes big-endian)
    writer.write(struct.pack(">I", total))
    await writer.drain()

    # Step 6: Read OK
    await _read_ok(reader, "after firmware size", timeout=timeout)

    # Step 7: Send MD5 hash (32 ASCII bytes)
    writer.write(md5)
    await writer.drain()

    # Step 8: Read OK
    await _read_ok(reader, "after MD5", timeout=timeout)

    # Step 9: Stream firmware in chunks
    sent = 0
    while sent < total:
        chunk = firmware[sent : sent + _CHUNK_SIZE]
        writer.write(chunk)
        await writer.drain()
        sent += len(chunk)
        if on_progress is not None:
            on_progress(sent, total)

    # Step 10: Read upload OK
    await _read_ok(reader, "after firmware upload", timeout=timeout)

    # Step 11: Read final apply OK
    await _read_ok(reader, "after apply", timeout=timeout)


async def _read_ok(reader: asyncio.StreamReader, context: str, timeout: float = 120.0) -> None:
    """Read a single status byte and raise OTAError if it is not 0x00."""
    try:
        data = await asyncio.wait_for(reader.read(1), timeout=timeout)
    except TimeoutError as exc:
        raise OTAError(f"Timed out waiting for status {context}") from exc
    if not data:
        raise OTAError(f"Connection closed unexpectedly {context}")
    status = data[0]
    if status != 0x00:
        raise OTAError(f"OTA error status 0x{status:02X} {context}")
