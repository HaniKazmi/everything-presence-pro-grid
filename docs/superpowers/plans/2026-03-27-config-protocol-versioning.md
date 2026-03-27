# Config Protocol Versioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a config protocol version check between firmware and integration so incompatible devices show an upgrade banner instead of silently failing config pushes.

**Architecture:** Firmware publishes a numeric sensor `Config Protocol` on boot. The integration reads it during device discovery and compares to its own `CONFIG_PROTOCOL_VERSION` constant. Mismatched devices are blocked from configuration in both the backend (safety net) and frontend (banner + hidden config UI). A new websocket command triggers OTA for firmware-behind devices.

**Tech Stack:** ESPHome C++/Python component, Home Assistant Python integration, Lit/TypeScript frontend

---

### Task 1: Firmware — Add Config Protocol Sensor

**Files:**
- Modify: `firmware/components/epp/__init__.py`
- Modify: `firmware/components/epp/epp_component.h`
- Modify: `firmware/components/epp/epp_component.cpp`
- Modify: `firmware/common/everything-presence-pro-base.yaml`

This task adds a new ESPHome numeric sensor to the `epp` component that publishes the config protocol version (integer `1`) once during `setup()`.

- [ ] **Step 1: Add sensor import and schema to `__init__.py`**

In `firmware/components/epp/__init__.py`, add the `sensor` component import, update `AUTO_LOAD`, add the config constant, and extend the schema:

```python
# Add to imports (after line 8):
from esphome.components import sensor

# Change AUTO_LOAD (line 13) from:
AUTO_LOAD = ["binary_sensor", "text_sensor"]
# to:
AUTO_LOAD = ["binary_sensor", "sensor", "text_sensor"]

# Add after CONF_ZONE_STATE (line 23):
CONF_CONFIG_PROTOCOL = "config_protocol"

# Add to CONFIG_SCHEMA dict (after the CONF_ZONE_STATE entry, line 41):
        cv.Optional(CONF_CONFIG_PROTOCOL): sensor.sensor_schema(),
```

- [ ] **Step 2: Add code generation for the sensor in `to_code()`**

Append to the end of `to_code()` in `__init__.py` (after line 96):

```python
    # Config protocol numeric sensor
    if CONF_CONFIG_PROTOCOL in config:
        sens = await sensor.new_sensor(config[CONF_CONFIG_PROTOCOL])
        cg.add(var.set_config_protocol_sensor(sens))
```

- [ ] **Step 3: Add C++ sensor pointer and setter to `epp_component.h`**

Add the ESPHome sensor header include (after line 5):

```cpp
#include "esphome/components/sensor/sensor.h"
```

Add the setter method in the public section (after `set_zone_state_sensor` at line 60):

```cpp
  void set_config_protocol_sensor(esphome::sensor::Sensor *sensor) {
    config_protocol_sensor_ = sensor;
  }
```

Add the sensor pointer in the protected section (after `zone_state_sensor_` at line 107):

```cpp
  // Config protocol version sensor
  esphome::sensor::Sensor *config_protocol_sensor_{nullptr};
```

- [ ] **Step 4: Publish config protocol in `setup()` in `epp_component.cpp`**

Add after the firmware version publish block (after line 21):

```cpp
  // Publish config protocol version
  if (config_protocol_sensor_ != nullptr) {
    config_protocol_sensor_->publish_state(1.0f);
  }
```

- [ ] **Step 5: Add sensor to YAML config in `everything-presence-pro-base.yaml`**

Add after the `firmware_version` block (after line 35):

```yaml
  config_protocol:
    name: "Config Protocol"
    entity_category: diagnostic
    disabled_by_default: true
```

- [ ] **Step 6: Verify firmware compiles**

Run: `cd firmware && pio run -e wifi --target compiledb 2>&1 | tail -5` (or whichever build method is configured)

Expected: compilation succeeds

