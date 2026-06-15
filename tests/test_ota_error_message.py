"""Classify OTA device-error log lines so the panel can explain a likely
memory failure instead of dumping the raw ESP_ERR.

When the OTA can't download the firmware — the device log shows
`HTTP Request failed ... Code: -1` or `ESP_ERR_HTTP_CONNECT` — it's almost
always because the device ran out of contiguous heap for the TLS handshake (the
dominant OTA failure on the memory-tight wifi-ble-co2 build). We route those to
a distinct error_key whose translation says so and tells the user the device
reboots+retries automatically, rather than surfacing the opaque ESP_ERR.
"""

from __future__ import annotations

import pytest

from custom_components.eppgrid.websocket_api._firmware import _classify_ota_error_key

_LOW_MEMORY = "flasher.errors.ota_low_memory"
_GENERIC = "flasher.errors.ota_device_error"


@pytest.mark.parametrize(
    "message",
    [
        "HTTP Request failed: ESP_ERR_HTTP_CONNECT",
        "HTTP Request failed; URL: https://example/ota.bin; Code: -1",
        "OTA failed: ESP_ERR_NO_MEM",
    ],
)
def test_download_or_connect_failure_is_classified_low_memory(message: str) -> None:
    assert _classify_ota_error_key(message) == _LOW_MEMORY


@pytest.mark.parametrize(
    "message",
    [
        "Bad magic byte in firmware image",
        "HTTP Request failed; URL: https://example/ota.bin; Code: 404",
        # `Code: -1` is anchored — a -10x code is a different failure, not OOM.
        "HTTP Request failed; URL: https://example/ota.bin; Code: -110",
        "Update failed for some other reason",
    ],
)
def test_non_memory_failure_stays_generic(message: str) -> None:
    assert _classify_ota_error_key(message) == _GENERIC
