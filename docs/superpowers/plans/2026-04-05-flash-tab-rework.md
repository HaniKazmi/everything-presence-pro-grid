# Flash Tab Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove broken raw OTA flash code, replace device Flash buttons with Update button (for eppgrid devices with available updates) using ESPHome's `update.install` service.

**Architecture:** Backend adds `update_available` field to `list_flashable_devices` response by checking ESPHome update entity state. Frontend removes OTA types/handlers/rendering, replaces per-device Flash button with conditional Update button. Raw OTA module (`ota.py`) and `flash_ota` WS handler are deleted entirely.

**Tech Stack:** Python (HA WebSocket API, entity registry), TypeScript/Lit (frontend components), vitest (frontend tests), pytest (backend tests)

---

### Task 1: Backend — Add `update_available` to `list_flashable_devices`

**Files:**
- Modify: `custom_components/eppgrid/device_manager.py:702-758`
- Modify: `tests/test_device_manager_flasher.py`

- [ ] **Step 1: Write failing test for `update_available` field**

In `tests/test_device_manager_flasher.py`, add a test that verifies the `update_available` field is returned. Find the existing test class and add:

```python
async def test_list_flashable_devices_includes_update_available(self, hass, config_entry):
    """list_flashable_devices returns update_available field."""
    # Set up a device with an update entity that has an update available
    from homeassistant.helpers import device_registry as dr, entity_registry as er

    mock_dm = await self._setup(hass, config_entry)  # use existing setup helper

    devices = await mock_dm.list_flashable_devices()

    # Every device dict must have update_available key
    for device in devices:
        assert "update_available" in device
        assert isinstance(device["update_available"], bool)
```

Adapt to match the existing test setup pattern in the file.

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_device_manager_flasher.py -k "update_available" -xvs`
Expected: FAIL — `update_available` key not in device dict

- [ ] **Step 3: Implement `update_available` in `list_flashable_devices`**

In `custom_components/eppgrid/device_manager.py`, inside `list_flashable_devices()`, after the availability check loop (around line 744), add update entity detection:

```python
            # Check if an update is available via ESPHome update entity
            update_available = False
            for ent_entry in er.async_entries_for_device(ent_reg, device.id, include_disabled_entities=True):
                if ent_entry.domain == "update" and ent_entry.platform == "esphome":
                    state = self._hass.states.get(ent_entry.entity_id)
                    if state is not None and state.state == "on":
                        update_available = True
                    break
```

Add `"update_available": update_available` to the result dict (around line 754).

Note: HA update entities have state `"on"` when an update is available, `"off"` when up to date.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_device_manager_flasher.py -xvs`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add custom_components/eppgrid/device_manager.py tests/test_device_manager_flasher.py
git commit -m "feat: add update_available field to list_flashable_devices"
```

---

### Task 2: Backend — Remove raw OTA code

**Files:**
- Delete: `custom_components/eppgrid/ota.py`
- Delete: `tests/test_ota.py`
- Modify: `custom_components/eppgrid/websocket_api.py`
- Modify: `custom_components/eppgrid/const.py`
- Modify: `tests/test_websocket_flasher.py`

- [ ] **Step 1: Remove `ota.py` and its tests**

```bash
rm custom_components/eppgrid/ota.py tests/test_ota.py
```

- [ ] **Step 2: Remove `OTA_PORT` from `const.py`**

In `custom_components/eppgrid/const.py`, delete the line:
```python
OTA_PORT = 3232
```

- [ ] **Step 3: Remove `flash_ota` handler and helpers from `websocket_api.py`**

In `custom_components/eppgrid/websocket_api.py`:

1. Remove the imports of `fetch_firmware_binary`, `push_ota`, and `OTAError` (around lines 17-18)
2. Remove the registration line: `websocket_api.async_register_command(hass, websocket_flash_ota)` (line 51)
3. Remove the `_wait_for_device_online` function (lines 1233-1246)
4. Remove the entire `websocket_flash_ota` function and its decorator (lines 1249-1337)

- [ ] **Step 4: Remove `flash_ota` tests**

Delete `tests/test_websocket_flasher.py` entirely — the `TestFlashOta` class and its fixtures were the only content. If there are non-OTA tests in this file, keep those and only remove the OTA-related tests. Check the file first.

Actually, check the file contents. The file also contains `TestListFlashableDevices`, `TestDeleteEsphomeDevice`, `TestAddEsphomeDevice` — keep those. Only remove `class TestFlashOta` and its test methods.

- [ ] **Step 5: Run backend tests to verify nothing breaks**

Run: `python -m pytest tests/ -x --tb=short`
Expected: All tests PASS (count will be lower due to removed OTA tests)

- [ ] **Step 6: Commit**

```bash
git add -u
git commit -m "refactor: remove raw OTA flash code (ota.py, flash_ota handler)"
```

---

### Task 3: Frontend — Add `update_available` to types and controller

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/controllers/flasher-controller.ts`
- Modify: `frontend/src/__tests__/controllers/flasher-controller.test.ts`

