"""WebSocket command exposing the current frontend bundle versions.

The panel and the dashboard card each serve from a content-hashed path
(`/eppgrid_static/<hash>/...`), so an upgrade gives each bundle a new URL. This
command lets an already-open panel or card ask the server for the current
hashes; when a bundle's hash differs from the one it is actually running (read
from `import.meta.url`), it reloads the page. See
`frontend/src/lib/version-check.ts`.

Not admin-gated: the dashboard card renders for non-admin viewers too and must
be able to self-reload. The payload is just non-sensitive content hashes.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.core import callback

from ..const import CARD_BUNDLE_HASH_KEY
from ..const import CURRENT_BUNDLE_HASH_KEY


@websocket_api.websocket_command({vol.Required("type"): "eppgrid/frontend_version"})
@callback
def websocket_frontend_version(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return the current panel and card bundle content hashes (null if not yet known)."""
    connection.send_result(
        msg["id"],
        {
            "hash": hass.data.get(CURRENT_BUNDLE_HASH_KEY),
            "card_hash": hass.data.get(CARD_BUNDLE_HASH_KEY),
        },
    )
