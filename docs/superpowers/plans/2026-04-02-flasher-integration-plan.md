# Flasher Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate firmware flashing (OTA + USB) into the EPP Grid HA integration frontend with a two-tab panel, dashboard strategy, and Lovelace cards.

**Architecture:** Extend `eppgrid-panel.ts` with a tab bar routing between the existing device configuration view and a new flasher view. Backend adds 4 websocket commands for device discovery, OTA flash orchestration, ESPHome config entry management. Frontend adds a flasher controller, flasher view component, two Lovelace card wrappers, and a dashboard strategy. USB flashing uses ESP Web Tools; WiFi provisioning uses Improv Serial via Web Serial API.

**Tech Stack:** Python (backend WS API), TypeScript/Lit 3 (frontend), ESP Web Tools v10 (USB flashing), Web Serial API (Improv Serial), Vitest (frontend tests), pytest (backend tests)

**Depends on:** Sub-project 1 (variant simplification) and Sub-project 2 (sidebar panel toggle) should be completed first, but tasks here can begin in parallel where noted.

---

## File Structure

### Backend (Python)

| File | Action | Responsibility |
|------|--------|---------------|
| `custom_components/eppgrid/websocket_api.py` | Modify | Add 4 new WS commands: `list_flashable_devices`, `flash_ota`, `add_esphome_device`, `delete_esphome_device` |
| `custom_components/eppgrid/device_manager.py` | Modify | Add `list_flashable_devices()` method and OTA flash orchestration |
| `custom_components/eppgrid/ota.py` | Create | ESPHome OTA protocol implementation (TCP binary push to port 3232) |
| `custom_components/eppgrid/const.py` | Modify | Add OTA and project name constants |
| `tests/test_websocket_flasher.py` | Create | Tests for the 4 new WS commands |
| `tests/test_ota.py` | Create | Tests for the OTA protocol implementation |
| `tests/test_device_manager_flasher.py` | Create | Tests for flashable device discovery |

### Frontend (TypeScript/Lit)

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/types.ts` | Modify | Add `FlashableDevice` interface |
| `frontend/src/controllers/flasher-controller.ts` | Create | Device discovery, OTA progress state machine, serial connection state |
| `frontend/src/components/epp-flasher-view.ts` | Create | Flash Firmware tab UI — device list, OTA trigger, USB section, WiFi provisioning |
| `frontend/src/components/epp-flasher-card.ts` | Create | Thin Lovelace card wrapper for flasher view |
| `frontend/src/components/epp-device-card.ts` | Create | Thin Lovelace card wrapper for existing panel content |
| `frontend/src/lib/improv-serial.ts` | Create | Improv Serial protocol parser — packet building, WiFi scan, WiFi provision, response parsing |
| `frontend/src/strategy.ts` | Create | HA dashboard strategy generating two-view config |
| `frontend/src/eppgrid-panel.ts` | Modify | Add tab bar, route between device config and flasher views |
| `frontend/src/index.ts` | Modify | Register custom cards and strategy |
| `frontend/src/styles.ts` | Modify | Add flasher-specific styles |
| `frontend/src/__tests__/controllers/flasher-controller.test.ts` | Create | Flasher controller tests |
| `frontend/src/__tests__/components/epp-flasher-view.test.ts` | Create | Flasher view tests |
| `frontend/src/__tests__/lib/improv-serial.test.ts` | Create | Improv Serial parser tests |
| `frontend/src/__tests__/strategy.test.ts` | Create | Strategy tests |

---

## Task 1: Backend — Flashable Device Discovery

Add a `list_flashable_devices()` method to `DeviceManager` that scans the HA device registry for all ESPHome devices matching the EPP project name, returning both original-firmware and EPP Grid firmware devices.

**Files:**
- Modify: `custom_components/eppgrid/const.py`
- Modify: `custom_components/eppgrid/device_manager.py`
- Create: `tests/test_device_manager_flasher.py`

- [ ] **Step 1: Add constants**

Add to `custom_components/eppgrid/const.py`:

```python
# Original EPP firmware project name (for device discovery)
EPP_PROJECT_NAME = "EverythingSmartTechnology.Everything Presence Pro"

# ESPHome OTA
OTA_PORT = 3232
MANIFEST_BASE_URL = "https://github.com/clintongormley/everything-presence-pro-grid/releases/latest/download"
```

- [ ] **Step 2: Write failing test for list_flashable_devices**

Create `tests/test_device_manager_flasher.py`:

```python
"""Tests for flashable device discovery."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er

from custom_components.eppgrid.const import DOMAIN
from custom_components.eppgrid.device_manager import DeviceManager
from custom_components.eppgrid.storage import EPPGridStore


@pytest.fixture
def mock_store():
    store = MagicMock(spec=EPPGridStore)
    store.devices = {}
    store.templates = {}
    store.sidebar_panel = True
    store.get_device = MagicMock(return_value=None)
    return store


def _create_esphome_device(
    dev_reg: dr.DeviceRegistry,
    ent_reg: er.EntityRegistry,
    *,
    mac: str,
    name: str,
    host: str,
    config_entry_id: str,
    has_zone_engine: bool = False,
    firmware_version: str = "1.8.0",
) -> dr.DeviceEntry:
    """Create a mock ESPHome device with appropriate entities."""
    device = dev_reg.async_get_or_create(
        config_entry_id=config_entry_id,
        connections={(dr.CONNECTION_NETWORK_MAC, mac)},
        name=name,
        manufacturer="EverythingSmartTechnology",
        model="Everything Presence Pro",
        sw_version=firmware_version,
    )
    # Every ESPHome device has a firmware_version entity
    ent_reg.async_get_or_create(
        "sensor",
        "esphome",
        f"{mac}-firmware_version",
        device_id=device.id,
        config_entry_id=config_entry_id,
    )
    if has_zone_engine:
        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            f"{mac}-zone_engine_version",
            device_id=device.id,
            config_entry_id=config_entry_id,
        )
    return device


class TestListFlashableDevices:
    """Tests for DeviceManager.list_flashable_devices."""

    async def test_discovers_original_firmware_device(
        self, hass: HomeAssistant, mock_store
    ) -> None:
        """Original-firmware EPP devices are returned with firmware_type=original."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        # Create a mock ESPHome config entry
        entry = MagicMock()
        entry.data = {"host": "192.168.1.42"}
        hass.config_entries._entries = {"esphome_1": entry}
        with patch.object(hass.config_entries, "async_get_entry", return_value=entry):
            _create_esphome_device(
                dev_reg, ent_reg,
                mac="AA:BB:CC:DD:EE:FF",
                name="Presence Pro Kitchen",
                host="192.168.1.42",
                config_entry_id="esphome_1",
                has_zone_engine=False,
                firmware_version="1.8.0",
            )

            manager = DeviceManager(hass, mock_store)
            result = await manager.list_flashable_devices()

        assert len(result) == 1
        dev = result[0]
        assert dev["mac"] == "AA:BB:CC:DD:EE:FF"
        assert dev["name"] == "Presence Pro Kitchen"
        assert dev["host"] == "192.168.1.42"
        assert dev["firmware_type"] == "original"
        assert dev["firmware_version"] == "1.8.0"
        assert dev["esphome_config_entry_id"] == "esphome_1"

    async def test_discovers_eppgrid_firmware_device(
        self, hass: HomeAssistant, mock_store
    ) -> None:
        """EPP Grid firmware devices are returned with firmware_type=eppgrid."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        entry = MagicMock()
        entry.data = {"host": "192.168.1.43"}
        with patch.object(hass.config_entries, "async_get_entry", return_value=entry):
            _create_esphome_device(
                dev_reg, ent_reg,
                mac="11:22:33:44:55:66",
                name="Presence Pro Office",
                host="192.168.1.43",
                config_entry_id="esphome_2",
                has_zone_engine=True,
                firmware_version="1.0.0",
            )

            manager = DeviceManager(hass, mock_store)
            result = await manager.list_flashable_devices()

        assert len(result) == 1
        assert result[0]["firmware_type"] == "eppgrid"

    async def test_ignores_non_epp_esphome_devices(
        self, hass: HomeAssistant, mock_store
    ) -> None:
        """Non-EPP ESPHome devices are not returned."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        # Create a generic ESPHome device with different manufacturer
        device = dev_reg.async_get_or_create(
            config_entry_id="esphome_other",
            connections={(dr.CONNECTION_NETWORK_MAC, "FF:FF:FF:FF:FF:FF")},
            name="Some Other Device",
            manufacturer="SomeOtherBrand",
            model="Generic Sensor",
        )
        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            "ff:ff:ff:ff:ff:ff-firmware_version",
            device_id=device.id,
            config_entry_id="esphome_other",
        )

        manager = DeviceManager(hass, mock_store)
        result = await manager.list_flashable_devices()

        assert len(result) == 0

    async def test_returns_both_firmware_types(
        self, hass: HomeAssistant, mock_store
    ) -> None:
        """Both original and eppgrid devices appear together."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        entry1 = MagicMock()
        entry1.data = {"host": "192.168.1.42"}
        entry2 = MagicMock()
        entry2.data = {"host": "192.168.1.43"}

        def get_entry(eid):
            return {"esphome_1": entry1, "esphome_2": entry2}.get(eid)

        with patch.object(hass.config_entries, "async_get_entry", side_effect=get_entry):
            _create_esphome_device(
                dev_reg, ent_reg,
                mac="AA:BB:CC:DD:EE:FF",
                name="Original",
                host="192.168.1.42",
                config_entry_id="esphome_1",
                has_zone_engine=False,
            )
            _create_esphome_device(
                dev_reg, ent_reg,
                mac="11:22:33:44:55:66",
                name="EPP Grid",
                host="192.168.1.43",
                config_entry_id="esphome_2",
                has_zone_engine=True,
            )

            manager = DeviceManager(hass, mock_store)
            result = await manager.list_flashable_devices()

        assert len(result) == 2
        types = {d["firmware_type"] for d in result}
        assert types == {"original", "eppgrid"}
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher && python -m pytest tests/test_device_manager_flasher.py -v`
Expected: FAIL — `list_flashable_devices` method does not exist.

- [ ] **Step 4: Implement list_flashable_devices**

Add to `custom_components/eppgrid/device_manager.py`, as a new method on `DeviceManager` (after `list_devices`):

```python
async def list_flashable_devices(self) -> list[dict[str, Any]]:
    """Return all ESPHome EPP devices — both original and EPP Grid firmware."""
    dev_reg = dr.async_get(self._hass)
    ent_reg = er.async_get(self._hass)
    result: list[dict[str, Any]] = []
    seen_macs: set[str] = set()

    for device in dev_reg.devices.values():
        # Must be an EPP device (check manufacturer + model)
        if device.manufacturer != "EverythingSmartTechnology":
            continue
        if device.model != "Everything Presence Pro":
            continue

        mac = _extract_mac(device)
        if mac is None or mac in seen_macs:
            continue
        seen_macs.add(mac)

        # Find the ESPHome config entry for this device
        esphome_config_entry_id = None
        for entry_id in device.config_entries:
            entry = self._hass.config_entries.async_get_entry(entry_id)
            if entry is not None and entry.domain == "esphome":
                esphome_config_entry_id = entry_id
                break

        host = _extract_host(device, esphome_config_entry_id, self._hass)

        # Check if device has zone_engine_version entity (= our firmware)
        has_zone_engine = False
        for ent_entry in er.async_entries_for_device(
            ent_reg, device.id, include_disabled_entities=True
        ):
            if ent_entry.platform == "esphome" and "zone_engine_version" in ent_entry.unique_id:
                has_zone_engine = True
                break

        # Check availability: any non-unavailable entity means device is online
        available = False
        for ent_entry in er.async_entries_for_device(ent_reg, device.id):
            state = self._hass.states.get(ent_entry.entity_id)
            if state is not None and state.state not in ("unavailable", "unknown"):
                available = True
                break

        result.append({
            "mac": mac,
            "name": device.name_by_user or device.name or "EPP Device",
            "host": host,
            "available": available,
            "firmware_type": "eppgrid" if has_zone_engine else "original",
            "firmware_version": device.sw_version or "unknown",
            "esphome_config_entry_id": esphome_config_entry_id,
        })

    return result
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher && python -m pytest tests/test_device_manager_flasher.py -v`
Expected: All 4 tests PASS.

- [ ] **Step 6: Run full test suite**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher && python -m pytest tests/ -v`
Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add custom_components/eppgrid/const.py custom_components/eppgrid/device_manager.py tests/test_device_manager_flasher.py
git commit -m "feat: add flashable device discovery for original and EPP Grid firmware"
```

---

## Task 2: Backend — WebSocket Commands (list, delete, add)

Add the `list_flashable_devices`, `delete_esphome_device`, and `add_esphome_device` websocket commands. These are simpler commands that don't require the OTA protocol.

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py`
- Create: `tests/test_websocket_flasher.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_websocket_flasher.py`:

```python
"""Tests for flasher-related WebSocket commands."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid import async_setup_entry
from custom_components.eppgrid import websocket_api as ws_module


