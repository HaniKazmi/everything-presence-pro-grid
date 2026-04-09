# OTA Upgrade Progress Indicator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fire-and-forget "Update" button in the flasher device list with an inline circular progress indicator that tracks OTA updates through completion, including reboot detection and error reporting.

**Architecture:** Backend WebSocket subscription handler subscribes to ESPHome `UpdateState` entity changes and forwards progress events, with HA bus listener for device availability to detect reboot/reconnect. Frontend adds per-device OTA state tracking in the FlasherController, rendering inline SVG progress rings, spinners, success checkmarks, and error popovers in the device rows.

**Tech Stack:** Python (Home Assistant WebSocket API, aioesphomeapi), TypeScript/Lit (frontend components), Vitest (frontend tests), pytest (backend tests)

---

### File Structure

**Backend (create):**
- `tests/test_websocket_ota.py` — Tests for the OTA progress subscription handler

**Backend (modify):**
- `custom_components/eppgrid/websocket_api.py` — Add `websocket_subscribe_ota_progress` handler + register it

**Frontend (modify):**
- `frontend/src/types.ts` — Add `OtaState` and `OtaDeviceState` types
- `frontend/src/controllers/flasher-controller.ts` — Add OTA state map, subscribe/unsubscribe/retry methods
- `frontend/src/components/epp-flasher-view.ts` — Render inline OTA widgets in device rows, error popover
- `frontend/src/styles.ts` — Add OTA progress, spinner, success, error, popover styles
- `frontend/src/translations/en.json` — Add OTA localization keys
- `frontend/src/eppgrid-panel.ts` — Wire OTA subscription on update-firmware event

---

### Task 1: Backend — OTA Progress Subscription Handler (Tests)

**Files:**
- Create: `tests/test_websocket_ota.py`

This task writes all the backend tests. The handler doesn't exist yet, so every test will fail.

- [ ] **Step 1: Write test file with fixtures and happy-path test**

