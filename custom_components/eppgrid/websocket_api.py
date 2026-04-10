"""WebSocket API for EPP Grid frontend."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.core import callback
from homeassistant.helpers import entity_registry as er

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

try:
    _INTEGRATION_VERSION: str = json.loads(Path(__file__).with_name("manifest.json").read_text())["version"]
except Exception:
    _INTEGRATION_VERSION: str = "unknown"

_REGISTERED: set[str] = set()


def async_register_websocket_commands(hass: HomeAssistant, manager: Any) -> None:
    """Register WebSocket commands."""
    if DOMAIN in _REGISTERED:
        return
    _REGISTERED.add(DOMAIN)

    websocket_api.async_register_command(hass, websocket_subscribe_device_list)
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
    websocket_api.async_register_command(hass, websocket_set_distance_override)
    websocket_api.async_register_command(hass, websocket_set_pipeline)
    websocket_api.async_register_command(hass, websocket_update_firmware)
    websocket_api.async_register_command(hass, websocket_subscribe_ota_progress)
    websocket_api.async_register_command(hass, websocket_dismiss_target)
    websocket_api.async_register_command(hass, websocket_subscribe_flashable_devices)
    websocket_api.async_register_command(hass, websocket_list_flashable_devices)
    websocket_api.async_register_command(hass, websocket_delete_esphome_device)
    websocket_api.async_register_command(hass, websocket_add_esphome_device)


_TARGET_ENTITY_KEYS = ("target_xy", "target_active", "target_signal", "target_zone", "target_count")
_ZONE_ENTITY_KEYS = ("zone_presence", "zone_target_count")


def _compute_pipeline(
    config: dict[str, Any],
    raw_target_subs: int,
    grid_target_subs: int,
) -> dict[str, int]:
    """Derive all pipeline intervals from current settings and subscriber counts."""
    settings = config.get("settings", {})
    pipeline = config.get("pipeline", {})

    target_rate = settings.get("target_update_rate_ms", 1000)
    zone_rate = settings.get("zone_update_rate_ms", 1000)

    # Entity flags are stored flat in settings (e.g., settings["zone_presence"])
    any_target = any(settings.get(k) for k in _TARGET_ENTITY_KEYS)
    any_zone = any(settings.get(k) for k in _ZONE_ENTITY_KEYS)

    has_display_sub = raw_target_subs > 0 or grid_target_subs > 0

    return {
        "entity_target_interval": target_rate if any_target else 0,
        "entity_zone_interval": zone_rate if any_zone else 0,
        "display_interval": 200 if has_display_sub else 0,
        "zone_state_interval": 1000 if grid_target_subs > 0 else 0,
        "window_duration": pipeline.get("window_duration", 1000),
    }


def _get_manager(hass: HomeAssistant) -> Any:
    """Get the device manager."""
    return hass.data.get(DOMAIN)


def _check_firmware_version(manager: Any, mac: str) -> str | None:
    """Check firmware version compatibility. Returns error code or None if OK."""
    from .device_manager import _compare_firmware_version

    dev = manager.devices.get(mac)
    if dev is None:
        return None  # Unknown device — let the command handle it
    fw_ver = manager.read_firmware_version(dev.device_id)
    if fw_ver is None:
        return "unavailable"
    status = _compare_firmware_version(fw_ver)
    if status == "compatible":
        return None
    return status


# -- subscribe_device_list --


@websocket_api.websocket_command({vol.Required("type"): "eppgrid/subscribe_device_list"})
@callback
def websocket_subscribe_device_list(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Subscribe to device list changes. Sends initial list immediately."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return

    @callback
    def _send_update() -> None:
        connection.send_message(websocket_api.event_message(msg["id"], {"devices": manager.list_devices()}))

    unsub = manager.on_device_list_changed(_send_update)

    connection.send_result(msg["id"])
    _send_update()

    @callback
    def _unsub() -> None:
        unsub()

    connection.subscriptions[msg["id"]] = _unsub


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
    proto_err = _check_firmware_version(manager, msg["mac"])
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
    # Store zone_presence flag — true on calibration, false on delete
    settings = device_config.get("settings", {})
    settings["zone_presence"] = msg["room_width"] > 0
    # Disable target entities when calibration is deleted (user must opt-in after re-calibration)
    deleting = msg["room_width"] <= 0
    if deleting:
        settings["target_xy"] = False
    device_config["settings"] = settings
    await manager._store.async_save()

    # Push calibration to device
    push_ok = await manager._push_config_to_device(mac)

    # Apply entity registry changes after push, with reconnect guard
    if deleting:
        if push_ok:
            manager._entity_update_macs.add(mac)
            hass.loop.call_later(60, manager._entity_update_macs.discard, mac)
        _apply_entity_states(hass, mac, {"target_xy": False})

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
    proto_err = _check_firmware_version(manager, msg["mac"])
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
# entities (e.g. zone_0_presence, zone_1_presence, ...).
_ENTITY_OBJECT_ID_MAP: dict[str, str] = {
    "occupancy": "room_occupancy",
    "static_presence": "room_static_presence",
    "motion_presence": "room_motion_presence",
    "target_presence": "room_target_presence",
    "temperature": "env_temperature",
    "humidity": "env_humidity",
    "illuminance": "env_illuminance",
    "co2": "env_co2",
    "system_alarm_relay": "relay_output",
    "target_count": "target_count",
}

# Prefix patterns: object_ids starting with these prefixes map to a category key.
_ENTITY_PREFIX_MAP: list[tuple[str, str, str]] = [
    ("zone_", "_presence", "zone_presence"),
    ("zone_", "_target_count", "zone_target_count"),
    ("target_", "_x", "target_xy"),
    ("target_", "_y", "target_xy"),
    ("target_", "_signal", "target_signal"),
    ("target_", "_active", "target_active"),
    ("target_", "_zone", "target_zone"),
]


def _object_id_from_unique_id(unique_id: str) -> str:
    """Extract the object_id from an ESPHome unique_id (after last '-')."""
    return unique_id.rsplit("-", 1)[-1] if "-" in unique_id else unique_id


def _entity_key_for_object_id(object_id: str) -> str | None:
    """Map an ESPHome object_id to its frontend entity key, or None.

    Handles both formats:
    - Extracted object_id (hyphen format): "zone_0_presence"
    - Full unique_id (underscore format): "esphome_aabbccddeeff_zone_0_presence"
    """
    # Exact match — works for extracted object_ids (hyphen format)
    if object_id in _ENTITY_OBJECT_ID_MAP:
        return _ENTITY_OBJECT_ID_MAP[object_id]
    for prefix, suffix, key in _ENTITY_PREFIX_MAP:
        if object_id.startswith(prefix) and object_id.endswith(suffix):
            return key
    # Fallback: substring match for full unique_ids (underscore format).
    # Check prefix patterns first (more specific) to avoid e.g. zone_0_presence
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
        # Never overwrite entities the user has manually disabled
        if entry.disabled_by == er.RegistryEntryDisabler.USER:
            continue
        desired = entities[key]
        if desired:
            ent_reg.async_update_entity(entry.entity_id, disabled_by=None)
        else:
            ent_reg.async_update_entity(entry.entity_id, disabled_by=er.RegistryEntryDisabler.INTEGRATION)


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
    except Exception as err:
        _LOGGER.warning("Failed to open session for %s: %s", mac, err)
        manager._fire_device_list_changed()
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

    # Map raw target sensor keys to indices (display names are 1-based)
    raw_keys = {}
    for i in range(3):
        name = f"Raw Target {i + 1}"
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

    device_conn.raw_target_subs += 1
    if manager:
        hass.async_create_task(manager._push_pipeline_to_device(mac))

    @callback
    def _unsub() -> None:
        device_conn.unsubscribe_states(_on_state)
        device_conn.raw_target_subs -= 1
        mgr = _get_manager(hass)
        if mgr:
            hass.async_create_task(mgr._push_pipeline_to_device(mac))

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

    # Map target position sensor keys to indices (display names are 1-based)
    target_keys = {}
    for i in range(3):
        name = f"Target {i + 1} Position"
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

    device_conn.grid_target_subs += 1
    if manager:
        hass.async_create_task(manager._push_pipeline_to_device(mac))

    @callback
    def _unsub() -> None:
        device_conn.unsubscribe_states(_on_state)
        device_conn.grid_target_subs -= 1
        mgr = _get_manager(hass)
        if mgr:
            hass.async_create_task(mgr._push_pipeline_to_device(mac))

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
    proto_err = _check_firmware_version(manager, msg["mac"])
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
    "led_mode",
    "led_brightness",
    "led_presence_color",
    "relay_trigger_mode",
    "relay_contact_mode",
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
        vol.Required("led_mode"): vol.In(["Manual Control", "Presence", "Environmental", "Environmental + Presence"]),
        vol.Required("led_brightness"): vol.All(vol.Coerce(float), vol.Range(min=0.1, max=1.0)),
        vol.Required("led_presence_color"): vol.Match(r"^#[0-9A-Fa-f]{6}$"),
        vol.Required("relay_trigger_mode"): vol.In(["disabled", "motion", "presence", "occupancy"]),
        vol.Required("relay_contact_mode"): vol.In(["no", "nc"]),
        vol.Optional("entities"): {str: bool},
        vol.Optional("log_levels"): {str: vol.In(["None", "Error", "Warning", "Info", "Debug"])},
        vol.Optional("target_update_rate_ms"): vol.All(vol.Coerce(int), vol.In([200, 500, 1000, 2000])),
        vol.Optional("zone_update_rate_ms"): vol.All(vol.Coerce(int), vol.In([200, 500, 1000, 2000])),
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
    proto_err = _check_firmware_version(manager, msg["mac"])
    if proto_err:
        connection.send_error(
            msg["id"],
            proto_err,
            "Firmware update required" if proto_err == "firmware_behind" else "Integration update required",
        )
        return
    mac = msg["mac"]
    device_config = manager._store.devices.setdefault(mac, {})
    new_settings = {k: msg[k] for k in _SETTINGS_KEYS}
    # Preserve entity toggle and rate flags — they're managed by entity toggles,
    # not by the settings form payload.
    old_settings = device_config.get("settings", {})
    for key in (
        "zone_presence",
        "target_xy",
        "target_active",
        "target_signal",
        "target_zone",
        "zone_target_count",
        "target_count",
        "target_update_rate_ms",
        "zone_update_rate_ms",
    ):
        if key in old_settings:
            new_settings[key] = old_settings[key]
    device_config["settings"] = new_settings
    if "target_update_rate_ms" in msg:
        new_settings["target_update_rate_ms"] = msg["target_update_rate_ms"]
    if "zone_update_rate_ms" in msg:
        new_settings["zone_update_rate_ms"] = msg["zone_update_rate_ms"]
    # Persist entity flags before push so _push_config_to_device sees correct flags
    entities = msg.get("entities")
    if entities:
        persisted_entity_keys = (
            "zone_presence",
            "target_xy",
            "target_active",
            "target_signal",
            "target_zone",
            "zone_target_count",
            "target_count",
        )
        for ekey in persisted_entity_keys:
            if ekey in entities:
                device_config.setdefault("settings", {})[ekey] = entities[ekey]
    log_levels = msg.get("log_levels")
    if log_levels is not None:
        device_config["log_levels"] = log_levels
    await manager._store.async_save()
    await manager._push_config_to_device(mac)
    # Auto-enable/disable relay switch entity based on trigger mode
    relay_enabled = msg["relay_trigger_mode"] != "disabled"
    manager._entity_update_macs.add(mac)
    hass.loop.call_later(60, manager._entity_update_macs.discard, mac)
    _apply_entity_states(hass, mac, {"relay_output": relay_enabled})
    # Manage device log subscription on the active session (if any)
    session_conn = manager.get_session(mac)
    if session_conn is not None:
        manager._manage_log_subscription(session_conn, device_config)
    if entities:
        _apply_entity_states(hass, mac, entities)
        # Zone entities need layout-aware handling: enable zone_0 + named zones only
        if "zone_presence" in entities or "zone_target_count" in entities:
            layout = device_config.get("room_layout", {})
            from .const import MAX_ZONES

            zone_slots = layout.get("zone_slots", [None] * MAX_ZONES)
            await manager.async_update_zone_entities(mac, zone_slots)
        await manager._push_pipeline_to_device(mac)
    connection.send_result(msg["id"])


# -- set_distance_override (temporary range push, no persist) --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/set_distance_override",
        vol.Required("mac"): str,
        vol.Required("target_max_distance"): vol.Coerce(float),
        vol.Required("static_min_distance"): vol.Coerce(float),
        vol.Required("static_max_distance"): vol.Coerce(float),
    }
)
@websocket_api.async_response
async def websocket_set_distance_override(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Push distance override to device without persisting."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    proto_err = _check_firmware_version(manager, msg["mac"])
    if proto_err:
        connection.send_error(
            msg["id"],
            proto_err,
            "Firmware update required" if proto_err == "firmware_behind" else "Integration update required",
        )
        return
    mac = msg["mac"]
    session = manager.get_session(mac)
    if session is None:
        connection.send_result(msg["id"])
        return
    device_config = manager._store.devices.get(mac, {})
    stored_settings = device_config.get("settings", {})
    override = {
        "target_max_distance": msg["target_max_distance"],
        "static_min_distance": msg["static_min_distance"],
        "static_max_distance": msg["static_max_distance"],
        "static_trigger_threshold": stored_settings.get("static_trigger_threshold", 3),
        "static_renew_threshold": stored_settings.get("static_renew_threshold", 3),
        "static_timeout": stored_settings.get("static_timeout", 30.0),
        "static_on_delay": stored_settings.get("static_on_delay", 0.0),
    }
    await session.async_push_distance_override(override)
    connection.send_result(msg["id"])


# -- set_pipeline --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/set_pipeline",
        vol.Required("mac"): str,
        vol.Required("entity_target_interval"): vol.All(vol.Coerce(int), vol.Range(min=0, max=2000)),
        vol.Required("entity_zone_interval"): vol.All(vol.Coerce(int), vol.Range(min=0, max=2000)),
        vol.Required("display_interval"): vol.All(vol.Coerce(int), vol.Range(min=0, max=1000)),
        vol.Required("zone_state_interval"): vol.All(vol.Coerce(int), vol.Range(min=0, max=2000)),
        vol.Required("window_duration"): vol.All(vol.Coerce(int), vol.Range(min=200, max=2000)),
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
    proto_err = _check_firmware_version(manager, msg["mac"])
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
        "entity_target_interval": msg["entity_target_interval"],
        "entity_zone_interval": msg["entity_zone_interval"],
        "display_interval": msg["display_interval"],
        "zone_state_interval": msg["zone_state_interval"],
        "window_duration": msg["window_duration"],
    }
    await manager._store.async_save()
    await manager._push_pipeline_to_device(mac)
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
    """Trigger firmware OTA update via set_update_manifest action."""
    from .const import MANIFEST_BASE_URL

    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return

    mac = msg["mac"]
    dev = manager.devices.get(mac)
    if dev is None:
        connection.send_error(msg["id"], "not_found", "Device not found")
        return

    # Derive firmware variant from build flags
    from .const import FIRMWARE_VARIANTS

    flags = manager._build_flags.get(mac, {})
    if not flags:
        connection.send_error(msg["id"], "build_flags_unknown", "Device build flags not yet available")
        return
    network = "ethernet" if flags.get("ethernet_enabled") else "wifi"
    variant = FIRMWARE_VARIANTS.get(network)
    if variant is None:
        connection.send_error(msg["id"], "unknown_variant", f"No firmware variant for network type: {network}")
        return
    manifest_url = f"{MANIFEST_BASE_URL}/{variant}.json"

    if dev.host is None:
        connection.send_error(msg["id"], "not_available", "Device host unknown")
        return

    from .device_manager import DeviceConnection

    conn = DeviceConnection(dev.host)
    try:
        await conn.async_connect()
        svc = conn._services.get("set_update_manifest")
        if svc is None:
            connection.send_error(msg["id"], "not_supported", "Device does not support OTA update")
            return
        await conn._client.execute_service(svc, {"url": manifest_url})
        connection.send_result(msg["id"])
    except Exception as err:
        connection.send_error(msg["id"], "update_failed", str(err))
    finally:
        await conn.async_disconnect()


# -- subscribe_ota_progress --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/subscribe_ota_progress",
        vol.Required("mac"): str,
    }
)
@websocket_api.async_response
async def websocket_subscribe_ota_progress(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Subscribe to OTA firmware update progress for a device."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return

    mac = msg["mac"]
    device_conn = manager.get_session(mac)
    if device_conn is None:
        try:
            device_conn = await manager.async_open_session(mac)
        except Exception:
            pass
    if device_conn is None:
        connection.send_error(msg["id"], "no_session", "Device not available")
        return

    was_in_progress = False
    done = False  # shared guard: once a terminal event is sent, stop
    opened_session = device_conn is not manager.get_session(mac)

    # Ensure device logs are subscribed so _on_log callbacks fire
    from aioesphomeapi import LogLevel as ESPLogLevel

    if device_conn._unsub_logs is None:
        device_conn.subscribe_logs(ESPLogLevel.LOG_LEVEL_ERROR)

    @callback
    def _on_state(state: Any) -> None:
        nonlocal was_in_progress, done
        from aioesphomeapi import UpdateState

        if done or not isinstance(state, UpdateState):
            return

        if state.in_progress:
            was_in_progress = True
            progress = state.progress if state.has_progress else None
            connection.send_message(
                websocket_api.event_message(msg["id"], {
                    "state": "updating",
                    "progress": progress,
                })
            )
        elif was_in_progress:
            was_in_progress = False
            done = True
            if state.current_version and state.current_version == state.latest_version:
                connection.send_message(
                    websocket_api.event_message(msg["id"], {
                        "state": "success",
                        "version": state.current_version,
                    })
                )
            else:
                connection.send_message(
                    websocket_api.event_message(msg["id"], {
                        "state": "error",
                        "message": "Update failed \u2014 firmware version unchanged",
                    })
                )

    @callback
    def _on_log(log_msg: Any) -> None:
        nonlocal done
        if done:
            return

        if log_msg.level != ESPLogLevel.LOG_LEVEL_ERROR:
            return
        text = log_msg.message
        if isinstance(text, bytes):
            text = text.decode("utf-8", errors="replace")
        text = text.rstrip()
        if not text:
            return
        # Only match actual OTA/update errors, not status clears
        if "cleared Error flag" in text or "set Error flag" in text:
            return
        if "http_request.ota" not in text and "http_request.update" not in text:
            return
        done = True
        # Extract message after the ESPHome component tag
        # Format: [E][http_request.ota:294]: Actual message here
        parts = text.split("]: ", 1)
        clean_msg = parts[1] if len(parts) > 1 else text
        connection.send_message(
            websocket_api.event_message(msg["id"], {
                "state": "error",
                "message": clean_msg,
            })
        )

    device_conn.subscribe_states(_on_state)
    device_conn.add_log_callback(_on_log)
    connection.send_result(msg["id"])

    @callback
    def _unsub() -> None:
        device_conn.unsubscribe_states(_on_state)
        device_conn.remove_log_callback(_on_log)
        if opened_session:
            hass.async_create_task(manager.async_close_session(mac))

    connection.subscriptions[msg["id"]] = _unsub


# -- dismiss_target (ephemeral, firmware-only) --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/dismiss_target",
        vol.Required("mac"): str,
        vol.Required("target_index"): vol.Coerce(int),
        vol.Required("cell_index"): vol.Coerce(int),
    }
)
@websocket_api.async_response
async def websocket_dismiss_target(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Dismiss a target at a specific cell (ephemeral, firmware-only)."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    mac = msg["mac"]
    dev = manager.devices.get(mac)
    if not dev or not dev.host:
        connection.send_error(msg["id"], "device_unavailable", "Device not connected")
        return

    try:
        session = manager.get_session(mac)
        if session is None:
            connection.send_error(msg["id"], "no_session", "No active session")
            return
        await session.async_dismiss_target(msg["target_index"], msg["cell_index"])
    except Exception as err:
        connection.send_error(msg["id"], "dismiss_failed", str(err))
        return

    connection.send_result(msg["id"])


# -- subscribe_flashable_devices --


@websocket_api.websocket_command({vol.Required("type"): "eppgrid/subscribe_flashable_devices"})
@websocket_api.async_response
async def websocket_subscribe_flashable_devices(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Subscribe to flashable device list changes."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return

    from .const import FIRMWARE_VERSION

    async def _send_update() -> None:
        devices = await manager.list_flashable_devices()
        connection.send_message(
            websocket_api.event_message(
                msg["id"],
                {
                    "devices": devices,
                    "firmware_base_url": "/api/eppgrid/firmware",
                    "latest_firmware_version": f"v{FIRMWARE_VERSION}",
                    "integration_version": _INTEGRATION_VERSION,
                },
            )
        )

    @callback
    def _on_changed() -> None:
        hass.async_create_task(_send_update())

    unsub = manager.on_device_list_changed(_on_changed)

    connection.send_result(msg["id"])
    await _send_update()

    @callback
    def _unsub() -> None:
        unsub()

    connection.subscriptions[msg["id"]] = _unsub


# -- list_flashable_devices --


@websocket_api.websocket_command({vol.Required("type"): "eppgrid/list_flashable_devices"})
@websocket_api.async_response
async def websocket_list_flashable_devices(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """List all EPP devices available for flashing."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return

    from .const import FIRMWARE_VERSION

    devices = await manager.list_flashable_devices()
    connection.send_result(
        msg["id"],
        {
            "devices": devices,
            "firmware_base_url": "/api/eppgrid/firmware",
            "latest_firmware_version": f"v{FIRMWARE_VERSION}",
            "integration_version": _INTEGRATION_VERSION,
        },
    )


