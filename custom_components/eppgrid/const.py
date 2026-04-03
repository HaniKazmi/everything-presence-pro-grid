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

# Original EPP firmware identifiers (for device discovery)
EPP_MANUFACTURER = "EverythingSmartTechnology"
EPP_MODEL = "Everything Presence Pro"

# ESPHome OTA
OTA_PORT = 3232
FIRMWARE_VERSION = "v0.1.0-alpha.1"
MANIFEST_BASE_URL = (
    f"https://github.com/clintongormley/everything-presence-pro-grid/releases/download/{FIRMWARE_VERSION}"
)
