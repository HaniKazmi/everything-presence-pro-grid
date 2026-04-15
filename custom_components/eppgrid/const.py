"""Constants for the Everything Presence Pro integration."""

DOMAIN = "eppgrid"

# Grid
GRID_COLS = 20
GRID_CELL_SIZE_MM = 300  # Fixed 300mm x 300mm cells

# ESPHome API
DEFAULT_PORT = 6053

MAX_ZONES = 7

# Firmware version this integration requires.
# Must match the firmware's Firmware Version text sensor value.
# Bump when releasing new firmware. GitHub release tag is v{FIRMWARE_VERSION}.
FIRMWARE_VERSION = "0.92.0"

# Original EPP firmware identifiers (for device discovery)
EPP_MANUFACTURER = "EverythingSmartTechnology"
EPP_MODEL = "Everything Presence Pro"

# Firmware download URL (GitHub Pages — no redirects, short URLs)
MANIFEST_BASE_URL = f"https://clintongormley.github.io/everything-presence-pro-grid/fw/v{FIRMWARE_VERSION}"

# Map UI network choice to firmware variant filename (matches fw/ filenames)
FIRMWARE_VARIANTS = {
    "wifi": "wifi-ble-co2",
    "ethernet": "ethernet-ble-co2",
}