- [ ] **Step 7: Commit**

```bash
git add firmware/components/epp/__init__.py firmware/components/epp/epp_component.h firmware/components/epp/epp_component.cpp firmware/common/everything-presence-pro-base.yaml
git commit -m "feat(firmware): add config protocol version sensor"
```

---

### Task 2: Integration — Add Protocol Constant and ManagedDevice Field

**Files:**
- Modify: `custom_components/eppgrid/const.py`
- Modify: `custom_components/eppgrid/device_manager.py`
- Test: `tests/test_device_manager.py`

This task adds the `CONFIG_PROTOCOL_VERSION` constant and a `config_protocol` field to `ManagedDevice`, populated during discovery by reading the sensor's HA state.

- [ ] **Step 1: Write failing test for protocol version in device info**

In `tests/test_device_manager.py`, add a test that verifies `list_devices()` includes `config_protocol_status`. First, read the existing test file to understand the fixture patterns, then add:

```python
class TestProtocolVersion:
    """Tests for config protocol version detection."""

    async def test_list_devices_includes_protocol_status_compatible(
        self, hass, config_entry
    ):
        """list_devices includes config_protocol_status when versions match."""
        # Setup will need the real DeviceManager with mocked registries
        # containing a device that has a Config Protocol sensor state of "1.0"
        from custom_components.eppgrid.const import CONFIG_PROTOCOL_VERSION

        assert CONFIG_PROTOCOL_VERSION == 1  # Sanity check
```

Run: `cd /Users/clintongormley/workspace/worktrees/epp-integration-redesign && python -m pytest tests/test_device_manager.py::TestProtocolVersion -v`

Expected: FAIL — `CONFIG_PROTOCOL_VERSION` not defined

- [ ] **Step 2: Add constant to `const.py`**

Add to the end of `custom_components/eppgrid/const.py`:

```python
# Config protocol version — must match firmware's Config Protocol sensor value.
# Bump in lockstep with firmware when the config push interface changes.
CONFIG_PROTOCOL_VERSION = 1
```

- [ ] **Step 3: Run the test**

Run: `python -m pytest tests/test_device_manager.py::TestProtocolVersion -v`

Expected: PASS

- [ ] **Step 4: Add `config_protocol` field to `ManagedDevice`**

In `custom_components/eppgrid/device_manager.py`, modify the `ManagedDevice` dataclass (around line 168):

```python
@dataclass
class ManagedDevice:
    """Tracked ESPHome device with zone engine firmware."""

    mac: str
    name: str
    host: str | None = None
    esphome_config_entry_id: str | None = None
    device_id: str | None = None
    available: bool = False
    config_protocol: int = 0  # 0 = legacy/unknown firmware
```

- [ ] **Step 5: Read config protocol sensor state during discovery**

In `device_manager.py`, in the `async_discover` method, after creating the `ManagedDevice` (around line 239), read the sensor state. Add a helper method and update discovery:

Add this helper method to `DeviceManager` (before `async_discover`):

```python
    def _read_config_protocol(self, device_id: str) -> int:
        """Read the Config Protocol sensor value for a device, defaulting to 0."""
        ent_reg = er.async_get(self._hass)
        for entry in ent_reg.entities.values():
            if (
                entry.device_id == device_id
                and entry.platform == "esphome"
                and "config_protocol" in entry.unique_id
            ):
                state = self._hass.states.get(entry.entity_id)
                if state is not None and state.state not in (None, "unknown", "unavailable", ""):
                    try:
                        return int(float(state.state))
                    except (ValueError, TypeError):
                        pass
                return 0
        return 0
```

In `async_discover`, after building the `ManagedDevice` (line 233-239), add:

```python
            proto = self._read_config_protocol(device.id)
```

And update the ManagedDevice construction to include `config_protocol=proto`.

- [ ] **Step 6: Expose protocol status in `list_devices()`**

