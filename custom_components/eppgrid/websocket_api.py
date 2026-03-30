"""WebSocket API for EPP Grid frontend."""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.core import callback
from homeassistant.helpers import entity_registry as er

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

_REGISTERED: set[str] = set()


def async_register_websocket_commands(hass: HomeAssistant, manager: Any) -> None:
    """Register WebSocket commands."""
    if DOMAIN in _REGISTERED:
        return
    _REGISTERED.add(DOMAIN)

    websocket_api.async_register_command(hass, websocket_list_devices)
    websocket_api.async_register_command(hass, websocket_get_config)
    websocket_api.async_register_command(hass, websocket_set_setup)
    websocket_api.async_register_command(hass, websocket_set_room_layout)
    websocket_api.async_register_command(hass, websocket_list_templates)
    websocket_api.async_register_command(hass, websocket_save_template)
    websocket_api.async_register_command(hass, websocket_delete_template)
    websocket_api.async_register_command(hass, websocket_apply_template)
    websocket_api.async_register_command(hass, websocket_subscribe_device)
    websocket_api.async_register_command(hass, websocket_subscribe_grid_targets)
    websocket_api.async_register_command(hass, websocket_subscribe_raw_targets)
    websocket_api.async_register_command(hass, websocket_set_entity_enabled)
    websocket_api.async_register_command(hass, websocket_set_settings)
    websocket_api.async_register_command(hass, websocket_set_detection_preview)
    websocket_api.async_register_command(hass, websocket_set_pipeline)
    websocket_api.async_register_command(hass, websocket_update_firmware)


def _get_manager(hass: HomeAssistant) -> Any:
    """Get the device manager."""
    return hass.data.get(DOMAIN)


def _check_protocol(manager: Any, mac: str) -> str | None:
    """Check config protocol compatibility. Returns error code or None if OK."""
    from .const import CONFIG_PROTOCOL_VERSION

    dev = manager.devices.get(mac)
    if dev is None:
        return None  # Unknown device — let the command handle it
    proto = manager.read_config_protocol(dev.device_id)
    if proto is None:
        return "unavailable"
    if proto < CONFIG_PROTOCOL_VERSION:
        return "firmware_behind"
    if proto > CONFIG_PROTOCOL_VERSION:
        return "firmware_ahead"
    return None


# -- list_devices --


