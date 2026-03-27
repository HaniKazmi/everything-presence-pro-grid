"""Shared test fixtures for EPP Grid integration tests."""

from __future__ import annotations

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid.const import DOMAIN


@pytest.fixture
def config_entry(hass: HomeAssistant) -> MockConfigEntry:
    """Create a mock config entry."""
    entry = MockConfigEntry(domain=DOMAIN, data={}, title="EPP Grid")
    entry.add_to_hass(hass)
    return entry
