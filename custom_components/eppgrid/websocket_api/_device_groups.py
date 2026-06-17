"""WebSocket commands for Device Groups."""

from __future__ import annotations

import functools
import logging
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.core import callback

from ..const import DOMAIN
from ..const import MAX_SOURCES_PER_DEVICE_GROUP
from ..const import MAX_ZONE_GROUPS_PER_DEVICE_GROUP
from ..device_groups._projection import SourceState
from ..device_groups._projection import derive_exposed_entities
from ..device_groups._registry import build_source_states
from ..device_groups._registry import zone_name_from_store
from . import MAC_SCHEMA

_LOGGER = logging.getLogger(__name__)


def _require_manager(func):
    """Decorator: send `device_groups_unavailable` if manager not loaded."""

    @functools.wraps(func)
    def wrapper(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
        *args: Any,
        **kwargs: Any,
    ) -> Any:
        mgr = hass.data.get(DOMAIN)
        if mgr is None or not hasattr(mgr, "device_groups"):
            connection.send_error(
                msg["id"],
                "device_groups_unavailable",
                "Device groups manager not loaded",
            )
            return None
        return func(hass, connection, msg, mgr, *args, **kwargs)

    return wrapper


def _device_name(manager: Any, mac: str) -> str:
    """Human-friendly device name — prefer the managed device's name, then the
    stored name, and only fall back to the MAC as a last resort."""
    dev = manager.devices.get(mac)
    if dev is not None and getattr(dev, "name", None):
        return dev.name
    return manager._store.devices.get(mac, {}).get("name") or mac


def _build_sources(hass: HomeAssistant, macs: list[str], manager: Any) -> list[SourceState]:
    return build_source_states(
        hass,
        macs=macs,
        device_name_fn=lambda mac: _device_name(manager, mac),
        zone_name_fn=lambda mac, i: zone_name_from_store(manager._store, mac, i),
    )


def _serialize_source(s: SourceState, manager: Any) -> dict[str, Any]:
    return {
        "mac": s.mac,
        "name": s.name,
        "available": s.mac in manager.devices,
        "enabled_presence": s.enabled_presence,
        "zones": [{"index": z.index, "name": z.name, "enabled": z.enabled} for z in s.zones],
    }


def _candidate_sources(hass: HomeAssistant, manager: Any) -> list[dict[str, Any]]:
    """Source state (zones + enabled presence) for every managed device, so the
    editor can show a device's zones the moment it is toggled — not only after
    the group is saved."""
    sources = _build_sources(hass, list(manager.devices), manager)
    return [_serialize_source(s, manager) for s in sources]


def _serialize_group(hass: HomeAssistant, group: dict[str, Any], manager: Any) -> dict[str, Any]:
    """Return the full WS payload for a device group, with exposed_entities."""
    sources = _build_sources(hass, group["sources"], manager)
    return {
        "id": group["id"],
        "name": group["name"],
        "area_id": group["area_id"],
        "sources": [_serialize_source(s, manager) for s in sources],
        "zone_groups": group["zone_groups"],
        "exposed_entities": derive_exposed_entities(sources, group["zone_groups"]),
    }


