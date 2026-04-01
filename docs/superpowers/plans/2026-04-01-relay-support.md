# Relay Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add relay output (GPIO12) support driven by the settings system, with firmware-autonomous operation and a HA switch entity for visibility.

**Architecture:** Two new settings keys (`relay_trigger_mode`, `relay_contact_mode`) flow through the existing settings pipeline: frontend → backend WebSocket → firmware action → NVS persistence. The firmware evaluates relay state on each 1Hz zone publish tick using zone engine results. The `system_alarm_relay` GPIO switch entity is auto-enabled/disabled based on trigger mode.

**Tech Stack:** TypeScript/Lit (frontend), Python/voluptuous (backend), C++17/ESPHome (firmware), doctest (firmware tests), pytest (backend tests), vitest (frontend tests)

**Spec:** `docs/superpowers/specs/2026-04-01-relay-support-design.md`

---

## File Map

| Layer | File | Action | Purpose |
|-------|------|--------|---------|
| Backend | `custom_components/eppgrid/websocket_api.py` | Modify | Add relay keys to `_SETTINGS_KEYS`, validation schema, entity mapping |
| Backend | `custom_components/eppgrid/device_manager.py` | Modify | Map relay settings to `epp_set_relay` action in `async_push_config()` |
| Backend test | `tests/test_websocket_api.py` | Modify | Tests for storage, push, entity auto-enable/disable |
| Frontend | `frontend/src/lib/config-serialization.ts` | Modify | Add relay fields to `ParsedSettings` and `parseSettings()` |
| Frontend | `frontend/src/components/epp-settings-view.ts` | Modify | Add relay accordion section, properties, `_emitSave()` |
| Frontend | `frontend/src/eppgrid-panel.ts` | Modify | Wire relay properties from parsed config to settings view |
| Frontend | `frontend/src/controllers/grid-state-controller.ts` | Modify | Update panel state after save |
| Frontend test | `frontend/src/__tests__/components/epp-settings-view.test.ts` | Modify | Tests for relay section rendering, `_emitSave` |
| Firmware | `firmware/common/everything-presence-pro-base.yaml` | Modify | Add `epp_set_relay` action, remove old relay selects/script |
| Firmware | `firmware/components/epp/epp_component.h` | Modify | Add relay enums, members, method |
| Firmware | `firmware/components/epp/epp_component.cpp` | Modify | Implement relay logic, NVS save/restore |
| Firmware | `firmware/components/epp/__init__.py` | Modify | Register relay switch reference |
| Firmware test | `firmware/lib/epp_zone_engine/tests/test_relay.cpp` | Create | Relay evaluation unit tests |
| Firmware test | `firmware/lib/epp_zone_engine/tests/CMakeLists.txt` | Modify | Add test_relay executable |
| Docs | `docs/backend-data-catalog.md` | Modify | Add relay settings to catalog |

---