# -- delete_esphome_device --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/delete_esphome_device",
        vol.Required("config_entry_id"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_delete_esphome_device(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete an ESPHome config entry (and its device/entities)."""
    entry = hass.config_entries.async_get_entry(msg["config_entry_id"])
    if entry is None:
        connection.send_error(msg["id"], "not_found", "Config entry not found")
        return
    if entry.domain != "esphome":
        connection.send_error(msg["id"], "invalid_entry", "Only ESPHome config entries can be deleted by this command")
        return
    try:
        await hass.config_entries.async_remove(msg["config_entry_id"])
    except Exception as err:
        connection.send_error(msg["id"], "delete_failed", str(err))
        return
    connection.send_result(msg["id"])


# -- add_esphome_device --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/add_esphome_device",
        vol.Required("host"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_add_esphome_device(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Add an ESPHome device by triggering its config flow."""
    try:
        flow_context: dict[str, Any] = {"source": "user"}
        if hasattr(connection, "context") and hasattr(connection.context, "user_id"):
            flow_context["user_id"] = connection.context.user_id
        result = await hass.config_entries.flow.async_init(
            "esphome",
            context=flow_context,
            data={"host": msg["host"], "port": 6053},
        )
        connection.send_result(msg["id"], {"result": result.get("type", "unknown")})
    except Exception as err:
        connection.send_error(msg["id"], "add_failed", str(err))
