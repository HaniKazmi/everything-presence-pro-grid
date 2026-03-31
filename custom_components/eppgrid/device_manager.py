"""Device manager: discovery, connections, config push, entity management."""

from __future__ import annotations

import asyncio
import base64
import contextlib
import json
import logging
from dataclasses import dataclass
from typing import Any

from aioesphomeapi import APIClient
from aioesphomeapi import LogLevel
from aioesphomeapi import UserService
from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.core import HomeAssistant
from homeassistant.core import State
from homeassistant.core import callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .const import CONFIG_PROTOCOL_VERSION
from .const import DEFAULT_PORT
from .const import GRID_CELL_SIZE_MM
from .const import GRID_COLS
from .const import MAX_ZONES
from .storage import EPPGridStore

_LOGGER = logging.getLogger(__name__)
_DEVICE_LOGGER = logging.getLogger(f"{__name__}.device_logs")

# Map aioesphomeapi LogLevel values to Python logging levels
_ESPHOME_TO_PYTHON_LOG = {
    LogLevel.LOG_LEVEL_ERROR: logging.ERROR,
    LogLevel.LOG_LEVEL_WARN: logging.WARNING,
    LogLevel.LOG_LEVEL_INFO: logging.INFO,
    LogLevel.LOG_LEVEL_CONFIG: logging.INFO,
    LogLevel.LOG_LEVEL_DEBUG: logging.DEBUG,
    LogLevel.LOG_LEVEL_VERBOSE: logging.DEBUG,
    LogLevel.LOG_LEVEL_VERY_VERBOSE: logging.DEBUG,
}


