# LED Settings Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring LED mode, brightness, presence color, and SEN0609 LED toggle into the EPP Grid settings pipeline, replacing firmware-side entities with integration-managed settings.

**Architecture:** Frontend adds an LED accordion to the settings view. Save payload flows through `eppgrid/set_settings` WebSocket command. Backend persists LED keys alongside existing settings, pushes RGB LED config via new `epp_set_led` firmware action, and passes SEN0609 LED toggle through existing `epp_set_static_presence`. Firmware adds globals for presence color, implements CO2 environmental thresholds, and exposes a new API action.

**Tech Stack:** Python (HA integration), TypeScript/Lit (frontend), ESPHome YAML (firmware), Vitest (frontend tests), pytest (backend tests)

---

### Task 1: Backend — Add LED settings to WebSocket schema and persistence

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py:739-775`
- Test: `tests/test_websocket_api.py`

This task adds 4 new LED keys to `_SETTINGS_KEYS` and the `set_settings` WebSocket command schema so they are persisted alongside existing settings.

- [ ] **Step 1: Write failing test — LED keys persisted by set_settings**

Add this test to the `TestSetSettings` class in `tests/test_websocket_api.py`, after the existing `test_set_settings_stores_all_values` test:

```python
    async def test_set_settings_stores_led_values(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_settings stores LED settings under device_config['settings']."""
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
            "led_mode": "Presence",
            "led_brightness": 0.8,
            "led_presence_color": "#00FF00",
            "static_led_enabled": False,
        }

        await call_async_handler(hass, websocket_set_settings, connection, msg)

        settings = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert settings["led_mode"] == "Presence"
        assert settings["led_brightness"] == 0.8
        assert settings["led_presence_color"] == "#00FF00"
        assert settings["static_led_enabled"] is False
        connection.send_result.assert_called_once_with(12)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-leds && python -m pytest tests/test_websocket_api.py::TestSetSettings::test_set_settings_stores_led_values -xvs 2>&1 | tail -20`

Expected: FAIL — voluptuous validation error because `led_mode` etc. are not in the schema.

- [ ] **Step 3: Implement — add LED keys to schema**

In `custom_components/eppgrid/websocket_api.py`, add the 4 LED keys to `_SETTINGS_KEYS`:

```python
_SETTINGS_KEYS = (
    "temperature_offset",
    "humidity_offset",
    "illuminance_offset",
    "motion_timeout",
    "target_auto_distance",
    "target_max_distance",
    "static_auto_distance",
    "static_min_distance",
    "static_max_distance",
    "static_trigger_threshold",
    "static_renew_threshold",
    "static_timeout",
    "static_on_delay",
    "led_mode",
    "led_brightness",
    "led_presence_color",
    "static_led_enabled",
)
```

And add these 4 lines to the `@websocket_api.websocket_command` schema dict, after the `static_on_delay` line:

```python
        vol.Required("led_mode"): vol.In(["Manual Control", "Presence", "Environmental", "Environmental + Presence"]),
        vol.Required("led_brightness"): vol.All(vol.Coerce(float), vol.Range(min=0.1, max=1.0)),
        vol.Required("led_presence_color"): vol.Match(r"^#[0-9A-Fa-f]{6}$"),
        vol.Required("static_led_enabled"): bool,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-leds && python -m pytest tests/test_websocket_api.py::TestSetSettings::test_set_settings_stores_led_values -xvs 2>&1 | tail -20`

Expected: PASS

- [ ] **Step 5: Update the existing test_set_settings_stores_all_values test**

The existing test sends a message without the new required LED fields, so it will now fail schema validation. Add the 4 LED fields to the existing test's `msg` dict:

```python
            "static_on_delay": 0.0,
            "led_mode": "Manual Control",
            "led_brightness": 1.0,
            "led_presence_color": "#CC33FF",
            "static_led_enabled": True,
```

Also add assertions for the LED fields at the end of the test:

```python
        assert settings["led_mode"] == "Manual Control"
        assert settings["led_brightness"] == 1.0
        assert settings["led_presence_color"] == "#CC33FF"
        assert settings["static_led_enabled"] is True
```

Do the same for ALL other tests in `TestSetSettings` that send a `set_settings` message — they all need the 4 LED fields in their `msg` dict to pass schema validation. Add them with default values:

```python
            "led_mode": "Manual Control",
            "led_brightness": 1.0,
            "led_presence_color": "#CC33FF",
            "static_led_enabled": True,
```

- [ ] **Step 6: Run full test suite to verify nothing is broken**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-leds && python -m pytest tests/test_websocket_api.py -xvs 2>&1 | tail -30`

Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add tests/test_websocket_api.py custom_components/eppgrid/websocket_api.py
git commit -m "feat: add LED settings to WebSocket schema and persistence"
```

---

### Task 2: Backend — Push LED settings to firmware

**Files:**
- Modify: `custom_components/eppgrid/device_manager.py:177-285`
- Test: `tests/test_device_manager.py`

This task adds the `epp_set_led` firmware push and makes `led_enabled` dynamic on `epp_set_static_presence`.

- [ ] **Step 1: Write failing test — push_config sends epp_set_led**

Add this test to the `TestPushConfig` class (the one at line ~823) in `tests/test_device_manager.py`:

```python
    async def test_push_config_led_settings(self) -> None:
        """push_config sends LED mode, brightness, and presence color via epp_set_led."""
        conn = DeviceConnection("192.168.1.100")

        mock_env = MagicMock()
        mock_env.name = "epp_set_env_calibration"
        mock_motion = MagicMock()
        mock_motion.name = "epp_set_motion_timeout"
        mock_tracking = MagicMock()
        mock_tracking.name = "epp_set_tracking"
        mock_static = MagicMock()
        mock_static.name = "epp_set_static_presence"
        mock_led = MagicMock()
        mock_led.name = "epp_set_led"

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(
                return_value=([], [mock_env, mock_motion, mock_tracking, mock_static, mock_led])
            )
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "settings": {
                        "temperature_offset": 0.0,
                        "humidity_offset": 0.0,
                        "illuminance_offset": 0.0,
                        "motion_timeout": 5.0,
                        "target_max_distance": 6.0,
                        "static_min_distance": 0.3,
                        "static_max_distance": 16.0,
                        "static_trigger_threshold": 3,
                        "static_renew_threshold": 3,
                        "static_timeout": 30.0,
                        "static_on_delay": 0.0,
                        "led_mode": "Presence",
                        "led_brightness": 0.8,
                        "led_presence_color": "#66CC00",
                        "static_led_enabled": False,
                    },
                }
            )

            calls = mock_client.execute_service.call_args_list
            call_by_service = {call[0][0].name: call[0][1] for call in calls}

            # epp_set_led should be called with parsed color
            assert "epp_set_led" in call_by_service
            led_data = call_by_service["epp_set_led"]
            assert led_data["mode"] == "Presence"
            assert led_data["brightness"] == 0.8
            assert abs(led_data["presence_red"] - 0.4) < 0.01    # 0x66/0xFF ≈ 0.4
            assert abs(led_data["presence_green"] - 0.8) < 0.01  # 0xCC/0xFF ≈ 0.8
            assert abs(led_data["presence_blue"] - 0.0) < 0.01   # 0x00/0xFF = 0.0

            # static_led_enabled should be False
            static_data = call_by_service["epp_set_static_presence"]
            assert static_data["led_enabled"] is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-leds && python -m pytest tests/test_device_manager.py::TestPushConfig::test_push_config_led_settings -xvs 2>&1 | tail -20`

Expected: FAIL — `epp_set_led` not in `call_by_service` (no push code exists).

- [ ] **Step 3: Implement — add LED push to async_push_config**

In `custom_components/eppgrid/device_manager.py`, inside `async_push_config`, after the static presence push block (after `_LOGGER.info("Pushed static_presence to %s", self._host)`), add:

```python
            svc = self._services.get("epp_set_led")
            if svc:
                color_hex = settings.get("led_presence_color", "#CC33FF")
                await self._client.execute_service(
                    svc,
                    {
                        "mode": settings.get("led_mode", "Manual Control"),
                        "brightness": settings.get("led_brightness", 1.0),
                        "presence_red": int(color_hex[1:3], 16) / 255.0,
                        "presence_green": int(color_hex[3:5], 16) / 255.0,
                        "presence_blue": int(color_hex[5:7], 16) / 255.0,
                    },
                )
                _LOGGER.info("Pushed led to %s", self._host)
```

Also change BOTH places where `"led_enabled": True` is hardcoded (lines 173 and 282) to:

```python
                    "led_enabled": settings.get("static_led_enabled", True),
```

For the `async_push_distance_override` method (line 173), there's no `settings` variable — it uses `override`. Change it to:

```python
                    "led_enabled": override.get("static_led_enabled", True),
```

For the `async_push_config` method (line 282), change to:

```python
                    "led_enabled": settings.get("static_led_enabled", True),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-leds && python -m pytest tests/test_device_manager.py::TestPushConfig::test_push_config_led_settings -xvs 2>&1 | tail -20`

Expected: PASS

- [ ] **Step 5: Write failing test — push_config defaults when LED keys are absent**

Add this test to the `TestPushConfig` class:

```python
    async def test_push_config_led_defaults_when_absent(self) -> None:
        """push_config uses LED defaults when settings lack LED keys."""
        conn = DeviceConnection("192.168.1.100")

        mock_static = MagicMock()
        mock_static.name = "epp_set_static_presence"
        mock_led = MagicMock()
        mock_led.name = "epp_set_led"

        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(
                return_value=([], [mock_static, mock_led])
            )
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config({"settings": {}})

            calls = mock_client.execute_service.call_args_list
            call_by_service = {call[0][0].name: call[0][1] for call in calls}

            led_data = call_by_service["epp_set_led"]
            assert led_data["mode"] == "Manual Control"
            assert led_data["brightness"] == 1.0
            # Default color #CC33FF → red≈0.8, green≈0.2, blue=1.0
            assert abs(led_data["presence_red"] - 0.8) < 0.01
            assert abs(led_data["presence_green"] - 0.2) < 0.01
            assert abs(led_data["presence_blue"] - 1.0) < 0.01

            static_data = call_by_service["epp_set_static_presence"]
            assert static_data["led_enabled"] is True
```

- [ ] **Step 6: Run test to verify it passes (should already pass with defaults)**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-leds && python -m pytest tests/test_device_manager.py::TestPushConfig::test_push_config_led_defaults_when_absent -xvs 2>&1 | tail -20`

Expected: PASS (defaults already handle this)

- [ ] **Step 7: Run full device_manager tests**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-leds && python -m pytest tests/test_device_manager.py -xvs 2>&1 | tail -30`

Expected: ALL PASS. The existing `test_push_config_settings` test already checks `led_enabled is True` which should still pass since the default is `True`.

- [ ] **Step 8: Commit**

```bash
git add tests/test_device_manager.py custom_components/eppgrid/device_manager.py
git commit -m "feat: push LED settings to firmware via epp_set_led action"
```

---

### Task 3: Frontend — Add LED fields to config serialization

**Files:**
- Modify: `frontend/src/lib/config-serialization.ts:33-198`
- Test: `frontend/src/lib/__tests__/config-serialization.test.ts`

This task adds LED fields to `ParsedSettings` interface and `parseSettings()` function.

- [ ] **Step 1: Write failing test — parseSettings returns LED defaults**

Add this test to `frontend/src/lib/__tests__/config-serialization.test.ts`, inside the `parseSettings` describe block:

```typescript
	it("returns LED defaults when not present", () => {
		const result = parseSettings({});
		expect(result.ledMode).toBe("Manual Control");
		expect(result.ledBrightness).toBe(1.0);
		expect(result.ledPresenceColor).toBe("#CC33FF");
		expect(result.staticLedEnabled).toBe(true);
	});

	it("parses LED settings from raw", () => {
		const result = parseSettings({
			led_mode: "Presence",
			led_brightness: 0.8,
			led_presence_color: "#00FF00",
			static_led_enabled: false,
		});
		expect(result.ledMode).toBe("Presence");
		expect(result.ledBrightness).toBe(0.8);
		expect(result.ledPresenceColor).toBe("#00FF00");
		expect(result.staticLedEnabled).toBe(false);
	});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-leds/frontend && npx vitest run src/lib/__tests__/config-serialization.test.ts -t "returns LED defaults" 2>&1 | tail -20`

Expected: FAIL — `ledMode` property doesn't exist on `ParsedSettings`.

- [ ] **Step 3: Implement — add LED fields**

In `frontend/src/lib/config-serialization.ts`:

Add to the `ParsedSettings` interface (after `logLevels`):

```typescript
	ledMode: string;
	ledBrightness: number;
	ledPresenceColor: string;
	staticLedEnabled: boolean;
```

Add to the return object of `parseSettings()` (after `logLevels`):

```typescript
		ledMode: s.led_mode ?? "Manual Control",
		ledBrightness: s.led_brightness ?? 1.0,
		ledPresenceColor: s.led_presence_color ?? "#CC33FF",
		staticLedEnabled: s.static_led_enabled ?? true,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-leds/frontend && npx vitest run src/lib/__tests__/config-serialization.test.ts 2>&1 | tail -20`

Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/config-serialization.ts frontend/src/lib/__tests__/config-serialization.test.ts
git commit -m "feat: add LED fields to config serialization"
```

---

### Task 4: Frontend — Add LED accordion section to settings view

**Files:**
- Modify: `frontend/src/components/epp-settings-view.ts`
- Modify: `frontend/src/translations/en.json`
- Test: `frontend/src/__tests__/components/epp-settings-view.test.ts`

This task adds the LED accordion section with mode selector, brightness slider, color picker, and SEN0609 toggle.

- [ ] **Step 1: Write failing tests**

Add these tests to `frontend/src/__tests__/components/epp-settings-view.test.ts`:

```typescript
describe("LED settings section", () => {
	it("renders LED accordion", () => {
		const sv = createView({ openAccordions: new Set(["led"]) });
		const tpl = sv.render();
		const c = renderTo(tpl);

		const body = c.querySelector(".accordion-body");
		expect(body).not.toBeNull();
		expect(body!.querySelector(".setting-group")).not.toBeNull();
		document.body.removeChild(c);
	});

	it("renders 5 accordions including LED", () => {
		const sv = createView();
		const tpl = sv.render();
		const c = renderTo(tpl);

		expect(c.querySelectorAll(".accordion").length).toBe(5);
		document.body.removeChild(c);
	});

	it("renders brightness slider in LED section", () => {
		const sv = createView({ openAccordions: new Set(["led"]) });
		const tpl = sv.render();
		const c = renderTo(tpl);

		const slider = c.querySelector('input[type="range"][data-led-brightness]') as HTMLInputElement;
		expect(slider).not.toBeNull();
		expect(slider.min).toBe("0.1");
		expect(slider.max).toBe("1");
		expect(slider.step).toBe("0.05");
		document.body.removeChild(c);
	});

	it("renders color picker in LED section", () => {
		const sv = createView({ openAccordions: new Set(["led"]), ledMode: "Presence" });
		const tpl = sv.render();
		const c = renderTo(tpl);

		const picker = c.querySelector('input[type="color"]') as HTMLInputElement;
		expect(picker).not.toBeNull();
		expect(picker.value).toBe("#cc33ff");
		document.body.removeChild(c);
	});

	it("renders SEN0609 LED toggle", () => {
		const sv = createView({ openAccordions: new Set(["led"]) });
		const tpl = sv.render();
		const c = renderTo(tpl);

		const toggle = c.querySelector('input[data-led-static]') as HTMLInputElement;
		expect(toggle).not.toBeNull();
		expect(toggle.type).toBe("checkbox");
		expect(toggle.checked).toBe(true);
		document.body.removeChild(c);
	});

	it("hides environmental modes when co2 disabled", () => {
		const sv = createView({ openAccordions: new Set(["led"]), co2Enabled: false });
		const tpl = sv.render();
		const c = renderTo(tpl);

		const options = c.querySelectorAll(".led-mode-option");
		const texts = Array.from(options).map((o) => o.textContent?.trim());
		expect(texts).not.toContain("Environmental");
		expect(texts).not.toContain("Environmental + Presence");
		document.body.removeChild(c);
	});

	it("shows environmental modes when co2 enabled", () => {
		const sv = createView({ openAccordions: new Set(["led"]), co2Enabled: true });
		const tpl = sv.render();
		const c = renderTo(tpl);

		const options = c.querySelectorAll(".led-mode-option");
		const texts = Array.from(options).map((o) => o.textContent?.trim());
		expect(texts).toContain("Environmental");
		expect(texts).toContain("Environmental + Presence");
		document.body.removeChild(c);
	});

	it("hides color picker when mode is not Presence", () => {
		const sv = createView({ openAccordions: new Set(["led"]), ledMode: "Manual Control" });
		const tpl = sv.render();
		const c = renderTo(tpl);

		const picker = c.querySelector('input[type="color"]');
		expect(picker).toBeNull();
		document.body.removeChild(c);
	});
});

describe("LED save payload", () => {
	it("includes LED settings in save event", () => {
		const sv = createView({
			dirty: true,
			ledMode: "Presence",
			ledBrightness: 0.7,
			ledPresenceColor: "#00FF00",
			staticLedEnabled: false,
		});

		let payload: any = null;
		sv.addEventListener("save", ((e: CustomEvent) => {
			payload = e.detail;
		}) as EventListener);

		(sv as any)._emitSave();

		expect(payload.led_mode).toBe("Presence");
		expect(payload.led_brightness).toBe(0.7);
		expect(payload.led_presence_color).toBe("#00FF00");
		expect(payload.static_led_enabled).toBe(false);
	});

	it("uses LED defaults when not overridden", () => {
		const sv = createView({ dirty: true });

		let payload: any = null;
		sv.addEventListener("save", ((e: CustomEvent) => {
			payload = e.detail;
		}) as EventListener);

		(sv as any)._emitSave();

		expect(payload.led_mode).toBe("Manual Control");
		expect(payload.led_brightness).toBe(1.0);
		expect(payload.led_presence_color).toBe("#CC33FF");
		expect(payload.static_led_enabled).toBe(true);
	});
});
```

Also update the `createView` helper to include the new LED defaults:

```typescript
	el.ledMode = "Manual Control";
	el.ledBrightness = 1.0;
	el.ledPresenceColor = "#CC33FF";
	el.staticLedEnabled = true;
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-leds/frontend && npx vitest run src/__tests__/components/epp-settings-view.test.ts -t "LED" 2>&1 | tail -20`

Expected: FAIL — properties and render methods don't exist.

- [ ] **Step 3: Add translations**

Add to `frontend/src/translations/en.json` in the `"settings"` section:

```json
		"led": "LED",
		"led_mode": "Mode",
		"led_brightness": "Brightness",
		"led_presence_color": "Presence color",
		"static_led": "Static sensor LED",
		"manual_control": "Manual Control",
		"presence": "Presence",
		"environmental": "Environmental",
		"environmental_presence": "Environmental + Presence"
```

Add to the `"info"` section:

```json
		"led_mode": "Controls the RGB LED behavior. Manual Control disables automatic LED and lets you control it as a standard HA light entity.",
		"led_brightness": "Brightness multiplier for the RGB LED in automatic modes.",
		"led_presence_color": "Color used for presence indication when LED is in Presence or Environmental + Presence mode.",
		"static_led": "Enable or disable the static presence sensor's built-in indicator LED. This LED blinks when static presence is detected.",
		"led_section": "Controls the device's RGB status LED and the static presence sensor's indicator LED."
```

- [ ] **Step 4: Implement — add LED properties and accordion section**

Add these properties to `EppSettingsView` class (after the `co2Enabled` property):

```typescript
	@property({ type: String }) ledMode = "Manual Control";
	@property({ type: Number }) ledBrightness = 1.0;
	@property({ type: String }) ledPresenceColor = "#CC33FF";
	@property({ type: Boolean }) staticLedEnabled = true;
```

Add the LED section to the `sections` array in `render()`:

```typescript
			{
				id: "led",
				label: "settings.led",
				icon: "mdi:led-variant-on",
			},
```

Add the case to `renderSettingsSection()`:

```typescript
			case "led":
				return this.renderLed();
```

Add the `renderLed()` method to the class:

```typescript
	renderLed() {
		const mode = this._overrides.ledMode ?? this.ledMode;
		const showPresenceColor = mode === "Presence" || mode === "Environmental + Presence";
		const modes = [
			{ value: "Manual Control", label: this.localize("settings.manual_control") },
			{ value: "Presence", label: this.localize("settings.presence") },
		];
		if (this.co2Enabled) {
			modes.push(
				{ value: "Environmental", label: this.localize("settings.environmental") },
				{ value: "Environmental + Presence", label: this.localize("settings.environmental_presence") },
			);
		}
		const brightness = this._overrides.ledBrightness ?? this.ledBrightness;
		const color = this._overrides.ledPresenceColor ?? this.ledPresenceColor;
		const staticLed = this._overrides.staticLedEnabled ?? this.staticLedEnabled;

		return html`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("settings.led")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.led_mode")}</label>
            <ha-select .value=${mode} @selected=${(e: Event) => {
							const val = (e.target as any).value;
							if (val) {
								this._overrides.ledMode = val;
								this._fireDirty();
								this.requestUpdate();
							}
						}} @closed=${(e: Event) => e.stopPropagation()}>
              ${modes.map((m) => html`<mwc-list-item class="led-mode-option" .value=${m.value}>${m.label}</mwc-list-item>`)}
            </ha-select>
            ${this.infoTip(this.localize("info.led_mode"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.led_brightness")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" data-led-brightness min="0.1" max="1" step="0.05" .value=${String(brightness)} @input=${(e: Event) => {
							const el = e.target as HTMLInputElement;
							this._overrides.ledBrightness = parseFloat(el.value);
							this._setText(el.nextElementSibling!, Math.round(parseFloat(el.value) * 100) + "%");
							this._fireDirty();
						}} /><span class="setting-value">${Math.round(brightness * 100)}%</span></span>
            ${this.resetBtn(1.0, "ledBrightness")}${this.infoTip(this.localize("info.led_brightness"))}
          </div>
          ${showPresenceColor ? html`
          <div class="setting-row">
            <label>${this.localize("settings.led_presence_color")}</label>
            <input type="color" .value=${color} @input=${(e: Event) => {
							this._overrides.ledPresenceColor = (e.target as HTMLInputElement).value;
							this._fireDirty();
						}} />
            ${this.infoTip(this.localize("info.led_presence_color"))}
          </div>` : nothing}
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.static_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.static_led")}</label>
            <label class="toggle-switch"><input type="checkbox" data-led-static .checked=${staticLed} @change=${(e: Event) => {
							this._overrides.staticLedEnabled = (e.target as HTMLInputElement).checked;
							this._fireDirty();
						}} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.static_led"))}
          </div>
        </div>
      </div>
    `;
	}
```

Add LED fields to `_emitSave()`, inside the detail object (after `log_levels`):

```typescript
					led_mode: o.ledMode ?? this.ledMode,
					led_brightness: o.ledBrightness ?? this.ledBrightness,
					led_presence_color: o.ledPresenceColor ?? this.ledPresenceColor,
					static_led_enabled: o.staticLedEnabled ?? this.staticLedEnabled,
```

- [ ] **Step 5: Run LED tests to verify they pass**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-leds/frontend && npx vitest run src/__tests__/components/epp-settings-view.test.ts -t "LED" 2>&1 | tail -30`

Expected: ALL PASS

- [ ] **Step 6: Update existing accordion count test**

The test `"renders settings container with accordions"` expects 4 accordions — update to expect 5.

- [ ] **Step 7: Run full settings view tests**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-leds/frontend && npx vitest run src/__tests__/components/epp-settings-view.test.ts 2>&1 | tail -30`

Expected: ALL PASS

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/epp-settings-view.ts frontend/src/translations/en.json frontend/src/__tests__/components/epp-settings-view.test.ts
git commit -m "feat: add LED accordion section to settings view"
```

---

### Task 5: Frontend — Wire LED properties in panel and grid controller

**Files:**
- Modify: `frontend/src/eppgrid-panel.ts`
- Modify: `frontend/src/controllers/grid-state-controller.ts:553-594`
- Test: `frontend/src/__tests__/panel-settings.test.ts` or `frontend/src/__tests__/panel-config.test.ts`

This task wires the LED properties from config loading through the panel to the settings view, and ensures `saveSettings` syncs LED state back to the panel.

- [ ] **Step 1: Write failing test — panel passes LED props to settings view**

Find the appropriate test file and add:

```typescript
it("passes LED properties to settings view", () => {
	const a = createPanel({
		_ledMode: "Presence",
		_ledBrightness: 0.7,
		_ledPresenceColor: "#00FF00",
		_staticLedEnabled: false,
		_view: "settings",
	});
	const tpl = a._renderSettings();
	const c = renderTo(tpl);

	const sv = c.querySelector("epp-settings-view") as any;
	expect(sv.ledMode).toBe("Presence");
	expect(sv.ledBrightness).toBe(0.7);
	expect(sv.ledPresenceColor).toBe("#00FF00");
	expect(sv.staticLedEnabled).toBe(false);
	document.body.removeChild(c);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-leds/frontend && npx vitest run src/__tests__/panel-settings.test.ts -t "passes LED" 2>&1 | tail -20`

Expected: FAIL — `_ledMode` not a property of the panel.

- [ ] **Step 3: Implement panel wiring**

In `frontend/src/eppgrid-panel.ts`:

Add state properties (after `_co2Enabled`):

```typescript
	@state() private _ledMode = "Manual Control";
	@state() private _ledBrightness = 1.0;
	@state() private _ledPresenceColor = "#CC33FF";
	@state() private _staticLedEnabled = true;
```

In `_applyConfig` (after `this._logLevels = parsed.settings.logLevels;`), add:

```typescript
		this._ledMode = parsed.settings.ledMode;
		this._ledBrightness = parsed.settings.ledBrightness;
		this._ledPresenceColor = parsed.settings.ledPresenceColor;
		this._staticLedEnabled = parsed.settings.staticLedEnabled;
```

In `_renderSettings()`, add these property bindings to the `<epp-settings-view>` tag (after `.co2Enabled`):

```typescript
          .ledMode=${this._ledMode}
          .ledBrightness=${this._ledBrightness}
          .ledPresenceColor=${this._ledPresenceColor}
          .staticLedEnabled=${this._staticLedEnabled}
```

In `frontend/src/controllers/grid-state-controller.ts`, in `saveSettings()` (after the `staticMaxDistance` line), add:

```typescript
			this.host._ledMode = payload.led_mode ?? this.host._ledMode;
			this.host._ledBrightness =
				payload.led_brightness ?? this.host._ledBrightness;
			this.host._ledPresenceColor =
				payload.led_presence_color ?? this.host._ledPresenceColor;
			this.host._staticLedEnabled =
				payload.static_led_enabled ?? this.host._staticLedEnabled;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-leds/frontend && npx vitest run src/__tests__/panel-settings.test.ts -t "passes LED" 2>&1 | tail -20`

Expected: PASS

- [ ] **Step 5: Run full frontend test suite**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-leds/frontend && npx vitest run 2>&1 | tail -30`

Expected: ALL PASS

- [ ] **Step 6: Build frontend**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-leds/frontend && npm run build 2>&1 | tail -10`

Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add frontend/src/eppgrid-panel.ts frontend/src/controllers/grid-state-controller.ts frontend/src/__tests__/ custom_components/eppgrid/frontend/eppgrid-panel.js
git commit -m "feat: wire LED properties through panel and grid controller"
```

---

### Task 6: Firmware — Add epp_set_led action, presence color globals, and CO2 thresholds

**Files:**
- Modify: `firmware/common/everything-presence-pro-base.yaml`
- Modify: `firmware/common/co2-base.yaml`

No automated tests for firmware YAML, but log output should be verified manually.

- [ ] **Step 1: Add presence color globals**

Add to `everything-presence-pro-base.yaml` in the `globals:` section (there should be an existing globals section, or add one near the top of the file before the `light:` section):

```yaml
globals:
  - id: presence_color_red
    type: float
    restore_value: true
    initial_value: '0.8'
  - id: presence_color_green
    type: float
    restore_value: true
    initial_value: '0.2'
  - id: presence_color_blue
    type: float
    restore_value: true
    initial_value: '1.0'
```

- [ ] **Step 2: Add epp_set_led API action**

Add to the `api:` → `actions:` section (after the existing actions):

```yaml
    - action: epp_set_led
      variables:
        mode: string
        brightness: float
        presence_red: float
        presence_green: float
        presence_blue: float
      then:
        - lambda: |-
            ESP_LOGI("control_leds", "epp_set_led: mode=%s brightness=%.2f color=(%.2f, %.2f, %.2f)",
                     mode.c_str(), brightness, presence_red, presence_green, presence_blue);

            // Update presence color globals
            id(presence_color_red) = presence_red;
            id(presence_color_green) = presence_green;
            id(presence_color_blue) = presence_blue;

            // Update brightness
            auto call = id(led_brightness_multiplier).make_call();
            call.set_value(brightness);
            call.perform();

            // Update mode (triggers control_leds via on_value)
            auto mode_call = id(led_mode_select).make_call();
            mode_call.set_option(mode);
            mode_call.perform();
```

- [ ] **Step 3: Update control_leds_presence to use color globals**

Replace the hardcoded color in `control_leds_presence` script. Change:

```yaml
                brightness: !lambda 'return 0.55 * id(led_brightness_multiplier).state;'
                red: 80%
                green: 20%
                blue: 100%
```

To:

```yaml
                brightness: !lambda 'return 0.55 * id(led_brightness_multiplier).state;'
                red: !lambda 'return id(presence_color_red);'
                green: !lambda 'return id(presence_color_green);'
                blue: !lambda 'return id(presence_color_blue);'
```

Also update the `update_led_state` script's presence branch. Change:

```yaml
                      brightness: 0.55
                      red: 0.0
                      green: 1.0
                      blue: 0.8
```

To:

```yaml
                      brightness: 0.55
                      red: !lambda 'return id(presence_color_red);'
                      green: !lambda 'return id(presence_color_green);'
                      blue: !lambda 'return id(presence_color_blue);'
```

Note: the `led_fade_in` script takes float parameters, so for that call use lambdas that return the global values.

- [ ] **Step 4: Implement CO2 environmental LED thresholds**

Replace the placeholder `update_environmental_led` script with real CO2 threshold logic:

```yaml
  - id: update_environmental_led
    then:
      - lambda: |-
          // Check if CO2 sensor is available (will be overridden in CO2 builds)
          ESP_LOGD("control_leds", "update_environmental_led: no CO2 sensor, turning off");
      - light.turn_on:
          id: led_rgb
          effect: none
      - delay: 50ms
      - light.turn_on:
          id: led_rgb
          brightness: 1%
          transition_length: 500ms
      - delay: 500ms
      - light.turn_off: led_rgb
```

In `firmware/common/co2-base.yaml`, override `update_environmental_led` with actual CO2 logic:

```yaml
script:
  - id: update_environmental_led
    then:
      - lambda: |-
          float co2_val = id(co2).state;
          ESP_LOGD("control_leds", "update_environmental_led: CO2=%.0f ppm", co2_val);

          if (co2_val < 800) {
            // Good air quality — steady green
            ESP_LOGD("control_leds", "CO2 good (<800) — green");
          } else if (co2_val < 1200) {
            // Warning — amber pulse
            ESP_LOGD("control_leds", "CO2 warning (800-1200) — amber");
          } else {
            // Alert — red pulse
            ESP_LOGD("control_leds", "CO2 alert (>1200) — red");
          }
      - if:
          condition:
            lambda: 'return id(co2).state < 800;'
          then:
            - light.turn_on:
                id: led_rgb
                effect: none
            - delay: 50ms
            - light.turn_on:
                id: led_rgb
                brightness: !lambda 'return 0.40 * id(led_brightness_multiplier).state;'
                red: 0%
                green: 100%
                blue: 0%
                white: 0%
                transition_length: 600ms
      - if:
          condition:
            lambda: 'return id(co2).state >= 800 && id(co2).state < 1200;'
          then:
            - light.turn_on:
                id: led_rgb
                effect: none
            - delay: 50ms
            - light.turn_on:
                id: led_rgb
                brightness: !lambda 'return 0.50 * id(led_brightness_multiplier).state;'
                red: 100%
                green: 60%
                blue: 0%
                white: 0%
                transition_length: 600ms
            - delay: 650ms
            - light.turn_on:
                id: led_rgb
                effect: "Environmental Warning"
      - if:
          condition:
            lambda: 'return id(co2).state >= 1200;'
          then:
            - light.turn_on:
                id: led_rgb
                effect: none
            - delay: 50ms
            - light.turn_on:
                id: led_rgb
                brightness: !lambda 'return 0.55 * id(led_brightness_multiplier).state;'
                red: 100%
                green: 0%
                blue: 0%
                white: 0%
                transition_length: 600ms
            - delay: 650ms
            - light.turn_on:
                id: led_rgb
                effect: "Environmental Alert"

  - id: control_leds_environmental_presence
    mode: restart
    then:
      - script.execute: alternate_presence_environmental

  - id: alternate_presence_environmental
    mode: restart
    then:
      - while:
          condition:
            lambda: 'return id(led_mode_select).current_option() == "Environmental + Presence";'
          then:
            # Show environmental for 8 seconds
            - script.execute: update_environmental_led
            - delay: 8s
            # Show presence for 4 seconds (if occupied)
            - if:
                condition:
                  lambda: 'return id(occupancy).state;'
                then:
                  - light.turn_on:
                      id: led_rgb
                      effect: none
                  - delay: 50ms
                  - light.turn_on:
                      id: led_rgb
                      brightness: !lambda 'return 0.55 * id(led_brightness_multiplier).state;'
                      red: !lambda 'return id(presence_color_red);'
                      green: !lambda 'return id(presence_color_green);'
                      blue: !lambda 'return id(presence_color_blue);'
                      white: 0%
                      transition_length: 600ms
                  - delay: 650ms
                  - light.turn_on:
                      id: led_rgb
                      effect: "Presence Glow"
                  - delay: 4s
```

- [ ] **Step 5: Commit**

```bash
git add firmware/common/everything-presence-pro-base.yaml firmware/common/co2-base.yaml
git commit -m "feat: add epp_set_led action, presence color globals, and CO2 thresholds"
```

---

### Task 7: Update documentation

**Files:**
- Modify: `docs/backend-data-catalog.md`

- [ ] **Step 1: Update data catalog**

Add the new LED settings to the settings section and document the `epp_set_led` action:

**New settings keys:**
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `led_mode` | string | `"Manual Control"` | One of: Manual Control, Presence, Environmental, Environmental + Presence |
| `led_brightness` | float | `1.0` | RGB LED brightness multiplier (0.1–1.0) |
| `led_presence_color` | string | `"#CC33FF"` | Hex RGB color for presence indication |
| `static_led_enabled` | bool | `true` | Enable/disable SEN0609 indicator LED |

**New firmware action:**
| Action | Parameters | Description |
|--------|-----------|-------------|
| `epp_set_led` | `mode: string, brightness: float, presence_red: float, presence_green: float, presence_blue: float` | Sets LED mode, brightness, and presence color. Triggers `control_leds`. |

- [ ] **Step 2: Commit**

```bash
git add docs/backend-data-catalog.md
git commit -m "docs: add LED settings to data catalog"
```

---

### Task 8: Full integration verification

- [ ] **Step 1: Run all backend tests**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-leds && python -m pytest tests/ -xvs 2>&1 | tail -30`

Expected: ALL PASS

- [ ] **Step 2: Run all frontend tests**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-leds/frontend && npx vitest run 2>&1 | tail -30`

Expected: ALL PASS

- [ ] **Step 3: Build frontend**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-leds/frontend && npm run build 2>&1 | tail -10`

Expected: Build succeeds

- [ ] **Step 4: Run pre-commit checks (biome lint + ruff format)**

Run: `cd /Users/clintongormley/workspace/worktrees/epp-leds && npx biome check frontend/src/ && ruff format custom_components/ tests/ 2>&1 | tail -20`

Expected: Clean
