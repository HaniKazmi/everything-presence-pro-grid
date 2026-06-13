"""Per-group state machine: tracks source entities, computes OR-aggregated outputs."""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any
from typing import TypedDict

from homeassistant.core import Event
from homeassistant.core import HomeAssistant
from homeassistant.core import callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_track_state_change_event

from ..const import NUM_ZONE_SLOTS
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
        notify_visible_change: Callable[[], None] | None = None,
    ) -> None:
        self._hass = hass
        self._def = group_def
        self._device_name_fn = device_name_fn
        self._zone_name_fn = zone_name_fn
        self._notify = notify or (lambda: None)
        # Fired when the SET of exposed outputs changes (a slot/zone appears or
        # disappears, e.g. a source entity is enabled/disabled) — not on every
        # on/off transition. Lets the WS layer re-push exposed_entities.
        self._notify_visible_change = notify_visible_change or (lambda: None)
        self._unsub_state: Callable[[], None] | None = None
        self._unsub_registry: Callable[[], None] | None = None
        self._entity_listeners: dict[str, list[Callable[[], None]]] = {}
        self.outputs: _Outputs = {
            "presence": {},
            "zone_groups": {},
            "zone_passthroughs": {},
        }

    async def async_start(self) -> None:
        self._recompute_all()
        self._resubscribe()
        self._unsub_registry = self._hass.bus.async_listen(er.EVENT_ENTITY_REGISTRY_UPDATED, self._on_registry_event)

    async def async_stop(self) -> None:
        if self._unsub_state is not None:
            self._unsub_state()
            self._unsub_state = None
        if self._unsub_registry is not None:
            self._unsub_registry()
            self._unsub_registry = None

    def update_definition(self, new_def: dict[str, Any]) -> None:
        """Replace the group definition. Re-resolves sources, re-subscribes, and
        refreshes existing entities so a group edit isn't shown as stale state
        until the next member state change."""
        self._def = new_def
        self._recompute_all()
        self._resubscribe()
        self._fire_entity_listeners()

    def _fire_entity_listeners(self) -> None:
        """Notify per-output entity listeners that outputs may have changed.

        Entities are idempotent (they re-read the current aggregator output).
        """
        for cbs in self._entity_listeners.values():
            for cb in cbs:
                cb()

    def zone_name(self, mac: str, zone_index: int) -> str | None:
        """User-set name for a source zone (or None)."""
        return self._zone_name_fn(mac, zone_index)

    def device_name(self, mac: str) -> str:
        """Display name for a source device."""
        return self._device_name_fn(mac)

    def attach_entity_listener(self, key: str, cb: Callable[[], None]) -> Callable[[], None]:
        """Attach a per-output-key listener that fires on any change.

        Keys: presence slot name (e.g. "occupancy"), or "zone_group:<id>",
        or "zone_pass:<mac>:<idx>". The listener is invoked on every recompute
        cycle that produced any change; entities are expected to be idempotent.

        Returns an unsubscribe callable. Entities should call it from
        `async_will_remove_from_hass` to avoid invoking `async_write_ha_state`
        on removed entities.
        """
        self._entity_listeners.setdefault(key, []).append(cb)

        def _unsub() -> None:
            cbs = self._entity_listeners.get(key)
            if cbs is not None and cb in cbs:
                cbs.remove(cb)

        return _unsub

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
            for i in range(1, NUM_ZONE_SLOTS):
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
            self._fire_entity_listeners()

    @callback
    def _on_registry_event(self, event: Event) -> None:
        """Re-resolve and re-subscribe when a tracked entity's registration changes.

        Cheap filter: only react to binary_sensor entity-registry updates. We
        deliberately re-resolve on any binary_sensor change — it's a tiny set
        of operations and avoids hardcoding which MACs/slots we care about.
        """
        entity_id = event.data.get("entity_id", "")
        if not entity_id.startswith("binary_sensor."):
            return
        prev = self._snapshot()
        prev_sig = self._set_signature()
        self._recompute_all()
        self._resubscribe()
        if self._snapshot() != prev:
            self._notify()
            self._fire_entity_listeners()
        # A registry change (enable/disable of a source entity) can add or remove
        # an exposed output; tell the WS layer to re-push exposed_entities. Gated
        # on the set so on/off transitions (which never change the set) don't.
        if self._set_signature() != prev_sig:
            self._notify_visible_change()

    def _set_signature(self) -> tuple:
        """The SET of exposed output keys (ignoring their on/off values)."""
        return (
            tuple(sorted(self.outputs["presence"].keys())),
            tuple(sorted(self.outputs["zone_groups"].keys())),
            tuple(sorted(self.outputs["zone_passthroughs"].keys())),
        )

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

    def _entity_enabled(self, mac: str, slot: str) -> bool:
        """True if the source entity is registered and not disabled.

        Mirrors build_source_states/derive_exposed_entities so the platform
        only materialises helpers for entities the user actually has enabled.
        """
        eid = resolve_entity_id(self._hass, mac, slot)
        if eid is None:
            return False
        entry = er.async_get(self._hass).async_get(eid)
        return entry is not None and not entry.disabled

    def _recompute_all(self) -> None:
        sources = self._def["sources"]
        # Presence: expose a slot only if at least one source has that entity
        # enabled (registered + not disabled), matching derive_exposed_entities.
        presence: dict[str, bool | None] = {}
        for slot in PRESENCE_SLOTS:
            if not any(self._entity_enabled(m, slot) for m in sources):
                continue
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
        # Passthroughs: enabled (registered + not disabled) zone entities, not in
        # a group, with a configured zone name. Disabled zones are skipped so we
        # don't materialise permanently-unavailable helpers.
        passthroughs: dict[tuple[str, int], bool | None] = {}
        for mac in sources:
            for i in range(1, NUM_ZONE_SLOTS):
                if (mac, i) in grouped_keys:
                    continue
                if not self._entity_enabled(mac, f"zone_{i}_presence"):
                    continue
                if self._zone_name_fn(mac, i) is None:
                    continue
                passthroughs[(mac, i)] = or_presence([self._state_of(mac, f"zone_{i}_presence")])
        self.outputs = {
            "presence": presence,
            "zone_groups": zg_state,
            "zone_passthroughs": passthroughs,
        }
