"""Tests for the per-group Aggregator state machine."""

from __future__ import annotations

import pytest
from homeassistant.const import STATE_OFF
from homeassistant.const import STATE_ON
from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from custom_components.eppgrid.const import REST_OF_ROOM_ID
from custom_components.eppgrid.device_groups._aggregator import Aggregator


def _register(hass: HomeAssistant, mac: str, slot: str, *, disabled: bool = False) -> str:
    registry = er.async_get(hass)
    entry = registry.async_get_or_create(
        domain="binary_sensor",
        platform="esphome",
        unique_id=f"{mac}-binary_sensor-{slot}",
        disabled_by=er.RegistryEntryDisabler.USER if disabled else None,
    )
    return entry.entity_id


def _set_state(hass: HomeAssistant, entity_id: str, state: str) -> None:
    hass.states.async_set(entity_id, state)


@pytest.fixture
def group_def() -> dict:
    return {
        "id": "g1",
        "name": "Master Bedroom Presence",
        "area_id": None,
        "sources": ["AA:BB:CC:DD:EE:FF", "11:22:33:44:55:66"],
        "zone_groups": [
            {
                "id": "zg1",
                "name": "Bed",
                "members": [
                    {"mac": "AA:BB:CC:DD:EE:FF", "zone_index": 2},
                    {"mac": "11:22:33:44:55:66", "zone_index": 3},
                ],
            }
        ],
    }


