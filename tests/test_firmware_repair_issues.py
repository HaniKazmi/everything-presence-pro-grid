"""Repairs issues for firmware/integration version mismatches.

The eppgrid integration pins FIRMWARE_VERSION and treats it as the source of
truth for which firmware version a given integration release expects. When a
discovered device runs a different version, the integration surfaces it via
HA's Repairs framework so the user sees the mismatch in Settings → Repairs
without having to open the EPP Grid panel.

Two issue types per device, both keyed by MAC:
  - firmware_behind_{mac}: device runs older firmware than integration wants
  - firmware_ahead_{mac}:  device runs newer firmware than integration wants

Either issue is cleared as soon as the version comes back in line. Offline
devices (None version) leave existing issues alone — we just don't have data
to act on.
"""

from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.helpers import issue_registry as ir

from custom_components.eppgrid.const import DOMAIN
from custom_components.eppgrid.const import FIRMWARE_VERSION
from custom_components.eppgrid.device_manager._helpers import _sync_firmware_repair_issue


def _bump(version: str, *, kind: str) -> str:
    major, minor, _patch = (int(p) for p in version.split("."))
    if kind == "behind":
        # An older release: drop minor by 1 (or major if minor is 0)
        return f"{major}.{max(minor - 1, 0)}.0" if minor > 0 else f"{max(major - 1, 0)}.99.0"
    if kind == "ahead":
        return f"{major}.{minor + 1}.0"
    raise ValueError(kind)


async def test_creates_behind_issue_when_device_older(hass: HomeAssistant) -> None:
    behind_version = _bump(FIRMWARE_VERSION, kind="behind")
    _sync_firmware_repair_issue(hass, mac="AA:BB:CC:DD:EE:01", device_name="Living Room", fw_ver=behind_version)

    reg = ir.async_get(hass)
    issue = reg.async_get_issue(DOMAIN, "firmware_behind_AA:BB:CC:DD:EE:01")
    assert issue is not None, "expected firmware_behind issue to be created when device runs older firmware"
    assert issue.translation_key == "firmware_behind"
    assert issue.translation_placeholders == {
        "device_name": "Living Room",
        "current_version": behind_version,
        "required_version": FIRMWARE_VERSION,
    }
    assert issue.severity == ir.IssueSeverity.WARNING
    assert issue.is_fixable is False


async def test_creates_ahead_issue_when_device_newer(hass: HomeAssistant) -> None:
    ahead_version = _bump(FIRMWARE_VERSION, kind="ahead")
    _sync_firmware_repair_issue(hass, mac="AA:BB:CC:DD:EE:02", device_name="Bedroom", fw_ver=ahead_version)

    reg = ir.async_get(hass)
    issue = reg.async_get_issue(DOMAIN, "firmware_ahead_AA:BB:CC:DD:EE:02")
    assert issue is not None, "expected firmware_ahead issue to be created when device runs newer firmware"
    assert issue.translation_key == "firmware_ahead"
    assert issue.translation_placeholders == {
        "device_name": "Bedroom",
        "current_version": ahead_version,
        "required_version": FIRMWARE_VERSION,
    }


async def test_clears_both_issues_when_compatible(hass: HomeAssistant) -> None:
    mac = "AA:BB:CC:DD:EE:03"
    # Pre-create both kinds of issue, simulating a previous mismatch state
    ir.async_create_issue(
        hass,
        DOMAIN,
        f"firmware_behind_{mac}",
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key="firmware_behind",
    )
    ir.async_create_issue(
        hass,
        DOMAIN,
        f"firmware_ahead_{mac}",
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key="firmware_ahead",
    )

    _sync_firmware_repair_issue(hass, mac=mac, device_name="Office", fw_ver=FIRMWARE_VERSION)

    reg = ir.async_get(hass)
    assert reg.async_get_issue(DOMAIN, f"firmware_behind_{mac}") is None
    assert reg.async_get_issue(DOMAIN, f"firmware_ahead_{mac}") is None


async def test_offline_device_leaves_existing_issue_alone(hass: HomeAssistant) -> None:
    """When fw_ver is None we have no data to act on — don't change issue state.

    Removing an issue when the device goes offline would mask a real problem
    that needs the user's attention as soon as the device comes back.
    """
    mac = "AA:BB:CC:DD:EE:04"
    ir.async_create_issue(
        hass,
        DOMAIN,
        f"firmware_behind_{mac}",
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key="firmware_behind",
    )

    _sync_firmware_repair_issue(hass, mac=mac, device_name="Garage", fw_ver=None)

    reg = ir.async_get(hass)
    assert reg.async_get_issue(DOMAIN, f"firmware_behind_{mac}") is not None, (
        "offline device should leave existing firmware_behind issue intact"
    )


async def test_switching_from_behind_to_ahead_clears_behind(hass: HomeAssistant) -> None:
    """Repeated calls update — old issue from a previous status is cleared."""
    mac = "AA:BB:CC:DD:EE:05"
    behind_version = _bump(FIRMWARE_VERSION, kind="behind")
    _sync_firmware_repair_issue(hass, mac=mac, device_name="Hallway", fw_ver=behind_version)

    reg = ir.async_get(hass)
    assert reg.async_get_issue(DOMAIN, f"firmware_behind_{mac}") is not None

    # User OTAs to a newer-than-integration version
    ahead_version = _bump(FIRMWARE_VERSION, kind="ahead")
    _sync_firmware_repair_issue(hass, mac=mac, device_name="Hallway", fw_ver=ahead_version)

    assert reg.async_get_issue(DOMAIN, f"firmware_behind_{mac}") is None, (
        "firmware_behind issue must be cleared once the device transitions to firmware_ahead"
    )
    assert reg.async_get_issue(DOMAIN, f"firmware_ahead_{mac}") is not None


