"""Read-only, non-admin WebSocket commands powering the dashboard overview card.

Unlike every other eppgrid command, these are NOT @require_admin: the overview
card is meant for shared dashboards viewed by household (non-admin) users. They
expose ONLY display data and cannot mutate device config.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.core import callback

from . import _require_manager


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/overview/list_devices",
    }
)
@callback
@_require_manager
def websocket_overview_list_devices(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """List EPP devices (device_id, mac, name) for the card editor's picker.

    Only devices with a registry device_id are returned — the card stores a
    device_id and needs it to resolve a mac server-side on subscribe.
    """
    devices = [
        {"device_id": dev.device_id, "mac": mac, "name": dev.name}
        for mac, dev in manager.devices.items()
        if dev.device_id is not None
    ]
    connection.send_result(msg["id"], devices)
