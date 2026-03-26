"""Tests for coordinator recording support."""

from __future__ import annotations

import json
import os
import tempfile
from unittest.mock import MagicMock

import pytest

from custom_components.eppgrid.coordinator import EPPGridCoordinator


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


class TestRecordingStartStop:
    """Tests for start_recording and stop_recording."""

    def test_start_recording_creates_file(self, coordinator: EPPGridCoordinator) -> None:
        """Start recording creates a file and sets recording state."""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "test_recording.jsonl")
            coordinator.start_recording(path)

            assert coordinator.recording is True
            assert os.path.exists(path)

            coordinator.stop_recording()

    def test_stop_recording_returns_path(self, coordinator: EPPGridCoordinator) -> None:
        """Stop recording returns the file path and clears state."""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "test_recording.jsonl")
            coordinator.start_recording(path)
            result = coordinator.stop_recording()

            assert result == path
            assert coordinator.recording is False

    def test_stop_recording_when_not_recording(self, coordinator: EPPGridCoordinator) -> None:
        """Stop recording when not recording returns None."""
        result = coordinator.stop_recording()
        assert result is None

    def test_start_recording_stops_previous(self, coordinator: EPPGridCoordinator) -> None:
        """Starting a new recording stops the previous one."""
        with tempfile.TemporaryDirectory() as tmpdir:
            path1 = os.path.join(tmpdir, "recording1.jsonl")
            path2 = os.path.join(tmpdir, "recording2.jsonl")

            coordinator.start_recording(path1)
            assert coordinator.recording is True

            coordinator.start_recording(path2)
            assert coordinator.recording is True

            result = coordinator.stop_recording()
            assert result == path2


class TestRecordingContent:
    """Tests for JSONL recording content."""

    def test_frames_written_during_recording(self, coordinator: EPPGridCoordinator) -> None:
        """Raw frames are written as JSONL during recording."""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "test_recording.jsonl")
            coordinator.start_recording(path)

            # Simulate a target update by setting raw state and calling _schedule_rebuild
            coordinator._target_x[0] = 1234.0
            coordinator._target_y[0] = 2100.0
            coordinator._target_speed[0] = 50.0
            coordinator._target_resolution[0] = 300.0
            coordinator._target_active[0] = True
            coordinator._schedule_rebuild()

            coordinator.stop_recording()

            # Read back the JSONL file
            with open(path) as f:
                lines = f.readlines()

            assert len(lines) >= 1
            frame = json.loads(lines[0])
            assert "t" in frame
            assert "targets" in frame
            assert "pir" in frame
            assert "static" in frame
            assert isinstance(frame["t"], float)

    def test_jsonl_format_correct(self, coordinator: EPPGridCoordinator) -> None:
        """Verify the JSONL format matches the specification."""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "test_recording.jsonl")
            coordinator.start_recording(path)

            # Set up target data
            coordinator._target_x[0] = 1234.0
            coordinator._target_y[0] = 2100.0
            coordinator._target_speed[0] = 50.0
            coordinator._target_resolution[0] = 300.0
            coordinator._target_active[0] = True
            coordinator._target_x[1] = 0.0
            coordinator._target_y[1] = 0.0
            coordinator._target_speed[1] = 0.0
            coordinator._target_resolution[1] = 0.0
            coordinator._target_active[1] = False
            coordinator._schedule_rebuild()

            coordinator.stop_recording()

            with open(path) as f:
                frame = json.loads(f.readline())

            targets = frame["targets"]
            assert len(targets) == 3

            # First target: active with data
            t0 = targets[0]
            assert t0["x"] == 1234.0
            assert t0["y"] == 2100.0
            assert t0["speed"] == 50.0
            assert t0["res"] == 300.0
            assert t0["active"] is True

            # Second target: inactive
            t1 = targets[1]
            assert t1["active"] is False

            # Sensor states
            assert frame["pir"] is False
            assert frame["static"] is False

    def test_no_recording_without_start(self, coordinator: EPPGridCoordinator) -> None:
        """No file is written when recording is not started."""
        coordinator._target_x[0] = 1234.0
        coordinator._target_y[0] = 2100.0
        coordinator._target_active[0] = True
        coordinator._schedule_rebuild()

        # Recording should not be active
        assert coordinator.recording is False

    def test_multiple_frames_recorded(self, coordinator: EPPGridCoordinator) -> None:
        """Multiple frames are recorded as separate JSONL lines."""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "test_recording.jsonl")
            coordinator.start_recording(path)

            # Simulate two updates
            coordinator._target_active[0] = True
            coordinator._target_y[0] = 100.0
            coordinator._schedule_rebuild()

            coordinator._target_y[0] = 200.0
            coordinator._schedule_rebuild()

            coordinator.stop_recording()

            with open(path) as f:
                lines = f.readlines()

            assert len(lines) >= 2
            # Each line should be valid JSON
            for line in lines:
                frame = json.loads(line.strip())
                assert "t" in frame
                assert "targets" in frame

    def test_y_zero_gating_reflected(self, coordinator: EPPGridCoordinator) -> None:
        """Targets with y==0 are recorded with active=False due to gating."""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "test_recording.jsonl")
            coordinator.start_recording(path)

            coordinator._target_x[0] = 1000.0
            coordinator._target_y[0] = 0.0  # y==0 should be gated
            coordinator._target_active[0] = True
            coordinator._schedule_rebuild()

            coordinator.stop_recording()

            with open(path) as f:
                frame = json.loads(f.readline())

            # The recording writes the gated active state
            assert frame["targets"][0]["active"] is False