```python
"""Tests for OTA progress WebSocket subscription."""

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
    from custom_components.eppgrid.const import FIRMWARE_VERSION

    if hass.http is None:
        hass.http = MagicMock()

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
        mock_dm._store.async_save = AsyncMock()
        mock_dm.devices = {}
        mock_dm.list_devices.return_value = []
        mock_dm._push_config_to_device = AsyncMock()
        mock_dm._push_pipeline_to_device = AsyncMock()
        mock_dm._entity_update_macs = set()
        mock_dm.async_update_zone_entities = AsyncMock()
        mock_dm.async_open_session = AsyncMock(return_value=None)
        mock_dm.async_close_session = AsyncMock()
        mock_dm.get_session = MagicMock(return_value=None)
        mock_dm.read_firmware_version.return_value = FIRMWARE_VERSION
        mock_dm._build_flags = {}

        await async_setup_entry(hass, config_entry)

    return mock_dm


async def call_async_handler(hass, handler, connection, msg):
    handler(hass, connection, msg)
    await hass.async_block_till_done()


def make_mock_device_conn(entities=None):
    """Create a mock DeviceConnection with subscribe_states support."""
    conn = MagicMock()
    conn.connected = True
    conn._entities = entities or []
    conn.subscribe_states = MagicMock()
    conn.unsubscribe_states = MagicMock()
    return conn


def make_update_state(*, in_progress=False, has_progress=False, progress=0.0,
                      current_version="0.89.0", latest_version="0.90.0-alpha",
                      key=1, missing_state=False):
    """Create a mock UpdateState object."""
    state = MagicMock()
    state.__class__.__name__ = "UpdateState"
    state.in_progress = in_progress
    state.has_progress = has_progress
    state.progress = progress
    state.current_version = current_version
    state.latest_version = latest_version
    state.key = key
    state.missing_state = missing_state
    return state


class TestSubscribeOtaProgress:
    """Tests for eppgrid/subscribe_ota_progress."""

    async def test_sends_error_when_integration_not_loaded(
        self, hass: HomeAssistant, config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        # Remove manager so _get_manager returns None
        hass.data.pop("eppgrid", None)

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        connection.send_error.assert_called_once_with(1, "not_ready", "Integration not loaded")

    async def test_sends_error_when_no_session(
        self, hass: HomeAssistant, config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.get_session.return_value = None

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        connection.send_error.assert_called_once_with(
            1, "no_session", "No active session for device",
        )

    async def test_subscribes_and_sends_result(
        self, hass: HomeAssistant, config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.get_session.return_value = device_conn

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        device_conn.subscribe_states.assert_called_once()
        connection.send_result.assert_called_once_with(1)
        assert 1 in connection.subscriptions

    async def test_forwards_progress_events(
        self, hass: HomeAssistant, config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.get_session.return_value = device_conn

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        # Get the callback that was registered
        on_state = device_conn.subscribe_states.call_args[0][0]

        # Simulate progress update
        state = make_update_state(in_progress=True, has_progress=True, progress=65.0)
        on_state(state)

        from homeassistant.components.websocket_api import event_message
        connection.send_message.assert_called_once()
        sent = connection.send_message.call_args[0][0]
        assert sent == event_message(1, {
            "state": "updating",
            "progress": 65.0,
        })

    async def test_forwards_indeterminate_progress(
        self, hass: HomeAssistant, config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.get_session.return_value = device_conn

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_state = device_conn.subscribe_states.call_args[0][0]
        state = make_update_state(in_progress=True, has_progress=False)
        on_state(state)

        from homeassistant.components.websocket_api import event_message
        connection.send_message.assert_called_once()
        sent = connection.send_message.call_args[0][0]
        assert sent == event_message(1, {
            "state": "updating",
            "progress": None,
        })

    async def test_ignores_non_update_states(
        self, hass: HomeAssistant, config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.get_session.return_value = device_conn

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_state = device_conn.subscribe_states.call_args[0][0]

        # Send a non-UpdateState object
        sensor_state = MagicMock()
        sensor_state.__class__.__name__ = "SensorState"
        on_state(sensor_state)

        connection.send_message.assert_not_called()

    async def test_sends_success_on_version_match(
        self, hass: HomeAssistant, config_entry: MockConfigEntry,
    ) -> None:
        """When in_progress goes false and versions match, emit success."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.get_session.return_value = device_conn

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_state = device_conn.subscribe_states.call_args[0][0]

        # Update in progress, then completes with version match
        on_state(make_update_state(in_progress=True, has_progress=True, progress=100.0))
        on_state(make_update_state(in_progress=False, current_version="0.90.0-alpha",
                                   latest_version="0.90.0-alpha"))

        from homeassistant.components.websocket_api import event_message
        calls = [c[0][0] for c in connection.send_message.call_args_list]
        assert event_message(1, {"state": "success", "version": "0.90.0-alpha"}) in calls

    async def test_sends_error_on_version_mismatch(
        self, hass: HomeAssistant, config_entry: MockConfigEntry,
    ) -> None:
        """When in_progress goes false but versions don't match, emit error."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.get_session.return_value = device_conn

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_state = device_conn.subscribe_states.call_args[0][0]

        # Start updating, then stop without version change (update failed)
        on_state(make_update_state(in_progress=True, has_progress=True, progress=30.0))
        on_state(make_update_state(in_progress=False,
                                   current_version="0.89.0",
                                   latest_version="0.90.0-alpha"))

        from homeassistant.components.websocket_api import event_message
        calls = [c[0][0] for c in connection.send_message.call_args_list]
        assert event_message(1, {
            "state": "error",
            "message": "Update failed — firmware version unchanged",
        }) in calls

    async def test_unsubscribe_cleans_up(
        self, hass: HomeAssistant, config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.get_session.return_value = device_conn

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_state = device_conn.subscribe_states.call_args[0][0]

        # Unsubscribe
        connection.subscriptions[1]()
        device_conn.unsubscribe_states.assert_called_once_with(on_state)
```

- [ ] **Step 2: Run tests to verify they all fail**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-upgrade-spinner && python -m pytest tests/test_websocket_ota.py -v`

Expected: All tests FAIL with `ImportError` or `AttributeError` because `websocket_subscribe_ota_progress` doesn't exist yet.

---

### Task 2: Backend — OTA Progress Subscription Handler (Implementation)

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py`

- [ ] **Step 1: Add the handler and register it**

Add to `websocket_api.py` after the `websocket_update_firmware` handler (after line 1151), and register it in `async_register_commands` (after line 50):

Registration (add after line 50 — the `websocket_update_firmware` registration):
```python
    websocket_api.async_register_command(hass, websocket_subscribe_ota_progress)
```

