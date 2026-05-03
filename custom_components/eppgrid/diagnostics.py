"""Diagnostics support for EPP Grid integration."""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.loader import async_get_loaded_integration

from .const import DOMAIN
from .const import FIRMWARE_VERSION
from .device_manager import DeviceManager


async def async_get_config_entry_diagnostics(hass: HomeAssistant, entry: ConfigEntry) -> dict[str, Any]:
    """Return diagnostics for a config entry."""
    manager: DeviceManager = hass.data[DOMAIN]

    # Collect entity states per device
    ent_reg = er.async_get(hass)
    entity_states: dict[str, dict[str, str]] = {}
    for mac, dev in manager.devices.items():
        if dev.device_id is None:
            entity_states[mac] = {}
            continue
        states: dict[str, str] = {}
        for ent_entry in er.async_entries_for_device(ent_reg, dev.device_id, include_disabled_entities=True):
            state = hass.states.get(ent_entry.entity_id)
            if state is not None:
                states[ent_entry.entity_id] = state.state
        entity_states[mac] = states

    try:
        integration_version = async_get_loaded_integration(hass, DOMAIN).version or "unknown"
    except Exception:  # defensive: loader may raise during teardown
        integration_version = "unknown"

    return {
        "integration_version": integration_version,
        "firmware_version": FIRMWARE_VERSION,
        "devices": manager.list_devices(),
        "stored_configs": dict(manager._store.devices),
        "configurations": dict(manager._store.configurations),
        "entity_states": entity_states,
    }
