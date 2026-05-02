"""Firmware OTA + dismiss-target commands."""

from __future__ import annotations

import contextlib
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.core import callback

from ..const import DOMAIN
from . import _LOGGER
from . import _OTA_LOG_CATEGORY
from . import _OTA_LOG_LEVEL
from . import _get_manager
from . import _send_exception
from . import _send_no_firmware_variant
from . import _send_not_loaded

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
    from ..const import OTA_MANIFEST_BASE_URL

    manager = _get_manager(hass)
    if manager is None:
        _send_not_loaded(connection, msg["id"])
        return

    mac = msg["mac"]
    dev = manager.devices.get(mac)
    if dev is None:
        connection.send_error(
            msg["id"],
            "not_found",
            "Device not found",
            translation_domain=DOMAIN,
            translation_key="device_not_found",
        )
        return

    # Derive firmware variant from build flags
    from ..const import FIRMWARE_VARIANTS

    flags = manager._build_flags.get(mac, {})
    if not flags:
        connection.send_error(
            msg["id"],
            "build_flags_unknown",
            "Device build flags not yet available",
            translation_domain=DOMAIN,
            translation_key="build_flags_unavailable",
        )
        return
    network = "ethernet" if flags.get("ethernet_enabled") else "wifi"
    variant = FIRMWARE_VARIANTS.get(network)
    if variant is None:
        _send_no_firmware_variant(connection, msg["id"], network)
        return
    manifest_url = f"{OTA_MANIFEST_BASE_URL}/{variant}.json"

    if dev.host is None:
        connection.send_error(
            msg["id"],
            "not_available",
            "Device host unknown",
            translation_domain=DOMAIN,
            translation_key="device_host_unknown",
        )
        return

    from ..device_manager import DeviceConnection

    conn = DeviceConnection(dev.host)
    try:
        await conn.async_connect()
        svc = conn._services.get("set_update_manifest")
        if svc is None:
            connection.send_error(
                msg["id"],
                "not_supported",
                "Device does not support OTA update",
                translation_domain=DOMAIN,
                translation_key="ota_unsupported",
            )
            return
        assert conn._client is not None  # async_connect succeeded
        await conn._client.execute_service(svc, {"url": manifest_url})
        connection.send_result(msg["id"])
    except Exception as err:
        _send_exception(connection, msg["id"], "update_failed", err)
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
        _send_not_loaded(connection, msg["id"])
        return

    mac = msg["mac"]
    had_session = manager.get_session(mac) is not None
    device_conn = manager.get_session(mac)
    if device_conn is None:
        with contextlib.suppress(Exception):
            device_conn = await manager.async_open_session(mac)
    if device_conn is None:
        connection.send_error(
            msg["id"],
            "no_session",
            "Device not available",
            translation_domain=DOMAIN,
            translation_key="device_not_available",
        )
        return

    was_in_progress = False
    done = False  # shared guard: once a terminal event is sent, stop

    # Ensure device logs are subscribed so _on_log callbacks fire
    from aioesphomeapi import LogLevel as ESPLogLevel

    if device_conn._unsub_logs is None:
        device_conn.subscribe_logs(ESPLogLevel.LOG_LEVEL_ERROR)

    # Firmware silences the ESPHome logger to NONE on boot, so even ERROR
    # messages from http_request.ota / http_request.update never leave the
    # device — the subscribe-logs surface above reads nothing. Bump the
    # system log level to Error here so OTA failures actually reach the
    # frontend. Older firmware that doesn't expose this action is left
    # alone (older firmware also doesn't silence to NONE, so it works).
    log_svc = device_conn._services.get("epp_set_log_level")
    if log_svc is not None:
        try:
            await device_conn._client.execute_service(log_svc, {"category": _OTA_LOG_CATEGORY, "level": _OTA_LOG_LEVEL})
        except Exception:
            _LOGGER.debug("Failed to bump device log level for OTA visibility", exc_info=True)

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
                websocket_api.event_message(
                    msg["id"],
                    {
                        "state": "updating",
                        "progress": progress,
                    },
                )
            )
        elif was_in_progress:
            was_in_progress = False
            done = True
            if state.current_version and state.current_version == state.latest_version:
                connection.send_message(
                    websocket_api.event_message(
                        msg["id"],
                        {
                            "state": "success",
                            "version": state.current_version,
                        },
                    )
                )
            else:
                connection.send_message(
                    websocket_api.event_message(
                        msg["id"],
                        {
                            "state": "error",
                            "message": "Update failed — firmware version unchanged",
                            "error_key": "flasher.errors.ota_failed_version_unchanged",
                        },
                    )
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
        # Drop noise: recovery transitions and the vague unspecified flag.
        # Other `set Error flag: <message>` lines carry an actionable suffix
        # (e.g. "Failed to install firmware") and pass through to the user.
        if "cleared Error flag" in text:
            return
        if "set Error flag: unspecified" in text:
            return
        # Match any OTA-relevant component tag — `.ota` and `.update` are the
        # ESPHome OTA components, `.idf` is the underlying ESP-IDF HTTP
        # client (where ESP_ERR_HTTP_CONNECT etc. surface). Also catches
        # `[E][component:...]: http_request.update set Error flag: ...`
        # because the body mentions the qualified component name.
        if not any(tag in text for tag in ("http_request.ota", "http_request.update", "http_request.idf")):
            return
        done = True
        # Extract message after the ESPHome component tag
        # Format: [E][http_request.ota:294]: Actual message here
        parts = text.split("]: ", 1)
        clean_msg = parts[1] if len(parts) > 1 else text
        connection.send_message(
            websocket_api.event_message(
                msg["id"],
                {
                    "state": "error",
                    "message": clean_msg,
                },
            )
        )

    device_conn.subscribe_states(_on_state)
    device_conn.add_log_callback(_on_log)
    connection.send_result(msg["id"])

    @callback
    def _unsub() -> None:
        device_conn.unsubscribe_states(_on_state)
        device_conn.remove_log_callback(_on_log)
        if not had_session:
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
        _send_not_loaded(connection, msg["id"])
        return
    mac = msg["mac"]
    dev = manager.devices.get(mac)
    if not dev or not dev.host:
        connection.send_error(
            msg["id"],
            "device_unavailable",
            "Device not connected",
            translation_domain=DOMAIN,
            translation_key="device_not_connected",
        )
        return

    try:
        session = manager.get_session(mac)
        if session is None:
            connection.send_error(
                msg["id"],
                "no_session",
                "No active session",
                translation_domain=DOMAIN,
                translation_key="no_active_session",
            )
            return
        await session.async_dismiss_target(msg["target_index"], msg["cell_index"])
    except Exception as err:
        _send_exception(connection, msg["id"], "dismiss_failed", err)
        return

    connection.send_result(msg["id"])
