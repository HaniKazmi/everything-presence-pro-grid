"""Resolver from (mac, slot) -> current ESPHome entity_id, and SourceState builder."""

from __future__ import annotations

from collections.abc import Callable

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from ..const import NUM_ZONE_SLOTS
from ..const import PRESENCE_SLOTS
from ._projection import SourceState
from ._projection import ZoneState


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
            entity_id = registry.async_get_entity_id("binary_sensor", "esphome", f"{mac}-binary_sensor-{slot}")
            entry = registry.async_get(entity_id) if entity_id else None
            if entry is not None and not entry.disabled:
                enabled_presence.append(slot)

        zones: list[ZoneState] = []
        for i in range(1, NUM_ZONE_SLOTS):  # zone 0 is "rest of room", skip
            name = zone_name_fn(mac, i)
            if name is None:
                continue
            entity_id = registry.async_get_entity_id(
                "binary_sensor", "esphome", f"{mac}-binary_sensor-zone_{i}_presence"
            )
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
