"""Repairs fix flow for firmware-version mismatch issues.

When `_sync_firmware_repair_issue` raises a `firmware_behind_{mac}` issue,
HA shows a "Submit" button on the Repairs UI. Clicking it walks the user
through this flow, which triggers an OTA update via the same
`set_update_manifest` API action the EPP Grid panel uses.

`firmware_ahead_{mac}` issues are intentionally not fixable from here:
the resolution is to update the integration via HACS, which we have no
way to drive from a Repairs flow.
"""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol
from homeassistant import data_entry_flow
from homeassistant.components.repairs import RepairsFlow
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import issue_registry as ir

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

_FIRMWARE_BEHIND_PREFIX = "firmware_behind_"


async def _trigger_ota(hass: HomeAssistant, mac: str) -> None:
    """Trigger an OTA firmware update on a device.

    Thin wrapper over `DeviceManager.async_trigger_ota` so the OTA-trigger
    logic stays in one place — shared with the panel's update_firmware
    websocket handler. Raises HomeAssistantError on failure (no manager,
    device, build flags, variant, host, service call failure).
    """
    manager = hass.data.get(DOMAIN)
    if manager is None:
        raise HomeAssistantError("EPP Grid integration not loaded")
    await manager.async_trigger_ota(mac)


class FirmwareUpdateRepairFlow(RepairsFlow):
    """Confirm + trigger an OTA update for a device with outdated firmware."""

    def __init__(self, mac: str) -> None:
        """Initialize the flow."""
        super().__init__()
        self._mac = mac

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> data_entry_flow.FlowResult:
        """Confirm with the user, then trigger the OTA."""
        errors: dict[str, str] | None = None
        if user_input is not None:
            try:
                await _trigger_ota(self.hass, self._mac)
            except HomeAssistantError as err:
                # Keep the dialog open and surface the failure so the user
                # can retry — the most common causes (device offline, build
                # flags not yet cached) are transient.
                _LOGGER.warning("OTA fix flow for %s failed: %s", self._mac, err)
                errors = {"base": "ota_trigger_failed"}
            else:
                return self.async_create_entry(data={})

        # Pull device_name + version placeholders from the issue itself so the
        # confirmation dialog shows the same info the user saw on the issue.
        issue_registry = ir.async_get(self.hass)
        placeholders: dict[str, str] | None = None
        if issue := issue_registry.async_get_issue(DOMAIN, self.issue_id):
            placeholders = dict(issue.translation_placeholders or {})

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({}),
            description_placeholders=placeholders,
            errors=errors,
        )


async def async_create_fix_flow(
    hass: HomeAssistant,
    issue_id: str,
    data: dict[str, str | int | float | None] | None,
) -> RepairsFlow:
    """Create the appropriate fix flow for a given issue id."""
    if issue_id.startswith(_FIRMWARE_BEHIND_PREFIX):
        mac = issue_id.removeprefix(_FIRMWARE_BEHIND_PREFIX)
        return FirmwareUpdateRepairFlow(mac=mac)
    raise HomeAssistantError(f"No fix flow registered for issue id: {issue_id}")
