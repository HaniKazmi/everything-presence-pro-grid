"""Tests for firmware zone engine detection, result parsing, and source parameter."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from aioesphomeapi import BinarySensorInfo
from aioesphomeapi import BinarySensorState
from aioesphomeapi import SensorInfo
from aioesphomeapi import TextSensorInfo
from aioesphomeapi import TextSensorState
from aioesphomeapi import UserService
from aioesphomeapi import UserServiceArg
from aioesphomeapi import UserServiceArgType
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid.calibration import SensorTransform
from custom_components.eppgrid.const import DOMAIN
from custom_components.eppgrid.const import MAX_TARGETS
from custom_components.eppgrid.const import MAX_ZONES
from custom_components.eppgrid.coordinator import SIGNAL_TARGETS_UPDATED
from custom_components.eppgrid.coordinator import EPPGridCoordinator
from custom_components.eppgrid.zone_engine import ProcessingResult
from custom_components.eppgrid.zone_engine import TargetResult
from custom_components.eppgrid.zone_engine import TargetStatus
from custom_components.eppgrid.zone_engine import Zone


@pytest.fixture
def mock_entry() -> MagicMock:
    """Create a mock config entry."""
    entry = MagicMock()
    entry.entry_id = "test_entry_id"
    entry.data = {
        "host": "192.168.1.100",
        "noise_psk": "test_key",
    }
    entry.options = {}
    return entry


@pytest.fixture
def mock_hass() -> MagicMock:
    """Create a mock hass."""
    hass = MagicMock()
    hass.bus = MagicMock()
    return hass


@pytest.fixture
def coordinator(mock_hass: MagicMock, mock_entry: MagicMock) -> EPPGridCoordinator:
    """Create a coordinator instance for testing."""
    return EPPGridCoordinator(mock_hass, mock_entry)


# ---------------------------------------------------------------------------
# Helper: build entity list with firmware sensors
# ---------------------------------------------------------------------------


def _make_text_sensor_info(object_id: str, key: int) -> TextSensorInfo:
    """Create a TextSensorInfo with given object_id and key."""
    return TextSensorInfo(
        object_id=object_id,
        key=key,
        name=object_id,
    )


def _make_binary_sensor_info(object_id: str, key: int) -> BinarySensorInfo:
    """Create a BinarySensorInfo with given object_id and key."""
    return BinarySensorInfo(
        object_id=object_id,
        key=key,
        name=object_id,
    )


def _make_sensor_info(object_id: str, key: int) -> SensorInfo:
    """Create a SensorInfo with given object_id and key."""
    return SensorInfo(
        object_id=object_id,
        key=key,
        name=object_id,
    )


def _firmware_entity_list() -> list:
    """Build a typical firmware entity list with zone engine sensors."""
    entities = []
    key = 100

    # Firmware version text sensor
    entities.append(_make_text_sensor_info("epp_firmware_version", key))
    key += 1

    # Zone tracking binary sensor
    entities.append(_make_binary_sensor_info("epp_zone_tracking", key))
    key += 1

    # Zone occupancy binary sensors (0-7)
    for i in range(8):
        entities.append(_make_binary_sensor_info(f"epp_zone_{i}_occupancy", key))
        key += 1

    # Target position text sensors (0-2)
    for i in range(MAX_TARGETS):
        entities.append(_make_text_sensor_info(f"epp_target_{i}_position", key))
        key += 1

    # Also include standard LD2450 sensors so the coordinator still maps them
    for n in range(1, MAX_TARGETS + 1):
        entities.append(_make_sensor_info(f"target_{n}_x", key))
        key += 1
        entities.append(_make_sensor_info(f"target_{n}_y", key))
        key += 1
        entities.append(_make_binary_sensor_info(f"target_{n}_active", key))
        key += 1

    return entities


# ---------------------------------------------------------------------------
# Task 1: Firmware zone engine detection
# ---------------------------------------------------------------------------


class TestFirmwareDetection:
    """Tests for firmware zone engine capability detection."""

    def test_default_no_firmware(self, coordinator: EPPGridCoordinator) -> None:
        """By default, firmware zone engine is not detected."""
        assert coordinator.has_firmware_zone_engine is False

    def test_firmware_result_default_none(self, coordinator: EPPGridCoordinator) -> None:
        """By default, firmware result is None."""
        assert coordinator.firmware_result is None

    async def test_classify_firmware_entities(self, coordinator: EPPGridCoordinator) -> None:
        """_classify_entity recognises firmware sensor object_ids."""
        assert coordinator._classify_entity("epp_firmware_version") == "fw_version"
        assert coordinator._classify_entity("epp_zone_tracking") == "fw_zone_tracking"
        assert coordinator._classify_entity("epp_zone_0_occupancy") == "fw_zone_0_occupancy"
        assert coordinator._classify_entity("epp_zone_7_occupancy") == "fw_zone_7_occupancy"
        assert coordinator._classify_entity("epp_target_0_position") == "fw_target_0_position"
        assert coordinator._classify_entity("epp_target_2_position") == "fw_target_2_position"

    async def test_classify_prefixed_firmware_entities(self, coordinator: EPPGridCoordinator) -> None:
        """_classify_entity recognises prefixed firmware sensor object_ids."""
        assert coordinator._classify_entity("everything_presence_pro_abc_epp_firmware_version") == "fw_version"
        assert coordinator._classify_entity("my_device_epp_zone_tracking") == "fw_zone_tracking"
        assert coordinator._classify_entity("dev_epp_zone_3_occupancy") == "fw_zone_3_occupancy"
        assert coordinator._classify_entity("dev_epp_target_1_position") == "fw_target_1_position"

    async def test_subscribe_maps_firmware_entities(
        self, coordinator: EPPGridCoordinator, mock_hass: MagicMock
    ) -> None:
        """subscribe_targets correctly maps firmware entities to key maps."""
        entities = _firmware_entity_list()
        client = AsyncMock()
        client.list_entities_services = AsyncMock(return_value=(entities, []))
        client.subscribe_states = MagicMock()
        coordinator._client = client

        await coordinator.subscribe_targets()

        # Firmware version should be in text sensor key map
        assert any(v == "fw_version" for v in coordinator._text_sensor_key_map.values())
        # Zone tracking should be in binary sensor key map
        assert any(v == "fw_zone_tracking" for v in coordinator._binary_sensor_key_map.values())
        # Zone occupancy should be in binary sensor key map
        assert any(v == "fw_zone_0_occupancy" for v in coordinator._binary_sensor_key_map.values())
        # Target positions should be in text sensor key map
        assert any(v == "fw_target_0_position" for v in coordinator._text_sensor_key_map.values())

    def test_firmware_version_with_zone_engine(self, coordinator: EPPGridCoordinator) -> None:
        """Receiving firmware version with 'zone_engine' enables detection."""
        coordinator._handle_text_sensor("fw_version", "1.0.0-zone_engine")
        assert coordinator.has_firmware_zone_engine is True

    def test_firmware_version_without_zone_engine(self, coordinator: EPPGridCoordinator) -> None:
        """Receiving firmware version without 'zone_engine' disables detection."""
        coordinator._has_firmware_zone_engine = True
        coordinator._handle_text_sensor("fw_version", "1.0.0-basic")
        assert coordinator.has_firmware_zone_engine is False

    def test_firmware_detection_via_on_state(self, coordinator: EPPGridCoordinator) -> None:
        """Full path: TextSensorState routes through _on_state to detect firmware."""
        # Set up key map as if subscribe_targets ran
        coordinator._text_sensor_key_map[42] = "fw_version"

        state = TextSensorState(key=42, state="2.1.0-zone_engine-beta")
        coordinator._on_state(state)

        assert coordinator.has_firmware_zone_engine is True


# ---------------------------------------------------------------------------
# Task 2: Firmware result parsing
# ---------------------------------------------------------------------------


class TestFirmwareResultParsing:
    """Tests for firmware result accumulation and ProcessingResult building."""

    def test_parse_target_position_valid(self) -> None:
        """Valid target position string is parsed correctly."""
        result = EPPGridCoordinator._parse_fw_target_position("1500.0,2000.0,7,active")
        assert result is not None
        assert result.x == 1500.0
        assert result.y == 2000.0
        assert result.signal == 7
        assert result.status == TargetStatus.ACTIVE

    def test_parse_target_position_inactive(self) -> None:
        """Inactive target position string is parsed correctly."""
        result = EPPGridCoordinator._parse_fw_target_position("0.0,0.0,0,inactive")
        assert result is not None
        assert result.status == TargetStatus.INACTIVE

    def test_parse_target_position_pending(self) -> None:
        """Pending target position string is parsed correctly."""
        result = EPPGridCoordinator._parse_fw_target_position("800.0,1200.0,3,pending")
        assert result is not None
        assert result.status == TargetStatus.PENDING

    def test_parse_target_position_invalid_format(self) -> None:
        """Invalid format returns None."""
        assert EPPGridCoordinator._parse_fw_target_position("bad") is None
        assert EPPGridCoordinator._parse_fw_target_position("1,2,3") is None
        assert EPPGridCoordinator._parse_fw_target_position("") is None

    def test_parse_target_position_invalid_status(self) -> None:
        """Invalid status string returns None."""
        assert EPPGridCoordinator._parse_fw_target_position("1.0,2.0,3,bogus") is None

    def test_parse_target_position_invalid_numbers(self) -> None:
        """Non-numeric values return None."""
        assert EPPGridCoordinator._parse_fw_target_position("abc,def,ghi,active") is None

    def test_fw_zone_index(self, coordinator: EPPGridCoordinator) -> None:
        """_fw_zone_index extracts zone id from name."""
        assert coordinator._fw_zone_index("fw_zone_0_occupancy") == 0
        assert coordinator._fw_zone_index("fw_zone_5_occupancy") == 5
        assert coordinator._fw_zone_index("fw_zone_7_occupancy") == 7

    def test_fw_target_index(self, coordinator: EPPGridCoordinator) -> None:
        """_fw_target_index extracts 0-based target index."""
        assert coordinator._fw_target_index("fw_target_0_position") == 0
        assert coordinator._fw_target_index("fw_target_1_position") == 1
        assert coordinator._fw_target_index("fw_target_2_position") == 2

    def test_fw_target_index_out_of_range(self, coordinator: EPPGridCoordinator) -> None:
        """_fw_target_index returns None for out-of-range indices."""
        assert coordinator._fw_target_index("fw_target_3_position") is None
        assert coordinator._fw_target_index("fw_target_99_position") is None

    def test_accumulate_zone_occupancy(self, coordinator: EPPGridCoordinator) -> None:
        """Binary sensor updates accumulate zone occupancy state."""
        coordinator._handle_binary_sensor("fw_zone_0_occupancy", True)
        coordinator._handle_binary_sensor("fw_zone_1_occupancy", False)
        coordinator._handle_binary_sensor("fw_zone_3_occupancy", True)

        assert coordinator._firmware_zone_occ[0] is True
        assert coordinator._firmware_zone_occ[1] is False
        assert coordinator._firmware_zone_occ[3] is True

    def test_accumulate_target_positions(self, coordinator: EPPGridCoordinator) -> None:
        """Text sensor updates accumulate target positions."""
        coordinator._handle_text_sensor("fw_target_0_position", "1000.0,2000.0,8,active")
        coordinator._handle_text_sensor("fw_target_1_position", "500.0,1500.0,5,pending")

        t0 = coordinator._firmware_targets[0]
        assert t0 is not None
        assert t0.x == 1000.0
        assert t0.y == 2000.0
        assert t0.status == TargetStatus.ACTIVE

        t1 = coordinator._firmware_targets[1]
        assert t1 is not None
        assert t1.status == TargetStatus.PENDING

    def test_build_firmware_result(self, coordinator: EPPGridCoordinator) -> None:
        """Zone tracking trigger builds complete ProcessingResult."""
        # Accumulate some state
        coordinator._firmware_zone_occ[0] = True
        coordinator._firmware_zone_occ[1] = False
        coordinator._firmware_targets[0] = TargetResult(x=1000.0, y=2000.0, signal=7, status=TargetStatus.ACTIVE)

        # Trigger build
        coordinator._build_firmware_result(True)

        result = coordinator.firmware_result
        assert result is not None
        assert result.device_tracking_present is True
        assert result.zone_occupancy[0] is True
        assert result.zone_occupancy[1] is False
        assert len(result.targets) == MAX_TARGETS
        assert result.targets[0].x == 1000.0
        assert result.targets[0].status == TargetStatus.ACTIVE
        # Unfilled targets default to inactive
        assert result.targets[1].status == TargetStatus.INACTIVE
        assert result.targets[2].status == TargetStatus.INACTIVE

    def test_build_firmware_result_dispatches_signal(self, coordinator: EPPGridCoordinator) -> None:
        """_build_firmware_result dispatches SIGNAL_TARGETS_UPDATED."""
        with patch("custom_components.eppgrid.coordinator.async_dispatcher_send") as mock_dispatch:
            coordinator._build_firmware_result(False)
            mock_dispatch.assert_called_once_with(
                coordinator.hass,
                f"{SIGNAL_TARGETS_UPDATED}_{coordinator.entry.entry_id}",
            )
            assert coordinator.firmware_result is not None

    def test_full_firmware_state_cycle(self, coordinator: EPPGridCoordinator) -> None:
        """Full cycle: text + binary sensor updates, then trigger builds result."""
        # Set up key maps
        coordinator._text_sensor_key_map[10] = "fw_version"
        coordinator._text_sensor_key_map[11] = "fw_target_0_position"
        coordinator._text_sensor_key_map[12] = "fw_target_1_position"
        coordinator._binary_sensor_key_map[20] = "fw_zone_0_occupancy"
        coordinator._binary_sensor_key_map[21] = "fw_zone_1_occupancy"
        coordinator._binary_sensor_key_map[22] = "fw_zone_tracking"

        # Firmware version arrives
        coordinator._on_state(TextSensorState(key=10, state="1.0.0-zone_engine"))
        assert coordinator.has_firmware_zone_engine is True

        # Zone occupancy updates
        coordinator._on_state(BinarySensorState(key=20, state=True))
        coordinator._on_state(BinarySensorState(key=21, state=False))

        # Target position updates
        coordinator._on_state(TextSensorState(key=11, state="1500.0,2500.0,8,active"))
        coordinator._on_state(TextSensorState(key=12, state="0.0,0.0,0,inactive"))

        # Zone tracking trigger
        coordinator._on_state(BinarySensorState(key=22, state=True))

        result = coordinator.firmware_result
        assert result is not None
        assert result.device_tracking_present is True
        assert result.zone_occupancy[0] is True
        assert result.zone_occupancy[1] is False
        assert result.targets[0].x == 1500.0
        assert result.targets[0].status == TargetStatus.ACTIVE
        assert result.targets[1].status == TargetStatus.INACTIVE


# ---------------------------------------------------------------------------
# Task 3: Source parameter in subscribe_grid_targets (websocket)
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _clear_ws_registered():
    """Clear the global WS registration guard between tests."""
    from custom_components.eppgrid import websocket_api

    websocket_api._REGISTERED.discard(DOMAIN)
    yield
    websocket_api._REGISTERED.discard(DOMAIN)


@pytest.fixture
async def setup_integration(
    hass: HomeAssistant, mock_config_entry: MockConfigEntry, mock_esphome_client: AsyncMock
) -> MockConfigEntry:
    """Set up the integration for WS tests and return the entry."""
    mock_http = MagicMock()
    mock_http.async_register_static_paths = AsyncMock()
    hass.http = mock_http

    with patch(
        "custom_components.eppgrid.panel_custom.async_register_panel",
        new_callable=AsyncMock,
    ):
        await hass.config_entries.async_setup(mock_config_entry.entry_id)
        await hass.async_block_till_done()
    return mock_config_entry


class TestSubscribeGridTargetsSource:
    """Tests for the source parameter on subscribe_grid_targets."""

    async def test_subscribe_default_source(
        self, hass: HomeAssistant, hass_ws_client: Any, setup_integration: MockConfigEntry
    ) -> None:
        """Default source parameter is 'firmware'."""
        entry = setup_integration
        ws_client = await hass_ws_client(hass)

        await ws_client.send_json(
            {
                "id": 1,
                "type": "eppgrid/subscribe_grid_targets",
                "entry_id": entry.entry_id,
            }
        )
        msg = await ws_client.receive_json()
        assert msg["success"] is True

        # Should get an event with zone data (from Python engine since no firmware)
        msg = await ws_client.receive_json()
        assert msg["type"] == "event"
        assert "zones" in msg["event"]

    async def test_subscribe_source_python(
        self, hass: HomeAssistant, hass_ws_client: Any, setup_integration: MockConfigEntry
    ) -> None:
        """Explicitly requesting source=python uses the Python engine result."""
        entry = setup_integration
        ws_client = await hass_ws_client(hass)

        await ws_client.send_json(
            {
                "id": 1,
                "type": "eppgrid/subscribe_grid_targets",
                "entry_id": entry.entry_id,
                "source": "python",
            }
        )
        msg = await ws_client.receive_json()
        assert msg["success"] is True

        msg = await ws_client.receive_json()
        assert msg["type"] == "event"
        assert "zones" in msg["event"]

    async def test_subscribe_source_firmware_fallback_to_python(
        self, hass: HomeAssistant, hass_ws_client: Any, setup_integration: MockConfigEntry
    ) -> None:
        """source=firmware falls back to Python when firmware not available."""
        entry = setup_integration
        coordinator = entry.runtime_data
        assert coordinator.has_firmware_zone_engine is False

        ws_client = await hass_ws_client(hass)

        await ws_client.send_json(
            {
                "id": 1,
                "type": "eppgrid/subscribe_grid_targets",
                "entry_id": entry.entry_id,
                "source": "firmware",
            }
        )
        msg = await ws_client.receive_json()
        assert msg["success"] is True

        msg = await ws_client.receive_json()
        assert msg["type"] == "event"
        event = msg["event"]
        # Falls back to Python engine result (default empty)
        assert event["zones"]["frame_count"] == 0

    async def test_subscribe_source_firmware_uses_firmware_result(
        self, hass: HomeAssistant, hass_ws_client: Any, setup_integration: MockConfigEntry
    ) -> None:
        """source=firmware uses firmware result when available."""
        entry = setup_integration
        coordinator = entry.runtime_data

        # Simulate firmware detection and result
        coordinator._has_firmware_zone_engine = True
        coordinator._firmware_result = ProcessingResult(
            device_tracking_present=True,
            zone_occupancy={0: True, 1: False},
            zone_target_counts={0: 5},
            frame_count=10,
            targets=[
                TargetResult(x=1000.0, y=2000.0, signal=7, status=TargetStatus.ACTIVE),
                TargetResult(),
                TargetResult(),
            ],
            debug_log="firmware test",
        )

        ws_client = await hass_ws_client(hass)

        await ws_client.send_json(
            {
                "id": 1,
                "type": "eppgrid/subscribe_grid_targets",
                "entry_id": entry.entry_id,
                "source": "firmware",
            }
        )
        msg = await ws_client.receive_json()
        assert msg["success"] is True

        msg = await ws_client.receive_json()
        assert msg["type"] == "event"
        event = msg["event"]
        # Should use firmware result
        assert event["zones"]["frame_count"] == 10
        # JSON serialises integer keys as strings
        assert event["zones"]["occupancy"] == {"0": True, "1": False}
        assert event["zones"]["debug_log"] == "firmware test"
        # Target status from firmware result
        assert event["targets"][0]["status"] == "active"

    async def test_subscribe_source_python_ignores_firmware(
        self, hass: HomeAssistant, hass_ws_client: Any, setup_integration: MockConfigEntry
    ) -> None:
        """source=python always uses Python engine even when firmware is available."""
        entry = setup_integration
        coordinator = entry.runtime_data

        # Simulate firmware detection and result
        coordinator._has_firmware_zone_engine = True
        coordinator._firmware_result = ProcessingResult(
            device_tracking_present=True,
            frame_count=99,
            debug_log="firmware",
        )

        ws_client = await hass_ws_client(hass)

        await ws_client.send_json(
            {
                "id": 1,
                "type": "eppgrid/subscribe_grid_targets",
                "entry_id": entry.entry_id,
                "source": "python",
            }
        )
        msg = await ws_client.receive_json()
        assert msg["success"] is True

        msg = await ws_client.receive_json()
        assert msg["type"] == "event"
        event = msg["event"]
        # Should use Python result (frame_count 0 = default empty)
        assert event["zones"]["frame_count"] == 0
        assert event["zones"]["debug_log"] == ""


# ---------------------------------------------------------------------------
# Task 4: Configuration push to device
# ---------------------------------------------------------------------------


def _make_user_service(name: str, arg_names: list[str]) -> UserService:
    """Create a UserService with string args for testing."""
    return UserService(
        name=name,
        key=0,
        args=[UserServiceArg(name=n, type=UserServiceArgType.STRING) for n in arg_names],
    )


def _firmware_services() -> list[UserService]:
    """Create the firmware ESPHome user services."""
    return [
        _make_user_service("epp_set_perspective", ["perspective", "room_width", "room_depth"]),
        _make_user_service("epp_set_grid", ["grid_data", "origin_x", "origin_y"]),
        _make_user_service("epp_set_zones", ["zones_json"]),
    ]


class TestConfigPush:
    """Tests for configuration push to firmware device."""

    async def test_push_config_skipped_no_firmware(self, coordinator: EPPGridCoordinator) -> None:
        """push_config_to_device is a no-op when no firmware zone engine."""
        client = AsyncMock()
        coordinator._client = client
        coordinator._has_firmware_zone_engine = False

        await coordinator.push_config_to_device()
        client.execute_service.assert_not_called()

    async def test_push_config_skipped_no_client(self, coordinator: EPPGridCoordinator) -> None:
        """push_config_to_device is a no-op when client is None."""
        coordinator._has_firmware_zone_engine = True
        coordinator._client = None

        await coordinator.push_config_to_device()
        # No exception, nothing to assert — just verifying no crash

    async def test_push_perspective_calls_execute_service(self, coordinator: EPPGridCoordinator) -> None:
        """Push perspective calls execute_service with correct data."""
        client = AsyncMock()
        coordinator._client = client
        coordinator._has_firmware_zone_engine = True
        coordinator._services = {s.name: s for s in _firmware_services()}
        coordinator._sensor_transform = SensorTransform(
            perspective=[1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
            room_width=5000.0,
            room_depth=4000.0,
        )

        await coordinator._push_perspective_to_device()

        client.execute_service.assert_called_once()
        call_args = client.execute_service.call_args
        service = call_args[0][0]
        data = call_args[0][1]
        assert service.name == "epp_set_perspective"
        assert data["perspective"] == "1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0"
        assert data["room_width"] == 5000.0
        assert data["room_depth"] == 4000.0

    async def test_push_perspective_skipped_no_perspective(self, coordinator: EPPGridCoordinator) -> None:
        """Push perspective is skipped when no perspective transform is set."""
        client = AsyncMock()
        coordinator._client = client
        coordinator._has_firmware_zone_engine = True
        coordinator._services = {s.name: s for s in _firmware_services()}
        # Default SensorTransform has perspective=None

        await coordinator._push_perspective_to_device()
        client.execute_service.assert_not_called()

    async def test_push_grid_calls_execute_service(self, coordinator: EPPGridCoordinator) -> None:
        """Push grid calls execute_service with correct data."""
        client = AsyncMock()
        coordinator._client = client
        coordinator._has_firmware_zone_engine = True
        coordinator._services = {s.name: s for s in _firmware_services()}

        await coordinator._push_grid_to_device()

        client.execute_service.assert_called_once()
        call_args = client.execute_service.call_args
        service = call_args[0][0]
        data = call_args[0][1]
        assert service.name == "epp_set_grid"
        assert "grid_data" in data
        assert "origin_x" in data
        assert "origin_y" in data

    async def test_push_zones_calls_execute_service(self, coordinator: EPPGridCoordinator) -> None:
        """Push zones calls execute_service with correct data."""
        client = AsyncMock()
        coordinator._client = client
        coordinator._has_firmware_zone_engine = True
        coordinator._services = {s.name: s for s in _firmware_services()}
        coordinator.set_zones(
            [
                Zone(id=1, name="Kitchen", type="normal"),
                Zone(id=2, name="Living", type="rest"),
            ]
        )

        await coordinator._push_zones_to_device()

        client.execute_service.assert_called_once()
        call_args = client.execute_service.call_args
        service = call_args[0][0]
        data = call_args[0][1]
        assert service.name == "epp_set_zones"
        import json

        zones_payload = json.loads(data["zones_json"])
        assert len(zones_payload["zone_slots"]) == MAX_ZONES
        assert zones_payload["zone_slots"][0]["id"] == 1
        assert zones_payload["zone_slots"][1]["id"] == 2
        # Remaining slots should be None
        assert zones_payload["zone_slots"][2] is None

    async def test_push_config_service_not_found(self, coordinator: EPPGridCoordinator) -> None:
        """Push methods gracefully handle missing services."""
        client = AsyncMock()
        coordinator._client = client
        coordinator._has_firmware_zone_engine = True
        coordinator._services = {}  # No services cached
        coordinator._sensor_transform = SensorTransform(
            perspective=[1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
            room_width=5000.0,
            room_depth=4000.0,
        )

        # Should not raise, should not call execute_service
        await coordinator.push_config_to_device()
        client.execute_service.assert_not_called()

    async def test_push_config_execute_service_error(self, coordinator: EPPGridCoordinator) -> None:
        """Push methods handle execute_service errors gracefully."""
        client = AsyncMock()
        client.execute_service = AsyncMock(side_effect=Exception("connection lost"))
        coordinator._client = client
        coordinator._has_firmware_zone_engine = True
        coordinator._services = {s.name: s for s in _firmware_services()}
        coordinator._sensor_transform = SensorTransform(
            perspective=[1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
            room_width=5000.0,
            room_depth=4000.0,
        )

        # Should not raise
        await coordinator._push_perspective_to_device()

    async def test_subscribe_targets_caches_services(self, coordinator: EPPGridCoordinator) -> None:
        """subscribe_targets populates the service cache."""
        entities = _firmware_entity_list()
        services = _firmware_services()
        client = AsyncMock()
        client.list_entities_services = AsyncMock(return_value=(entities, services))
        client.subscribe_states = MagicMock()
        coordinator._client = client

        await coordinator.subscribe_targets()

        assert "epp_set_perspective" in coordinator._services
        assert "epp_set_grid" in coordinator._services
        assert "epp_set_zones" in coordinator._services

    def test_build_zones_payload(self, coordinator: EPPGridCoordinator) -> None:
        """_build_zones_payload builds correct structure."""
        coordinator.set_zones(
            [
                Zone(id=1, name="Zone A", type="normal"),
            ]
        )
        coordinator._room_layout = {"room_type": "entrance", "room_trigger": 3}

        payload = coordinator._build_zones_payload()

        assert len(payload["zone_slots"]) == MAX_ZONES
        assert payload["zone_slots"][0]["id"] == 1
        assert payload["zone_slots"][0]["type"] == "normal"
        assert payload["zone_slots"][1] is None
        assert payload["room_type"] == "entrance"
        assert payload["room_trigger"] == 3


# ---------------------------------------------------------------------------
# Task 5: Dev mode toggle
# ---------------------------------------------------------------------------


class TestDevMode:
    """Tests for dev mode toggle."""

    def test_dev_mode_default_off(self, coordinator: EPPGridCoordinator) -> None:
        """Dev mode is off by default."""
        assert coordinator.dev_mode is False

    def test_set_dev_mode_on(self, coordinator: EPPGridCoordinator) -> None:
        """set_dev_mode enables dev mode."""
        coordinator.set_dev_mode(True)
        assert coordinator.dev_mode is True

    def test_set_dev_mode_off(self, coordinator: EPPGridCoordinator) -> None:
        """set_dev_mode disables dev mode."""
        coordinator.set_dev_mode(True)
        coordinator.set_dev_mode(False)
        assert coordinator.dev_mode is False

    async def test_websocket_set_dev_mode(
        self,
        hass: HomeAssistant,
        hass_ws_client: Any,
        setup_integration: MockConfigEntry,
    ) -> None:
        """Websocket command sets dev mode on coordinator."""
        entry = setup_integration
        coordinator = entry.runtime_data
        assert coordinator.dev_mode is False

        ws_client = await hass_ws_client(hass)

        await ws_client.send_json(
            {
                "id": 1,
                "type": "eppgrid/set_dev_mode",
                "entry_id": entry.entry_id,
                "enabled": True,
            }
        )
        msg = await ws_client.receive_json()
        assert msg["success"] is True
        assert coordinator.dev_mode is True

        # Disable
        await ws_client.send_json(
            {
                "id": 2,
                "type": "eppgrid/set_dev_mode",
                "entry_id": entry.entry_id,
                "enabled": False,
            }
        )
        msg = await ws_client.receive_json()
        assert msg["success"] is True
        assert coordinator.dev_mode is False

    async def test_websocket_set_dev_mode_not_found(
        self,
        hass: HomeAssistant,
        hass_ws_client: Any,
        setup_integration: MockConfigEntry,
    ) -> None:
        """Websocket command returns error for invalid entry_id."""
        ws_client = await hass_ws_client(hass)

        await ws_client.send_json(
            {
                "id": 1,
                "type": "eppgrid/set_dev_mode",
                "entry_id": "nonexistent",
                "enabled": True,
            }
        )
        msg = await ws_client.receive_json()
        assert msg["success"] is False


# ---------------------------------------------------------------------------
# Task 6: Entity source switching (last_result returns firmware/python)
# ---------------------------------------------------------------------------


class TestEntitySourceSwitching:
    """Tests for last_result source switching based on firmware and dev mode."""

    def test_last_result_default_python(self, coordinator: EPPGridCoordinator) -> None:
        """Without firmware, last_result returns the Python result."""
        assert coordinator.has_firmware_zone_engine is False
        result = coordinator.last_result
        # Should be the default ProcessingResult
        assert result.frame_count == 0

    def test_last_result_firmware_when_available(self, coordinator: EPPGridCoordinator) -> None:
        """With firmware and no dev mode, last_result returns firmware result."""
        coordinator._has_firmware_zone_engine = True
        fw_result = ProcessingResult(
            device_tracking_present=True,
            frame_count=42,
            zone_occupancy={1: True},
        )
        coordinator._firmware_result = fw_result

        result = coordinator.last_result
        assert result is fw_result
        assert result.frame_count == 42

    def test_last_result_firmware_none_falls_back(self, coordinator: EPPGridCoordinator) -> None:
        """With firmware but None firmware_result, falls back to Python result."""
        coordinator._has_firmware_zone_engine = True
        coordinator._firmware_result = None

        result = coordinator.last_result
        assert result.frame_count == 0

    def test_last_result_dev_mode_uses_python(self, coordinator: EPPGridCoordinator) -> None:
        """With firmware and dev mode on, last_result returns Python result."""
        coordinator._has_firmware_zone_engine = True
        coordinator._dev_mode = True
        coordinator._firmware_result = ProcessingResult(frame_count=99)
        coordinator._last_result = ProcessingResult(frame_count=7)

        result = coordinator.last_result
        assert result.frame_count == 7

    def test_targets_property_uses_active_result(self, coordinator: EPPGridCoordinator) -> None:
        """targets property follows last_result source switching."""
        fw_target = TargetResult(x=100.0, y=200.0, signal=5, status=TargetStatus.ACTIVE)
        coordinator._has_firmware_zone_engine = True
        coordinator._firmware_result = ProcessingResult(
            targets=[fw_target, TargetResult(), TargetResult()],
        )

        targets = coordinator.targets
        assert len(targets) == 3
        assert targets[0].x == 100.0
        assert targets[0].status == TargetStatus.ACTIVE

    def test_device_occupied_uses_active_result(self, coordinator: EPPGridCoordinator) -> None:
        """device_occupied uses the active result's tracking present flag."""
        coordinator._has_firmware_zone_engine = True
        coordinator._firmware_result = ProcessingResult(device_tracking_present=True)

        assert coordinator.device_occupied is True

    def test_zone_occupancy_sensor_uses_active_result(self, coordinator: EPPGridCoordinator) -> None:
        """Zone occupancy binary sensor reads from the active result."""
        coordinator._has_firmware_zone_engine = True
        coordinator._firmware_result = ProcessingResult(
            zone_occupancy={1: True, 2: False},
        )

        result = coordinator.last_result
        assert result.zone_occupancy.get(1) is True
        assert result.zone_occupancy.get(2) is False

    def test_get_config_data_includes_dev_mode(self, coordinator: EPPGridCoordinator) -> None:
        """get_config_data includes dev_mode and has_firmware_zone_engine."""
        data = coordinator.get_config_data()
        assert "dev_mode" in data
        assert data["dev_mode"] is False
        assert "has_firmware_zone_engine" in data
        assert data["has_firmware_zone_engine"] is False

        coordinator.set_dev_mode(True)
        coordinator._has_firmware_zone_engine = True
        data = coordinator.get_config_data()
        assert data["dev_mode"] is True
        assert data["has_firmware_zone_engine"] is True


