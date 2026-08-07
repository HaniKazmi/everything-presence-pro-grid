"""Resolver from (mac, slot) -> current ESPHome entity_id, and SourceState builder."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from ..const import DOMAIN
from ..const import NUM_ZONE_SLOTS
from ..const import PRESENCE_SLOTS
from ..device_manager._helpers import _esphome_object_id
from ..device_manager._helpers import _resolve_zone_name
from ..dr_compat import device_by_connection
from ._projection import SourceState
from ._projection import ZoneState


def _esphome_entry_id(hass: HomeAssistant, mac: str) -> str | None:
    """The ESPHome config-entry id that owns this MAC's device, if known.

    Tracked per device by the DeviceManager. Returns None when the
    integration/device isn't loaded yet — the caller then falls back to a bare
    connection lookup, which stays unambiguous because eppgrid never registers a
    MAC-connection device of its own.
    """
    manager = hass.data.get(DOMAIN)
    return manager.esphome_entry_id_for_mac(mac) if manager is not None else None


def zone_name_from_store(store: Any, mac: str, zone_index: int) -> str | None:
    """Display name for a device's zone, matching the device's own zone sensor.

    `room_layout` is persisted as a dict ``{grid_bytes, zone_slots, furniture}``
    (see websocket set_room_layout); zone names live at
    ``room_layout["zone_slots"][zone_index]["name"]``. The returned name uses the
    same structural naming as the real per-zone sensors — ``Zone {name}`` for a
    named zone, ``Zone Rest of Room`` for zone 0 — so a device group's zones read
    identically to the device's own sensors. Returns None for an unconfigured
    (unnamed) named-zone slot. Shared by the integration setup (zone_name_fn
    callback) and the WS serializer so the lookup lives in one place.
    """
    device = store.devices.get(mac, {})
    layout = device.get("room_layout", {})
    slots = layout.get("zone_slots", []) if isinstance(layout, dict) else []
    slot = slots[zone_index] if 0 <= zone_index < len(slots) else None
    name = slot.get("name") if slot else None
    if zone_index != 0 and name is None:
        return None
    return _resolve_zone_name("en", index=zone_index, zone_name=name, target_count=False)


def build_source_index(hass: HomeAssistant, mac: str) -> dict[str, er.RegistryEntry]:
    """Map ``object_id -> RegistryEntry`` for a device's ESPHome binary_sensors.

    One device lookup + one ``async_entries_for_device`` scan, normalising each
    entity's object_id across HA unique_id formats via `_esphome_object_id`.
    Callers that need several slots/zones of the same device build this once and
    do O(1) lookups — calling `resolve_entity_id` per slot would re-scan the
    device's entities every time (the aggregator resolves ~180 (mac, slot) pairs
    per recompute).

    A direct unique_id reverse-lookup no longer works: HA 2026.8+ builds
    slash-separated, name-based unique_ids (``{mac}/{device_id}/{type}/{name}``),
    so the object_id is no longer a literal substring of the unique_id.
    """
    device = device_by_connection(
        dr.async_get(hass),
        (dr.CONNECTION_NETWORK_MAC, dr.format_mac(mac)),
        _esphome_entry_id(hass, mac),
    )
    if device is None:
        return {}
    ent_reg = er.async_get(hass)
    return {
        _esphome_object_id(entry.unique_id): entry
        for entry in er.async_entries_for_device(ent_reg, device.id, include_disabled_entities=True)
        if entry.platform == "esphome" and entry.domain == "binary_sensor"
    }


def resolve_entity_id(hass: HomeAssistant, mac: str, slot: str) -> str | None:
    """Current entity_id for an EPP source binary sensor (``slot`` = object_id).

    Single-slot convenience over `build_source_index`; a caller resolving several
    slots of one device should build the index once instead. Returns the
    entity_id whether enabled or not, or None when there is no such entry.
    """
    entry = build_source_index(hass, mac).get(slot)
    return entry.entity_id if entry is not None else None


def build_source_states(
    hass: HomeAssistant,
    macs: list[str],
    device_name_fn: Callable[[str], str],
    zone_name_fn: Callable[[str, int], str | None],
) -> list[SourceState]:
    """Build SourceState records for each MAC.

    `device_name_fn(mac)` returns the device's display name (typically from DeviceManager).
    `zone_name_fn(mac, idx)` returns the user-named zone label (from EPPGridStore.devices), or None.
    A zone is included whenever the user has configured it (zone_name_fn returns
    a name); its `enabled` flag is True only when the zone entity is registered
    and not disabled, so grouping can still mark a disabled/missing zone's output
    unavailable.
    """
    sources: list[SourceState] = []
    for mac in macs:
        index = build_source_index(hass, mac)
        enabled_presence: list[str] = [
            slot for slot in PRESENCE_SLOTS if (entry := index.get(slot)) is not None and not entry.disabled
        ]

        zones: list[ZoneState] = []
        for i in range(NUM_ZONE_SLOTS):  # zone 0 is the "rest of room" zone
            name = zone_name_fn(mac, i)
            if name is None:
                continue
            entry = index.get(f"zone_{i}_presence")
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
