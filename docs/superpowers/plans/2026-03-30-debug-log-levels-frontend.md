# Debug Log Levels Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Logging" accordion section to the settings panel with per-category log level dropdowns, backed by persisted config and firmware API actions.

**Architecture:** The frontend settings view gets a new accordion section with `<ha-select>` dropdowns for each log category. The save flow extends `eppgrid/set_settings` to include `log_levels`. The backend persists log levels in device config and pushes them to the firmware via `epp_set_log_level` on save and on device reconnect. Build flags are fetched from firmware on connect and exposed to the frontend via device info.

**Tech Stack:** Lit (TypeScript), Home Assistant WebSocket API, Python (aioesphomeapi), ESPHome YAML

**Spec:** `docs/superpowers/specs/2026-03-29-debug-log-levels-design.md`

---

### Task 1: Backend — fetch and expose build flags

**Files:**
- Modify: `custom_components/eppgrid/device_manager.py:119-236` (async_push_config)
- Modify: `custom_components/eppgrid/device_manager.py:503-528` (list_devices)
- Test: `tests/test_websocket_api.py`

The backend needs to call the firmware's `get_build_flags` action on device connect and include the flags in the device info sent to the frontend.

- [ ] **Step 1: Write failing test — build flags are fetched and included in device info**

In the appropriate test file, add a test that verifies `list_devices` includes build flags. Find the existing test pattern for `list_devices` and extend it.

First, check how tests are structured:

Run: `find tests/ -name "*.py" | head -20 && grep -rn "list_devices\|get_build_flags" tests/`

- [ ] **Step 2: Add build flag fetching**

Two changes needed:

**A)** In `DeviceConnection.async_push_config()` (device_manager.py, end of method around line 236), add a method that fetches build flags and returns them:

```python
    async def async_fetch_build_flags(self) -> dict[str, Any]:
        """Fetch build flags from device via get_build_flags action."""
        svc = self._services.get("get_build_flags")
        if svc is None:
            return {}
        try:
            resp = await self._client.execute_service(svc, {})
            return resp if isinstance(resp, dict) else {}
        except Exception:
            _LOGGER.debug("Failed to fetch build flags from %s", self._host)
            return {}
```

**B)** In `DeviceManager.__init__`, add a per-mac cache:

```python
        self._build_flags: dict[str, dict[str, Any]] = {}
```

**C)** In `DeviceManager._push_config_to_device()` (around line 450), after `await conn.async_push_config(config)` succeeds (in both the session path and the temporary connection path), fetch and cache build flags:

```python
            flags = await conn.async_fetch_build_flags()
            if flags:
                self._build_flags[mac] = flags
```

**D)** In `DeviceManager.list_devices()` (around line 520), add build flags to the device info dict:

```python
                **self._build_flags.get(mac, {}),
```

This spreads `bluetooth_enabled`, `co2_enabled`, `ethernet_enabled` etc. into the device info.

- [ ] **Step 3: Run test to verify it passes**

Run: `cd tests && python -m pytest test_websocket_api.py -v -k build_flags`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add custom_components/eppgrid/device_manager.py tests/
git commit -m "feat: fetch and expose firmware build flags in device info"
```

---

### Task 2: Backend — persist and push log levels

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py:744-820` (set_settings handler)
- Modify: `custom_components/eppgrid/device_manager.py:119-236` (async_push_config)
- Test: `tests/test_websocket_api.py`

- [ ] **Step 1: Write failing test — set_settings accepts and persists log_levels**

Add a test that sends `eppgrid/set_settings` with a `log_levels` dict and verifies it's stored in device config.

- [ ] **Step 2: Add log_levels to set_settings schema**

In `custom_components/eppgrid/websocket_api.py`, add to the `websocket_set_settings` schema (around line 778):

```python
        vol.Optional("log_levels"): {str: str},
```

In the handler body (around line 800), after `device_config["settings"] = ...`:

