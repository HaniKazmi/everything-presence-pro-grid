# Domain Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the integration domain from `everything_presence_pro` to `eppgrid`, class prefix from `EverythingPresencePro` to `EPPGrid`, and panel from `everything-presence-pro-panel` to `eppgrid-panel`. Display name becomes "Everything Presence Pro Grid".

**Architecture:** Mechanical rename across Python, TypeScript, tests, build config, and docs. No logic changes. Directory rename first, then batch find-and-replace by category, verify with tests after each major group.

**Tech Stack:** Python, TypeScript/Lit, rollup, pytest, vitest, ruff

**Spec:** `docs/superpowers/specs/2026-03-23-domain-rename-design.md`

---

### Task 1: Rename component directory

**Files:**
- Rename: `custom_components/everything_presence_pro/` → `custom_components/eppgrid/`

- [ ] **Step 1: git mv the component directory**

```bash
cd /workspaces/ha-dev/everything-presence-pro-grid
git mv custom_components/everything_presence_pro custom_components/eppgrid
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "rename: mv component directory to eppgrid"
```

---

### Task 2: Update Python domain, manifest, and strings

**Files:**
- Modify: `custom_components/eppgrid/const.py:3`
- Modify: `custom_components/eppgrid/manifest.json:2-3`
- Modify: `custom_components/eppgrid/strings.json:5`
- Modify: `custom_components/eppgrid/translations/en.json:5`

- [ ] **Step 1: Update DOMAIN in const.py**

Line 3: `DOMAIN = "everything_presence_pro"` → `DOMAIN = "eppgrid"`

- [ ] **Step 2: Update manifest.json domain and name**

Line 2: `"domain": "everything_presence_pro"` → `"domain": "eppgrid"`
Line 3: `"name": "Everything Presence Pro"` → `"name": "Everything Presence Pro Grid"`

- [ ] **Step 3: Update strings.json product name**

Line 5: `"title": "Connect to Everything Presence Pro"` → `"title": "Connect to Everything Presence Pro Grid"`

- [ ] **Step 4: Update translations/en.json product name**

Line 5: `"title": "Connect to Everything Presence Pro"` → `"title": "Connect to Everything Presence Pro Grid"`

- [ ] **Step 5: Commit**

```bash
git add custom_components/eppgrid/const.py \
       custom_components/eppgrid/manifest.json \
       custom_components/eppgrid/strings.json \
       custom_components/eppgrid/translations/en.json
git commit -m "rename: update domain to eppgrid, display name to Everything Presence Pro Grid"
```

---

### Task 3: Rename Python classes and panel references in source files

Rename all `EverythingPresencePro` → `EPPGrid` and update panel filename references.

**Files:**
- Modify: `custom_components/eppgrid/__init__.py`
- Modify: `custom_components/eppgrid/config_flow.py`
- Modify: `custom_components/eppgrid/coordinator.py`
- Modify: `custom_components/eppgrid/websocket_api.py`
- Modify: `custom_components/eppgrid/binary_sensor.py`
- Modify: `custom_components/eppgrid/sensor.py`

- [ ] **Step 1: Update __init__.py**

Class prefix replacements (`EverythingPresencePro` → `EPPGrid`):
- Line 17: `from .coordinator import EverythingPresenceProCoordinator` → `from .coordinator import EPPGridCoordinator`
- Line 33: `EverythingPresenceProConfigEntry` → `EPPGridConfigEntry`
- Lines 36, 83, 91, 95: all `EverythingPresencePro` references → `EPPGrid`

Panel and sidebar changes:
- Line 52: `"everything-presence-pro-panel.js"` → `"eppgrid-panel.js"`
- Line 60: `webcomponent_name="everything-presence-pro-panel"` → `webcomponent_name="eppgrid-panel"`
- Line 61: `"everything-presence-pro-panel.js"` → `"eppgrid-panel.js"`
- Line 62: `sidebar_title="EP Pro"` → `sidebar_title="Everything Presence Pro Grid"`

- [ ] **Step 2: Update config_flow.py**

Line 27: `EverythingPresenceProConfigFlow` → `EPPGridConfigFlow`

- [ ] **Step 3: Update coordinator.py**

Line 46: `EverythingPresenceProCoordinator` → `EPPGridCoordinator`

