"""End-to-end test: device group creates HA binary_sensor entities."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import patch

import pytest
from homeassistant.const import STATE_OFF
from homeassistant.const import STATE_ON
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid.const import DOMAIN


@pytest.fixture(autouse=True)
def _stub_frontend_deps(hass):
    """The integration hard-depends on frontend/panel_custom (no hass_frontend
    in CI). Mark them loaded so dependency resolution passes, and stub panel
    registration so a real config-entry setup works without a built frontend."""
    hass.config.components.add("frontend")
    hass.config.components.add("panel_custom")
    with (
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=test",
        ),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
    ):
        yield


@pytest.fixture
async def integration_with_group(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    enable_custom_integrations,
) -> dict:
    """Set up the integration with one device group and two fake source entities."""
    er_ = er.async_get(hass)
    a = er_.async_get_or_create(
        "binary_sensor",
        "esphome",
        "AA:BB:CC:DD:EE:FF-binary_sensor-occupancy",
    )
    b = er_.async_get_or_create(
        "binary_sensor",
        "esphome",
        "11:22:33:44:55:66-binary_sensor-occupancy",
    )
    hass.states.async_set(a.entity_id, STATE_OFF)
    hass.states.async_set(b.entity_id, STATE_OFF)

    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    manager = hass.data[DOMAIN]
    group = await manager.device_groups.async_create(
        name="Master Bedroom Presence",
        sources=["AA:BB:CC:DD:EE:FF", "11:22:33:44:55:66"],
    )
    await hass.async_block_till_done()
    return {"group": group, "source_a": a.entity_id, "source_b": b.entity_id}


async def test_helper_occupancy_entity_created_with_expected_unique_id(
    hass: HomeAssistant, integration_with_group: dict
) -> None:
    group = integration_with_group["group"]
    er_ = er.async_get(hass)
    expected_uid = f"eppgrid_device_group_{group['id']}_occupancy"
    entry = er_.async_get_entity_id("binary_sensor", DOMAIN, expected_uid)
    assert entry is not None


async def test_helper_occupancy_initially_off(hass: HomeAssistant, integration_with_group: dict) -> None:
    group = integration_with_group["group"]
    er_ = er.async_get(hass)
    eid = er_.async_get_entity_id(
        "binary_sensor",
        DOMAIN,
        f"eppgrid_device_group_{group['id']}_occupancy",
    )
    assert hass.states.get(eid).state == STATE_OFF


async def test_helper_occupancy_turns_on_when_source_on(hass: HomeAssistant, integration_with_group: dict) -> None:
    group = integration_with_group["group"]
    er_ = er.async_get(hass)
    helper = er_.async_get_entity_id(
        "binary_sensor",
        DOMAIN,
        f"eppgrid_device_group_{group['id']}_occupancy",
    )
    hass.states.async_set(integration_with_group["source_a"], STATE_ON)
    await hass.async_block_till_done()
    assert hass.states.get(helper).state == STATE_ON


async def test_helper_has_virtual_device_in_registry(hass: HomeAssistant, integration_with_group: dict) -> None:
    group = integration_with_group["group"]
    dr_ = dr.async_get(hass)
    device = dr_.async_get_device(identifiers={(DOMAIN, f"device_group:{group['id']}")})
    assert device is not None
    assert device.name == "Master Bedroom Presence"
