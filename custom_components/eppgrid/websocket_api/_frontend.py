"""WebSocket command exposing the current panel bundle version.

The panel serves from a content-hashed path (`/eppgrid_static/<hash>/...`), so
an upgrade gives the bundle a new URL. This command lets an already-open panel
ask the server for the current hash; when it differs from the panel's own
(read from `import.meta.url`), the panel reloads itself. See
`frontend/src/lib/version-check.ts`.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.core import callback

from ..const import CURRENT_BUNDLE_HASH_KEY


@websocket_api.websocket_command({vol.Required("type"): "eppgrid/frontend_version"})
@websocket_api.require_admin
@callback
def websocket_frontend_version(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return the current panel bundle content hash (null if not yet known)."""
    connection.send_result(msg["id"], {"hash": hass.data.get(CURRENT_BUNDLE_HASH_KEY)})
