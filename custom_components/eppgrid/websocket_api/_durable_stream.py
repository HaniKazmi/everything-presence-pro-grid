"""Shared scaffolding for durable, manager-owned state streams.

Both the dashboard card (`_overview.py`) and the panel (`_devices.py`) hand their
state streams to the manager rather than holding a `DeviceConnection` themselves:
the manager owns the session refcount, re-arms the stream on a fresh connection
after a device flap, and reports liveness (#334, #336).
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from homeassistant.components import websocket_api
from homeassistant.core import callback

from . import _LOGGER
from . import _connection_is_closed


async def start_durable_stream(
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
    *,
    mac: str,
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

    A stream the manager tears down itself (unload, reload, device removed) is a
    different thing from an offline device, and the client cannot tell them apart:
    `_on_closed` puts that on the wire so the card can re-subscribe.
    """
    connection.send_result(msg["id"])
    if send_snapshot:
        config = manager.store.devices.get(mac)
        connection.send_message(websocket_api.event_message(msg["id"], {"snapshot": dict(config) if config else {}}))

    # The last liveness the manager reported, for the heatmap subscription's one-shot
    # replay below. None = it never reported. Only ever READ in the synchronous stretch
    # right after `async_add_state_stream` returns, so what it holds there is exactly the
    # outcome of the registration window — a later notification cannot be observed.
    last_available: bool | None = None

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
        then succeed — a case where `main` sent nothing at all. So record the liveness
        and let the caller replay it once, below, only if registration settled offline.
        """
        nonlocal last_available
        last_available = available
        if not send_availability:
            return
        connection.send_message(websocket_api.event_message(msg["id"], {"available": available}))

    @callback
    def _on_closed() -> None:
        """The manager dropped this stream — tell the client to re-subscribe.

        Fires only on a manager-initiated teardown (config entry unload/reload, device
        removed), never on a device flap. The client's subscription is still open, but
        the stream behind it is gone and the reloaded manager knows nothing of it, so
        no backend event will ever revive it — the card would sit on its offline banner
        until the element remounted (#334, reached via a config-entry reload).

        `available: false` rides along on `overview/subscribe` for BWC: an already-
        deployed card bundle reduces that stream with
        `"available" in m && !("targets" in m)` and ignores the extra key, so it keeps
        showing the offline banner exactly as it does today.

        `overview/subscribe_heatmap` gets `closed` alone — that wire has never carried
        liveness. A deployed bundle reduces it with `m.cells ?? []` and so blanks its
        overlay on this message; accepted, because by the time this fires that overlay
        is already dead (its stream is gone, no frame is ever coming), so it blanks
        something frozen rather than losing anything live.
        """
        event: dict[str, Any] = {"available": False, "closed": True} if send_availability else {"closed": True}
        connection.send_message(websocket_api.event_message(msg["id"], event))

    try:
        unsub_stream = await manager.async_add_state_stream(
            mac,
            counter_attr=counter_attr,
            make_on_state=make_on_state,
            on_availability=_on_availability,
            on_closed=_on_closed,
        )
    except Exception as err:
        _LOGGER.warning("%s: stream registration failed for %s: %s", log_prefix, mac, err)
        unsub_stream = None
    if unsub_stream is None:
        # Covers the recorded `last_available` too — nothing was registered, so this
        # single event is all the client gets either way.
        connection.send_message(websocket_api.event_message(msg["id"], {"available": False}))
        return
    if not send_availability and last_available is False:
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