(Signal strings on lines 40-43 use `DOMAIN` constant — they update automatically.)

- [ ] **Step 4: Update websocket_api.py class references**

Lines 21, 29: `EverythingPresenceProCoordinator` → `EPPGridCoordinator`

- [ ] **Step 5: Update binary_sensor.py**

Replace all `EverythingPresencePro` with `EPPGrid` throughout the file. Classes:
`EPPGridConfigEntry`, `EPPGridCoordinator`, `EPPGridOccupancySensor`, `EPPGridMotionSensor`, `EPPGridStaticPresenceSensor`, `EPPGridTargetPresenceSensor`, `EPPGridTargetActiveSensor`, `EPPGridZoneOccupancySensor`

- [ ] **Step 6: Update sensor.py**

Replace all `EverythingPresencePro` with `EPPGrid` throughout the file. Classes:
`EPPGridConfigEntry`, `EPPGridCoordinator`, `EPPGridIlluminanceSensor`, `EPPGridTemperatureSensor`, `EPPGridHumiditySensor`, `EPPGridCO2Sensor`, `EPPGridRoomTargetCountSensor`, `EPPGridTargetXYSensorSensor`, `EPPGridTargetXYPositionSensor`, `EPPGridTargetDistanceSensor`, `EPPGridTargetAngleSensor`, `EPPGridTargetSpeedSensor`, `EPPGridTargetResolutionSensor`, `EPPGridZoneTargetCountSensor`

- [ ] **Step 7: Verify no old class names remain**

```bash
grep -r "EverythingPresencePro" custom_components/ --include="*.py"
```

Expected: no results.

- [ ] **Step 8: Commit**

```bash
git add custom_components/
git commit -m "rename: EverythingPresencePro classes to EPPGrid, panel to eppgrid-panel"
```

---

### Task 4: Update WebSocket command strings in Python

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py`

- [ ] **Step 1: Replace all WS command prefixes**

Replace `"everything_presence_pro/` with `"eppgrid/` on lines: 57, 86, 141, 162, 236, 440, 489, 567, 634.

All 9 commands: `eppgrid/list_entries`, `eppgrid/set_setup`, `eppgrid/get_config`, `eppgrid/set_zones`, `eppgrid/set_room_layout`, `eppgrid/subscribe_raw_targets`, `eppgrid/subscribe_grid_targets`, `eppgrid/rename_zone_entities`, `eppgrid/set_reporting`

- [ ] **Step 2: Commit**

```bash
git add custom_components/eppgrid/websocket_api.py
git commit -m "rename: update WebSocket command prefixes to eppgrid/"
```

---

### Task 5: Update all test file imports and references

**Files:**
- Modify: `tests/conftest.py`
- Modify: `tests/test_init.py`
- Modify: `tests/test_config_flow.py`
- Modify: `tests/test_coordinator.py`
- Modify: `tests/test_websocket_api.py`
- Modify: `tests/test_binary_sensor.py`
- Modify: `tests/test_sensor.py`
- Modify: `tests/test_calibration.py`
- Modify: `tests/test_zone_engine.py`
- Modify: `tests/test_zone_engine_parity.py`
- Modify: `tests/test_e2e.py`
- Modify: `tests/__init__.py`

- [ ] **Step 1: Replace import paths in all test files**

In every file under `tests/`, replace:
- `custom_components.everything_presence_pro` → `custom_components.eppgrid` (import paths and mock paths)

- [ ] **Step 2: Replace class name references in all test files**

In every file under `tests/`, replace:
- `EverythingPresencePro` → `EPPGrid`

- [ ] **Step 3: Replace WS command strings in test files**

In `tests/test_websocket_api.py` and `tests/test_e2e.py`, replace:
- `"everything_presence_pro/` → `"eppgrid/`

- [ ] **Step 4: Update tests/__init__.py docstring**

Replace `Everything Presence Pro` → `Everything Presence Pro Grid` if present.

- [ ] **Step 5: Verify no old references remain**

```bash
grep -r "everything_presence_pro" tests/ --include="*.py"
grep -r "EverythingPresencePro" tests/ --include="*.py"
```

Expected: no results.

- [ ] **Step 6: Commit**

```bash
git add tests/
git commit -m "rename: update test imports and references to eppgrid"
```

---

### Task 6: Run Python tests

- [ ] **Step 1: Run ruff**

```bash
cd /workspaces/ha-dev/everything-presence-pro-grid
ruff check --fix custom_components/ tests/
ruff format custom_components/ tests/
```

- [ ] **Step 2: Run pytest**

```bash
pytest tests/ -v
```

Expected: all tests pass.

- [ ] **Step 3: Commit any ruff fixes if needed**

```bash
git add -A
git commit -m "style: ruff format after rename"
```

---

### Task 7: Rename frontend panel source file and update config

**Files:**
- Rename: `frontend/src/everything-presence-pro-panel.ts` → `frontend/src/eppgrid-panel.ts`
- Modify: `frontend/src/index.ts`
- Modify: `frontend/rollup.config.js`
- Modify: `frontend/package.json`

- [ ] **Step 1: Rename the TS source file**

```bash
cd /workspaces/ha-dev/everything-presence-pro-grid
git mv frontend/src/everything-presence-pro-panel.ts frontend/src/eppgrid-panel.ts
```

- [ ] **Step 2: Update index.ts export**

```typescript
export { EPPGridPanel } from "./eppgrid-panel";
```

- [ ] **Step 3: Update rollup.config.js output path**

Line 9: `"../custom_components/everything_presence_pro/frontend/everything-presence-pro-panel.js"` →
`"../custom_components/eppgrid/frontend/eppgrid-panel.js"`

- [ ] **Step 4: Update package.json name**

Line 2: `"name": "everything-presence-pro-frontend"` → `"name": "eppgrid-frontend"`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "rename: mv panel source to eppgrid-panel"
```

