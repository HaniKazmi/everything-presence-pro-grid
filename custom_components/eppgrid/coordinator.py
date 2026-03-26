"""Coordinator for Everything Presence Pro device connection and state."""

from __future__ import annotations

import json
import logging
import math
import time
from typing import IO
from typing import Any

from aioesphomeapi import APIClient
from aioesphomeapi import BinarySensorInfo
from aioesphomeapi import BinarySensorState
from aioesphomeapi import ReconnectLogic
from aioesphomeapi import SensorInfo
from aioesphomeapi import SensorState
from aioesphomeapi import TextSensorInfo
from aioesphomeapi import TextSensorState
from aioesphomeapi import UserService
from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .calibration import SensorTransform
from .const import CELL_ROOM_BIT
from .const import DEFAULT_PORT
from .const import DOMAIN
from .const import GRID_CELL_SIZE_MM
from .const import GRID_COLS
from .const import GRID_ROWS
from .const import MAX_TARGETS
from .const import MAX_ZONES
from .const import ZONE_TYPE_DEFAULTS
from .const import ZONE_TYPE_NORMAL
from .zone_engine import DisplayBuffer
from .zone_engine import DisplaySnapshot
from .zone_engine import Grid
from .zone_engine import ProcessingResult
from .zone_engine import TargetResult
from .zone_engine import TargetStatus
from .zone_engine import Zone
from .zone_engine import ZoneEngine

_LOGGER = logging.getLogger(__name__)

SIGNAL_ZONES_UPDATED = f"{DOMAIN}_zones_updated"
SIGNAL_TARGETS_UPDATED = f"{DOMAIN}_targets_updated"
SIGNAL_SENSORS_UPDATED = f"{DOMAIN}_sensors_updated"
SIGNAL_DISPLAY_UPDATED = f"{DOMAIN}_display_updated"


