"""Tests for the pure or_presence aggregation function."""

from __future__ import annotations

from custom_components.eppgrid.device_groups._aggregation import or_presence


class TestOrPresence:
    """Truth-table for or_presence over presence states."""

    def test_all_off_returns_false(self) -> None:
        assert or_presence(["off", "off", "off"]) is False

    def test_any_on_returns_true(self) -> None:
        assert or_presence(["off", "on", "off"]) is True

    def test_all_on_returns_true(self) -> None:
        assert or_presence(["on", "on"]) is True

    def test_all_none_returns_none(self) -> None:
        """No contributing sources -> unavailable (None)."""
        assert or_presence([None, None]) is None

    def test_all_unavailable_strings_return_none(self) -> None:
        assert or_presence(["unavailable", "unknown"]) is None

    def test_on_with_unavailable_returns_true(self) -> None:
        assert or_presence(["on", "unavailable"]) is True

    def test_off_with_unavailable_returns_false(self) -> None:
        """Off with one offline -> False (the online source said clear)."""
        assert or_presence(["off", "unavailable"]) is False

    def test_empty_list_returns_none(self) -> None:
        assert or_presence([]) is None