Handler (add after the `websocket_update_firmware` function):
```python
# -- subscribe_ota_progress --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/subscribe_ota_progress",
        vol.Required("mac"): str,
    }
)
@websocket_api.async_response
async def websocket_subscribe_ota_progress(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Subscribe to OTA firmware update progress for a device."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return

    mac = msg["mac"]
    device_conn = manager.get_session(mac)
    if device_conn is None:
        connection.send_error(msg["id"], "no_session", "No active session for device")
        return

    was_in_progress = False

    @callback
    def _on_state(state: Any) -> None:
        nonlocal was_in_progress
        from aioesphomeapi import UpdateState

        if not isinstance(state, UpdateState):
            return

        if state.in_progress:
            was_in_progress = True
            progress = state.progress if state.has_progress else None
            connection.send_message(
                websocket_api.event_message(msg["id"], {
                    "state": "updating",
                    "progress": progress,
                })
            )
        elif was_in_progress:
            was_in_progress = False
            # Update finished — check if version matches
            if state.current_version and state.current_version == state.latest_version:
                connection.send_message(
                    websocket_api.event_message(msg["id"], {
                        "state": "success",
                        "version": state.current_version,
                    })
                )
            else:
                # Update stopped but version didn't change — failed
                connection.send_message(
                    websocket_api.event_message(msg["id"], {
                        "state": "error",
                        "message": "Update failed \u2014 firmware version unchanged",
                    })
                )

    device_conn.subscribe_states(_on_state)
    connection.send_result(msg["id"])

    @callback
    def _unsub() -> None:
        device_conn.unsubscribe_states(_on_state)

    connection.subscriptions[msg["id"]] = _unsub
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-upgrade-spinner && python -m pytest tests/test_websocket_ota.py -v`

Expected: All tests PASS.

- [ ] **Step 3: Run full backend test suite**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-upgrade-spinner && python -m pytest tests/ -v --timeout=30`

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/test_websocket_ota.py custom_components/eppgrid/websocket_api.py
git commit -m "feat: add OTA progress WebSocket subscription handler

Subscribes to ESPHome UpdateState changes and forwards progress,
rebooting, and success/error events to the frontend."
```

---

### Task 3: Frontend — OTA State Types and Localization

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/translations/en.json`

- [ ] **Step 1: Write test for OTA types**

No separate test needed — types are validated by TypeScript compilation and will be exercised in Task 4 tests.

- [ ] **Step 2: Add OTA types to types.ts**

Add after the `UsbFlashState` interface (after line 78):

```typescript
export type OtaState = "updating" | "rebooting" | "success" | "error";