```python
    log_levels = msg.get("log_levels")
    if log_levels is not None:
        device_config["log_levels"] = log_levels
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd tests && python -m pytest test_websocket_api.py -v -k log_levels`
Expected: PASS

- [ ] **Step 4: Write failing test — log levels are pushed to device on config push**

Add a test that verifies `async_push_config` calls `epp_set_log_level` for each stored log level.

- [ ] **Step 5: Add log level pushing to async_push_config**

In `custom_components/eppgrid/device_manager.py`, add to the end of `async_push_config` (after pipeline push, before build flags fetch):

```python
        # Push log levels
        log_levels = config.get("log_levels")
        if log_levels:
            svc = self._services.get("epp_set_log_level")
            if svc:
                for category, level in log_levels.items():
                    await self._client.execute_service(
                        svc,
                        {"category": category, "level": level},
                    )
                _LOGGER.info("Pushed log levels to %s", self._host)
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd tests && python -m pytest test_websocket_api.py -v -k log_levels`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add custom_components/eppgrid/websocket_api.py custom_components/eppgrid/device_manager.py tests/
git commit -m "feat: persist log levels in device config and push to firmware"
```

---

### Task 3: Frontend types and config parsing

**Files:**
- Modify: `frontend/src/types.ts:16-28` (DeviceInfo interface)
- Modify: `frontend/src/lib/config-serialization.ts:174-192` (parseSettings)
- Test: `frontend/src/__tests__/lib/config-serialization.test.ts`

- [ ] **Step 1: Write failing test — parseSettings extracts logLevels**

In `frontend/src/__tests__/lib/config-serialization.test.ts`, add:

```typescript
it("parses log_levels from settings", () => {
  const result = parseSettings({
    temperature_offset: 0,
    log_levels: { epp: "Debug", system: "Warning" },
  });
  expect(result.logLevels).toEqual({ epp: "Debug", system: "Warning" });
});