class EPPGridCoordinator:
    """Manage connection to an Everything Presence Pro device."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry: Any,
    ) -> None:
        """Initialize the coordinator."""
        self.hass = hass
        self.entry = entry

        self._host: str = entry.data.get("host", "")
        self._noise_psk: str = entry.data.get("noise_psk", "")
        self._port: int = entry.data.get("port", DEFAULT_PORT)

        self._client: APIClient | None = None
        self._reconnect_logic: ReconnectLogic | None = None
        self._connected: bool = False

        # Zone engine
        self._zone_engine = ZoneEngine()
        self._zones: list[Zone] = []

        # Calibration
        self._sensor_transform = SensorTransform()

        # Room layout
        self._room_layout: dict[str, Any] = {}

        # Target state
        self._target_x: list[float] = [0.0] * MAX_TARGETS
        self._target_y: list[float] = [0.0] * MAX_TARGETS
        self._target_speed: list[float] = [0.0] * MAX_TARGETS
        self._target_resolution: list[float] = [0.0] * MAX_TARGETS
        self._target_active: list[bool] = [False] * MAX_TARGETS

        # Sensor states
        self._static_present: bool = False
        self._pir_motion: bool = False
        self._illuminance: float | None = None
        self._temperature: float | None = None
        self._humidity: float | None = None
        self._co2: float | None = None

        # Environmental offsets (loaded from config entry options)
        offsets = entry.options.get("config", {}).get("offsets", {})
        self._illuminance_offset: float = offsets.get("illuminance", 0.0)
        self._temperature_offset: float = offsets.get("temperature", 0.0)
        self._humidity_offset: float = offsets.get("humidity", 0.0)

        # Processing result
        self._last_result: ProcessingResult = ProcessingResult()
        self._window_timer: object | None = None
        self._stale_timer: object | None = None

        # Display buffer (5 Hz rolling median for live UI)
        self._display_buffer = DisplayBuffer()
        self._last_display_snapshot: DisplaySnapshot | None = None
        self._last_display_time: float = 0.0
        self._display_subscriber_count: int = 0
        self._display_flush_scheduled: bool = False

        # ESPHome entity key mapping (populated during subscription)
        self._sensor_key_map: dict[int, str] = {}
        self._binary_sensor_key_map: dict[int, str] = {}
        self._text_sensor_key_map: dict[int, str] = {}

        # Firmware zone engine detection and state
        self._has_firmware_zone_engine: bool = False
        self._firmware_result: ProcessingResult | None = None
        self._firmware_zone_occ: dict[int, bool] = {}
        self._firmware_tracking: bool = False
        self._firmware_targets: list[TargetResult | None] = [None] * MAX_TARGETS

        # ESPHome user service cache (populated during subscribe_targets)
        self._services: dict[str, UserService] = {}

        # Dev mode: when True, always run the Python zone engine
        self._dev_mode: bool = False

        # Recording mode: dump raw LD2450 frames to JSONL
        self._recording: bool = False
        self._recording_file: IO[str] | None = None

    # -- Public properties --

    @property
    def zones(self) -> list[Zone]:
        """Return configured zones."""
        return self._zones

    def get_zone_by_slot(self, slot: int) -> Zone | None:
        """Return the zone configured in a slot, or None if empty."""
        for zone in self._zones:
            if zone.id == slot:
                return zone
        return None

    @property
    def last_result(self) -> ProcessingResult:
        """Return the active processing result.

        Firmware mode: firmware result (empty if not yet received).
        Dev mode or no firmware: Python result.
        """
        if self._has_firmware_zone_engine and not self._dev_mode:
            return self._firmware_result or ProcessingResult()
        return self._last_result

    @property
    def python_result(self) -> ProcessingResult:
        """Return the Python zone engine result (always)."""
        return self._last_result

    @property
    def display_subscriber_count(self) -> int:
        """Return the number of active display subscribers."""
        return self._display_subscriber_count

    @property
    def last_display_snapshot(self) -> DisplaySnapshot | None:
        """Return the last display snapshot."""
        return self._last_display_snapshot

    def increment_display_subscribers(self) -> None:
        """Increment the display subscriber count."""
        self._display_subscriber_count += 1

    def decrement_display_subscribers(self) -> None:
        """Decrement the display subscriber count."""
        self._display_subscriber_count = max(0, self._display_subscriber_count - 1)

    @property
    def static_present(self) -> bool:
        """Return whether static presence is detected."""
        return self._static_present

    @property
    def pir_motion(self) -> bool:
        """Return whether PIR motion is detected."""
        return self._pir_motion

    @property
    def illuminance(self) -> float | None:
        """Return the illuminance value with offset applied."""
        if self._illuminance is None:
            return None
        return max(0.0, self._illuminance + self._illuminance_offset)

    @property
    def temperature(self) -> float | None:
        """Return the temperature value with offset applied."""
        if self._temperature is None:
            return None
        return self._temperature + self._temperature_offset

    @property
    def humidity(self) -> float | None:
        """Return the humidity value with offset applied."""
        if self._humidity is None:
            return None
        return self._humidity + self._humidity_offset

    @property
    def co2(self) -> float | None:
        """Return the CO2 value."""
        return self._co2

    @property
    def device_occupied(self) -> bool:
        """Return whether the room is occupied (PIR or static or tracking)."""
        return self._pir_motion or self._static_present or self.last_result.device_tracking_present

    @property
    def target_present(self) -> bool:
        """Return whether any target is actively tracked."""
        return any(t.status == TargetStatus.ACTIVE for t in self.targets)

    @property
    def target_count(self) -> int:
        """Return the number of active targets."""
        return sum(1 for t in self.targets if t.status == TargetStatus.ACTIVE)

    def target_distance(self, index: int) -> float | None:
        """Return the distance from sensor to a target in mm."""
        targets = self.targets
        if index >= len(targets) or targets[index].status != TargetStatus.ACTIVE:
            return None
        t = targets[index]
        return (t.x * t.x + t.y * t.y) ** 0.5

    def target_speed(self, index: int) -> float | None:
        """Return the speed of a target in mm/s."""
        if index >= MAX_TARGETS or not self._target_active[index]:
            return None
        return self._target_speed[index] * 10  # ESPHome reports cm/s

    def target_resolution(self, index: int) -> float | None:
        """Return the resolution of a target in mm."""
        if index >= MAX_TARGETS or not self._target_active[index]:
            return None
        return self._target_resolution[index]

    def target_angle(self, index: int) -> float | None:
        """Return the angle from sensor to a target in degrees."""
        targets = self.targets
        if index >= len(targets) or targets[index].status != TargetStatus.ACTIVE:
            return None
        t = targets[index]
        if t.x == 0 and t.y == 0:
            return None
        import math

        return math.degrees(math.atan2(t.x, t.y))

    @property
    def has_firmware_zone_engine(self) -> bool:
        """Return whether the device firmware has a zone engine."""
        return self._has_firmware_zone_engine

    @property
    def firmware_result(self) -> ProcessingResult | None:
        """Return the last firmware zone engine result."""
        return self._firmware_result

    @property
    def dev_mode(self) -> bool:
        """Return whether dev mode is enabled."""
        return self._dev_mode

    def set_dev_mode(self, enabled: bool) -> None:
        """Enable or disable dev mode."""
        self._dev_mode = enabled
        _LOGGER.info("Dev mode %s", "enabled" if enabled else "disabled")

    def start_recording(self, path: str) -> None:
        """Start recording raw LD2450 frames to a JSONL file."""
        if self._recording:
            self.stop_recording()
        self._recording_file = open(path, "w", encoding="utf-8")  # noqa: SIM115
        self._recording = True
        _LOGGER.info("Recording started: %s", path)

    def stop_recording(self) -> str | None:
        """Stop recording and return the file path."""
        if not self._recording or self._recording_file is None:
            return None
        path = self._recording_file.name
        self._recording_file.close()
        self._recording_file = None
        self._recording = False
        _LOGGER.info("Recording stopped: %s", path)
        return path

    @property
    def recording(self) -> bool:
        """Return whether recording is active."""
        return self._recording

    @property
    def connected(self) -> bool:
        """Return whether the device is connected."""
        return self._connected

    @property
    def targets(self) -> list[TargetResult]:
        """Return the current target results from zone engine."""
        result = self.last_result
        return list(result.targets) if result else []

    @property
    def raw_targets(self) -> list[tuple[float, float, bool]]:
        """Return the raw (untransformed) target positions."""
        return [(self._target_x[i], self._target_y[i], self._target_active[i]) for i in range(MAX_TARGETS)]

    @property
    def sensor_transform(self) -> SensorTransform:
        """Return the sensor transform."""
        return self._sensor_transform

    @property
    def zone_engine(self) -> ZoneEngine:
        """Return the zone engine."""
        return self._zone_engine

    # -- Configuration methods --

    def set_zones(self, zones: list[Zone]) -> None:
        """Set the zone configuration."""
        self._zones = zones
        self._zone_engine.set_zones(zones)

    def set_sensor_transform(self, transform: SensorTransform) -> None:
        """Set the sensor transform and rebuild grid."""
        self._sensor_transform = transform
        self._rebuild_grid()

    def set_offsets(self, offsets: dict[str, float]) -> None:
        """Update environmental sensor offsets."""
        self._illuminance_offset = offsets.get("illuminance", 0.0)
        self._temperature_offset = offsets.get("temperature", 0.0)
        self._humidity_offset = offsets.get("humidity", 0.0)
        self._dispatch_sensor_update()

    def set_room_layout(self, layout: dict[str, Any]) -> None:
        """Set the room layout configuration and update the zone engine grid."""
        self._room_layout = layout
        grid_bytes = layout.get("grid_bytes")
        if grid_bytes and isinstance(grid_bytes, list):
            self._load_frontend_grid(grid_bytes)

    def _load_frontend_grid(self, grid_bytes: list[int]) -> None:
        """Create a grid matching the frontend layout and load cell bytes.

        The frontend uses a fixed grid (300mm cells) with the room
        centered horizontally. We compute the grid origin so that room
        coordinate (0, 0) maps to the correct cell.
        """
        cols = GRID_COLS
        rows = GRID_ROWS
        cell_size = GRID_CELL_SIZE_MM
        # Room is centered horizontally in the 20-col grid
        t = self._sensor_transform
        room_cols = max(1, math.ceil(t.room_width / cell_size)) if t.room_width > 0 else cols
        start_col = (cols - room_cols) // 2
        # Grid origin: room x=0 is at start_col, room y=0 is at row 0
        origin_x = -start_col * cell_size
        origin_y = 0.0
        grid = Grid(
            origin_x=origin_x,
            origin_y=origin_y,
            cols=cols,
            rows=rows,
            cell_size=cell_size,
        )
        grid.load_from_bytes(bytes(grid_bytes))
        _LOGGER.debug(
            "Loaded frontend grid: %dx%d, origin=(%.0f, %.0f), room_width=%.0f, start_col=%d",
            cols,
            rows,
            origin_x,
            origin_y,
            t.room_width,
            start_col,
        )
        self._zone_engine.set_grid(grid)

    def _rebuild_grid(self) -> None:
        """Compute grid dimensions from perspective + room size and set on zone engine."""
        t = self._sensor_transform
        if t.perspective is None:
            return
        origin_x, origin_y, cols, rows = Grid.compute_extent(t.perspective, t.room_width, t.room_depth)
        grid = Grid(origin_x=origin_x, origin_y=origin_y, cols=cols, rows=rows)
        # Mark cells inside the room rectangle as room
        for r in range(rows):
            for c in range(cols):
                cx = origin_x + (c + 0.5) * grid.cell_size
                cy = origin_y + (r + 0.5) * grid.cell_size
                if 0 <= cx < t.room_width and 0 <= cy < t.room_depth:
                    grid.cells[r * cols + c] = CELL_ROOM_BIT
        self._zone_engine.set_grid(grid)

    # -- Config push to firmware device --

    def _get_service(self, name: str) -> UserService | None:
        """Get a cached ESPHome user service by name."""
        return self._services.get(name)

    async def push_config_to_device(self) -> None:
        """Push all configuration to the firmware device."""
        if not self._has_firmware_zone_engine or self._client is None:
            return
        await self._push_perspective_to_device()
        await self._push_grid_to_device()
        await self._push_zones_to_device()

    async def _push_perspective_to_device(self) -> None:
        """Push perspective calibration to the device."""
        if not self._has_firmware_zone_engine or self._client is None:
            return
        t = self._sensor_transform
        if t.perspective is None:
            _LOGGER.debug("No perspective calibration to push")
            return
        _LOGGER.info("Pushing perspective to device: room %.0fx%.0f", t.room_width, t.room_depth)
        persp_str = ",".join(str(c) for c in t.perspective)
        service = self._get_service("epp_set_perspective")
        if service is None:
            _LOGGER.debug("epp_set_perspective service not available")
            return
        try:
            await self._client.execute_service(
                service,
                {
                    "perspective": persp_str,
                    "room_width": t.room_width,
                    "room_depth": t.room_depth,
                },
            )
        except Exception:
            _LOGGER.warning("Failed to push perspective to device")

    async def _push_grid_to_device(self) -> None:
        """Push grid configuration to the device."""
        if not self._has_firmware_zone_engine or self._client is None:
            return
        grid = self._zone_engine.grid
        if grid is None:
            _LOGGER.debug("No grid data to push")
            return
        grid_b64 = grid.to_base64()
        _LOGGER.info(
            "Pushing grid to device: %d cells, base64 len=%d, origin=(%.0f, %.0f)",
            len(grid.cells),
            len(grid_b64),
            grid.origin_x,
            grid.origin_y,
        )
        service = self._get_service("epp_set_grid")
        if service is None:
            _LOGGER.debug("epp_set_grid service not available")
            return
        try:
            await self._client.execute_service(
                service,
                {
                    "grid_data": grid_b64,
                    "origin_x": grid.origin_x,
                    "origin_y": grid.origin_y,
                },
            )
        except Exception:
            _LOGGER.warning("Failed to push grid to device")

    async def _push_zones_to_device(self) -> None:
        """Push zone configuration to the device."""
        if not self._has_firmware_zone_engine or self._client is None:
            return
        zone_data = self._build_zones_payload()
        service = self._get_service("epp_set_zones")
        if service is None:
            _LOGGER.debug("epp_set_zones service not available")
            return
        named = [s for s in zone_data.get("zone_slots", []) if s is not None]
        _LOGGER.info("Pushing zones to device: %d named zones", len(named))
        try:
            await self._client.execute_service(
                service,
                {"zones_json": json.dumps(zone_data)},
            )
        except Exception:
            _LOGGER.warning("Failed to push zones to device")

    def _build_zones_payload(self) -> dict[str, Any]:
        """Build JSON payload for epp_set_zones service."""
        zone_slots: list[dict[str, Any] | None] = []
        for z in self._zones:
            if z.id == 0:
                continue
            zone_slots.append(
                {
                    "id": z.id,
                    "type": z.type,
                    "trigger": z.trigger,
                    "renew": z.renew,
                    "timeout": z.timeout,
                    "handoff_timeout": z.handoff_timeout,
                    "entry_point": z.entry_point,
                }
            )
        # Pad to MAX_ZONES slots
        while len(zone_slots) < MAX_ZONES:
            zone_slots.append(None)
        layout = self._room_layout
        return {
            "zone_slots": zone_slots,
            "room_type": layout.get("room_type", "normal"),
            "room_trigger": layout.get("room_trigger", 5),
            "room_renew": layout.get("room_renew", 3),
            "room_timeout": layout.get("room_timeout", 10.0),
            "room_handoff_timeout": layout.get("room_handoff_timeout", 3.0),
            "room_entry_point": layout.get("room_entry_point", False),
        }

    # -- Connection management --

    async def async_connect(self) -> None:
        """Connect to the ESPHome device with automatic reconnection."""
        self._client = APIClient(
            self._host,
            self._port,
            "",
            noise_psk=self._noise_psk,
        )

        self._reconnect_logic = ReconnectLogic(
            client=self._client,
            on_connect=self._on_connect,
            on_disconnect=self._on_disconnect,
            zeroconf_instance=None,
            name=self._host,
            on_connect_error=self._on_connect_error,
        )
        await self._reconnect_logic.start()

    async def _on_connect(self) -> None:
        """Handle successful connection."""
        self._connected = True
        _LOGGER.debug("Connected to %s", self._host)
        self._sensor_key_map.clear()
        self._binary_sensor_key_map.clear()
        self._text_sensor_key_map.clear()
        self._has_firmware_zone_engine = False
        self._services.clear()
        await self.subscribe_targets()

    async def _on_disconnect(self, expected_disconnect: bool) -> None:
        """Handle disconnection — ReconnectLogic will auto-retry."""
        self._connected = False
        if not expected_disconnect:
            _LOGGER.warning("Disconnected from %s, will retry", self._host)
        else:
            _LOGGER.debug("Disconnected from %s (expected)", self._host)

    async def _on_connect_error(self, error: Exception) -> None:
        """Handle connection error during reconnection attempt."""
        _LOGGER.debug("Connection error for %s: %s", self._host, error)

    async def async_disconnect(self) -> None:
        """Disconnect from the device and stop reconnection."""
        if self._reconnect_logic is not None:
            await self._reconnect_logic.stop()
            self._reconnect_logic = None
        if self._client is not None:
            try:
                await self._client.disconnect()
            except Exception:
                _LOGGER.debug("Error disconnecting from %s", self._host)
        self._connected = False
        self._client = None

    async def subscribe_targets(self) -> None:
        """Subscribe to ESPHome state updates."""
        if self._client is None:
            return

        entities, services = await self._client.list_entities_services()

        # Cache user service definitions for config push
        self._services = {s.name: s for s in services}

        # Build key maps from entity list
        for entity_info in entities:
            object_id = getattr(entity_info, "object_id", "")
            key = getattr(entity_info, "key", None)
            if key is None:
                continue

            name = self._classify_entity(object_id)
            if name is None:
                _LOGGER.debug("Skipped entity %s (unclassified)", object_id)
                continue

            if isinstance(entity_info, BinarySensorInfo):
                self._binary_sensor_key_map[key] = name
                _LOGGER.debug(
                    "Mapped binary sensor %s (key=%s) -> %s",
                    object_id,
                    key,
                    name,
                )
            elif isinstance(entity_info, SensorInfo):
                self._sensor_key_map[key] = name
                _LOGGER.debug(
                    "Mapped sensor %s (key=%s) -> %s",
                    object_id,
                    key,
                    name,
                )
            elif isinstance(entity_info, TextSensorInfo):
                self._text_sensor_key_map[key] = name
                _LOGGER.debug(
                    "Mapped text sensor %s (key=%s) -> %s",
                    object_id,
                    key,
                    name,
                )

        # Detect firmware zone engine by presence of the version text sensor
        has_fw = "fw_version" in self._text_sensor_key_map.values()
        if has_fw and not self._has_firmware_zone_engine:
            self._has_firmware_zone_engine = True
            _LOGGER.info("Firmware zone engine detected (entity present)")
        elif not has_fw:
            self._has_firmware_zone_engine = False

        self._client.subscribe_states(self._on_state)

        # Push config after detection and subscription are complete
        if self._has_firmware_zone_engine:
            await self.push_config_to_device()

    def _classify_entity(self, object_id: str) -> str | None:
        """Classify an ESPHome entity object_id to an internal name.

        EP Pro object_ids are often prefixed with the device name, e.g.
        'everything_presence_pro_abc123_target_1_x', so we use suffix/substring
        matching rather than exact matching.
        """
        lower = object_id.lower()

        # Target sensors: *target_1_x, *target_1_y, *target_1_active, etc.
        for n in range(1, MAX_TARGETS + 1):
            if lower.endswith(f"target_{n}_x"):
                return f"target_{n}_x"
            if lower.endswith(f"target_{n}_y"):
                return f"target_{n}_y"
            if lower.endswith(f"target_{n}_speed"):
                return f"target_{n}_speed"
            if lower.endswith(f"target_{n}_resolution"):
                return f"target_{n}_resolution"
            if lower.endswith(f"target_{n}_active"):
                return f"target_{n}_active"

        # Presence sensors
        if "mmwave" in lower or "static_presence" in lower:
            return "static_presence"
        if "pir" in lower or "motion" in lower:
            return "pir_motion"

        # Firmware zone engine sensors (must match before generic environment
        # sensors to avoid false positives on substrings)
        if lower.endswith("zone_engine_version"):
            return "fw_version"
        if lower.endswith("zone_tracking"):
            return "fw_zone_tracking"
        for n in range(8):
            if lower.endswith(f"zone_{n}_occupancy"):
                return f"fw_zone_{n}_occupancy"
        for n in range(MAX_TARGETS):
            if lower.endswith(f"target_{n}_position"):
                return f"fw_target_{n}_position"

        # Environment sensors
        if "illuminance" in lower or "illumination" in lower:
            return "illuminance"
        if "temperature" in lower:
            return "temperature"
        if "humidity" in lower:
            return "humidity"
        if "co2" in lower:
            return "co2"

        return None

    def _on_state(self, state: Any) -> None:
        """Handle an incoming state update from ESPHome."""
        key = getattr(state, "key", None)
        if key is None:
            return

        # Look up in all key maps
        name = (
            self._sensor_key_map.get(key) or self._binary_sensor_key_map.get(key) or self._text_sensor_key_map.get(key)
        )
        if name is None:
            return

        if isinstance(state, BinarySensorState):
            self._handle_binary_sensor(name, state.state)
        elif isinstance(state, SensorState):
            self._handle_sensor(name, state.state)
        elif isinstance(state, TextSensorState):
            self._handle_text_sensor(name, state.state)

    def _handle_binary_sensor(self, name: str, value: bool) -> None:
        """Handle a binary sensor state update."""
        if name == "static_presence":
            self._static_present = value
            self._dispatch_sensor_update()
        elif name == "pir_motion":
            self._pir_motion = value
            self._dispatch_sensor_update()
        elif name.startswith("target_") and name.endswith("_active"):
            idx = self._target_index(name)
            if idx is not None:
                self._target_active[idx] = value
                self._schedule_rebuild()
        elif name.startswith("fw_zone_") and name.endswith("_occupancy"):
            # Firmware zone occupancy: fw_zone_0_occupancy .. fw_zone_7_occupancy
            zone_id = self._fw_zone_index(name)
            if zone_id is not None:
                self._firmware_zone_occ[zone_id] = value
                self._build_firmware_result(self._firmware_tracking)
        elif name == "fw_zone_tracking":
            # Trigger sensor: firmware zone engine tick complete
            self._firmware_tracking = value
            self._build_firmware_result(value)

    def _handle_sensor(self, name: str, value: float) -> None:
        """Handle a sensor state update."""
        if name == "illuminance":
            self._illuminance = value
            self._dispatch_sensor_update()
        elif name == "temperature":
            self._temperature = value
            self._dispatch_sensor_update()
        elif name == "humidity":
            self._humidity = value
            self._dispatch_sensor_update()
        elif name == "co2":
            self._co2 = value
            self._dispatch_sensor_update()
        elif name.startswith("target_") and name.endswith("_x"):
            idx = self._target_index(name)
            if idx is not None:
                self._target_x[idx] = value
                self._schedule_rebuild()
        elif name.startswith("target_") and name.endswith("_y"):
            idx = self._target_index(name)
            if idx is not None:
                self._target_y[idx] = value
                self._schedule_rebuild()
        elif name.startswith("target_") and name.endswith("_speed"):
            idx = self._target_index(name)
            if idx is not None:
                self._target_speed[idx] = value
                self._schedule_rebuild()
        elif name.startswith("target_") and name.endswith("_resolution"):
            idx = self._target_index(name)
            if idx is not None:
                self._target_resolution[idx] = value
                self._schedule_rebuild()

    def _handle_text_sensor(self, name: str, value: str) -> None:
        """Handle a text sensor state update."""
        _LOGGER.debug("Text sensor %s = %r", name, value)
        if name == "fw_version":
            if "zone-engine" in value:
                if not self._has_firmware_zone_engine:
                    self._has_firmware_zone_engine = True
                    _LOGGER.info("Firmware zone engine detected: %s", value)
                    try:
                        self.hass.async_create_task(self.push_config_to_device())
                    except Exception:
                        _LOGGER.exception("Failed to schedule config push")
            elif value:
                # Only disable if we received a real (non-empty) version string
                # without "zone_engine". Ignore empty/missing initial states.
                self._has_firmware_zone_engine = False
        elif name.startswith("fw_target_") and name.endswith("_position"):
            idx = self._fw_target_index(name)
            if idx is not None:
                self._firmware_targets[idx] = self._parse_fw_target_position(value)

    @staticmethod
    def _parse_fw_target_position(value: str) -> TargetResult | None:
        """Parse a firmware target position string 'x,y,signal,status'."""
        parts = value.split(",")
        if len(parts) != 4:
            return None
        try:
            x = float(parts[0])
            y = float(parts[1])
            signal = int(parts[2])
            status_str = parts[3].strip()
            status = TargetStatus(status_str)
        except (ValueError, KeyError):
            return None
        return TargetResult(x=x, y=y, signal=signal, status=status)

    def _fw_zone_index(self, name: str) -> int | None:
        """Extract zone index from fw_zone_N_occupancy."""
        # name format: fw_zone_0_occupancy
        parts = name.split("_")
        if len(parts) >= 3:
            try:
                return int(parts[2])
            except ValueError:
                pass
        return None

    def _fw_target_index(self, name: str) -> int | None:
        """Extract 0-based target index from fw_target_N_position."""
        # name format: fw_target_0_position
        parts = name.split("_")
        if len(parts) >= 3:
            try:
                n = int(parts[2])
                if 0 <= n < MAX_TARGETS:
                    return n
            except ValueError:
                pass
        return None

    def _build_firmware_result(self, tracking_present: bool) -> None:
        """Build a ProcessingResult from accumulated firmware state.

        Called when the fw_zone_tracking binary sensor updates, which
        fires on every zone engine tick in firmware.
        """
        result = ProcessingResult(
            device_tracking_present=tracking_present,
            zone_occupancy=dict(self._firmware_zone_occ),
            targets=[t if t is not None else TargetResult() for t in self._firmware_targets],
        )
        self._firmware_result = result
        async_dispatcher_send(self.hass, f"{SIGNAL_TARGETS_UPDATED}_{self.entry.entry_id}")

    def _dispatch_sensor_update(self) -> None:
        """Dispatch a signal for environment sensor updates only."""
        async_dispatcher_send(self.hass, f"{SIGNAL_SENSORS_UPDATED}_{self.entry.entry_id}")

    def _schedule_rebuild(self) -> None:
        """Feed raw target data to the zone engine on each state update."""
        now = time.monotonic()
        # Gate out targets with y==0 — the LD2450 reports this transiently
        # before it has a range fix, producing a bogus initial position.
        active = [self._target_active[i] and self._target_y[i] != 0 for i in range(MAX_TARGETS)]
        calibrated = self._build_calibrated_targets(active)
        raw = [(self._target_x[i], self._target_y[i], active[i]) for i in range(MAX_TARGETS)]

        # Write raw frame to JSONL when recording
        if self._recording and self._recording_file is not None:
            record = {
                "t": time.time(),
                "targets": [
                    {
                        "x": self._target_x[i],
                        "y": self._target_y[i],
                        "speed": self._target_speed[i],
                        "res": self._target_resolution[i],
                        "active": active[i],
                    }
                    for i in range(MAX_TARGETS)
                ],
                "pir": self._pir_motion,
                "static": self._static_present,
            }
            self._recording_file.write(json.dumps(record) + "\n")
            self._recording_file.flush()

        # Only run the Python zone engine when in dev mode or no firmware
        if self._dev_mode or not self._has_firmware_zone_engine:
            result = self._zone_engine.feed_raw(calibrated, now)

            if result is not None:
                # Window ticked — update state and dispatch
                self._last_result = result
                async_dispatcher_send(self.hass, f"{SIGNAL_TARGETS_UPDATED}_{self.entry.entry_id}")

        # Always feed the display buffer so smoothed positions are
        # available to subscribe_raw_targets and subscribe_grid_targets.
        self._last_display_snapshot = self._display_buffer.feed(calibrated, raw)

        # Schedule a single callback at the soonest pending zone expiry
        if self._dev_mode or not self._has_firmware_zone_engine:
            self._schedule_expiry_tick()

        # Safety: if sensor updates stop (unchanged values = no callbacks),
        # _last_result would go stale.  Schedule a fallback tick so the zone
        # engine still processes the "no targets" transition.
        if self._stale_timer is not None:
            self._stale_timer.cancel()
        self._stale_timer = self.hass.loop.call_later(1.5, self._stale_tick)

        # Coalesce display signal — schedule at most one per event-loop iteration
        if self._display_subscriber_count > 0 and not self._display_flush_scheduled:
            self._display_flush_scheduled = True
            self.hass.loop.call_soon(self._flush_display)

    def _flush_display(self) -> None:
        """Emit display signal (coalesced, max 5 Hz)."""
        self._display_flush_scheduled = False
        if self._display_subscriber_count <= 0:
            return

        now = time.monotonic()
        if now - self._last_display_time < 0.2:
            return

        self._last_display_time = now
        async_dispatcher_send(self.hass, f"{SIGNAL_DISPLAY_UPDATED}_{self.entry.entry_id}")

    def _stale_tick(self) -> None:
        """Feed current sensor state after sensor updates stopped flowing."""
        self._stale_timer = None
        self._schedule_rebuild()

    def _schedule_expiry_tick(self) -> None:
        """Schedule a single callback when the next pending zone should expire."""
        if self._window_timer is not None:
            self._window_timer.cancel()
            self._window_timer = None

        expiry = self._zone_engine.next_expiry()
        if expiry is None:
            return

        delay = max(0.1, expiry - time.monotonic())
        self._window_timer = self.hass.loop.call_later(delay, self._expiry_tick)

    def _expiry_tick(self) -> None:
        """Feed empty targets at timeout expiry to clear zone entity states."""
        self._window_timer = None
        if self._has_firmware_zone_engine and not self._dev_mode:
            return
        now = time.monotonic()
        empty = [(0.0, 0.0, False)] * MAX_TARGETS
        result = self._zone_engine.feed_raw(empty, now)
        if result is not None:
            self._last_result = result
            async_dispatcher_send(self.hass, f"{SIGNAL_TARGETS_UPDATED}_{self.entry.entry_id}")
        # If more zones are still pending, schedule the next expiry
        self._schedule_expiry_tick()

    def _build_calibrated_targets(
        self,
        active: list[bool],
    ) -> list[tuple[float, float, bool]]:
        """Build calibrated target list from current raw state.

        The third element indicates the target is active AND inside the
        room grid.  This drives the zone engine's tumbling window.
        """
        grid = self._zone_engine.grid
        calibrated: list[tuple[float, float, bool]] = []
        for i in range(MAX_TARGETS):
            if active[i]:
                cx, cy = self._sensor_transform.apply(self._target_x[i], self._target_y[i])
                cell = grid.xy_to_cell(cx, cy)
                inside = cell is not None and grid.cell_is_room(cell)
                calibrated.append((cx, cy, inside))
            else:
                calibrated.append((0.0, 0.0, False))
        return calibrated

    def _target_index(self, name: str) -> int | None:
        """Extract the 0-based target index from a name like target_1_x."""
        parts = name.split("_")
        if len(parts) >= 2:
            try:
                n = int(parts[1])
                if 1 <= n <= MAX_TARGETS:
                    return n - 1
            except ValueError:
                pass
        return None

    # -- Config serialization --

    def get_config_data(self) -> dict[str, Any]:
        """Serialize the current configuration to a dictionary."""
        grid = self._zone_engine.grid
        return {
            "zones": [
                {
                    "id": z.id,
                    "name": z.name,
                    "type": z.type,
                    "color": z.color,
                    "trigger": z.trigger,
                    "renew": z.renew,
                    "timeout": z.timeout,
                    "handoff_timeout": z.handoff_timeout,
                    "entry_point": z.entry_point,
                }
                for z in self._zones
            ],
            "calibration": self._sensor_transform.to_dict(),
            "grid": grid.to_base64(),
            "grid_origin_x": grid.origin_x,
            "grid_origin_y": grid.origin_y,
            "grid_cols": grid.cols,
            "grid_rows": grid.rows,
            "room_layout": self._room_layout,
            "reporting": self.entry.options.get("config", {}).get("reporting", {}),
            "offsets": {
                "illuminance": self._illuminance_offset,
                "temperature": self._temperature_offset,
                "humidity": self._humidity_offset,
            },
            "dev_mode": self._dev_mode,
            "has_firmware_zone_engine": self._has_firmware_zone_engine,
        }

    def load_config_data(self, data: dict[str, Any]) -> None:
        """Load configuration from a dictionary."""
        if not data:
            return

        # Load calibration
        cal_data = data.get("calibration")
        if cal_data:
            self._sensor_transform = SensorTransform.from_dict(cal_data)

        # Load grid
        grid_data = data.get("grid")
        if grid_data and data.get("grid_cols"):
            cols = data["grid_cols"]
            rows = data["grid_rows"]
            if cols <= GRID_COLS and rows <= GRID_ROWS:
                grid = Grid.from_base64(
                    grid_data,
                    cols=cols,
                    rows=rows,
                    origin_x=data.get("grid_origin_x", 0.0),
                    origin_y=data.get("grid_origin_y", 0.0),
                )
                self._zone_engine.set_grid(grid)
            else:
                _LOGGER.warning(
                    "Saved grid %dx%d exceeds max %dx%d, rebuilding",
                    cols,
                    rows,
                    GRID_COLS,
                    GRID_ROWS,
                )
                if cal_data and cal_data.get("perspective"):
                    self._rebuild_grid()
        elif cal_data and cal_data.get("perspective"):
            # No saved grid — compute from perspective
            self._rebuild_grid()

        # Load room layout
        self._room_layout = data.get("room_layout", {})

        # Load grid bytes from room layout (overrides base64 grid if present)
        grid_bytes = self._room_layout.get("grid_bytes")
        if grid_bytes and isinstance(grid_bytes, list):
            self._load_frontend_grid(grid_bytes)

        # Load zones from room_layout.zone_slots (new format) or data.zones (legacy)
        zone_slots = self._room_layout.get("zone_slots")
        if zone_slots:
            zones = [
                Zone(
                    id=i + 1,
                    name=z["name"],
                    type=z.get("type", ZONE_TYPE_NORMAL),
                    color=z.get("color", ""),
                    trigger=z.get("trigger", ZONE_TYPE_DEFAULTS[ZONE_TYPE_NORMAL]["trigger"]),
                    renew=z.get("renew", ZONE_TYPE_DEFAULTS[ZONE_TYPE_NORMAL]["renew"]),
                    timeout=z.get("timeout", ZONE_TYPE_DEFAULTS[ZONE_TYPE_NORMAL]["timeout"]),
                    handoff_timeout=z.get("handoff_timeout", ZONE_TYPE_DEFAULTS[ZONE_TYPE_NORMAL]["handoff_timeout"]),
                    entry_point=z.get("entry_point", False),
                )
                for i, z in enumerate(zone_slots)
                if z is not None
            ]
        else:
            zone_list = data.get("zones", [])
            zones = [
                Zone(
                    id=z["id"],
                    name=z["name"],
                    type=z.get("type", ZONE_TYPE_NORMAL),
                    color=z.get("color", ""),
                    trigger=z.get("trigger", ZONE_TYPE_DEFAULTS[ZONE_TYPE_NORMAL]["trigger"]),
                    renew=z.get("renew", ZONE_TYPE_DEFAULTS[ZONE_TYPE_NORMAL]["renew"]),
                    timeout=z.get("timeout", ZONE_TYPE_DEFAULTS[ZONE_TYPE_NORMAL]["timeout"]),
                    handoff_timeout=z.get("handoff_timeout", ZONE_TYPE_DEFAULTS[ZONE_TYPE_NORMAL]["handoff_timeout"]),
                    entry_point=z.get("entry_point", False),
                )
                for z in zone_list
            ]
        self.set_zones(zones)
