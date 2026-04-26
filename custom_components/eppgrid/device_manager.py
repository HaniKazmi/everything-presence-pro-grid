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
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.const import STATE_UNKNOWN
from homeassistant.core import HomeAssistant
from homeassistant.core import State
from homeassistant.core import callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .const import DEFAULT_PORT
from .const import DOMAIN
from .const import EMPTY_ZONE_SLOTS
from .const import EPP_MANUFACTURER
from .const import EPP_MODEL
from .const import GRID_CELL_SIZE_MM
from .const import GRID_COLS
from .const import MAX_ZONES
from .const import NUM_ZONE_SLOTS
from .storage import EPPGridStore

_LOGGER = logging.getLogger(__name__)
_DEVICE_LOGGER = logging.getLogger(f"{__name__}.device_logs")

# Mirror of frontend ZONE_TYPE_DEFAULTS — test_zone_type_defaults_match_frontend
# asserts the two agree. Non-custom zones store only `type`; the backend
# expands via _expand_zone_slot on push so firmware always receives full timing.
ZONE_TYPE_DEFAULTS: dict[str, dict[str, float]] = {
    "default": {"trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
    "bed": {"trigger": 8, "renew": 2, "timeout": 600.0, "handoff_timeout": 10.0},
    "seating": {"trigger": 7, "renew": 1, "timeout": 30.0, "handoff_timeout": 10.0},
    "transit": {"trigger": 3, "renew": 2, "timeout": 3.0, "handoff_timeout": 1.0},
}


def is_valid_zone_slots_shape(value: Any) -> bool:
    """Length-8 list with a dict at index 0 (zone 0) — matches the websocket
    validator. Inner shape guards (push, entity update) share this one rule
    so they can't drift.
    """
    return isinstance(value, list) and len(value) == NUM_ZONE_SLOTS and isinstance(value[0], dict)


def _expand_zone_slot(slot: dict[str, Any]) -> dict[str, Any]:
    """Expand to full timing for firmware push. Returns a copy.

    Custom: user-supplied timing is authoritative.
    Non-custom: ZONE_TYPE_DEFAULTS always wins (stored timing is overwritten,
    not defaulted — keeps the defaults-table the single source of truth).
    """
    if slot.get("type") == "custom":
        return dict(slot)
    defaults = ZONE_TYPE_DEFAULTS.get(slot.get("type"), ZONE_TYPE_DEFAULTS["default"])
    expanded = dict(slot)
    expanded["trigger"] = defaults["trigger"]
    expanded["renew"] = defaults["renew"]
    expanded["timeout"] = defaults["timeout"]
    expanded["handoff_timeout"] = defaults["handoff_timeout"]
    return expanded


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


def _resolve_zone_name(
    language: str,
    *,
    index: int,
    zone_name: str | None,
    target_count: bool,
) -> str:
    """Build a translated zone entity name.

    Zone 0 = Rest of Room; zone >0 uses the user-provided name as a placeholder.
    `target_count=True` selects the '... Target Count' variant.
    Falls back to English when the requested language is absent.
    """
    from .zone_name_translations import ZONE_NAMES

    base_lang = language.split("-")[0]
    table = ZONE_NAMES.get(language) or ZONE_NAMES.get(base_lang) or ZONE_NAMES["en"]
    en = ZONE_NAMES["en"]
    if index == 0:
        key = "zone_rest_of_room_target_count" if target_count else "zone_rest_of_room"
        return table.get(key, en[key])
    # If the name already starts with the localized "Zone"/"Zona" prefix
    # (or the English default), strip it to avoid "Zone Zone 1".
    if zone_name:
        loc_prefix = table.get("zone_with_name", en["zone_with_name"]).split("{name}")[0].rstrip()
        en_prefix = en["zone_with_name"].split("{name}")[0].rstrip()
        for prefix in (loc_prefix, en_prefix):
            if zone_name.startswith(prefix + " "):
                zone_name = zone_name.removeprefix(prefix + " ")
                break

    key = "zone_with_name_target_count" if target_count else "zone_with_name"
    template = table.get(key, en[key])
    return template.replace("{name}", zone_name or "")


def _raise_service_unavailable(service: str) -> None:
    """Raise translation-keyed HomeAssistantError for a missing service."""
    raise HomeAssistantError(
        f"Service {service} not available",
        translation_domain=DOMAIN,
        translation_key="service_not_available",
        translation_placeholders={"service": service},
    )


def _compare_firmware_version(device_version: str) -> str:
    """Compare device firmware version against required version."""
    from packaging.version import Version

    from .const import FIRMWARE_VERSION

    try:
        dev_ver = Version(device_version)
        req_ver = Version(FIRMWARE_VERSION)
    except Exception:
        return "firmware_behind"
    if dev_ver == req_ver:
        return "compatible"
    if dev_ver < req_ver:
        return "firmware_behind"
    return "firmware_ahead"


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
        self._log_callbacks: list[Any] = []
        self._unsub_logs: Any = None
        self.connected: bool = False
        self.raw_target_subs: int = 0
        self.grid_target_subs: int = 0

    async def async_connect(self) -> None:
        """Connect to the device and cache available services."""
        if self.connected:
            return
        client = APIClient(self._host, self._port, "", noise_psk=self._noise_psk)

        async def _on_stop(expected_disconnect: bool) -> None:
            self._release_references()

        try:
            await client.connect(on_stop=_on_stop, login=True)
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
        self._release_references()

    def _release_references(self) -> None:
        """Release references to the (now-dead) APIClient without contacting it."""
        self.connected = False
        self._client = None
        self._services.clear()
        self._entities = []
        self._state_subscribers.clear()
        self._states_subscribed = False
        self._log_callbacks.clear()
        self._unsub_logs = None

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

    def add_log_callback(self, cb: Any) -> None:
        """Add a log callback. Receives raw log messages from the device."""
        self._log_callbacks.append(cb)

    def remove_log_callback(self, cb: Any) -> None:
        """Remove a log callback."""
        with contextlib.suppress(ValueError):
            self._log_callbacks.remove(cb)

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
            for cb in self._log_callbacks:
                cb(msg)

        self._unsub_logs = self._client.subscribe_logs(_on_log, log_level=log_level)
        _LOGGER.debug("Subscribed to device logs from %s (level=%s)", self._host, log_level)

    def unsubscribe_logs(self) -> None:
        """Stop receiving device log messages."""
        if self._unsub_logs is not None:
            self._unsub_logs()
            self._unsub_logs = None
            _LOGGER.debug("Unsubscribed from device logs from %s", self._host)

    async def async_fetch_build_flags(self, timeout: float = 2.0) -> dict[str, Any]:
        """Fetch build flags from device via get_build_flags action."""
        if self._client is None:
            return {}
        svc = self._services.get("get_build_flags")
        if svc is None:
            return {}
        try:
            resp = await asyncio.wait_for(
                self._client.execute_service(svc, {}, return_response=True),
                timeout=timeout,
            )
            if resp is None or not resp.response_data:
                return {}
            decoded = json.loads(resp.response_data)
            if not isinstance(decoded, dict):
                return {}
            return decoded
        except (json.JSONDecodeError, Exception):
            _LOGGER.debug("Failed to fetch build flags from %s", self._host)
            return {}

    async def async_push_distance_override(self, override: dict[str, Any]) -> None:
        """Push distance override to device without persisting."""
        if self._client is None:
            return
        svc = self._services.get("epp_set_tracking")
        if svc:
            await self._client.execute_service(
                svc,
                {"max_range": override.get("target_max_distance", 6.0) * 1000},
            )
        svc = self._services.get("epp_set_static_presence")
        if svc:
            await self._client.execute_service(
                svc,
                {
                    "min_range": override.get("static_min_distance", 0.3),
                    "max_range": override.get("static_max_distance", 16.0),
                    "trigger_range": override.get("static_max_distance", 16.0),
                    "trigger_sensitivity": 10 - override.get("static_trigger_threshold", 3),
                    "sustain_sensitivity": 10 - override.get("static_renew_threshold", 3),
                    "timeout": override.get("static_timeout", 30.0),
                    "on_delay": override.get("static_on_delay", 0.0),
                    "led_enabled": True,
                },
            )

    async def async_dismiss_target(self, target_index: int, cell_index: int) -> None:
        """Send dismiss target command to firmware."""
        service = self._services.get("epp_dismiss_target")
        if not service or not self._client:
            _raise_service_unavailable("epp_dismiss_target")
        await self._client.execute_service(service, {"target_index": target_index, "cell_index": cell_index})

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

        zone_slots = layout.get("zone_slots")
        if zone_slots is not None:
            # Skip the zone push on malformed shape; other config pushes
            # (perspective/grid/settings) still run. Legacy 0.93.x storage
            # would trip this because it had length-7 zone_slots.
            if not is_valid_zone_slots_shape(zone_slots):
                length = len(zone_slots) if isinstance(zone_slots, list) else "N/A"
                slot0_type = type(zone_slots[0]).__name__ if isinstance(zone_slots, list) and zone_slots else "N/A"
                _LOGGER.warning(
                    "Skipping zone push — malformed zone_slots (length %s, slot 0 type %s)",
                    length,
                    slot0_type,
                )
            else:
                service = self._services.get("epp_set_zones")
                if service:
                    # Count named zones (1-7); zone 0 is always present at index 0 and
                    # isn't a "named" zone for logging purposes.
                    named = [s for s in zone_slots[1:] if s is not None]
                    # Expand non-custom slots to include type defaults — storage
                    # / wire stays lean, firmware sees a fully-populated record.
                    expanded_slots = [_expand_zone_slot(s) if s is not None else None for s in zone_slots]
                    zone_data = {"zone_slots": expanded_slots}
                    await self._client.execute_service(
                        service,
                        {
                            "zones_json": json.dumps(zone_data),
                        },
                    )
                    _LOGGER.info("Pushed %d zones to %s", len(named), self._host)

        # Push device settings from unified settings key
        settings = config.get("settings")
        if settings is not None:
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

            svc = self._services.get("epp_set_led")
            if svc:
                color_hex = settings.get("led_presence_color", "#CC33FF")
                await self._client.execute_service(
                    svc,
                    {
                        "mode": settings.get("led_mode", "Manual Control"),
                        "brightness": settings.get("led_brightness", 1.0),
                        "presence_red": int(color_hex[1:3], 16) / 255.0,
                        "presence_green": int(color_hex[3:5], 16) / 255.0,
                        "presence_blue": int(color_hex[5:7], 16) / 255.0,
                    },
                )
                _LOGGER.info("Pushed led to %s", self._host)

            svc = self._services.get("epp_set_relay")
            if svc:
                await self._client.execute_service(
                    svc,
                    {
                        "trigger_mode": settings.get("relay_trigger_mode", "disabled"),
                        "contact_mode": settings.get("relay_contact_mode", "no"),
                    },
                )
                _LOGGER.info("Pushed relay settings to %s", self._host)

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

    async def async_stop(self) -> None:
        """Stop listeners and close all connections."""
        for unsub in self._unsub_listeners:
            unsub()
        self._unsub_listeners.clear()
        for unsub in self._entry_update_unsubs.values():
            unsub()
        self._entry_update_unsubs.clear()
        for conn in self._active_connections.values():
            await conn.async_disconnect()
        self._active_connections.clear()

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
            if entry.platform == "esphome" and entry.domain == "sensor" and "firmware_version" in entry.unique_id:
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
            if "firmware_version" not in entry.unique_id:
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

            if is_new:
                found_new = True
                self._ensure_esphome_entry_listener(entry.config_entry_id)
                _LOGGER.info("Discovered zone engine device: %s (%s)", device.name, mac)
                # Always sync — the empty fallback resets stale entity registry
                # entries left behind by a device delete+readd.
                config = self._store.get_device(mac)
                zone_slots = config.get("room_layout", {}).get("zone_slots") if config else None
                await self.async_update_zone_entities(mac, zone_slots or EMPTY_ZONE_SLOTS)

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

        # Update (rename, area change, etc.) — notify subscribers so the
        # frontend re-fetches list_devices and picks up the fresh data.
        self._fire_device_list_changed()

    async def _on_device_removed(self, mac: str) -> None:
        """Clean up stored settings and runtime state for a removed device."""
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
        await self._store.async_save()
        self._fire_device_list_changed()
        _LOGGER.info("Cleaned up settings for removed device %s", mac)

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
        from .websocket_api import _compute_pipeline

        config = self._store.devices.get(mac, {})
        session = self.get_session(mac)
        raw_subs = session.raw_target_subs if session else 0
        grid_subs = session.grid_target_subs if session else 0

        pipeline = _compute_pipeline(config, raw_subs, grid_subs)

        # Push via session if available, otherwise skip (device will get it on next full push)
        if session is not None and session.connected:
            svc = session._services.get("epp_set_pipeline")
            if svc:
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
        config = self._store.get_device(mac)
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
            from .websocket_api import _compute_pipeline

            pipeline = _compute_pipeline(config, 0, 0)
            svc = conn._services.get("epp_set_pipeline")
            if svc:
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
        dev_reg = dr.async_get(self._hass)
        area_reg = ar.async_get(self._hass)
        result = []
        for mac, dev in self.devices.items():
            config = self._store.get_device(mac)
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
                    and "firmware_version" in ent_entry.unique_id
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

            # Check if an update is available via ESPHome update entity
            update_available = False
            for ent_entry in er.async_entries_for_device(ent_reg, device.id, include_disabled_entities=True):
                if ent_entry.domain == "update" and ent_entry.platform == "esphome":
                    state = self._hass.states.get(ent_entry.entity_id)
                    if state is not None and state.state == "on":
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
        config = self._store.get_device(mac) or {}
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
        pattern = f"zone_{zone_index}_{suffix}"
        for entry in ent_reg.entities.values():
            if entry.device_id == device_id and entry.platform == "esphome" and pattern in entry.unique_id:
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
