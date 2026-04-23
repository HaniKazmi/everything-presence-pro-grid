"""Constants for the Everything Presence Pro integration."""

DOMAIN = "eppgrid"

# Grid
GRID_COLS = 20
GRID_CELL_SIZE_MM = 300  # Fixed 300mm x 300mm cells

# ESPHome API
DEFAULT_PORT = 6053

MAX_ZONES = 7
NUM_ZONE_SLOTS = MAX_ZONES + 1  # 8: zone 0 + named zones 1-7

# Fallback layout when a device has no stored room_layout. Must satisfy
# is_valid_zone_slots_shape (length-8 list, dict at slot 0).
EMPTY_ZONE_SLOTS: list[dict[str, str] | None] = [{"type": "normal"}, *([None] * MAX_ZONES)]

# Firmware version this integration requires.
# Must match the firmware's Firmware Version text sensor value.
# Bump when releasing new firmware. GitHub release tag is v{FIRMWARE_VERSION}.
FIRMWARE_VERSION = "0.95.0"

# Original EPP firmware identifiers (for device discovery)
EPP_MANUFACTURER = "EverythingSmartTechnology"
EPP_MODEL = "Everything Presence Pro"

# Firmware download URL — GitHub release assets for v{FIRMWARE_VERSION}.
# Anchored to the integration's required FIRMWARE_VERSION so the flasher and
# OTA both install firmware that matches the integration. (ESPHome's built-in
# update mechanism uses fw/latest/ on GH Pages — that is the "always-newest"
# channel and is unrelated to this URL.)
MANIFEST_BASE_URL = (
    f"https://github.com/clintongormley/everything-presence-pro-grid/releases/download/v{FIRMWARE_VERSION}"
)

# Map UI network choice to firmware variant filename (matches fw/ filenames)
FIRMWARE_VARIANTS = {
    "wifi": "wifi-ble-co2",
    "ethernet": "ethernet-ble-co2",
}
