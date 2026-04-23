"""Firmware version alignment.

The device firmware version is written in three places that must agree,
otherwise the integration's compatibility check (_compare_firmware_version)
surfaces a spurious "Integration update required" banner in the UI:

  1. firmware/components/epp/epp_component.h  FIRMWARE_VERSION_STR
       — what the device publishes via the Firmware Version text_sensor.
  2. firmware/common/everything-presence-pro-base.yaml  project.version
       — what ESPHome advertises via the project metadata.
  3. custom_components/eppgrid/const.py  FIRMWARE_VERSION
       — what the integration expects devices to report.

The manifest.json version is NOT in this set: integration-only releases can
bump manifest without bumping firmware. See .github/scripts/validate-release.sh
for the tag-time invariants.
"""

import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]


def _read_const_firmware_version() -> str:
    text = (REPO_ROOT / "custom_components" / "eppgrid" / "const.py").read_text()
    match = re.search(r'^FIRMWARE_VERSION\s*=\s*"([^"]+)"', text, re.MULTILINE)
    assert match, "FIRMWARE_VERSION not found in const.py"
    return match.group(1)


def _read_yaml_firmware_version() -> str:
    text = (REPO_ROOT / "firmware" / "common" / "everything-presence-pro-base.yaml").read_text()
    match = re.search(r'^ {4}version:\s*"([^"]+)"', text, re.MULTILINE)
    assert match, "project.version not found in everything-presence-pro-base.yaml"
    return match.group(1)


def _read_header_firmware_version() -> str:
    text = (REPO_ROOT / "firmware" / "components" / "epp" / "epp_component.h").read_text()
    match = re.search(r'FIRMWARE_VERSION_STR\s*=\s*"([^"]+)"', text)
    assert match, "FIRMWARE_VERSION_STR not found in epp_component.h"
    return match.group(1)


def test_firmware_version_sources_agree():
    const_ver = _read_const_firmware_version()
    yaml_ver = _read_yaml_firmware_version()
    header_ver = _read_header_firmware_version()

    mismatches = {
        "custom_components/eppgrid/const.py FIRMWARE_VERSION": const_ver,
        "firmware/common/everything-presence-pro-base.yaml project.version": yaml_ver,
        "firmware/components/epp/epp_component.h FIRMWARE_VERSION_STR": header_ver,
    }
    unique = set(mismatches.values())
    if len(unique) != 1:
        detail = "\n".join(f"  {k}: {v}" for k, v in mismatches.items())
        pytest.fail(
            f"Firmware versions disagree across {len(unique)} sources — "
            f"forgetting any of these on a version bump shows the device as "
            f"'Integration update needed' even when the numbers look right:\n{detail}"
        )