---

### Task 8: Update frontend panel TS content

**Files:**
- Modify: `frontend/src/eppgrid-panel.ts`

- [ ] **Step 1: Replace class name**

Replace all `EverythingPresenceProPanel` → `EPPGridPanel` throughout the file (class definition, static property refs like `._DEBUG_LOG_MAX`, `.FOV_*`, customElements.define, HTMLElementTagNameMap).

- [ ] **Step 2: Replace custom element tag**

Replace `"everything-presence-pro-panel"` → `"eppgrid-panel"` (in customElements.define and HTMLElementTagNameMap)

- [ ] **Step 3: Replace WS command prefixes**

Replace all `"everything_presence_pro/` → `"eppgrid/` throughout the file.

- [ ] **Step 4: Replace integration URL path**

`"/config/integrations/integration/everything_presence_pro"` → `"/config/integrations/integration/eppgrid"`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/eppgrid-panel.ts
git commit -m "rename: update panel class, element tag, WS commands to eppgrid"
```

---

### Task 9: Update frontend test files

**Files:**
- Modify: All `frontend/src/__tests__/panel-*.test.ts` files

- [ ] **Step 1: Update import paths**

In every `frontend/src/__tests__/*.test.ts`, replace:
- `from "../everything-presence-pro-panel.js"` → `from "../eppgrid-panel.js"`
- `EverythingPresenceProPanel` → `EPPGridPanel`

- [ ] **Step 2: Update WS command strings**

Replace `"everything_presence_pro/` → `"eppgrid/` in all test files.

- [ ] **Step 3: Update integration URL paths**

Replace `"/config/integrations/integration/everything_presence_pro"` → `"/config/integrations/integration/eppgrid"`

- [ ] **Step 4: Verify no old references remain**

```bash
grep -r "everything_presence_pro" frontend/src/ --include="*.ts"
grep -r "EverythingPresencePro" frontend/src/ --include="*.ts"
grep -r "everything-presence-pro-panel" frontend/src/ --include="*.ts"
```

Expected: no results.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "rename: update frontend test imports and references to eppgrid"
```

---

### Task 10: Rebuild frontend JS bundle

- [ ] **Step 1: Delete old JS artifact**

```bash
rm -f custom_components/eppgrid/frontend/everything-presence-pro-panel.js
```

- [ ] **Step 2: Build new JS bundle**

```bash
cd /workspaces/ha-dev/everything-presence-pro-grid/frontend
npm run build
```

- [ ] **Step 3: Verify new bundle exists**

```bash
ls -la ../custom_components/eppgrid/frontend/eppgrid-panel.js
```

- [ ] **Step 4: Run frontend tests**

```bash
cd /workspaces/ha-dev/everything-presence-pro-grid/frontend
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
cd /workspaces/ha-dev/everything-presence-pro-grid
git add custom_components/eppgrid/frontend/
git commit -m "build: rebuild frontend JS bundle as eppgrid-panel.js"
```

---

### Task 11: Update build config, tools, and docs

**Files:**
- Modify: `pyproject.toml:10,17`
- Modify: `.github/workflows/tests.yml:45`
- Modify: `README.md`
- Modify: `tools/sensor-diagnostic.html:608,684,688`
- Modify: All `docs/**/*.md` files

- [ ] **Step 1: Update pyproject.toml**

Line 10: `"custom_components.everything_presence_pro"` → `"custom_components.eppgrid"`
Line 17: `"custom_components/everything_presence_pro"` → `"custom_components/eppgrid"`

- [ ] **Step 2: Update CI workflow**

Line 45: `--cov=custom_components/everything_presence_pro` → `--cov=custom_components/eppgrid`

- [ ] **Step 3: Update README.md**

Replace `custom_components/everything_presence_pro` → `custom_components/eppgrid`
Update integration name references to "Everything Presence Pro Grid".

- [ ] **Step 4: Update tools/sensor-diagnostic.html**

Line 608: `'everything_presence_pro'` → `'eppgrid'`
Line 684: `'everything_presence_pro/get_config'` → `'eppgrid/get_config'`
Line 688: `'everything_presence_pro/subscribe_targets'` → `'eppgrid/subscribe_targets'`

- [ ] **Step 5: Update docs/**

In all `docs/**/*.md` files (including `docs/plans/`, `docs/superpowers/plans/`, `docs/superpowers/specs/`), replace:
- `everything_presence_pro` → `eppgrid` (domain references)
- `EverythingPresencePro` → `EPPGrid` (class references)
- `everything-presence-pro-panel` → `eppgrid-panel` (panel references)

- [ ] **Step 6: Commit**

```bash
git add pyproject.toml .github/ README.md tools/ docs/
git commit -m "rename: update build config, tools, and docs to eppgrid"
```

---

### Task 12: Final verification

- [ ] **Step 1: Grep for any remaining old references**

```bash
cd /workspaces/ha-dev/everything-presence-pro-grid
# Old domain
grep -rP "everything_presence_pro" . --include="*.py" --include="*.ts" --include="*.json" --include="*.html" --include="*.toml" --include="*.yml" | grep -v node_modules | grep -v ".git/"
# Old class prefix
grep -r "EverythingPresencePro" . --include="*.py" --include="*.ts" | grep -v node_modules | grep -v ".git/"
# Old panel name
grep -r "everything-presence-pro-panel" . --include="*.py" --include="*.ts" --include="*.js" --include="*.json" --include="*.html" | grep -v node_modules | grep -v ".git/"
```

Expected: no results. Fix any hits found.

- [ ] **Step 2: Run ruff**

```bash
ruff check --fix custom_components/ tests/
ruff format custom_components/ tests/
```

- [ ] **Step 3: Run all Python tests**

```bash
pytest tests/ -v
```

Expected: all pass.

- [ ] **Step 4: Run all frontend tests**

```bash
cd /workspaces/ha-dev/everything-presence-pro-grid/frontend
npm test
```

Expected: all pass.

- [ ] **Step 5: Commit any final fixes**

Only if needed.

---

### Task 13: Update symlink and workspace memory

- [ ] **Step 1: Remove old symlink**

```bash
rm /workspaces/ha-dev/homeassistant-core/config/custom_components/everything_presence_pro
```

- [ ] **Step 2: Create new symlink**

```bash
ln -s /workspaces/ha-dev/everything-presence-pro-grid/custom_components/eppgrid \
      /workspaces/ha-dev/homeassistant-core/config/custom_components/eppgrid
```

- [ ] **Step 3: Verify symlink**

```bash
ls -la /workspaces/ha-dev/homeassistant-core/config/custom_components/eppgrid
```

- [ ] **Step 4: Update MEMORY.md**

Update component mapping: `everything-presence-pro-grid` → `eppgrid`
