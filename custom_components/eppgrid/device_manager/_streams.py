"""Durable frontend state streams — the unit the manager re-arms across reconnects.

A WS client (the dashboard card) subscribes once and expects frames for as long as
its subscription lives. The `DeviceConnection` under it is disposable: it dies on a
device flap and is replaced. So a stream stores a *factory* rather than a bound
callback — the callback is rebuilt against whatever connection is live, because the
device's entity keys are only knowable from that connection (and can change across
an OTA).
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass
from dataclasses import field
from typing import Any

_LOGGER = logging.getLogger(__name__)


# `eq=False`: identity equality (and hashing), not the dataclass default of structural
# equality over the fields. The record IS the subscription — the registry keeps a list
# per mac and deregisters with `list.remove`, which drops the first EQUAL element. Two
# streams on one mac whose fields happen to match (a caller sharing a callback pair
# between them) would otherwise have the wrong one removed: the survivor would keep a
# callback on the connection with no owner, and its subscriber count would go out of step.
@dataclass(eq=False)
class StateStream:
    """One client's durable subscription to a device's state frames."""

    mac: str
    counter_attr: str
    make_on_state: Callable[[str, Any], Callable[[Any], None]]
    on_availability: Callable[[bool], None]
    on_closed: Callable[[], None] | None = None
    conn: Any | None = None
    cb: Any | None = None
    closed: bool = False
    _last_available: bool | None = field(default=None, repr=False)
    _closed_notified: bool = field(default=False, repr=False)

    @property
    def armed(self) -> bool:
        """True while a callback is registered on a live connection."""
        return self.conn is not None

    def closed_now(self) -> bool:
        """Read `closed` fresh.

        `_arm_stream` re-checks `closed` after each of its awaits (opening
        the session, subscribing) because the owning client can close the
        stream while either is in flight. The plain attribute gets narrowed
        to False by mypy after the first such check and stays narrowed
        across the next await, flagging the second re-check as unreachable.
        A property has the same problem — mypy narrows a property read the
        same way it narrows a plain attribute — so this must stay a method:
        a call expression is not narrowed.
        """
        return self.closed

    def notify(self, available: bool) -> None:
        """Tell the owner the stream's liveness changed.

        De-duped: the reconciler runs on every device flap and would otherwise
        re-send an unchanged value to the client on each pass. Errors are
        swallowed — a WS connection that closed mid-flight must not break the
        reconciler for the other streams on this device.
        """
        if available == self._last_available:
            return
        self._last_available = available
        try:
            self.on_availability(available)
        except Exception:
            _LOGGER.exception("State-stream availability callback raised")

    def notify_closed(self) -> None:
        """Tell the owner its stream is GONE — not merely offline.

        Fires only when the manager itself tore the stream down (config entry
        unload/reload, device removed): the client's subscription is still open but
        now points at a stream that no longer exists, and nothing on the backend can
        revive it — only a re-subscribe can. A device flap must NOT fire this: the
        stream survives that and re-arms itself, and re-subscribing on every Wi-Fi
        blip would churn the wire for nothing.

        Fires at most once, and errors are swallowed: the teardown paths walk every
        stream on a device, and a websocket that died mid-teardown must not break the
        loop for the others.
        """
        if self._closed_notified:
            return
        self._closed_notified = True
        if self.on_closed is None:
            return
        try:
            self.on_closed()
        except Exception:
            _LOGGER.exception("State-stream closed callback raised")
