"""Flasher and ESPHome device management commands."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.core import callback

from ..const import DOMAIN
from . import _INTEGRATION_VERSION
from . import _get_manager
from . import _send_exception
from . import _send_not_loaded

# -- subscribe_flashable_devices --


@websocket_api.websocket_command({vol.Required("type"): "eppgrid/subscribe_flashable_devices"})
@websocket_api.async_response
async def websocket_subscribe_flashable_devices(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Subscribe to flashable device list changes."""
    manager = _get_manager(hass)
    if manager is None:
        _send_not_loaded(connection, msg["id"])
        return

    from ..const import FIRMWARE_VERSION

    async def _send_update() -> None:
        devices = await manager.list_flashable_devices()
        connection.send_message(
            websocket_api.event_message(
                msg["id"],
                {
                    "devices": devices,
                    "firmware_base_url": "/api/eppgrid/firmware",
                    "latest_firmware_version": f"v{FIRMWARE_VERSION}",
                    "integration_version": _INTEGRATION_VERSION,
                },
            )
        )

    @callback
    def _on_changed() -> None:
        hass.async_create_task(_send_update())

    unsub = manager.on_device_list_changed(_on_changed)

    connection.send_result(msg["id"])
    await _send_update()

    @callback
    def _unsub() -> None:
        unsub()

    connection.subscriptions[msg["id"]] = _unsub


# -- list_flashable_devices --


@websocket_api.websocket_command({vol.Required("type"): "eppgrid/list_flashable_devices"})
@websocket_api.async_response
async def websocket_list_flashable_devices(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """List all EPP devices available for flashing."""
    manager = _get_manager(hass)
    if manager is None:
        _send_not_loaded(connection, msg["id"])
        return

    from ..const import FIRMWARE_VERSION

    devices = await manager.list_flashable_devices()
    connection.send_result(
        msg["id"],
        {
            "devices": devices,
            "firmware_base_url": "/api/eppgrid/firmware",
            "latest_firmware_version": f"v{FIRMWARE_VERSION}",
            "integration_version": _INTEGRATION_VERSION,
        },
    )


# -- delete_esphome_device --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/delete_esphome_device",
        vol.Required("config_entry_id"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_delete_esphome_device(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete an ESPHome config entry (and its device/entities)."""
    entry = hass.config_entries.async_get_entry(msg["config_entry_id"])
    if entry is None:
        connection.send_error(
            msg["id"],
            "not_found",
            "Config entry not found",
            translation_domain=DOMAIN,
            translation_key="config_entry_not_found",
        )
        return
    if entry.domain != "esphome":
        connection.send_error(
            msg["id"],
            "invalid_entry",
            "Only ESPHome config entries can be deleted by this command",
            translation_domain=DOMAIN,
            translation_key="only_esphome_can_be_deleted",
        )
        return
    try:
        await hass.config_entries.async_remove(msg["config_entry_id"])
    except Exception as err:
        _send_exception(connection, msg["id"], "delete_failed", err)
        return
    connection.send_result(msg["id"])


# -- add_esphome_device --


def _map_esphome_flow_result(result: dict[str, Any]) -> dict[str, str]:
    """Map an ESPHome config-flow result dict to a HaAddResult dict."""
    flow_type = result.get("type")
    if flow_type == "create_entry":
        return {"type": "added"}
    if flow_type == "form":
        # HA paused the flow at a form step. Inspect errors to distinguish
        # connection failures (device not yet reachable on port 6053, often
        # because the API server hasn't finished starting) from auth prompts.
        errors = result.get("errors") or {}
        base_error = errors.get("base", "")
        if base_error in ("connection_error", "resolve_error", "cannot_connect"):
            return {"type": "cannot_connect"}
        return {"type": "needs_auth"}
    if flow_type == "abort":
        reason = result.get("reason") or "unknown"
        if reason in ("already_configured", "already_configured_updates"):
            return {"type": "already_added"}
        if reason in ("cannot_connect", "connection_error"):
            return {"type": "cannot_connect"}
        return {"type": "failed", "reason": reason}
    return {"type": "failed", "reason": str(flow_type) if flow_type else "unknown"}


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/add_esphome_device",
        vol.Required("host"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_add_esphome_device(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Add an ESPHome device by triggering its config flow."""
    try:
        # If an ESPHome config entry already points at this host, short-circuit.
        # This avoids starting a flow that would need to reach the device before
        # it can return already_configured — which fails if the device API
        # hasn't come up yet.
        host = msg["host"]
        for entry in hass.config_entries.async_entries("esphome"):
            if entry.data.get("host") == host:
                connection.send_result(msg["id"], {"type": "already_added"})
                return

        flow_context: dict[str, Any] = {"source": "user"}
        if hasattr(connection, "context") and hasattr(connection.context, "user_id"):
            flow_context["user_id"] = connection.context.user_id
        result = await hass.config_entries.flow.async_init(
            "esphome",
            context=flow_context,
            data={"host": host, "port": 6053},
        )
        connection.send_result(msg["id"], _map_esphome_flow_result(result))
    except Exception as err:
        _send_exception(connection, msg["id"], "add_failed", err)
