"""Constants for the Everything Presence Pro integration."""

DOMAIN = "eppgrid"

# Grid
GRID_COLS = 20
GRID_CELL_SIZE_MM = 300  # Fixed 300mm x 300mm cells

# ESPHome API
DEFAULT_PORT = 6053

MAX_ZONES = 7

# Config protocol version — must match firmware's Config Protocol sensor value.
# Bump in lockstep with firmware when the config push interface changes.
CONFIG_PROTOCOL_VERSION = 1
