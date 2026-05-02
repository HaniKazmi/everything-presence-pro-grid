"""Device-side firmware-update auto-poll is disabled.

The `update.http_request` polling component defaults to a 6h interval. Each
poll opens an HTTPS connection to GitHub Pages, allocating ~30-50 KB of
mbedtls TLS context for the handshake. Combined with bluetooth_proxy + active
BLE scan on the wifi-ble-co2 variant this transient spike has been the
leading suspect for OOM-driven reboots observed in the field.

The eppgrid integration ships with a pinned FIRMWARE_VERSION constant and
already detects mismatches in `_compare_firmware_version`; from v0.98.0 it
also surfaces them through HA's Repairs framework. That makes the device-side
auto-poll redundant: the source of truth for "is there a newer firmware" is
the integration, not the device. Manual checks via the OTA button still work,
and panel-triggered OTAs go through the `set_update_manifest` API action
which explicitly invokes `component.update` + `update.perform`.
"""

from pathlib import Path

import pytest
import yaml

from tests.esphome_yaml import ESPHomeLoader

REPO_ROOT = Path(__file__).resolve().parents[1]
VARIANT_FILES = ["wifi-ble-co2.yaml", "ethernet-ble-co2.yaml"]


def _load_variant(name: str) -> dict:
    text = (REPO_ROOT / "firmware" / "variants" / name).read_text()
    return yaml.load(text, Loader=ESPHomeLoader)


def _find_update_block(doc: dict, update_id: str) -> dict | None:
    update_blocks = doc.get("update", [])
    for block in update_blocks:
        if isinstance(block, dict) and block.get("id") == update_id:
            return block
    return None


@pytest.mark.parametrize("variant", VARIANT_FILES)
def test_firmware_update_autopoll_disabled(variant: str) -> None:
    """The http_request firmware-update component must not auto-poll.

    `update_interval: never` disables ESPHome's polling driver entirely. The
    component still works for explicit `component.update` / `update.perform`
    calls (used by the panel's set_update_manifest action and by the OTA
    button), it just stops the periodic background TLS handshake that the
    integration's version pinning has made unnecessary.
    """
    doc = _load_variant(variant)
    block = _find_update_block(doc, "update_http_request")
    assert block is not None, (
        f"variant {variant} must define an `update.http_request` block with "
        "id `update_http_request` (used by set_update_manifest action)"
    )
    interval = block.get("update_interval")
    assert interval == "never", (
        f"variant {variant} must set `update_interval: never` on the firmware "
        f"update http_request block, got {interval!r}. The integration is now "
        "the source of truth for firmware-update detection (FIRMWARE_VERSION "
        "constant + Repairs framework); the device-side 6h auto-poll opens an "
        "HTTPS connection to GitHub Pages every cycle and is the leading "
        "suspect for OOM-driven reboots on the wifi-ble-co2 variant."
    )
