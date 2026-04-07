"""Diagnostics support for EPP Grid integration."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from .const import DOMAIN
from .const import FIRMWARE_VERSION
from .device_manager import DeviceManager

_MANIFEST = json.loads((Path(__file__).parent / "manifest.json").read_text())


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

    return {
        "integration_version": _MANIFEST["version"],
        "firmware_version": FIRMWARE_VERSION,
        "devices": manager.list_devices(),
        "stored_configs": dict(manager._store.devices),
        "templates": dict(manager._store.templates),
        "entity_states": entity_states,
    }
