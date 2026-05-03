"""Device manager: discovery, connections, config push, entity management."""

from __future__ import annotations

import asyncio
import contextlib
import logging
from dataclasses import dataclass
from typing import Any

from aioesphomeapi import LogLevel
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.const import STATE_UNKNOWN
from homeassistant.core import HomeAssistant
from homeassistant.core import State
from homeassistant.core import callback
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_call_later

from ..const import EPP_MANUFACTURER
from ..const import EPP_MODEL
from ..const import MAX_ZONES
from ..const import empty_zone_slots
from ..storage import EPPGridStore
from ._connection import _DEVICE_LOGGER
from ._connection import DeviceConnection
from ._helpers import ZONE_TYPE_DEFAULTS as ZONE_TYPE_DEFAULTS  # re-export for tests
from ._helpers import _compare_firmware_version
from ._helpers import _compute_pipeline
from ._helpers import _extract_host
from ._helpers import _extract_mac
from ._helpers import _raise_service_unavailable as _raise_service_unavailable  # re-export for tests
from ._helpers import _resolve_zone_name
from ._helpers import _sync_firmware_repair_issue
from ._helpers import is_valid_zone_slots_shape

_LOGGER = logging.getLogger(__name__)


@dataclass
class ManagedDevice:
    """Tracked ESPHome device with zone engine firmware."""

    mac: str
    name: str
    host: str | None = None
    esphome_config_entry_id: str | None = None
    device_id: str | None = None
    available: bool = False