class DeviceConnection:
    """On-demand API connection to an EPP device."""

    def __init__(self, host: str, port: int = DEFAULT_PORT, noise_psk: str = "") -> None:
        self._host = host
        self._port = port
        self._noise_psk = noise_psk
        self._client: APIClient | None = None
        self._services: dict[str, UserService] = {}
        self._entities: list = []
        self._state_subscribers: list[Any] = []
        self._states_subscribed: bool = False
        self._unsub_logs: Any = None
        self.connected: bool = False

    async def async_connect(self) -> None:
        """Connect to the device and cache available services."""
        if self.connected:
            return
        client = APIClient(self._host, self._port, "", noise_psk=self._noise_psk)
        try:
            await client.connect(login=True)
            entities, services = await client.list_entities_services()
        except Exception:
            await client.disconnect()
            raise
        self._client = client
        self._services = {s.name: s for s in services}
        self._entities = entities
        self.connected = True
        _LOGGER.debug("Connected to %s", self._host)

    async def async_disconnect(self) -> None:
        """Disconnect from the device."""
        self.unsubscribe_logs()
        if self._client is not None:
            await self._client.disconnect()
        self._client = None
        self._services.clear()
        self._entities = []
        self._state_subscribers.clear()
        self._states_subscribed = False
        self.connected = False

    def subscribe_states(self, cb: Any) -> None:
        """Add a state subscriber. All subscribers receive every state update."""
        self._state_subscribers.append(cb)
        if not self._states_subscribed and self._client is not None:
            self._states_subscribed = True
            self._client.subscribe_states(self._dispatch_state)

    def unsubscribe_states(self, cb: Any) -> None:
        """Remove a state subscriber."""
        with contextlib.suppress(ValueError):
            self._state_subscribers.remove(cb)

    def _dispatch_state(self, state: Any) -> None:
        """Fan out state updates to all subscribers."""
        for cb in self._state_subscribers:
            cb(state)

    def subscribe_logs(self, log_level: LogLevel = LogLevel.LOG_LEVEL_DEBUG) -> None:
        """Subscribe to device log messages and re-emit via Python logger."""
        if self._client is None:
            return

        # If already subscribed, unsubscribe first (level may have changed)
        if self._unsub_logs is not None:
            self._unsub_logs()
            self._unsub_logs = None

        def _on_log(msg: Any) -> None:
            py_level = _ESPHOME_TO_PYTHON_LOG.get(msg.level)
            if py_level is None:
                return
            text = msg.message
            if isinstance(text, bytes):
                text = text.decode("utf-8", errors="replace")
            text = text.rstrip()
            if text:
                _DEVICE_LOGGER.log(py_level, "[%s] %s", self._host, text)

        self._unsub_logs = self._client.subscribe_logs(_on_log, log_level=log_level)
        _LOGGER.debug("Subscribed to device logs from %s (level=%s)", self._host, log_level)

    def unsubscribe_logs(self) -> None:
        """Stop receiving device log messages."""
        if self._unsub_logs is not None:
            self._unsub_logs()
            self._unsub_logs = None
            _LOGGER.debug("Unsubscribed from device logs from %s", self._host)

    async def async_fetch_build_flags(self) -> dict[str, Any]:
        """Fetch build flags from device via get_build_flags action."""
        if self._client is None:
            return {}
        svc = self._services.get("get_build_flags")
        if svc is None:
            return {}
        try:
            resp = await self._client.execute_service(svc, {})
            return resp if isinstance(resp, dict) else {}
        except Exception:
            _LOGGER.debug("Failed to fetch build flags from %s", self._host)
            return {}

    async def async_push_config(self, config: dict[str, Any]) -> None:
        """Push perspective, grid, and zones to the device."""
        if self._client is None:
            return

        cal = config.get("calibration", {})
        perspective = cal.get("perspective")
        if perspective:
            service = self._services.get("epp_set_perspective")
            if service:
                await self._client.execute_service(
                    service,
                    {
                        "perspective": ",".join(str(c) for c in perspective),
                        "room_width": cal.get("room_width", 0.0),
                        "room_depth": cal.get("room_depth", 0.0),
                    },
                )
                _LOGGER.info("Pushed perspective to %s", self._host)

        layout = config.get("room_layout", {})
        grid_bytes = layout.get("grid_bytes")
        if grid_bytes:
            service = self._services.get("epp_set_grid")
            if service:
                grid_b64 = base64.b64encode(bytes(grid_bytes)).decode("ascii")
                # Compute origin from grid dimensions (room centered in grid)
                room_width = cal.get("room_width", 6000.0)
                room_cols = max(1, -(-int(room_width) // GRID_CELL_SIZE_MM))
                start_col = (GRID_COLS - room_cols) // 2
                origin_x = -start_col * GRID_CELL_SIZE_MM
                await self._client.execute_service(
                    service,
                    {
                        "grid_data": grid_b64,
                        "origin_x": float(origin_x),
                        "origin_y": 0.0,
                    },
                )
                _LOGGER.info("Pushed grid to %s", self._host)

        zone_slots = layout.get("zone_slots", [None] * MAX_ZONES)
        service = self._services.get("epp_set_zones")
        if service:
            named = [s for s in zone_slots if s is not None]
            zone_data = {
                "zone_slots": zone_slots,
                "room_type": layout.get("room_type", "normal"),
                "room_trigger": layout.get("room_trigger", 5),
                "room_renew": layout.get("room_renew", 3),
                "room_timeout": layout.get("room_timeout", 10.0),
                "room_handoff_timeout": layout.get("room_handoff_timeout", 3.0),
                "room_entry_point": layout.get("room_entry_point", False),
            }
            await self._client.execute_service(
                service,
                {
                    "zones_json": json.dumps(zone_data),
                },
            )
            _LOGGER.info("Pushed %d zones to %s", len(named), self._host)

        # Push device settings from unified settings key
        settings = config.get("settings")
        if settings:
            svc = self._services.get("epp_set_env_calibration")
            if svc:
                await self._client.execute_service(
                    svc,
                    {
                        "temperature_offset": settings.get("temperature_offset", 0.0),
                        "humidity_offset": settings.get("humidity_offset", 0.0),
                        "illuminance_offset": settings.get("illuminance_offset", 0.0),
                    },
                )
                _LOGGER.info("Pushed env_calibration to %s", self._host)

            svc = self._services.get("epp_set_motion_timeout")
            if svc:
                await self._client.execute_service(
                    svc,
                    {"timeout": settings.get("motion_timeout", 5.0)},
                )
                _LOGGER.info("Pushed motion_timeout to %s", self._host)

            svc = self._services.get("epp_set_tracking")
            if svc:
                await self._client.execute_service(
                    svc,
                    {"max_range": settings.get("target_max_distance", 6.0) * 1000},
                )
                _LOGGER.info("Pushed tracking to %s", self._host)

            svc = self._services.get("epp_set_static_presence")
            if svc:
                await self._client.execute_service(
                    svc,
                    {
                        "min_range": settings.get("static_min_distance", 0.3),
                        "max_range": settings.get("static_max_distance", 16.0),
                        "trigger_range": settings.get("static_max_distance", 16.0),
                        "trigger_sensitivity": 10 - settings.get("static_trigger_threshold", 3),
                        "sustain_sensitivity": 10 - settings.get("static_renew_threshold", 3),
                        "timeout": settings.get("static_timeout", 30.0),
                        "on_delay": settings.get("static_on_delay", 0.0),
                        "led_enabled": True,
                    },
                )
                _LOGGER.info("Pushed static_presence to %s", self._host)

        # Push pipeline (separate from settings)
        pipeline = config.get("pipeline")
        if pipeline:
            svc = self._services.get("epp_set_pipeline")
            if svc:
                await self._client.execute_service(svc, pipeline)
                _LOGGER.info("Pushed pipeline to %s", self._host)

        # Push log levels
        log_levels = config.get("log_levels")
        if log_levels:
            svc = self._services.get("epp_set_log_level")
            if svc:
                for category, level in log_levels.items():
                    await self._client.execute_service(
                        svc,
                        {"category": category, "level": level},
                    )
                _LOGGER.info("Pushed log levels to %s", self._host)


@dataclass
class ManagedDevice:
    """Tracked ESPHome device with zone engine firmware."""

    mac: str
    name: str
    host: str | None = None
    esphome_config_entry_id: str | None = None
    device_id: str | None = None
    available: bool = False
    config_protocol: int = 0  # deprecated; use DeviceManager.read_config_protocol()


class DeviceManager:
    """Discovers ESPHome zone engine devices, manages connections and config."""

    def __init__(self, hass: HomeAssistant, store: EPPGridStore) -> None:
        self._hass = hass
        self._store = store
        self.devices: dict[str, ManagedDevice] = {}
        self._unsub_listeners: list[Any] = []
        self._pushing: set[str] = set()
        self._entity_update_macs: set[str] = set()
        self._build_flags: dict[str, dict[str, Any]] = {}
        # One connection per device, kept alive for the frontend session
        self._active_connections: dict[str, DeviceConnection] = {}
        self._session_locks: dict[str, asyncio.Lock] = {}

    async def async_start(self) -> None:
        """Start discovery and event listeners."""
        await self.async_discover()
        self._unsub_listeners.append(
            self._hass.bus.async_listen(er.EVENT_ENTITY_REGISTRY_UPDATED, self._on_entity_registry_updated)
        )
        # Listen for state changes to detect device availability
        self._unsub_listeners.append(self._hass.bus.async_listen("state_changed", self._on_state_changed))

    async def async_stop(self) -> None:
        """Stop listeners and close all connections."""
        for unsub in self._unsub_listeners:
            unsub()
        self._unsub_listeners.clear()
        for conn in self._active_connections.values():
            await conn.async_disconnect()
        self._active_connections.clear()

    def read_config_protocol(self, device_id: str | None) -> int | None:
        """Read the Config Protocol sensor value for a device.

        Returns the protocol version (int), or None if the entity exists
        but the state is unavailable/unknown (device offline).
        Returns 0 if no config_protocol entity exists (old firmware).
        """
        if device_id is None:
            return 0
        ent_reg = er.async_get(self._hass)
        for entry in er.async_entries_for_device(ent_reg, device_id, include_disabled_entities=True):
            if entry.platform == "esphome" and entry.unique_id.endswith("config_protocol"):
                state = self._hass.states.get(entry.entity_id)
                if state is not None and state.state not in (None, "unknown", "unavailable", ""):
                    try:
                        return int(float(state.state))
                    except (ValueError, TypeError):
                        pass
                    return 0
                return None
        return 0

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
        """Scan entity registry for ESPHome devices with zone_engine_version."""
        ent_reg = er.async_get(self._hass)
        dev_reg = dr.async_get(self._hass)

        for entry in ent_reg.entities.values():
            if entry.platform != "esphome":
                continue
            if "zone_engine_version" not in entry.unique_id:
                continue
            if entry.device_id is None:
                continue

            device = dev_reg.async_get(entry.device_id)
            if device is None:
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

            if is_new:
                _LOGGER.info("Discovered zone engine device: %s (%s)", device.name, mac)
                # Apply zone entity management on first discovery only
                config = self._store.get_device(mac)
                zone_slots = (
                    config.get("room_layout", {}).get("zone_slots", [None] * MAX_ZONES)
                    if config
                    else [None] * MAX_ZONES
                )
                await self.async_update_zone_entities(mac, zone_slots)

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

        if new_state.state == STATE_UNAVAILABLE:
            # Device went offline — allow a fresh push when it comes back
            self._pushing.discard(mac)
            return

        if old_state.state != STATE_UNAVAILABLE:
            return

        # Device came online — push config once
        if mac not in self._pushing:
            self._pushing.add(mac)
            self._hass.async_create_task(self._on_device_available(mac))

    async def _on_device_available(self, mac: str) -> None:
        """Push stored config when a managed device comes online."""
        dev = self.devices.get(mac)
        if dev is not None:
            dev.available = True

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

    async def _push_config_to_device(self, mac: str) -> bool:
        """Push config to device, preferring an existing session connection."""
        config = self._store.get_device(mac)
        if config is None:
            return True
        dev = self.devices.get(mac)
        if dev is None or dev.host is None:
            return False

        # Prefer existing session connection (avoids ESP32 concurrent connection limit)
        session_conn = self.get_session(mac)
        if session_conn is not None:
            try:
                await session_conn.async_push_config(config)
                flags = await session_conn.async_fetch_build_flags()
                if flags:
                    self._build_flags[mac] = flags
                self._manage_log_subscription(session_conn, config)
                return True
            except Exception:
                _LOGGER.warning("Failed to push config to %s (%s) via session", dev.name, mac, exc_info=True)
                await self.async_close_session(mac)
                return False

        # No active session — use temporary connection (e.g., on-boot push)
        conn = DeviceConnection(dev.host)
        try:
            await conn.async_connect()
            await conn.async_push_config(config)
            flags = await conn.async_fetch_build_flags()
            if flags:
                self._build_flags[mac] = flags
            return True
        except Exception:
            _LOGGER.warning("Failed to push config to %s (%s)", dev.name, mac, exc_info=True)
            return False
        finally:
            await conn.async_disconnect()

    async def async_open_session(self, mac: str) -> DeviceConnection | None:
        """Open a persistent connection for a frontend session.
        Returns the connection, or None if the device is not available."""
        dev = self.devices.get(mac)
        if dev is None or dev.host is None:
            return None
        lock = self._session_locks.setdefault(mac, asyncio.Lock())
        async with lock:
            if mac in self._active_connections:
                conn = self._active_connections[mac]
                if conn.connected:
                    return conn
                # Stale connection — clean up
                await conn.async_disconnect()
            conn = DeviceConnection(dev.host)
            await conn.async_connect()
            self._active_connections[mac] = conn
            _LOGGER.info("Opened session for %s (%s)", dev.name, mac)
            # Subscribe to device logs if log levels are configured
            config = self._store.get_device(mac)
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

    def get_session(self, mac: str) -> DeviceConnection | None:
        """Get the active session connection for a device, or None."""
        conn = self._active_connections.get(mac)
        if conn is not None and conn.connected:
            return conn
        return None

    def list_devices(self) -> list[dict[str, Any]]:
        """Return serializable list of managed devices for the frontend."""
        result = []
        for mac, dev in self.devices.items():
            config = self._store.get_device(mac)
            proto = self.read_config_protocol(dev.device_id)
            result.append(
                {
                    "mac": mac,
                    "name": config.get("name", dev.name) if config else dev.name,
                    "host": dev.host,
                    "available": dev.available,
                    "configured": config is not None,
                    "config_protocol_status": (
                        "unavailable"
                        if proto is None
                        else "compatible"
                        if proto == CONFIG_PROTOCOL_VERSION
                        else "firmware_behind"
                        if proto < CONFIG_PROTOCOL_VERSION
                        else "firmware_ahead"
                    ),
                    "current_connection_count": self.read_current_connection_count(dev.device_id),
                    **self._build_flags.get(mac, {}),
                }
            )
        return result

    async def async_update_zone_entities(self, mac: str, zone_slots: list[dict[str, Any] | None]) -> None:
        """Enable/disable and rename ESPHome zone occupancy entities for a device."""
        dev = self.devices.get(mac)
        if dev is None or dev.device_id is None:
            return

        ent_reg = er.async_get(self._hass)
        config = self._store.get_device(mac)
        is_calibrated = config is not None and "calibration" in config

        _LOGGER.debug("Updating zone entities for %s (calibrated=%s)", mac, is_calibrated)

        for i in range(MAX_ZONES + 1):  # zones 0-7
            entity_id = self._find_zone_entity(ent_reg, dev.device_id, i)
            _LOGGER.debug("Zone %d: entity_id=%s", i, entity_id)
            if entity_id is None:
                continue

            if i == 0:
                # Zone 0 "rest of room" — enable if calibrated, but don't
                # re-enable if already disabled by integration or user (settings
                # may have explicitly disabled zone_presence).  When enabling
                # from settings, _apply_entity_states clears disabled_by first.
                entry_obj = ent_reg.async_get(entity_id)
                already_disabled = entry_obj and entry_obj.disabled_by is not None
                if is_calibrated and not already_disabled:
                    ent_reg.async_update_entity(entity_id, disabled_by=None, name="Rest of Room Occupancy")
                elif not is_calibrated:
                    ent_reg.async_update_entity(entity_id, disabled_by=er.RegistryEntryDisabler.INTEGRATION)
            elif i <= len(zone_slots) and zone_slots[i - 1] is not None:
                # Named zone — enable and rename (same guard as zone 0)
                entry_obj = ent_reg.async_get(entity_id)
                already_disabled = entry_obj and entry_obj.disabled_by is not None
                if not already_disabled:
                    zone = zone_slots[i - 1]
                    ent_reg.async_update_entity(entity_id, disabled_by=None, name=zone["name"])
            else:
                # Unused zone — disable
                ent_reg.async_update_entity(entity_id, disabled_by=er.RegistryEntryDisabler.INTEGRATION)

    def _find_zone_entity(self, ent_reg: er.EntityRegistry, device_id: str, zone_index: int) -> str | None:
        """Find the ESPHome zone occupancy entity_id for a device and zone index."""
        for entry in ent_reg.entities.values():
            if (
                entry.device_id == device_id
                and entry.platform == "esphome"
                and f"zone_{zone_index}_occupancy" in entry.unique_id
            ):
                return entry.entity_id
        return None


def _extract_mac(device: dr.DeviceEntry) -> str | None:
    """Extract MAC address from device connections, normalised to uppercase."""
    for conn_type, conn_id in device.connections:
        if conn_type == "mac":
            return conn_id.upper()
    return None


def _extract_host(device: dr.DeviceEntry, config_entry_id: str | None, hass: HomeAssistant) -> str | None:
    """Try to extract the host/IP from the ESPHome config entry."""
    if config_entry_id is None:
        return None
    entry = hass.config_entries.async_get_entry(config_entry_id)
    if entry is None:
        return None
    return entry.data.get("host")
