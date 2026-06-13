"""Resolver from (mac, slot) -> current ESPHome entity_id, and SourceState builder."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from ..const import NUM_ZONE_SLOTS
from ..const import PRESENCE_SLOTS
from ._projection import SourceState
from ._projection import ZoneState


def zone_name_from_store(store: Any, mac: str, zone_index: int) -> str | None:
    """Look up a zone's user-set name from a device's stored room_layout.

    `room_layout` is persisted as a dict ``{grid_bytes, zone_slots, furniture}``
    (see websocket set_room_layout); zone names live at
    ``room_layout["zone_slots"][zone_index]["name"]``. Shared by the integration
    setup (zone_name_fn callback) and the WS serializer so the lookup lives in
    one place.
    """
    device = store.devices.get(mac, {})
    layout = device.get("room_layout", {})
    slots = layout.get("zone_slots", []) if isinstance(layout, dict) else []
    slot = slots[zone_index] if 0 <= zone_index < len(slots) else None
    name = slot.get("name") if slot else None
    if name is None and zone_index == 0:
        # Zone 0 is the always-present "rest of room" zone.
        return "Rest of room"
    return name


def resolve_entity_id(hass: HomeAssistant, mac: str, slot: str) -> str | None:
    """Look up the current entity_id for an EPP source binary sensor.

    ESPHome unique_id format: `{MAC}-binary_sensor-{slot}`.
    Returns the entity_id whether enabled or not, or None if no such entry.
    """
    registry = er.async_get(hass)
    return registry.async_get_entity_id("binary_sensor", "esphome", f"{mac}-binary_sensor-{slot}")


def build_source_states(
    hass: HomeAssistant,
    macs: list[str],
    device_name_fn: Callable[[str], str],
    zone_name_fn: Callable[[str, int], str | None],
) -> list[SourceState]:
    """Build SourceState records for each MAC.

    `device_name_fn(mac)` returns the device's display name (typically from DeviceManager).
    `zone_name_fn(mac, idx)` returns the user-named zone label (from EPPGridStore.devices), or None.
    A zone is "available" if its entity is registered AND not disabled, AND the
    user has actually configured it (has a name from zone_name_fn).
    """
    registry = er.async_get(hass)
    sources: list[SourceState] = []
    for mac in macs:
        enabled_presence: list[str] = []
        for slot in PRESENCE_SLOTS:
            entity_id = resolve_entity_id(hass, mac, slot)
            entry = registry.async_get(entity_id) if entity_id else None
            if entry is not None and not entry.disabled:
                enabled_presence.append(slot)

        zones: list[ZoneState] = []
        for i in range(NUM_ZONE_SLOTS):  # zone 0 is the "rest of room" zone
            name = zone_name_fn(mac, i)
            if name is None:
                continue
            entity_id = resolve_entity_id(hass, mac, f"zone_{i}_presence")
            entry = registry.async_get(entity_id) if entity_id else None
            enabled = entry is not None and not entry.disabled
            zones.append(ZoneState(index=i, name=name, enabled=enabled))

        sources.append(
            SourceState(
                mac=mac,
                name=device_name_fn(mac),
                enabled_presence=enabled_presence,
                zones=zones,
            )
        )
    return sources
