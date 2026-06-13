"""Device Groups — virtual HA devices aggregating multiple EPP sensors."""

from __future__ import annotations

import logging
import uuid
from collections.abc import Callable
from typing import Any

from homeassistant.core import HomeAssistant

from ..const import MAX_DEVICE_GROUPS
from ..const import MAX_SOURCES_PER_DEVICE_GROUP
from ..const import MAX_ZONE_GROUPS_PER_DEVICE_GROUP
from ..storage import EPPGridStore
from ._aggregator import Aggregator

_LOGGER = logging.getLogger(__name__)


class DeviceGroupManager:
    """CRUD + change notifications for device groups.

    Aggregation runtime (entity wiring) is added in a later task — this layer
    is intentionally narrow so it stays unit-testable without HA entity setup.
    """

    def __init__(self, hass: HomeAssistant, store: EPPGridStore) -> None:
        self._hass = hass
        self._store = store
        self._listeners: list[Callable[[], None]] = []
        self._aggregators: dict[str, Aggregator] = {}
        self._platform_proxy: Any = None
        self._device_name_fn: Callable[[str], str] = lambda m: m
        self._zone_name_fn: Callable[[str, int], str | None] = lambda m, i: None

    async def async_start(self) -> None:
        """Initialize state from the store — spawn an aggregator per group."""
        for group in self._store.device_groups:
            await self._spawn_aggregator(group)

    async def async_stop(self) -> None:
        """Stop all aggregators and clear state."""
        for agg in self._aggregators.values():
            await agg.async_stop()
        self._aggregators.clear()
        self._listeners.clear()
        self._platform_proxy = None

    # -- Aggregator management ------------------------------------------------

    def set_callbacks(
        self,
        device_name_fn: Callable[[str], str],
        zone_name_fn: Callable[[str, int], str | None],
    ) -> None:
        """Wire up the data sources the aggregators need (DeviceManager + Store)."""
        self._device_name_fn = device_name_fn
        self._zone_name_fn = zone_name_fn

    def attach_platform(self, proxy: Any) -> None:
        """Register the binary_sensor platform proxy. Called once at platform setup."""
        self._platform_proxy = proxy

    def get_aggregator(self, group_id: str) -> Aggregator | None:
        return self._aggregators.get(group_id)

    async def _spawn_aggregator(self, group: dict[str, Any]) -> None:
        agg = Aggregator(
            self._hass,
            group,
            device_name_fn=self._device_name_fn,
            zone_name_fn=self._zone_name_fn,
            notify=self._on_aggregator_changed,
        )
        await agg.async_start()
        self._aggregators[group["id"]] = agg

    def _on_aggregator_changed(self) -> None:
        # State-driven sync (a member's presence/zone changed): reconcile the
        # entity set but NOT the device area, so a manual area assignment isn't
        # reverted on every motion event. Area only changes via group CRUD.
        if self._platform_proxy is not None:
            self._platform_proxy.sync_all(self.list_groups(), reconcile_area=False)

    # -- Listener registration ------------------------------------------------

    def on_change(self, callback: Callable[[], None]) -> Callable[[], None]:
        """Register a callback for any group create/update/delete."""
        self._listeners.append(callback)

        def _unsub() -> None:
            if callback in self._listeners:
                self._listeners.remove(callback)

        return _unsub

    def _fire_change(self) -> None:
        for cb in list(self._listeners):
            try:
                cb()
            except Exception:  # pragma: no cover - defensive
                _LOGGER.exception("Device group change listener raised")

    # -- Read -----------------------------------------------------------------

    def list_groups(self) -> list[dict[str, Any]]:
        """Return a copy of the device groups list."""
        return [dict(g) for g in self._store.device_groups]

    def get_group(self, group_id: str) -> dict[str, Any] | None:
        for g in self._store.device_groups:
            if g["id"] == group_id:
                return dict(g)
        return None

    # -- Mutate ---------------------------------------------------------------

    async def async_create(
        self,
        *,
        name: str,
        sources: list[str],
        area_id: str | None = None,
    ) -> dict[str, Any]:
        self._validate(name=name, sources=sources, zone_groups=[])
        if len(self._store.device_groups) >= MAX_DEVICE_GROUPS:
            raise ValueError(f"too many device groups (cap {MAX_DEVICE_GROUPS})")
        group = {
            "id": uuid.uuid4().hex,
            "name": name,
            "area_id": area_id,
            "sources": list(sources),
            "zone_groups": [],
        }
        self._store.device_groups.append(group)
        await self._store.async_save()
        await self._spawn_aggregator(group)
        if self._platform_proxy is not None:
            self._platform_proxy.sync_all(self.list_groups())
        self._fire_change()
        return dict(group)

    async def async_update(
        self,
        *,
        id: str,
        name: str,
        sources: list[str],
        area_id: str | None,
        zone_groups: list[dict[str, Any]],
    ) -> dict[str, Any]:
        # Check existence before validation so unknown-id always raises KeyError.
        idx = next(
            (i for i, g in enumerate(self._store.device_groups) if g["id"] == id),
            None,
        )
        if idx is None:
            raise KeyError(id)
        self._validate(name=name, sources=sources, zone_groups=zone_groups)
        self._store.device_groups[idx] = {
            "id": id,
            "name": name,
            "area_id": area_id,
            "sources": list(sources),
            "zone_groups": [dict(zg) for zg in zone_groups],
        }
        await self._store.async_save()
        agg = self._aggregators.get(id)
        if agg is not None:
            agg.update_definition(self._store.device_groups[idx])
        if self._platform_proxy is not None:
            self._platform_proxy.sync_all(self.list_groups())
        self._fire_change()
        return dict(self._store.device_groups[idx])

    async def async_delete(self, group_id: str) -> None:
        for idx, g in enumerate(self._store.device_groups):
            if g["id"] == group_id:
                del self._store.device_groups[idx]
                await self._store.async_save()
                agg = self._aggregators.pop(group_id, None)
                if agg is not None:
                    await agg.async_stop()
                if self._platform_proxy is not None:
                    self._platform_proxy.sync_all(self.list_groups())
                self._fire_change()
                return
        raise KeyError(group_id)

    # -- Validation -----------------------------------------------------------

    @staticmethod
    def _validate(
        *,
        name: str,
        sources: list[str],
        zone_groups: list[dict[str, Any]],
    ) -> None:
        if not isinstance(name, str) or not name.strip():
            raise ValueError("name must be a non-empty string")
        if len(name) > 128:
            raise ValueError("name too long (max 128 chars)")
        if not sources:
            raise ValueError("sources must contain at least one MAC")
        if len(sources) > MAX_SOURCES_PER_DEVICE_GROUP:
            raise ValueError(f"too many sources (cap {MAX_SOURCES_PER_DEVICE_GROUP})")
        if len(zone_groups) > MAX_ZONE_GROUPS_PER_DEVICE_GROUP:
            raise ValueError(f"too many zone groups (cap {MAX_ZONE_GROUPS_PER_DEVICE_GROUP})")
        for zg in zone_groups:
            if not zg.get("id") or not zg.get("name"):
                raise ValueError("zone group needs id and name")
            for m in zg.get("members", []):
                if "mac" not in m or "zone_index" not in m:
                    raise ValueError("zone group member needs mac and zone_index")