- [ ] **Step 1: Add `update_available` to `FlashableDevice` type**

In `frontend/src/types.ts`, add to the `FlashableDevice` interface:

```typescript
export interface FlashableDevice {
	mac: string;
	name: string;
	host: string | null;
	available: boolean;
	firmware_type: "original" | "eppgrid";
	firmware_version: string;
	esphome_config_entry_id: string | null;
	update_available: boolean;
}
```

- [ ] **Step 2: Remove OTA types from `types.ts`**

Delete `OtaStep` type and `OtaProgress` interface (lines 52-66).

- [ ] **Step 3: Remove OTA state from `FlasherController`**

In `frontend/src/controllers/flasher-controller.ts`:

1. Remove the import of `OtaProgress` from types
2. Remove properties: `otaProgress`, `flashingMac`
3. Remove the `_unsubOta` private field
4. Remove the `startOtaFlash()` method entirely
5. Remove cleanup of `_unsubOta` in `hostDisconnected()`

The controller should keep: `flashableDevices`, `firmwareBaseUrl`, `loading`, `usbConnected`, `usbDeviceMac`, `usbExistingDevice`, `usbFlashState`, `wifiNetworks`, `loadDevices()`, `deleteEsphomeDevice()`, `addEsphomeDevice()`, `updateUsbState()`, `resetUsbState()`, `serialPort`.

- [ ] **Step 4: Remove OTA controller tests**

In `frontend/src/__tests__/controllers/flasher-controller.test.ts`:

1. Remove the entire `describe("startOtaFlash", ...)` block
2. Remove any tests that reference `otaProgress` or `flashingMac` (check `initializes otaProgress to null` etc.)
3. Update test fixtures to include `update_available: false` in any `FlashableDevice` test data

- [ ] **Step 5: Run frontend tests**

Run: `cd frontend && npx vitest run src/__tests__/controllers/flasher-controller.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types.ts frontend/src/controllers/flasher-controller.ts frontend/src/__tests__/controllers/flasher-controller.test.ts
git commit -m "refactor: remove OTA types and controller state, add update_available to FlashableDevice"
```

---

### Task 4: Frontend — Rework device list (remove Flash button, add Update button)

**Files:**
- Modify: `frontend/src/components/epp-flasher-view.ts`
- Modify: `frontend/src/__tests__/components/epp-flasher-view.test.ts`

- [ ] **Step 1: Write failing tests for the new device list behavior**

In `frontend/src/__tests__/components/epp-flasher-view.test.ts`:

Update existing test device fixtures to include `update_available`:
```typescript
const device1: FlashableDevice = {
	mac: "AA:BB:CC:DD:EE:01",
	name: "Living Room Sensor",
	host: "192.168.1.10",
	available: true,
	firmware_type: "original",
	firmware_version: "1.0.0",
	esphome_config_entry_id: null,
	update_available: false,
};
```

Add new tests:

