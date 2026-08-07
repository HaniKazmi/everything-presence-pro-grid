"""Shared test helpers for registering fake ESPHome source entities.

Device-group source resolution (`resolve_entity_id`) locates a device's
binary_sensor entities via the device's MAC connection, then matches by
object_id — the same way it must work against HA 2026.8+ slash/name unique_ids
where a direct unique_id reverse-lookup is impossible. So a source entity in a
test must be attached to a device carrying that MAC connection, exactly like a
real ESPHome device. These helpers build that linkage once per MAC.
"""

from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

_DEVICE_CACHE_KEY = "_epp_test_esphome_devices"


def _get_or_create_device(hass: HomeAssistant, mac: str) -> tuple[MockConfigEntry, dr.DeviceEntry]:
    """Get-or-create an ESPHome config entry + device for `mac` (cached per MAC).

    Normalise the MAC with `dr.format_mac` for both the cache key and the device
    connection — exactly as real HA stores CONNECTION_NETWORK_MAC — so callers
    passing the same MAC in different cases/separators reuse one device and the
    `dr.format_mac`-based lookups in `resolve_entity_id` resolve it.
    """
    key = dr.format_mac(mac)
    cache: dict[str, tuple[MockConfigEntry, dr.DeviceEntry]] = hass.data.setdefault(_DEVICE_CACHE_KEY, {})
    if key in cache:
        return cache[key]
    entry = MockConfigEntry(domain="esphome", data={"host": f"host-{key}"}, title=f"esphome {key}")
    entry.add_to_hass(hass)
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id,
        connections={(dr.CONNECTION_NETWORK_MAC, key)},
        name=f"EPP {key}",
        manufacturer="EverythingSmartTechnology",
        model="Everything Presence Pro",
    )
    cache[key] = (entry, device)
    return entry, device


def _object_id_to_name(object_id: str) -> str:
    """Turn an object_id (``zone_2_presence``) into an ESPHome entity name.

    Only needs to round-trip through the integration's object_id normalisation
    (snake_case + sanitize), not match the firmware's exact casing.
    """
    return object_id.replace("_", " ").title()


def register_esphome_source(
    hass: HomeAssistant,
    mac: str,
    slot: str,
    *,
    disabled: bool = False,
    unique_id_version: int = 1,
) -> er.RegistryEntry:
    """Register a fake ESPHome binary_sensor for `slot` on the `mac` device.

    ``unique_id_version``:
      * 1 — legacy ``{mac}-binary_sensor-{object_id}`` (HA ≤2026.7).
      * 3 — HA 2026.8+ ``{mac_hex}/{device_id}/binary_sensor/{Name}``.
    Returns the created registry entry.
    """
    entry, device = _get_or_create_device(hass, mac)
    if unique_id_version == 3:
        mac_hex = mac.replace(":", "").lower()
        unique_id = f"{mac_hex}/0/binary_sensor/{_object_id_to_name(slot)}"
    else:
        unique_id = f"{mac}-binary_sensor-{slot}"
    return er.async_get(hass).async_get_or_create(
        "binary_sensor",
        "esphome",
        unique_id,
        device_id=device.id,
        config_entry=entry,
        disabled_by=er.RegistryEntryDisabler.USER if disabled else None,
    )


def add_esphome_source(
    hass: HomeAssistant,
    mac: str,
    slot: str,
    *,
    disabled: bool = False,
    unique_id_version: int = 1,
) -> str:
    """Like `register_esphome_source`, returning the created entity_id."""
    return register_esphome_source(hass, mac, slot, disabled=disabled, unique_id_version=unique_id_version).entity_id