In the `list_devices` method (around line 361), add the protocol status to the returned dict. Import `CONFIG_PROTOCOL_VERSION` at the top of the file and add the status computation:

```python
from .const import CONFIG_PROTOCOL_VERSION
```

In `list_devices()`, add to each device dict:

```python
                    "config_protocol_status": (
                        "compatible" if dev.config_protocol == CONFIG_PROTOCOL_VERSION
                        else "firmware_behind" if dev.config_protocol < CONFIG_PROTOCOL_VERSION
                        else "firmware_ahead"
                    ),
```

- [ ] **Step 7: Commit**

```bash
git add custom_components/eppgrid/const.py custom_components/eppgrid/device_manager.py tests/test_device_manager.py
git commit -m "feat: add config protocol version detection to device manager"
```

---

### Task 3: Backend Safety Net — Block Config Commands on Mismatch

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py`
- Test: `tests/test_websocket_api.py`

All config-mutating websocket commands must check protocol compatibility before executing. On mismatch, return an error.

- [ ] **Step 1: Write failing test for protocol check on set_setup**

In `tests/test_websocket_api.py`, add a test class:

```python
class TestProtocolVersionGuard:
    """Config commands are blocked when protocol versions don't match."""

    async def test_set_setup_blocked_when_firmware_behind(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_setup returns error when firmware protocol is behind."""
        from custom_components.eppgrid.device_manager import ManagedDevice

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:FF": ManagedDevice(
                mac="AA:BB:CC:DD:EE:FF",
                name="EPP",
                host="192.168.1.50",
                config_protocol=0,  # behind
            )
        }

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        connection = MagicMock()
        msg = {
            "id": 10,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }

        await call_async_handler(hass, websocket_set_setup, connection, msg)

        connection.send_error.assert_called_once()
        args = connection.send_error.call_args[0]
        assert args[1] == "firmware_behind"
```

Run: `python -m pytest tests/test_websocket_api.py::TestProtocolVersionGuard -v`

Expected: FAIL — no protocol check exists yet

- [ ] **Step 2: Add protocol check helper to `websocket_api.py`**

Add a helper function after `_get_manager` (around line 49):

```python
def _check_protocol(manager: Any, mac: str) -> str | None:
    """Check config protocol compatibility. Returns error code or None if OK."""
    from .const import CONFIG_PROTOCOL_VERSION

    dev = manager.devices.get(mac)
    if dev is None:
        return None  # Unknown device — let the command handle it
    if dev.config_protocol < CONFIG_PROTOCOL_VERSION:
        return "firmware_behind"
    if dev.config_protocol > CONFIG_PROTOCOL_VERSION:
        return "firmware_ahead"
    return None
```

- [ ] **Step 3: Add protocol check to `websocket_set_setup`**

In the `websocket_set_setup` handler, add the check after the `manager is None` check (around line 116):

```python
    proto_err = _check_protocol(manager, msg["mac"])
    if proto_err:
        connection.send_error(
            msg["id"],
            proto_err,
            "Firmware update required" if proto_err == "firmware_behind"
            else "Integration update required",
        )
        return
```

- [ ] **Step 4: Run the test**

Run: `python -m pytest tests/test_websocket_api.py::TestProtocolVersionGuard -v`

Expected: PASS

- [ ] **Step 5: Add protocol check to all remaining config commands**

Add the same `_check_protocol` guard to each of these handlers, right after the `manager is None` check:
- `websocket_set_room_layout`
- `websocket_set_entity_enabled`
- `websocket_set_env_calibration`
- `websocket_set_motion_timeout`
- `websocket_set_tracking`
- `websocket_set_static_presence`
- `websocket_set_pipeline`

The pattern is identical for each:

```python
    proto_err = _check_protocol(manager, msg["mac"])
    if proto_err:
        connection.send_error(
            msg["id"],
            proto_err,
            "Firmware update required" if proto_err == "firmware_behind"
            else "Integration update required",
        )
        return
```

- [ ] **Step 6: Write test for firmware_ahead case**

```python
    async def test_set_setup_blocked_when_firmware_ahead(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_setup returns error when firmware protocol is ahead."""
        from custom_components.eppgrid.device_manager import ManagedDevice

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:FF": ManagedDevice(
                mac="AA:BB:CC:DD:EE:FF",
                name="EPP",
                host="192.168.1.50",
                config_protocol=99,  # ahead
            )
        }

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        connection = MagicMock()
        msg = {
            "id": 11,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }

        await call_async_handler(hass, websocket_set_setup, connection, msg)

        connection.send_error.assert_called_once()
        args = connection.send_error.call_args[0]
        assert args[1] == "firmware_ahead"

    async def test_set_setup_allowed_when_compatible(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_setup proceeds normally when protocol versions match."""
        from custom_components.eppgrid.const import CONFIG_PROTOCOL_VERSION
        from custom_components.eppgrid.device_manager import ManagedDevice

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:FF": ManagedDevice(
                mac="AA:BB:CC:DD:EE:FF",
                name="EPP",
                host="192.168.1.50",
                config_protocol=CONFIG_PROTOCOL_VERSION,
            )
        }

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        connection = MagicMock()
        msg = {
            "id": 12,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }

        await call_async_handler(hass, websocket_set_setup, connection, msg)

        # Should not send error — proceeds to save config
        connection.send_error.assert_not_called()
        connection.send_result.assert_called_once()
```

- [ ] **Step 7: Run all tests**

Run: `python -m pytest tests/test_websocket_api.py -v`

Expected: all pass

- [ ] **Step 8: Commit**

```bash
git add custom_components/eppgrid/websocket_api.py tests/test_websocket_api.py
git commit -m "feat: add protocol version guard to config websocket commands"
```

---

### Task 4: Firmware Update WebSocket Command

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py`
- Modify: `custom_components/eppgrid/device_manager.py`
- Test: `tests/test_websocket_api.py`

New `eppgrid/update_firmware` command that triggers OTA on a device by calling `update.install` on its ESPHome update entity.

- [ ] **Step 1: Write failing test for update_firmware command**

In `tests/test_websocket_api.py`:

```python
class TestUpdateFirmware:
    """Tests for eppgrid/update_firmware."""

    async def test_update_firmware_calls_install(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """update_firmware triggers OTA via hass.services.async_call."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:FF": MagicMock(device_id="device_123")
        }

        from custom_components.eppgrid.websocket_api import websocket_update_firmware

        connection = MagicMock()
        msg = {"id": 20, "type": "eppgrid/update_firmware", "mac": "AA:BB:CC:DD:EE:FF"}

        with patch.object(hass.services, "async_call", new_callable=AsyncMock) as mock_call:
            await call_async_handler(hass, websocket_update_firmware, connection, msg)

        connection.send_result.assert_called_once()
