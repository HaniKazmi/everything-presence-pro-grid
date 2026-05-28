"""Per-group state machine: tracks source entities, computes OR-aggregated outputs."""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any
from typing import TypedDict

from homeassistant.core import Event
from homeassistant.core import HomeAssistant
from homeassistant.core import callback
from homeassistant.helpers.event import async_track_state_change_event

from ..const import PRESENCE_SLOTS
from ._aggregation import or_presence
from ._registry import resolve_entity_id

_LOGGER = logging.getLogger(__name__)


class _Outputs(TypedDict):
    presence: dict[str, bool | None]  # slot -> aggregated state
    zone_groups: dict[str, bool | None]  # zone_group_id -> aggregated state
    zone_passthroughs: dict[tuple[str, int], bool | None]  # (mac, idx) -> state


class Aggregator:
    """Runtime state for one device group.

    Resolves source entity IDs, subscribes to their state changes, and recomputes
    the OR-aggregated outputs on every change. Calls `notify` when any output
    changes value. Also dispatches per-output listeners attached via
    `attach_entity_listener` so the binary_sensor platform can update individual
    entities.
    """

    def __init__(
        self,
        hass: HomeAssistant,
        group_def: dict[str, Any],
        *,
        device_name_fn: Callable[[str], str],
        zone_name_fn: Callable[[str, int], str | None],
        notify: Callable[[], None] | None = None,
    ) -> None:
        self._hass = hass
        self._def = group_def
        self._device_name_fn = device_name_fn
        self._zone_name_fn = zone_name_fn
        self._notify = notify or (lambda: None)
        self._unsub_state: Callable[[], None] | None = None
        self._entity_listeners: dict[str, list[Callable[[], None]]] = {}
        self.outputs: _Outputs = {
            "presence": {},
            "zone_groups": {},
            "zone_passthroughs": {},
        }

    async def async_start(self) -> None:
        self._recompute_all()
        self._resubscribe()

    async def async_stop(self) -> None:
        if self._unsub_state is not None:
            self._unsub_state()
            self._unsub_state = None

    def update_definition(self, new_def: dict[str, Any]) -> None:
        """Replace the group definition. Re-resolves sources and re-subscribes."""
        self._def = new_def
        self._recompute_all()
        self._resubscribe()

    def attach_entity_listener(self, key: str, cb: Callable[[], None]) -> None:
        """Attach a per-output-key listener that fires on any change.

        Keys: presence slot name (e.g. "occupancy"), or "zone_group:<id>",
        or "zone_pass:<mac>:<idx>". The listener is invoked on every recompute
        cycle that produced any change; entities are expected to be idempotent.
        """
        self._entity_listeners.setdefault(key, []).append(cb)

    # -- Tracked entity IDs ---------------------------------------------------

    def _tracked_entity_ids(self) -> list[str]:
        ids: list[str] = []
        for mac in self._def["sources"]:
            for slot in PRESENCE_SLOTS:
                eid = resolve_entity_id(self._hass, mac, slot)
                if eid:
                    ids.append(eid)
            # Track all 8 zone-presence slots; cheap and avoids re-subscribing
            # when the user defines a new zone.
            for i in range(1, 8):
                eid = resolve_entity_id(self._hass, mac, f"zone_{i}_presence")
                if eid:
                    ids.append(eid)
        return ids

    def _resubscribe(self) -> None:
        if self._unsub_state is not None:
            self._unsub_state()
        entity_ids = self._tracked_entity_ids()
        if not entity_ids:
            self._unsub_state = None
            return
        self._unsub_state = async_track_state_change_event(self._hass, entity_ids, self._on_state_change)

    @callback
    def _on_state_change(self, _event: Event) -> None:
        prev = self._snapshot()
        self._recompute_all()
        if self._snapshot() != prev:
            self._notify()
            # Fire per-output listeners on any change. Entities are idempotent.
            for cbs in self._entity_listeners.values():
                for cb in cbs:
                    cb()

    def _snapshot(self) -> tuple:
        return (
            tuple(sorted(self.outputs["presence"].items())),
            tuple(sorted(self.outputs["zone_groups"].items())),
            tuple(sorted(self.outputs["zone_passthroughs"].items())),
        )

    def _state_of(self, mac: str, slot: str) -> str | None:
        eid = resolve_entity_id(self._hass, mac, slot)
        if eid is None:
            return None
        st = self._hass.states.get(eid)
        return st.state if st else None

    def _recompute_all(self) -> None:
        sources = self._def["sources"]
        # Presence
        presence: dict[str, bool | None] = {}
        for slot in PRESENCE_SLOTS:
            presence[slot] = or_presence([self._state_of(m, slot) for m in sources])
        # Zone groups
        zg_state: dict[str, bool | None] = {}
        grouped_keys: set[tuple[str, int]] = set()
        for zg in self._def.get("zone_groups", []):
            states = []
            for m in zg["members"]:
                grouped_keys.add((m["mac"], m["zone_index"]))
                states.append(self._state_of(m["mac"], f"zone_{m['zone_index']}_presence"))
            zg_state[zg["id"]] = or_presence(states)
        # Passthroughs: anything registered, not in a group, with a configured zone name.
        passthroughs: dict[tuple[str, int], bool | None] = {}
        for mac in sources:
            for i in range(1, 8):
                if (mac, i) in grouped_keys:
                    continue
                if resolve_entity_id(self._hass, mac, f"zone_{i}_presence") is None:
                    continue
                if self._zone_name_fn(mac, i) is None:
                    continue
                passthroughs[(mac, i)] = or_presence([self._state_of(mac, f"zone_{i}_presence")])
        self.outputs = {
            "presence": presence,
            "zone_groups": zg_state,
            "zone_passthroughs": passthroughs,
        }