```typescript
describe("device list buttons", () => {
	it("does not show Flash button for original firmware devices", () => {
		const device: FlashableDevice = {
			mac: "AA:BB:CC:DD:EE:01", name: "Test", host: "192.168.1.10",
			available: true, firmware_type: "original", firmware_version: "1.0.0",
			esphome_config_entry_id: null, update_available: false,
		};
		const el = createView({ flashableDevices: [device] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const btns = c.querySelectorAll(".device-row ha-button");
		expect(btns.length).toBe(0);
	});

	it("shows Update button for eppgrid device with update available", () => {
		const device: FlashableDevice = {
			mac: "AA:BB:CC:DD:EE:01", name: "Test", host: "192.168.1.10",
			available: true, firmware_type: "eppgrid", firmware_version: "0.1.0",
			esphome_config_entry_id: "entry-1", update_available: true,
		};
		const el = createView({ flashableDevices: [device] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const btn = c.querySelector(".device-row ha-button");
		expect(btn).not.toBeNull();
		expect(btn!.textContent).toContain("flasher.update");
	});

	it("does not show button for eppgrid device without update", () => {
		const device: FlashableDevice = {
			mac: "AA:BB:CC:DD:EE:01", name: "Test", host: "192.168.1.10",
			available: true, firmware_type: "eppgrid", firmware_version: "0.2.0",
			esphome_config_entry_id: "entry-1", update_available: false,
		};
		const el = createView({ flashableDevices: [device] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const btns = c.querySelectorAll(".device-row ha-button");
		expect(btns.length).toBe(0);
	});

	it("dispatches update-firmware event when Update clicked", () => {
		const device: FlashableDevice = {
			mac: "AA:BB:CC:DD:EE:01", name: "Test", host: "192.168.1.10",
			available: true, firmware_type: "eppgrid", firmware_version: "0.1.0",
			esphome_config_entry_id: "entry-1", update_available: true,
		};
		const el = createView({ flashableDevices: [device] });
		const events: CustomEvent[] = [];
		el.addEventListener("update-firmware", (e) => events.push(e as CustomEvent));

		(el as any)._dispatchUpdateFirmware(device);

		expect(events.length).toBe(1);
		expect(events[0].detail.mac).toBe("AA:BB:CC:DD:EE:01");
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/__tests__/components/epp-flasher-view.test.ts`
Expected: New tests FAIL

- [ ] **Step 3: Implement the new device list**

In `frontend/src/components/epp-flasher-view.ts`:

1. Remove `_confirmDevice` state, `_selectedVariant` state, `_dispatchFlashOta()` method, `_renderConfirmDialog()` method.
2. Remove `otaProgress`, `flashingMac` properties.
3. Remove `_renderOtaProgress()` method and `OTA_STEP_KEY` constant.
4. Remove the `OtaProgress` import from types.

5. Add a new method to dispatch update event:
```typescript
private _dispatchUpdateFirmware(device: FlashableDevice): void {
	this.dispatchEvent(
		new CustomEvent("update-firmware", {
			detail: { mac: device.mac },
			bubbles: true,
			composed: true,
		}),
	);
}
```

6. Replace the device row button in `_renderDeviceList()`. Change the `ha-button` section to:
```typescript
${
	device.firmware_type === "eppgrid" && device.update_available
		? html`<ha-button
				raised
				@click=${() => this._dispatchUpdateFirmware(device)}
			>${this.localize("flasher.update")}</ha-button>`
		: nothing
}
```

7. Remove the confirm dialog rendering from `render()`:
```typescript
render() {
	if (this.loading) {
		return this._renderLoading();
	}

	if (this._showWifiProvisioning) {
		return this._renderWifiProvisioning();
	}

	if (this._showUsbFlash || this.usbFlashState) {
		return this._renderUsbFlash();
	}

	return this._renderDeviceList();
}
```

- [ ] **Step 4: Add translation key**

In `frontend/src/translations/en.json`, add under `flasher`:
```json
"update": "Update"
```

- [ ] **Step 5: Remove `.ota-status` styles**

In `frontend/src/styles.ts`, remove the `.ota-status` CSS block (around lines 737-742).

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/__tests__/components/epp-flasher-view.test.ts`
Expected: All tests PASS

- [ ] **Step 7: Fix any remaining test failures across the suite**

Run: `cd frontend && npx vitest run`

Fix any test files that reference removed types/properties (`OtaProgress`, `otaProgress`, `flashingMac`, `flash-ota`, `_confirmDevice`, `confirm-dialog`, `variant-selector` in confirm context). Key files to check:
- `src/__tests__/panel-usb-flash.test.ts` — remove `@flash-ota` tests
- `src/__tests__/components/epp-flasher-card.test.ts` — remove OTA bindings
- `src/__tests__/panel-protocol-banner.test.ts` — keep `_updateFirmware` tests

Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add -u frontend/
git commit -m "feat: replace OTA Flash button with Update button for eppgrid devices"
```

