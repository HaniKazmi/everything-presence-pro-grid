"""Repairs fix flow that triggers an OTA from the firmware_behind issue.

The Repairs framework lets us mark issues as `is_fixable=True` and provide
a `RepairsFlow` so that clicking "Submit" in HA Settings → Repairs runs
a defined action. For firmware_behind issues, that action is the same
OTA trigger the EPP Grid panel exposes — so users can update without
opening the panel at all.

firmware_ahead issues stay unfixable: the device is on a newer version
than the integration expects, and the resolution is to update the
integration via HACS — which we can't drive from a Repairs flow.
"""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import issue_registry as ir

from custom_components.eppgrid.const import DOMAIN
from custom_components.eppgrid.const import FIRMWARE_VERSION
from custom_components.eppgrid.device_manager._helpers import _sync_firmware_repair_issue


def _bump(version: str, *, kind: str) -> str:
    major, minor, _patch = (int(p) for p in version.split("."))
    if kind == "behind":
        return f"{major}.{max(minor - 1, 0)}.0" if minor > 0 else f"{max(major - 1, 0)}.99.0"
    if kind == "ahead":
        return f"{major}.{minor + 1}.0"
    raise ValueError(kind)


async def test_firmware_behind_issue_is_fixable(hass: HomeAssistant) -> None:
    """Behind-version issues must be is_fixable=True so the Submit button appears.

    The whole point of the fix flow is that the user can resolve the issue
    from Repairs without opening the EPP Grid panel; that requires
    is_fixable=True on the underlying issue.
    """
    behind = _bump(FIRMWARE_VERSION, kind="behind")
    _sync_firmware_repair_issue(hass, mac="AA:BB:CC:DD:EE:40", device_name="Living Room", fw_ver=behind)

    issue = ir.async_get(hass).async_get_issue(DOMAIN, "firmware_behind_AA:BB:CC:DD:EE:40")
    assert issue is not None
    assert issue.is_fixable is True, (
        "firmware_behind issue must be is_fixable=True so the Submit button appears in Repairs UI"
    )


async def test_firmware_ahead_issue_stays_unfixable(hass: HomeAssistant) -> None:
    """Ahead-version issues are not fixable — user must update the integration.

    The remediation for `firmware_ahead` is to upgrade the integration via
    HACS, which we have no way to trigger from a Repairs flow. Marking it
    fixable would mislead the user into thinking we can resolve it.
    """
    ahead = _bump(FIRMWARE_VERSION, kind="ahead")
    _sync_firmware_repair_issue(hass, mac="AA:BB:CC:DD:EE:41", device_name="Bedroom", fw_ver=ahead)

    issue = ir.async_get(hass).async_get_issue(DOMAIN, "firmware_ahead_AA:BB:CC:DD:EE:41")
    assert issue is not None
    assert issue.is_fixable is False, "firmware_ahead is not user-fixable from a Repairs flow"


async def test_create_fix_flow_returns_handler_for_firmware_behind(hass: HomeAssistant) -> None:
    """`async_create_fix_flow` must return a RepairsFlow for firmware_behind."""
    from homeassistant.components.repairs import RepairsFlow

    from custom_components.eppgrid.repairs import async_create_fix_flow

    flow = await async_create_fix_flow(hass, "firmware_behind_AA:BB:CC:DD:EE:42", data=None)
    assert isinstance(flow, RepairsFlow)


async def test_create_fix_flow_raises_for_unknown_issue_id(hass: HomeAssistant) -> None:
    """Unknown issue ids must raise — silently returning a generic flow would
    confuse the user with a fix dialog that does nothing useful.
    """
    from custom_components.eppgrid.repairs import async_create_fix_flow

    with pytest.raises(HomeAssistantError):
        await async_create_fix_flow(hass, "some_other_unrelated_issue_id", data=None)


async def test_fix_flow_triggers_ota_on_confirm(hass: HomeAssistant) -> None:
    """Submitting the confirm step must call the manager's OTA trigger.

    Without this assertion, a regression that broke the OTA call (or
    forgot to wire it up at all) would leave users with a Submit button
    that quietly succeeds without actually updating the firmware.
    """
    from custom_components.eppgrid.repairs import FirmwareUpdateRepairFlow

    mac = "AA:BB:CC:DD:EE:43"
    flow = FirmwareUpdateRepairFlow(mac=mac)
    flow.hass = hass
    flow.handler = DOMAIN
    flow.issue_id = f"firmware_behind_{mac}"

    # Step 1: init shows the confirm form
    result = await flow.async_step_init(user_input=None)
    assert result["type"] == "form"
    assert result["step_id"] == "init"

    # Step 2: submitting triggers OTA via the manager
    with patch("custom_components.eppgrid.repairs._trigger_ota", new=AsyncMock()) as mock_trigger:
        result = await flow.async_step_init(user_input={})

    mock_trigger.assert_awaited_once_with(hass, mac)
    assert result["type"] == "create_entry", "successful OTA trigger must close the flow with create_entry"


async def test_trigger_ota_calls_set_update_manifest(hass: HomeAssistant) -> None:
    """The shared OTA trigger must call the device's set_update_manifest service.

    This is the same OTA path the panel uses — the fix flow MUST go through
    the same code so we don't introduce a parallel implementation that can
    drift out of sync (different URL, different service name, etc.).
    """
    from custom_components.eppgrid.const import OTA_MANIFEST_BASE_URL
    from custom_components.eppgrid.device_manager import DeviceManager
    from custom_components.eppgrid.device_manager import ManagedDevice
    from custom_components.eppgrid.repairs import _trigger_ota
    from custom_components.eppgrid.storage import EPPGridStore

    mac = "AA:BB:CC:DD:EE:44"
    manager = DeviceManager(hass, EPPGridStore(hass))
    manager.devices[mac] = ManagedDevice(mac=mac, name="X", host="192.168.1.99", device_id="dev1")
    manager._build_flags[mac] = {"ethernet_enabled": False}

    hass.data[DOMAIN] = manager

    # Patch DeviceConnection so we don't open a real socket
    mock_client = AsyncMock()
    mock_client.execute_service = AsyncMock()
    mock_conn = AsyncMock()
    mock_conn._services = {"set_update_manifest": object()}
    mock_conn._client = mock_client

    with patch("custom_components.eppgrid.repairs.DeviceConnection", return_value=mock_conn):
        await _trigger_ota(hass, mac)

    mock_conn.async_connect.assert_awaited_once()
    mock_client.execute_service.assert_awaited_once()
    args, _ = mock_client.execute_service.call_args
    # Second arg is the dict of service variables; should contain the manifest URL
    assert "url" in args[1]
    assert OTA_MANIFEST_BASE_URL in args[1]["url"]
    assert args[1]["url"].endswith("wifi-ble-co2.json")
    mock_conn.async_disconnect.assert_awaited_once()