@websocket_api.websocket_command({vol.Required("type"): "eppgrid/list_devices"})
@callback
def websocket_list_devices(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """List discovered EPP devices."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    connection.send_result(msg["id"], {"devices": manager.list_devices()})


# -- get_config --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/get_config",
        vol.Required("mac"): str,
    }
)
@callback
def websocket_get_config(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Get stored config for a device."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    config = manager._store.get_device(msg["mac"])
    # Return a shallow copy to avoid mutating the stored config
    response = dict(config) if config else {}
    response["entities"] = _get_entity_states(hass, msg["mac"])
    connection.send_result(msg["id"], {"config": response})


# -- set_setup (perspective calibration) --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/set_setup",
        vol.Required("mac"): str,
        vol.Required("perspective"): vol.All([vol.Coerce(float)], vol.Length(min=8, max=8)),
        vol.Required("room_width"): vol.Coerce(float),
        vol.Required("room_depth"): vol.Coerce(float),
    }
)
@websocket_api.async_response
async def websocket_set_setup(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save perspective calibration for a device."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    proto_err = _check_protocol(manager, msg["mac"])
    if proto_err:
        connection.send_error(
            msg["id"],
            proto_err,
            "Firmware update required" if proto_err == "firmware_behind" else "Integration update required",
        )
        return
    mac = msg["mac"]
    device_config = manager._store.devices.setdefault(mac, {})
    device_config["calibration"] = {
        "perspective": msg["perspective"],
        "room_width": msg["room_width"],
        "room_depth": msg["room_depth"],
    }
    # Clear room layout when calibration changes (grid dimensions may differ)
    device_config.pop("room_layout", None)
    await manager._store.async_save()

    # Push calibration to device
    await manager._push_config_to_device(mac)

    # Enable zone 0 now that device is calibrated
    from .const import MAX_ZONES

    zone_slots = device_config.get("room_layout", {}).get("zone_slots", [None] * MAX_ZONES)
    await manager.async_update_zone_entities(mac, zone_slots)

    connection.send_result(msg["id"])


# -- set_room_layout --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/set_room_layout",
        vol.Required("mac"): str,
        vol.Required("grid_bytes"): [int],
        vol.Required("zone_slots"): list,
        vol.Required("room_type"): str,
        vol.Optional("room_trigger"): vol.Coerce(int),
        vol.Optional("room_renew"): vol.Coerce(int),
        vol.Optional("room_timeout"): vol.Coerce(float),
        vol.Optional("room_handoff_timeout"): vol.Coerce(float),
        vol.Optional("room_entry_point", default=False): bool,
        vol.Optional("furniture", default=[]): list,
    }
)
@websocket_api.async_response
async def websocket_set_room_layout(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save room layout, zones, and furniture for a device."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    proto_err = _check_protocol(manager, msg["mac"])
    if proto_err:
        connection.send_error(
            msg["id"],
            proto_err,
            "Firmware update required" if proto_err == "firmware_behind" else "Integration update required",
        )
        return
    mac = msg["mac"]
    device_config = manager._store.devices.setdefault(mac, {})
    device_config["room_layout"] = {
        "grid_bytes": msg["grid_bytes"],
        "zone_slots": msg["zone_slots"],
        "room_type": msg["room_type"],
        "room_trigger": msg.get("room_trigger"),
        "room_renew": msg.get("room_renew"),
        "room_timeout": msg.get("room_timeout"),
        "room_handoff_timeout": msg.get("room_handoff_timeout"),
        "room_entry_point": msg.get("room_entry_point", False),
        "furniture": msg.get("furniture", []),
    }
    await manager._store.async_save()

    # Push config to device if connected
    dev = manager.devices.get(mac)
    if dev and dev.host:
        await manager._push_config_to_device(mac)

    # Update ESPHome entity enable/disable/rename
    await manager.async_update_zone_entities(mac, msg["zone_slots"])

    connection.send_result(msg["id"])


# -- Template commands --


@websocket_api.websocket_command({vol.Required("type"): "eppgrid/list_templates"})
@callback
def websocket_list_templates(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """List saved room templates."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    connection.send_result(msg["id"], {"templates": manager._store.templates})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/save_template",
        vol.Required("name"): str,
        vol.Required("template"): dict,
    }
)
@websocket_api.async_response
async def websocket_save_template(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save a room template."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    manager._store.templates[msg["name"]] = msg["template"]
    await manager._store.async_save()
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/delete_template",
        vol.Required("name"): str,
    }
)
@websocket_api.async_response
async def websocket_delete_template(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a room template."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    manager._store.templates.pop(msg["name"], None)
    await manager._store.async_save()
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/apply_template",
        vol.Required("mac"): str,
        vol.Required("template_name"): str,
    }
)
@websocket_api.async_response
async def websocket_apply_template(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Apply a template to a device."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    template = manager._store.templates.get(msg["template_name"])
    if template is None:
        connection.send_error(msg["id"], "not_found", "Template not found")
        return
    device_config = manager._store.devices.setdefault(msg["mac"], {})
    device_config["room_layout"] = dict(template)
    await manager._store.async_save()
    connection.send_result(msg["id"])


# -- Helper --


# Map ESPHome entity object_ids to frontend entity keys.
# unique_id format: {MAC}-{platform}-{object_id}
# Single object_ids map 1:1; prefix patterns (ending with _) match multiple
# entities (e.g. zone_0_occupancy, zone_1_occupancy, ...).
_ENTITY_OBJECT_ID_MAP: dict[str, str] = {
    "occupancy": "room_occupancy",
    "static_presence": "room_static_presence",
    "motion_presence": "room_motion_presence",
    "tracking_presence": "room_target_presence",  # ESPHome name; renamed to "Target Presence" in registry
    "temperature": "env_temperature",
    "humidity": "env_humidity",
    "illuminance": "env_illuminance",
}

# Prefix patterns: object_ids starting with these prefixes map to a category key.
_ENTITY_PREFIX_MAP: list[tuple[str, str]] = [
    ("zone_", "_occupancy", "zone_presence"),   # zone_0_occupancy, zone_1_occupancy, ...
    ("target_", "_position", "target_xy"),      # target_0_position, target_1_position, ...
]


def _object_id_from_unique_id(unique_id: str) -> str:
    """Extract the object_id from an ESPHome unique_id (after last '-')."""
    return unique_id.rsplit("-", 1)[-1] if "-" in unique_id else unique_id


def _entity_key_for_object_id(object_id: str) -> str | None:
    """Map an ESPHome object_id to its frontend entity key, or None.

    Handles both formats:
    - Extracted object_id (hyphen format): "zone_0_occupancy"
    - Full unique_id (underscore format): "esphome_aabbccddeeff_zone_0_occupancy"
    """
    # Exact match — works for extracted object_ids (hyphen format)
    if object_id in _ENTITY_OBJECT_ID_MAP:
        return _ENTITY_OBJECT_ID_MAP[object_id]
    for prefix, suffix, key in _ENTITY_PREFIX_MAP:
        if object_id.startswith(prefix) and object_id.endswith(suffix):
            return key
    # Fallback: substring match for full unique_ids (underscore format).
    # Check prefix patterns first (more specific) to avoid e.g. zone_0_occupancy
    # matching the "occupancy" → "room_occupancy" suffix rule.
    for prefix, suffix, key in _ENTITY_PREFIX_MAP:
        if f"_{prefix}" in object_id and object_id.endswith(suffix):
            return key
    for oid, key in _ENTITY_OBJECT_ID_MAP.items():
        if object_id.endswith(f"_{oid}"):
            return key
    return None


def _get_entity_states(hass: HomeAssistant, mac: str) -> dict[str, bool]:
    """Read entity enabled/disabled states from HA entity registry."""
    manager = _get_manager(hass)
    if manager is None:
        return {}
    dev = manager.devices.get(mac)
    if dev is None or dev.device_id is None:
        return {}
    ent_reg = er.async_get(hass)
    entries = er.async_entries_for_device(ent_reg, dev.device_id, include_disabled_entities=True)

    result: dict[str, bool] = {}
    for entry in entries:
        object_id = _object_id_from_unique_id(entry.unique_id)
        key = _entity_key_for_object_id(object_id)
        if key is None:
            continue
        enabled = entry.disabled_by is None
        # For category keys (zone_presence, target_xy), any enabled = category enabled.
        if key in result:
            result[key] = result[key] or enabled
        else:
            result[key] = enabled
    return result


# Rename ESPHome entities to user-friendly names in the HA entity registry.
_ENTITY_RENAME_MAP: dict[str, str] = {
    "room_target_presence": "Target Presence",
}


def _apply_entity_states(hass: HomeAssistant, mac: str, entities: dict[str, bool]) -> None:
    """Apply entity enable/disable changes to HA entity registry (idempotent)."""
    manager = _get_manager(hass)
    if manager is None:
        return
    dev = manager.devices.get(mac)
    if dev is None or dev.device_id is None:
        return
    ent_reg = er.async_get(hass)
    entries = er.async_entries_for_device(ent_reg, dev.device_id, include_disabled_entities=True)

    for entry in entries:
        object_id = _object_id_from_unique_id(entry.unique_id)
        key = _entity_key_for_object_id(object_id)
        if key is None or key not in entities:
            continue
        desired = entities[key]
        name = _ENTITY_RENAME_MAP.get(key)
        if desired:
            ent_reg.async_update_entity(entry.entity_id, disabled_by=None, **({"name": name} if name else {}))
        else:
            ent_reg.async_update_entity(
                entry.entity_id, disabled_by=er.RegistryEntryDisabler.INTEGRATION
            )


def _build_entity_key_map(entities: list) -> dict[str, int]:
    """Map entity names to their numeric state keys."""
    key_map = {}
    for entity in entities:
        if hasattr(entity, "key") and hasattr(entity, "name"):
            key_map[entity.name] = entity.key
    return key_map


# -- subscribe_device (session lifecycle) --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/subscribe_device",
        vol.Required("mac"): str,
    }
)
@websocket_api.async_response
async def websocket_subscribe_device(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Open a session connection for a device. Closes on unsubscribe."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    mac = msg["mac"]
    try:
        device_conn = await manager.async_open_session(mac)
    except Exception:
        _LOGGER.warning("Failed to open session for %s", mac, exc_info=True)
        connection.send_error(msg["id"], "connection_failed", "Failed to connect to device")
        return
    if device_conn is None:
        connection.send_error(msg["id"], "not_found", "Device not available")
        return
    connection.send_result(msg["id"])

    @callback
    def _unsub() -> None:
        hass.async_create_task(manager.async_close_session(mac))

    connection.subscriptions[msg["id"]] = _unsub


# -- subscribe_raw_targets --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/subscribe_raw_targets",
        vol.Required("mac"): str,
    }
)
@websocket_api.async_response
async def websocket_subscribe_raw_targets(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Stream raw target positions from the device session."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return

    mac = msg["mac"]
    device_conn = manager.get_session(mac)
    if device_conn is None:
        connection.send_error(msg["id"], "no_session", "No active session — call subscribe_device first")
        return

    key_map = _build_entity_key_map(device_conn._entities)

    # Map raw target sensor keys to indices
    raw_keys = {}
    for i in range(3):
        name = f"Raw Target {i}"
        if name in key_map:
            raw_keys[key_map[name]] = i

    # Accumulated state
    raw_targets = [{"raw_x": None, "raw_y": None} for _ in range(3)]

    @callback
    def _on_state(state: Any) -> None:
        from aioesphomeapi import TextSensorState

        if not isinstance(state, TextSensorState):
            return
        if state.key not in raw_keys:
            return
        idx = raw_keys[state.key]
        if state.state:
            parts = state.state.split(",")
            raw_targets[idx] = {"raw_x": float(parts[0]), "raw_y": float(parts[1])}
        else:
            raw_targets[idx] = {"raw_x": None, "raw_y": None}
        connection.send_message(websocket_api.event_message(msg["id"], {"targets": list(raw_targets)}))

    device_conn.subscribe_states(_on_state)
    connection.send_result(msg["id"])

    @callback
    def _unsub() -> None:
        device_conn.unsubscribe_states(_on_state)

    connection.subscriptions[msg["id"]] = _unsub


# -- subscribe_grid_targets --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/subscribe_grid_targets",
        vol.Required("mac"): str,
    }
)
@websocket_api.async_response
async def websocket_subscribe_grid_targets(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Stream target positions, zone state, and sensor data from the device session."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return

    mac = msg["mac"]
    device_conn = manager.get_session(mac)
    if device_conn is None:
        connection.send_error(msg["id"], "no_session", "No active session — call subscribe_device first")
        return

    key_map = _build_entity_key_map(device_conn._entities)

    # Map target position sensor keys to indices
    target_keys = {}
    for i in range(3):
        name = f"Target {i} Position"
        if name in key_map:
            target_keys[key_map[name]] = i

    # Zone state text sensor key
    zone_state_key = key_map.get("Zone State")

    # Binary sensor keys for sensors dict
    binary_sensor_keys = {}
    for name, field in (
        ("Occupancy", "occupancy"),
        ("Static Presence", "static_presence"),
        ("Motion Presence", "motion_presence"),
        ("Zone Tracking", "target_presence"),
    ):
        if name in key_map:
            binary_sensor_keys[key_map[name]] = field

    # Numeric sensor keys for environmental data
    numeric_sensor_keys = {}
    for name, field in (
        ("Temperature", "temperature"),
        ("Humidity", "humidity"),
        ("Illuminance", "illuminance"),
    ):
        if name in key_map:
            numeric_sensor_keys[key_map[name]] = field

    # Accumulated state
    targets = [{"x": None, "y": None, "signal": 0, "status": "inactive"} for _ in range(3)]
    sensors: dict[str, Any] = {
        "occupancy": False,
        "static_presence": False,
        "motion_presence": False,
        "target_presence": False,
        "temperature": None,
        "humidity": None,
        "illuminance": None,
        "co2": None,
    }
    zones: dict[str, Any] = {"occupancy": {}, "target_counts": {}, "frame_count": 0}

    @callback
    def _on_state(state: Any) -> None:
        import json as json_mod

        from aioesphomeapi import BinarySensorState
        from aioesphomeapi import SensorState
        from aioesphomeapi import TextSensorState

        if isinstance(state, TextSensorState):
            if state.key in target_keys:
                idx = target_keys[state.key]
                if state.state:
                    parts = state.state.split(",")
                    targets[idx]["x"] = float(parts[0])
                    targets[idx]["y"] = float(parts[1])
                    # Status comes from position text sensor (active/pending)
                    if len(parts) >= 3:
                        targets[idx]["status"] = parts[2]
                else:
                    targets[idx] = {"x": None, "y": None, "signal": 0, "status": "inactive"}
                # Send full event on each position update (5Hz)
                connection.send_message(
                    websocket_api.event_message(
                        msg["id"],
                        {
                            "targets": list(targets),
                            "sensors": dict(sensors),
                            "zones": dict(zones),
                        },
                    )
                )
            elif zone_state_key is not None and state.key == zone_state_key and state.state:
                # Parse zone state JSON (1Hz)
                try:
                    zs = json_mod.loads(state.state)
                    # Update target signal/status
                    for i, t in enumerate(zs.get("targets", [])):
                        if i < 3:
                            targets[i]["signal"] = t.get("signal", 0)
                            targets[i]["status"] = t.get("status", "inactive")
                    # Update zone data
                    zone_occ = zs.get("zones", {}).get("occupancy", [])
                    zones["occupancy"] = {str(i): v for i, v in enumerate(zone_occ)}
                    zones["frame_count"] = zs.get("frame_count", 0)
                    debug_log = zs.get("debug_log")
                    if debug_log:
                        zones["debug_log"] = debug_log
                    sensors["target_presence"] = zs.get("zones", {}).get("tracking", False)
                    # Parse sensor presence states from firmware
                    static_state = zs.get("static_state")
                    if static_state is not None:
                        sensors["static_state"] = static_state
                    motion_state = zs.get("motion_state")
                    if motion_state is not None:
                        sensors["motion_state"] = motion_state
                    fw_occupancy = zs.get("occupancy")
                    if fw_occupancy is not None:
                        sensors["occupancy_state"] = fw_occupancy
                    # Send event on zone state update (not just target position updates)
                    # so sensor state changes appear in the log without delay
                    connection.send_message(
                        websocket_api.event_message(
                            msg["id"],
                            {
                                "targets": list(targets),
                                "sensors": dict(sensors),
                                "zones": dict(zones),
                            },
                        )
                    )
                except (ValueError, KeyError):
                    pass

        elif isinstance(state, BinarySensorState):
            if state.key in binary_sensor_keys:
                sensors[binary_sensor_keys[state.key]] = state.state

        elif isinstance(state, SensorState) and state.key in numeric_sensor_keys:
            import math

            field = numeric_sensor_keys[state.key]
            sensors[field] = None if math.isnan(state.state) else state.state

    device_conn.subscribe_states(_on_state)
    connection.send_result(msg["id"])

    @callback
    def _unsub() -> None:
        device_conn.unsubscribe_states(_on_state)

    connection.subscriptions[msg["id"]] = _unsub


# -- set_entity_enabled --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/set_entity_enabled",
        vol.Required("mac"): str,
        vol.Required("entity_id"): str,
        vol.Required("enabled"): bool,
    }
)
@callback
def websocket_set_entity_enabled(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Enable or disable an ESPHome entity on a managed device."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    proto_err = _check_protocol(manager, msg["mac"])
    if proto_err:
        connection.send_error(
            msg["id"],
            proto_err,
            "Firmware update required" if proto_err == "firmware_behind" else "Integration update required",
        )
        return
    ent_reg = er.async_get(hass)
    if msg["enabled"]:
        ent_reg.async_update_entity(msg["entity_id"], disabled_by=None)
    else:
        ent_reg.async_update_entity(msg["entity_id"], disabled_by=er.RegistryEntryDisabler.INTEGRATION)
    connection.send_result(msg["id"])


# -- set_settings (unified settings command) --

_SETTINGS_KEYS = (
    "temperature_offset",
    "humidity_offset",
    "illuminance_offset",
    "motion_timeout",
    "target_auto_distance",
    "target_max_distance",
    "static_auto_distance",
    "static_min_distance",
    "static_max_distance",
    "static_trigger_threshold",
    "static_renew_threshold",
    "static_timeout",
    "static_on_delay",
)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/set_settings",
        vol.Required("mac"): str,
        vol.Required("temperature_offset"): vol.Coerce(float),
        vol.Required("humidity_offset"): vol.Coerce(float),
        vol.Required("illuminance_offset"): vol.Coerce(float),
        vol.Required("motion_timeout"): vol.Coerce(float),
        vol.Required("target_auto_distance"): bool,
        vol.Required("target_max_distance"): vol.Coerce(float),
        vol.Required("static_auto_distance"): bool,
        vol.Required("static_min_distance"): vol.Coerce(float),
        vol.Required("static_max_distance"): vol.Coerce(float),
        vol.Required("static_trigger_threshold"): vol.Coerce(int),
        vol.Required("static_renew_threshold"): vol.Coerce(int),
        vol.Required("static_timeout"): vol.Coerce(float),
        vol.Required("static_on_delay"): vol.Coerce(float),
        vol.Optional("entities"): {str: bool},
    }
)
@websocket_api.async_response
async def websocket_set_settings(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save all device settings in one call."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    proto_err = _check_protocol(manager, msg["mac"])
    if proto_err:
        connection.send_error(
            msg["id"],
            proto_err,
            "Firmware update required" if proto_err == "firmware_behind" else "Integration update required",
        )
        return
    mac = msg["mac"]
    device_config = manager._store.devices.setdefault(mac, {})
    device_config["settings"] = {k: msg[k] for k in _SETTINGS_KEYS}
    await manager._store.async_save()
    await manager._push_config_to_device(mac)
    entities = msg.get("entities")
    if entities:
        _apply_entity_states(hass, mac, entities)
        # Zone presence needs layout-aware handling: enable zone_0 + named zones
        if "zone_presence" in entities and entities["zone_presence"]:
            # Enable zone entities with layout-aware naming
            layout = device_config.get("room_layout", {})
            from .const import MAX_ZONES

            zone_slots = layout.get("zone_slots", [None] * MAX_ZONES)
            await manager.async_update_zone_entities(mac, zone_slots)
            # When zone_presence is false, _apply_entity_states already
            # disabled all zone entities — don't call async_update_zone_entities
            # which would re-enable zone_0 for calibrated devices.
    connection.send_result(msg["id"])


# -- set_detection_preview (live range preview, no persist) --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/set_detection_preview",
        vol.Required("mac"): str,
        vol.Required("target_max_distance"): vol.Coerce(float),
        vol.Required("static_min_distance"): vol.Coerce(float),
        vol.Required("static_max_distance"): vol.Coerce(float),
    }
)
@websocket_api.async_response
async def websocket_set_detection_preview(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Push detection distance preview to device without persisting."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    mac = msg["mac"]
    session = manager.get_session(mac)
    if session is None:
        connection.send_result(msg["id"])
        return
    # Merge preview distances with stored non-distance settings
    device_config = manager._store.devices.get(mac, {})
    stored_settings = device_config.get("settings", {})
    preview = {
        "target_max_distance": msg["target_max_distance"],
        "static_min_distance": msg["static_min_distance"],
        "static_max_distance": msg["static_max_distance"],
        "static_trigger_threshold": stored_settings.get("static_trigger_threshold", 3),
        "static_renew_threshold": stored_settings.get("static_renew_threshold", 3),
        "static_timeout": stored_settings.get("static_timeout", 30.0),
        "static_on_delay": stored_settings.get("static_on_delay", 0.0),
    }
    await session.async_push_detection_preview(preview)
    connection.send_result(msg["id"])


# -- set_pipeline --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/set_pipeline",
        vol.Required("mac"): str,
        vol.Required("display_interval_ms"): vol.All(vol.Coerce(int), vol.Range(min=50, max=1000)),
        vol.Required("zone_publish_interval_ms"): vol.All(vol.Coerce(int), vol.Range(min=100, max=2000)),
        vol.Required("window_duration_ms"): vol.All(vol.Coerce(int), vol.Range(min=200, max=2000)),
    }
)
@websocket_api.async_response
async def websocket_set_pipeline(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save pipeline settings."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    proto_err = _check_protocol(manager, msg["mac"])
    if proto_err:
        connection.send_error(
            msg["id"],
            proto_err,
            "Firmware update required" if proto_err == "firmware_behind" else "Integration update required",
        )
        return
    mac = msg["mac"]
    device_config = manager._store.devices.setdefault(mac, {})
    device_config["pipeline"] = {
        "display_interval": msg["display_interval_ms"],
        "zone_publish_interval": msg["zone_publish_interval_ms"],
        "window_duration": msg["window_duration_ms"],
    }
    await manager._store.async_save()
    await manager._push_config_to_device(mac)
    connection.send_result(msg["id"])


# -- update_firmware (trigger OTA) --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/update_firmware",
        vol.Required("mac"): str,
    }
)
@websocket_api.async_response
async def websocket_update_firmware(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Trigger firmware OTA update for a device."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return

    mac = msg["mac"]
    dev = manager.devices.get(mac)
    if dev is None or dev.device_id is None:
        connection.send_error(msg["id"], "not_found", "Device not found")
        return

    # Find the update entity for this device
    ent_reg = er.async_get(hass)
    update_entity_id = None
    for entry in ent_reg.entities.values():
        if entry.device_id == dev.device_id and entry.platform == "esphome" and entry.domain == "update":
            update_entity_id = entry.entity_id
            break

    if update_entity_id is None:
        connection.send_error(msg["id"], "no_update_entity", "No update entity found for device")
        return

    try:
        await hass.services.async_call(
            "update",
            "install",
            {"entity_id": update_entity_id},
            blocking=True,
            context=connection.context,
        )
        connection.send_result(msg["id"])
    except Exception as err:
        connection.send_error(msg["id"], "update_failed", str(err))