---

### Task 5: Frontend — Wire up `update-firmware` event in panel

**Files:**
- Modify: `frontend/src/eppgrid-panel.ts`
- Modify: `frontend/src/__tests__/panel-usb-flash.test.ts`

- [ ] **Step 1: Write failing test for `@update-firmware` handler**

In `frontend/src/__tests__/panel-usb-flash.test.ts`, in the `"epp-flasher-view inline event handlers"` describe block, add:

```typescript
it("@update-firmware calls _updateFirmware with mac", async () => {
	const spy = vi
		.spyOn(panel as any, "_updateFirmware")
		.mockResolvedValue(undefined);

	getFlasherView().dispatchEvent(
		new CustomEvent("update-firmware", {
			detail: { mac: "aa:bb:cc" },
			bubbles: true,
		}),
	);

	expect(spy).toHaveBeenCalled();
	expect((panel as any)._selectedMac).toBe("aa:bb:cc");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/panel-usb-flash.test.ts -t "update-firmware"`
Expected: FAIL

- [ ] **Step 3: Wire up the event handler**

In `frontend/src/eppgrid-panel.ts`, in the flasher view template (around line 1068), remove the `@flash-ota` handler entirely and add:

```typescript
@update-firmware=${(e: CustomEvent) => {
	this._selectedMac = e.detail.mac;
	this._updateFirmware();
}}
```

Also remove the `otaProgress` and `flashingMac` property bindings from the flasher view template.

- [ ] **Step 4: Remove `@flash-ota` inline handler tests**

In `frontend/src/__tests__/panel-usb-flash.test.ts`, remove all tests in the `"epp-flasher-view inline event handlers"` describe that reference `@flash-ota` (the warns/confirms/skips tests from earlier).

- [ ] **Step 5: Run tests**

Run: `cd frontend && npx vitest run src/__tests__/panel-usb-flash.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/eppgrid-panel.ts frontend/src/__tests__/panel-usb-flash.test.ts
git commit -m "feat: wire update-firmware event from flasher view to panel"
```

---

### Task 6: Clean up flasher-card and remaining references

**Files:**
- Modify: `frontend/src/components/epp-flasher-card.ts`
- Modify: `frontend/src/__tests__/components/epp-flasher-card.test.ts`
- Modify: `docs/backend-data-catalog.md`

- [ ] **Step 1: Remove OTA bindings from `epp-flasher-card.ts`**

In `frontend/src/components/epp-flasher-card.ts`, remove the `.otaProgress`, `.flashingMac` property bindings and the `@flash-ota` event handler from the template. The render should become:

```typescript
render() {
	return html`
		<epp-flasher-view
			.hass=${this.hass}
			.flashableDevices=${this._flasherCtrl.flashableDevices}
			.loading=${this._flasherCtrl.loading}
		></epp-flasher-view>
	`;
}
```

- [ ] **Step 2: Update flasher-card tests**

In `frontend/src/__tests__/components/epp-flasher-card.test.ts`, remove the test for `flash-ota` event handling. Update any test device fixtures to include `update_available: false`.

- [ ] **Step 3: Update backend data catalog**

In `docs/backend-data-catalog.md`, remove the `flash_ota` documentation section and add `update_available` to the `list_flashable_devices` response documentation.

- [ ] **Step 4: Run full test suites**

```bash
cd frontend && npx vitest run
python -m pytest tests/ -x --tb=short
```

Expected: All tests PASS

- [ ] **Step 5: Build frontend**

```bash
cd frontend && npm run build
```

Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add -u
git commit -m "chore: clean up flasher-card OTA bindings and update data catalog"
```

---

### Task 7: Manual verification

- [ ] **Step 1: Restart HA and verify**

```bash
ha-wt restart epp-flasher
```

Hard refresh browser. Verify:
1. Flash Firmware tab shows installed devices
2. Original firmware devices have no action button
3. EPP Grid devices with updates show "Update" button
4. EPP Grid devices without updates show no button
5. USB Flash and USB WiFi Config still work
6. Device Configuration tab is unchanged
