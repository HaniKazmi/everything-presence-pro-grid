"""Read-only, non-admin WebSocket commands powering the dashboard overview card.

Unlike every other eppgrid command, these are NOT @require_admin: the overview
card is meant for shared dashboards viewed by household (non-admin) users. They
expose ONLY display data and cannot mutate device config.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.core import callback

from ..const import DOMAIN
from . import _LOGGER
from . import _connection_is_closed
from . import _require_manager
from ._devices import _make_grid_target_on_state
from ._devices import _make_heatmap_on_state


async def _start_durable_target_stream(
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
    *,
    counter_attr: str,
    make_on_state: Callable[[str, Any], Callable[[Any], None]],
    send_snapshot: bool,
    send_availability: bool,
    log_prefix: str,
) -> None:
    """Shared scaffolding for the non-admin overview subscribe commands.

    The card sits on a dashboard for hours, so its stream must outlive the
    device's `DeviceConnection`: we hand a DURABLE stream to the manager, which
    owns the session refcount, re-arms the stream on a fresh connection after a
    device flap, and reports liveness through `on_availability` (#334). The
    callback is rebuilt per connection from `make_on_state`, since the device's
    entity keys are only knowable from the live connection.

    Relaying that liveness to the client is opt-in per command — see
    `_on_availability` for why the heatmap subscription must not carry it.
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
    if send_snapshot:
        config = manager.store.devices.get(mac)
        connection.send_message(websocket_api.event_message(msg["id"], {"snapshot": dict(config) if config else {}}))

    # True only while `async_add_state_stream` below is in flight. It appends the
    # stream to the manager's list BEFORE awaiting its arm pass, so during that
    # await ANY task can notify through it — not just the arm pass itself. See
    # `_on_availability`.
    registering: bool = True
    # The last liveness the manager reported during that window, for the heatmap
    # subscription's one-shot replay below. None = it never reported.
    initial_available: bool | None = None

    @callback
    def _on_availability(available: bool) -> None:
        """Relay the manager's liveness notifications, per the command's contract.

        `overview/subscribe` (send_availability=True) takes every event, live: the card
        renders its offline banner from this stream's `available` field.

        `overview/subscribe_heatmap` (send_availability=False) takes NONE of them
        directly. That subscription has never carried liveness, and already-deployed
        card bundles — which we cannot fix by rebuilding — reduce it with
        `(_state, m) => m.cells ?? []` (frontend/src/card/heatmap-store.ts), so ANY
        message without a `cells` field resets the overlay to empty. An arm/disarm event
        would therefore blank a user's heatmap on every device flap until the next frame
        arrives (up to one `heatmap_interval`). The card loses nothing: `available` still
        reaches it on the overview stream, and the heatmap repaints itself once the
        re-armed stream delivers its next frame.

        `main` did put exactly one availability event on this wire — the subscribe-time
        `available: false` for a device whose stream could not be armed (the pre-#334
        handler sent it when `async_open_session` returned None). It lands while the
        overlay is still empty, so it blanks nothing, and is kept. Emitting it inline
        from here would be wrong, though: a session loss racing the registration window
        (aioesphomeapi fires `on_stop` eagerly, including a stale one from a replaced
        connection) can notify False through the still-unarmed stream, and the arm can
        then succeed — a case where `main` sent nothing at all. So record the window's
        outcome and let the caller replay it once, below, only if it settled offline.
        """
        nonlocal initial_available
        if not send_availability:
            if registering:
                initial_available = available
            return
        connection.send_message(websocket_api.event_message(msg["id"], {"available": available}))

    try:
        unsub_stream = await manager.async_add_state_stream(
            mac,
            counter_attr=counter_attr,
            make_on_state=make_on_state,
            on_availability=_on_availability,
        )
    except Exception as err:
        _LOGGER.warning("%s: stream registration failed for %s: %s", log_prefix, mac, err)
        unsub_stream = None
    registering = False
    if unsub_stream is None:
        # Covers the recorded `initial_available` too — nothing was registered, so this
        # single event is all the client gets either way.
        connection.send_message(websocket_api.event_message(msg["id"], {"available": False}))
        return
    if not send_availability and initial_available is False:
        connection.send_message(websocket_api.event_message(msg["id"], {"available": False}))

    released = False

    @callback
    def _unsub() -> None:
        nonlocal released
        if released:
            return
        released = True
        unsub_stream()

    connection.subscriptions[msg["id"]] = _unsub
    # If the connection closed during the await above, HA already cleared
    # connection.subscriptions, so the unsub we just registered will never fire
    # — invoke it now so the manager drops the stream and releases its session
    # reference. The `released` guard makes this safe against a later call.
    if _connection_is_closed(connection):
        _unsub()


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
    offline), then registers a durable stream that emits the same
    {targets, sensors, zones} frames as subscribe_grid_targets — and keeps
    emitting them across a connection loss, since the manager re-arms it.
    """
    await _start_durable_target_stream(
        connection,
        msg,
        manager,
        counter_attr="grid_target_subs",
        make_on_state=lambda mac, dc: _make_grid_target_on_state(connection, msg["id"], mac, dc),
        send_snapshot=True,
        send_availability=True,
        log_prefix="overview/subscribe",
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/overview/subscribe_heatmap",
        vol.Required("device_id"): str,
    }
)
@websocket_api.async_response
@_require_manager
async def websocket_overview_subscribe_heatmap(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Stream the on-device activity heatmap for a device (non-admin).

    Resolves the card's device_id to a mac and registers a durable stream, same
    lifecycle as websocket_overview_subscribe, but never sends a config snapshot —
    this command only streams heatmap cells — and never relays the manager's live
    availability notifications, which deployed card bundles would mistake for an
    empty heatmap frame (see `_on_availability`).
    """
    await _start_durable_target_stream(
        connection,
        msg,
        manager,
        counter_attr="heatmap_subs",
        make_on_state=lambda mac, dc: _make_heatmap_on_state(connection, msg["id"], mac, dc),
        send_snapshot=False,
        send_availability=False,
        log_prefix="overview/subscribe_heatmap",
    )