export interface OtaDeviceState {
	state: OtaState;
	progress: number | null; // 0-100 or null for indeterminate
	error: string | null;
}
```

- [ ] **Step 3: Add localization keys to en.json**

Add inside the `"flasher"` object in `frontend/src/translations/en.json`:

```json
    "ota_retry": "Retry",
    "ota_error_timeout": "Update timed out",
    "ota_error_connection_lost": "Connection lost during update",
    "ota_error_failed": "Update failed"
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types.ts frontend/src/translations/en.json
git commit -m "feat: add OTA state types and localization keys"
```

---

### Task 4: Frontend — FlasherController OTA State Management (Tests)

**Files:**
- Create or modify: `frontend/src/__tests__/controllers/flasher-controller.test.ts`

- [ ] **Step 1: Write failing tests for OTA state management**

Add a new `describe("OTA state management")` block to the existing test file:

```typescript
describe("OTA state management", () => {
	let host: ReturnType<typeof mockHost>;
	let hass: ReturnType<typeof mockHass>;
	let ctrl: FlasherController;

	beforeEach(() => {
		host = mockHost();
		hass = mockHass();
		ctrl = new FlasherController(host);
		ctrl.hass = hass;
	});

	it("initializes with empty otaStates", () => {
		expect(ctrl.otaStates).toEqual({});
	});

	it("startOta sets updating state and calls update_firmware", async () => {
		await ctrl.startOta("AA:BB:CC:DD:EE:01");

		expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
			state: "updating",
			progress: 0,
			error: null,
		});
		expect(hass.callWS).toHaveBeenCalledWith({
			type: "eppgrid/update_firmware",
			mac: "AA:BB:CC:DD:EE:01",
		});
	});

	it("startOta subscribes to ota progress", async () => {
		await ctrl.startOta("AA:BB:CC:DD:EE:01");

		expect(hass.connection.subscribeMessage).toHaveBeenCalledWith(
			expect.any(Function),
			{ type: "eppgrid/subscribe_ota_progress", mac: "AA:BB:CC:DD:EE:01" },
		);
	});

	it("updates progress on subscription events", async () => {
		await ctrl.startOta("AA:BB:CC:DD:EE:01");

		const callback = hass.connection.subscribeMessage.mock.calls[0][0];
		callback({ state: "updating", progress: 65 });

		expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
			state: "updating",
			progress: 65,
			error: null,
		});
		expect(host.requestUpdate).toHaveBeenCalled();
	});

	it("transitions to rebooting on inactivity timeout", async () => {
		vi.useFakeTimers();
		await ctrl.startOta("AA:BB:CC:DD:EE:01");

		const callback = hass.connection.subscribeMessage.mock.calls[0][0];
		callback({ state: "updating", progress: 50 });

		// Fast-forward 15s with no events
		vi.advanceTimersByTime(15000);

		expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("rebooting");
		vi.useRealTimers();
	});

	it("checkOtaReconnect transitions rebooting to success when device comes back", async () => {
		await ctrl.startOta("AA:BB:CC:DD:EE:01");
		ctrl.otaStates["AA:BB:CC:DD:EE:01"] = { state: "rebooting", progress: null, error: null };
		ctrl.flashableDevices = [{
			mac: "AA:BB:CC:DD:EE:01",
			name: "EPP Lounge",
			host: "192.168.20.214",
			available: true,
			firmware_type: "eppgrid",
			firmware_version: "0.90.0-alpha",
			esphome_config_entry_id: null,
			update_available: false,
			firmware_status: "compatible",
		}];

		ctrl.checkOtaReconnect();

		expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("success");
	});

	it("transitions to success state", async () => {
		await ctrl.startOta("AA:BB:CC:DD:EE:01");

		const callback = hass.connection.subscribeMessage.mock.calls[0][0];
		callback({ state: "success", version: "0.90.0-alpha" });

		expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("success");
	});

	it("transitions to error state with message", async () => {
		await ctrl.startOta("AA:BB:CC:DD:EE:01");

		const callback = hass.connection.subscribeMessage.mock.calls[0][0];
		callback({ state: "error", message: "Connection lost" });

		expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
			state: "error",
			progress: null,
			error: "Connection lost",
		});
	});

	it("retryOta clears state for a device", () => {
		ctrl.otaStates["AA:BB:CC:DD:EE:01"] = {
			state: "error",
			progress: null,
			error: "Connection lost",
		};
		ctrl.retryOta("AA:BB:CC:DD:EE:01");

		expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toBeUndefined();
		expect(host.requestUpdate).toHaveBeenCalled();
	});

	it("clearOta removes state after success", () => {
		ctrl.otaStates["AA:BB:CC:DD:EE:01"] = {
			state: "success",
			progress: null,
			error: null,
		};
		ctrl.clearOta("AA:BB:CC:DD:EE:01");

		expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toBeUndefined();
	});

	it("sets error when update_firmware call fails", async () => {
		hass.callWS = vi.fn().mockRejectedValue(new Error("Device offline"));

		await ctrl.startOta("AA:BB:CC:DD:EE:01");

		expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
			state: "error",
			progress: null,
			error: "Device offline",
		});
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-upgrade-spinner/frontend && npx vitest run src/__tests__/controllers/flasher-controller.test.ts`

Expected: All OTA tests FAIL because `otaStates`, `startOta`, `retryOta`, `clearOta` don't exist.

---

### Task 5: Frontend — FlasherController OTA State Management (Implementation)

**Files:**
- Modify: `frontend/src/controllers/flasher-controller.ts`

- [ ] **Step 1: Add OTA state management to FlasherController**

Add import at top of file:
```typescript
import type { OtaDeviceState } from "../types.js";
```

Add property after `wifiNetworks` (after line 15):
```typescript
	otaStates: Record<string, OtaDeviceState> = {};
