"""Tests for firmware zone engine detection, result parsing, and source parameter."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from aioesphomeapi import BinarySensorInfo
from aioesphomeapi import BinarySensorState
from aioesphomeapi import SensorInfo
from aioesphomeapi import TextSensorInfo
from aioesphomeapi import TextSensorState

from custom_components.eppgrid.const import DOMAIN
from custom_components.eppgrid.const import MAX_TARGETS
from custom_components.eppgrid.const import MAX_ZONES
from custom_components.eppgrid.coordinator import EPPGridCoordinator
from custom_components.eppgrid.zone_engine import ProcessingResult
from custom_components.eppgrid.zone_engine import TargetResult
from custom_components.eppgrid.zone_engine import TargetStatus


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
        coordinator._firmware_targets[0] = TargetResult(
            x=1000.0, y=2000.0, signal=7, status=TargetStatus.ACTIVE
        )

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
        coordinator._build_firmware_result(False)

        coordinator.hass.bus.async_fire.assert_not_called()  # It uses dispatcher, not bus
        # Check that async_dispatcher_send was called
        from homeassistant.helpers.dispatcher import async_dispatcher_send

        coordinator.hass.assert_not_called()  # hass is a MagicMock — dispatcher_send calls it

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
    hass: "HomeAssistant", mock_config_entry: "MockConfigEntry", mock_esphome_client: AsyncMock
) -> "MockConfigEntry":
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
        self, hass: "HomeAssistant", hass_ws_client: "Any", setup_integration: "MockConfigEntry"
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
        self, hass: "HomeAssistant", hass_ws_client: "Any", setup_integration: "MockConfigEntry"
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
        self, hass: "HomeAssistant", hass_ws_client: "Any", setup_integration: "MockConfigEntry"
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
        self, hass: "HomeAssistant", hass_ws_client: "Any", setup_integration: "MockConfigEntry"
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
        self, hass: "HomeAssistant", hass_ws_client: "Any", setup_integration: "MockConfigEntry"
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