### Task 1: Backend — Add relay settings keys and validation

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py:739-775` (settings keys + schema)
- Modify: `custom_components/eppgrid/websocket_api.py:322-337` (entity object ID map)
- Test: `tests/test_websocket_api.py`

- [ ] **Step 1: Write failing test — set_settings stores relay keys**

Add to `TestWebSocketSettings` in `tests/test_websocket_api.py`:

```python
async def test_set_settings_stores_relay_values(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """set_settings stores relay_trigger_mode and relay_contact_mode."""
    mock_dm = await setup_integration(hass, config_entry)

    from custom_components.eppgrid.websocket_api import websocket_set_settings

    connection = MagicMock()
    msg = {
        "id": 11,
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
        "relay_trigger_mode": "motion",
        "relay_contact_mode": "nc",
    }

    await call_async_handler(hass, websocket_set_settings, connection, msg)

    settings = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
    assert settings["relay_trigger_mode"] == "motion"
    assert settings["relay_contact_mode"] == "nc"
    connection.send_result.assert_called_once_with(11)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-relay && python -m pytest tests/test_websocket_api.py::TestWebSocketSettings::test_set_settings_stores_relay_values -v`
Expected: FAIL — voluptuous rejects unknown keys `relay_trigger_mode` and `relay_contact_mode`

- [ ] **Step 3: Write failing test — entity key mapping for relay**

Add to `TestWebSocketEntityMapping` in `tests/test_websocket_api.py`:

```python
def test_entity_key_mapping_relay(self) -> None:
    """system_alarm_relay maps to relay_output key."""
    from custom_components.eppgrid.websocket_api import _entity_key_for_object_id

    assert _entity_key_for_object_id("system_alarm_relay") == "relay_output"
    assert _entity_key_for_object_id("esphome_aabbccddeeff_system_alarm_relay") == "relay_output"
```

- [ ] **Step 4: Run test to verify it fails**

Run: `python -m pytest tests/test_websocket_api.py::TestWebSocketEntityMapping::test_entity_key_mapping_relay -v`
Expected: FAIL — `_entity_key_for_object_id("system_alarm_relay")` returns `None`

- [ ] **Step 5: Update the existing test that asserts relay_output maps to None**

In `tests/test_websocket_api.py`, in `test_entity_key_mapping_unknown`, remove the line:
```python
assert _entity_key_for_object_id("relay_output") is None
```

- [ ] **Step 6: Implement — add relay to settings keys, schema, and entity map**

In `custom_components/eppgrid/websocket_api.py`:

Add to `_SETTINGS_KEYS` tuple (after `"static_on_delay"`):
```python
    "relay_trigger_mode",
    "relay_contact_mode",
```

Add to `set_settings` schema (after `static_on_delay` line):
```python
        vol.Required("relay_trigger_mode"): vol.In(
            ["disabled", "manual", "motion", "presence", "motion_or_presence"]
        ),
        vol.Required("relay_contact_mode"): vol.In(["no", "nc"]),
```

Add to `_ENTITY_OBJECT_ID_MAP` dict:
```python
    "system_alarm_relay": "relay_output",
```

- [ ] **Step 7: Run all new and existing settings tests**

Run: `python -m pytest tests/test_websocket_api.py::TestWebSocketSettings tests/test_websocket_api.py::TestWebSocketEntityMapping -v`
Expected: ALL PASS. Note: existing `test_set_settings_stores_all_values` will fail because it's missing the new required relay keys — fix that test by adding `"relay_trigger_mode": "disabled"` and `"relay_contact_mode": "no"` to its `msg` dict, and similarly for `test_set_settings_applies_entity_changes` and any other test that calls `set_settings`.

- [ ] **Step 8: Commit**

```bash
git add custom_components/eppgrid/websocket_api.py tests/test_websocket_api.py
git commit -m "feat: add relay settings keys and entity mapping to backend"
```

---

### Task 2: Backend — Relay entity auto-enable/disable

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py:778-825` (set_settings handler)
- Test: `tests/test_websocket_api.py`

- [ ] **Step 1: Write failing test — relay entity enabled when trigger mode is not disabled**

Add to `TestWebSocketSettings` in `tests/test_websocket_api.py`:

```python
async def test_set_settings_enables_relay_entity_on_trigger_mode(
    self, hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """set_settings enables relay switch entity when trigger_mode != disabled."""
    await setup_integration(hass, config_entry)

    from custom_components.eppgrid.websocket_api import websocket_set_settings

    with patch("custom_components.eppgrid.websocket_api._apply_entity_states") as mock_apply:
        connection = MagicMock()
        msg = {
            "id": 11,
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
            "relay_trigger_mode": "motion",
            "relay_contact_mode": "no",
        }

        await call_async_handler(hass, websocket_set_settings, connection, msg)

        mock_apply.assert_called_once_with(
            hass, "AA:BB:CC:DD:EE:FF", {"relay_output": True}
        )

async def test_set_settings_disables_relay_entity_on_disabled(
    self, hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """set_settings disables relay switch entity when trigger_mode == disabled."""
    await setup_integration(hass, config_entry)

    from custom_components.eppgrid.websocket_api import websocket_set_settings

    with patch("custom_components.eppgrid.websocket_api._apply_entity_states") as mock_apply:
        connection = MagicMock()
        msg = {
            "id": 11,
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
            "relay_trigger_mode": "disabled",
            "relay_contact_mode": "no",
        }

        await call_async_handler(hass, websocket_set_settings, connection, msg)

        mock_apply.assert_called_once_with(
            hass, "AA:BB:CC:DD:EE:FF", {"relay_output": False}
        )
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_websocket_api.py::TestWebSocketSettings::test_set_settings_enables_relay_entity_on_trigger_mode tests/test_websocket_api.py::TestWebSocketSettings::test_set_settings_disables_relay_entity_on_disabled -v`
Expected: FAIL — `_apply_entity_states` not called (no relay entity logic yet)

- [ ] **Step 3: Implement — auto-enable/disable relay entity in set_settings handler**

In `websocket_set_settings` in `custom_components/eppgrid/websocket_api.py`, add after the `await manager._store.async_save()` line and before the `push_ok` line:

```python
    # Auto-enable/disable relay switch entity based on trigger mode
    relay_enabled = msg["relay_trigger_mode"] != "disabled"
    _apply_entity_states(hass, mac, {"relay_output": relay_enabled})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_websocket_api.py::TestWebSocketSettings -v`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add custom_components/eppgrid/websocket_api.py tests/test_websocket_api.py
git commit -m "feat: auto-enable/disable relay entity based on trigger mode"
```

---

### Task 3: Backend — Push relay settings to firmware

**Files:**
- Modify: `custom_components/eppgrid/device_manager.py:177-305` (async_push_config)
- Test: `tests/test_websocket_api.py`

- [ ] **Step 1: Write failing test — push maps relay settings to epp_set_relay**

Find the test class/pattern used for push config tests. Add:

```python
async def test_push_config_calls_epp_set_relay(
    self, hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """async_push_config calls epp_set_relay with trigger and contact mode."""
    mock_dm = await setup_integration(hass, config_entry)

    mock_dm._store.devices["AA:BB:CC:DD:EE:FF"] = {
        "settings": {
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
            "relay_trigger_mode": "presence",
            "relay_contact_mode": "nc",
        }
    }

    dev = mock_dm.devices.get("AA:BB:CC:DD:EE:FF")
    conn = dev._connection
    conn._services = {"epp_set_relay": MagicMock()}

    config = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]
    await conn.async_push_config(config)

    conn._client.execute_service.assert_any_call(
        conn._services["epp_set_relay"],
        {"trigger_mode": "presence", "contact_mode": "nc"},
    )
```

Note: Adapt this test to match the actual test fixtures/mocking patterns used in the existing push config tests. Check how other `execute_service` calls are tested.

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_websocket_api.py -k "epp_set_relay" -v`
Expected: FAIL — no `epp_set_relay` service call

- [ ] **Step 3: Implement — add relay push to async_push_config**

In `custom_components/eppgrid/device_manager.py`, inside `async_push_config()`, after the static presence push block and before the pipeline push block, add:

```python
        svc = self._services.get("epp_set_relay")
        if svc:
            await self._client.execute_service(
                svc,
                {
                    "trigger_mode": settings.get("relay_trigger_mode", "disabled"),
                    "contact_mode": settings.get("relay_contact_mode", "no"),
                },
            )
            _LOGGER.info("Pushed relay settings to %s", self._host)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_websocket_api.py -k "epp_set_relay" -v`
Expected: PASS

- [ ] **Step 5: Run all backend tests**

Run: `python -m pytest tests/ -v`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add custom_components/eppgrid/device_manager.py tests/test_websocket_api.py
git commit -m "feat: push relay settings to firmware via epp_set_relay action"
```

---

### Task 4: Frontend — Config serialization

**Files:**
- Modify: `frontend/src/lib/config-serialization.ts:33-49,175-198`
- Test: `frontend/src/__tests__/components/epp-settings-view.test.ts` (or a config-serialization test if one exists)

- [ ] **Step 1: Write failing test — parseSettings returns relay defaults**

Check if there's a config-serialization test file. If not, add the test to the settings view test file. Add:

```typescript
describe("parseSettings relay fields", () => {
	it("returns relay defaults when not present in raw", () => {
		const { parseSettings } = await import("../../lib/config-serialization.js");
		const result = parseSettings({});
		expect(result.relayTriggerMode).toBe("disabled");
		expect(result.relayContactMode).toBe("no");
	});

	it("parses relay values from raw", () => {
		const { parseSettings } = await import("../../lib/config-serialization.js");
		const result = parseSettings({
			relay_trigger_mode: "motion",
			relay_contact_mode: "nc",
		});
		expect(result.relayTriggerMode).toBe("motion");
		expect(result.relayContactMode).toBe("nc");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/components/epp-settings-view.test.ts -t "parseSettings relay"`
Expected: FAIL — `relayTriggerMode` not defined on `ParsedSettings`

- [ ] **Step 3: Implement — add relay fields to ParsedSettings and parseSettings**

In `frontend/src/lib/config-serialization.ts`:

Add to `ParsedSettings` interface (after `logLevels`):
```typescript
	relayTriggerMode: string;
	relayContactMode: string;
```

Add to `parseSettings()` return object (after `logLevels`):
```typescript
		relayTriggerMode: s.relay_trigger_mode ?? "disabled",
		relayContactMode: s.relay_contact_mode ?? "no",
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/__tests__/components/epp-settings-view.test.ts -t "parseSettings relay"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/config-serialization.ts frontend/src/__tests__/components/epp-settings-view.test.ts
git commit -m "feat: add relay fields to ParsedSettings and parseSettings"
```

---

### Task 5: Frontend — Settings view relay section

**Files:**
- Modify: `frontend/src/components/epp-settings-view.ts`
- Test: `frontend/src/__tests__/components/epp-settings-view.test.ts`

- [ ] **Step 1: Write failing test — relay section renders**

Add to `frontend/src/__tests__/components/epp-settings-view.test.ts`:

```typescript
describe("relay section", () => {
	it("renders relay section when accordion is open", () => {
		const sv = createView({
			openAccordions: new Set(["relay"]),
			relayTriggerMode: "disabled",
			relayContactMode: "no",
		});
		const tpl = sv.render();
		const c = renderTo(tpl);

		expect(c.querySelectorAll(".accordion").length).toBe(5);
		const body = c.querySelector(".accordion-body");
		expect(body).not.toBeNull();
		document.body.removeChild(c);
	});

	it("hides contact mode when trigger is disabled", () => {
		const sv = createView({
			openAccordions: new Set(["relay"]),
			relayTriggerMode: "disabled",
			relayContactMode: "no",
		});
		const result = (sv as any).renderRelay();
		const c = renderTo(result);

		const selects = c.querySelectorAll("select");
		expect(selects.length).toBe(1); // only trigger mode
		document.body.removeChild(c);
	});

	it("hides contact mode when trigger is manual", () => {
		const sv = createView({
			openAccordions: new Set(["relay"]),
			relayTriggerMode: "manual",
			relayContactMode: "no",
		});
		const result = (sv as any).renderRelay();
		const c = renderTo(result);

		const selects = c.querySelectorAll("select");
		expect(selects.length).toBe(1); // only trigger mode
		document.body.removeChild(c);
	});

	it("shows contact mode when trigger is an automatic mode", () => {
		const sv = createView({
			openAccordions: new Set(["relay"]),
			relayTriggerMode: "motion",
			relayContactMode: "no",
		});
		const result = (sv as any).renderRelay();
		const c = renderTo(result);

		const selects = c.querySelectorAll("select");
		expect(selects.length).toBe(2); // trigger + contact mode
		document.body.removeChild(c);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/__tests__/components/epp-settings-view.test.ts -t "relay section"`
Expected: FAIL — `relayTriggerMode` property doesn't exist, `renderRelay` doesn't exist

- [ ] **Step 3: Write failing test — _emitSave includes relay keys**

Add to the "save event payload" describe block:

```typescript
it("includes relay settings in save payload", () => {
	const sv = createView({
		dirty: true,
		relayTriggerMode: "presence",
		relayContactMode: "nc",
	});

	let payload: any = null;
	sv.addEventListener("save", ((e: CustomEvent) => {
		payload = e.detail;
	}) as EventListener);

	(sv as any)._emitSave();

	expect(payload).not.toBeNull();
	expect(payload.relay_trigger_mode).toBe("presence");
	expect(payload.relay_contact_mode).toBe("nc");
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/components/epp-settings-view.test.ts -t "includes relay settings"`
Expected: FAIL — `relay_trigger_mode` not in payload

- [ ] **Step 5: Implement — add relay properties, section, and _emitSave**

In `frontend/src/components/epp-settings-view.ts`:

Add properties (after `co2Enabled` property):
```typescript
	@property({ type: String }) relayTriggerMode = "disabled";
	@property({ type: String }) relayContactMode = "no";
```

Add to `createView` helper in test file (inside the defaults block):
```typescript
	el.relayTriggerMode = "disabled";
	el.relayContactMode = "no";
```

Add relay section to the `sections` array in `render()`:
```typescript
		{
			id: "relay",
			label: "settings.relay",
			icon: "mdi:electric-switch",
		},
```

Add case to `renderSettingsSection`:
```typescript
			case "relay":
				return this.renderRelay();
```

Add `renderRelay()` method:
```typescript
	renderRelay() {
		const triggerMode = this._overrides.relayTriggerMode ?? this.relayTriggerMode;
		const showContact = triggerMode !== "disabled" && triggerMode !== "manual";
		return html`
      <div class="settings-section">
        <div class="setting-group">
          <div class="setting-row">
            <label>${this.localize("settings.relay_trigger_mode")}</label>
            <select @change=${(e: Event) => {
							const v = (e.target as HTMLSelectElement).value;
							this._overrides.relayTriggerMode = v;
							this._fireChange("relayTriggerMode", v);
						}}>
              <option value="disabled" ?selected=${triggerMode === "disabled"}>${this.localize("settings.relay_disabled")}</option>
              <option value="manual" ?selected=${triggerMode === "manual"}>${this.localize("settings.relay_manual")}</option>
              <option value="motion" ?selected=${triggerMode === "motion"}>${this.localize("settings.relay_motion")}</option>
              <option value="presence" ?selected=${triggerMode === "presence"}>${this.localize("settings.relay_presence")}</option>
              <option value="motion_or_presence" ?selected=${triggerMode === "motion_or_presence"}>${this.localize("settings.relay_motion_or_presence")}</option>
            </select>
          </div>
          ${showContact ? html`
          <div class="setting-row">
            <label>${this.localize("settings.relay_contact_mode")}</label>
            <select @change=${(e: Event) => {
								const v = (e.target as HTMLSelectElement).value;
								this._overrides.relayContactMode = v;
								this._fireChange("relayContactMode", v);
							}}>
              <option value="no" ?selected=${(this._overrides.relayContactMode ?? this.relayContactMode) === "no"}>${this.localize("settings.relay_normally_open")}</option>
              <option value="nc" ?selected=${(this._overrides.relayContactMode ?? this.relayContactMode) === "nc"}>${this.localize("settings.relay_normally_closed")}</option>
            </select>
          </div>
          ` : nothing}
        </div>
      </div>
    `;
	}
```

Add relay keys to `_emitSave()` detail object (after `illuminance_offset`):
```typescript
				relay_trigger_mode: o.relayTriggerMode ?? this.relayTriggerMode,
				relay_contact_mode: o.relayContactMode ?? this.relayContactMode,
```

- [ ] **Step 6: Run all settings view tests**

Run: `cd frontend && npx vitest run src/__tests__/components/epp-settings-view.test.ts`
Expected: ALL PASS. Fix the test that asserts `accordions.length === 4` — update to `5`.

- [ ] **Step 7: Build frontend**

Run: `cd frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/epp-settings-view.ts frontend/src/__tests__/components/epp-settings-view.test.ts
git commit -m "feat: add relay section to settings view"
```

---

### Task 6: Frontend — Wire panel properties

**Files:**
- Modify: `frontend/src/eppgrid-panel.ts:424-441` (config loading)
- Modify: `frontend/src/eppgrid-panel.ts:1297-1336` (settings view template)
- Modify: `frontend/src/controllers/grid-state-controller.ts:553-601` (saveSettings)

- [ ] **Step 1: Add panel properties and config loading**

In `frontend/src/eppgrid-panel.ts`, add private properties (near the other settings properties):
```typescript
	@state() private _relayTriggerMode = "disabled";
	@state() private _relayContactMode = "no";
```

In the config loading section (after `this._staticOnDelay = s.staticOnDelay;`):
```typescript
		this._relayTriggerMode = s.relayTriggerMode;
		this._relayContactMode = s.relayContactMode;
```

In the `<epp-settings-view>` template (after `.co2Enabled`):
```typescript
          .relayTriggerMode=${this._relayTriggerMode}
          .relayContactMode=${this._relayContactMode}
```

- [ ] **Step 2: Update saveSettings to sync panel state after save**

In `frontend/src/controllers/grid-state-controller.ts`, in `saveSettings()`, after the `staticMaxDistance` update:
```typescript
			this.host._relayTriggerMode =
				payload.relay_trigger_mode ?? this.host._relayTriggerMode;
			this.host._relayContactMode =
				payload.relay_contact_mode ?? this.host._relayContactMode;
```

- [ ] **Step 3: Build frontend**

Run: `cd frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Run all frontend tests**

Run: `cd frontend && npx vitest run`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/eppgrid-panel.ts frontend/src/controllers/grid-state-controller.ts
git commit -m "feat: wire relay settings through panel to settings view"
```

---

### Task 7: Firmware — Remove old relay YAML entities and add epp_set_relay action

**Files:**
- Modify: `firmware/common/everything-presence-pro-base.yaml`

- [ ] **Step 1: Remove old relay select entities**

Remove lines 594-622 (the `relay_contact_mode` and `system_alarm_mode` template select entities). Keep the `led_mode_select` template select that follows.

- [ ] **Step 2: Remove update_relay_state script**

Remove lines 642-663 (the `update_relay_state` script). Keep the `control_leds` script.

- [ ] **Step 3: Remove boot-time call to update_relay_state**

Remove line 13 (`- script.execute: update_relay_state`) from the `on_boot` section.

- [ ] **Step 4: Remove relay logic from pir_motion on_state handler**

In the `pir_motion` binary sensor `on_state` handler (lines 456-468), remove the relay lambda. Keep any other on_state logic. If the relay lambda is the only content, remove the entire `on_state` block.

- [ ] **Step 5: Remove relay logic from occupancy on_state handler**

In the `occupancy` template binary sensor `on_state` handler (lines 478-490), remove the relay lambda (lines 480-490). Keep the LED control `if` block that follows (lines 491-495).

- [ ] **Step 6: Add epp_set_relay action**

Add to the `api: actions:` section (after `epp_set_static_presence`):

```yaml
    - action: epp_set_relay
      variables:
        trigger_mode: string
        contact_mode: string
      then:
        - lambda: |-
            id(epp_component).set_relay(trigger_mode, contact_mode);
```

- [ ] **Step 7: Commit**

```bash
git add firmware/common/everything-presence-pro-base.yaml
git commit -m "feat: replace relay selects/script with epp_set_relay action"
```

---

### Task 8: Firmware — Relay evaluation logic (C++ with tests)

**Files:**
- Create: `firmware/lib/epp_zone_engine/tests/test_relay.cpp`
- Modify: `firmware/lib/epp_zone_engine/tests/CMakeLists.txt`
- Modify: `firmware/components/epp/epp_component.h`
- Modify: `firmware/components/epp/epp_component.cpp`

- [ ] **Step 1: Define relay types**

The relay evaluation function should be a pure function that can be tested without ESPHome dependencies. Add relay types and the evaluation function to the zone engine library.

Create a header `firmware/lib/epp_zone_engine/include/epp_relay.h`:

```cpp
#pragma once

#include "epp_types.h"

namespace epp {

enum class RelayTriggerMode : uint8_t {
    DISABLED = 0,
    MANUAL = 1,
    MOTION = 2,
    PRESENCE = 3,
    MOTION_OR_PRESENCE = 4,
};

enum class RelayContactMode : uint8_t {
    NORMALLY_OPEN = 0,
    NORMALLY_CLOSED = 1,
};

struct RelayEvalInput {
    RelayTriggerMode trigger_mode;
    RelayContactMode contact_mode;
    bool motion_active;    // result.motion_state != INACTIVE
    bool occupancy;        // result.occupancy
};

struct RelayEvalResult {
    bool should_update;    // false for manual mode — caller should not touch relay; true for disabled/auto modes
    bool desired_state;    // only meaningful when should_update is true
};

inline RelayEvalResult evaluate_relay(const RelayEvalInput &input) {
    if (input.trigger_mode == RelayTriggerMode::DISABLED) {
        return {true, false};  // De-energize relay when disabled
    }
    if (input.trigger_mode == RelayTriggerMode::MANUAL) {
        return {false, false};
    }

    bool activate = false;
    switch (input.trigger_mode) {
        case RelayTriggerMode::MOTION:
            activate = input.motion_active;
            break;
        case RelayTriggerMode::PRESENCE:
            activate = input.occupancy;
            break;
        case RelayTriggerMode::MOTION_OR_PRESENCE:
            activate = input.motion_active || input.occupancy;
            break;
        default:
            break;
    }

    bool desired = (input.contact_mode == RelayContactMode::NORMALLY_OPEN)
                   ? activate : !activate;
    return {true, desired};
}

}  // namespace epp
```

- [ ] **Step 2: Write failing tests for relay evaluation**

Create `firmware/lib/epp_zone_engine/tests/test_relay.cpp`:

```cpp
#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>
#include "epp_relay.h"

using namespace epp;

TEST_CASE("disabled mode: relay off regardless of contact mode") {
    auto r1 = evaluate_relay({RelayTriggerMode::DISABLED, RelayContactMode::NORMALLY_OPEN, true, true});
    CHECK(r1.should_update == true);
    CHECK(r1.desired_state == false);

    auto r2 = evaluate_relay({RelayTriggerMode::DISABLED, RelayContactMode::NORMALLY_CLOSED, true, true});
    CHECK(r2.should_update == true);
    CHECK(r2.desired_state == false);
}

TEST_CASE("manual mode: should_update is false") {
    auto r = evaluate_relay({RelayTriggerMode::MANUAL, RelayContactMode::NORMALLY_OPEN, true, true});
    CHECK(r.should_update == false);
}

TEST_CASE("motion mode NO: on when motion active") {
    auto r = evaluate_relay({RelayTriggerMode::MOTION, RelayContactMode::NORMALLY_OPEN, true, false});
    CHECK(r.should_update == true);
    CHECK(r.desired_state == true);
}

TEST_CASE("motion mode NO: off when motion inactive") {
    auto r = evaluate_relay({RelayTriggerMode::MOTION, RelayContactMode::NORMALLY_OPEN, false, true});
    CHECK(r.should_update == true);
    CHECK(r.desired_state == false);
}

TEST_CASE("motion mode NC: inverted") {
    auto r = evaluate_relay({RelayTriggerMode::MOTION, RelayContactMode::NORMALLY_CLOSED, true, false});
    CHECK(r.should_update == true);
    CHECK(r.desired_state == false);
}

TEST_CASE("presence mode NO: on when occupied") {
    auto r = evaluate_relay({RelayTriggerMode::PRESENCE, RelayContactMode::NORMALLY_OPEN, false, true});
    CHECK(r.should_update == true);
    CHECK(r.desired_state == true);
}

TEST_CASE("presence mode NO: off when not occupied") {
    auto r = evaluate_relay({RelayTriggerMode::PRESENCE, RelayContactMode::NORMALLY_OPEN, true, false});
    CHECK(r.should_update == true);
    CHECK(r.desired_state == false);
}

TEST_CASE("motion_or_presence NO: on when either") {
    auto r1 = evaluate_relay({RelayTriggerMode::MOTION_OR_PRESENCE, RelayContactMode::NORMALLY_OPEN, true, false});
    CHECK(r1.desired_state == true);

    auto r2 = evaluate_relay({RelayTriggerMode::MOTION_OR_PRESENCE, RelayContactMode::NORMALLY_OPEN, false, true});
    CHECK(r2.desired_state == true);

    auto r3 = evaluate_relay({RelayTriggerMode::MOTION_OR_PRESENCE, RelayContactMode::NORMALLY_OPEN, false, false});
    CHECK(r3.desired_state == false);
}

TEST_CASE("motion_or_presence NC: inverted") {
    auto r = evaluate_relay({RelayTriggerMode::MOTION_OR_PRESENCE, RelayContactMode::NORMALLY_CLOSED, false, false});
    CHECK(r.should_update == true);
    CHECK(r.desired_state == true);
}
```

- [ ] **Step 3: Add test to CMakeLists.txt**

In `firmware/lib/epp_zone_engine/tests/CMakeLists.txt`, add:

```cmake
add_executable(epp_relay_tests
    test_relay.cpp
)
target_link_libraries(epp_relay_tests PRIVATE epp_zone_engine doctest::doctest)

doctest_discover_tests(epp_relay_tests)
```

- [ ] **Step 4: Build and run firmware tests**

Run:
```bash
cd firmware/lib/epp_zone_engine
cmake -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build
cd build && ctest --output-on-failure
```
Expected: ALL PASS (including new relay tests)

- [ ] **Step 5: Commit**

```bash
git add firmware/lib/epp_zone_engine/include/epp_relay.h firmware/lib/epp_zone_engine/tests/test_relay.cpp firmware/lib/epp_zone_engine/tests/CMakeLists.txt
git commit -m "feat: add relay evaluation function with tests"
```

---

### Task 9: Firmware — Integrate relay into EPPComponent

**Files:**
- Modify: `firmware/components/epp/epp_component.h`
- Modify: `firmware/components/epp/epp_component.cpp`
- Modify: `firmware/components/epp/__init__.py`

- [ ] **Step 1: Add relay members and methods to epp_component.h**

Add include (after `#include "epp_zone_engine.h"`):
```cpp
#include "epp_relay.h"
```

Add to the `public` section (after `set_motion_timeout`):
```cpp
  void set_relay(const std::string &trigger_mode, const std::string &contact_mode);
  void set_relay_switch(esphome::switch_::Switch *sw) { relay_switch_ = sw; }
```

Add to the `protected` section (after `occupancy_output_`):
```cpp
  // Relay
  esphome::switch_::Switch *relay_switch_{nullptr};
  RelayTriggerMode relay_trigger_mode_{RelayTriggerMode::DISABLED};
  RelayContactMode relay_contact_mode_{RelayContactMode::NORMALLY_OPEN};
```

Add NVS save/restore method:
```cpp
  void save_relay_to_nvs_();
```

Add include for switch component at the top:
```cpp
#include "esphome/components/switch/switch.h"
```

- [ ] **Step 2: Add relay to __init__.py**

In `firmware/components/epp/__init__.py`:

Add to `AUTO_LOAD`:
```python
AUTO_LOAD = ["binary_sensor", "sensor", "text_sensor", "switch"]
```

Add import:
```python
from esphome.components import switch
```

Add config constant:
```python
CONF_RELAY_SWITCH = "relay_switch"
```

Add to `CONFIG_SCHEMA` (after `CONF_OCCUPANCY_OUTPUT`):
```python
        cv.Optional(CONF_RELAY_SWITCH): cv.use_id(switch.Switch),
```

Add to `to_code()` (after the occupancy output block):
```python
    # Relay switch reference
    if CONF_RELAY_SWITCH in config:
        sw = await cg.get_variable(config[CONF_RELAY_SWITCH])
        cg.add(var.set_relay_switch(sw))
```

- [ ] **Step 3: Add relay switch reference to YAML**

In `firmware/common/everything-presence-pro-base.yaml`, in the `epp:` component config section, add:
```yaml
    relay_switch: system_alarm_relay
```

- [ ] **Step 4: Implement set_relay and relay evaluation in epp_component.cpp**

Add string-to-enum parsing and the `set_relay` method:

```cpp
static RelayTriggerMode trigger_mode_from_str(const std::string &s) {
    if (s == "manual") return RelayTriggerMode::MANUAL;
    if (s == "motion") return RelayTriggerMode::MOTION;
    if (s == "presence") return RelayTriggerMode::PRESENCE;
    if (s == "motion_or_presence") return RelayTriggerMode::MOTION_OR_PRESENCE;
    return RelayTriggerMode::DISABLED;
}

static RelayContactMode contact_mode_from_str(const std::string &s) {
    if (s == "nc") return RelayContactMode::NORMALLY_CLOSED;
    return RelayContactMode::NORMALLY_OPEN;
}

void EPPComponent::set_relay(const std::string &trigger_mode, const std::string &contact_mode) {
    relay_trigger_mode_ = trigger_mode_from_str(trigger_mode);
    relay_contact_mode_ = contact_mode_from_str(contact_mode);
    ESP_LOGI(TAG, "Relay set: trigger=%s contact=%s", trigger_mode.c_str(), contact_mode.c_str());
    save_relay_to_nvs_();
}
```

Add relay evaluation to `loop()`, inside the zone publish block (after `occupancy_output_->publish_state(result.occupancy);`):

```cpp
    // Evaluate relay state
    if (relay_switch_ != nullptr) {
      RelayEvalInput relay_input{
          relay_trigger_mode_,
          relay_contact_mode_,
          result.motion_state != SensorPresenceState::INACTIVE,
          result.occupancy,
      };
      auto relay_result = evaluate_relay(relay_input);
      if (relay_result.should_update) {
        if (relay_result.desired_state != relay_switch_->state) {
          if (relay_result.desired_state) {
            relay_switch_->turn_on();
          } else {
            relay_switch_->turn_off();
          }
        }
      }
    }
```

- [ ] **Step 5: Add NVS save/restore for relay**

Add `save_relay_to_nvs_()`:
```cpp
void EPPComponent::save_relay_to_nvs_() {
  nvs_handle_t handle;
  if (nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle) != ESP_OK) {
    ESP_LOGE(TAG, "Failed to open NVS for writing");
    return;
  }

  nvs_set_u8(handle, "version", NVS_SCHEMA_VERSION);
  nvs_set_u8(handle, "relay_trig", static_cast<uint8_t>(relay_trigger_mode_));
  nvs_set_u8(handle, "relay_cont", static_cast<uint8_t>(relay_contact_mode_));
  nvs_commit(handle);
  nvs_close(handle);
  ESP_LOGD(TAG, "Relay settings saved to NVS");
}
```

Add relay restore to `restore_from_nvs_()` (after grid restore, before zones restore):
```cpp
  // Restore relay settings
  uint8_t relay_trig = 0;
  if (nvs_get_u8(handle, "relay_trig", &relay_trig) == ESP_OK) {
    relay_trigger_mode_ = static_cast<RelayTriggerMode>(relay_trig);
    uint8_t relay_cont = 0;
    nvs_get_u8(handle, "relay_cont", &relay_cont);
    relay_contact_mode_ = static_cast<RelayContactMode>(relay_cont);
    ESP_LOGI(TAG, "Restored relay settings from NVS (trigger=%d, contact=%d)",
             relay_trig, relay_cont);
  }
```

- [ ] **Step 6: Build firmware**

Run: `cd firmware && esphome compile variants/wifi.yaml`
Expected: Compiles without errors

- [ ] **Step 7: Run firmware tests**

Run:
```bash
cd firmware/lib/epp_zone_engine
cmake -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build
cd build && ctest --output-on-failure
```
Expected: ALL PASS

- [ ] **Step 8: Commit**

```bash
git add firmware/components/epp/epp_component.h firmware/components/epp/epp_component.cpp firmware/components/epp/__init__.py firmware/common/everything-presence-pro-base.yaml
git commit -m "feat: integrate relay evaluation into EPPComponent with NVS persistence"
```

---

### Task 10: Documentation — Update data catalog

**Files:**
- Modify: `docs/backend-data-catalog.md`

- [ ] **Step 1: Add relay settings to data catalog**

In `docs/backend-data-catalog.md`, in the settings section of the Configuration Storage block, add after `"static_on_delay"`:

```
            "relay_trigger_mode": str,   # "disabled"|"manual"|"motion"|"presence"|"motion_or_presence"
            "relay_contact_mode": str,   # "no"|"nc"
```

Update the `set_settings` command documentation to mention relay keys.

- [ ] **Step 2: Commit**

```bash
git add docs/backend-data-catalog.md
git commit -m "docs: add relay settings to data catalog"
```

---

### Task 11: Final verification

- [ ] **Step 1: Run all backend tests**

Run: `python -m pytest tests/ -v`
Expected: ALL PASS

- [ ] **Step 2: Run all frontend tests**

Run: `cd frontend && npx vitest run`
Expected: ALL PASS

- [ ] **Step 3: Build frontend**

Run: `cd frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Run all firmware tests**

Run:
```bash
cd firmware/lib/epp_zone_engine
cmake -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build
cd build && ctest --output-on-failure
```
Expected: ALL PASS

- [ ] **Step 5: Run linting**

Run: `cd frontend && npx biome check src/`
Run: `ruff format --check custom_components/ tests/`
Expected: No issues
