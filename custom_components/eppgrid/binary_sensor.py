"""Binary sensor platform — exposes the entities for each Device Group."""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from homeassistant.components.binary_sensor import BinarySensorDeviceClass
from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .const import PRESENCE_SLOTS
from .device_groups._aggregator import Aggregator

_LOGGER = logging.getLogger(__name__)

_PRESENCE_DEVICE_CLASS: dict[str, BinarySensorDeviceClass | None] = {
    "occupancy": BinarySensorDeviceClass.OCCUPANCY,
    "static_presence": BinarySensorDeviceClass.OCCUPANCY,
    "motion_presence": BinarySensorDeviceClass.MOTION,
    "target_presence": BinarySensorDeviceClass.OCCUPANCY,
    "mmwave_presence": BinarySensorDeviceClass.OCCUPANCY,
}


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up binary_sensor platform for Device Groups."""
    manager = hass.data[DOMAIN]
    platform_proxy = _PlatformProxy(hass, async_add_entities)
    manager.device_groups.attach_platform(platform_proxy)
    platform_proxy.sync_all(manager.device_groups.list_groups())


class _PlatformProxy:
    """Tracks created entities; can add/remove on demand."""

    def __init__(self, hass: HomeAssistant, async_add_entities: AddEntitiesCallback) -> None:
        self._hass = hass
        self._async_add = async_add_entities
        # unique_id -> entity
        self._entities: dict[str, BinarySensorEntity] = {}

    def sync_all(self, groups: list[dict[str, Any]]) -> None:
        """Reconcile entities to match the set of groups + their outputs.

        Adds new entities for: presence slots present in aggregator.outputs,
        zone groups defined on the group, and passthrough zones present in
        aggregator.outputs. Removes entities that no longer belong (e.g. when
        a group is deleted or a zone group is removed).
        """
        new_entities: list[BinarySensorEntity] = []
        for group in groups:
            aggregator = self._hass.data[DOMAIN].device_groups.get_aggregator(group["id"])
            if aggregator is None:
                continue
            new_entities.extend(self._build_presence_entities(group, aggregator))
            new_entities.extend(self._build_zone_entities(group, aggregator))
        if new_entities:
            self._async_add(new_entities)
        self._apply_area_assignments(groups)
        # Remove entities for deleted groups / removed zones.
        active_uids = self._compute_active_uids(groups)
        for uid in list(self._entities.keys()):
            if uid not in active_uids:
                e = self._entities.pop(uid)
                self._hass.async_create_task(e.async_remove(force_remove=True))

    def _build_presence_entities(self, group: dict[str, Any], aggregator: Aggregator) -> list[BinarySensorEntity]:
        out: list[BinarySensorEntity] = []
        for slot in PRESENCE_SLOTS:
            if slot not in aggregator.outputs.get("presence", {}):
                continue
            uid = f"eppgrid_device_group_{group['id']}_{slot}"
            if uid in self._entities:
                continue
            e = DeviceGroupPresenceEntity(group, slot, aggregator)
            self._entities[uid] = e
            out.append(e)
        return out

    def _build_zone_entities(self, group: dict[str, Any], aggregator: Aggregator) -> list[BinarySensorEntity]:
        out: list[BinarySensorEntity] = []
        for zg in group.get("zone_groups", []):
            uid = f"eppgrid_device_group_{group['id']}_zone_group_{zg['id']}"
            if uid in self._entities:
                continue
            e = DeviceGroupZoneGroupEntity(group, zg, aggregator)
            self._entities[uid] = e
            out.append(e)
        for mac, idx in aggregator.outputs.get("zone_passthroughs", {}):
            uid = f"eppgrid_device_group_{group['id']}_zone_pass_{mac}_{idx}"
            if uid in self._entities:
                continue
            e = DeviceGroupZonePassthroughEntity(group, mac, idx, aggregator)
            self._entities[uid] = e
            out.append(e)
        return out

    def _apply_area_assignments(self, groups: list[dict[str, Any]]) -> None:
        """Ensure each group's HA device record reflects its stored area_id."""
        dr_ = dr.async_get(self._hass)
        for g in groups:
            if not g.get("area_id"):
                continue
            dev = dr_.async_get_device(identifiers={(DOMAIN, f"device_group:{g['id']}")})
            if dev is not None and dev.area_id != g["area_id"]:
                dr_.async_update_device(dev.id, area_id=g["area_id"])

    def _compute_active_uids(self, groups: list[dict[str, Any]]) -> set[str]:
        uids: set[str] = set()
        for g in groups:
            agg = self._hass.data[DOMAIN].device_groups.get_aggregator(g["id"])
            if agg is None:
                continue
            for slot in agg.outputs.get("presence", {}):
                uids.add(f"eppgrid_device_group_{g['id']}_{slot}")
            for zg in g.get("zone_groups", []):
                uids.add(f"eppgrid_device_group_{g['id']}_zone_group_{zg['id']}")
            for mac, idx in agg.outputs.get("zone_passthroughs", {}):
                uids.add(f"eppgrid_device_group_{g['id']}_zone_pass_{mac}_{idx}")
        return uids


