# Settings Push Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix auto distances not being sent to firmware, and eliminate the redundant double-push on settings save.

**Architecture:** Frontend computes auto distances and sends concrete values at save time. Backend gains a guard set to suppress the redundant push triggered by entity registry changes.

**Tech Stack:** TypeScript/Lit (frontend), Python/pytest (backend), Vitest (frontend tests)

---

### Task 1: Frontend — _emitSave sends auto-computed distances

**Files:**
- Modify: `frontend/src/components/epp-settings-view.ts:800-832`
- Test: `frontend/src/__tests__/components/epp-settings-view.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `frontend/src/__tests__/components/epp-settings-view.test.ts` after the existing `"save event payload"` describe block (after line 839):

```typescript
describe("save event auto distance substitution", () => {
	it("sends auto-computed target distance when targetAutoDistance is true", () => {
		const sv = createView({
			dirty: true,
			targetAutoDistance: true,
			targetMaxDistance: 99, // stale stored value — should NOT be sent
			staticAutoDistance: false,
			staticMinDistance: 1.0,
			staticMaxDistance: 8.0,
		});

		let payload: any = null;
		sv.addEventListener("save", ((e: CustomEvent) => {
			payload = e.detail;
		}) as EventListener);

		(sv as any)._emitSave();

		expect(payload).not.toBeNull();
		expect(payload.target_auto_distance).toBe(true);
		// autoDetectionRange for 3000x4000 room with identity perspective
		// returns 4.0 (rounded up to nearest 0.5m), capped at 6
		expect(payload.target_max_distance).toBeLessThanOrEqual(6);
		expect(payload.target_max_distance).not.toBe(99);
	});

	it("sends auto-computed static distances when staticAutoDistance is true", () => {
		const sv = createView({
			dirty: true,
			targetAutoDistance: false,
			targetMaxDistance: 4.0,
			staticAutoDistance: true,
			staticMinDistance: 5.0, // stale — should be replaced with 0.3
			staticMaxDistance: 99, // stale — should NOT be sent
		});

		let payload: any = null;
		sv.addEventListener("save", ((e: CustomEvent) => {
			payload = e.detail;
		}) as EventListener);

		(sv as any)._emitSave();

		expect(payload).not.toBeNull();
		expect(payload.static_auto_distance).toBe(true);
		expect(payload.static_min_distance).toBe(0.3);
		expect(payload.static_max_distance).toBeLessThanOrEqual(16);
		expect(payload.static_max_distance).not.toBe(99);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/components/epp-settings-view.test.ts -t "save event auto distance"`
Expected: FAIL — `target_max_distance` is 99 (the stale stored value)

- [ ] **Step 3: Implement _emitSave auto distance substitution**

In `frontend/src/components/epp-settings-view.ts`, replace `_emitSave()` (lines 800-832) with:

```typescript
private _emitSave() {
	const o = this._overrides;
	const entities = { ...this.entitiesConfig, ...(o.entities || {}) };

	const targetAuto = o.targetAutoDistance ?? this.targetAutoDistance;
	const staticAuto = o.staticAutoDistance ?? this.staticAutoDistance;

	// When auto is on, compute distances from room geometry
	let targetMaxDist = o.targetMaxDistance ?? this.targetMaxDistance;
	let staticMinDist = o.staticMinDistance ?? this.staticMinDistance;
	let staticMaxDist = o.staticMaxDistance ?? this.staticMaxDistance;

	if (targetAuto || staticAuto) {
		const autoRange = autoDetectionRange(
			this.roomWidth,
			this.roomDepth,
			this.perspective,
			this.grid,
		);
		if (targetAuto) {
			targetMaxDist = autoRange > 0 ? Math.min(autoRange, 6) : 6;
		}
		if (staticAuto) {
			staticMinDist = 0.3;
			staticMaxDist = autoRange > 0 ? Math.min(autoRange, 16) : 16;
		}
	}

	this.dispatchEvent(
		new CustomEvent("save", {
			detail: {
				target_auto_distance: targetAuto,
				target_max_distance: targetMaxDist,
				static_auto_distance: staticAuto,
				static_min_distance: staticMinDist,
				static_max_distance: staticMaxDist,
				motion_timeout: o.motionTimeout ?? this.motionTimeout,
				static_timeout: o.staticTimeout ?? this.staticTimeout,
				static_trigger_threshold:
					o.staticTriggerThreshold ?? this.staticTriggerThreshold,
				static_renew_threshold:
					o.staticRenewThreshold ?? this.staticRenewThreshold,
				static_on_delay: o.staticOnDelay ?? this.staticOnDelay,
				temperature_offset: o.temperatureOffset ?? this.temperatureOffset,
				humidity_offset: o.humidityOffset ?? this.humidityOffset,
				illuminance_offset: o.illuminanceOffset ?? this.illuminanceOffset,
				entities,
				log_levels: {
					...this.logLevels,
					...(o.logLevels || {}),
				},
			},
			bubbles: true,
			composed: true,
		}),
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/__tests__/components/epp-settings-view.test.ts -t "save event auto distance"`
Expected: PASS

- [ ] **Step 5: Run full frontend test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/epp-settings-view.ts frontend/src/__tests__/components/epp-settings-view.test.ts
git commit -m "fix: send auto-computed distances in settings save event"
```

---

### Task 2: Frontend — saveLayout sends auto-computed distances

**Files:**
- Modify: `frontend/src/controllers/grid-state-controller.ts:503-521`
- Test: `frontend/src/__tests__/panel-config.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `frontend/src/__tests__/panel-config.test.ts` inside the `"_applyLayout"` describe block. First check what imports are available and how `createPanel` sets up `_targetAutoDistance`. The test needs to verify that the second `callWS` (the `set_settings` call) sends auto-computed distances, not the stale stored ones.

```typescript
it("sends auto-computed distances in set_settings when auto is on", async () => {
	const a = el as any;
	a._selectedMac = "AA:BB:CC:DD:EE:01";
	a._dirty = true;
	a._grid = initGridFromRoom(3000, 4000);
	a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
	a._roomWidth = 3000;
	a._roomDepth = 4000;
	a._targetAutoDistance = true;
	a._targetMaxDistance = 99; // stale — should be replaced
	a._staticAutoDistance = true;
	a._staticMinDistance = 5.0; // stale — should be replaced with 0.3
	a._staticMaxDistance = 99; // stale — should be replaced
	a._zoneConfigs = new Array(8).fill(null);

	el.hass = {
		callWS: vi.fn().mockResolvedValue({}),
	};

	await a._applyLayout();

	// Second callWS is the set_settings call
	const settingsCall = el.hass.callWS.mock.calls[1][0];
	expect(settingsCall.type).toBe("eppgrid/set_settings");
	expect(settingsCall.target_max_distance).not.toBe(99);
	expect(settingsCall.target_max_distance).toBeLessThanOrEqual(6);
	expect(settingsCall.static_min_distance).toBe(0.3);
	expect(settingsCall.static_max_distance).not.toBe(99);
	expect(settingsCall.static_max_distance).toBeLessThanOrEqual(16);
});
```

Note: you may need to add the `initGridFromRoom` import at the top of the test file:
```typescript
import { initGridFromRoom } from "../lib/grid.js";
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/panel-config.test.ts -t "sends auto-computed distances"`
Expected: FAIL — `target_max_distance` is 99

- [ ] **Step 3: Implement auto distance computation in saveLayout**

In `frontend/src/controllers/grid-state-controller.ts`, add the import at the top (near other lib imports):

```typescript
import { autoDetectionRange } from "../lib/room-geometry.js";
```

Then replace the `set_settings` call in `applyLayout()` (lines 503-521) with:

```typescript
			// Save settings after layout (auto distances may have changed)
			let targetMaxDist = this.host._targetMaxDistance;
			let staticMinDist = this.host._staticMinDistance;
			let staticMaxDist = this.host._staticMaxDistance;

			if (this.host._targetAutoDistance || this.host._staticAutoDistance) {
				const autoRange = autoDetectionRange(
					this.host._roomWidth,
					this.host._roomDepth,
					this.host._perspective,
					this.host._grid,
				);
				if (this.host._targetAutoDistance) {
					targetMaxDist = autoRange > 0 ? Math.min(autoRange, 6) : 6;
				}
				if (this.host._staticAutoDistance) {
					staticMinDist = 0.3;
					staticMaxDist = autoRange > 0 ? Math.min(autoRange, 16) : 16;
				}
			}

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/__tests__/panel-config.test.ts -t "sends auto-computed distances"`
Expected: PASS

- [ ] **Step 5: Run full frontend test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Build frontend**

Run: `cd frontend && npm run build`

- [ ] **Step 7: Commit**

```bash
git add frontend/src/controllers/grid-state-controller.ts frontend/src/__tests__/panel-config.test.ts custom_components/eppgrid/frontend/eppgrid-panel.js
git commit -m "fix: compute auto distances in saveLayout before pushing to backend"
```

---

### Task 3: Backend — suppress redundant reconnect push

**Files:**
- Modify: `custom_components/eppgrid/device_manager.py:331,491-493`
- Modify: `custom_components/eppgrid/websocket_api.py:813-815`
- Test: `tests/test_device_manager.py`
- Test: `tests/test_websocket_api.py`

- [ ] **Step 1: Write the failing test for the guard**

Add to `tests/test_device_manager.py` in the `TestEventCallbacks` class:

```python
async def test_on_device_available_skips_push_when_entity_update_guard_set(
    self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
) -> None:
    """_on_device_available skips push when entity update guard is set."""
    mac = "AA:BB:CC:DD:EE:FF"
    store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
    manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

    # Simulate: entity update guard was set by websocket_set_settings
    manager._entity_update_macs.add(mac)
    manager._pushing.add(mac)

    with patch.object(manager, "_push_config_to_device", new_callable=AsyncMock) as mock_push:
        await manager._on_device_available(mac)

    mock_push.assert_not_awaited()
    assert mac not in manager._entity_update_macs
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_device_manager.py::TestEventCallbacks::test_on_device_available_skips_push_when_entity_update_guard_set -v`
Expected: FAIL — `_entity_update_macs` attribute does not exist

- [ ] **Step 3: Implement the guard set in DeviceManager**

In `custom_components/eppgrid/device_manager.py`:

Add to `__init__` (after line 331 where `_pushing` is defined):

```python
self._entity_update_macs: set[str] = set()
```

Replace `_on_device_available` (lines 495-506) with:

```python
async def _on_device_available(self, mac: str) -> None:
    """Push stored config when a managed device comes online."""
    dev = self.devices.get(mac)
    if dev is not None:
        dev.available = True

    # Skip push if we caused this reconnect via entity registry updates
    if mac in self._entity_update_macs:
        self._entity_update_macs.discard(mac)
        _LOGGER.debug("Skipping redundant push for %s (entity update guard)", mac)
        return

    _LOGGER.info("Device %s became available, pushing config", mac)
    if not await self._push_config_to_device(mac):
        # Close stale connection and retry after device stabilises
        await self.async_close_session(mac)
        await asyncio.sleep(5)
        if not await self._push_config_to_device(mac):
            self._pushing.discard(mac)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_device_manager.py::TestEventCallbacks::test_on_device_available_skips_push_when_entity_update_guard_set -v`
Expected: PASS

- [ ] **Step 5: Write the failing test for the guard being set by websocket**

Add to `tests/test_websocket_api.py` in the `TestWebSocketSettings` class:

```python
async def test_set_settings_with_entities_sets_entity_update_guard(
    self, hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """set_settings with entities sets the entity update guard to suppress reconnect push."""
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
        "entities": {"room_occupancy": True},
    }

    await call_async_handler(hass, websocket_set_settings, connection, msg)

    assert "AA:BB:CC:DD:EE:FF" in mock_dm._entity_update_macs
```

- [ ] **Step 6: Run test to verify it fails**

Run: `python -m pytest tests/test_websocket_api.py::TestWebSocketSettings::test_set_settings_with_entities_sets_entity_update_guard -v`
Expected: FAIL — `_entity_update_macs` not set or MAC not in it

- [ ] **Step 7: Set the guard in websocket_set_settings**

In `custom_components/eppgrid/websocket_api.py`, add the guard before `_apply_entity_states` (before line 815):

Replace lines 813-815:
```python
    entities = msg.get("entities")
    if entities:
        _apply_entity_states(hass, mac, entities)
```

With:
```python
    entities = msg.get("entities")
    if entities:
        manager._entity_update_macs.add(mac)
        _apply_entity_states(hass, mac, entities)
```

Also add a safety-net timer to auto-clear the guard after 60 seconds, in case the expected reconnect doesn't happen. Add after the `manager._entity_update_macs.add(mac)` line:

```python
        manager._entity_update_macs.add(mac)
        hass.loop.call_later(60, manager._entity_update_macs.discard, mac)
        _apply_entity_states(hass, mac, entities)
```

- [ ] **Step 8: Run test to verify it passes**

Run: `python -m pytest tests/test_websocket_api.py::TestWebSocketSettings::test_set_settings_with_entities_sets_entity_update_guard -v`
Expected: PASS

- [ ] **Step 9: Write test that guard is NOT set when no entities in message**

Add to `tests/test_websocket_api.py` in the `TestWebSocketSettings` class:

```python
async def test_set_settings_without_entities_no_guard(
    self, hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """set_settings without entities does not set the entity update guard."""
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
    }

    await call_async_handler(hass, websocket_set_settings, connection, msg)

    assert "AA:BB:CC:DD:EE:FF" not in mock_dm._entity_update_macs
```

- [ ] **Step 10: Run test to verify it passes immediately**

Run: `python -m pytest tests/test_websocket_api.py::TestWebSocketSettings::test_set_settings_without_entities_no_guard -v`
Expected: PASS (this tests existing correct behavior)

- [ ] **Step 11: Run full Python test suite**

Run: `python -m pytest tests/ -v`
Expected: All tests pass

- [ ] **Step 12: Commit**

```bash
git add custom_components/eppgrid/device_manager.py custom_components/eppgrid/websocket_api.py tests/test_device_manager.py tests/test_websocket_api.py
git commit -m "fix: suppress redundant config push after entity registry update"
```

---

### Task 4: Build, push, and verify

- [ ] **Step 1: Run pre-push checks**

Run: `ruff format custom_components/ tests/ && ruff check custom_components/ tests/`

- [ ] **Step 2: Run full test suite**

Run: `python -m pytest tests/ -v && cd frontend && npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Build frontend**

Run: `cd frontend && npm run build`

- [ ] **Step 4: Push and update PR**

```bash
git push
```