it("defaults logLevels to empty object", () => {
  const result = parseSettings({});
  expect(result.logLevels).toEqual({});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- --testPathPattern config-serialization`
Expected: FAIL — `logLevels` property doesn't exist

- [ ] **Step 3: Add logLevels to ParsedSettings and parseSettings**

In `frontend/src/lib/config-serialization.ts`, add to `ParsedSettings` interface (after `entities`):

```typescript
	logLevels: Record<string, string>;
```

In `parseSettings` function, add after `entities`:

```typescript
		logLevels: s.log_levels ?? {},
```

- [ ] **Step 4: Add build flags to DeviceInfo**

In `frontend/src/types.ts`, add to `DeviceInfo` interface (after `current_connection_count`):

```typescript
	bluetooth_enabled?: boolean;
	co2_enabled?: boolean;
	ethernet_enabled?: boolean;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npm test -- --testPathPattern config-serialization`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types.ts frontend/src/lib/config-serialization.ts frontend/src/__tests__/lib/config-serialization.test.ts
git commit -m "feat: add logLevels to ParsedSettings and build flags to DeviceInfo"
```

---

### Task 4: Frontend — add translations

**Files:**
- Modify: `frontend/src/translations/en.json`

- [ ] **Step 1: Add logging translation keys**

In `frontend/src/translations/en.json`, add to the `settings` section:

```json
    "logging": "Logging",
    "log_system": "System",
    "log_epp": "EPP",
    "log_led": "LED",
    "log_networking": "Network",
    "log_ble": "Bluetooth",
    "log_co2": "CO2"
```

And add to the `info` section:

```json
    "log_system": "Framework logs including OTA, API, mDNS, I2C, and sensor drivers.",
    "log_epp": "Zone engine logs — zone detection, target tracking, and configuration.",
    "log_led": "LED control script logs — mode transitions and decision tree.",
    "log_networking": "WiFi or Ethernet connection and DHCP logs.",
    "log_ble": "Bluetooth Low Energy scanner and proxy logs.",
    "log_co2": "CO2 sensor (SCD4x) logs."
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/translations/en.json
git commit -m "feat: add logging section translation strings"
```

---

### Task 5: Frontend — logging accordion in settings view

**Files:**
- Modify: `frontend/src/components/epp-settings-view.ts`
- Test: `frontend/src/__tests__/components/epp-settings-view.test.ts`

- [ ] **Step 1: Write failing test — logging accordion renders**

In `frontend/src/__tests__/components/epp-settings-view.test.ts`, add:

```typescript
describe("logging accordion", () => {
  it("renders logging section in accordion list", async () => {
    const sv = createView();
    await sv.updateComplete;
    const headers = sv.shadowRoot!.querySelectorAll(".accordion-header");
    const labels = Array.from(headers).map(
      (h) => h.querySelector(".accordion-title")?.textContent,
    );
    expect(labels).toContain("settings.logging");
  });

  it("renders all base log level rows when open", async () => {
    const sv = createView({
      openAccordions: new Set(["logging"]),
      logLevels: {},
    });
    await sv.updateComplete;
    const body = sv.shadowRoot!.querySelector(".accordion-body");
    expect(body).not.toBeNull();
    const labels = Array.from(body!.querySelectorAll(".setting-row label")).map(
      (l) => l.textContent,
    );
    expect(labels).toContain("settings.log_system");
    expect(labels).toContain("settings.log_epp");
    expect(labels).toContain("settings.log_led");
    expect(labels).toContain("settings.log_networking");
  });

  it("hides BLE row when bluetooth_enabled is false", async () => {
    const sv = createView({
      openAccordions: new Set(["logging"]),
      logLevels: {},
      bluetoothEnabled: false,
    });
    await sv.updateComplete;
    const body = sv.shadowRoot!.querySelector(".accordion-body");
    const labels = Array.from(body!.querySelectorAll(".setting-row label")).map(
      (l) => l.textContent,
    );
    expect(labels).not.toContain("settings.log_ble");
  });

  it("shows BLE row when bluetooth_enabled is true", async () => {
    const sv = createView({
      openAccordions: new Set(["logging"]),
      logLevels: {},
      bluetoothEnabled: true,
    });
    await sv.updateComplete;
    const body = sv.shadowRoot!.querySelector(".accordion-body");
    const labels = Array.from(body!.querySelectorAll(".setting-row label")).map(
      (l) => l.textContent,
    );
    expect(labels).toContain("settings.log_ble");
  });

  it("hides CO2 row when co2_enabled is false", async () => {
    const sv = createView({
      openAccordions: new Set(["logging"]),
      logLevels: {},
      co2Enabled: false,
    });
    await sv.updateComplete;
    const body = sv.shadowRoot!.querySelector(".accordion-body");
    const labels = Array.from(body!.querySelectorAll(".setting-row label")).map(
      (l) => l.textContent,
    );
    expect(labels).not.toContain("settings.log_co2");
  });

  it("marks dirty when dropdown changes", async () => {
    const sv = createView({
      openAccordions: new Set(["logging"]),
      logLevels: {},
    });
    await sv.updateComplete;
    let dirtyFired = false;
    sv.addEventListener("dirty", () => { dirtyFired = true; });
    const select = sv.shadowRoot!.querySelector("ha-select") as any;
    select.value = "Debug";
    select.dispatchEvent(new Event("selected"));
    expect(dirtyFired).toBe(true);
  });

  it("includes log_levels in save payload", async () => {
    const sv = createView({
      openAccordions: new Set(["logging"]),
      logLevels: { system: "Warning", epp: "Warning" },
    });
    await sv.updateComplete;
    // Simulate an override
    (sv as any)._overrides.logLevels = { epp: "Debug" };
    let payload: any = null;
    sv.addEventListener("save", ((e: CustomEvent) => {
      payload = e.detail;
    }) as EventListener);
    (sv as any)._emitSave();
    expect(payload.log_levels).toEqual({ system: "Warning", epp: "Debug" });
  });

  it("reset button sets dropdown to Warning", async () => {
    const sv = createView({
      openAccordions: new Set(["logging"]),
      logLevels: { epp: "Debug" },
    });
    await sv.updateComplete;
    const resetBtn = sv.shadowRoot!.querySelector(
      ".setting-row .setting-info[aria-label='Reset to default']",
    ) as HTMLButtonElement;
    resetBtn.click();
    expect((sv as any)._overrides.logLevels.epp).toBe("Warning");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- --testPathPattern epp-settings-view`
Expected: FAIL — `logLevels` property not recognized, no logging accordion

- [ ] **Step 3: Add properties to EppSettingsView**

In `frontend/src/components/epp-settings-view.ts`, add after the `entitiesConfig` property (line 62):

```typescript
	@property({ attribute: false }) logLevels: Record<string, string> = {};
	@property({ type: Boolean }) bluetoothEnabled = false;
	@property({ type: Boolean }) co2Enabled = false;
```

- [ ] **Step 4: Add logging section to accordion list**

In the `render()` method, add to the `sections` array (after the sensitivity entry):

```typescript
			{
				id: "logging",
				label: "settings.logging",
				icon: "mdi:math-log",
			},
```

- [ ] **Step 5: Add logging case to renderSettingsSection**

In `renderSettingsSection`, add before the `default` case:

```typescript
			case "logging":
				return this.renderLogging();
```

- [ ] **Step 6: Implement renderLogging method**

Add the `renderLogging()` method to `EppSettingsView`:

```typescript
	renderLogging() {
		const LOG_LEVELS = ["None", "Error", "Warning", "Info", "Debug"];
		const categories: { key: string; label: string; tip: string; show: boolean }[] = [
			{ key: "system", label: "settings.log_system", tip: "info.log_system", show: true },
			{ key: "epp", label: "settings.log_epp", tip: "info.log_epp", show: true },
			{ key: "led", label: "settings.log_led", tip: "info.log_led", show: true },
			{ key: "networking", label: "settings.log_networking", tip: "info.log_networking", show: true },
			{ key: "ble", label: "settings.log_ble", tip: "info.log_ble", show: this.bluetoothEnabled },
			{ key: "co2", label: "settings.log_co2", tip: "info.log_co2", show: this.co2Enabled },
		];

		return html`
      <div class="settings-section">
        <div class="setting-group">
          ${categories.filter(c => c.show).map((c) => {
            const overrides = this._overrides.logLevels || {};
            const current = overrides[c.key] ?? this.logLevels[c.key] ?? "Warning";
            return html`
              <div class="setting-row">
                <label>${this.localize(c.label)}</label>
                <ha-select
                  .value=${current}
                  @selected=${(e: Event) => {
                    const select = e.target as any;
                    const val = select.value;
                    if (!val || val === current) return;
                    if (!this._overrides.logLevels) this._overrides.logLevels = {};
                    this._overrides.logLevels[c.key] = val;
                    this._fireDirty();
                  }}
                  @closed=${(e: Event) => e.stopPropagation()}
                >
                  ${LOG_LEVELS.map(
                    (l) => html`<ha-list-item .value=${l}>${l}</ha-list-item>`,
                  )}
                </ha-select>
                <button type="button" class="setting-info" aria-label="Reset to default" title="Reset to default" @click=${(e: Event) => {
                  e.stopPropagation();
                  if (!this._overrides.logLevels) this._overrides.logLevels = {};
                  this._overrides.logLevels[c.key] = "Warning";
                  this._fireDirty();
                  this.requestUpdate();
                }}><ha-icon icon="mdi:restart"></ha-icon></button>
                ${this.infoTip(this.localize(c.tip))}
              </div>
            `;
          })}
        </div>
      </div>
    `;
	}
```

Note: The reset button for dropdowns can't use the generic `resetBtn()` helper (which targets sliders). Instead, it directly sets the override and requests an update to re-render the `<ha-select>` with the new value.

- [ ] **Step 7: Include logLevels in _emitSave**

In `_emitSave()`, add to the `detail` object (after `entities`):

```typescript
					log_levels: {
						...this.logLevels,
						...(o.logLevels || {}),
					},
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd frontend && npm test -- --testPathPattern epp-settings-view`
Expected: PASS

- [ ] **Step 9: Build**

Run: `cd frontend && npm run build`
Expected: SUCCESS

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/epp-settings-view.ts frontend/src/__tests__/components/epp-settings-view.test.ts
git commit -m "feat: add logging accordion with per-category log level dropdowns"
```

---

### Task 6: Frontend — wire up panel and controller

**Files:**
- Modify: `frontend/src/eppgrid-panel.ts:1262-1308` (settings rendering)
- Modify: `frontend/src/eppgrid-panel.ts:380-432` (_applyConfig)
- Modify: `frontend/src/controllers/grid-state-controller.ts:529-576` (saveSettings)

- [ ] **Step 1: Add log level state to panel**

In `frontend/src/eppgrid-panel.ts`, add state properties alongside existing settings properties:

```typescript
  @state() private _logLevels: Record<string, string> = {};
  @state() private _bluetoothEnabled = false;
  @state() private _co2Enabled = false;
```

- [ ] **Step 2: Pass new props to settings view**

In `_renderSettings()`, add to the `<epp-settings-view>` element (after `.staticOnDelay`):

```typescript
          .logLevels=${this._logLevels}
          .bluetoothEnabled=${this._bluetoothEnabled}
          .co2Enabled=${this._co2Enabled}
```

- [ ] **Step 3: Apply log levels and build flags from config**

In `_applyConfig()`, add after the settings block:

```typescript
    // Apply log levels
    this._logLevels = parsed.settings.logLevels;
```

For build flags, they come from device info not config. In the device selection handler (wherever `_devices` is populated from `list_devices`), extract build flags from the selected device's info:

Find where devices are loaded (likely via `eppgrid/list_devices` response) and set:

```typescript
    const dev = this._devices.find(d => d.mac === mac);
    if (dev) {
      this._bluetoothEnabled = dev.bluetooth_enabled ?? false;
      this._co2Enabled = dev.co2_enabled ?? false;
    }
```

- [ ] **Step 4: Update saveSettings in grid controller**

In `frontend/src/controllers/grid-state-controller.ts`, in `saveSettings()`, add after the existing property updates (around line 570):

```typescript
        this.host._logLevels = payload.log_levels ?? this.host._logLevels;
```

- [ ] **Step 5: Build**

Run: `cd frontend && npm run build`
Expected: SUCCESS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/eppgrid-panel.ts frontend/src/controllers/grid-state-controller.ts
git commit -m "feat: wire log levels and build flags through panel and controller"
```

---

### Task 7: Manual verification

- [ ] **Step 1: Restart HA and verify settings panel**

Run: `ha-wt restart epp-main`

Open the EPP Grid panel in HA, navigate to Settings. Verify:
- A "Logging" accordion appears after the existing sections
- Opening it shows System, EPP, LED, Network rows (always)
- BLE and CO2 rows appear only if the device's firmware variant includes them
- All dropdowns default to "Warning"

- [ ] **Step 2: Test save flow**

Change EPP to "Debug", click Save. Verify:
- The setting persists (reopen settings, EPP still shows "Debug")
- EPP debug logs appear in HA device logs

- [ ] **Step 3: Test reset**

Click the reset button next to EPP. Verify it returns to "Warning". Save and verify EPP debug logs stop.

- [ ] **Step 4: Test persistence across device reboot**

Set EPP to "Debug", save, then restart the device. After reconnect, verify EPP debug logs resume (backend re-pushed the stored log levels).