class DeviceGroupPresenceEntity(BinarySensorEntity):
    """A helper entity that mirrors `Aggregator.outputs['presence'][slot]`."""

    _attr_should_poll = False
    _attr_has_entity_name = True

    def __init__(
        self,
        group: dict[str, Any],
        slot: str,
        aggregator: Aggregator,
    ) -> None:
        self._group_id = group["id"]
        self._slot = slot
        self._aggregator = aggregator
        self._unsub: Callable[[], None] | None = None
        self._attr_unique_id = f"eppgrid_device_group_{group['id']}_{slot}"
        self._attr_translation_key = f"device_group_{slot}"
        self._attr_name = slot.replace("_", " ").title()
        self._attr_device_class = _PRESENCE_DEVICE_CLASS.get(slot)
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, f"device_group:{group['id']}")},
            name=group["name"],
            manufacturer="Everything Presence Pro Grid",
            model="Device Group",
        )

    @property
    def is_on(self) -> bool | None:
        return self._aggregator.outputs["presence"].get(self._slot)

    @property
    def available(self) -> bool:
        return self._aggregator.outputs["presence"].get(self._slot) is not None

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self._unsub = self._aggregator.attach_entity_listener(
            self._slot,
            self.async_write_ha_state,
        )

    async def async_will_remove_from_hass(self) -> None:
        if self._unsub is not None:
            self._unsub()
            self._unsub = None
        await super().async_will_remove_from_hass()


class DeviceGroupZoneGroupEntity(BinarySensorEntity):
    """A helper entity that mirrors `Aggregator.outputs['zone_groups'][zg_id]`."""

    _attr_should_poll = False
    _attr_has_entity_name = True
    _attr_device_class = BinarySensorDeviceClass.OCCUPANCY

    def __init__(
        self,
        group: dict[str, Any],
        zone_group: dict[str, Any],
        aggregator: Aggregator,
    ) -> None:
        self._zg_id = zone_group["id"]
        self._aggregator = aggregator
        self._unsub: Callable[[], None] | None = None
        self._attr_unique_id = f"eppgrid_device_group_{group['id']}_zone_group_{zone_group['id']}"
        self._attr_name = zone_group["name"]
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, f"device_group:{group['id']}")},
            name=group["name"],
            manufacturer="Everything Presence Pro Grid",
            model="Device Group",
        )

    @property
    def is_on(self) -> bool | None:
        return self._aggregator.outputs["zone_groups"].get(self._zg_id)

    @property
    def available(self) -> bool:
        return self._aggregator.outputs["zone_groups"].get(self._zg_id) is not None

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self._unsub = self._aggregator.attach_entity_listener(
            f"zone_group:{self._zg_id}",
            self.async_write_ha_state,
        )

    async def async_will_remove_from_hass(self) -> None:
        if self._unsub is not None:
            self._unsub()
            self._unsub = None
        await super().async_will_remove_from_hass()


class DeviceGroupZonePassthroughEntity(BinarySensorEntity):
    """A helper entity that mirrors `Aggregator.outputs['zone_passthroughs'][(mac, idx)]`."""

    _attr_should_poll = False
    _attr_has_entity_name = True
    _attr_device_class = BinarySensorDeviceClass.OCCUPANCY

    def __init__(
        self,
        group: dict[str, Any],
        mac: str,
        zone_index: int,
        aggregator: Aggregator,
    ) -> None:
        self._mac = mac
        self._zone_index = zone_index
        self._aggregator = aggregator
        self._unsub: Callable[[], None] | None = None
        self._attr_unique_id = f"eppgrid_device_group_{group['id']}_zone_pass_{mac}_{zone_index}"
        self._attr_name = aggregator._zone_name_fn(mac, zone_index) or f"Zone {zone_index}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, f"device_group:{group['id']}")},
            name=group["name"],
            manufacturer="Everything Presence Pro Grid",
            model="Device Group",
        )

    @property
    def is_on(self) -> bool | None:
        return self._aggregator.outputs["zone_passthroughs"].get((self._mac, self._zone_index))

    @property
    def available(self) -> bool:
        return self._aggregator.outputs["zone_passthroughs"].get((self._mac, self._zone_index)) is not None

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self._unsub = self._aggregator.attach_entity_listener(
            f"zone_pass:{self._mac}:{self._zone_index}",
            self.async_write_ha_state,
        )

    async def async_will_remove_from_hass(self) -> None:
        if self._unsub is not None:
            self._unsub()
            self._unsub = None
        await super().async_will_remove_from_hass()