```

Add private fields for OTA unsubscribers and timeouts after `_opRunning` (after line 24):
```typescript
	private _otaUnsubs: Record<string, (() => void)> = {};
	private _otaTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};
```

Add methods before `hostDisconnected()`:

```typescript
	async startOta(mac: string): Promise<void> {
		this.otaStates[mac] = { state: "updating", progress: 0, error: null };
		this._host.requestUpdate();

		try {
			await this._hass!.callWS({
				type: "eppgrid/update_firmware",
				mac,
			});
		} catch (err: any) {
			this.otaStates[mac] = {
				state: "error",
				progress: null,
				error: err.message || String(err),
			};
			this._host.requestUpdate();
			return;
		}

		try {
			const unsub = await this._hass!.connection.subscribeMessage(
				(event: any) => {
					this._handleOtaEvent(mac, event);
				},
				{ type: "eppgrid/subscribe_ota_progress", mac },
			);
			this._otaUnsubs[mac] = unsub;
		} catch (err: any) {
			this.otaStates[mac] = {
				state: "error",
				progress: null,
				error: err.message || String(err),
			};
			this._host.requestUpdate();
		}
	}

	private _handleOtaEvent(mac: string, event: any): void {
		// Reset inactivity timeout on every event
		this._resetOtaTimeout(mac);

		switch (event.state) {
			case "updating":
				this.otaStates[mac] = {
					state: "updating",
					progress: event.progress ?? null,
					error: null,
				};
				// Start inactivity timeout — if no events for 15s, assume reboot
				this._startOtaTimeout(mac, 15000);
				break;
			case "rebooting":
				this.otaStates[mac] = {
					state: "rebooting",
					progress: null,
					error: null,
				};
				break;
			case "success":
				this.otaStates[mac] = {
					state: "success",
					progress: null,
					error: null,
				};
				this._unsubOta(mac);
				break;
			case "error":
				this.otaStates[mac] = {
					state: "error",
					progress: null,
					error: event.message || "Update failed",
				};
				this._unsubOta(mac);
				break;
		}
		this._host.requestUpdate();
	}

	private _startOtaTimeout(mac: string, ms: number): void {
		this._resetOtaTimeout(mac);
		this._otaTimeouts[mac] = setTimeout(() => {
			if (this.otaStates[mac]?.state === "updating") {
				// No events received — device likely rebooted, connection dropped
				this.otaStates[mac] = { state: "rebooting", progress: null, error: null };
				this._host.requestUpdate();
			}
		}, ms);
	}

	private _resetOtaTimeout(mac: string): void {
		const t = this._otaTimeouts[mac];
		if (t) {
			clearTimeout(t);
			delete this._otaTimeouts[mac];
		}
	}

	/**
	 * Called when the device list updates. Checks if any rebooting device
	 * has come back with updated firmware.
	 */
	checkOtaReconnect(): void {
		for (const [mac, ota] of Object.entries(this.otaStates)) {
			if (ota.state !== "rebooting") continue;
			const device = this.flashableDevices.find((d) => d.mac === mac);
			if (device && device.available && device.firmware_status !== "firmware_behind") {
				this.otaStates[mac] = { state: "success", progress: null, error: null };
				this._unsubOta(mac);
				this._host.requestUpdate();
			}
		}
	}

	retryOta(mac: string): void {
		this._unsubOta(mac);
		delete this.otaStates[mac];
		this._host.requestUpdate();
	}

	clearOta(mac: string): void {
		this._unsubOta(mac);
		delete this.otaStates[mac];
		this._host.requestUpdate();
	}

	private _unsubOta(mac: string): void {
		const unsub = this._otaUnsubs[mac];
		if (unsub) {
			unsub();
			delete this._otaUnsubs[mac];
		}
	}
```

In `hostDisconnected()`, add cleanup for OTA subscriptions and timeouts:
```typescript
		for (const mac of Object.keys(this._otaUnsubs)) {
			this._unsubOta(mac);
		}
		for (const mac of Object.keys(this._otaTimeouts)) {
			this._resetOtaTimeout(mac);
		}
		this.otaStates = {};
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-upgrade-spinner/frontend && npx vitest run src/__tests__/controllers/flasher-controller.test.ts`

Expected: All tests PASS.

- [ ] **Step 3: Run full frontend test suite**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-upgrade-spinner/frontend && npx vitest run`

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/controllers/flasher-controller.ts frontend/src/__tests__/controllers/flasher-controller.test.ts
git commit -m "feat: add OTA state management to FlasherController

