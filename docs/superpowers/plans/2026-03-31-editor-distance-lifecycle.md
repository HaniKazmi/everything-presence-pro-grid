# Editor Distance Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When entering the zone editor with auto distances on, widen firmware ranges so the sensor sees the full area. Restore correct ranges on save (auto-computed) or cancel (stored values).

**Architecture:** New `set_distance_override` WS command pushes tracking + static presence to firmware without persisting. Frontend calls it on editor entry (widen) and cancel (revert). `set_room_layout` no longer pushes config. `applyLayout` only calls `set_settings` when auto is on.

**Tech Stack:** TypeScript/Lit (frontend), Python/pytest (backend), Vitest (frontend tests)

---

### Task 1: Backend — add `set_distance_override` WS command

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py`
- Modify: `custom_components/eppgrid/device_manager.py`
- Test: `tests/test_websocket_api.py`

- [ ] **Step 1: Write the failing test for override push**

Add to `tests/test_websocket_api.py` before `class TestProtocolVersionGuard`:

```python
class TestWebSocketDistanceOverride:
    """Tests for eppgrid/set_distance_override."""

    async def test_set_distance_override_pushes_without_saving(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_distance_override pushes merged distances to device without persisting."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm._store.devices["AA:BB:CC:DD:EE:FF"] = {
            "settings": {
                "static_trigger_threshold": 5,
                "static_renew_threshold": 4,
                "static_timeout": 20.0,
                "static_on_delay": 1.0,
            }
        }

        mock_session = MagicMock()
        mock_session.async_push_distance_override = AsyncMock()
        mock_dm.get_session.return_value = mock_session

        from custom_components.eppgrid.websocket_api import websocket_set_distance_override

        connection = MagicMock()
        msg = {
            "id": 20,
            "type": "eppgrid/set_distance_override",
            "mac": "AA:BB:CC:DD:EE:FF",
            "target_max_distance": 6.0,
            "static_min_distance": 0.3,
            "static_max_distance": 16.0,
        }

        await call_async_handler(hass, websocket_set_distance_override, connection, msg)

        mock_session.async_push_distance_override.assert_awaited_once()
        override = mock_session.async_push_distance_override.call_args[0][0]
        assert override["target_max_distance"] == 6.0
        assert override["static_min_distance"] == 0.3
        assert override["static_max_distance"] == 16.0
        # Merged from stored settings
        assert override["static_trigger_threshold"] == 5
        assert override["static_renew_threshold"] == 4
        assert override["static_timeout"] == 20.0
        assert override["static_on_delay"] == 1.0

        # Must NOT persist
        mock_dm._store.async_save.assert_not_awaited()
        connection.send_result.assert_called_once_with(20)

    async def test_set_distance_override_no_session(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_distance_override is a no-op when no session exists."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.get_session.return_value = None

        from custom_components.eppgrid.websocket_api import websocket_set_distance_override

        connection = MagicMock()
        msg = {
            "id": 20,
            "type": "eppgrid/set_distance_override",
            "mac": "AA:BB:CC:DD:EE:FF",
            "target_max_distance": 6.0,
            "static_min_distance": 0.3,
            "static_max_distance": 16.0,
        }

        await call_async_handler(hass, websocket_set_distance_override, connection, msg)

        connection.send_result.assert_called_once_with(20)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_websocket_api.py::TestWebSocketDistanceOverride -v`
Expected: FAIL — cannot import `websocket_set_distance_override`

- [ ] **Step 3: Add `async_push_distance_override` to DeviceConnection**

In `custom_components/eppgrid/device_manager.py`, add this method to the `DeviceConnection` class, before `async_push_config` (before line 151):

```python
    async def async_push_distance_override(self, override: dict[str, Any]) -> None:
        """Push distance override to device without persisting."""
        if self._client is None:
            return
        svc = self._services.get("epp_set_tracking")
        if svc:
            await self._client.execute_service(
                svc,
                {"max_range": override.get("target_max_distance", 6.0) * 1000},
            )
        svc = self._services.get("epp_set_static_presence")
        if svc:
            await self._client.execute_service(
                svc,
                {
                    "min_range": override.get("static_min_distance", 0.3),
                    "max_range": override.get("static_max_distance", 16.0),
                    "trigger_range": override.get("static_max_distance", 16.0),
                    "trigger_sensitivity": 10 - override.get("static_trigger_threshold", 3),
                    "sustain_sensitivity": 10 - override.get("static_renew_threshold", 3),
                    "timeout": override.get("static_timeout", 30.0),
                    "on_delay": override.get("static_on_delay", 0.0),
                    "led_enabled": True,
                },
            )
```

- [ ] **Step 4: Add the WS command handler and register it**

In `custom_components/eppgrid/websocket_api.py`, add the registration in `async_register_commands` (after the `websocket_set_settings` registration, around line 39):

```python
    websocket_api.async_register_command(hass, websocket_set_distance_override)
```

Add the handler before the `# -- set_pipeline --` comment (around line 831):

```python
# -- set_distance_override (temporary range push, no persist) --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/set_distance_override",
        vol.Required("mac"): str,
        vol.Required("target_max_distance"): vol.Coerce(float),
        vol.Required("static_min_distance"): vol.Coerce(float),
        vol.Required("static_max_distance"): vol.Coerce(float),
    }
)
@websocket_api.async_response
async def websocket_set_distance_override(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Push distance override to device without persisting."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    mac = msg["mac"]
    session = manager.get_session(mac)
    if session is None:
        connection.send_result(msg["id"])
        return
    device_config = manager._store.devices.get(mac, {})
    stored_settings = device_config.get("settings", {})
    override = {
        "target_max_distance": msg["target_max_distance"],
        "static_min_distance": msg["static_min_distance"],
        "static_max_distance": msg["static_max_distance"],
        "static_trigger_threshold": stored_settings.get("static_trigger_threshold", 3),
        "static_renew_threshold": stored_settings.get("static_renew_threshold", 3),
        "static_timeout": stored_settings.get("static_timeout", 30.0),
        "static_on_delay": stored_settings.get("static_on_delay", 0.0),
    }
    await session.async_push_distance_override(override)
    connection.send_result(msg["id"])
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `python -m pytest tests/test_websocket_api.py::TestWebSocketDistanceOverride -v`
Expected: PASS

- [ ] **Step 6: Run full Python test suite**

Run: `python -m pytest tests/ -v`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add custom_components/eppgrid/device_manager.py custom_components/eppgrid/websocket_api.py tests/test_websocket_api.py
git commit -m "feat: add set_distance_override WS command for editor preview"
```

---

### Task 2: Backend — remove `_push_config_to_device` from `set_room_layout`

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py:217-220`
- Test: `tests/test_websocket_api.py`

- [ ] **Step 1: Update the existing test**

In `tests/test_websocket_api.py`, find `TestWebSocketSetRoomLayout.test_set_room_layout` (around line 234). Change the assertion on line 267 from:

```python
        mock_dm._push_config_to_device.assert_awaited()
```

to:

```python
        mock_dm._push_config_to_device.assert_not_awaited()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_websocket_api.py::TestWebSocketSetRoomLayout -v`
Expected: FAIL — `_push_config_to_device` was awaited

- [ ] **Step 3: Remove the push from `set_room_layout`**

In `custom_components/eppgrid/websocket_api.py`, remove lines 217-220:

```python
    # Push config to device if connected
    dev = manager.devices.get(mac)
    if dev and dev.host:
        await manager._push_config_to_device(mac)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_websocket_api.py::TestWebSocketSetRoomLayout -v`
Expected: PASS

- [ ] **Step 5: Run full Python test suite**

Run: `python -m pytest tests/ -v`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add custom_components/eppgrid/websocket_api.py tests/test_websocket_api.py
git commit -m "refactor: remove config push from set_room_layout handler"
```

---

### Task 3: Frontend — widen ranges on editor entry

**Files:**
- Modify: `frontend/src/eppgrid-panel.ts:1157-1168`
- Test: `frontend/src/__tests__/panel-event-handlers.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `frontend/src/__tests__/panel-event-handlers.test.ts` after the existing "detection zones button" and "furniture button" tests (after line 307):

```typescript
describe("editor entry distance override", () => {
	it("calls set_distance_override with widened ranges when target auto is on", () => {
		const a = createPanel() as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._targetAutoDistance = true;
		a._targetMaxDistance = 3.5;
		a._staticAutoDistance = false;
		a._staticMinDistance = 1.0;
		a._staticMaxDistance = 8.0;

		const callWS = vi.fn().mockResolvedValue({});
		a.hass = { callWS };

		a._enterEditor("zones");

		expect(a._view).toBe("editor");
		expect(a._sidebarTab).toBe("zones");
		expect(callWS).toHaveBeenCalledWith({
			type: "eppgrid/set_distance_override",
			mac: "AA:BB:CC:DD:EE:01",
			target_max_distance: 6,
			static_min_distance: 1.0,
			static_max_distance: 8.0,
		});
	});

	it("calls set_distance_override with widened ranges when static auto is on", () => {
		const a = createPanel() as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._targetAutoDistance = false;
		a._targetMaxDistance = 3.5;
		a._staticAutoDistance = true;
		a._staticMinDistance = 1.0;
		a._staticMaxDistance = 8.0;

		const callWS = vi.fn().mockResolvedValue({});
		a.hass = { callWS };

		a._enterEditor("zones");

		expect(callWS).toHaveBeenCalledWith({
			type: "eppgrid/set_distance_override",
			mac: "AA:BB:CC:DD:EE:01",
			target_max_distance: 3.5,
			static_min_distance: 0.3,
			static_max_distance: 16,
		});
	});

	it("does not call set_distance_override when both auto flags are off", () => {
		const a = createPanel() as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._targetAutoDistance = false;
		a._staticAutoDistance = false;

		const callWS = vi.fn().mockResolvedValue({});
		a.hass = { callWS };

		a._enterEditor("zones");

		expect(a._view).toBe("editor");
		expect(callWS).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/__tests__/panel-event-handlers.test.ts -t "editor entry distance override"`
Expected: FAIL — `_enterEditor` is not a function

- [ ] **Step 3: Implement `_enterEditor` method**

In `frontend/src/eppgrid-panel.ts`, add a new method (after `_cancelSettings` around line 553):

```typescript
	private _enterEditor(tab: "zones" | "furniture"): void {
		this._view = "editor";
		this._sidebarTab = tab;

		if (this._targetAutoDistance || this._staticAutoDistance) {
			this.hass
				?.callWS({
					type: "eppgrid/set_distance_override",
					mac: this._selectedMac,
					target_max_distance: this._targetAutoDistance
						? 6
						: this._targetMaxDistance,
					static_min_distance: this._staticAutoDistance
						? 0.3
						: this._staticMinDistance,
					static_max_distance: this._staticAutoDistance
						? 16
						: this._staticMaxDistance,
				})
				.catch(() => {});
		}
	}
```

Then update the two menu button handlers (around lines 1157-1168) to use it. Replace:

```typescript
                      <button class="sidebar-menu-item" @click=${() => {
												this._view = "editor";
												this._sidebarTab = "zones";
											}}>
```

with:

```typescript
                      <button class="sidebar-menu-item" @click=${() => {
												this._enterEditor("zones");
											}}>
```

And replace:

```typescript
                      <button class="sidebar-menu-item" @click=${() => {
												this._view = "editor";
												this._sidebarTab = "furniture";
											}}>
```

with:

```typescript
                      <button class="sidebar-menu-item" @click=${() => {
												this._enterEditor("furniture");
											}}>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/__tests__/panel-event-handlers.test.ts -t "editor entry distance override"`
Expected: PASS

- [ ] **Step 5: Update existing menu button tests**

The existing "detection zones button" and "furniture button" tests (around lines 292-307) directly set `_view` and `_sidebarTab`. Update them to call `_enterEditor` instead. Note: these tests don't set auto flags so no override call is expected.

Update "detection zones button" test:
```typescript
	it("detection zones button", () => {
		const a = createPanel() as any;
		a._enterEditor("zones");
		expect(a._view).toBe("editor");
		expect(a._sidebarTab).toBe("zones");
	});
```

Update "furniture button" test:
```typescript
	it("furniture button", () => {
		const a = createPanel() as any;
		a._enterEditor("furniture");
		expect(a._view).toBe("editor");
		expect(a._sidebarTab).toBe("furniture");
	});
```

- [ ] **Step 6: Run full frontend test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add frontend/src/eppgrid-panel.ts frontend/src/__tests__/panel-event-handlers.test.ts
git commit -m "feat: widen firmware ranges on editor entry when auto distance is on"
```

---

### Task 4: Frontend — revert ranges on editor cancel

**Files:**
- Modify: `frontend/src/eppgrid-panel.ts:1099-1103`
- Test: `frontend/src/__tests__/panel-event-handlers.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `frontend/src/__tests__/panel-event-handlers.test.ts` after the "editor entry distance override" describe block:

```typescript
describe("editor cancel distance revert", () => {
	it("calls set_distance_override with stored values on cancel when auto is on", () => {
		const a = createPanel() as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._view = "editor";
		a._dirty = true;
		a._targetAutoDistance = true;
		a._targetMaxDistance = 3.5;
		a._staticAutoDistance = true;
		a._staticMinDistance = 0.5;
		a._staticMaxDistance = 8.0;

		const callWS = vi.fn().mockResolvedValue({
			config: {
				calibration: { perspective: null, room_width: 0, room_depth: 0 },
				room_layout: {},
				settings: {},
			},
		});
		a.hass = {
			callWS,
			connection: { subscribeMessage: vi.fn().mockResolvedValue(() => {}) },
		};

		a._cancelEditor();

		expect(callWS).toHaveBeenCalledWith({
			type: "eppgrid/set_distance_override",
			mac: "AA:BB:CC:DD:EE:01",
			target_max_distance: 3.5,
			static_min_distance: 0.5,
			static_max_distance: 8.0,
		});
	});

	it("does not call set_distance_override on cancel when auto is off", () => {
		const a = createPanel() as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._view = "editor";
		a._dirty = true;
		a._targetAutoDistance = false;
		a._staticAutoDistance = false;

		const callWS = vi.fn().mockResolvedValue({
			config: {
				calibration: { perspective: null, room_width: 0, room_depth: 0 },
				room_layout: {},
				settings: {},
			},
		});
		a.hass = {
			callWS,
			connection: { subscribeMessage: vi.fn().mockResolvedValue(() => {}) },
		};

		a._cancelEditor();

		const overrideCalls = callWS.mock.calls.filter(
			(c: any) => c[0].type === "eppgrid/set_distance_override",
		);
		expect(overrideCalls).toHaveLength(0);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/__tests__/panel-event-handlers.test.ts -t "editor cancel distance revert"`
Expected: FAIL — `_cancelEditor` is not a function

- [ ] **Step 3: Implement `_cancelEditor` method**

In `frontend/src/eppgrid-panel.ts`, add a new method (after `_enterEditor`):

```typescript
	private _cancelEditor(): void {
		if (this._targetAutoDistance || this._staticAutoDistance) {
			this.hass
				?.callWS({
					type: "eppgrid/set_distance_override",
					mac: this._selectedMac,
					target_max_distance: this._targetMaxDistance,
					static_min_distance: this._staticMinDistance,
					static_max_distance: this._staticMaxDistance,
				})
				.catch(() => {});
		}
		this._dirty = false;
		this._view = "live";
		this._loadDeviceConfig(this._selectedMac);
	}
```

Then update the cancel button handler in `_renderSaveCancelButtons` (around lines 1099-1103). Replace:

```typescript
        <button class="wizard-btn wizard-btn-back"
          @click=${() => {
						this._dirty = false;
						this._view = "live";
						this._loadDeviceConfig(this._selectedMac);
					}}
```

with:

```typescript
        <button class="wizard-btn wizard-btn-back"
          @click=${() => {
						if (this._view === "editor") {
							this._cancelEditor();
						} else {
							this._cancelSettings();
						}
					}}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/__tests__/panel-event-handlers.test.ts -t "editor cancel distance revert"`
Expected: PASS

- [ ] **Step 5: Update existing cancel button test**

Update the existing "cancel button resets dirty and loads config" test to call `_cancelEditor` instead of inlining the logic:

```typescript
	it("cancel button resets dirty and loads config", () => {
		const a = createPanel() as any;
		a._dirty = true;
		a._view = "editor";
		a._targetAutoDistance = false;
		a._staticAutoDistance = false;

		a._cancelEditor();

		expect(a._dirty).toBe(false);
		expect(a._view).toBe("live");
	});
```

- [ ] **Step 6: Run full frontend test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add frontend/src/eppgrid-panel.ts frontend/src/__tests__/panel-event-handlers.test.ts
git commit -m "feat: revert firmware ranges on editor cancel when auto distance is on"
```

---

### Task 5: Frontend — applyLayout only calls set_settings when auto is on

**Files:**
- Modify: `frontend/src/controllers/grid-state-controller.ts:504-543`
- Test: `frontend/src/__tests__/panel-config.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `frontend/src/__tests__/panel-config.test.ts` inside the `"_applyLayout"` describe block:

```typescript
	it("does not call set_settings when both auto flags are off", async () => {
		const a = el as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._dirty = true;
		a._grid = initGridFromRoom(3000, 4000);
		a._targetAutoDistance = false;
		a._staticAutoDistance = false;
		a._targetMaxDistance = 4.0;
		a._staticMinDistance = 1.0;
		a._staticMaxDistance = 8.0;
		a._zoneConfigs = new Array(8).fill(null);

		el.hass = {
			callWS: vi.fn().mockResolvedValue({}),
		};

		await a._applyLayout();

		const calls = el.hass.callWS.mock.calls.map((c: any) => c[0].type);
		expect(calls).toContain("eppgrid/set_room_layout");
		expect(calls).not.toContain("eppgrid/set_settings");
	});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/panel-config.test.ts -t "does not call set_settings when both auto flags are off"`
Expected: FAIL — `set_settings` is still called

- [ ] **Step 3: Wrap the set_settings call in an auto check**

In `frontend/src/controllers/grid-state-controller.ts`, replace lines 504-542 (from `// Save settings after layout` to the closing of the `callWS` for `set_settings`) with:

```typescript
			// Save settings after layout — only needed when auto distances
			// may have changed; manual distances don't change with layout.
			if (this.host._targetAutoDistance || this.host._staticAutoDistance) {
				const autoRange = autoDetectionRange(
					this.host._roomWidth,
					this.host._roomDepth,
					this.host._perspective,
					this.host._grid,
				);
				const targetMaxDist = this.host._targetAutoDistance
					? autoRange > 0
						? Math.min(autoRange, 6)
						: 6
					: this.host._targetMaxDistance;
				const staticMinDist = this.host._staticAutoDistance
					? 0.3
					: this.host._staticMinDistance;
				const staticMaxDist = this.host._staticAutoDistance
					? autoRange > 0
						? Math.min(autoRange, 16)
						: 16
					: this.host._staticMaxDistance;

				await this.host.hass.callWS({
					type: "eppgrid/set_settings",
					mac: this.host._selectedMac,
					temperature_offset: this.host._temperatureOffset,
					humidity_offset: this.host._humidityOffset,
					illuminance_offset: this.host._illuminanceOffset,
					motion_timeout: this.host._motionTimeout,
					target_auto_distance: this.host._targetAutoDistance,
					target_max_distance: targetMaxDist,
					static_auto_distance: this.host._staticAutoDistance,
					static_min_distance: staticMinDist,
					static_max_distance: staticMaxDist,
					static_trigger_threshold: this.host._staticTriggerThreshold,
					static_renew_threshold: this.host._staticRenewThreshold,
					static_timeout: this.host._staticTimeout,
					static_on_delay: this.host._staticOnDelay,
					entities: this.host._entitiesConfig || {},
				});
			}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/__tests__/panel-config.test.ts -t "does not call set_settings when both auto flags are off"`
Expected: PASS

- [ ] **Step 5: Verify existing auto distance test still passes**

Run: `cd frontend && npx vitest run src/__tests__/panel-config.test.ts -t "sends auto-computed distances"`
Expected: PASS

- [ ] **Step 6: Run full frontend test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add frontend/src/controllers/grid-state-controller.ts frontend/src/__tests__/panel-config.test.ts
git commit -m "fix: only call set_settings from applyLayout when auto distance is on"
```

---

### Task 6: Build, format, push

- [ ] **Step 1: Format and lint**

Run: `cd frontend && npx biome format --write src/ && npx biome check --fix src/`
Run: `ruff format custom_components/ tests/ && ruff check custom_components/ tests/`

- [ ] **Step 2: Build frontend**

Run: `cd frontend && npm run build`

- [ ] **Step 3: Run full test suites**

Run: `python -m pytest tests/ -v && cd frontend && npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit built JS and push**

```bash
git add custom_components/eppgrid/frontend/eppgrid-panel.js
git commit -m "chore: rebuild frontend"
git push
```