@pytest.fixture(autouse=True)
def _clear_registered():
    ws_module._REGISTERED.clear()


async def setup_integration(hass: HomeAssistant, config_entry: MockConfigEntry) -> MagicMock:
    """Set up integration with mocked DeviceManager."""
    from custom_components.eppgrid.const import CONFIG_PROTOCOL_VERSION

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        mock_dm.async_stop = AsyncMock()
        mock_dm._store = MagicMock()
        mock_dm._store.devices = {}
        mock_dm._store.templates = {}
        mock_dm._store.sidebar_panel = True
        mock_dm._store.async_save = AsyncMock()
        mock_dm.devices = {}
        mock_dm.list_devices.return_value = []
        mock_dm.list_flashable_devices = AsyncMock(return_value=[])
        mock_dm._push_config_to_device = AsyncMock()
        mock_dm._push_pipeline_to_device = AsyncMock()
        mock_dm._entity_update_macs = set()
        mock_dm.async_update_zone_entities = AsyncMock()
        mock_dm.async_open_session = AsyncMock(return_value=None)
        mock_dm.async_close_session = AsyncMock()
        mock_dm.get_session = MagicMock(return_value=None)
        mock_dm.read_config_protocol.return_value = CONFIG_PROTOCOL_VERSION

        await async_setup_entry(hass, config_entry)

    return mock_dm


async def call_async_handler(hass, handler, connection, msg):
    handler(hass, connection, msg)
    await hass.async_block_till_done()


class TestListFlashableDevices:
    """Tests for eppgrid/list_flashable_devices."""

    async def test_returns_flashable_devices(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.list_flashable_devices.return_value = [
            {
                "mac": "AA:BB:CC:DD:EE:FF",
                "name": "Kitchen",
                "host": "192.168.1.42",
                "available": True,
                "firmware_type": "original",
                "firmware_version": "1.8.0",
                "esphome_config_entry_id": "esphome_1",
            }
        ]

        from custom_components.eppgrid.websocket_api import websocket_list_flashable_devices

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/list_flashable_devices"}

        await call_async_handler(hass, websocket_list_flashable_devices, connection, msg)

        connection.send_result.assert_called_once()
        result = connection.send_result.call_args[0]
        assert result[0] == 1
        assert len(result[1]["devices"]) == 1
        assert result[1]["devices"][0]["firmware_type"] == "original"

    async def test_not_ready(self, hass: HomeAssistant) -> None:
        from custom_components.eppgrid.websocket_api import websocket_list_flashable_devices

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/list_flashable_devices"}

        await call_async_handler(hass, websocket_list_flashable_devices, connection, msg)
        connection.send_error.assert_called_once_with(1, "not_ready", "Integration not loaded")


class TestDeleteEsphomeDevice:
    """Tests for eppgrid/delete_esphome_device."""

    async def test_deletes_config_entry(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_delete_esphome_device

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/delete_esphome_device", "config_entry_id": "esphome_1"}

        with patch.object(
            hass.config_entries, "async_remove", new_callable=AsyncMock, return_value=True
        ) as mock_remove:
            await call_async_handler(hass, websocket_delete_esphome_device, connection, msg)

        mock_remove.assert_called_once_with("esphome_1")
        connection.send_result.assert_called_once_with(1)

    async def test_delete_fails(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_delete_esphome_device

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/delete_esphome_device", "config_entry_id": "bad_id"}

        with patch.object(
            hass.config_entries,
            "async_remove",
            new_callable=AsyncMock,
            side_effect=Exception("Not found"),
        ):
            await call_async_handler(hass, websocket_delete_esphome_device, connection, msg)

        connection.send_error.assert_called_once()


class TestAddEsphomeDevice:
    """Tests for eppgrid/add_esphome_device."""

    async def test_triggers_config_flow(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_add_esphome_device

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/add_esphome_device", "host": "192.168.1.42"}

        mock_result = MagicMock()
        mock_result.type = "create_entry"
        with patch.object(
            hass.config_entries.flow,
            "async_init",
            new_callable=AsyncMock,
            return_value=mock_result,
        ) as mock_init:
            await call_async_handler(hass, websocket_add_esphome_device, connection, msg)

        mock_init.assert_called_once_with(
            "esphome",
            context={"source": "user"},
            data={"host": "192.168.1.42"},
        )
        connection.send_result.assert_called_once()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher && python -m pytest tests/test_websocket_flasher.py -v`
Expected: FAIL — websocket handler functions don't exist.

- [ ] **Step 3: Implement the websocket commands**

Add to `custom_components/eppgrid/websocket_api.py`, registering in `async_register_websocket_commands`:

```python
# In async_register_websocket_commands, add:
    websocket_api.async_register_command(hass, websocket_list_flashable_devices)
    websocket_api.async_register_command(hass, websocket_delete_esphome_device)
    websocket_api.async_register_command(hass, websocket_add_esphome_device)
```

Then add the handler functions at the end of the file:

```python
# -- list_flashable_devices --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/list_flashable_devices",
    }
)
@websocket_api.async_response
async def websocket_list_flashable_devices(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """List all EPP devices available for flashing."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return

    devices = await manager.list_flashable_devices()
    connection.send_result(msg["id"], {"devices": devices})


# -- delete_esphome_device --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/delete_esphome_device",
        vol.Required("config_entry_id"): str,
    }
)
@websocket_api.async_response
async def websocket_delete_esphome_device(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete an ESPHome config entry (and its device/entities)."""
    try:
        await hass.config_entries.async_remove(msg["config_entry_id"])
    except Exception as err:
        connection.send_error(msg["id"], "delete_failed", str(err))
        return
    connection.send_result(msg["id"])


# -- add_esphome_device --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/add_esphome_device",
        vol.Required("host"): str,
    }
)
@websocket_api.async_response
async def websocket_add_esphome_device(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Add an ESPHome device by triggering its config flow."""
    try:
        result = await hass.config_entries.flow.async_init(
            "esphome",
            context={"source": "user"},
            data={"host": msg["host"]},
        )
        connection.send_result(msg["id"], {"result": result.get("type", "unknown")})
    except Exception as err:
        connection.send_error(msg["id"], "add_failed", str(err))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher && python -m pytest tests/test_websocket_flasher.py -v`
Expected: All tests PASS.

- [ ] **Step 5: Run full backend test suite**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher && python -m pytest tests/ -v`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add custom_components/eppgrid/websocket_api.py tests/test_websocket_flasher.py
git commit -m "feat: add list_flashable_devices, delete and add ESPHome device WS commands"
```

---

## Task 3: Backend — ESPHome OTA Protocol

Implement the ESPHome OTA protocol for pushing firmware binaries to devices over TCP. This is the same protocol ESPHome Dashboard uses.

**Files:**
- Create: `custom_components/eppgrid/ota.py`
- Create: `tests/test_ota.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_ota.py`:

```python
"""Tests for ESPHome OTA protocol implementation."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from custom_components.eppgrid.ota import (
    OTAError,
    fetch_firmware_binary,
    push_ota,
)


class TestFetchFirmwareBinary:
    """Tests for downloading firmware from manifest URL."""

    async def test_fetches_binary_from_manifest(self) -> None:
        """Fetches the OTA binary URL from a manifest and downloads it."""
        manifest_json = {
            "name": "Everything Presence Pro (WiFi)",
            "version": "1.0.0",
            "builds": [
                {
                    "chipFamily": "ESP32",
                    "ota": {"path": "everything-presence-pro-wifi.ota.bin", "md5": "abc123"},
                }
            ],
        }
        binary_data = b"\x00\x01\x02\x03" * 1000

        mock_session = MagicMock()
        mock_manifest_resp = AsyncMock()
        mock_manifest_resp.json = AsyncMock(return_value=manifest_json)
        mock_manifest_resp.raise_for_status = MagicMock()

        mock_binary_resp = AsyncMock()
        mock_binary_resp.read = AsyncMock(return_value=binary_data)
        mock_binary_resp.raise_for_status = MagicMock()

        mock_session.get = MagicMock(
            side_effect=[
                _async_context_manager(mock_manifest_resp),
                _async_context_manager(mock_binary_resp),
            ]
        )

        result = await fetch_firmware_binary(mock_session, "wifi")
        assert result == binary_data

    async def test_raises_on_no_ota_build(self) -> None:
        """Raises OTAError when manifest has no OTA build."""
        manifest_json = {
            "name": "test",
            "version": "1.0.0",
            "builds": [{"chipFamily": "ESP32"}],  # no "ota" key
        }

        mock_session = MagicMock()
        mock_resp = AsyncMock()
        mock_resp.json = AsyncMock(return_value=manifest_json)
        mock_resp.raise_for_status = MagicMock()
        mock_session.get = MagicMock(return_value=_async_context_manager(mock_resp))

        with pytest.raises(OTAError, match="No OTA build"):
            await fetch_firmware_binary(mock_session, "wifi")


class TestPushOta:
    """Tests for the OTA push protocol."""

    async def test_successful_push(self) -> None:
        """Simulates a successful OTA push handshake."""
        firmware = b"\x00" * 4096

        # Simulate the ESPHome OTA server responses
        reader = AsyncMock(spec=asyncio.StreamReader)
        writer = MagicMock(spec=asyncio.StreamWriter)
        writer.write = MagicMock()
        writer.drain = AsyncMock()
        writer.close = MagicMock()
        writer.wait_closed = AsyncMock()

        # Response sequence: OK status for each phase
        reader.readexactly = AsyncMock(
            side_effect=[
                bytes([0]),    # header response OK
                bytes([0]),    # auth OK (no auth)
                bytes([0]),    # size OK
                bytes([0]),    # md5 OK
                bytes([0]),    # upload OK
                bytes([0]),    # final OK
            ]
        )

        with patch("asyncio.open_connection", new_callable=AsyncMock, return_value=(reader, writer)):
            await push_ota("192.168.1.42", firmware)

        assert writer.write.called

    async def test_push_connection_refused(self) -> None:
        """Raises OTAError on connection failure."""
        with patch(
            "asyncio.open_connection",
            new_callable=AsyncMock,
            side_effect=ConnectionRefusedError("Connection refused"),
        ):
            with pytest.raises(OTAError, match="connect"):
                await push_ota("192.168.1.42", b"\x00" * 100)

    async def test_push_bad_status(self) -> None:
        """Raises OTAError when device rejects the OTA."""
        reader = AsyncMock(spec=asyncio.StreamReader)
        writer = MagicMock(spec=asyncio.StreamWriter)
        writer.write = MagicMock()
        writer.drain = AsyncMock()
        writer.close = MagicMock()
        writer.wait_closed = AsyncMock()

        # Device rejects with error status
        reader.readexactly = AsyncMock(return_value=bytes([0x01]))  # error

        with patch("asyncio.open_connection", new_callable=AsyncMock, return_value=(reader, writer)):
            with pytest.raises(OTAError):
                await push_ota("192.168.1.42", b"\x00" * 100)


def _async_context_manager(mock_obj):
    """Create an async context manager wrapper for a mock."""
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=mock_obj)
    cm.__aexit__ = AsyncMock(return_value=False)
    return cm
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher && python -m pytest tests/test_ota.py -v`
Expected: FAIL — module `custom_components.eppgrid.ota` does not exist.

- [ ] **Step 3: Implement OTA module**

Create `custom_components/eppgrid/ota.py`:

```python
"""ESPHome OTA protocol — download firmware and push to devices."""