# -- list -------------------------------------------------------------------


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "eppgrid/list_device_groups"})
@callback
@_require_manager
def websocket_list_device_groups(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    groups = manager.device_groups.list_groups()
    connection.send_result(
        msg["id"],
        {"device_groups": [_serialize_group(hass, g, manager) for g in groups]},
    )


# -- shared member schemas ---------------------------------------------------

_ZONE_GROUP_SCHEMA = vol.Schema(
    {
        vol.Required("id"): vol.All(str, vol.Length(min=1, max=64)),
        vol.Required("name"): vol.All(str, vol.Length(min=1, max=128)),
        vol.Required("members"): vol.All(
            [
                vol.Schema(
                    {
                        vol.Required("mac"): MAC_SCHEMA,
                        # Manual merges cover named zones 1-7 only. Zone 0
                        # (Rest of room) is combined implicitly by the
                        # projection and is never a stored zone_group member.
                        vol.Required("zone_index"): vol.All(int, vol.Range(min=1, max=7)),
                    }
                )
            ],
            vol.Length(min=0, max=16),
        ),
    }
)

_EXCLUDED_ZONE_SCHEMA = vol.Schema(
    {
        vol.Required("mac"): MAC_SCHEMA,
        # Excludable passthrough zones are the named zones 1-7; zone 0 (Rest
        # of room) is excluded via excluded_zone_groups ("rest_of_room").
        vol.Required("zone_index"): vol.All(int, vol.Range(min=1, max=7)),
    }
)


# -- create -----------------------------------------------------------------

_CREATE_SCHEMA = {
    vol.Required("type"): "eppgrid/create_device_group",
    vol.Required("name"): vol.All(str, vol.Length(min=1, max=128)),
    vol.Required("sources"): vol.All(
        [MAC_SCHEMA],
        vol.Length(min=1, max=MAX_SOURCES_PER_DEVICE_GROUP),
    ),
    vol.Optional("area_id"): vol.Any(None, vol.All(str, vol.Length(min=1, max=128))),
    vol.Optional("zone_groups", default=list): vol.All(
        [_ZONE_GROUP_SCHEMA], vol.Length(max=MAX_ZONE_GROUPS_PER_DEVICE_GROUP)
    ),
    vol.Optional("excluded_presence", default=list): [str],
    vol.Optional("excluded_zones", default=list): [_EXCLUDED_ZONE_SCHEMA],
    vol.Optional("excluded_zone_groups", default=list): [str],
}


@websocket_api.require_admin
@websocket_api.websocket_command(_CREATE_SCHEMA)
@websocket_api.async_response
@_require_manager
async def websocket_create_device_group(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    try:
        group = await manager.device_groups.async_create(
            name=msg["name"],
            sources=msg["sources"],
            area_id=msg.get("area_id"),
        )
    except ValueError as e:
        connection.send_error(msg["id"], "invalid_input", str(e))
        return
    connection.send_result(msg["id"], {"device_group": _serialize_group(hass, group, manager)})


# -- update -----------------------------------------------------------------

_UPDATE_SCHEMA = {
    vol.Required("type"): "eppgrid/update_device_group",
    vol.Required("group_id"): vol.All(str, vol.Length(min=1, max=64)),
    vol.Required("name"): vol.All(str, vol.Length(min=1, max=128)),
    vol.Required("sources"): vol.All(
        [MAC_SCHEMA],
        vol.Length(min=1, max=MAX_SOURCES_PER_DEVICE_GROUP),
    ),
    vol.Required("area_id"): vol.Any(None, vol.All(str, vol.Length(min=1, max=128))),
    vol.Required("zone_groups"): vol.All([_ZONE_GROUP_SCHEMA], vol.Length(max=MAX_ZONE_GROUPS_PER_DEVICE_GROUP)),
    vol.Optional("excluded_presence", default=list): [str],
    vol.Optional("excluded_zones", default=list): [_EXCLUDED_ZONE_SCHEMA],
    vol.Optional("excluded_zone_groups", default=list): [str],
}


@websocket_api.require_admin
@websocket_api.websocket_command(_UPDATE_SCHEMA)
@websocket_api.async_response
@_require_manager
async def websocket_update_device_group(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    try:
        group = await manager.device_groups.async_update(
            id=msg["group_id"],
            name=msg["name"],
            sources=msg["sources"],
            area_id=msg["area_id"],
            zone_groups=msg["zone_groups"],
        )
    except KeyError:
        connection.send_error(msg["id"], "not_found", "device group not found")
        return
    except ValueError as e:
        connection.send_error(msg["id"], "invalid_input", str(e))
        return
    connection.send_result(msg["id"], {"device_group": _serialize_group(hass, group, manager)})


# -- delete -----------------------------------------------------------------

_DELETE_SCHEMA = {
    vol.Required("type"): "eppgrid/delete_device_group",
    vol.Required("group_id"): vol.All(str, vol.Length(min=1, max=64)),
}


@websocket_api.require_admin
@websocket_api.websocket_command(_DELETE_SCHEMA)
@websocket_api.async_response
@_require_manager
async def websocket_delete_device_group(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    try:
        await manager.device_groups.async_delete(msg["group_id"])
    except KeyError:
        connection.send_error(msg["id"], "not_found", "device group not found")
        return
    # Also remove the virtual device from the registry so it doesn't linger.
    from homeassistant.helpers import device_registry as dr

    dr_ = dr.async_get(hass)
    dev = dr_.async_get_device(identifiers={(DOMAIN, f"device_group:{msg['group_id']}")})
    if dev is not None:
        dr_.async_remove_device(dev.id)
    connection.send_result(msg["id"], {})


# -- subscribe --------------------------------------------------------------


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "eppgrid/subscribe_device_groups"})
@callback
@_require_manager
def websocket_subscribe_device_groups(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    @callback
    def _send_update() -> None:
        groups = manager.device_groups.list_groups()
        connection.send_message(
            websocket_api.event_message(
                msg["id"],
                {
                    "device_groups": [_serialize_group(hass, g, manager) for g in groups],
                    "candidate_sources": _candidate_sources(hass, manager),
                },
            )
        )

    unsub = manager.device_groups.on_change(_send_update)
    connection.send_result(msg["id"])
    _send_update()
    connection.subscriptions[msg["id"]] = unsub
