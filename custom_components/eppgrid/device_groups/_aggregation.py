"""Pure aggregation functions for device groups."""

from __future__ import annotations

from homeassistant.const import STATE_ON
from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.const import STATE_UNKNOWN

_UNAVAILABLE_STATES = frozenset({STATE_UNAVAILABLE, STATE_UNKNOWN})


def or_presence(states: list[str | None]) -> bool | None:
    """OR over presence states.

    Returns True if any source reports `on`; False if all reporting sources
    are `off`; None if no source is reporting (all unavailable/unknown/missing).
    """
    contributing = [s for s in states if s is not None and s not in _UNAVAILABLE_STATES]
    if not contributing:
        return None
    return any(s == STATE_ON for s in contributing)
