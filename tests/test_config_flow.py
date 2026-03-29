"""Tests for EPP Grid config flow."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid.config_flow import EPPGridConfigFlow, EPPGridOptionsFlow
from custom_components.eppgrid.const import DOMAIN


class TestConfigFlow:
    """Tests for EPPGridConfigFlow."""

    async def test_step_user_shows_form(self, hass: HomeAssistant) -> None:
        """First call with no input shows the form."""
        flow = EPPGridConfigFlow()
        flow.hass = hass
        result = await flow.async_step_user(user_input=None)
        assert result["type"] == "form"
        assert result["step_id"] == "user"

    async def test_step_user_creates_entry(self, hass: HomeAssistant) -> None:
        """Submitting form creates a config entry."""
        flow = EPPGridConfigFlow()
        flow.hass = hass
        result = await flow.async_step_user(user_input={})
        assert result["type"] == "create_entry"
        assert result["title"] == "Everything Presence Pro Grid"
        assert result["data"] == {}

    async def test_step_user_singleton(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Second instance is aborted."""
        flow = EPPGridConfigFlow()
        flow.hass = hass
        result = await flow.async_step_user(user_input=None)
        assert result["type"] == "abort"
        assert result["reason"] == "single_instance_allowed"

    async def test_get_options_flow(self) -> None:
        """async_get_options_flow returns EPPGridOptionsFlow."""
        entry = MagicMock()
        flow = EPPGridConfigFlow.async_get_options_flow(entry)
        assert isinstance(flow, EPPGridOptionsFlow)


class TestOptionsFlow:
    """Tests for EPPGridOptionsFlow."""

    async def test_init_shows_form(self, hass: HomeAssistant) -> None:
        """First call shows form with current sidebar_panel value."""
        entry = MagicMock()
        flow = EPPGridOptionsFlow(entry)
        flow.hass = hass
        # No manager in hass.data — defaults to True
        result = await flow.async_step_init(user_input=None)
        assert result["type"] == "form"
        assert result["step_id"] == "init"

    async def test_init_shows_form_with_manager(self, hass: HomeAssistant) -> None:
        """Form reads sidebar_panel from the manager store."""
        mock_manager = MagicMock()
        mock_manager._store.sidebar_panel = False
        hass.data[DOMAIN] = mock_manager

        entry = MagicMock()
        flow = EPPGridOptionsFlow(entry)
        flow.hass = hass
        result = await flow.async_step_init(user_input=None)
        assert result["type"] == "form"

    async def test_init_saves_setting(self, hass: HomeAssistant) -> None:
        """Submitting options saves sidebar_panel to store."""
        mock_manager = MagicMock()
        mock_manager._store.async_save = AsyncMock()
        hass.data[DOMAIN] = mock_manager

        entry = MagicMock()
        flow = EPPGridOptionsFlow(entry)
        flow.hass = hass
        result = await flow.async_step_init(user_input={"sidebar_panel": False})
        assert result["type"] == "create_entry"
        assert mock_manager._store.sidebar_panel is False
        mock_manager._store.async_save.assert_awaited_once()

    async def test_init_saves_without_manager(self, hass: HomeAssistant) -> None:
        """Submitting options when no manager exists still creates entry."""
        entry = MagicMock()
        flow = EPPGridOptionsFlow(entry)
        flow.hass = hass
        result = await flow.async_step_init(user_input={"sidebar_panel": True})
        assert result["type"] == "create_entry"