# ---------------------------------------------------------------------------
# Integration with DeviceManager
# ---------------------------------------------------------------------------


async def test_on_device_available_clears_repair_after_ota_brings_versions_in_line(hass: HomeAssistant) -> None:
    """OTA recovery: pre-existing firmware_behind issue clears once the device
    reconnects on the matching version.

    The OTA path is: device runs old fw → issue raised → user OTAs → device
    reboots and reconnects → firmware_version sensor reports new value →
    `_on_device_available` runs → issue must be cleared.
    """
    from unittest.mock import AsyncMock
    from unittest.mock import patch

    from homeassistant.helpers import device_registry as dr
    from homeassistant.helpers import entity_registry as er
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    from custom_components.eppgrid.device_manager import DeviceManager
    from custom_components.eppgrid.device_manager import ManagedDevice
    from custom_components.eppgrid.storage import EPPGridStore

    mac = "AA:BB:CC:DD:EE:11"

    esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.51"}, title="EPP Bedroom")
    esphome_entry.add_to_hass(hass)

    dev_reg = dr.async_get(hass)
    device = dev_reg.async_get_or_create(
        config_entry_id=esphome_entry.entry_id,
        connections={("mac", mac.lower())},
        name="EPP Bedroom",
        manufacturer="EverythingSmartTechnology",
        model="Everything Presence Pro",
    )

    ent_reg = er.async_get(hass)
    fw_entry = ent_reg.async_get_or_create(
        "sensor",
        "esphome",
        unique_id=f"{mac}-sensor-firmware_version",
        suggested_object_id="epp_bedroom_firmware_version",
        config_entry=esphome_entry,
        device_id=device.id,
    )

    # Pre-state: device was on an older version, issue was raised
    ir.async_create_issue(
        hass,
        DOMAIN,
        f"firmware_behind_{mac}",
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key="firmware_behind",
    )

    manager = DeviceManager(hass, EPPGridStore(hass))
    manager.devices[mac] = ManagedDevice(
        mac=mac,
        name="EPP Bedroom",
        host="192.168.1.51",
        esphome_config_entry_id=esphome_entry.entry_id,
        device_id=device.id,
    )

    # Device comes back online reporting the matching firmware version. Mock
    # _push_config_to_device — it's incidental to what we're testing here, and
    # the real path opens a network socket which the HA test framework blocks.
    hass.states.async_set(fw_entry.entity_id, FIRMWARE_VERSION)
    with patch.object(manager, "_push_config_to_device", new=AsyncMock(return_value=True)):
        await manager._on_device_available(mac)

    assert ir.async_get(hass).async_get_issue(DOMAIN, f"firmware_behind_{mac}") is None, (
        "firmware_behind issue must be cleared once a device reconnects on the matching firmware"
    )


async def test_async_discover_creates_repair_issue_for_outdated_device(hass: HomeAssistant) -> None:
    """async_discover must surface a firmware-version mismatch via Repairs.

    The integration's source-of-truth check needs to fire as soon as a device
    is discovered, not just when the panel happens to make an API call.
    """
    from homeassistant.helpers import device_registry as dr
    from homeassistant.helpers import entity_registry as er
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    from custom_components.eppgrid.device_manager import DeviceManager
    from custom_components.eppgrid.storage import EPPGridStore

    behind_version = _bump(FIRMWARE_VERSION, kind="behind")
    mac = "AA:BB:CC:DD:EE:10"

    esphome_entry = MockConfigEntry(
        domain="esphome",
        data={"host": "192.168.1.50"},
        title="EPP Living Room",
    )
    esphome_entry.add_to_hass(hass)

    dev_reg = dr.async_get(hass)
    device = dev_reg.async_get_or_create(
        config_entry_id=esphome_entry.entry_id,
        connections={("mac", mac.lower())},
        name="EPP Living Room",
        manufacturer="EverythingSmartTechnology",
        model="Everything Presence Pro",
    )

    ent_reg = er.async_get(hass)
    fw_entry = ent_reg.async_get_or_create(
        "sensor",
        "esphome",
        unique_id=f"{mac}-sensor-firmware_version",
        suggested_object_id="epp_firmware_version",
        config_entry=esphome_entry,
        device_id=device.id,
    )
    hass.states.async_set(fw_entry.entity_id, behind_version)

    manager = DeviceManager(hass, EPPGridStore(hass))
    await manager.async_discover()

    issue = ir.async_get(hass).async_get_issue(DOMAIN, f"firmware_behind_{mac}")
    assert issue is not None, "discovering a device on older firmware must raise a Repairs issue"
    assert issue.translation_placeholders is not None
    assert issue.translation_placeholders["device_name"] == "EPP Living Room"
    assert issue.translation_placeholders["current_version"] == behind_version