```

Run: `python -m pytest tests/test_websocket_api.py::TestUpdateFirmware -v`

Expected: FAIL — `websocket_update_firmware` doesn't exist

- [ ] **Step 2: Add the `update_firmware` websocket command**

Register the command in `async_register_websocket_commands` (after line 43):

```python
    websocket_api.async_register_command(hass, websocket_update_firmware)
```

Add the handler:

```python
# -- update_firmware (trigger OTA) --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/update_firmware",
        vol.Required("mac"): str,
    }
)
@websocket_api.async_response
async def websocket_update_firmware(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Trigger firmware OTA update for a device."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return

    mac = msg["mac"]
    dev = manager.devices.get(mac)
    if dev is None or dev.device_id is None:
        connection.send_error(msg["id"], "not_found", "Device not found")
        return

    # Find the update entity for this device
    ent_reg = er.async_get(hass)
    update_entity_id = None
    for entry in ent_reg.entities.values():
        if (
            entry.device_id == dev.device_id
            and entry.platform == "esphome"
            and entry.domain == "update"
        ):
            update_entity_id = entry.entity_id
            break

    if update_entity_id is None:
        connection.send_error(msg["id"], "no_update_entity", "No update entity found for device")
        return

    try:
        await hass.services.async_call(
            "update",
            "install",
            {"entity_id": update_entity_id},
            blocking=False,
        )
        connection.send_result(msg["id"])
    except Exception as err:
        connection.send_error(msg["id"], "update_failed", str(err))
```

- [ ] **Step 3: Run the test**

Run: `python -m pytest tests/test_websocket_api.py::TestUpdateFirmware -v`

Expected: PASS (may need to adjust mock setup for entity registry)

- [ ] **Step 4: Run all tests**

Run: `python -m pytest tests/ -v`

Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add custom_components/eppgrid/websocket_api.py tests/test_websocket_api.py
git commit -m "feat: add update_firmware websocket command for OTA from panel"
```

---

### Task 5: Frontend — Add Protocol Status to DeviceInfo and Show Banner

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/eppgrid-panel.ts`
- Test: `frontend/src/__tests__/panel-render.test.ts`

This task adds the `config_protocol_status` field to the frontend `DeviceInfo` type and renders an upgrade banner when devices are incompatible.

- [ ] **Step 1: Add `config_protocol_status` to `DeviceInfo` type**

In `frontend/src/types.ts`, update the `DeviceInfo` interface:

```typescript
export interface DeviceInfo {
	mac: string;
	name: string;
	host: string | null;
	available: boolean;
	configured: boolean;
	config_protocol_status: "compatible" | "firmware_behind" | "firmware_ahead";
}
```

- [ ] **Step 2: Add upgrade banner rendering in `eppgrid-panel.ts`**

Add a private method that renders the banner based on the selected device's protocol status. Add this method after `_renderHeader()` (around line 996):

```typescript
	private _renderProtocolBanner() {
		const dev = this._devices.find((d) => d.mac === this._selectedMac);
		if (!dev || dev.config_protocol_status === "compatible") return nothing;

		if (dev.config_protocol_status === "firmware_behind") {
			return html`
				<div class="protocol-banner protocol-banner-warning">
					<ha-icon icon="mdi:alert-circle-outline"></ha-icon>
					<span>${this._localize("protocol.firmware_behind")}</span>
					<button class="wizard-btn wizard-btn-primary"
						@click=${() => this._updateFirmware()}
					>${this._localize("protocol.update_firmware")}</button>
				</div>
			`;
		}

		return html`
			<div class="protocol-banner protocol-banner-info">
				<ha-icon icon="mdi:information-outline"></ha-icon>
				<span>${this._localize("protocol.firmware_ahead")}</span>
			</div>
		`;
	}
```

- [ ] **Step 3: Add the `_updateFirmware` method**

```typescript
	private async _updateFirmware(): Promise<void> {
		if (!this._selectedMac || !this.hass) return;
		try {
			await this.hass.callWS({
				type: "eppgrid/update_firmware",
				mac: this._selectedMac,
			});
		} catch (err) {
			// eslint-disable-next-line no-console
			console.error("Firmware update failed:", err);
		}
	}
```

- [ ] **Step 4: Insert the banner in the render flow**

In the `render()` method (around line 877), add the banner after the main content. Modify the return to include it:

```typescript
	render() {
		if (this._loading) {
			return html`<div class="loading-container">${this._localize("common.loading")}</div>`;
		}

		if (!this._devices.length) {
			return html`<div class="loading-container">${this._localize("common.loading")}</div>`;
		}

		if (this._setupStep !== null) {
			// ... wizard rendering unchanged ...
		}

		const content =
			this._view === "settings"
				? this._renderSettings()
				: this._view === "editor" && this._perspective
					? this._renderEditor()
					: this._renderLiveOverview();

		return html`${this._renderProtocolBanner()}${content}${this._renderGlobalDialogs()}`;
	}
```

- [ ] **Step 5: Block config views when protocol mismatches**

Guard the editor and settings views. Modify the content selection in `render()`:

```typescript
		const dev = this._devices.find((d) => d.mac === this._selectedMac);
		const protocolOk = !dev || dev.config_protocol_status === "compatible";

		const content =
			this._view === "settings" && protocolOk
				? this._renderSettings()
				: this._view === "editor" && this._perspective && protocolOk
					? this._renderEditor()
					: this._renderLiveOverview();
```

- [ ] **Step 6: Add banner CSS to styles**

In `frontend/src/styles.ts`, add styles for the banner:

```typescript
/* Protocol version banner */
.protocol-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin: 0 16px 8px;
  border-radius: 8px;
  font-size: 14px;
}
.protocol-banner-warning {
  background: var(--warning-color, #ff9800);
  color: white;
}
.protocol-banner-info {
  background: var(--info-color, #2196f3);
  color: white;
}
.protocol-banner ha-icon {
  --mdc-icon-size: 24px;
  flex-shrink: 0;
}
.protocol-banner span {
  flex: 1;
}
.protocol-banner button {
  flex-shrink: 0;
}
```

- [ ] **Step 7: Add localization strings**

In the localization file (check `frontend/src/localize.ts` or similar), add:

```
"protocol.firmware_behind": "This sensor's firmware needs to be updated to work with this version of the integration."
"protocol.firmware_ahead": "This sensor's firmware is newer than the integration. Update the EPP Grid integration to the latest version."
"protocol.update_firmware": "Update Firmware"
```

- [ ] **Step 8: Build frontend**

Run: `cd frontend && npm run build`

Expected: build succeeds

- [ ] **Step 9: Commit**

```bash
git add frontend/src/types.ts frontend/src/eppgrid-panel.ts frontend/src/styles.ts
git commit -m "feat(frontend): show protocol version mismatch banner with OTA trigger"
```

---

### Task 6: Integration Tests and Cleanup

**Files:**
- Modify: `tests/test_device_manager.py`
- Modify: `tests/test_websocket_api.py`

Ensure all test paths are covered and run the full suite.

- [ ] **Step 1: Add device manager protocol detection tests**

In `tests/test_device_manager.py`, add tests for the `_read_config_protocol` method and the protocol status in `list_devices()`. Test three cases:
1. Device with Config Protocol sensor state `"1.0"` → `config_protocol=1`
2. Device with no Config Protocol sensor → `config_protocol=0`
3. Device with Config Protocol sensor in `"unavailable"` state → `config_protocol=0`

- [ ] **Step 2: Run the full test suite**

Run: `python -m pytest tests/ -v --tb=short`

Expected: all tests pass

- [ ] **Step 3: Run frontend build and lint**

Run: `cd frontend && npm run build && npx biome lint src/`

Expected: build and lint pass

- [ ] **Step 4: Run ruff format on Python**

Run: `ruff format custom_components/ tests/`

Expected: no changes needed (or auto-formatted)

- [ ] **Step 5: Commit any remaining changes**

```bash
git add -A
git commit -m "test: add protocol version detection and guard tests"
```

---

### Task 7: Documentation Update

**Files:**
- Modify: `docs/backend-data-catalog.md`

- [ ] **Step 1: Update backend data catalog**

Add the new `Config Protocol` sensor and `eppgrid/update_firmware` command to the data catalog. Document:
- The numeric sensor `Config Protocol` (published once on boot, integer value)
- The `config_protocol_status` field in `list_devices` response
- The `eppgrid/update_firmware` websocket command
- The protocol version guard on config commands

- [ ] **Step 2: Commit**

```bash
git add docs/backend-data-catalog.md
git commit -m "docs: add config protocol versioning to data catalog"
```
