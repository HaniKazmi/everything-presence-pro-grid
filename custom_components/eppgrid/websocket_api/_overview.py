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

from ..const import DOMAIN
from . import _LOGGER
from . import _connection_is_closed
from . import _get_manager
from . import _require_manager
from ._devices import _make_grid_target_on_state


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
    """List EPP devices (device_id, name) for the card editor's picker.

    Only devices with a registry device_id are returned — the card stores a
    device_id and needs it to resolve a mac server-side on subscribe.
    """
    devices = [
        {"device_id": dev.device_id, "name": dev.name}
        for mac, dev in manager.devices.items()
        if dev.device_id is not None
    ]
    devices.sort(key=lambda d: (d["name"].casefold(), d["device_id"]))
    connection.send_result(msg["id"], devices)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/overview/subscribe",
        vol.Required("device_id"): str,
    }
)
@websocket_api.async_response
@_require_manager
async def websocket_overview_subscribe(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Stream read-only overview data for a device (non-admin).

    Sends one stored-layout snapshot (so the card can draw the room even while
    offline), then opens a refcounted live session and streams the same
    {targets, sensors, zones} frames as subscribe_grid_targets. The card never
    calls subscribe_device, so this command owns the session lifecycle.
    """
    device_id = msg["device_id"]
    mac = manager.mac_for_device_id(device_id)
    if mac is None:
        connection.send_error(
            msg["id"],
            "device_not_found",
            "Device not found",
            translation_domain=DOMAIN,
            translation_key="device_not_found",
        )
        return

    connection.send_result(msg["id"])
    config = manager.store.devices.get(mac)
    connection.send_message(websocket_api.event_message(msg["id"], {"snapshot": dict(config) if config else {}}))

    try:
        device_conn = await manager.async_open_session(mac)
    except Exception as err:
        _LOGGER.warning("overview/subscribe: open session failed for %s: %s", mac, err)
        device_conn = None
    if device_conn is None:
        connection.send_message(websocket_api.event_message(msg["id"], {"available": False}))
        return

    try:
        on_state = _make_grid_target_on_state(connection, msg["id"], mac, device_conn)
        await device_conn.subscribe_states(on_state)
    except Exception as err:
        _LOGGER.warning("overview/subscribe: subscribe failed for %s: %s", mac, err)
        manager.release_session(mac, device_conn)
        connection.send_message(websocket_api.event_message(msg["id"], {"available": False}))
        return
    manager.note_target_subscribe(mac, "grid_target_subs")
    hass.async_create_task(manager.async_push_pipeline_to_device(mac))

    released = False

    @callback
    def _unsub() -> None:
        nonlocal released
        if released:
            return
        released = True
        device_conn.unsubscribe_states(on_state)
        mgr = _get_manager(hass)
        if mgr:
            mgr.note_target_unsubscribe(mac, "grid_target_subs")
            hass.async_create_task(mgr.async_push_pipeline_to_device(mac))
            mgr.release_session(mac, device_conn)

    connection.subscriptions[msg["id"]] = _unsub
    # If the connection closed during the awaits above, HA already cleared
    # connection.subscriptions, so the unsub we just registered will never
    # fire — invoke it now to release the session ref we took. The `released`
    # guard makes this safe against a later double-call.
    if _connection_is_closed(connection):
        _unsub()