from __future__ import annotations

import asyncio
import hashlib
import logging
from typing import Any

from .const import MANIFEST_BASE_URL, OTA_PORT

_LOGGER = logging.getLogger(__name__)

# ESPHome OTA protocol magic
_OTA_MAGIC = 0x6C
_OTA_VERSION = 2
_AUTH_NONE = 0
_CHUNK_SIZE = 8192


class OTAError(Exception):
    """OTA operation failed."""


async def fetch_firmware_binary(session: Any, variant: str) -> bytes:
    """Download the OTA binary for a firmware variant.

    Fetches the manifest JSON, extracts the OTA binary URL, and downloads it.
    """
    manifest_url = f"{MANIFEST_BASE_URL}/everything-presence-pro-{variant}-manifest.json"

    async with session.get(manifest_url) as resp:
        resp.raise_for_status()
        manifest = await resp.json()

    # Find the OTA build
    ota_path = None
    for build in manifest.get("builds", []):
        ota = build.get("ota")
        if ota:
            ota_path = ota["path"]
            break

    if ota_path is None:
        raise OTAError(f"No OTA build found in manifest for variant '{variant}'")

    # OTA path is relative to the manifest URL's directory
    base = manifest_url.rsplit("/", 1)[0]
    binary_url = f"{base}/{ota_path}"

    async with session.get(binary_url) as resp:
        resp.raise_for_status()
        return await resp.read()


async def push_ota(
    host: str,
    firmware: bytes,
    port: int = OTA_PORT,
    password: str = "",
    timeout: float = 120.0,
    on_progress: Any = None,
) -> None:
    """Push firmware to an ESPHome device via the OTA protocol.

    This implements the ESPHome OTA protocol (same as ESPHome Dashboard):
    1. Connect to device on OTA port
    2. Send magic byte + version
    3. Receive OK
    4. Handle auth (we expect no auth)
    5. Send firmware size + MD5
    6. Stream firmware in chunks
    7. Receive final confirmation

    Raises OTAError on any failure.
    """
    md5 = hashlib.md5(firmware).hexdigest()
    size = len(firmware)

    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port),
            timeout=10.0,
        )
    except (ConnectionRefusedError, OSError, asyncio.TimeoutError) as err:
        raise OTAError(f"Failed to connect to {host}:{port}: {err}") from err

    try:
        # Phase 1: Hello
        writer.write(bytes([_OTA_MAGIC, _OTA_VERSION]))
        await writer.drain()

        status = await asyncio.wait_for(reader.readexactly(1), timeout=10.0)
        if status[0] != 0:
            raise OTAError(f"Device rejected OTA hello (status={status[0]})")

        # Phase 2: Auth
        # We send "no password" — device should accept
        writer.write(bytes([_AUTH_NONE]))
        await writer.drain()

        status = await asyncio.wait_for(reader.readexactly(1), timeout=10.0)
        if status[0] != 0:
            raise OTAError(f"Device rejected auth (status={status[0]})")

        # Phase 3: Size
        writer.write(size.to_bytes(4, "big"))
        await writer.drain()

        status = await asyncio.wait_for(reader.readexactly(1), timeout=10.0)
        if status[0] != 0:
            raise OTAError(f"Device rejected firmware size (status={status[0]})")

        # Phase 4: MD5
        writer.write(md5.encode("ascii"))
        await writer.drain()

        status = await asyncio.wait_for(reader.readexactly(1), timeout=10.0)
        if status[0] != 0:
            raise OTAError(f"Device rejected MD5 (status={status[0]})")

        # Phase 5: Upload
        sent = 0
        while sent < size:
            chunk = firmware[sent : sent + _CHUNK_SIZE]
            writer.write(chunk)
            await writer.drain()
            sent += len(chunk)
            if on_progress:
                on_progress(int(sent / size * 100))

        # Phase 6: Confirmation
        status = await asyncio.wait_for(reader.readexactly(1), timeout=60.0)
        if status[0] != 0:
            raise OTAError(f"Device rejected firmware upload (status={status[0]})")

        # Final OK
        status = await asyncio.wait_for(reader.readexactly(1), timeout=60.0)
        if status[0] != 0:
            raise OTAError(f"Device failed to apply firmware (status={status[0]})")

        _LOGGER.info("OTA push to %s complete (%d bytes)", host, size)

    finally:
        writer.close()
        await writer.wait_closed()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher && python -m pytest tests/test_ota.py -v`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add custom_components/eppgrid/ota.py tests/test_ota.py
git commit -m "feat: ESPHome OTA protocol for pushing firmware to devices"
```

---

## Task 4: Backend — flash_ota WebSocket Command

