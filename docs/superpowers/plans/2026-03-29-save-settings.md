# Save Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `saveSettings()` stub with a working implementation that persists all settings to the backend and pushes to firmware.

**Architecture:** A unified `set_settings` WS command replaces four individual commands. The backend stores all settings under a single `device_config["settings"]` key. `async_push_config` maps from this key to individual firmware actions with threshold-to-sensitivity inversion. A separate `set_detection_preview` command enables live range preview without persisting. Entity enable/disable states use the HA entity registry as the source of truth.

**Tech Stack:** Python (Home Assistant WS API, voluptuous), TypeScript (Lit, Vitest), pytest

**Spec:** `docs/superpowers/specs/2026-03-29-save-settings-design.md`

---

### Task 1: Backend — Unified `set_settings` WS command

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py`
- Test: `tests/test_websocket_api.py`

- [ ] **Step 1: Write failing test for `set_settings`**

In `tests/test_websocket_api.py`, replace the `TestWebSocketSettings` class:

```python
class TestWebSocketSettings:
    """Tests for unified eppgrid/set_settings command."""

    async def test_set_settings_stores_all_values(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_settings stores all settings under device_config['settings']."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 11,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": -1.5,
            "humidity_offset": 2.0,
            "illuminance_offset": -10.0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 4.0,
            "static_auto_distance": False,
            "static_min_distance": 0.3,
            "static_max_distance": 8.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": 0.0,
            "entities": {"room_occupancy": True, "zone_presence": False},
        }

        await call_async_handler(hass, websocket_set_settings, connection, msg)

        settings = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert settings["temperature_offset"] == -1.5
        assert settings["humidity_offset"] == 2.0
        assert settings["illuminance_offset"] == -10.0
        assert settings["motion_timeout"] == 5.0
        assert settings["target_auto_distance"] is True
        assert settings["target_max_distance"] == 4.0
        assert settings["static_auto_distance"] is False
        assert settings["static_min_distance"] == 0.3
        assert settings["static_max_distance"] == 8.0
        assert settings["static_trigger_threshold"] == 3
        assert settings["static_renew_threshold"] == 3
        assert settings["static_timeout"] == 30.0
        assert settings["static_on_delay"] == 0.0
        assert settings["entities"] == {"room_occupancy": True, "zone_presence": False}
        mock_dm._store.async_save.assert_awaited()
        mock_dm._push_config_to_device.assert_awaited_with("AA:BB:CC:DD:EE:FF")
        connection.send_result.assert_called_once_with(11)

    async def test_set_settings_entities_not_stored(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """entities dict is NOT stored in device_config — it only drives HA registry updates."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 12,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": 0.0,
            "humidity_offset": 0.0,
            "illuminance_offset": 0.0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 6.0,
            "static_auto_distance": True,
            "static_min_distance": 0.3,
            "static_max_distance": 16.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": 0.0,
            "entities": {"room_occupancy": True},
        }

        await call_async_handler(hass, websocket_set_settings, connection, msg)

        settings = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert "entities" not in settings
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings && python -m pytest tests/test_websocket_api.py::TestWebSocketSettings -v`

Expected: ImportError — `websocket_set_settings` does not exist.

- [ ] **Step 3: Implement `set_settings` handler**

In `websocket_api.py`, delete the four individual handlers (`websocket_set_env_calibration`, `websocket_set_motion_timeout`, `websocket_set_tracking`, `websocket_set_static_presence`) and their registrations in `async_register_websocket_commands`. Add the new unified handler:

```python
@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/set_settings",
        vol.Required("mac"): str,
        vol.Required("temperature_offset"): vol.Coerce(float),
        vol.Required("humidity_offset"): vol.Coerce(float),
        vol.Required("illuminance_offset"): vol.Coerce(float),
        vol.Required("motion_timeout"): vol.Coerce(float),
        vol.Required("target_auto_distance"): bool,
        vol.Required("target_max_distance"): vol.Coerce(float),
        vol.Required("static_auto_distance"): bool,
        vol.Required("static_min_distance"): vol.Coerce(float),
        vol.Required("static_max_distance"): vol.Coerce(float),
        vol.Required("static_trigger_threshold"): vol.Coerce(int),
        vol.Required("static_renew_threshold"): vol.Coerce(int),
        vol.Required("static_timeout"): vol.Coerce(float),
        vol.Required("static_on_delay"): vol.Coerce(float),
        vol.Required("entities"): dict,
    }
)
@websocket_api.async_response
async def websocket_set_settings(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save all device settings and push to firmware."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    proto_err = _check_protocol(manager, msg["mac"])
    if proto_err:
        connection.send_error(
            msg["id"],
            proto_err,
            "Firmware update required" if proto_err == "firmware_behind" else "Integration update required",
        )
        return
    mac = msg["mac"]
    device_config = manager._store.devices.setdefault(mac, {})
    # Store all settings EXCEPT entities (those live in HA entity registry)
    device_config["settings"] = {
        "temperature_offset": msg["temperature_offset"],
        "humidity_offset": msg["humidity_offset"],
        "illuminance_offset": msg["illuminance_offset"],
        "motion_timeout": msg["motion_timeout"],
        "target_auto_distance": msg["target_auto_distance"],
        "target_max_distance": msg["target_max_distance"],
        "static_auto_distance": msg["static_auto_distance"],
        "static_min_distance": msg["static_min_distance"],
        "static_max_distance": msg["static_max_distance"],
        "static_trigger_threshold": msg["static_trigger_threshold"],
        "static_renew_threshold": msg["static_renew_threshold"],
        "static_timeout": msg["static_timeout"],
        "static_on_delay": msg["static_on_delay"],
    }
    await manager._store.async_save()
    await manager._push_config_to_device(mac)
    # Entity enable/disable is handled in Task 4
    connection.send_result(msg["id"])
```

Update `async_register_websocket_commands` to register `websocket_set_settings` and remove the four old registrations.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings && python -m pytest tests/test_websocket_api.py::TestWebSocketSettings -v`

Expected: All pass.

- [ ] **Step 5: Delete old handler tests**

Remove from `tests/test_websocket_api.py`: the old `test_set_env_calibration`, `test_set_motion_timeout`, `test_set_tracking`, `test_set_static_presence` tests (they're now replaced by the `test_set_settings_stores_all_values` test). Keep `test_set_pipeline` as pipeline is separate.

- [ ] **Step 6: Run full backend test suite**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings && python -m pytest tests/ -v`

Expected: All pass. No references to deleted handlers.

- [ ] **Step 7: Commit**

```bash
git add custom_components/eppgrid/websocket_api.py tests/test_websocket_api.py
git commit -m "feat: replace individual settings WS commands with unified set_settings"
```

---

### Task 2: Backend — Update `async_push_config` for new settings key

**Files:**
- Modify: `custom_components/eppgrid/device_manager.py`
- Test: `tests/test_device_manager.py`

- [ ] **Step 1: Write failing test**

In `tests/test_device_manager.py`, update the existing `test_push_config_settings` test:

```python
async def test_push_config_settings(self) -> None:
    """push_config reads from 'settings' key and maps to firmware actions."""
    conn = DeviceConnection("192.168.1.100")

    mock_env = MagicMock()
    mock_env.name = "epp_set_env_calibration"
    mock_motion = MagicMock()
    mock_motion.name = "epp_set_motion_timeout"
    mock_tracking = MagicMock()
    mock_tracking.name = "epp_set_tracking"
    mock_static = MagicMock()
    mock_static.name = "epp_set_static_presence"

    with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
        mock_client = mock_cls.return_value
        mock_client.connect = AsyncMock()
        mock_client.list_entities_services = AsyncMock(
            return_value=([], [mock_env, mock_motion, mock_tracking, mock_static])
        )
        mock_client.execute_service = AsyncMock()

        await conn.async_connect()
        await conn.async_push_config(
            {
                "settings": {
                    "temperature_offset": -1.5,
                    "humidity_offset": 2.0,
                    "illuminance_offset": -10.0,
                    "motion_timeout": 5.0,
                    "target_max_distance": 4.0,
                    "static_min_distance": 0.3,
                    "static_max_distance": 8.0,
                    "static_trigger_threshold": 3,
                    "static_renew_threshold": 3,
                    "static_timeout": 30.0,
                    "static_on_delay": 0.0,
                },
            }
        )

        assert mock_client.execute_service.await_count == 4

        # Verify firmware inversion: threshold 3 → sensitivity 7
        static_call = None
        for call in mock_client.execute_service.call_args_list:
            if call[0][0] == mock_static:
                static_call = call[0][1]
        assert static_call is not None
        assert static_call["trigger_sensitivity"] == 7  # 10 - 3
        assert static_call["sustain_sensitivity"] == 7  # 10 - 3
        assert static_call["trigger_range"] == 8.0  # = max_distance

        # Verify env calibration
        env_call = None
        for call in mock_client.execute_service.call_args_list:
            if call[0][0] == mock_env:
                env_call = call[0][1]
        assert env_call is not None
        assert env_call["temperature_offset"] == -1.5
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings && python -m pytest tests/test_device_manager.py::TestDeviceConnection::test_push_config_settings -v`

Expected: FAIL — old code reads from individual keys, not `settings`.

- [ ] **Step 3: Update `async_push_config`**

In `device_manager.py`, replace the settings push loop at the end of `async_push_config`:

```python
        # Push device settings from unified 'settings' key
        settings = config.get("settings")
        if settings:
            service = self._services.get("epp_set_env_calibration")
            if service:
                await self._client.execute_service(service, {
                    "temperature_offset": settings.get("temperature_offset", 0.0),
                    "humidity_offset": settings.get("humidity_offset", 0.0),
                    "illuminance_offset": settings.get("illuminance_offset", 0.0),
                })
                _LOGGER.info("Pushed env_calibration to %s", self._host)

            service = self._services.get("epp_set_motion_timeout")
            if service:
                await self._client.execute_service(service, {
                    "timeout": settings.get("motion_timeout", 5.0),
                })
                _LOGGER.info("Pushed motion_timeout to %s", self._host)

            service = self._services.get("epp_set_tracking")
            if service:
                await self._client.execute_service(service, {
                    "max_range": settings.get("target_max_distance", 6.0),
                })
                _LOGGER.info("Pushed tracking to %s", self._host)

            service = self._services.get("epp_set_static_presence")
            if service:
                await self._client.execute_service(service, {
                    "min_range": settings.get("static_min_distance", 0.3),
                    "max_range": settings.get("static_max_distance", 16.0),
                    "trigger_range": settings.get("static_max_distance", 16.0),
                    "trigger_sensitivity": 10 - settings.get("static_trigger_threshold", 3),
                    "sustain_sensitivity": 10 - settings.get("static_renew_threshold", 3),
                    "timeout": settings.get("static_timeout", 30.0),
                    "on_delay": settings.get("static_on_delay", 0.0),
                    "led_enabled": True,
                })
                _LOGGER.info("Pushed static_presence to %s", self._host)

        # Pipeline stays separate (not part of unified settings)
        pipeline = config.get("pipeline")
        if pipeline:
            service = self._services.get("epp_set_pipeline")
            if service:
                await self._client.execute_service(service, pipeline)
                _LOGGER.info("Pushed pipeline to %s", self._host)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings && python -m pytest tests/test_device_manager.py -v`

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add custom_components/eppgrid/device_manager.py tests/test_device_manager.py
git commit -m "feat: async_push_config reads from unified settings key with firmware inversion"
```

---

### Task 3: Backend — `set_detection_preview` WS command

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py`
- Test: `tests/test_websocket_api.py`

- [ ] **Step 1: Write failing test**

Add to `tests/test_websocket_api.py`:

```python
class TestWebSocketDetectionPreview:
    """Tests for eppgrid/set_detection_preview."""

    async def test_set_detection_preview_pushes_without_saving(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_detection_preview pushes to device but does not persist."""
        mock_dm = await setup_integration(hass, config_entry)
        # Pre-populate stored settings for non-distance fields
        mock_dm._store.devices["AA:BB:CC:DD:EE:FF"] = {
            "settings": {
                "static_trigger_threshold": 5,
                "static_renew_threshold": 4,
                "static_timeout": 20.0,
                "static_on_delay": 1.0,
            }
        }

        mock_session = MagicMock()
        mock_session.async_push_detection_preview = AsyncMock()
        mock_dm.get_session.return_value = mock_session

        from custom_components.eppgrid.websocket_api import websocket_set_detection_preview

        connection = MagicMock()
        msg = {
            "id": 20,
            "type": "eppgrid/set_detection_preview",
            "mac": "AA:BB:CC:DD:EE:FF",
            "target_max_distance": 3.0,
            "static_min_distance": 0.5,
            "static_max_distance": 6.0,
        }

        await call_async_handler(hass, websocket_set_detection_preview, connection, msg)

        mock_session.async_push_detection_preview.assert_awaited_once()
        call_args = mock_session.async_push_detection_preview.call_args[0][0]
        assert call_args["target_max_distance"] == 3.0
        assert call_args["static_min_distance"] == 0.5
        assert call_args["static_max_distance"] == 6.0
        # Non-distance fields come from stored settings
        assert call_args["static_trigger_threshold"] == 5
        mock_dm._store.async_save.assert_not_awaited()
        connection.send_result.assert_called_once_with(20)

    async def test_set_detection_preview_no_session(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_detection_preview is a no-op when no active session."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.get_session.return_value = None

        from custom_components.eppgrid.websocket_api import websocket_set_detection_preview

        connection = MagicMock()
        msg = {
            "id": 21,
            "type": "eppgrid/set_detection_preview",
            "mac": "AA:BB:CC:DD:EE:FF",
            "target_max_distance": 3.0,
            "static_min_distance": 0.5,
            "static_max_distance": 6.0,
        }

        await call_async_handler(hass, websocket_set_detection_preview, connection, msg)

        connection.send_result.assert_called_once_with(21)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings && python -m pytest tests/test_websocket_api.py::TestWebSocketDetectionPreview -v`

Expected: ImportError.

- [ ] **Step 3: Add `async_push_detection_preview` to `DeviceConnection`**

In `device_manager.py`, add after `async_push_config`:

```python
    async def async_push_detection_preview(self, preview: dict[str, Any]) -> None:
        """Push detection distance preview to device without persisting."""
        if self._client is None:
            return

        service = self._services.get("epp_set_tracking")
        if service:
            await self._client.execute_service(service, {
                "max_range": preview.get("target_max_distance", 6.0),
            })

        service = self._services.get("epp_set_static_presence")
        if service:
            await self._client.execute_service(service, {
                "min_range": preview.get("static_min_distance", 0.3),
                "max_range": preview.get("static_max_distance", 16.0),
                "trigger_range": preview.get("static_max_distance", 16.0),
                "trigger_sensitivity": 10 - preview.get("static_trigger_threshold", 3),
                "sustain_sensitivity": 10 - preview.get("static_renew_threshold", 3),
                "timeout": preview.get("static_timeout", 30.0),
                "on_delay": preview.get("static_on_delay", 0.0),
                "led_enabled": True,
            })
```

- [ ] **Step 4: Implement `set_detection_preview` handler**

In `websocket_api.py`:

```python
@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/set_detection_preview",
        vol.Required("mac"): str,
        vol.Required("target_max_distance"): vol.Coerce(float),
        vol.Required("static_min_distance"): vol.Coerce(float),
        vol.Required("static_max_distance"): vol.Coerce(float),
    }
)
@websocket_api.async_response
async def websocket_set_detection_preview(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Push detection distances to device for live preview (no persist)."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    mac = msg["mac"]
    session = manager.get_session(mac)
    if session is not None:
        # Merge preview distances with stored non-distance settings
        stored = (manager._store.get_device(mac) or {}).get("settings", {})
        preview = {
            "target_max_distance": msg["target_max_distance"],
            "static_min_distance": msg["static_min_distance"],
            "static_max_distance": msg["static_max_distance"],
            "static_trigger_threshold": stored.get("static_trigger_threshold", 3),
            "static_renew_threshold": stored.get("static_renew_threshold", 3),
            "static_timeout": stored.get("static_timeout", 30.0),
            "static_on_delay": stored.get("static_on_delay", 0.0),
        }
        await session.async_push_detection_preview(preview)
    connection.send_result(msg["id"])
```

Register in `async_register_websocket_commands`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings && python -m pytest tests/test_websocket_api.py::TestWebSocketDetectionPreview tests/test_device_manager.py -v`

Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add custom_components/eppgrid/websocket_api.py custom_components/eppgrid/device_manager.py tests/test_websocket_api.py
git commit -m "feat: add set_detection_preview WS command for live range preview"
```

---

### Task 4: Backend — Entity management

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py`
- Test: `tests/test_websocket_api.py`

- [ ] **Step 1: Write failing test for entity states in `get_config`**

Add to `tests/test_websocket_api.py` in the `TestWebSocketGetConfig` class:

```python
    async def test_get_config_includes_entity_states(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """get_config includes entity enabled/disabled states from HA registry."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {}}

        from custom_components.eppgrid.websocket_api import websocket_get_config

        with patch("custom_components.eppgrid.websocket_api._get_entity_states") as mock_ent:
            mock_ent.return_value = {"room_occupancy": True, "zone_presence": False}

            connection = MagicMock()
            msg = {"id": 5, "type": "eppgrid/get_config", "mac": "AA:BB:CC:DD:EE:FF"}

            websocket_get_config(hass, connection, msg)

            result = connection.send_result.call_args[0][1]
            assert result["config"]["entities"] == {"room_occupancy": True, "zone_presence": False}
```

- [ ] **Step 2: Write failing test for entity enable/disable in `set_settings`**

Add to `TestWebSocketSettings`:

```python
    async def test_set_settings_applies_entity_changes(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_settings enables/disables entities in HA registry."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        with patch("custom_components.eppgrid.websocket_api._apply_entity_states") as mock_apply:
            connection = MagicMock()
            msg = {
                "id": 13,
                "type": "eppgrid/set_settings",
                "mac": "AA:BB:CC:DD:EE:FF",
                "temperature_offset": 0.0,
                "humidity_offset": 0.0,
                "illuminance_offset": 0.0,
                "motion_timeout": 5.0,
                "target_auto_distance": True,
                "target_max_distance": 6.0,
                "static_auto_distance": True,
                "static_min_distance": 0.3,
                "static_max_distance": 16.0,
                "static_trigger_threshold": 3,
                "static_renew_threshold": 3,
                "static_timeout": 30.0,
                "static_on_delay": 0.0,
                "entities": {"room_occupancy": True, "env_illuminance": False},
            }

            await call_async_handler(hass, websocket_set_settings, connection, msg)

            mock_apply.assert_called_once_with(
                hass, "AA:BB:CC:DD:EE:FF", {"room_occupancy": True, "env_illuminance": False}
            )
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings && python -m pytest tests/test_websocket_api.py::TestWebSocketGetConfig::test_get_config_includes_entity_states tests/test_websocket_api.py::TestWebSocketSettings::test_set_settings_applies_entity_changes -v`

Expected: FAIL — `_get_entity_states` and `_apply_entity_states` don't exist.

- [ ] **Step 4: Implement entity helper functions**

In `websocket_api.py`, add two helper functions. These are stubs that will be filled in when we know the exact entity unique_id patterns from the firmware. For now they provide the interface:

```python
def _get_entity_states(hass: HomeAssistant, mac: str) -> dict[str, bool]:
    """Read entity enabled/disabled states from HA entity registry for a device."""
    manager = _get_manager(hass)
    if manager is None:
        return {}
    dev = manager.devices.get(mac)
    if dev is None or dev.device_id is None:
        return {}

    ent_reg = er.async_get(hass)
    entries = er.async_entries_for_device(ent_reg, dev.device_id)

    # Map unique_id suffixes to entity keys
    ENTITY_MAP = {
        "occupancy": "room_occupancy",
        "static_presence": "room_static_presence",
        "motion": "room_motion_presence",
        "target_presence": "room_target_presence",
        "target_count": "room_target_count",
        "illuminance": "env_illuminance",
        "humidity": "env_humidity",
        "temperature": "env_temperature",
        "co2": "env_co2",
    }

    result: dict[str, bool] = {}
    for entry in entries:
        for suffix, key in ENTITY_MAP.items():
            if entry.unique_id.endswith(f"_{suffix}"):
                result[key] = entry.disabled_by is None
                break
    return result


def _apply_entity_states(hass: HomeAssistant, mac: str, entities: dict[str, bool]) -> None:
    """Apply entity enable/disable changes to HA entity registry."""
    manager = _get_manager(hass)
    if manager is None:
        return
    dev = manager.devices.get(mac)
    if dev is None or dev.device_id is None:
        return

    ent_reg = er.async_get(hass)
    entries = er.async_entries_for_device(ent_reg, dev.device_id)

    ENTITY_MAP = {
        "occupancy": "room_occupancy",
        "static_presence": "room_static_presence",
        "motion": "room_motion_presence",
        "target_presence": "room_target_presence",
        "target_count": "room_target_count",
        "illuminance": "env_illuminance",
        "humidity": "env_humidity",
        "temperature": "env_temperature",
        "co2": "env_co2",
    }

    for entry in entries:
        for suffix, key in ENTITY_MAP.items():
            if entry.unique_id.endswith(f"_{suffix}") and key in entities:
                desired = entities[key]
                if desired:
                    ent_reg.async_update_entity(entry.entity_id, disabled_by=None)
                else:
                    ent_reg.async_update_entity(
                        entry.entity_id, disabled_by=er.RegistryEntryDisabler.INTEGRATION
                    )
                break
```

Update `websocket_get_config` to include entity states in the result:

```python
    config = manager._store.get_device(msg["mac"])
    result = {"config": config or {}}
    result["config"]["entities"] = _get_entity_states(hass, msg["mac"])
    connection.send_result(msg["id"], result)
```

Update `websocket_set_settings` to call `_apply_entity_states` after saving:

```python
    _apply_entity_states(hass, mac, msg["entities"])
    connection.send_result(msg["id"])
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings && python -m pytest tests/test_websocket_api.py -v`

Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add custom_components/eppgrid/websocket_api.py tests/test_websocket_api.py
git commit -m "feat: entity management via HA registry in get_config and set_settings"
```

---

### Task 5: Frontend — Update `parseConfig` and `ParsedSettings`

**Files:**
- Modify: `frontend/src/lib/config-serialization.ts`
- Test: `frontend/src/__tests__/lib/config-serialization.test.ts`

- [ ] **Step 1: Write failing test**

In the existing `config-serialization.test.ts` (or create it if it doesn't exist), add:

```typescript
import { describe, expect, it } from "vitest";
import { parseConfig, parseSettings, type ParsedSettings } from "../../lib/config-serialization.js";

describe("parseSettings", () => {
  it("returns defaults when settings is undefined", () => {
    const s = parseSettings(undefined);
    expect(s.temperatureOffset).toBe(0);
    expect(s.humidityOffset).toBe(0);
    expect(s.illuminanceOffset).toBe(0);
    expect(s.motionTimeout).toBe(5);
    expect(s.targetAutoDistance).toBe(true);
    expect(s.targetMaxDistance).toBe(6);
    expect(s.staticAutoDistance).toBe(true);
    expect(s.staticMinDistance).toBe(0.3);
    expect(s.staticMaxDistance).toBe(16);
    expect(s.staticTriggerThreshold).toBe(3);
    expect(s.staticRenewThreshold).toBe(3);
    expect(s.staticTimeout).toBe(30);
    expect(s.staticOnDelay).toBe(0);
    expect(s.entities).toEqual({});
  });

  it("reads values from settings object", () => {
    const s = parseSettings({
      temperature_offset: -1.5,
      humidity_offset: 2.0,
      illuminance_offset: -10,
      motion_timeout: 10,
      target_auto_distance: false,
      target_max_distance: 4,
      static_auto_distance: false,
      static_min_distance: 1,
      static_max_distance: 8,
      static_trigger_threshold: 5,
      static_renew_threshold: 4,
      static_timeout: 60,
      static_on_delay: 2,
    });
    expect(s.temperatureOffset).toBe(-1.5);
    expect(s.targetAutoDistance).toBe(false);
    expect(s.staticTriggerThreshold).toBe(5);
    expect(s.staticOnDelay).toBe(2);
  });
});

describe("parseConfig with settings", () => {
  it("includes parsed settings in result", () => {
    const config = {
      calibration: { perspective: null, room_width: 0, room_depth: 0 },
      room_layout: {},
      settings: {
        temperature_offset: 5,
        motion_timeout: 10,
      },
      entities: { room_occupancy: true },
    };
    const parsed = parseConfig(config);
    expect(parsed.settings.temperatureOffset).toBe(5);
    expect(parsed.settings.motionTimeout).toBe(10);
    expect(parsed.settings.entities).toEqual({ room_occupancy: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings/frontend && npx vitest run src/__tests__/lib/config-serialization.test.ts`

Expected: FAIL — `parseSettings` doesn't exist.

- [ ] **Step 3: Implement `parseSettings` and update `ParsedConfig`**

In `config-serialization.ts`:

```typescript
export interface ParsedSettings {
    temperatureOffset: number;
    humidityOffset: number;
    illuminanceOffset: number;
    motionTimeout: number;
    targetAutoDistance: boolean;
    targetMaxDistance: number;
    staticAutoDistance: boolean;
    staticMinDistance: number;
    staticMaxDistance: number;
    staticTriggerThreshold: number;
    staticRenewThreshold: number;
    staticTimeout: number;
    staticOnDelay: number;
    entities: Record<string, boolean>;
}

export function parseSettings(raw: any, entities?: any): ParsedSettings {
    const s = raw || {};
    return {
        temperatureOffset: s.temperature_offset ?? 0,
        humidityOffset: s.humidity_offset ?? 0,
        illuminanceOffset: s.illuminance_offset ?? 0,
        motionTimeout: s.motion_timeout ?? 5,
        targetAutoDistance: s.target_auto_distance ?? true,
        targetMaxDistance: s.target_max_distance ?? 6,
        staticAutoDistance: s.static_auto_distance ?? true,
        staticMinDistance: s.static_min_distance ?? 0.3,
        staticMaxDistance: s.static_max_distance ?? 16,
        staticTriggerThreshold: s.static_trigger_threshold ?? 3,
        staticRenewThreshold: s.static_renew_threshold ?? 3,
        staticTimeout: s.static_timeout ?? 30,
        staticOnDelay: s.static_on_delay ?? 0,
        entities: entities || {},
    };
}
```

Update `ParsedConfig` to replace `reportingConfig` and `offsetsConfig` with `settings`:

```typescript
export interface ParsedConfig {
    calibration: ParsedCalibration;
    furniture: FurnitureItem[];
    grid: Uint8Array;
    zoneConfigs: (ZoneConfig | null)[];
    roomThresholds: ParsedRoomThresholds;
    settings: ParsedSettings;
}
```

Update `parseConfig`:

```typescript
export function parseConfig(config: any): ParsedConfig {
    const calibration = parseCalibration(config);
    const layout = config?.room_layout || {};
    return {
        calibration,
        furniture: parseFurniture(layout.furniture),
        grid: parseGrid(layout, calibration.roomWidth, calibration.roomDepth),
        zoneConfigs: parseZoneConfigs(layout),
        roomThresholds: parseRoomThresholds(layout),
        settings: parseSettings(config?.settings, config?.entities),
    };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings/frontend && npx vitest run src/__tests__/lib/config-serialization.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/config-serialization.ts frontend/src/__tests__/lib/config-serialization.test.ts
git commit -m "feat: add parseSettings to config-serialization with unified settings interface"
```

---

### Task 6: Frontend — Update panel state and `_applyConfig`

**Files:**
- Modify: `frontend/src/eppgrid-panel.ts`
- Test: `frontend/src/__tests__/panel-config.test.ts`

- [ ] **Step 1: Write failing test**

Update the `_applyConfig` test `"applies reporting and offsets config"` in `panel-config.test.ts`:

```typescript
it("applies settings from config", () => {
    const a = el as any;
    const config = {
        calibration: { perspective: null, room_width: 0, room_depth: 0 },
        room_layout: {},
        settings: {
            temperature_offset: -1.5,
            humidity_offset: 2.0,
            illuminance_offset: -10,
            motion_timeout: 10,
            target_auto_distance: false,
            target_max_distance: 4,
            static_auto_distance: false,
            static_min_distance: 1,
            static_max_distance: 8,
            static_trigger_threshold: 5,
            static_renew_threshold: 4,
            static_timeout: 60,
            static_on_delay: 2,
        },
        entities: { room_occupancy: true },
    };

    a._applyConfig(config);

    expect(a._temperatureOffset).toBe(-1.5);
    expect(a._humidityOffset).toBe(2.0);
    expect(a._illuminanceOffset).toBe(-10);
    expect(a._motionTimeout).toBe(10);
    expect(a._targetAutoDistance).toBe(false);
    expect(a._targetMaxDistance).toBe(4);
    expect(a._staticAutoDistance).toBe(false);
    expect(a._staticMinDistance).toBe(1);
    expect(a._staticMaxDistance).toBe(8);
    expect(a._staticTriggerThreshold).toBe(5);
    expect(a._staticRenewThreshold).toBe(4);
    expect(a._staticTimeout).toBe(60);
    expect(a._staticOnDelay).toBe(2);
    expect(a._entitiesConfig).toEqual({ room_occupancy: true });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings/frontend && npx vitest run src/__tests__/panel-config.test.ts`

Expected: FAIL — new state properties don't exist.

- [ ] **Step 3: Update panel state and `_applyConfig`**

In `eppgrid-panel.ts`:

1. Rename `_targetAutoRange` → `_targetAutoDistance`, `_staticAutoRange` → `_staticAutoDistance` (update all references in the file).

2. Add new state properties:

```typescript
@state() private _temperatureOffset = 0;
@state() private _humidityOffset = 0;
@state() private _illuminanceOffset = 0;
@state() private _motionTimeout = 5;
@state() private _staticTimeout = 30;
@state() private _staticTriggerThreshold = 3;
@state() private _staticRenewThreshold = 3;
@state() private _staticOnDelay = 0;
```

3. Rename `_reportingConfig` to `_entitiesConfig` and remove `_offsetsConfig`.

4. Update `_applyConfig`:

```typescript
private _applyConfig(config: any): void {
    const parsed = parseConfig(config);

    // Apply calibration
    this._perspective = parsed.calibration.perspective;
    this._roomWidth = parsed.calibration.roomWidth;
    this._roomDepth = parsed.calibration.roomDepth;
    this._setupStep = null;

    // Apply layout
    this._furniture = parsed.furniture;
    this._grid = parsed.grid;
    this._zoneConfigs = parsed.zoneConfigs;

    // Apply room thresholds
    this._roomType = parsed.roomThresholds.roomType;
    this._roomTrigger = parsed.roomThresholds.roomTrigger;
    this._roomRenew = parsed.roomThresholds.roomRenew;
    this._roomTimeout = parsed.roomThresholds.roomTimeout;
    this._roomHandoffTimeout = parsed.roomThresholds.roomHandoffTimeout;
    this._roomEntryPoint = parsed.roomThresholds.roomEntryPoint;

    // Apply settings
    const s = parsed.settings;
    this._temperatureOffset = s.temperatureOffset;
    this._humidityOffset = s.humidityOffset;
    this._illuminanceOffset = s.illuminanceOffset;
    this._motionTimeout = s.motionTimeout;
    this._targetAutoDistance = s.targetAutoDistance;
    this._targetMaxDistance = s.targetMaxDistance;
    this._staticAutoDistance = s.staticAutoDistance;
    this._staticMinDistance = s.staticMinDistance;
    this._staticMaxDistance = s.staticMaxDistance;
    this._staticTriggerThreshold = s.staticTriggerThreshold;
    this._staticRenewThreshold = s.staticRenewThreshold;
    this._staticTimeout = s.staticTimeout;
    this._staticOnDelay = s.staticOnDelay;
    this._entitiesConfig = s.entities;
}
```

5. Update `_renderSettings` to pass the new properties to `epp-settings-view` (replaces `.reportingConfig` and `.offsetsConfig`):

```typescript
.temperatureOffset=${this._temperatureOffset}
.humidityOffset=${this._humidityOffset}
.illuminanceOffset=${this._illuminanceOffset}
.motionTimeout=${this._motionTimeout}
.staticTimeout=${this._staticTimeout}
.staticTriggerThreshold=${this._staticTriggerThreshold}
.staticRenewThreshold=${this._staticRenewThreshold}
.staticOnDelay=${this._staticOnDelay}
.entitiesConfig=${this._entitiesConfig || {}}
```

6. Update `createPanel()` in both `panel-config.test.ts` and `panel-inline-handlers.test.ts` to include the new properties and remove old ones.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings/frontend && npx vitest run`

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/eppgrid-panel.ts frontend/src/__tests__/panel-config.test.ts frontend/src/__tests__/panel-inline-handlers.test.ts
git commit -m "feat: add settings state to panel and update _applyConfig"
```

---

### Task 7: Frontend — Update settings view (properties, rendering, save payload)

**Files:**
- Modify: `frontend/src/components/epp-settings-view.ts`
- Test: `frontend/src/__tests__/components/epp-settings-view.test.ts`

- [ ] **Step 1: Write failing test for new properties**

In `epp-settings-view.test.ts`, update `createView` and add tests:

```typescript
function createView(
    overrides?: Partial<Record<string, unknown>>,
): EppSettingsView {
    const el = document.createElement("epp-settings-view") as EppSettingsView;
    el.grid = initGridFromRoom(3000, 4000);
    el.perspective = [1, 0, 0, 0, 1, 0, 0, 0];
    el.roomWidth = 3000;
    el.roomDepth = 4000;
    el.openAccordions = new Set();
    el.entitiesConfig = {};
    el.temperatureOffset = 0;
    el.humidityOffset = 0;
    el.illuminanceOffset = 0;
    el.motionTimeout = 5;
    el.staticTimeout = 30;
    el.staticTriggerThreshold = 3;
    el.staticRenewThreshold = 3;
    el.staticOnDelay = 0;
    if (overrides) {
        for (const [k, v] of Object.entries(overrides)) {
            (el as any)[k] = v;
        }
    }
    return el;
}
```

Add test for save event payload:

```typescript
describe("save event payload", () => {
    it("emits all settings values in save event", () => {
        const sv = createView({
            dirty: true,
            targetAutoDistance: false,
            targetMaxDistance: 4.0,
            staticAutoDistance: false,
            staticMinDistance: 1.0,
            staticMaxDistance: 8.0,
            motionTimeout: 10,
            staticTimeout: 60,
            staticTriggerThreshold: 5,
            staticRenewThreshold: 4,
            staticOnDelay: 2,
            temperatureOffset: -1.5,
            humidityOffset: 2.0,
            illuminanceOffset: -10,
            entitiesConfig: { room_occupancy: true },
        });

        let payload: any = null;
        sv.addEventListener("save", ((e: CustomEvent) => {
            payload = e.detail;
        }) as EventListener);

        // Trigger the save method directly
        (sv as any)._emitSave();

        expect(payload).not.toBeNull();
        expect(payload.target_auto_distance).toBe(false);
        expect(payload.target_max_distance).toBe(4.0);
        expect(payload.motion_timeout).toBe(10);
        expect(payload.static_trigger_threshold).toBe(5);
        expect(payload.static_renew_threshold).toBe(4);
        expect(payload.static_on_delay).toBe(2);
        expect(payload.temperature_offset).toBe(-1.5);
        expect(payload.entities).toEqual({ room_occupancy: true });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings/frontend && npx vitest run src/__tests__/components/epp-settings-view.test.ts`

Expected: FAIL — new properties and `_emitSave` don't exist.

- [ ] **Step 3: Update settings view**

In `epp-settings-view.ts`:

1. Replace `reportingConfig` and `offsetsConfig` properties with individual typed properties:

```typescript
@property({ type: Number }) temperatureOffset = 0;
@property({ type: Number }) humidityOffset = 0;
@property({ type: Number }) illuminanceOffset = 0;
@property({ type: Number }) motionTimeout = 5;
@property({ type: Number }) staticTimeout = 30;
@property({ type: Number }) staticTriggerThreshold = 3;
@property({ type: Number }) staticRenewThreshold = 3;
@property({ type: Number }) staticOnDelay = 0;
@property({ attribute: false }) entitiesConfig: Record<string, boolean> = {};
```

2. Rename `targetAutoRange` → `targetAutoDistance`, `staticAutoRange` → `staticAutoDistance` throughout.

3. Update `renderSensitivities()` to bind properties instead of hardcoded values, and add the "Presence delay" slider. Replace the hardcoded `value="5"`, `value="30"`, `value="3"` with `.value=${String(this.motionTimeout)}` etc. Add `@input` handlers that update the property and fire `_fireChange`:

```typescript
renderSensitivities() {
    return html`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("settings.motion_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.presence_timeout")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.motionTimeout)} min="0" max="120" step="1" @input=${(e: Event) => {
                const el = e.target as HTMLInputElement;
                this.motionTimeout = Number(el.value);
                el.nextElementSibling!.textContent = el.value;
            }} /><span class="setting-value">${this.motionTimeout}</span><span class="setting-unit">s</span></span>
            ${this.infoTip(this.localize("info.motion_timeout"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.static_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.presence_timeout")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.staticTimeout)} min="0" max="120" step="1" @input=${(e: Event) => {
                const el = e.target as HTMLInputElement;
                this.staticTimeout = Number(el.value);
                el.nextElementSibling!.textContent = el.value;
            }} /><span class="setting-value">${this.staticTimeout}</span><span class="setting-unit">s</span></span>
            ${this.infoTip(this.localize("info.static_timeout"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.trigger_threshold")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" min="0" max="9" .value=${String(this.staticTriggerThreshold)} @input=${(e: Event) => {
                const el = e.target as HTMLInputElement;
                this.staticTriggerThreshold = Number(el.value);
                el.nextElementSibling!.textContent = el.value;
            }} /><span class="setting-value">${this.staticTriggerThreshold}</span><span class="setting-unit"></span></span>
            ${this.infoTip(this.localize("info.trigger_threshold"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.renew_threshold")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" min="0" max="9" .value=${String(this.staticRenewThreshold)} @input=${(e: Event) => {
                const el = e.target as HTMLInputElement;
                this.staticRenewThreshold = Number(el.value);
                el.nextElementSibling!.textContent = el.value;
            }} /><span class="setting-value">${this.staticRenewThreshold}</span><span class="setting-unit"></span></span>
            ${this.infoTip(this.localize("info.renew_threshold"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.presence_delay")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.staticOnDelay)} min="0" max="30" step="0.5" @input=${(e: Event) => {
                const el = e.target as HTMLInputElement;
                this.staticOnDelay = Number(el.value);
                el.nextElementSibling!.textContent = el.value;
            }} /><span class="setting-value">${this.staticOnDelay}</span><span class="setting-unit">s</span></span>
            ${this.infoTip(this.localize("info.presence_delay"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.environmental")}</h4>
          ${this.renderEnvOffset(this.localize("settings.illuminance_offset"), this.sensorState.illuminance, "illuminance", -500, 500, 1, "lux", 0, this.localize("info.illuminance_offset"))}
          ${this.renderEnvOffset(this.localize("settings.humidity_offset"), this.sensorState.humidity, "humidity", -50, 50, 0.1, "%", 1, this.localize("info.humidity_offset"))}
          ${this.renderEnvOffset(this.localize("settings.temperature_offset"), this.sensorState.temperature, "temperature", -20, 20, 0.1, "\u00b0C", 1, this.localize("info.temperature_offset"))}
        </div>
      </div>
    `;
}
```

4. Update `renderEnvOffset` to read from individual offset properties instead of `offsetsConfig`:

```typescript
renderEnvOffset(...) {
    const offset = (this as any)[`${offsetKey}Offset`] ?? 0;
    // rest stays the same but uses the property value
}
```

5. Update `renderReporting` → rename to `renderEntities`, use `entitiesConfig` instead of `reportingConfig`, and rename `data-report-key` to `data-entity-key`.

6. Add `_emitSave()` method that collects all values and emits them:

```typescript
private _emitSave() {
    // Collect offsets from DOM
    const offsets: Record<string, number> = {};
    this.shadowRoot?.querySelectorAll("[data-offset-key]").forEach((el) => {
        const key = (el as HTMLElement).dataset.offsetKey!;
        offsets[key] = parseFloat((el as HTMLInputElement).value);
    });

    // Collect entities from DOM
    const entities: Record<string, boolean> = {};
    this.shadowRoot?.querySelectorAll("[data-entity-key]").forEach((el) => {
        const key = (el as HTMLElement).dataset.entityKey!;
        entities[key] = (el as HTMLInputElement).checked;
    });

    this.dispatchEvent(new CustomEvent("save", {
        detail: {
            target_auto_distance: this.targetAutoDistance,
            target_max_distance: this.targetMaxDistance,
            static_auto_distance: this.staticAutoDistance,
            static_min_distance: this.staticMinDistance,
            static_max_distance: this.staticMaxDistance,
            motion_timeout: this.motionTimeout,
            static_timeout: this.staticTimeout,
            static_trigger_threshold: this.staticTriggerThreshold,
            static_renew_threshold: this.staticRenewThreshold,
            static_on_delay: this.staticOnDelay,
            temperature_offset: offsets.temperature ?? this.temperatureOffset,
            humidity_offset: offsets.humidity ?? this.humidityOffset,
            illuminance_offset: offsets.illuminance ?? this.illuminanceOffset,
            entities,
        },
        bubbles: true,
        composed: true,
    }));
}
```

7. Update `renderSaveCancelButtons` to call `_emitSave()` instead of dispatching a bare `save` event.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings/frontend && npx vitest run`

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/epp-settings-view.ts frontend/src/__tests__/components/epp-settings-view.test.ts
git commit -m "feat: settings view uses typed properties, emits full payload on save"
```

---

### Task 8: Frontend — Implement `saveSettings`

**Files:**
- Modify: `frontend/src/controllers/grid-state-controller.ts`
- Modify: `frontend/src/eppgrid-panel.ts`
- Test: `frontend/src/__tests__/panel-config.test.ts`
- Test: `frontend/src/__tests__/panel-inline-handlers.test.ts`

- [ ] **Step 1: Write failing test**

In `panel-config.test.ts`, replace the `_saveSettings` describe block:

```typescript
describe("_saveSettings", () => {
    let el: EPPGridPanel;

    beforeEach(() => {
        el = createPanel();
    });

    it("calls set_settings WS command with payload", async () => {
        const a = el as any;
        a._selectedMac = "AA:BB:CC:DD:EE:01";
        a._dirty = true;

        const callWS = vi.fn().mockResolvedValue({});
        el.hass = { callWS };

        const payload = {
            target_auto_distance: true,
            target_max_distance: 6.0,
            static_auto_distance: true,
            static_min_distance: 0.3,
            static_max_distance: 16.0,
            motion_timeout: 5,
            static_timeout: 30,
            static_trigger_threshold: 3,
            static_renew_threshold: 3,
            static_on_delay: 0,
            temperature_offset: 0,
            humidity_offset: 0,
            illuminance_offset: 0,
            entities: { room_occupancy: true },
        };

        await a._saveSettings(payload);

        expect(callWS).toHaveBeenCalledWith({
            type: "eppgrid/set_settings",
            mac: "AA:BB:CC:DD:EE:01",
            ...payload,
        });
        expect(a._dirty).toBe(false);
        expect(a._view).toBe("live");
        expect(a._saving).toBe(false);
    });

    it("stays on settings page on WS error", async () => {
        const a = el as any;
        a._selectedMac = "AA:BB:CC:DD:EE:01";
        a._dirty = true;
        a._view = "settings";

        el.hass = {
            callWS: vi.fn().mockRejectedValue(new Error("validation")),
        };

        await a._saveSettings({});

        expect(a._saving).toBe(false);
        expect(a._view).toBe("settings");
        expect(a._dirty).toBe(true);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings/frontend && npx vitest run src/__tests__/panel-config.test.ts`

Expected: FAIL — `_saveSettings` doesn't accept a payload parameter.

- [ ] **Step 3: Update `saveSettings` in `GridStateController`**

In `grid-state-controller.ts`, replace the stub:

```typescript
async saveSettings(payload: Record<string, any>): Promise<void> {
    this.host._saving = true;
    try {
        await this.host.hass.callWS({
            type: "eppgrid/set_settings",
            mac: this.host._selectedMac,
            ...payload,
        });
        this.host._dirty = false;
        this.host._view = "live";
    } catch (e) {
        console.error("Failed to save settings:", e);
        // Stay on settings page, keep dirty
    } finally {
        this.host._saving = false;
    }
}
```

In `eppgrid-panel.ts`, update `_saveSettings` to accept and forward the payload:

```typescript
private async _saveSettings(payload?: Record<string, any>): Promise<void> {
    return this._gridCtrl.saveSettings(payload || {});
}
```

Update the `@save` handler in `_renderSettings` to pass the event detail:

```typescript
@save=${(e: CustomEvent) => this._saveSettings(e.detail)}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings/frontend && npx vitest run`

Expected: All pass.

- [ ] **Step 5: Update stub tests in `panel-inline-handlers.test.ts`**

Update or remove the old `_saveSettings` stub tests in `panel-inline-handlers.test.ts` to match the new behavior.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/controllers/grid-state-controller.ts frontend/src/eppgrid-panel.ts frontend/src/__tests__/panel-config.test.ts frontend/src/__tests__/panel-inline-handlers.test.ts
git commit -m "feat: implement saveSettings with unified WS command"
```

---

### Task 9: Frontend — Detection preview and cancel revert

**Files:**
- Modify: `frontend/src/eppgrid-panel.ts`
- Test: `frontend/src/__tests__/panel-config.test.ts`

- [ ] **Step 1: Write failing test for detection preview**

In `panel-config.test.ts`:

```typescript
describe("detection preview", () => {
    it("calls set_detection_preview on setting-change for distance", async () => {
        const el = createPanel();
        const a = el as any;
        a._selectedMac = "AA:BB:CC:DD:EE:01";

        const callWS = vi.fn().mockResolvedValue({});
        el.hass = { callWS };

        a._onDetectionDistanceChange();

        expect(callWS).toHaveBeenCalledWith({
            type: "eppgrid/set_detection_preview",
            mac: "AA:BB:CC:DD:EE:01",
            target_max_distance: a._targetMaxDistance,
            static_min_distance: a._staticMinDistance,
            static_max_distance: a._staticMaxDistance,
        });
    });
});
```

- [ ] **Step 2: Write failing test for cancel revert**

```typescript
describe("settings cancel", () => {
    it("reloads config then reverts detection preview on cancel", async () => {
        const el = createPanel();
        const a = el as any;
        a._selectedMac = "AA:BB:CC:DD:EE:01";
        a._targetMaxDistance = 4.0;
        a._staticMinDistance = 1.0;
        a._staticMaxDistance = 8.0;
        a._view = "settings";
        a._dirty = true;

        const savedSettings = {
            target_max_distance: 6.0,
            static_min_distance: 0.3,
            static_max_distance: 16.0,
        };
        const callWS = vi.fn().mockResolvedValue({
            config: {
                calibration: { perspective: null, room_width: 0, room_depth: 0 },
                room_layout: {},
                settings: savedSettings,
            },
        });
        el.hass = {
            callWS,
            connection: { subscribeMessage: vi.fn().mockResolvedValue(() => {}) },
        };

        await a._cancelSettings();

        // Should have called get_config (via _loadDeviceConfig) then set_detection_preview
        const types = callWS.mock.calls.map((c: any) => c[0].type);
        expect(types).toContain("eppgrid/get_config");
        expect(types).toContain("eppgrid/set_detection_preview");

        // Preview should use the reloaded saved values (6.0, not 4.0)
        const previewCall = callWS.mock.calls.find(
            (c: any) => c[0].type === "eppgrid/set_detection_preview"
        );
        expect(previewCall[0].target_max_distance).toBe(6.0);
    });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings/frontend && npx vitest run src/__tests__/panel-config.test.ts`

Expected: FAIL — methods don't exist.

- [ ] **Step 4: Implement detection preview and cancel revert**

In `eppgrid-panel.ts`:

```typescript
private _onDetectionDistanceChange(): void {
    this.hass?.callWS({
        type: "eppgrid/set_detection_preview",
        mac: this._selectedMac,
        target_max_distance: this._targetMaxDistance,
        static_min_distance: this._staticMinDistance,
        static_max_distance: this._staticMaxDistance,
    }).catch(() => {});
}

private async _cancelSettings(): Promise<void> {
    this._dirty = false;
    this._view = "live";
    // Reload saved config first — this restores panel state to saved values
    await this._loadDeviceConfig(this._selectedMac);
    // Now push saved values to device to revert any preview
    this.hass?.callWS({
        type: "eppgrid/set_detection_preview",
        mac: this._selectedMac,
        target_max_distance: this._targetMaxDistance,
        static_min_distance: this._staticMinDistance,
        static_max_distance: this._staticMaxDistance,
    }).catch(() => {});
}
```

Update `_renderSettings` to:
- Wire `@setting-change` to also call `_onDetectionDistanceChange` for distance-related changes
- Wire `@cancel` to call `_cancelSettings()`

```typescript
@setting-change=${(e: CustomEvent) => {
    const { key, value } = e.detail;
    (this as any)[`_${key}`] = value;
    if (key.includes("Distance") || key.includes("Auto")) {
        this._onDetectionDistanceChange();
    }
}}
@cancel=${() => this._cancelSettings()}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings/frontend && npx vitest run`

Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/eppgrid-panel.ts frontend/src/__tests__/panel-config.test.ts
git commit -m "feat: detection distance preview and cancel revert"
```

---

### Task 10: Frontend — `applyLayout` saves settings

**Files:**
- Modify: `frontend/src/controllers/grid-state-controller.ts`
- Test: `frontend/src/__tests__/panel-config.test.ts`

- [ ] **Step 1: Write failing test**

In `panel-config.test.ts`, update the `_applyLayout` test:

```typescript
it("saves settings after layout", async () => {
    const a = el as any;
    a._selectedMac = "AA:BB:CC:DD:EE:01";
    a._dirty = true;
    a._targetAutoDistance = true;
    a._targetMaxDistance = 6;
    a._staticAutoDistance = true;
    a._staticMinDistance = 0.3;
    a._staticMaxDistance = 16;
    a._temperatureOffset = 0;
    a._humidityOffset = 0;
    a._illuminanceOffset = 0;
    a._motionTimeout = 5;
    a._staticTimeout = 30;
    a._staticTriggerThreshold = 3;
    a._staticRenewThreshold = 3;
    a._staticOnDelay = 0;
    a._entitiesConfig = {};

    const callWS = vi.fn().mockResolvedValue({});
    el.hass = { callWS };

    await a._applyLayout();

    // Should call set_room_layout AND set_settings
    const types = callWS.mock.calls.map((c: any) => c[0].type);
    expect(types).toContain("eppgrid/set_room_layout");
    expect(types).toContain("eppgrid/set_settings");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings/frontend && npx vitest run src/__tests__/panel-config.test.ts`

Expected: FAIL — `applyLayout` doesn't call `set_settings`.

- [ ] **Step 3: Update `applyLayout` in `GridStateController`**

In `grid-state-controller.ts`, at the end of `applyLayout` (after the `set_room_layout` call succeeds), add a `set_settings` call:

```typescript
// After successful layout save, also save settings (auto distances may have changed)
await this.host.hass.callWS({
    type: "eppgrid/set_settings",
    mac: this.host._selectedMac,
    temperature_offset: this.host._temperatureOffset,
    humidity_offset: this.host._humidityOffset,
    illuminance_offset: this.host._illuminanceOffset,
    motion_timeout: this.host._motionTimeout,
    target_auto_distance: this.host._targetAutoDistance,
    target_max_distance: this.host._targetMaxDistance,
    static_auto_distance: this.host._staticAutoDistance,
    static_min_distance: this.host._staticMinDistance,
    static_max_distance: this.host._staticMaxDistance,
    static_trigger_threshold: this.host._staticTriggerThreshold,
    static_renew_threshold: this.host._staticRenewThreshold,
    static_timeout: this.host._staticTimeout,
    static_on_delay: this.host._staticOnDelay,
    entities: this.host._entitiesConfig || {},
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings/frontend && npx vitest run`

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/controllers/grid-state-controller.ts frontend/src/__tests__/panel-config.test.ts
git commit -m "feat: applyLayout saves settings after layout change"
```

---

### Task 11: Build and full test pass

**Files:** None (verification only)

- [ ] **Step 1: Run full backend test suite**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings && python -m pytest tests/ -v --cov=custom_components/eppgrid --cov-report=term-missing`

Expected: All pass, coverage > 90%.

- [ ] **Step 2: Run full frontend test suite with coverage**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings/frontend && npx vitest run --coverage`

Expected: All pass, coverage > 90%.

- [ ] **Step 3: Build frontend**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings/frontend && npm run build`

Expected: Build succeeds.

- [ ] **Step 4: Run lint checks**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-settings/frontend && npx biome lint src/ && cd .. && ruff check custom_components/ tests/`

Expected: No errors.

- [ ] **Step 5: Add translation keys for new settings**

In `frontend/src/translations/en.json`, add keys for:
- `settings.presence_delay`
- `info.presence_delay`

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: translations, build, and lint fixes for save settings"
```
