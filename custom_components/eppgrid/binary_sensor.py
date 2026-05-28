"""Binary sensor platform — exposes the entities for each Device Group."""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from homeassistant.components.binary_sensor import BinarySensorDeviceClass
from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
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
        """Reconcile entities to match the set of groups.

        Task 8 only handles presence entities. Zone entities arrive in Task 10.
        """
        new_entities: list[BinarySensorEntity] = []
        for group in groups:
            aggregator = self._hass.data[DOMAIN].device_groups.get_aggregator(group["id"])
            if aggregator is None:
                continue
            for slot in PRESENCE_SLOTS:
                if slot not in aggregator.outputs.get("presence", {}):
                    continue
                uid = f"eppgrid_device_group_{group['id']}_{slot}"
                if uid in self._entities:
                    continue
                e = DeviceGroupPresenceEntity(group, slot, aggregator)
                self._entities[uid] = e
                new_entities.append(e)
        if new_entities:
            self._async_add(new_entities)


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