Add the `flash_ota` websocket subscription that orchestrates the full OTA flow: delete old device, fetch firmware, push OTA, wait for reboot, auto-add to ESPHome.

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py`
- Modify: `custom_components/eppgrid/device_manager.py`
- Modify: `tests/test_websocket_flasher.py`

- [ ] **Step 1: Write failing tests**

Add to `tests/test_websocket_flasher.py`:

```python
class TestFlashOta:
    """Tests for eppgrid/flash_ota."""

    async def test_flash_ota_streams_progress(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.list_flashable_devices = AsyncMock(return_value=[
            {
                "mac": "AA:BB:CC:DD:EE:FF",
                "name": "Kitchen",
                "host": "192.168.1.42",
                "available": True,
                "firmware_type": "original",
                "firmware_version": "1.8.0",
                "esphome_config_entry_id": "esphome_1",
            }
        ])

        from custom_components.eppgrid.websocket_api import websocket_flash_ota

        connection = MagicMock()
        connection.send_message = MagicMock()
        msg = {"id": 1, "type": "eppgrid/flash_ota", "mac": "AA:BB:CC:DD:EE:FF", "variant": "wifi"}

        with (
            patch.object(
                hass.config_entries, "async_remove", new_callable=AsyncMock
            ),
            patch(
                "custom_components.eppgrid.websocket_api.fetch_firmware_binary",
                new_callable=AsyncMock,
                return_value=b"\x00" * 1000,
            ),
            patch(
                "custom_components.eppgrid.websocket_api.push_ota",
                new_callable=AsyncMock,
            ),
            patch(
                "custom_components.eppgrid.websocket_api._wait_for_device_online",
                new_callable=AsyncMock,
                return_value=True,
            ),
            patch.object(
                hass.config_entries.flow,
                "async_init",
                new_callable=AsyncMock,
                return_value=MagicMock(type="create_entry"),
            ),
        ):
            await call_async_handler(hass, websocket_flash_ota, connection, msg)

        # Should have sent multiple progress messages + final result
        assert connection.send_message.call_count >= 2

    async def test_flash_ota_device_not_found(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.list_flashable_devices = AsyncMock(return_value=[])

        from custom_components.eppgrid.websocket_api import websocket_flash_ota

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/flash_ota", "mac": "AA:BB:CC:DD:EE:FF", "variant": "wifi"}

        await call_async_handler(hass, websocket_flash_ota, connection, msg)

        connection.send_error.assert_called_once()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher && python -m pytest tests/test_websocket_flasher.py::TestFlashOta -v`
Expected: FAIL — `websocket_flash_ota` does not exist.

- [ ] **Step 3: Implement flash_ota**

Add to `custom_components/eppgrid/websocket_api.py`:

At the top, add imports:
```python
from .ota import OTAError, fetch_firmware_binary, push_ota
```

Register the command in `async_register_websocket_commands`:
```python
    websocket_api.async_register_command(hass, websocket_flash_ota)
```

Add helper and handler:

```python
async def _wait_for_device_online(hass: HomeAssistant, host: str, timeout: float = 120.0) -> bool:
    """Wait for a device to come online on its ESPHome API port."""
    import time
    start = time.monotonic()
    while time.monotonic() - start < timeout:
        try:
            _, writer = await asyncio.wait_for(
                asyncio.open_connection(host, 6053), timeout=5.0
            )
            writer.close()
            await writer.wait_closed()
            return True
        except (ConnectionRefusedError, OSError, asyncio.TimeoutError):
            await asyncio.sleep(2.0)
    return False


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/flash_ota",
        vol.Required("mac"): str,
        vol.Required("variant"): vol.In(["wifi", "ethernet"]),
    }
)
@websocket_api.async_response
async def websocket_flash_ota(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Flash firmware OTA to a device. Streams progress events."""
    import aiohttp

    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return

    mac = msg["mac"]
    variant = msg["variant"]
    msg_id = msg["id"]

    # Find the device
    devices = await manager.list_flashable_devices()
    device = next((d for d in devices if d["mac"] == mac), None)
    if device is None:
        connection.send_error(msg_id, "not_found", f"Device {mac} not found")
        return

    host = device["host"]
    if not host:
        connection.send_error(msg_id, "no_host", "Device has no known IP address")
        return

    def send_progress(step: str, status: str = "in_progress", **kwargs: Any) -> None:
        connection.send_message(
            websocket_api.event_message(msg_id, {"step": step, "status": status, **kwargs})
        )

    try:
        # Step 1: Remove old ESPHome config entry
        config_entry_id = device.get("esphome_config_entry_id")
        if config_entry_id:
            send_progress("removing_old_device")
            await hass.config_entries.async_remove(config_entry_id)

        # Step 2: Fetch firmware
        send_progress("downloading_firmware")
        async with aiohttp.ClientSession() as session:
            firmware = await fetch_firmware_binary(session, variant)

        # Step 3: Push OTA
        send_progress("flashing")

        def on_progress(pct: int) -> None:
            send_progress("flashing", progress=pct)

        await push_ota(host, firmware, on_progress=on_progress)

        # Step 4: Wait for reboot
        send_progress("waiting_for_reboot")
        online = await _wait_for_device_online(hass, host)
        if not online:
            send_progress("waiting_for_reboot", status="timeout")
            connection.send_result(msg_id, {"status": "timeout"})
            return

        # Step 5: Auto-add to ESPHome
        send_progress("adding_to_esphome")
        await hass.config_entries.flow.async_init(
            "esphome",
            context={"source": "user"},
            data={"host": host},
        )

        send_progress("complete", status="success")
        connection.send_result(msg_id, {"status": "success"})

    except OTAError as err:
        send_progress("error", status="failed", error=str(err))
        connection.send_error(msg_id, "ota_failed", str(err))
    except Exception as err:
        _LOGGER.exception("Unexpected error during OTA flash")
        connection.send_error(msg_id, "flash_failed", str(err))
```

Also add `import asyncio` at the top of `websocket_api.py` if not already present.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher && python -m pytest tests/test_websocket_flasher.py -v`
Expected: All tests PASS.

- [ ] **Step 5: Run full backend test suite**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher && python -m pytest tests/ -v`
Expected: All tests PASS.

- [ ] **Step 6: Run linting**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher && ruff check custom_components/ tests/ && ruff format --check custom_components/ tests/`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add custom_components/eppgrid/websocket_api.py tests/test_websocket_flasher.py
git commit -m "feat: flash_ota WS command with progress streaming"
```

---

## Task 5: Frontend — FlashableDevice Type & Flasher Controller

Add the `FlashableDevice` type and the `FlasherController` reactive controller that manages device discovery, OTA progress, and serial connection state.

**Files:**
- Modify: `frontend/src/types.ts`
- Create: `frontend/src/controllers/flasher-controller.ts`
- Create: `frontend/src/__tests__/controllers/flasher-controller.test.ts`

- [ ] **Step 1: Add FlashableDevice type**

Add to `frontend/src/types.ts`:

```typescript
export interface FlashableDevice {
	mac: string;
	name: string;
	host: string | null;
	available: boolean;
	firmware_type: "original" | "eppgrid";
	firmware_version: string;
	esphome_config_entry_id: string | null;
}

export type OtaStep =
	| "removing_old_device"
	| "downloading_firmware"
	| "flashing"
	| "waiting_for_reboot"
	| "adding_to_esphome"
	| "complete"
	| "error";

export interface OtaProgress {
	step: OtaStep;
	status: "in_progress" | "success" | "failed" | "timeout";
	progress?: number;
	error?: string;
}
```

- [ ] **Step 2: Write failing controller tests**

Create `frontend/src/__tests__/controllers/flasher-controller.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FlasherController } from "../../controllers/flasher-controller.js";
import type { FlashableDevice } from "../../types.js";

function mockHost() {
	return {
		requestUpdate: vi.fn(),
		addController: vi.fn(),
		removeController: vi.fn(),
		updateComplete: Promise.resolve(true),
	};
}

function mockHass(devices: FlashableDevice[] = []) {
	return {
		callWS: vi.fn().mockResolvedValue({ devices }),
		connection: {
			subscribeMessage: vi.fn().mockResolvedValue(vi.fn()),
		},
	};
}

describe("FlasherController", () => {
	let host: ReturnType<typeof mockHost>;
	let ctrl: FlasherController;

	beforeEach(() => {
		host = mockHost();
		ctrl = new FlasherController(host);
	});

	describe("constructor", () => {
		it("registers itself with the host", () => {
			expect(host.addController).toHaveBeenCalledWith(ctrl);
		});

		it("initializes with empty state", () => {
			expect(ctrl.flashableDevices).toEqual([]);
			expect(ctrl.loading).toBe(true);
			expect(ctrl.otaProgress).toBeNull();
			expect(ctrl.flashingMac).toBeNull();
		});
	});

	describe("loadDevices", () => {
		it("fetches flashable devices via WS", async () => {
			const devices: FlashableDevice[] = [
				{
					mac: "AA:BB:CC:DD:EE:FF",
					name: "Kitchen",
					host: "192.168.1.42",
					available: true,
					firmware_type: "original",
					firmware_version: "1.8.0",
					esphome_config_entry_id: "e1",
				},
			];
			const hass = mockHass(devices);
			ctrl.hass = hass;

			await ctrl.loadDevices();

			expect(hass.callWS).toHaveBeenCalledWith({
				type: "eppgrid/list_flashable_devices",
			});
			expect(ctrl.flashableDevices).toEqual(devices);
			expect(ctrl.loading).toBe(false);
			expect(host.requestUpdate).toHaveBeenCalled();
		});

		it("handles WS error gracefully", async () => {
			const hass = mockHass();
			hass.callWS = vi.fn().mockRejectedValue(new Error("fail"));
			ctrl.hass = hass;

			await ctrl.loadDevices();

			expect(ctrl.flashableDevices).toEqual([]);
			expect(ctrl.loading).toBe(false);
		});
	});

	describe("startOtaFlash", () => {
		it("subscribes to flash_ota events and tracks progress", async () => {
			const hass = mockHass();
			let subscriber: ((msg: any) => void) | undefined;
			hass.connection.subscribeMessage = vi.fn().mockImplementation((cb) => {
				subscriber = cb;
				return Promise.resolve(vi.fn());
			});
			ctrl.hass = hass;

			const promise = ctrl.startOtaFlash("AA:BB:CC:DD:EE:FF", "wifi");

			// Simulate progress events
			subscriber!({ step: "flashing", status: "in_progress", progress: 50 });
			expect(ctrl.otaProgress).toEqual({
				step: "flashing",
				status: "in_progress",
				progress: 50,
			});
			expect(ctrl.flashingMac).toBe("AA:BB:CC:DD:EE:FF");

			subscriber!({ step: "complete", status: "success" });
			await promise;

			expect(ctrl.otaProgress?.status).toBe("success");
		});
	});

	describe("deleteEsphomeDevice", () => {
		it("calls delete WS command", async () => {
			const hass = mockHass();
			ctrl.hass = hass;

			await ctrl.deleteEsphomeDevice("entry_1");

			expect(hass.callWS).toHaveBeenCalledWith({
				type: "eppgrid/delete_esphome_device",
				config_entry_id: "entry_1",
			});
		});
	});

	describe("addEsphomeDevice", () => {
		it("calls add WS command", async () => {
			const hass = mockHass();
			ctrl.hass = hass;

			await ctrl.addEsphomeDevice("192.168.1.42");

			expect(hass.callWS).toHaveBeenCalledWith({
				type: "eppgrid/add_esphome_device",
				host: "192.168.1.42",
			});
		});
	});
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher/frontend && npx vitest run src/__tests__/controllers/flasher-controller.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 4: Implement FlasherController**

Create `frontend/src/controllers/flasher-controller.ts`:

```typescript
import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { FlashableDevice, OtaProgress } from "../types.js";

/**
 * FlasherController manages flashable device discovery, OTA flash
 * orchestration, and serial connection state.
 */
export class FlasherController implements ReactiveController {
	flashableDevices: FlashableDevice[] = [];
	loading = true;
	otaProgress: OtaProgress | null = null;
	flashingMac: string | null = null;

	private _host: ReactiveControllerHost;
	private _hass: any = null;
	private _unsubOta?: () => void;

	constructor(host: ReactiveControllerHost) {
		this._host = host;
		host.addController(this);
	}

	hostConnected(): void {}
	hostDisconnected(): void {
		this._unsubOta?.();
		this._unsubOta = undefined;
	}

	get hass(): any {
		return this._hass;
	}
	set hass(value: any) {
		this._hass = value;
	}

	async loadDevices(): Promise<void> {
		if (!this._hass) {
			this.loading = false;
			return;
		}
		try {
			const resp = await this._hass.callWS({
				type: "eppgrid/list_flashable_devices",
			});
			this.flashableDevices = resp.devices;
		} catch {
			this.flashableDevices = [];
		}
		this.loading = false;
		this._host.requestUpdate();
	}

	async startOtaFlash(mac: string, variant: string): Promise<void> {
		if (!this._hass) return;

		this.flashingMac = mac;
		this.otaProgress = null;
		this._host.requestUpdate();

		return new Promise<void>((resolve) => {
			this._hass.connection.subscribeMessage(
				(msg: OtaProgress) => {
					this.otaProgress = msg;
					this._host.requestUpdate();
					if (msg.status === "success" || msg.status === "failed" || msg.status === "timeout") {
						resolve();
					}
				},
				{
					type: "eppgrid/flash_ota",
					mac,
					variant,
				},
			).then((unsub: () => void) => {
				this._unsubOta = unsub;
			});
		});
	}

	async deleteEsphomeDevice(configEntryId: string): Promise<void> {
		if (!this._hass) return;
		await this._hass.callWS({
			type: "eppgrid/delete_esphome_device",
			config_entry_id: configEntryId,
		});
	}

	async addEsphomeDevice(host: string): Promise<void> {
		if (!this._hass) return;
		await this._hass.callWS({
			type: "eppgrid/add_esphome_device",
			host,
		});
	}
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher/frontend && npx vitest run src/__tests__/controllers/flasher-controller.test.ts`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/clintongormley/workspace/worktrees/epp-flasher
git add frontend/src/types.ts frontend/src/controllers/flasher-controller.ts frontend/src/__tests__/controllers/flasher-controller.test.ts
git commit -m "feat: FlasherController with device discovery and OTA progress"
```

---

## Task 6: Frontend — Improv Serial Protocol Parser

Implement the Improv Serial protocol for WiFi scanning and provisioning over Web Serial API.

**Files:**
- Create: `frontend/src/lib/improv-serial.ts`
- Create: `frontend/src/__tests__/lib/improv-serial.test.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/__tests__/lib/improv-serial.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
	buildImprovPacket,
	buildWifiCommand,
	buildScanCommand,
	parseImprovPackets,
	parseScanResults,
	IMPROV_HEADER,
	TYPE_RPC_COMMAND,
	TYPE_RPC_RESULT,
	CMD_WIFI_SETTINGS,
	CMD_WIFI_SCAN,
	type WifiNetwork,
} from "../../lib/improv-serial.js";

describe("Improv Serial Protocol", () => {
	describe("constants", () => {
		it("IMPROV_HEADER is 'IMPROV' in bytes", () => {
			expect(IMPROV_HEADER).toEqual([0x49, 0x4d, 0x50, 0x52, 0x4f, 0x56]);
		});
	});

	describe("buildImprovPacket", () => {
		it("creates a valid packet with checksum", () => {
			const pkt = buildImprovPacket(TYPE_RPC_COMMAND, [CMD_WIFI_SCAN, 0x00]);
			// Header (6) + version (1) + type (1) + length (1) + data (2) + checksum (1)
			expect(pkt.length).toBe(12);
			// Verify header
			expect([...pkt.slice(0, 6)]).toEqual(IMPROV_HEADER);
			// Verify version
			expect(pkt[6]).toBe(0x01);
			// Verify type
			expect(pkt[7]).toBe(TYPE_RPC_COMMAND);
			// Verify data length
			expect(pkt[8]).toBe(2);
			// Verify checksum (sum of all preceding bytes mod 256)
			let sum = 0;
			for (let i = 0; i < pkt.length - 1; i++) sum = (sum + pkt[i]) & 0xff;
			expect(pkt[pkt.length - 1]).toBe(sum);
		});
	});

	describe("buildScanCommand", () => {
		it("creates scan RPC command", () => {
			const pkt = buildScanCommand();
			expect(pkt[7]).toBe(TYPE_RPC_COMMAND); // type
			expect(pkt[9]).toBe(CMD_WIFI_SCAN); // command byte
		});
	});

	describe("buildWifiCommand", () => {
		it("encodes SSID and password", () => {
			const pkt = buildWifiCommand("MyNet", "pass123");
			expect(pkt[7]).toBe(TYPE_RPC_COMMAND);
			expect(pkt[9]).toBe(CMD_WIFI_SETTINGS);
			// Data: cmd(1) + total_len(1) + ssid_len(1) + ssid(5) + pass_len(1) + pass(7) = 16
			// data field starts at pkt[9]
		});
	});

	describe("parseImprovPackets", () => {
		it("extracts Improv packets from mixed data", () => {
			// Build a scan result packet manually
			const ssid = new TextEncoder().encode("TestNet");
			const rssi = new TextEncoder().encode("-45");
			const auth = new TextEncoder().encode("YES");
			const data = [
				ssid.length, ...ssid,
				rssi.length, ...rssi,
				auth.length, ...auth,
			];
			const inner = [...IMPROV_HEADER, 0x01, TYPE_RPC_RESULT, data.length, ...data];
			let checksum = 0;
			for (const b of inner) checksum = (checksum + b) & 0xff;
			const packet = new Uint8Array([...inner, checksum]);

			// Mix with log text
			const logText = new TextEncoder().encode("[12:00:00][D][main]: Some log\n");
			const mixed = new Uint8Array([...logText, ...packet, ...logText]);

			const packets = parseImprovPackets(mixed);
			expect(packets.length).toBe(1);
			expect(packets[0].type).toBe(TYPE_RPC_RESULT);
			expect(packets[0].data.length).toBe(data.length);
		});

		it("returns empty for data with no Improv packets", () => {
			const data = new TextEncoder().encode("just log text\n");
			expect(parseImprovPackets(data)).toEqual([]);
		});
	});

	describe("parseScanResults", () => {
		it("parses network info from RPC result data", () => {
			const ssid = new TextEncoder().encode("MyWiFi");
			const rssi = new TextEncoder().encode("-60");
			const auth = new TextEncoder().encode("YES");
			const data = new Uint8Array([
				ssid.length, ...ssid,
				rssi.length, ...rssi,
				auth.length, ...auth,
			]);

			const result = parseScanResults(data);
			expect(result).not.toBeNull();
			expect(result!.ssid).toBe("MyWiFi");
			expect(result!.rssi).toBe(-60);
			expect(result!.authRequired).toBe(true);
		});

		it("returns null for empty termination packet", () => {
			const data = new Uint8Array([]);
			expect(parseScanResults(data)).toBeNull();
		});

		it("parses open network", () => {
			const ssid = new TextEncoder().encode("OpenNet");
			const rssi = new TextEncoder().encode("-72");
			const auth = new TextEncoder().encode("NO");
			const data = new Uint8Array([
				ssid.length, ...ssid,
				rssi.length, ...rssi,
				auth.length, ...auth,
			]);

			const result = parseScanResults(data);
			expect(result!.authRequired).toBe(false);
		});
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher/frontend && npx vitest run src/__tests__/lib/improv-serial.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement improv-serial.ts**

Create `frontend/src/lib/improv-serial.ts`:

```typescript
/**
 * Improv Serial protocol implementation for WiFi scanning and provisioning.
 *
 * Spec: https://www.improv-wifi.com/serial/
 *
 * Packet format: [HEADER(6)][VERSION(1)][TYPE(1)][LENGTH(1)][DATA(N)][CHECKSUM(1)]
 * Checksum = sum of all preceding bytes mod 256
 */

export const IMPROV_HEADER = [0x49, 0x4d, 0x50, 0x52, 0x4f, 0x56]; // "IMPROV"

export const TYPE_RPC_COMMAND = 0x03;
export const TYPE_RPC_RESULT = 0x04;

export const CMD_WIFI_SETTINGS = 0x01;
export const CMD_WIFI_SCAN = 0x04;

export interface WifiNetwork {
	ssid: string;
	rssi: number;
	authRequired: boolean;
}

export interface ImprovPacket {
	type: number;
	data: Uint8Array;
}

/**
 * Build a complete Improv Serial packet.
 */
export function buildImprovPacket(type: number, data: number[]): Uint8Array {
	const pkt = [...IMPROV_HEADER, 0x01, type, data.length, ...data];
	let checksum = 0;
	for (const b of pkt) checksum = (checksum + b) & 0xff;
	pkt.push(checksum);
	return new Uint8Array(pkt);
}

/**
 * Build a WiFi scan RPC command.
 */
export function buildScanCommand(): Uint8Array {
	return buildImprovPacket(TYPE_RPC_COMMAND, [CMD_WIFI_SCAN, 0x00]);
}

/**
 * Build a WiFi provisioning RPC command.
 */
export function buildWifiCommand(ssid: string, password: string): Uint8Array {
	const enc = new TextEncoder();
	const ssidBytes = enc.encode(ssid);
	const passBytes = enc.encode(password);
	const data = [
		CMD_WIFI_SETTINGS,
		ssidBytes.length + passBytes.length + 2,
		ssidBytes.length,
		...ssidBytes,
		passBytes.length,
		...passBytes,
	];
	return buildImprovPacket(TYPE_RPC_COMMAND, data);
}

/**
 * Find and parse Improv packets from a mixed byte stream
 * (interleaved with ESPHome log text).
 */
export function parseImprovPackets(data: Uint8Array): ImprovPacket[] {
	const results: ImprovPacket[] = [];
	let i = 0;

	while (i < data.length - 10) {
		// Look for header
		if (
			data[i] !== 0x49 ||
			data[i + 1] !== 0x4d ||
			data[i + 2] !== 0x50 ||
			data[i + 3] !== 0x52 ||
			data[i + 4] !== 0x4f ||
			data[i + 5] !== 0x56
		) {
			i++;
			continue;
		}

		// Found header at position i
		const version = data[i + 6];
		const type = data[i + 7];
		const length = data[i + 8];
		const packetEnd = i + 9 + length + 1; // +1 for checksum

		if (packetEnd > data.length) {
			// Incomplete packet
			break;
		}

		// Verify checksum
		let checksum = 0;
		for (let j = i; j < packetEnd - 1; j++) {
			checksum = (checksum + data[j]) & 0xff;
		}

		if (checksum === data[packetEnd - 1]) {
			results.push({
				type,
				data: data.slice(i + 9, i + 9 + length),
			});
		}

		i = packetEnd;
	}

	return results;
}

/**
 * Parse a single scan result from RPC Result data.
 * Each result has 3 length-prefixed strings: SSID, RSSI, auth required.
 * Returns null for the empty termination packet.
 */
export function parseScanResults(data: Uint8Array): WifiNetwork | null {
	if (data.length === 0) return null;

	const decoder = new TextDecoder();
	let offset = 0;

	const strings: string[] = [];
	while (offset < data.length && strings.length < 3) {
		const len = data[offset];
		offset++;
		if (offset + len > data.length) break;
		strings.push(decoder.decode(data.slice(offset, offset + len)));
		offset += len;
	}

	if (strings.length < 3) return null;

	return {
		ssid: strings[0],
		rssi: Number.parseInt(strings[1], 10),
		authRequired: strings[2] === "YES",
	};
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher/frontend && npx vitest run src/__tests__/lib/improv-serial.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/clintongormley/workspace/worktrees/epp-flasher
git add frontend/src/lib/improv-serial.ts frontend/src/__tests__/lib/improv-serial.test.ts
git commit -m "feat: Improv Serial protocol parser for WiFi scan and provisioning"
```

---

## Task 7: Frontend — Flasher View Component

Create the main Flash Firmware tab UI component that renders the device list, OTA progress, and USB section.

**Files:**
- Create: `frontend/src/components/epp-flasher-view.ts`
- Create: `frontend/src/__tests__/components/epp-flasher-view.test.ts`
- Modify: `frontend/src/styles.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/__tests__/components/epp-flasher-view.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";
import "../../components/epp-flasher-view.js";
import type { EppFlasherView } from "../../components/epp-flasher-view.js";
import type { FlashableDevice } from "../../types.js";

function createView(overrides?: Partial<Record<string, unknown>>): EppFlasherView {
	const el = document.createElement("epp-flasher-view") as EppFlasherView;
	el.hass = { callWS: vi.fn(), connection: { subscribeMessage: vi.fn() } };
	el.flashableDevices = [];
	el.loading = false;
	el.otaProgress = null;
	el.flashingMac = null;
	if (overrides) {
		for (const [k, v] of Object.entries(overrides)) {
			(el as any)[k] = v;
		}
	}
	return el;
}

describe("epp-flasher-view", () => {
	it("is registered as a custom element", () => {
		expect(customElements.get("epp-flasher-view")).toBeDefined();
	});

	it("renders loading state", () => {
		const el = createView({ loading: true });
		const result = (el as any).render();
		expect(result).toBeDefined();
	});

	it("renders device list", () => {
		const devices: FlashableDevice[] = [
			{
				mac: "AA:BB:CC:DD:EE:FF",
				name: "Kitchen",
				host: "192.168.1.42",
				available: true,
				firmware_type: "original",
				firmware_version: "1.8.0",
				esphome_config_entry_id: "e1",
			},
			{
				mac: "11:22:33:44:55:66",
				name: "Office",
				host: "192.168.1.43",
				available: true,
				firmware_type: "eppgrid",
				firmware_version: "1.0.0",
				esphome_config_entry_id: "e2",
			},
		];
		const el = createView({ flashableDevices: devices });
		const result = (el as any).render();
		expect(result).toBeDefined();
	});

	it("renders empty state with no devices", () => {
		const el = createView({ flashableDevices: [] });
		const result = (el as any).render();
		expect(result).toBeDefined();
	});

	it("shows USB section", () => {
		const el = createView();
		const result = (el as any).render();
		expect(result).toBeDefined();
	});

	it("renders OTA progress state", () => {
		const el = createView({
			flashingMac: "AA:BB:CC:DD:EE:FF",
			otaProgress: { step: "flashing", status: "in_progress", progress: 50 },
		});
		const result = (el as any).render();
		expect(result).toBeDefined();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher/frontend && npx vitest run src/__tests__/components/epp-flasher-view.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Add flasher styles**

Add to `frontend/src/styles.ts`:

```typescript
export const flasherStyles = css`
  .flasher-container {
    padding: 24px;
    max-width: 800px;
    margin: 0 auto;
  }

  .device-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }

  .device-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: var(--card-background-color, #fff);
    border-radius: 12px;
    border: 1px solid var(--divider-color, #e0e0e0);
  }

  .device-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .device-name {
    font-weight: 500;
    font-size: 16px;
  }

  .device-meta {
    font-size: 13px;
    color: var(--secondary-text-color, #757575);
  }

  .firmware-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }

  .firmware-badge.original {
    background: var(--warning-color, #ff9800);
    color: white;
  }

  .firmware-badge.eppgrid {
    background: var(--success-color, #4caf50);
    color: white;
  }

  .usb-section {
    margin-top: 24px;
    padding: 20px;
    background: var(--card-background-color, #fff);
    border-radius: 12px;
    border: 1px dashed var(--divider-color, #e0e0e0);
    text-align: center;
  }

  .usb-section p {
    margin: 8px 0;
    color: var(--secondary-text-color, #757575);
  }

  .progress-container {
    padding: 24px;
    text-align: center;
  }

  .progress-steps {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 400px;
    margin: 0 auto;
    text-align: left;
  }

  .progress-step {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .progress-step.active {
    font-weight: 500;
  }

  .progress-step.done {
    color: var(--success-color, #4caf50);
  }

  .variant-selector {
    display: flex;
    gap: 12px;
    margin: 16px 0;
  }

  .variant-option {
    flex: 1;
    padding: 12px;
    border: 2px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    cursor: pointer;
    text-align: center;
    background: var(--card-background-color, #fff);
  }

  .variant-option.selected {
    border-color: var(--primary-color, #03a9f4);
    background: var(--primary-color, #03a9f4);
    color: white;
  }

  .browser-warning {
    padding: 12px;
    background: var(--warning-color, #ff9800);
    color: white;
    border-radius: 8px;
    font-size: 13px;
  }
`;
```

- [ ] **Step 4: Implement epp-flasher-view.ts**

Create `frontend/src/components/epp-flasher-view.ts`:

```typescript
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { FlashableDevice, OtaProgress } from "../types.js";
import { flasherStyles } from "../styles.js";

@customElement("epp-flasher-view")
export class EppFlasherView extends LitElement {
	@property({ attribute: false }) hass: any;
	@property({ attribute: false }) flashableDevices: FlashableDevice[] = [];
	@property({ type: Boolean }) loading = false;
	@property({ attribute: false }) otaProgress: OtaProgress | null = null;
	@property({ attribute: false }) flashingMac: string | null = null;

	@state() private _selectedVariant: "wifi" | "ethernet" = "wifi";
	@state() private _confirmDevice: FlashableDevice | null = null;
	@state() private _hasWebSerial = typeof navigator !== "undefined" && "serial" in navigator;

	static styles = [
		flasherStyles,
		css`
			:host {
				display: block;
			}
		`,
	];

	render() {
		if (this.loading) {
			return html`<div class="flasher-container"><p>Loading devices...</p></div>`;
		}

		if (this.flashingMac && this.otaProgress) {
			return this._renderOtaProgress();
		}

		if (this._confirmDevice) {
			return this._renderConfirmDialog();
		}

		return html`
			<div class="flasher-container">
				<h2>Flash Firmware</h2>
				${this._renderDeviceList()}
				${this._renderUsbSection()}
			</div>
		`;
	}

	private _renderDeviceList() {
		if (this.flashableDevices.length === 0) {
			return html`<p>No EPP devices found on the network.</p>`;
		}

		return html`
			<h3>Devices on Network</h3>
			<div class="device-list">
				${this.flashableDevices.map((dev) => html`
					<div class="device-row">
						<div class="device-info">
							<span class="device-name">${dev.name}</span>
							<span class="device-meta">
								${dev.host ?? "Unknown IP"}
								<span class="firmware-badge ${dev.firmware_type}">
									${dev.firmware_type === "original" ? "Original" : "EPP Grid"} v${dev.firmware_version}
								</span>
							</span>
						</div>
						<button
							class="flash-btn"
							?disabled=${!dev.available}
							@click=${() => { this._confirmDevice = dev; }}
						>
							${dev.available ? "Flash" : "Offline"}
						</button>
					</div>
				`)}
			</div>
		`;
	}

	private _renderUsbSection() {
		return html`
			<div class="usb-section">
				<h3>New Device (USB)</h3>
				<p>Connect a device via USB to flash firmware and configure WiFi.</p>
				${this._hasWebSerial
					? html`<button class="flash-btn" @click=${this._onUsbConnect}>Connect via USB</button>`
					: html`<div class="browser-warning">USB flashing requires Chrome or Edge browser.</div>`}
			</div>
		`;
	}

	private _renderConfirmDialog() {
		const dev = this._confirmDevice!;
		return html`
			<div class="flasher-container">
				<h2>Flash ${dev.name}</h2>
				<p>Select firmware variant:</p>
				<div class="variant-selector">
					<div
						class="variant-option ${this._selectedVariant === "wifi" ? "selected" : ""}"
						@click=${() => { this._selectedVariant = "wifi"; }}
					>WiFi</div>
					<div
						class="variant-option ${this._selectedVariant === "ethernet" ? "selected" : ""}"
						@click=${() => { this._selectedVariant = "ethernet"; }}
					>Ethernet</div>
				</div>
				<p>This will replace the firmware on <strong>${dev.name}</strong> (${dev.host}).
				The device will be temporarily unavailable.</p>
				<div style="display: flex; gap: 12px; margin-top: 16px;">
					<button class="flash-btn" @click=${this._onConfirmFlash}>Flash</button>
					<button @click=${() => { this._confirmDevice = null; }}>Cancel</button>
				</div>
			</div>
		`;
	}

	private _renderOtaProgress() {
		const steps = [
			{ key: "removing_old_device", label: "Removing old device..." },
			{ key: "downloading_firmware", label: "Downloading firmware..." },
			{ key: "flashing", label: "Flashing firmware..." },
			{ key: "waiting_for_reboot", label: "Waiting for reboot..." },
			{ key: "adding_to_esphome", label: "Adding to Home Assistant..." },
			{ key: "complete", label: "Complete!" },
		];

		const currentStep = this.otaProgress!.step;
		const progress = this.otaProgress!.progress;

		return html`
			<div class="progress-container">
				<h2>Flashing Firmware</h2>
				<div class="progress-steps">
					${steps.map((s) => {
						const idx = steps.findIndex((x) => x.key === s.key);
						const currentIdx = steps.findIndex((x) => x.key === currentStep);
						const done = idx < currentIdx;
						const active = s.key === currentStep;
						return html`
							<div class="progress-step ${done ? "done" : ""} ${active ? "active" : ""}">
								${done ? "\u2713" : active ? "\u23F3" : "\u00B7"}
								${s.label}
								${active && s.key === "flashing" && progress != null ? html` ${progress}%` : nothing}
							</div>
						`;
					})}
				</div>
				${this.otaProgress!.status === "failed"
					? html`<p style="color: var(--error-color, red);">${this.otaProgress!.error ?? "Flash failed. Device may need USB recovery."}</p>`
					: nothing}
				${this.otaProgress!.status === "success"
					? html`<button class="flash-btn" @click=${this._onComplete}>Go to Device Configuration</button>`
					: nothing}
			</div>
		`;
	}

	private _onConfirmFlash() {
		const dev = this._confirmDevice!;
		this._confirmDevice = null;
		this.dispatchEvent(
			new CustomEvent("flash-ota", {
				detail: { mac: dev.mac, variant: this._selectedVariant },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _onUsbConnect() {
		this.dispatchEvent(
			new CustomEvent("usb-connect", { bubbles: true, composed: true }),
		);
	}

	private _onComplete() {
		this.dispatchEvent(
			new CustomEvent("flash-complete", { bubbles: true, composed: true }),
		);
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"epp-flasher-view": EppFlasherView;
	}
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher/frontend && npx vitest run src/__tests__/components/epp-flasher-view.test.ts`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/clintongormley/workspace/worktrees/epp-flasher
git add frontend/src/components/epp-flasher-view.ts frontend/src/__tests__/components/epp-flasher-view.test.ts frontend/src/styles.ts
git commit -m "feat: Flash Firmware view component with device list and OTA progress"
```

---

## Task 8: Frontend — Panel Tab Bar & View Routing

Extend `eppgrid-panel.ts` with a tab bar to switch between "Device Configuration" and "Flash Firmware" views.

**Files:**
- Modify: `frontend/src/eppgrid-panel.ts`
- Modify: `frontend/src/__tests__/panel-render.test.ts` (or create `panel-flasher-tab.test.ts`)

- [ ] **Step 1: Write failing tests**

Create `frontend/src/__tests__/panel-flasher-tab.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { EPPGridPanel } from "../eppgrid-panel.js";

function createPanel(): EPPGridPanel {
	const el = new EPPGridPanel();
	(el as any).hass = {
		callWS: vi.fn().mockResolvedValue({ devices: [] }),
		connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
	};
	return el;
}

describe("EPPGridPanel tab routing", () => {
	it("has a _panelTab state defaulting to 'config'", () => {
		const el = createPanel();
		expect((el as any)._panelTab).toBe("config");
	});

	it("can switch to flasher tab", () => {
		const el = createPanel();
		(el as any)._panelTab = "flasher";
		expect((el as any)._panelTab).toBe("flasher");
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher/frontend && npx vitest run src/__tests__/panel-flasher-tab.test.ts`
Expected: FAIL — `_panelTab` property does not exist.

- [ ] **Step 3: Implement tab routing**

Modify `frontend/src/eppgrid-panel.ts`:

1. Add import at top:
```typescript
import "./components/epp-flasher-view.js";
import { FlasherController } from "./controllers/flasher-controller.js";
```

2. Add state property after existing `@state()` declarations (~line 206):
```typescript
@state() private _panelTab: "config" | "flasher" = "config";
```

3. Add flasher controller after existing controller declarations (~line 73):
```typescript
private _flasherCtrl = new FlasherController(this);
```

4. In the `render()` method, wrap the existing content with a tab bar. Add before the existing render logic:
```typescript
// Tab bar (shown when there are devices or in flasher tab)
const tabBar = html`
  <div class="tab-bar">
    <button
      class="tab ${this._panelTab === "config" ? "active" : ""}"
      @click=${() => { this._panelTab = "config"; }}
    >Device Configuration</button>
    <button
      class="tab ${this._panelTab === "flasher" ? "active" : ""}"
      @click=${() => { this._panelTab = "flasher"; }}
    >Flash Firmware</button>
  </div>
`;
```

5. Route to flasher view when `_panelTab === "flasher"`:
```typescript
if (this._panelTab === "flasher") {
  return html`
    ${tabBar}
    <epp-flasher-view
      .hass=${this.hass}
      .flashableDevices=${this._flasherCtrl.flashableDevices}
      .loading=${this._flasherCtrl.loading}
      .otaProgress=${this._flasherCtrl.otaProgress}
      .flashingMac=${this._flasherCtrl.flashingMac}
      @flash-ota=${(e: CustomEvent) => {
        this._flasherCtrl.startOtaFlash(e.detail.mac, e.detail.variant);
      }}
      @flash-complete=${() => { this._panelTab = "config"; }}
    ></epp-flasher-view>
  `;
}
```

6. Add tab bar styles to the static `styles` array:
```typescript
css`
  .tab-bar {
    display: flex;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
    background: var(--app-header-background-color, var(--primary-color));
    padding: 0 16px;
  }
  .tab {
    padding: 12px 20px;
    border: none;
    background: none;
    color: var(--app-header-text-color, white);
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    opacity: 0.7;
    border-bottom: 3px solid transparent;
  }
  .tab.active {
    opacity: 1;
    border-bottom-color: var(--app-header-text-color, white);
  }
`
```

7. When `_panelTab` changes to "flasher", load devices:
```typescript
// In updated() or willUpdate:
if (this._panelTab === "flasher" && this._flasherCtrl.loading) {
  this._flasherCtrl.hass = this.hass;
  this._flasherCtrl.loadDevices();
}
```

8. Add cross-link: when device list is empty in config tab, show link to flasher:
```typescript
// In the existing render path where _devices.length === 0:
// Replace the loading message with:
if (!this._loading && this._devices.length === 0) {
  return html`
    ${tabBar}
    <div class="loading-container">
      <p>No devices with EPP Grid firmware found.</p>
      <button class="flash-btn" @click=${() => { this._panelTab = "flasher"; }}>
        Flash your devices from the Flash Firmware tab
      </button>
    </div>
  `;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher/frontend && npx vitest run src/__tests__/panel-flasher-tab.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Run full frontend test suite**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher/frontend && npx vitest run`
Expected: All tests PASS. Fix any breakage from the panel changes.

- [ ] **Step 6: Build frontend**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher/frontend && npm run build`
Expected: Build succeeds, `custom_components/eppgrid/frontend/eppgrid-panel.js` updated.

- [ ] **Step 7: Commit**

```bash
cd /Users/clintongormley/workspace/worktrees/epp-flasher
git add frontend/src/eppgrid-panel.ts frontend/src/__tests__/panel-flasher-tab.test.ts custom_components/eppgrid/frontend/eppgrid-panel.js
git commit -m "feat: add tab bar with Device Configuration and Flash Firmware views"
```

---

## Task 9: Frontend — Lovelace Cards & Dashboard Strategy

Register the two custom Lovelace cards and the dashboard strategy.

**Files:**
- Create: `frontend/src/components/epp-flasher-card.ts`
- Create: `frontend/src/components/epp-device-card.ts`
- Create: `frontend/src/strategy.ts`
- Modify: `frontend/src/index.ts`
- Create: `frontend/src/__tests__/strategy.test.ts`

- [ ] **Step 1: Write failing strategy test**

Create `frontend/src/__tests__/strategy.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { EPPGridStrategy } from "../strategy.js";

describe("EPPGridStrategy", () => {
	it("generates a two-view dashboard config", async () => {
		const config = await EPPGridStrategy.generate();

		expect(config.views).toHaveLength(2);
		expect(config.views[0].title).toBe("Device Configuration");
		expect(config.views[0].cards).toEqual([{ type: "custom:epp-device-card" }]);
		expect(config.views[1].title).toBe("Flash Firmware");
		expect(config.views[1].cards).toEqual([{ type: "custom:epp-flasher-card" }]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher/frontend && npx vitest run src/__tests__/strategy.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement strategy**

Create `frontend/src/strategy.ts`:

```typescript
/**
 * HA Dashboard Strategy for EPP Grid.
 * Generates a two-view dashboard: Device Configuration + Flash Firmware.
 */
export class EPPGridStrategy {
	static async generate(): Promise<{
		views: Array<{
			title: string;
			cards: Array<{ type: string }>;
		}>;
	}> {
		return {
			views: [
				{
					title: "Device Configuration",
					cards: [{ type: "custom:epp-device-card" }],
				},
				{
					title: "Flash Firmware",
					cards: [{ type: "custom:epp-flasher-card" }],
				},
			],
		};
	}
}
```

- [ ] **Step 4: Implement card wrappers**

Create `frontend/src/components/epp-device-card.ts`:

```typescript
import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import "../eppgrid-panel.js";

@customElement("epp-device-card")
export class EppDeviceCard extends LitElement {
	@property({ attribute: false }) hass: any;

	static styles = css`
		:host { display: block; height: 100%; }
	`;

	setConfig(_config: any) {
		// Lovelace card interface — no config needed
	}

	render() {
		return html`<eppgrid-panel .hass=${this.hass}></eppgrid-panel>`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"epp-device-card": EppDeviceCard;
	}
}
```

Create `frontend/src/components/epp-flasher-card.ts`:

```typescript
import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./epp-flasher-view.js";
import { FlasherController } from "../controllers/flasher-controller.js";

@customElement("epp-flasher-card")
export class EppFlasherCard extends LitElement {
	@property({ attribute: false }) hass: any;

	private _flasherCtrl = new FlasherController(this);

	static styles = css`
		:host { display: block; }
	`;

	setConfig(_config: any) {
		// Lovelace card interface — no config needed
	}

	updated(changed: Map<string, any>) {
		if (changed.has("hass") && this.hass) {
			this._flasherCtrl.hass = this.hass;
			if (this._flasherCtrl.loading) {
				this._flasherCtrl.loadDevices();
			}
		}
	}

	render() {
		return html`
			<epp-flasher-view
				.hass=${this.hass}
				.flashableDevices=${this._flasherCtrl.flashableDevices}
				.loading=${this._flasherCtrl.loading}
				.otaProgress=${this._flasherCtrl.otaProgress}
				.flashingMac=${this._flasherCtrl.flashingMac}
				@flash-ota=${(e: CustomEvent) => {
					this._flasherCtrl.startOtaFlash(e.detail.mac, e.detail.variant);
				}}
			></epp-flasher-view>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"epp-flasher-card": EppFlasherCard;
	}
}
```

- [ ] **Step 5: Update index.ts with card registration and strategy**

Modify `frontend/src/index.ts`:

```typescript
export { EPPGridPanel } from "./eppgrid-panel";
export { EppFlasherCard } from "./components/epp-flasher-card";
export { EppDeviceCard } from "./components/epp-device-card";
export { EPPGridStrategy } from "./strategy";

// Register dashboard strategy with HA
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push(
	{ type: "epp-device-card", name: "EPP Grid Device Configuration", description: "EPP Grid device calibration and zone editor" },
	{ type: "epp-flasher-card", name: "EPP Grid Firmware Flasher", description: "Flash EPP Grid firmware to devices" },
);

// Register strategy
(window as any).customStrategies = (window as any).customStrategies || {};
(window as any).customStrategies["eppgrid"] = {
	generateDashboard: () => EPPGridStrategy.generate(),
};
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher/frontend && npx vitest run src/__tests__/strategy.test.ts`
Expected: PASS.

- [ ] **Step 7: Build frontend**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher/frontend && npm run build`
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
cd /Users/clintongormley/workspace/worktrees/epp-flasher
git add frontend/src/components/epp-flasher-card.ts frontend/src/components/epp-device-card.ts frontend/src/strategy.ts frontend/src/index.ts frontend/src/__tests__/strategy.test.ts custom_components/eppgrid/frontend/eppgrid-panel.js
git commit -m "feat: Lovelace cards and dashboard strategy for EPP Grid"
```

---

## Task 10: Frontend — USB Flash & WiFi Provisioning

Wire up the USB flash flow using ESP Web Tools and Improv Serial WiFi provisioning.

**Note:** This task involves Web Serial API which can't be fully unit-tested (browser API). Focus on the orchestration logic and test what's testable; the actual serial communication will need manual testing.

**Files:**
- Modify: `frontend/src/components/epp-flasher-view.ts`
- Modify: `frontend/src/controllers/flasher-controller.ts`

- [ ] **Step 1: Add ESP Web Tools script loading**

In `epp-flasher-view.ts`, add the ESP Web Tools script loader:

```typescript
// At module level, load ESP Web Tools dynamically
const ESP_WEB_TOOLS_URL = "https://unpkg.com/esp-web-tools@10/dist/web/install-button.js";
let espWebToolsLoaded = false;

function loadEspWebTools(): Promise<void> {
	if (espWebToolsLoaded) return Promise.resolve();
	return new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.type = "module";
		script.src = ESP_WEB_TOOLS_URL;
		script.onload = () => { espWebToolsLoaded = true; resolve(); };
		script.onerror = reject;
		document.head.appendChild(script);
	});
}
```

- [ ] **Step 2: Add USB flash state to flasher controller**

Add to `frontend/src/controllers/flasher-controller.ts`:

```typescript
// Add new state fields:
usbConnected = false;
usbDeviceMac: string | null = null;
usbDeviceName: string | null = null;
usbExistingDevice: FlashableDevice | null = null;
wifiNetworks: WifiNetwork[] = [];
wifiScanning = false;
wifiProvisioning = false;
wifiConnected = false;
wifiSsid: string | null = null;
deviceIp: string | null = null;
```

Add import:
```typescript
import type { WifiNetwork } from "../lib/improv-serial.js";
```

- [ ] **Step 3: Add USB connect handler to flasher view**

In `epp-flasher-view.ts`, implement the USB flow handler:

```typescript
private async _onUsbConnect() {
	await loadEspWebTools();
	this.dispatchEvent(
		new CustomEvent("usb-connect", { bubbles: true, composed: true }),
	);
}
```

- [ ] **Step 4: Add WiFi provisioning UI to flasher view**

Add a new render method in `epp-flasher-view.ts` for the post-flash WiFi provisioning step. This includes:
- WiFi scan button
- Network dropdown (sorted by signal strength)
- Manual SSID toggle
- Password field
- Configure WiFi button
- IP address display on success

```typescript
@state() private _wifiNetworks: WifiNetwork[] = [];
@state() private _wifiScanning = false;
@state() private _selectedSsid = "";
@state() private _manualSsid = false;
@state() private _wifiPassword = "";
@state() private _wifiConnected = false;
@state() private _deviceIp: string | null = null;

private _renderWifiProvisioning() {
	return html`
		<div class="flasher-container">
			<h2>Configure WiFi</h2>
			${this._wifiConnected
				? html`
					<p>Connected to <strong>${this._selectedSsid}</strong></p>
					<p>IP Address: <strong>${this._deviceIp}</strong></p>
					<button class="flash-btn" @click=${this._onWifiComplete}>Continue</button>
				`
				: html`
					<div style="display: flex; gap: 8px; align-items: center; margin-bottom: 16px;">
						<select
							style="flex: 1; padding: 8px;"
							@change=${(e: Event) => {
								this._selectedSsid = (e.target as HTMLSelectElement).value;
							}}
						>
							<option value="" disabled selected>
								${this._wifiScanning ? "Scanning..." : "Click Scan to find networks"}
							</option>
							${this._wifiNetworks
								.sort((a, b) => b.rssi - a.rssi)
								.map((n) => html`
									<option value=${n.ssid}>
										${n.ssid} (${n.rssi} dBm)${n.authRequired ? " \uD83D\uDD12" : ""}
									</option>
								`)}
						</select>
						<button
							class="flash-btn"
							?disabled=${this._wifiScanning}
							@click=${this._onWifiScan}
						>Scan</button>
					</div>
					<label style="display: block; margin-bottom: 8px; cursor: pointer;">
						<input
							type="checkbox"
							@change=${(e: Event) => {
								this._manualSsid = (e.target as HTMLInputElement).checked;
							}}
						/>
						Enter SSID manually (hidden network)
					</label>
					${this._manualSsid
						? html`<input
								type="text"
								placeholder="Enter SSID"
								style="width: 100%; padding: 8px; margin-bottom: 8px;"
								@input=${(e: Event) => {
									this._selectedSsid = (e.target as HTMLInputElement).value;
								}}
							/>`
						: nothing}
					<input
						type="password"
						placeholder="WiFi password"
						style="width: 100%; padding: 8px; margin-bottom: 16px;"
						@input=${(e: Event) => {
							this._wifiPassword = (e.target as HTMLInputElement).value;
						}}
					/>
					<button
						class="flash-btn"
						?disabled=${!this._selectedSsid}
						@click=${this._onWifiProvision}
					>Configure WiFi</button>
				`}
		</div>
	`;
}

private _onWifiScan() {
	this.dispatchEvent(new CustomEvent("wifi-scan", { bubbles: true, composed: true }));
}

private _onWifiProvision() {
	this.dispatchEvent(
		new CustomEvent("wifi-provision", {
			detail: { ssid: this._selectedSsid, password: this._wifiPassword },
			bubbles: true,
			composed: true,
		}),
	);
}

private _onWifiComplete() {
	this.dispatchEvent(new CustomEvent("wifi-complete", { bubbles: true, composed: true }));
}
```

- [ ] **Step 5: Run full frontend test suite**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher/frontend && npx vitest run`
Expected: All tests PASS.

- [ ] **Step 6: Build frontend**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher/frontend && npm run build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
cd /Users/clintongormley/workspace/worktrees/epp-flasher
git add frontend/src/components/epp-flasher-view.ts frontend/src/controllers/flasher-controller.ts custom_components/eppgrid/frontend/eppgrid-panel.js
git commit -m "feat: USB flash flow with WiFi scan and provisioning via Improv Serial"
```

---

## Task 11: Integration Testing & Cleanup

Run the full test suite, fix any issues, update the docs catalog, and do a final build.

**Files:**
- Modify: `docs/backend-data-catalog.md` (add new WS commands)

- [ ] **Step 1: Run full backend tests**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher && python -m pytest tests/ -v --tb=short`
Expected: All tests PASS.

- [ ] **Step 2: Run full frontend tests**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher/frontend && npx vitest run --coverage`
Expected: All tests PASS with coverage above thresholds.

- [ ] **Step 3: Run linting**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher && ruff check custom_components/ tests/ && ruff format --check custom_components/ tests/`
Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher/frontend && npx biome check src/`
Expected: No errors.

- [ ] **Step 4: Final build**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-flasher/frontend && npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Update backend data catalog**

Add the 4 new WebSocket commands to `docs/backend-data-catalog.md`:

- `eppgrid/list_flashable_devices` — returns all EPP devices (original + eppgrid firmware)
- `eppgrid/flash_ota` — OTA flash with progress streaming
- `eppgrid/delete_esphome_device` — remove ESPHome config entry
- `eppgrid/add_esphome_device` — add ESPHome device by IP

- [ ] **Step 6: Commit**

```bash
cd /Users/clintongormley/workspace/worktrees/epp-flasher
git add docs/backend-data-catalog.md
git commit -m "docs: add flasher WS commands to data catalog"
```
