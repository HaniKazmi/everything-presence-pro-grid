"""Persistent storage for EPP Grid device configs and saved configurations."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

STORAGE_VERSION = 4
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
        v2 -> v3: stamp `assisted_clear_timeout: 0` into existing device and
            saved-configuration settings so installs that predate the
            sensor-assisted-clear timeout keep clearing immediately. New
            installs (no settings dict) pick up the 5 s default instead.
        v3 -> v4: seed device-group opt-out fields (`excluded_presence`,
            `excluded_zones`, `excluded_zone_groups`) and rewrite legacy
            zone-0 (Rest-of-room) merges into the implicit combined Rest of
            Room: drop all-zone-0 merges; strip zone-0 members from mixed
            merges (dropping the merge if <2 members remain).
        """
        if old_major_version < 2:
            old_data.setdefault("device_groups", [])
        if old_major_version < 3:
            # Stamp existing device AND saved-configuration settings dicts alike.
            for owner in (
                *old_data.get("devices", {}).values(),
                *old_data.get("configurations", {}).values(),
            ):
                settings = owner.get("settings") if isinstance(owner, dict) else None
                if isinstance(settings, dict):
                    settings.setdefault("assisted_clear_timeout", 0)
        if old_major_version < 4:
            for group in old_data.get("device_groups", []):
                if not isinstance(group, dict):
                    continue
                group.setdefault("excluded_presence", [])
                group.setdefault("excluded_zones", [])
                group.setdefault("excluded_zone_groups", [])
                kept_groups: list[dict[str, Any]] = []
                for zg in group.get("zone_groups", []):
                    members = zg.get("members", [])
                    non_zero = [m for m in members if m.get("zone_index") != 0]
                    # All-zone-0 merge (legacy manual Rest of room) -> drop.
                    # Mixed merge -> keep only the non-zero members, and drop
                    # the whole merge if fewer than two real members remain.
                    if len(non_zero) >= 2:
                        zg["members"] = non_zero
                        kept_groups.append(zg)
                group["zone_groups"] = kept_groups
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
