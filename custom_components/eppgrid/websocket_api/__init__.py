"""WebSocket API for EPP Grid frontend."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from ..const import DOMAIN
from ..const import NUM_ZONE_SLOTS

_LOGGER = logging.getLogger(__name__)

try:
    _INTEGRATION_VERSION: str = json.loads((Path(__file__).parent.parent / "manifest.json").read_text())["version"]
except Exception:
    _INTEGRATION_VERSION = "unknown"

_REGISTERED: set[str] = set()


_TIMING_FIELDS = ("trigger", "renew", "timeout", "handoff_timeout")

# Wire-level vocabulary for the firmware's `epp_set_log_level` action — must
# match the string-comparison branches in firmware/common/everything-presence-pro-base.yaml.
_OTA_LOG_CATEGORY = "system"
_OTA_LOG_LEVEL = "Error"


def _validate_zone_slots(value: Any) -> list:
    """Validate the shape of a `zone_slots` list coming from the frontend.

    Enforces at the websocket boundary (fail-closed) so malformed data never
    reaches storage / firmware pushes / entity renaming:

    - Must be a list of exactly NUM_ZONE_SLOTS entries.
    - Slot 0 (zone 0, "rest of room") must be a dict with a string `type`.
    - Slots 1-7 (named zones) must be `None` OR a dict with required string
      keys `name`, `color`, and `type`.
    - Optional timing fields (trigger / renew / timeout / handoff_timeout),
      when present on any slot, must be numeric (int or float).
    """
    if not isinstance(value, list) or len(value) != NUM_ZONE_SLOTS:
        raise vol.Invalid(f"zone_slots must be a list of length {NUM_ZONE_SLOTS}")
    zone0 = value[0]
    if not isinstance(zone0, dict):
        raise vol.Invalid("zone_slots[0] (zone 0) must be a dict")
    if "type" not in zone0 or not isinstance(zone0["type"], str):
        raise vol.Invalid("zone_slots[0] must have string 'type'")
    for field in _TIMING_FIELDS:
        if field in zone0 and not isinstance(zone0[field], (int, float)):
            raise vol.Invalid(f"zone_slots[0] '{field}' must be numeric when present")
    for i, slot in enumerate(value[1:], start=1):
        if slot is None:
            continue
        if not isinstance(slot, dict):
            raise vol.Invalid(f"zone_slots[{i}] must be null or a dict")
        if "name" not in slot or not isinstance(slot["name"], str):
            raise vol.Invalid(f"zone_slots[{i}] must have string 'name'")
        if "color" not in slot or not isinstance(slot["color"], str):
            raise vol.Invalid(f"zone_slots[{i}] must have string 'color'")
        if "type" not in slot or not isinstance(slot["type"], str):
            raise vol.Invalid(f"zone_slots[{i}] must have string 'type'")
        for field in _TIMING_FIELDS:
            if field in slot and not isinstance(slot[field], (int, float)):
                raise vol.Invalid(f"zone_slots[{i}] '{field}' must be numeric when present")
    return value


def _send_not_loaded(connection: websocket_api.ActiveConnection, msg_id: int) -> None:
    """Send the standard 'Integration not loaded' error via translation key."""
    connection.send_error(
        msg_id,
        "not_ready",
        "Integration not loaded",
        translation_domain=DOMAIN,
        translation_key="integration_not_loaded",
    )


def _send_no_firmware_variant(connection: websocket_api.ActiveConnection, msg_id: int, network: str) -> None:
    """Send 'no firmware variant' error with network type as translation placeholder."""
    connection.send_error(
        msg_id,
        "unknown_variant",
        f"No firmware variant for network type: {network}",
        translation_domain=DOMAIN,
        translation_key="no_firmware_variant",
        translation_placeholders={"network": network},
    )


# Map _check_firmware_version() return codes to (translation_key, English fallback)
# pairs. `firmware_behind` / `firmware_ahead` reuse the same string as the wire
# code; `unavailable` is the offline-device case where no firmware version was
# reported, which we route to the existing `device_not_available` exception.
_FIRMWARE_VERSION_ERRORS: dict[str, tuple[str, str]] = {
    "firmware_behind": ("firmware_behind", "Firmware update required"),
    "firmware_ahead": ("firmware_ahead", "Integration update required"),
    "unavailable": ("device_not_available", "Device not available"),
}


def _send_firmware_version_error(connection: websocket_api.ActiveConnection, msg_id: int, proto_err: str) -> None:
    """Send a firmware version mismatch error with translation metadata.

    `proto_err` is the code returned by `_check_firmware_version`. The wire-level
    error code (`proto_err`) is preserved for frontend dispatch; the
    `translation_key` is mapped via `_FIRMWARE_VERSION_ERRORS` to a key that
    actually exists in strings.json.
    """
    translation_key, fallback = _FIRMWARE_VERSION_ERRORS.get(
        proto_err, ("device_not_available", "Device not available")
    )
    connection.send_error(
        msg_id,
        proto_err,
        fallback,
        translation_domain=DOMAIN,
        translation_key=translation_key,
    )


def _send_exception(connection: websocket_api.ActiveConnection, msg_id: int, code: str, err: BaseException) -> None:
    """Send an error from a caught exception, preserving translation metadata if present.

    HomeAssistantError instances raised by our own helpers carry
    translation_domain / translation_key / translation_placeholders; pass these
    through so the frontend can localize. Other exceptions fall back to str(err).
    """
    domain = getattr(err, "translation_domain", None)
    key = getattr(err, "translation_key", None)
    placeholders = getattr(err, "translation_placeholders", None)
    if domain and key:
        connection.send_error(
            msg_id,
            code,
            str(err),
            translation_domain=domain,
            translation_key=key,
            translation_placeholders=placeholders,
        )
    else:
        connection.send_error(msg_id, code, str(err))


def async_register_websocket_commands(hass: HomeAssistant, manager: Any) -> None:
    """Register WebSocket commands."""
    if DOMAIN in _REGISTERED:
        return
    _REGISTERED.add(DOMAIN)

    websocket_api.async_register_command(hass, websocket_subscribe_device_list)
    websocket_api.async_register_command(hass, websocket_list_devices)
    websocket_api.async_register_command(hass, websocket_set_show_room_calibration_tutorial)
    websocket_api.async_register_command(hass, websocket_get_config)
    websocket_api.async_register_command(hass, websocket_set_setup)
    websocket_api.async_register_command(hass, websocket_set_room_layout)
    websocket_api.async_register_command(hass, websocket_list_configurations)
    websocket_api.async_register_command(hass, websocket_save_configuration)
    websocket_api.async_register_command(hass, websocket_delete_configuration)
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
    from ..device_manager import _compare_firmware_version

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


# Submodule re-exports — must come after the helpers above (_get_manager,
# _send_*, _INTEGRATION_VERSION) so submodules can import them at load time.
# These re-exports keep `from .websocket_api import websocket_X` working for
# tests and let async_register_websocket_commands reference them by bare name.
from ._devices import _apply_entity_states  # noqa: E402, F401
from ._devices import _build_entity_key_map  # noqa: E402, F401
from ._devices import _entity_key_for_object_id  # noqa: E402, F401
from ._devices import _get_entity_states  # noqa: E402, F401
from ._devices import _object_id_from_unique_id  # noqa: E402, F401
from ._devices import websocket_delete_configuration  # noqa: E402
from ._devices import websocket_get_config  # noqa: E402
from ._devices import websocket_list_configurations  # noqa: E402
from ._devices import websocket_list_devices  # noqa: E402
from ._devices import websocket_save_configuration  # noqa: E402
from ._devices import websocket_set_distance_override  # noqa: E402
from ._devices import websocket_set_entity_enabled  # noqa: E402
from ._devices import websocket_set_pipeline  # noqa: E402
from ._devices import websocket_set_room_layout  # noqa: E402
from ._devices import websocket_set_settings  # noqa: E402
from ._devices import websocket_set_setup  # noqa: E402
from ._devices import websocket_set_show_room_calibration_tutorial  # noqa: E402
from ._devices import websocket_subscribe_device  # noqa: E402
from ._devices import websocket_subscribe_device_list  # noqa: E402
from ._devices import websocket_subscribe_grid_targets  # noqa: E402
from ._devices import websocket_subscribe_raw_targets  # noqa: E402
from ._firmware import websocket_dismiss_target  # noqa: E402
from ._firmware import websocket_subscribe_ota_progress  # noqa: E402
from ._firmware import websocket_update_firmware  # noqa: E402
from ._flasher import _map_esphome_flow_result  # noqa: E402, F401
from ._flasher import websocket_add_esphome_device  # noqa: E402
from ._flasher import websocket_delete_esphome_device  # noqa: E402
from ._flasher import websocket_list_flashable_devices  # noqa: E402
from ._flasher import websocket_subscribe_flashable_devices  # noqa: E402