class TestInitialState:
    async def test_aggregator_computes_initial_occupancy_from_source_states(
        self, hass: HomeAssistant, group_def: dict
    ) -> None:
        a = _register(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
        b = _register(hass, "11:22:33:44:55:66", "occupancy")
        _set_state(hass, a, STATE_OFF)
        _set_state(hass, b, STATE_ON)

        agg = Aggregator(
            hass,
            group_def,
            device_name_fn=lambda m: m,
            zone_name_fn=lambda m, i: f"Zone {i}",
        )
        await agg.async_start()
        try:
            assert agg.outputs["presence"]["occupancy"] is True
        finally:
            await agg.async_stop()

    async def test_initial_unavailable_when_all_sources_unavailable(self, hass: HomeAssistant, group_def: dict) -> None:
        a = _register(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
        b = _register(hass, "11:22:33:44:55:66", "occupancy")
        _set_state(hass, a, STATE_UNAVAILABLE)
        _set_state(hass, b, STATE_UNAVAILABLE)

        agg = Aggregator(
            hass,
            group_def,
            device_name_fn=lambda m: m,
            zone_name_fn=lambda m, i: f"Zone {i}",
        )
        await agg.async_start()
        try:
            assert agg.outputs["presence"]["occupancy"] is None
        finally:
            await agg.async_stop()


class TestStateTracking:
    async def test_state_change_propagates_to_output(self, hass: HomeAssistant, group_def: dict) -> None:
        a = _register(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
        b = _register(hass, "11:22:33:44:55:66", "occupancy")
        _set_state(hass, a, STATE_OFF)
        _set_state(hass, b, STATE_OFF)

        agg = Aggregator(
            hass,
            group_def,
            device_name_fn=lambda m: m,
            zone_name_fn=lambda m, i: f"Zone {i}",
        )
        await agg.async_start()
        try:
            assert agg.outputs["presence"]["occupancy"] is False
            _set_state(hass, a, STATE_ON)
            await hass.async_block_till_done()
            assert agg.outputs["presence"]["occupancy"] is True
        finally:
            await agg.async_stop()

    async def test_notify_fires_on_output_change(self, hass: HomeAssistant, group_def: dict) -> None:
        a = _register(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
        _register(hass, "11:22:33:44:55:66", "occupancy")
        _set_state(hass, a, STATE_OFF)

        events = []
        agg = Aggregator(
            hass,
            group_def,
            device_name_fn=lambda m: m,
            zone_name_fn=lambda m, i: f"Zone {i}",
            notify=lambda: events.append(True),
        )
        await agg.async_start()
        try:
            _set_state(hass, a, STATE_ON)
            await hass.async_block_till_done()
            assert len(events) >= 1
        finally:
            await agg.async_stop()


class TestZoneAggregation:
    async def test_zone_group_or_aggregates_members(self, hass: HomeAssistant, group_def: dict) -> None:
        z_a = _register(hass, "AA:BB:CC:DD:EE:FF", "zone_2_presence")
        z_b = _register(hass, "11:22:33:44:55:66", "zone_3_presence")
        _set_state(hass, z_a, STATE_OFF)
        _set_state(hass, z_b, STATE_ON)

        agg = Aggregator(
            hass,
            group_def,
            device_name_fn=lambda m: m,
            zone_name_fn=lambda m, i: f"Zone {i}",
        )
        await agg.async_start()
        try:
            assert agg.outputs["zone_groups"]["zg1"] is True
        finally:
            await agg.async_stop()


class TestPresenceSlotExposure:
    async def test_only_exposes_presence_slots_with_an_enabled_source(
        self, hass: HomeAssistant, group_def: dict
    ) -> None:
        """A presence slot is exposed only if some source has that entity
        enabled — mirrors derive_exposed_entities. Sources here register only
        `occupancy`, so the other slots must be absent from the outputs."""
        a = _register(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
        b = _register(hass, "11:22:33:44:55:66", "occupancy")
        _set_state(hass, a, STATE_OFF)
        _set_state(hass, b, STATE_OFF)

        agg = Aggregator(
            hass,
            group_def,
            device_name_fn=lambda m: m,
            zone_name_fn=lambda m, i: f"Zone {i}",
        )
        await agg.async_start()
        try:
            assert "occupancy" in agg.outputs["presence"]
            assert "static_presence" not in agg.outputs["presence"]
            assert "motion_presence" not in agg.outputs["presence"]
        finally:
            await agg.async_stop()

    async def test_disabled_presence_slot_is_not_exposed(self, hass: HomeAssistant, group_def: dict) -> None:
        """A registered-but-disabled source entity does not expose its slot."""
        _register(hass, "AA:BB:CC:DD:EE:FF", "occupancy", disabled=True)
        _register(hass, "11:22:33:44:55:66", "occupancy", disabled=True)

        agg = Aggregator(
            hass,
            group_def,
            device_name_fn=lambda m: m,
            zone_name_fn=lambda m, i: f"Zone {i}",
        )
        await agg.async_start()
        try:
            assert "occupancy" not in agg.outputs["presence"]
        finally:
            await agg.async_stop()


class TestPassthroughExposure:
    async def test_enabled_ungrouped_zone_is_exposed_as_passthrough(self, hass: HomeAssistant, group_def: dict) -> None:
        z = _register(hass, "AA:BB:CC:DD:EE:FF", "zone_4_presence")
        _set_state(hass, z, STATE_OFF)

        agg = Aggregator(
            hass,
            group_def,
            device_name_fn=lambda m: m,
            zone_name_fn=lambda m, i: f"Zone {i}",
        )
        await agg.async_start()
        try:
            assert ("AA:BB:CC:DD:EE:FF", 4) in agg.outputs["zone_passthroughs"]
        finally:
            await agg.async_stop()

    async def test_disabled_zone_is_not_exposed_as_passthrough(self, hass: HomeAssistant, group_def: dict) -> None:
        """A registered-but-disabled zone entity (even with a configured name)
        must not produce a passthrough helper — it would be permanently
        unavailable."""
        _register(hass, "AA:BB:CC:DD:EE:FF", "zone_4_presence", disabled=True)

        agg = Aggregator(
            hass,
            group_def,
            device_name_fn=lambda m: m,
            zone_name_fn=lambda m, i: f"Zone {i}",
        )
        await agg.async_start()
        try:
            assert ("AA:BB:CC:DD:EE:FF", 4) not in agg.outputs["zone_passthroughs"]
        finally:
            await agg.async_stop()


class TestRegistryUpdates:
    async def test_aggregator_re_resolves_on_registry_event(self, hass: HomeAssistant, group_def: dict) -> None:
        """If a source entity is registered AFTER aggregator starts, it should pick it up."""
        a = _register(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
        _set_state(hass, a, STATE_OFF)

        agg = Aggregator(
            hass,
            group_def,
            device_name_fn=lambda m: m,
            zone_name_fn=lambda m, i: f"Zone {i}",
        )
        await agg.async_start()
        try:
            # Initially, source B's occupancy isn't registered.
            # Now register and set its state.
            b = _register(hass, "11:22:33:44:55:66", "occupancy")
            _set_state(hass, b, STATE_ON)
            await hass.async_block_till_done()

            assert agg.outputs["presence"]["occupancy"] is True
        finally:
            await agg.async_stop()


class TestUpdateDefinition:
    async def test_update_definition_refreshes_existing_entities(self, hass: HomeAssistant, group_def: dict) -> None:
        """A group edit (update_definition) must fire entity listeners so the
        already-created helper entities re-read their state, rather than showing
        stale values until the next member state change."""
        a = _register(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
        _set_state(hass, a, STATE_ON)

        agg = Aggregator(
            hass,
            group_def,
            device_name_fn=lambda m: m,
            zone_name_fn=lambda m, i: f"Zone {i}",
        )
        await agg.async_start()
        try:
            fired: list[bool] = []
            agg.attach_entity_listener("occupancy", lambda: fired.append(True))
            agg.update_definition(group_def)
            assert fired, "update_definition did not fire entity listeners"
        finally:
            await agg.async_stop()


class TestVisibleChange:
    async def test_disabling_a_source_fires_visible_change(self, hass: HomeAssistant, group_def: dict) -> None:
        """Disabling a source entity removes its exposed slot, so the
        visible-change callback fires (lets the WS layer re-push exposed_entities)."""
        a = _register(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
        _set_state(hass, a, STATE_OFF)

        visible: list[bool] = []
        agg = Aggregator(
            hass,
            group_def,
            device_name_fn=lambda m: m,
            zone_name_fn=lambda m, i: f"Zone {i}",
            notify_visible_change=lambda: visible.append(True),
        )
        await agg.async_start()
        try:
            assert "occupancy" in agg.outputs["presence"]
            er.async_get(hass).async_update_entity(a, disabled_by=er.RegistryEntryDisabler.USER)
            await hass.async_block_till_done()
            assert "occupancy" not in agg.outputs["presence"]
            assert visible, "visible-change callback did not fire on source disable"
        finally:
            await agg.async_stop()

    async def test_on_off_transition_does_not_fire_visible_change(self, hass: HomeAssistant, group_def: dict) -> None:
        """A plain on/off transition does not change the exposed set, so the
        visible-change callback must NOT fire (avoids spamming WS subscribers)."""
        a = _register(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
        _set_state(hass, a, STATE_OFF)

        visible: list[bool] = []
        agg = Aggregator(
            hass,
            group_def,
            device_name_fn=lambda m: m,
            zone_name_fn=lambda m, i: f"Zone {i}",
            notify_visible_change=lambda: visible.append(True),
        )
        await agg.async_start()
        try:
            _set_state(hass, a, STATE_ON)
            await hass.async_block_till_done()
            assert not visible
        finally:
            await agg.async_stop()


class TestCombinedRestOfRoom:
    async def test_combined_ror_ors_zone_zero_across_sources(self, hass: HomeAssistant, group_def: dict) -> None:
        z_a = _register(hass, "AA:BB:CC:DD:EE:FF", "zone_0_presence")
        z_b = _register(hass, "11:22:33:44:55:66", "zone_0_presence")
        _set_state(hass, z_a, STATE_OFF)
        _set_state(hass, z_b, STATE_ON)

        agg = Aggregator(
            hass, group_def, device_name_fn=lambda m: m, zone_name_fn=lambda m, i: f"Zone {i}"
        )
        await agg.async_start()
        try:
            assert agg.outputs["zone_groups"][REST_OF_ROOM_ID] is True
        finally:
            await agg.async_stop()

    async def test_zone_zero_is_not_a_passthrough(self, hass: HomeAssistant, group_def: dict) -> None:
        """Zone 0 only ever flows through the combined Rest of Room, never as a
        per-device passthrough."""
        z = _register(hass, "AA:BB:CC:DD:EE:FF", "zone_0_presence")
        _set_state(hass, z, STATE_OFF)

        agg = Aggregator(
            hass, group_def, device_name_fn=lambda m: m, zone_name_fn=lambda m, i: f"Zone {i}"
        )
        await agg.async_start()
        try:
            assert ("AA:BB:CC:DD:EE:FF", 0) not in agg.outputs["zone_passthroughs"]
        finally:
            await agg.async_stop()

    async def test_combined_ror_absent_when_no_source_has_zone_zero(self, hass: HomeAssistant, group_def: dict) -> None:
        _register(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
        agg = Aggregator(
            hass, group_def, device_name_fn=lambda m: m, zone_name_fn=lambda m, i: f"Zone {i}"
        )
        await agg.async_start()
        try:
            assert REST_OF_ROOM_ID not in agg.outputs["zone_groups"]
        finally:
            await agg.async_stop()

    async def test_combined_ror_excluded_produces_no_output(self, hass: HomeAssistant, group_def: dict) -> None:
        z = _register(hass, "AA:BB:CC:DD:EE:FF", "zone_0_presence")
        _set_state(hass, z, STATE_ON)
        group_def["excluded_zone_groups"] = [REST_OF_ROOM_ID]

        agg = Aggregator(
            hass, group_def, device_name_fn=lambda m: m, zone_name_fn=lambda m, i: f"Zone {i}"
        )
        await agg.async_start()
        try:
            assert REST_OF_ROOM_ID not in agg.outputs["zone_groups"]
        finally:
            await agg.async_stop()


class TestExclusionAwareness:
    async def test_excluded_presence_slot_produces_no_output(self, hass: HomeAssistant, group_def: dict) -> None:
        a = _register(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
        _set_state(hass, a, STATE_ON)
        group_def["excluded_presence"] = ["occupancy"]

        agg = Aggregator(
            hass, group_def, device_name_fn=lambda m: m, zone_name_fn=lambda m, i: f"Zone {i}"
        )
        await agg.async_start()
        try:
            assert "occupancy" not in agg.outputs["presence"]
        finally:
            await agg.async_stop()

    async def test_excluded_passthrough_zone_produces_no_output(self, hass: HomeAssistant, group_def: dict) -> None:
        z = _register(hass, "AA:BB:CC:DD:EE:FF", "zone_4_presence")
        _set_state(hass, z, STATE_OFF)
        group_def["excluded_zones"] = [{"mac": "AA:BB:CC:DD:EE:FF", "zone_index": 4}]

        agg = Aggregator(
            hass, group_def, device_name_fn=lambda m: m, zone_name_fn=lambda m, i: f"Zone {i}"
        )
        await agg.async_start()
        try:
            assert ("AA:BB:CC:DD:EE:FF", 4) not in agg.outputs["zone_passthroughs"]
        finally:
            await agg.async_stop()

    async def test_excluded_named_zone_group_produces_no_output(self, hass: HomeAssistant, group_def: dict) -> None:
        z_a = _register(hass, "AA:BB:CC:DD:EE:FF", "zone_2_presence")
        z_b = _register(hass, "11:22:33:44:55:66", "zone_3_presence")
        _set_state(hass, z_a, STATE_ON)
        _set_state(hass, z_b, STATE_OFF)
        group_def["excluded_zone_groups"] = ["zg1"]

        agg = Aggregator(
            hass, group_def, device_name_fn=lambda m: m, zone_name_fn=lambda m, i: f"Zone {i}"
        )
        await agg.async_start()
        try:
            assert "zg1" not in agg.outputs["zone_groups"]
            # Excluded merge members do NOT fall back to passthroughs.
            assert ("AA:BB:CC:DD:EE:FF", 2) not in agg.outputs["zone_passthroughs"]
        finally:
            await agg.async_stop()
