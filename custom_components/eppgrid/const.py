"""Constants for the Everything Presence Pro integration."""

DOMAIN = "eppgrid"

# Grid
GRID_COLS = 20
GRID_CELL_SIZE_MM = 300  # Fixed 300mm x 300mm cells

# ESPHome API
DEFAULT_PORT = 6053

MAX_ZONES = 7

# Config protocol version — must match firmware's Config Protocol sensor value.
# Bump when releasing new firmware. The GitHub release tag is v{CONFIG_PROTOCOL_VERSION}.
CONFIG_PROTOCOL_VERSION = 1

# Original EPP firmware identifiers (for device discovery)
EPP_MANUFACTURER = "EverythingSmartTechnology"
EPP_MODEL = "Everything Presence Pro"

# Firmware — release tag and download URL derived from CONFIG_PROTOCOL_VERSION
FIRMWARE_RELEASE_TAG = f"v{CONFIG_PROTOCOL_VERSION}"
MANIFEST_BASE_URL = (
    f"https://github.com/clintongormley/everything-presence-pro-grid/releases/download/{FIRMWARE_RELEASE_TAG}"
)

# Map UI network choice to full firmware variant name
FIRMWARE_VARIANTS = {
    "wifi": "wifi-ble-co2",
    "ethernet": "ethernet-ble-co2",
}