class DeviceManager:
    """Discovers ESPHome zone engine devices, manages connections and config."""

    def __init__(self, hass: HomeAssistant, store: EPPGridStore) -> None:
        self._hass = hass
        self._store = store
        self.devices: dict[str, ManagedDevice] = {}
        self._unsub_listeners: list[Any] = []
        self._pushing: set[str] = set()
        self._entity_update_macs: set[str] = set()
        # Cancel callables for the 60s "clear from _entity_update_macs" timers
        # scheduled by _schedule_entity_update_clear, keyed by mac. Tracked so
        # async_stop can cancel any in-flight handles instead of leaking them
        # past the config entry's lifetime.
        self._entity_update_clear_cancels: dict[str, Any] = {}
        self._build_flags: dict[str, dict[str, Any]] = {}
        # One connection per device, kept alive for the frontend session
        self._active_connections: dict[str, DeviceConnection] = {}
        self._session_locks: dict[str, asyncio.Lock] = {}
        # Serializes async_trigger_ota for a given mac. Held only while the
        # set_update_manifest call is in flight; concurrent callers fail-fast
        # with `ota_in_progress` rather than firing a duplicate OTA.
        self._ota_locks: dict[str, asyncio.Lock] = {}
        # In-flight close tasks keyed by mac. async_open_session awaits these
        # before opening so a quick close→reopen doesn't return a connection
        # that the close task is about to disconnect.
        self._pending_closes: dict[str, asyncio.Task] = {}
        # Macs whose last subscribe_device attempt failed to open a session.
        # Only the *transition* from "OK" → "failing" fires the device-list
        # broadcast; consecutive retries against the same already-failing
        # device are silent so we don't spam every subscriber on every poll.
        self._connection_failed: set[str] = set()
        self._device_list_callbacks: list[Any] = []
        # Unsub callables for ESPHome config-entry update listeners, keyed by entry_id
        self._entry_update_unsubs: dict[str, Any] = {}

    @callback
    def on_device_list_changed(self, cb: Any) -> Any:
        """Register a callback for device list changes. Returns an unsub callable."""
        self._device_list_callbacks.append(cb)

        @callback
        def unsub() -> None:
            if cb in self._device_list_callbacks:
                self._device_list_callbacks.remove(cb)

        return unsub

    @callback
    def _fire_device_list_changed(self) -> None:
        """Notify all subscribers that the device list has changed."""
        for cb in list(self._device_list_callbacks):
            try:
                cb()
            except Exception:
                _LOGGER.exception("Device list change callback failed")

    async def async_start(self) -> None:
        """Start discovery and event listeners."""
        await self.async_discover()
        self._unsub_listeners.append(
            self._hass.bus.async_listen(er.EVENT_ENTITY_REGISTRY_UPDATED, self._on_entity_registry_updated)
        )
        # Listen for state changes to detect device availability
        self._unsub_listeners.append(self._hass.bus.async_listen("state_changed", self._on_state_changed))
        # Listen for device removal to clean up stored settings
        self._unsub_listeners.append(
            self._hass.bus.async_listen(dr.EVENT_DEVICE_REGISTRY_UPDATED, self._on_device_registry_updated)
        )
        # Push config to devices that are already available — the
        # state_changed listener only catches future transitions, so devices
        # that connected before the integration loaded would be missed.
        ent_reg = er.async_get(self._hass)
        for mac in list(self.devices):
            if mac not in self._pushing:
                dev = self.devices[mac]
                # Only push to devices that are actually online — check if at
                # least one entity has a non-unavailable state.
                if dev.device_id:
                    entries = er.async_entries_for_device(ent_reg, dev.device_id, include_disabled_entities=True)
                    if entries and all(
                        (s := self._hass.states.get(e.entity_id)) is None or s.state == STATE_UNAVAILABLE
                        for e in entries
                    ):
                        continue
                self._pushing.add(mac)
                self._hass.async_create_task(self._on_device_available(mac))

    @callback
    def _schedule_entity_update_clear(self, mac: str, delay: float = 60.0) -> None:
        """Flag mac as having a pending entity-registry-update reload, then
        clear that flag after `delay` seconds.

        The flag suppresses our reaction to the entity-registry events that
        ESPHome fires when it re-discovers entities post-config-push. Any
        prior pending timer for the same mac is cancelled — re-scheduling
        replaces, never stacks. The cancel callable is tracked so async_stop
        can drop in-flight timers cleanly (HA 2026.4+ pytest fails the test
        if a timer outlives the config entry).
        """
        if (cancel := self._entity_update_clear_cancels.pop(mac, None)) is not None:
            cancel()
        self._entity_update_macs.add(mac)
        self._entity_update_clear_cancels[mac] = async_call_later(
            self._hass, delay, lambda _now: self._clear_entity_update(mac)
        )

    @callback
    def _clear_entity_update(self, mac: str) -> None:
        """Timer fire-callback: drop the entity-update flag and the cancel handle."""
        self._entity_update_macs.discard(mac)
        self._entity_update_clear_cancels.pop(mac, None)

    async def async_stop(self) -> None:
        """Stop listeners and close all connections."""
        for unsub in self._unsub_listeners:
            unsub()
        self._unsub_listeners.clear()
        for unsub in self._entry_update_unsubs.values():
            unsub()
        self._entry_update_unsubs.clear()
        for cancel in self._entity_update_clear_cancels.values():
            cancel()
        self._entity_update_clear_cancels.clear()
        for conn in self._active_connections.values():
            await conn.async_disconnect()
        self._active_connections.clear()

    async def async_trigger_ota(self, mac: str) -> None:
        """Trigger firmware OTA update on a device.

        Derives the firmware variant from cached build flags, constructs the
        manifest URL from `OTA_MANIFEST_BASE_URL`, and calls the device's
        `set_update_manifest` API action over a temporary connection. Shared
        by the panel's `update_firmware` websocket handler and the Repairs
        framework's `FirmwareUpdateRepairFlow`.

        Raises HomeAssistantError with a translation_key on every failure
        path so callers can map the failure to a user-facing message.
        """
        from homeassistant.exceptions import HomeAssistantError

        from ..const import DOMAIN as _DOMAIN
        from ..const import FIRMWARE_VARIANTS
        from ..const import OTA_MANIFEST_BASE_URL

        dev = self.devices.get(mac)
        if dev is None:
            raise HomeAssistantError(
                f"Device {mac} not found",
                translation_domain=_DOMAIN,
                translation_key="device_not_found",
            )
        if dev.host is None:
            raise HomeAssistantError(
                f"Device {mac} host unknown",
                translation_domain=_DOMAIN,
                translation_key="device_host_unknown",
            )
        flags = self._build_flags.get(mac, {})
        if not flags:
            raise HomeAssistantError(
                f"Build flags for {mac} not yet available",
                translation_domain=_DOMAIN,
                translation_key="build_flags_unavailable",
            )
        network = "ethernet" if flags.get("ethernet_enabled") else "wifi"
        variant = FIRMWARE_VARIANTS.get(network)
        if variant is None:
            raise HomeAssistantError(
                f"No firmware variant for network type: {network}",
                translation_domain=_DOMAIN,
                translation_key="no_firmware_variant",
                translation_placeholders={"network": network},
            )
        manifest_url = f"{OTA_MANIFEST_BASE_URL}/{variant}.json"

        lock = self._ota_locks.setdefault(mac, asyncio.Lock())
        if lock.locked():
            raise HomeAssistantError(
                f"OTA already in progress for {mac}",
                translation_domain=_DOMAIN,
                translation_key="ota_in_progress",
            )
        async with lock:
            conn = DeviceConnection(dev.host)
            try:
                try:
                    await conn.async_connect()
                    svc = conn._services.get("set_update_manifest")
                    if svc is None:
                        raise HomeAssistantError(
                            f"Device {mac} firmware does not expose set_update_manifest",
                            translation_domain=_DOMAIN,
                            translation_key="ota_unsupported",
                        )
                    if conn._client is None:
                        raise HomeAssistantError(
                            f"Device {mac} client unavailable",
                            translation_domain=_DOMAIN,
                            translation_key="device_not_available",
                        )
                    await conn._client.execute_service(svc, {"url": manifest_url})
                except HomeAssistantError:
                    raise
                except Exception as err:
                    # Wrap aioesphomeapi (and any other unexpected) exceptions so
                    # callers see a stable message-bearing type rather than raw
                    # technical text from a third-party library.
                    _LOGGER.warning("OTA trigger for %s failed", mac, exc_info=True)
                    raise HomeAssistantError(f"Could not contact device {mac}: {err}") from err
                _LOGGER.info("Triggered OTA for %s (manifest=%s)", mac, manifest_url)
            finally:
                await conn.async_disconnect()

    def read_firmware_version(self, device_id: str | None) -> str | None:
        """Read the Firmware Version text sensor value for a device.

        Returns the version string, or None if the entity exists but the
        state is unavailable/unknown (device offline).
        Returns "0.0.0" if no firmware_version entity exists (old firmware).
        """
        if device_id is None:
            return "0.0.0"
        ent_reg = er.async_get(self._hass)
        for entry in er.async_entries_for_device(ent_reg, device_id, include_disabled_entities=True):
            if (
                entry.platform == "esphome"
                and entry.domain == "sensor"
                and entry.unique_id.endswith("-firmware_version")
            ):
                state = self._hass.states.get(entry.entity_id)
                if state is not None and state.state not in (None, "unknown", "unavailable", ""):
                    return state.state
                return None
        return "0.0.0"

    def read_current_connection_count(self, device_id: str | None) -> int | None:
        """Read the Current Connections sensor value for a device.

        Returns the count (int), or None if the entity is missing or unavailable.
        """
        if device_id is None:
            return None
        ent_reg = er.async_get(self._hass)
        for entry in er.async_entries_for_device(ent_reg, device_id, include_disabled_entities=True):
            if entry.platform == "esphome" and entry.unique_id.endswith("current_connections"):
                state = self._hass.states.get(entry.entity_id)
                if state is not None and state.state not in (None, "unknown", "unavailable", ""):
                    try:
                        return int(float(state.state))
                    except (ValueError, TypeError):
                        pass
                return None
        return None

    async def async_discover(self) -> None:
        """Scan entity registry for ESPHome devices with firmware_version."""
        ent_reg = er.async_get(self._hass)
        dev_reg = dr.async_get(self._hass)

        found_new = False
        for entry in ent_reg.entities.values():
            if entry.platform != "esphome":
                continue
            if entry.domain != "sensor":
                continue
            if not entry.unique_id.endswith("-firmware_version"):
                continue
            if entry.device_id is None:
                continue

            device = dev_reg.async_get(entry.device_id)
            if device is None:
                continue

            if device.manufacturer != EPP_MANUFACTURER or device.model != EPP_MODEL:
                continue

            mac = _extract_mac(device)
            if mac is None:
                continue

            host = _extract_host(device, entry.config_entry_id, self._hass)

            is_new = mac not in self.devices
            self.devices[mac] = ManagedDevice(
                mac=mac,
                name=device.name_by_user or device.name or "EPP Device",
                host=host,
                esphome_config_entry_id=entry.config_entry_id,
                device_id=device.id,
            )

            _sync_firmware_repair_issue(
                self._hass,
                mac=mac,
                device_name=self.devices[mac].name,
                fw_ver=self.read_firmware_version(device.id),
            )

            if is_new:
                found_new = True
                self._ensure_esphome_entry_listener(entry.config_entry_id)
                _LOGGER.info("Discovered zone engine device: %s (%s)", device.name, mac)
                # Always sync — the empty fallback resets stale entity registry
                # entries left behind by a device delete+readd.
                config = self._store.devices.get(mac)
                zone_slots = config.get("room_layout", {}).get("zone_slots") if config else None
                # Only fall back when the key is actually missing (None);
                # falsy-but-present values (e.g. []) must pass through so
                # async_update_zone_entities can fail closed on malformed shapes.
                if zone_slots is None:
                    zone_slots = empty_zone_slots()
                await self.async_update_zone_entities(mac, zone_slots)

        if found_new:
            self._fire_device_list_changed()

    @callback
    def _on_entity_registry_updated(self, event: Any) -> None:
        """Handle entity registry changes — re-discover on new entities only."""
        if event.data.get("action") != "create":
            return
        entity_id = event.data.get("entity_id", "")
        ent_reg = er.async_get(self._hass)
        entry = ent_reg.async_get(entity_id)
        if entry is None or entry.platform != "esphome":
            return
        # Skip if this entity's device is already discovered
        if entry.device_id:
            dev_reg = dr.async_get(self._hass)
            device = dev_reg.async_get(entry.device_id)
            if device:
                mac = _extract_mac(device)
                if mac and mac in self.devices:
                    return
        self._hass.async_create_task(self.async_discover())

    @callback
    def _on_state_changed(self, event: Any) -> None:
        """Detect when a managed device becomes available."""
        new_state: State | None = event.data.get("new_state")
        old_state: State | None = event.data.get("old_state")
        if new_state is None or old_state is None:
            return

        # Check if this entity belongs to a managed ESPHome device
        ent_reg = er.async_get(self._hass)
        entry = ent_reg.async_get(event.data.get("entity_id", ""))
        if entry is None or entry.platform != "esphome" or entry.device_id is None:
            return

        dev_reg = dr.async_get(self._hass)
        device = dev_reg.async_get(entry.device_id)
        if device is None:
            return

        mac = _extract_mac(device)
        if not mac or mac not in self.devices:
            return

        # Treat 'unknown' like 'unavailable' — newly-added ESPHome entities
        # can go unknown → value without passing through unavailable, and
        # that transition still means the device just came online.
        offline_states = (STATE_UNAVAILABLE, STATE_UNKNOWN)

        # Re-sync Repairs whenever the firmware_version sensor specifically
        # transitions from offline to a real value. Handles the post-OTA
        # reconnect race: _on_device_available fires for the first entity
        # to come online, but firmware_version may still be unavailable at
        # that moment, so the initial sync exits early with fw_ver=None.
        # Without this hook the stale issue would persist forever.
        # Use read_firmware_version for the new value rather than
        # new_state.state directly, so we treat empty string the same as
        # unavailable/unknown — read_firmware_version is the single source
        # of truth for "is this a real firmware version".
        if (
            entry.domain == "sensor"
            and "firmware_version" in entry.unique_id
            and old_state.state in offline_states
            and new_state.state not in offline_states
        ):
            fw_ver = self.read_firmware_version(entry.device_id)
            if fw_ver is not None:
                _sync_firmware_repair_issue(
                    self._hass,
                    mac=mac,
                    device_name=self.devices[mac].name,
                    fw_ver=fw_ver,
                )

        if new_state.state in offline_states:
            # Device went offline — allow a fresh push when it comes back and
            # close any active session so the stale APIClient is replaced on
            # the next frontend reconnect.
            self._pushing.discard(mac)
            if mac in self._active_connections:
                self._hass.async_create_task(self.async_close_session(mac))
            self._fire_device_list_changed()
            return

        if old_state.state not in offline_states:
            return

        # Device came online — push config once. The `_pushing` guard
        # debounces the burst of per-entity transitions on reconnect so we
        # don't kick off N parallel push tasks; subsequent transitions still
        # need to notify subscribers, otherwise an entity that flips back
        # *after* the first task fires its event (e.g. `firmware_version`
        # arriving late) leaves the frontend stuck on a stale
        # `firmware_status="unavailable"` until something else triggers a
        # refresh.
        if mac not in self._pushing:
            self._pushing.add(mac)
            self._hass.async_create_task(self._on_device_available(mac))
        else:
            self._fire_device_list_changed()

    @callback
    def _ensure_esphome_entry_listener(self, entry_id: str | None) -> None:
        """Register an ESPHome config-entry update listener once per entry."""
        if entry_id is None or entry_id in self._entry_update_unsubs:
            return
        entry = self._hass.config_entries.async_get_entry(entry_id)
        if entry is None:
            return
        self._entry_update_unsubs[entry_id] = entry.add_update_listener(self._on_esphome_entry_updated)

    async def _on_esphome_entry_updated(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Pick up IP changes from the ESPHome integration without an HA restart."""
        new_host = entry.data.get("host")
        for mac, dev in self.devices.items():
            if dev.esphome_config_entry_id != entry.entry_id:
                continue
            if dev.host == new_host:
                return
            _LOGGER.info("ESPHome host for %s changed: %s → %s", dev.name, dev.host, new_host)
            dev.host = new_host
            # Drop the push guard so the next online transition re-pushes config.
            self._pushing.discard(mac)
            # Close the stale session; its APIClient is bound to the old IP.
            if mac in self._active_connections:
                await self.async_close_session(mac)
            return

    @callback
    def _on_device_registry_updated(self, event: Any) -> None:
        """Handle device registry changes — clean up on remove, push refresh on update."""
        action = event.data.get("action")
        if action not in ("remove", "update"):
            return

        device_id = event.data.get("device_id")
        mac = None
        for m, dev in self.devices.items():
            if dev.device_id == device_id:
                mac = m
                break

        if mac is None:
            return

        if action == "remove":
            self._hass.async_create_task(self._on_device_removed(mac))
            return

        # Update (rename, area change, etc.) — refresh the cached friendly
        # name and re-sync the Repairs issue so its title/description tracks
        # the new name, then notify subscribers so the frontend re-fetches
        # list_devices and picks up the fresh data.
        dev_reg = dr.async_get(self._hass)
        device = dev_reg.async_get(device_id) if device_id else None
        if device is not None:
            new_name = device.name_by_user or device.name or "EPP Device"
            self.devices[mac].name = new_name
            _sync_firmware_repair_issue(
                self._hass,
                mac=mac,
                device_name=new_name,
                fw_ver=self.read_firmware_version(device_id),
            )
        self._fire_device_list_changed()

    async def _on_device_removed(self, mac: str) -> None:
        """Clean up stored settings and runtime state for a removed device."""
        from homeassistant.helpers import issue_registry as ir

        from ..const import DOMAIN as _DOMAIN

        await self.async_close_session(mac)
        self._store.devices.pop(mac, None)
        dev = self.devices.pop(mac, None)
        if dev is not None and dev.esphome_config_entry_id:
            unsub = self._entry_update_unsubs.pop(dev.esphome_config_entry_id, None)
            if unsub is not None:
                unsub()
        self._build_flags.pop(mac, None)
        self._session_locks.pop(mac, None)
        self._entity_update_macs.discard(mac)
        self._pushing.discard(mac)
        # Clear any Repairs issues we raised for this device — they'd
        # otherwise hang in HA Settings → Repairs forever for a device
        # that no longer exists.
        ir.async_delete_issue(self._hass, _DOMAIN, f"firmware_behind_{mac}")
        ir.async_delete_issue(self._hass, _DOMAIN, f"firmware_ahead_{mac}")
        await self._store.async_save()
        self._fire_device_list_changed()
        _LOGGER.info("Cleaned up settings for removed device %s", mac)

    async def _on_device_available(self, mac: str) -> None:
        """Push stored config when a managed device comes online."""
        dev = self.devices.get(mac)
        if dev is not None:
            dev.available = True
            # Re-evaluate firmware-version repair issues after reconnect:
            # this is the OTA recovery path (reboot → reconnect → new
            # firmware_version state arrives) where the issue from the
            # previous version needs to be cleared or replaced.
            _sync_firmware_repair_issue(
                self._hass,
                mac=mac,
                device_name=dev.name,
                fw_ver=self.read_firmware_version(dev.device_id),
            )

        # Skip push if we caused this reconnect via entity registry updates.
        # Don't clear the guard here — multiple entities cycle through
        # unavailable→available during an ESPHome reload, creating multiple
        # tasks.  The 60-second timer in websocket_set_settings handles cleanup.
        if mac in self._entity_update_macs:
            _LOGGER.debug("Skipping redundant push for %s (entity update guard)", mac)
            return

        _LOGGER.info("Device %s became available, pushing config", mac)
        if not await self._push_config_to_device(mac):
            # Close stale connection and retry after device stabilises
            await self.async_close_session(mac)
            await asyncio.sleep(5)
            if not await self._push_config_to_device(mac):
                self._pushing.discard(mac)

        self._fire_device_list_changed()

    @staticmethod
    def _manage_log_subscription(conn: DeviceConnection, config: dict[str, Any]) -> None:
        """Subscribe/unsubscribe device logs based on stored log levels."""
        log_levels = config.get("log_levels", {})
        any_enabled = any(v != "None" for v in log_levels.values())
        if any_enabled:
            esphome_level_map = {
                "Error": LogLevel.LOG_LEVEL_ERROR,
                "Warning": LogLevel.LOG_LEVEL_WARN,
                "Info": LogLevel.LOG_LEVEL_INFO,
                "Debug": LogLevel.LOG_LEVEL_DEBUG,
            }
            # Find the most permissive level (highest LogLevel value = most verbose)
            active_levels = [v for v in log_levels.values() if v != "None"]
            esphome_level = max(
                (esphome_level_map.get(v, LogLevel.LOG_LEVEL_WARN) for v in active_levels),
                default=LogLevel.LOG_LEVEL_WARN,
            )
            # Set Python logger to DEBUG so HA doesn't filter any messages;
            # firmware-side filtering controls what actually gets sent.
            _DEVICE_LOGGER.setLevel(logging.DEBUG)
            conn.subscribe_logs(esphome_level)
        else:
            conn.unsubscribe_logs()

    async def _push_pipeline_to_device(self, mac: str) -> None:
        """Recompute pipeline intervals and push to device."""
        config = self._store.devices.get(mac, {})
        session = self.get_session(mac)
        raw_subs = session.raw_target_subs if session else 0
        grid_subs = session.grid_target_subs if session else 0

        pipeline = _compute_pipeline(config, raw_subs, grid_subs)

        # Push via session if available, otherwise skip (device will get it on next full push)
        if session is not None and session.connected:
            svc = session._services.get("epp_set_pipeline")
            if svc:
                assert session._client is not None  # connected → client set
                await session._client.execute_service(svc, pipeline)
                _LOGGER.info("Pushed pipeline to %s", mac)

    async def _fetch_build_flags(self, mac: str) -> None:
        """Fetch and cache build flags from a device."""
        if mac in self._build_flags:
            return
        dev = self.devices.get(mac)
        if dev is None or dev.host is None:
            return

        # Prefer existing session to avoid hitting ESP32 concurrent connection limit
        session = self.get_session(mac)
        if session is not None:
            flags = await session.async_fetch_build_flags()
            # Cache the result (even {}) so we don't retry every save on
            # firmware that never responds to get_build_flags.
            self._build_flags[mac] = flags
            if flags:
                self._fire_device_list_changed()
            return

        conn = DeviceConnection(dev.host)
        try:
            await asyncio.wait_for(conn.async_connect(), timeout=30)
            flags = await conn.async_fetch_build_flags()
            self._build_flags[mac] = flags
            if flags:
                self._fire_device_list_changed()
        except Exception:
            _LOGGER.debug("Failed to fetch build flags from %s", mac)
        finally:
            await conn.async_disconnect()

    async def _push_config_to_device(self, mac: str) -> bool:
        """Push config to device, preferring an existing session connection."""
        config = self._store.devices.get(mac)
        if config is None:
            await self._fetch_build_flags(mac)
            return True
        dev = self.devices.get(mac)
        if dev is None or dev.host is None:
            return False

        # Prefer existing session connection (avoids ESP32 concurrent connection limit)
        session_conn = self.get_session(mac)
        if session_conn is not None:
            try:
                await session_conn.async_push_config(config)
                await self._push_pipeline_to_device(mac)
                if mac not in self._build_flags:
                    self._build_flags[mac] = await session_conn.async_fetch_build_flags()
                self._manage_log_subscription(session_conn, config)
                return True
            except Exception:
                _LOGGER.warning("Failed to push config to %s (%s) via session", dev.name, mac)
                await self.async_close_session(mac)
                return False

        # No active session — use temporary connection (e.g., on-boot push)
        conn = DeviceConnection(dev.host)
        try:
            await asyncio.wait_for(conn.async_connect(), timeout=30)
            await conn.async_push_config(config)
            # Push pipeline directly (no subscribers on temp connections)
            pipeline = _compute_pipeline(config, 0, 0)
            svc = conn._services.get("epp_set_pipeline")
            if svc:
                assert conn._client is not None  # async_connect succeeded
                await conn._client.execute_service(svc, pipeline)
            if mac not in self._build_flags:
                self._build_flags[mac] = await conn.async_fetch_build_flags()
            return True
        except Exception:
            _LOGGER.warning("Failed to push config to %s (%s)", dev.name, mac)
            return False
        finally:
            await conn.async_disconnect()

    def _is_device_available(self, mac: str) -> bool:
        """Check HA entity states to determine if a device is reachable.

        Returns True if any ESPHome entity is in a live state (not
        unavailable or unknown), or if there are no ESPHome entities to
        check (unknown = try to connect).
        Returns False only if entities exist and ALL are unavailable/unknown.
        """
        dev = self.devices.get(mac)
        if dev is None or dev.device_id is None:
            return True  # No device tracking — try to connect
        ent_reg = er.async_get(self._hass)
        has_esphome_entity = False
        for entry in er.async_entries_for_device(ent_reg, dev.device_id, include_disabled_entities=True):
            if entry.platform != "esphome":
                continue
            has_esphome_entity = True
            state = self._hass.states.get(entry.entity_id)
            if state is not None and state.state not in ("unavailable", "unknown"):
                return True
        return not has_esphome_entity  # No entities = unknown = try

    async def async_open_session(self, mac: str) -> DeviceConnection | None:
        """Open a persistent connection for a frontend session.
        Returns the connection, or None if the device is not available."""
        dev = self.devices.get(mac)
        if dev is None or dev.host is None:
            return None
        # Fast-fail if HA already knows the device is unavailable
        if not self._is_device_available(mac):
            return None
        # Wait for any pending close to complete first — otherwise a quick
        # unsubscribe→re-subscribe sequence races the close task and the
        # caller gets back a connection that's about to be disconnected.
        pending = self._pending_closes.get(mac)
        if pending is not None and not pending.done():
            with contextlib.suppress(Exception):
                await pending
        lock = self._session_locks.setdefault(mac, asyncio.Lock())
        async with lock:
            if mac in self._active_connections:
                conn = self._active_connections[mac]
                if conn.connected:
                    return conn
                # Stale connection — clean up
                await conn.async_disconnect()
            conn = DeviceConnection(dev.host)
            await asyncio.wait_for(conn.async_connect(), timeout=30)
            self._active_connections[mac] = conn
            _LOGGER.info("Opened session for %s (%s)", dev.name, mac)
            # Subscribe to device logs if log levels are configured
            config = self._store.devices.get(mac)
            if config:
                self._manage_log_subscription(conn, config)
            return conn

    async def async_close_session(self, mac: str) -> None:
        """Close the frontend session connection for a device."""
        conn = self._active_connections.pop(mac, None)
        if conn is not None:
            await conn.async_disconnect()
            dev = self.devices.get(mac)
            name = dev.name if dev else mac
            _LOGGER.info("Closed session for %s (%s)", name, mac)

    @callback
    def schedule_close_session(self, mac: str) -> asyncio.Task:
        """Schedule async_close_session as a tracked task for the given mac.

        Subsequent async_open_session calls for the same mac await this task
        before opening a fresh session — otherwise a quick close→reopen
        sequence races the close and returns the about-to-be-closed conn.
        Re-scheduling while a close is already in flight returns the existing
        task instead of starting a duplicate.
        """
        existing = self._pending_closes.get(mac)
        if existing is not None and not existing.done():
            return existing
        task = self._hass.async_create_task(self.async_close_session(mac))
        self._pending_closes[mac] = task

        def _drop(_: asyncio.Task) -> None:
            # Only forget the task if it's still the one we registered. A
            # close that errored mid-flight could otherwise be replaced by a
            # new schedule before this callback fires.
            if self._pending_closes.get(mac) is task:
                self._pending_closes.pop(mac, None)

        task.add_done_callback(_drop)
        return task

    def get_session(self, mac: str) -> DeviceConnection | None:
        """Get the active session connection for a device, or None."""
        conn = self._active_connections.get(mac)
        if conn is not None and conn.connected:
            return conn
        return None

    def list_devices(self) -> list[dict[str, Any]]:
        """Return serializable list of managed devices for the frontend."""
        dev_reg = dr.async_get(self._hass)
        area_reg = ar.async_get(self._hass)
        result = []
        for mac, dev in self.devices.items():
            config = self._store.devices.get(mac)
            fw_ver = self.read_firmware_version(dev.device_id)
            registry_entry = dev_reg.async_get(dev.device_id) if dev.device_id else None
            fresh_name = ((registry_entry.name_by_user or registry_entry.name) if registry_entry else None) or dev.name
            area_name: str | None = None
            if registry_entry and registry_entry.area_id:
                area = area_reg.async_get_area(registry_entry.area_id)
                if area is not None:
                    area_name = area.name
            result.append(
                {
                    "mac": mac,
                    "name": config.get("name", fresh_name) if config else fresh_name,
                    "host": dev.host,
                    "available": self._is_device_available(mac),
                    "configured": config is not None,
                    "area": area_name,
                    "firmware_status": ("unavailable" if fw_ver is None else _compare_firmware_version(fw_ver)),
                    "current_connection_count": self.read_current_connection_count(dev.device_id),
                    **self._build_flags.get(mac, {}),
                }
            )
        return result

    async def list_flashable_devices(self) -> list[dict[str, Any]]:
        """Return all ESPHome EPP devices — both original and EPP Grid firmware."""
        dev_reg = dr.async_get(self._hass)
        ent_reg = er.async_get(self._hass)
        result: list[dict[str, Any]] = []
        seen_macs: set[str] = set()

        for device in dev_reg.devices.values():
            # Must be an EPP device (check manufacturer + model)
            if device.manufacturer != EPP_MANUFACTURER:
                continue
            if device.model != EPP_MODEL:
                continue

            mac = _extract_mac(device)
            if mac is None or mac in seen_macs:
                continue
            seen_macs.add(mac)

            # Find the ESPHome config entry for this device
            esphome_config_entry_id = None
            for entry_id in device.config_entries:
                entry = self._hass.config_entries.async_get_entry(entry_id)
                if entry is not None and entry.domain == "esphome":
                    esphome_config_entry_id = entry_id
                    break

            host = _extract_host(device, esphome_config_entry_id, self._hass)

            # Check if device has firmware_version entity (= our firmware)
            has_firmware_version = False
            for ent_entry in er.async_entries_for_device(ent_reg, device.id, include_disabled_entities=True):
                if (
                    ent_entry.platform == "esphome"
                    and ent_entry.domain == "sensor"
                    and ent_entry.unique_id.endswith("-firmware_version")
                ):
                    has_firmware_version = True
                    break

            # Check availability: any non-unavailable entity means device is online
            available = False
            for ent_entry in er.async_entries_for_device(ent_reg, device.id):
                state = self._hass.states.get(ent_entry.entity_id)
                if state is not None and state.state not in ("unavailable", "unknown"):
                    available = True
                    break

            # Check if an update is available via ESPHome update entity. Loop
            # past disabled / not-yet-published update entities until we find
            # one with a readable state, otherwise a disabled sibling can mask
            # a real "update available".
            update_available = False
            for ent_entry in er.async_entries_for_device(ent_reg, device.id, include_disabled_entities=True):
                if ent_entry.domain == "update" and ent_entry.platform == "esphome":
                    state = self._hass.states.get(ent_entry.entity_id)
                    if state is not None:
                        if state.state == "on":
                            update_available = True
                        break

            managed_dev = self.devices.get(mac)
            result.append(
                {
                    "mac": mac,
                    "name": device.name_by_user or device.name or "EPP Device",
                    "host": host,
                    "available": available,
                    "firmware_type": "eppgrid" if has_firmware_version else "original",
                    "firmware_version": (
                        self.read_firmware_version(managed_dev.device_id)
                        or (device.sw_version or "").split(" (")[0]
                        or "unknown"
                        if has_firmware_version and managed_dev is not None
                        else (device.sw_version or "").split(" (")[0] or "unknown"
                    ),
                    "firmware_status": (
                        (
                            "unavailable"
                            if (fw := self.read_firmware_version(managed_dev.device_id)) is None
                            else _compare_firmware_version(fw)
                        )
                        if has_firmware_version and managed_dev is not None
                        else "unknown"
                    ),
                    "esphome_config_entry_id": esphome_config_entry_id,
                    "update_available": update_available,
                }
            )

        return result

    async def async_update_zone_entities(self, mac: str, zone_slots: list[dict[str, Any] | None]) -> None:
        """Enable/disable and rename ESPHome zone entities for a device.

        Handles both zone_presence and zone_target_count entities.
        When enabled, zone 0 + named zones are enabled; unused slots are disabled.

        Fails closed on malformed ``zone_slots`` shape. A legacy 0.93.x layout
        stored with length 7 (or any other shape where slot 0 is not a dict)
        would otherwise silently shift indices — the user's old "first named
        zone" would get renamed into zone 0, etc. Instead we treat every zone
        as non-existent and disable all HA zone entities until the user
        re-applies their layout via the panel (which writes length-8 shape).
        """
        dev = self.devices.get(mac)
        if dev is None or dev.device_id is None:
            return

        # Shape guard: fail-closed on anything that isn't the expected length-8
        # list with a dict at slot 0.
        shape_ok = is_valid_zone_slots_shape(zone_slots)

        language = self._hass.config.language
        ent_reg = er.async_get(self._hass)
        config = self._store.devices.get(mac) or {}
        settings = config.get("settings", {})
        zone_presence = settings.get("zone_presence", False)
        zone_target_count = settings.get("zone_target_count", False)

        def _zone_exists(i: int) -> bool:
            """Check if zone slot i exists.

            When the shape is OK, zone 0 (room) always exists, and named slots
            1..7 exist only when they are dicts. When the shape is malformed,
            every zone is treated as non-existent — the loop below then falls
            through to the INTEGRATION-disable path for each entity.
            """
            if not shape_ok:
                return False
            if i == 0:
                return True
            slot = zone_slots[i]
            return isinstance(slot, dict)

        for i in range(MAX_ZONES + 1):  # zones 0-7
            exists = _zone_exists(i)

            # Zone presence entity
            entity_id = self._find_zone_entity(ent_reg, dev.device_id, i, "presence")
            if entity_id is not None:
                entry_obj = ent_reg.async_get(entity_id)
                if not zone_presence or not exists:
                    ent_reg.async_update_entity(entity_id, disabled_by=er.RegistryEntryDisabler.INTEGRATION, name=None)
                elif i == 0:
                    ent_reg.async_update_entity(
                        entity_id,
                        disabled_by=None,
                        name=_resolve_zone_name(language, index=0, zone_name=None, target_count=False),
                    )
                else:
                    zone = zone_slots[i]
                    if entry_obj and entry_obj.disabled_by == er.RegistryEntryDisabler.USER:
                        pass  # Don't override user-disabled entities
                    else:
                        # .get() with fallback — _resolve_zone_name tolerates zone_name=None.
                        zone_name = zone.get("name") if isinstance(zone, dict) else None
                        ent_reg.async_update_entity(
                            entity_id,
                            disabled_by=None,
                            name=_resolve_zone_name(language, index=i, zone_name=zone_name, target_count=False),
                        )

            # Zone target count entity
            tc_entity_id = self._find_zone_entity(ent_reg, dev.device_id, i, "target_count")
            if tc_entity_id is not None:
                tc_entry = ent_reg.async_get(tc_entity_id)
                if tc_entry and tc_entry.disabled_by == er.RegistryEntryDisabler.USER:
                    pass  # Don't override user-disabled entities
                elif zone_target_count and exists:
                    if i == 0:
                        ent_reg.async_update_entity(
                            tc_entity_id,
                            disabled_by=None,
                            name=_resolve_zone_name(language, index=0, zone_name=None, target_count=True),
                        )
                    else:
                        zone = zone_slots[i]
                        zone_name = zone.get("name") if isinstance(zone, dict) else None
                        ent_reg.async_update_entity(
                            tc_entity_id,
                            disabled_by=None,
                            name=_resolve_zone_name(language, index=i, zone_name=zone_name, target_count=True),
                        )
                else:
                    ent_reg.async_update_entity(
                        tc_entity_id, disabled_by=er.RegistryEntryDisabler.INTEGRATION, name=None
                    )

    def _find_zone_entity(
        self, ent_reg: er.EntityRegistry, device_id: str, zone_index: int, suffix: str = "presence"
    ) -> str | None:
        """Find an ESPHome zone entity_id for a device, zone index, and suffix."""
        suffix_match = f"-zone_{zone_index}_{suffix}"
        for entry in ent_reg.entities.values():
            if entry.device_id == device_id and entry.platform == "esphome" and entry.unique_id.endswith(suffix_match):
                return entry.entity_id
        return None
