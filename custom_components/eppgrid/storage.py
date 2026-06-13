"""Persistent storage for EPP Grid device configs and saved configurations."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

STORAGE_VERSION = 2
STORAGE_KEY = DOMAIN


class _MigratingStore(Store[dict[str, Any]]):
    """Store subclass that runs schema migrations on load."""

    async def _async_migrate_func(
        self,
        old_major_version: int,
        old_minor_version: int,
        old_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Migrate stored data forward.

        v1 -> v2: add `device_groups` list (empty default).
        """
        if old_major_version < 2:
            old_data.setdefault("device_groups", [])
        return old_data


class EPPGridStore:
    """Store for per-device configuration and saved configurations."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store = _MigratingStore(hass, STORAGE_VERSION, STORAGE_KEY)
        self.devices: dict[str, dict[str, Any]] = {}
        self.configurations: dict[str, dict[str, Any]] = {}
        self.sidebar_panel: bool = True
        self.show_room_calibration_tutorial: bool = True
        self.device_groups: list[dict[str, Any]] = []

    async def async_load(self) -> None:
        """Load stored data."""
        data = await self._store.async_load()
        if data is None:
            return
        self.devices = data.get("devices", {})
        self.sidebar_panel = data.get("sidebar_panel", True)
        self.show_room_calibration_tutorial = data.get("show_room_calibration_tutorial", True)
        self.configurations = data.get("configurations", {})
        self.device_groups = data.get("device_groups", [])

    async def async_save(self) -> None:
        """Persist current data."""
        await self._store.async_save(
            {
                "devices": self.devices,
                "configurations": self.configurations,
                "sidebar_panel": self.sidebar_panel,
                "show_room_calibration_tutorial": self.show_room_calibration_tutorial,
                "device_groups": self.device_groups,
            }
        )
