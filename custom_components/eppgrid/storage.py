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
        self.sidebar_panel = data.get("sidebar_panel", True)
        self.show_room_calibration_tutorial = data.get("show_room_calibration_tutorial", True)
        self.configurations = data.get("configurations", {})
        # One-shot migration from pre-rename storage shape. Triggered by absence
        # of the new key (not emptiness) so that a user who legitimately
        # deleted all their saved configurations doesn't get the legacy
        # `templates` re-imported on every load.
        #
        # Legacy templates lacked a settings field; the migration sets
        # `settings: {}` to mark them as "saved with all defaults". On restore,
        # the frontend treats `{}` as "apply all defaults" — the device's
        # settings will be reset to factory defaults, and the user can re-tune
        # afterwards. (Layout-only restore for these entries is no longer
        # supported under the sparse-settings storage model.)
        if "configurations" not in data and "templates" in data:
            self.configurations = {
                name: {**blob, "settings": blob.get("settings", {})} for name, blob in data["templates"].items()
            }
            await self.async_save()

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