Tracks per-device OTA state (updating/rebooting/success/error),
subscribes to backend progress events, and provides retry/clear methods."
```

---

### Task 6: Frontend — OTA Inline Rendering (Tests)

**Files:**
- Modify: `frontend/src/__tests__/components/epp-flasher-view.test.ts`

- [ ] **Step 1: Write failing tests for OTA rendering in device rows**

Add a new fixture device that needs updating and add test block:

```typescript
const updatableDevice: FlashableDevice = {
	mac: "AA:BB:CC:DD:EE:04",
	name: "EPP Lounge",
	host: "192.168.20.214",
	available: true,
	firmware_type: "eppgrid",
	firmware_version: "0.89.0",
	esphome_config_entry_id: "config-entry-456",
	update_available: true,
	firmware_status: "firmware_behind",
};

describe("OTA progress rendering", () => {
	it("renders update button when no OTA state", () => {
		const el = createView({
			flashableDevices: [updatableDevice],
			otaStates: {},
		});
		const result = (el as any)._renderDeviceList();
		const html = renderToString(result);
		expect(html).toContain("flasher.update");
	});

	it("renders progress ring when updating", () => {
		const el = createView({
			flashableDevices: [updatableDevice],
			otaStates: {
				"AA:BB:CC:DD:EE:04": { state: "updating", progress: 65, error: null },
			},
		});
		const result = (el as any)._renderDeviceList();
		const html = renderToString(result);
		expect(html).toContain("ota-progress");
		expect(html).toContain("65");
	});

	it("renders spinner when rebooting", () => {
		const el = createView({
			flashableDevices: [updatableDevice],
			otaStates: {
				"AA:BB:CC:DD:EE:04": { state: "rebooting", progress: null, error: null },
			},
		});
		const result = (el as any)._renderDeviceList();
		const html = renderToString(result);
		expect(html).toContain("ota-spinner");
	});

	it("renders success checkmark", () => {
		const el = createView({
			flashableDevices: [updatableDevice],
			otaStates: {
				"AA:BB:CC:DD:EE:04": { state: "success", progress: null, error: null },
			},
		});
		const result = (el as any)._renderDeviceList();
		const html = renderToString(result);
		expect(html).toContain("ota-success");
	});

	it("renders error with retry button", () => {
		const el = createView({
			flashableDevices: [updatableDevice],
			otaStates: {
				"AA:BB:CC:DD:EE:04": {
					state: "error",
					progress: null,
					error: "Connection lost",
				},
			},
		});
		const result = (el as any)._renderDeviceList();
		const html = renderToString(result);
		expect(html).toContain("ota-error");
		expect(html).toContain("flasher.ota_retry");
	});

	it("renders indeterminate spinner when progress is null during updating", () => {
		const el = createView({
			flashableDevices: [updatableDevice],
			otaStates: {
				"AA:BB:CC:DD:EE:04": { state: "updating", progress: null, error: null },
			},
		});
		const result = (el as any)._renderDeviceList();
		const html = renderToString(result);
		expect(html).toContain("ota-spinner");
	});
});
```

Note: You may need to add a `renderToString` helper that serializes Lit TemplateResult to string. Check the existing test file for how they handle this — some tests call `(el as any).render()` and inspect the result, others use `el.shadowRoot`. Adapt the test assertions to match the project's existing patterns.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-upgrade-spinner/frontend && npx vitest run src/__tests__/components/epp-flasher-view.test.ts`

Expected: FAIL — `otaStates` property doesn't exist on the view yet.

---

### Task 7: Frontend — OTA Inline Rendering (Implementation)

**Files:**
- Modify: `frontend/src/components/epp-flasher-view.ts`
- Modify: `frontend/src/styles.ts`

- [ ] **Step 1: Add otaStates property to EppFlasherView**

Add import:
```typescript
import type { OtaDeviceState } from "../types.js";
```

Add property:
```typescript
	@property({ attribute: false }) otaStates: Record<string, OtaDeviceState> = {};
```

- [ ] **Step 2: Add OTA rendering method**

Add a private method to render the inline OTA widget for a device:

