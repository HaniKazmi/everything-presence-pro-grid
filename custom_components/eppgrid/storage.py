"""Persistent storage for EPP Grid device configs and saved configurations."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

STORAGE_VERSION = 1
STORAGE_KEY = DOMAIN


class EPPGridStore:
    """Store for per-device configuration and saved configurations."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store = Store[dict[str, Any]](hass, STORAGE_VERSION, STORAGE_KEY)
        self.devices: dict[str, dict[str, Any]] = {}
        self.configurations: dict[str, dict[str, Any]] = {}
        self.sidebar_panel: bool = True
        self.show_room_calibration_tutorial: bool = True

    async def async_load(self) -> None:
        """Load stored data."""
        data = await self._store.async_load()
        if data is None:
            return
        self.devices = data.get("devices", {})
        self.configurations = data.get("configurations", {})
        # One-shot migration from pre-rename storage shape.
        if not self.configurations and "templates" in data:
            self.configurations = {
                name: {**blob, "settings": blob.get("settings", {})}
                for name, blob in data["templates"].items()
            }
            await self.async_save()
        self.sidebar_panel = data.get("sidebar_panel", True)
        self.show_room_calibration_tutorial = data.get(
            "show_room_calibration_tutorial", True
        )

    async def async_save(self) -> None:
        """Persist current data."""
        await self._store.async_save(
            {
                "devices": self.devices,
                "configurations": self.configurations,
                "sidebar_panel": self.sidebar_panel,
                "show_room_calibration_tutorial": self.show_room_calibration_tutorial,
            }
        )

    def get_device(self, mac: str) -> dict[str, Any] | None:
        """Get config for a device by MAC, or None."""
        return self.devices.get(mac)