# ---------------------------------------------------------------------------
# Task 5 additional: Python zone engine gating in _schedule_rebuild
# ---------------------------------------------------------------------------


class TestZoneEngineGating:
    """Tests that _schedule_rebuild gates the Python zone engine correctly."""

    def test_python_engine_runs_without_firmware(self, coordinator: EPPGridCoordinator) -> None:
        """Python zone engine runs when no firmware zone engine is detected."""
        coordinator._has_firmware_zone_engine = False
        coordinator._dev_mode = False

        with patch.object(coordinator._zone_engine, "feed_raw", return_value=None) as mock_feed:
            coordinator._schedule_rebuild()
            mock_feed.assert_called_once()

    def test_python_engine_runs_in_dev_mode(self, coordinator: EPPGridCoordinator) -> None:
        """Python zone engine runs when dev mode is enabled, even with firmware."""
        coordinator._has_firmware_zone_engine = True
        coordinator._dev_mode = True

        with patch.object(coordinator._zone_engine, "feed_raw", return_value=None) as mock_feed:
            coordinator._schedule_rebuild()
            mock_feed.assert_called_once()

    def test_python_engine_skipped_with_firmware(self, coordinator: EPPGridCoordinator) -> None:
        """Python zone engine is skipped when firmware detected and dev mode off."""
        coordinator._has_firmware_zone_engine = True
        coordinator._dev_mode = False

        with patch.object(coordinator._zone_engine, "feed_raw", return_value=None) as mock_feed:
            coordinator._schedule_rebuild()
            mock_feed.assert_not_called()