```typescript
	private _renderOtaIndicator(device: FlashableDevice): typeof nothing | ReturnType<typeof html> {
		const ota = this.otaStates[device.mac];
		if (!ota) return nothing;

		switch (ota.state) {
			case "updating": {
				if (ota.progress == null) {
					// Indeterminate spinner
					return html`<div class="ota-spinner"></div>`;
				}
				// Circular progress ring
				const radius = 13;
				const circumference = 2 * Math.PI * radius;
				const offset = circumference - (ota.progress / 100) * circumference;
				return html`
					<div class="ota-progress">
						<svg width="32" height="32" viewBox="0 0 32 32">
							<circle class="ota-track" cx="16" cy="16" r="${radius}" />
							<circle class="ota-fill" cx="16" cy="16" r="${radius}"
								stroke-dasharray="${circumference}"
								stroke-dashoffset="${offset}" />
						</svg>
						<span class="ota-pct">${Math.round(ota.progress)}</span>
					</div>`;
			}
			case "rebooting":
				return html`<div class="ota-spinner"></div>`;
			case "success":
				return html`<ha-icon class="ota-success" icon="mdi:check-circle"></ha-icon>`;
			case "error":
				return html`
					<div class="ota-error">
						<ha-icon class="ota-error-icon"
							icon="mdi:alert-circle"
							@click=${(e: Event) => this._toggleErrorPopover(e, device.mac)}
						></ha-icon>
						<ha-button @click=${() => this._dispatchRetryOta(device)}>
							${this.localize("flasher.ota_retry")}
						</ha-button>
						${this._errorPopoverMac === device.mac
							? html`<div class="ota-error-popover">${ota.error}</div>`
							: nothing}
					</div>`;
		}
	}
```

- [ ] **Step 3: Add error popover state and handlers**

```typescript
	@state() private _errorPopoverMac: string | null = null;

	private _toggleErrorPopover(e: Event, mac: string): void {
		e.stopPropagation();
		this._errorPopoverMac = this._errorPopoverMac === mac ? null : mac;
	}

	private _dispatchRetryOta(device: FlashableDevice): void {
		this._errorPopoverMac = null;
		this.dispatchEvent(
			new CustomEvent("retry-ota", {
				detail: { mac: device.mac },
				bubbles: true,
				composed: true,
			}),
		);
	}
```

- [ ] **Step 4: Update device row rendering to use OTA indicator**

In `_renderDeviceList()`, replace the Update button conditional (lines 319-330) with:

```typescript
                        ${
                            this.otaStates[device.mac]
                                ? this._renderOtaIndicator(device)
                                : device.firmware_type === "eppgrid" &&
                                    (device.update_available ||
                                        device.firmware_status === "firmware_behind")
                                    ? html`<ha-button
                                            raised
                                            @click=${() => this._dispatchUpdateFirmware(device)}
                                        >${this.localize("flasher.update")}</ha-button>`
                                    : nothing
                        }
```

- [ ] **Step 5: Add OTA styles to styles.ts**

Add inside the `flasherStyles` css template, after the existing `.firmware-badge-ahead` block (after line 632):

```css
  /* OTA progress indicators */
  .ota-progress {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
  }
  .ota-progress svg {
    transform: rotate(-90deg);
  }
  .ota-track {
    fill: none;
    stroke: var(--divider-color, #e0e0e0);
    stroke-width: 3;
  }
  .ota-fill {
    fill: none;
    stroke: var(--primary-color, #03a9f4);
    stroke-width: 3;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.3s ease;
  }
  .ota-pct {
    position: absolute;
    font-size: 9px;
    font-weight: 600;
    color: var(--primary-text-color, #212121);
  }
  .ota-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--divider-color, #e0e0e0);
    border-top-color: var(--primary-color, #03a9f4);
    border-radius: 50%;
    animation: ota-spin 0.8s linear infinite;
    flex-shrink: 0;
  }
  @keyframes ota-spin {
    to { transform: rotate(360deg); }
  }
  .ota-success {
    --mdc-icon-size: 24px;
    color: var(--success-color, #4caf50);
    flex-shrink: 0;
  }
  .ota-error {
    display: flex;
    align-items: center;
    gap: 4px;
    position: relative;
    flex-shrink: 0;
  }
  .ota-error-icon {
    --mdc-icon-size: 20px;
    color: var(--error-color, #f44336);
    cursor: pointer;
  }
  .ota-error-popover {
    position: absolute;
    bottom: 100%;
    right: 0;
    background: var(--error-color, #f44336);
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12px;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    z-index: 10;
    margin-bottom: 4px;
  }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-upgrade-spinner/frontend && npx vitest run src/__tests__/components/epp-flasher-view.test.ts`

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/epp-flasher-view.ts frontend/src/styles.ts frontend/src/__tests__/components/epp-flasher-view.test.ts
git commit -m "feat: render inline OTA progress indicators in device rows

