"""End-to-end test: device group creates HA binary_sensor entities."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import patch

import pytest
from homeassistant.const import STATE_OFF
from homeassistant.const import STATE_ON
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
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


@pytest.fixture
async def integration_with_group_and_zones(
    hass: HomeAssistant, config_entry: MockConfigEntry, enable_custom_integrations
) -> dict:
    er_ = er.async_get(hass)
    # Source A: occupancy + zone_2_presence (named "Bed Left")
    a_occ = er_.async_get_or_create(
        "binary_sensor",
        "esphome",
        "AA:BB:CC:DD:EE:FF-binary_sensor-occupancy",
    )
    a_z2 = er_.async_get_or_create(
        "binary_sensor",
        "esphome",
        "AA:BB:CC:DD:EE:FF-binary_sensor-zone_2_presence",
    )
    # Source B: occupancy + zone_3_presence (named "Bed Right")
    b_occ = er_.async_get_or_create(
        "binary_sensor",
        "esphome",
        "11:22:33:44:55:66-binary_sensor-occupancy",
    )
    b_z3 = er_.async_get_or_create(
        "binary_sensor",
        "esphome",
        "11:22:33:44:55:66-binary_sensor-zone_3_presence",
    )
    for e in (a_occ, a_z2, b_occ, b_z3):
        hass.states.async_set(e.entity_id, STATE_OFF)

    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    manager = hass.data[DOMAIN]
    # Seed zone names into store so zone_name_fn returns something.
    manager._store.devices["AA:BB:CC:DD:EE:FF"] = {
        "room_layout": [
            {"type": "default"},
            None,
            {"name": "Bed Left", "type": "presence", "color": "#ff0000"},
            None,
            None,
            None,
            None,
            None,
        ],
    }
    manager._store.devices["11:22:33:44:55:66"] = {
        "room_layout": [
            {"type": "default"},
            None,
            None,
            {"name": "Bed Right", "type": "presence", "color": "#ff0000"},
            None,
            None,
            None,
            None,
        ],
    }

    group = await manager.device_groups.async_create(
        name="Master Bedroom Presence",
        sources=["AA:BB:CC:DD:EE:FF", "11:22:33:44:55:66"],
    )
    # Add a zone group merging bed-left + bed-right
    await manager.device_groups.async_update(
        id=group["id"],
        name=group["name"],
        sources=group["sources"],
        area_id=None,
        zone_groups=[
            {
                "id": "zg1",
                "name": "Bed",
                "members": [
                    {"mac": "AA:BB:CC:DD:EE:FF", "zone_index": 2},
                    {"mac": "11:22:33:44:55:66", "zone_index": 3},
                ],
            }
        ],
    )
    await hass.async_block_till_done()
    return {
        "group_id": group["id"],
        "source_a_occ": a_occ.entity_id,
        "source_a_z2": a_z2.entity_id,
        "source_b_occ": b_occ.entity_id,
        "source_b_z3": b_z3.entity_id,
    }


async def test_zone_group_entity_created(hass: HomeAssistant, integration_with_group_and_zones: dict) -> None:
    group_id = integration_with_group_and_zones["group_id"]
    er_ = er.async_get(hass)
    eid = er_.async_get_entity_id(
        "binary_sensor",
        DOMAIN,
        f"eppgrid_device_group_{group_id}_zone_group_zg1",
    )
    assert eid is not None


async def test_zone_group_aggregates_members(hass: HomeAssistant, integration_with_group_and_zones: dict) -> None:
    group_id = integration_with_group_and_zones["group_id"]
    er_ = er.async_get(hass)
    helper = er_.async_get_entity_id(
        "binary_sensor",
        DOMAIN,
        f"eppgrid_device_group_{group_id}_zone_group_zg1",
    )
    hass.states.async_set(
        integration_with_group_and_zones["source_b_z3"],
        STATE_ON,
    )
    await hass.async_block_till_done()
    assert hass.states.get(helper).state == STATE_ON


async def test_group_area_id_applied_to_device_registry(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    enable_custom_integrations,
) -> None:
    """area_id stored on the group must be reflected in the HA device registry."""
    ar_ = ar.async_get(hass)
    area = ar_.async_create("Bedroom")

    er_ = er.async_get(hass)
    a = er_.async_get_or_create(
        "binary_sensor",
        "esphome",
        "AA:BB:CC:DD:EE:FF-binary_sensor-occupancy",
    )
    hass.states.async_set(a.entity_id, STATE_OFF)

    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    manager = hass.data[DOMAIN]
    group = await manager.device_groups.async_create(
        name="Bedroom Presence",
        sources=["AA:BB:CC:DD:EE:FF"],
        area_id=area.id,
    )
    await hass.async_block_till_done()

    dr_ = dr.async_get(hass)
    dev = dr_.async_get_device(identifiers={(DOMAIN, f"device_group:{group['id']}")})
    assert dev is not None
    assert dev.area_id == area.id


async def test_passthrough_zone_entity_uses_configured_zone_name(
    hass: HomeAssistant,
    integration_with_group_and_zones: dict,
) -> None:
    """Passthrough zone entity name should use the user-configured zone name, not 'Zone N'."""
    er_ = er.async_get(hass)

    # Source A zone 2 is NOT in a zone group — it appears as a passthrough.
    # The fixture seeds zone_name as "Bed Left" for AA:BB:CC:DD:EE:FF zone 2.
    # BUT the zone_group merges zone 2 from A and zone 3 from B, so both are grouped.
    # Let's create a standalone group without zone_groups to get a passthrough.
    manager = hass.data[DOMAIN]
    standalone = await manager.device_groups.async_create(
        name="Single Sensor Group",
        sources=["AA:BB:CC:DD:EE:FF"],
    )
    await hass.async_block_till_done()

    uid = f"eppgrid_device_group_{standalone['id']}_zone_pass_AA:BB:CC:DD:EE:FF_2"
    entry = er_.async_get_entity_id("binary_sensor", DOMAIN, uid)
    assert entry is not None, "Passthrough zone entity not found"

    state = hass.states.get(entry)
    assert state is not None
    # The entity friendly name is composed of device name + entity name.
    # The entity's _attr_name should be "Bed Left", not "Zone 2".
    assert state.attributes.get("friendly_name", "").endswith("Bed Left"), (
        f"Expected entity name 'Bed Left', got friendly_name={state.attributes.get('friendly_name')!r}"
    )