Shows circular progress ring, indeterminate spinner, success checkmark,
or error icon with popover depending on per-device OTA state."
```

---

### Task 8: Frontend — Wire Up Panel and Build

**Files:**
- Modify: `frontend/src/eppgrid-panel.ts`

- [ ] **Step 1: Pass otaStates to the flasher view**

In the flasher tab render (around line 1076-1084), add the `otaStates` property binding:

```typescript
            .otaStates=${this._flasherCtrl.otaStates}
```

- [ ] **Step 2: Update the update-firmware event handler**

Replace the existing `@update-firmware` handler (around line 1115-1118) to use the controller's `startOta` method instead of calling `_updateFirmware` directly:

```typescript
            @update-firmware=${(e: CustomEvent) => {
                this._flasherCtrl.startOta(e.detail.mac);
            }}
```

- [ ] **Step 3: Add retry-ota event handler**

Add after the `@update-firmware` handler:

```typescript
            @retry-ota=${(e: CustomEvent) => {
                this._flasherCtrl.retryOta(e.detail.mac);
            }}
```

- [ ] **Step 4: Wire up checkOtaReconnect on device list changes**

In the FlasherController, set the `onDeviceListChanged` callback to also call `checkOtaReconnect`. In `_applyDeviceList` (around line 91-99), add at the end:

```typescript
		this.checkOtaReconnect();
```

- [ ] **Step 6: Add success auto-dismiss**

In the FlasherController's `_handleOtaEvent`, update the `"success"` case to auto-dismiss:

```typescript
			case "success":
				this.otaStates[mac] = {
					state: "success",
					progress: null,
					error: null,
				};
				this._unsubOta(mac);
				// Auto-dismiss after 5 seconds
				setTimeout(() => {
					if (this.otaStates[mac]?.state === "success") {
						delete this.otaStates[mac];
						this._host.requestUpdate();
					}
				}, 5000);
				break;
```

Also add the same auto-dismiss in `checkOtaReconnect` when it transitions to success:
```typescript
			// After setting success state:
			setTimeout(() => {
				if (this.otaStates[mac]?.state === "success") {
					delete this.otaStates[mac];
					this._host.requestUpdate();
				}
			}, 5000);
```

- [ ] **Step 7: Run full frontend test suite**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-upgrade-spinner/frontend && npx vitest run`

Expected: All tests PASS.

- [ ] **Step 8: Build the frontend bundle**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-upgrade-spinner/frontend && npm run build`

Expected: Build completes without errors.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/eppgrid-panel.ts frontend/src/controllers/flasher-controller.ts custom_components/eppgrid/frontend/eppgrid-panel.js
git commit -m "feat: wire OTA progress into panel and build frontend

Panel passes otaStates to flasher view, handles update-firmware
and retry-ota events via FlasherController, auto-dismisses success."
```

---

### Task 9: Integration Test — Restart HA and Verify

- [ ] **Step 1: Restart Home Assistant**

Run: `ha-wt restart epp-upgrade-spinner`

- [ ] **Step 2: Manual verification**

Open the HA UI, navigate to the Flash tab, verify:
1. Devices with `firmware_behind` show the "Update" button
2. Clicking "Update" replaces the button with a spinning/progress indicator
3. Progress fills as the OTA proceeds
4. After reboot, a success checkmark appears and auto-dismisses
5. If an error occurs, the ✗ icon appears, clicking shows the error, Retry works

- [ ] **Step 3: Run all tests**

Run:
```bash
cd /Users/clintongormley/workspace/worktrees/epp-upgrade-spinner && python -m pytest tests/ -v --timeout=30
cd /Users/clintongormley/workspace/worktrees/epp-upgrade-spinner/frontend && npx vitest run
```

Expected: All tests PASS.
