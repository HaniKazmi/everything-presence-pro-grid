# Inline View Wrappers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `epp-live-view` and `epp-editor-view` shadow DOM wrappers by inlining their templates into the panel's render methods, fixing grid centering.

**Architecture:** The two view wrapper components are layout shells that pass pre-rendered templates through. Their shadow DOM boundaries break the flex centering that worked when `.panel` was a direct flex item of `eppgrid-panel`. We inline their templates back into `_renderLiveOverview()` and `_renderEditor()`, move shared layout styles into `styles.ts`, and delete the wrapper components. Child components (`epp-grid`, `epp-live-sidebar`, `epp-zone-sidebar`, `epp-furniture-sidebar`) remain unchanged.

**Tech Stack:** Lit, TypeScript, Vitest

---

### Task 1: Add shared layout styles to styles.ts

**Files:**
- Modify: `frontend/src/styles.ts`

Both wrappers define identical `.editor-layout`, `.grid-container`, and `.zone-sidebar` styles. The panel already imports `panelStyles` (which has `.panel`). Add the shared layout styles there.

- [ ] **Step 1: Add layout styles to styles.ts**

Add after the existing `panelStyles` export:

```typescript
export const layoutStyles = css`
  .editor-layout {
    display: flex;
    gap: 24px;
    align-items: flex-start;
  }

  .grid-container {
    position: relative;
    max-width: 100%;
    overflow: visible;
  }

  .zone-sidebar {
    width: 240px;
    max-height: 70vh;
    background: var(--card-background-color, #fff);
    border-left: 1px solid var(--divider-color, #e0e0e0);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow: hidden;
  }

  .sidebar-title {
    font-size: 15px;
    font-weight: 600;
    padding: 10px 12px 8px;
    color: var(--primary-text-color, #212121);
  }
`;

export const liveMenuStyles = css`
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 4px 4px 12px;
  }

  .sidebar-header .sidebar-title {
    padding: 0;
  }

  .sidebar-menu-wrapper {
    position: relative;
  }

  .sidebar-menu-btn {
    background: none;
    border: none;
    color: var(--secondary-text-color, #757575);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    display: flex;
  }

  .sidebar-menu-btn:hover {
    background: var(--secondary-background-color, #f0f0f0);
  }

  .sidebar-menu {
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    z-index: 100;
    min-width: 220px;
    padding: 4px 0;
  }

  .sidebar-menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 14px;
    border: none;
    background: none;
    color: var(--primary-text-color, #212121);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
  }

  .sidebar-menu-item:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }
`;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/styles.ts
git commit -m "refactor: extract shared layout and live menu styles"
```

---

### Task 2: Inline epp-live-view into _renderLiveOverview()

**Files:**
- Modify: `frontend/src/eppgrid-panel.ts`

Replace the `<epp-live-view>` element with the template HTML that was inside it. The panel already has direct access to all the data — no more passing pre-rendered templates through. Move `showMenu` state (`_showLiveMenu`) into the panel.

- [ ] **Step 1: Add imports and state**

In `eppgrid-panel.ts`:
- Add `layoutStyles` and `liveMenuStyles` to the imports from `./styles.js`
- Add `import "./components/epp-live-sidebar.js";`
- Remove `import "./components/epp-live-view.js";`
- Add `@state() private _showLiveMenu = false;` alongside the other `@state()` declarations
- Add `layoutStyles` and `liveMenuStyles` to the `static styles` array

- [ ] **Step 2: Replace _renderLiveOverview()**

Replace the entire `_renderLiveOverview()` method with the inlined template. The key change: instead of passing `headerTemplate`, `gridTemplate`, `debugLogTemplate` as properties, render them directly inline. Event handlers that previously listened to `navigate-view` and `live-view-action` custom events now call the panel methods directly.

```typescript
private _renderLiveOverview() {
    const gridContent = this._perspective
        ? this._renderLiveGrid()
        : html`<epp-wizard
            mode="uncalibrated-fov"
            .rawTargets=${this._rawTargets}
            .sensorState=${{ occupancy: this._sensorState.occupancy }}
            .localize=${this._localize}
            @start-calibration=${() => this._changePlacement()}
          ></epp-wizard>`;

    return html`
      <div class="panel" @click=${(e: MouseEvent) => {
            if (!(e.target instanceof Element)) return;
            if (this._showLiveMenu && !e.target.closest(".sidebar-menu-wrapper")) {
                this._showLiveMenu = false;
            }
        }}>
        ${this._renderHeader()}
        <div class="editor-layout">
          <div style="min-width: 0;">
            <div class="grid-container">
              ${gridContent}
            </div>
            ${this._perspective ? this._renderBackendDebugLog() : nothing}
          </div>
          <div class="zone-sidebar">
            <div class="sidebar-header">
              <span class="sidebar-title" style="margin-right: auto;">${this._localize("sidebar.live_overview")}</span>
              <div class="sidebar-menu-wrapper">
                <button class="sidebar-menu-btn" @click=${() => {
                        this._showLiveMenu = !this._showLiveMenu;
                    }}>
                  <ha-icon icon="mdi:dots-vertical" style="--mdc-icon-size: 20px;"></ha-icon>
                </button>
                ${this._showLiveMenu
                    ? html`
                  <div class="sidebar-menu" @click=${() => {
                        this._showLiveMenu = false;
                    }}>
                    ${this._perspective
                        ? html`
                      <button class="sidebar-menu-item" @click=${() => {
                            this._view = "editor";
                            this._sidebarTab = "zones";
                        }}>
                        <ha-icon icon="mdi:vector-square" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.detection_zones")}
                      </button>
                      <button class="sidebar-menu-item" @click=${() => {
                            this._view = "editor";
                            this._sidebarTab = "furniture";
                        }}>
                        <ha-icon icon="mdi:sofa" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.furniture")}
                      </button>
                    `
                        : nothing
                    }
                    <button class="sidebar-menu-item" @click=${() => {
                            this._view = "settings";
                        }}>
                      <ha-icon icon="mdi:cog" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.settings")}
                    </button>
                    <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 4px 0;"/>
                    <button class="sidebar-menu-item" @click=${() => this._changePlacement()}>
                      <ha-icon icon="mdi:target" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.room_calibration")}
                    </button>
                    ${this._perspective
                        ? html`
                      <button class="sidebar-menu-item" style="color: var(--error-color, #f44336);" @click=${() => {
                            this._showDeleteCalibrationDialog = true;
                        }}>
                        <ha-icon icon="mdi:delete" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.delete_calibration")}
                      </button>
                    `
                        : nothing
                    }
                    <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 4px 0;"/>
                    <button class="sidebar-menu-item" @click=${() => {
                            this._showTemplateSave = true;
                        }}>
                      <ha-icon icon="mdi:content-save" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("dialogs.save_template")}
                    </button>
                    <button class="sidebar-menu-item" @click=${() => {
                            this._showTemplateLoad = true;
                        }}>
                      <ha-icon icon="mdi:folder-open" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("dialogs.load_template")}
                    </button>
                  </div>
                `
                    : nothing
                }
              </div>
            </div>
            <epp-live-sidebar
              .sensorState=${this._sensorState}
              .zoneState=${this._zoneState}
              .zoneConfigs=${this._zoneConfigs}
              .perspective=${this._perspective}
              .localize=${this._localize}
              @view-change=${(e: CustomEvent) => {
                    this._view = e.detail.view;
                    if (e.detail.sidebarTab) this._sidebarTab = e.detail.sidebarTab;
                }}
            ></epp-live-sidebar>
          </div>
        </div>
      </div>
    `;
}
```

- [ ] **Step 3: Build and verify**

```bash
cd frontend && npm run build
```

Expected: builds successfully, grid is centered in HA.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/eppgrid-panel.ts
git commit -m "refactor: inline epp-live-view into panel render method"
```

---

### Task 3: Inline epp-editor-view into _renderEditor()

**Files:**
- Modify: `frontend/src/eppgrid-panel.ts`

Same approach: replace `<epp-editor-view>` with inline template. All event handlers already exist on the panel — the wrapper was just forwarding them via bubbling.

- [ ] **Step 1: Add sidebar imports**

In `eppgrid-panel.ts`:
- Add `import "./components/epp-zone-sidebar.js";` and `import "./components/epp-furniture-sidebar.js";`
- Remove `import "./components/epp-editor-view.js";`

- [ ] **Step 2: Replace _renderEditor()**

Keep the existing local zone engine logic at the top. Replace the `<epp-editor-view>` element with inline HTML. Event handlers that were `@zone-select`, `@zone-add`, etc. now go directly on the sidebar components.

```typescript
private _renderEditor() {
    // Run local zone engine replica and compute occupancy for editor view
    const engineResult = this._runLocalZoneEngine();
    const editorOccupancy = engineResult.occupancy;

    // Overwrite _targets status from frontend zone engine
    for (let i = 0; i < engineResult.targets.length && i < this._targets.length; i++) {
        this._targets[i].status = engineResult.targets[i].status;
    }

    // Derive sensors.occupancy from unsaved zone config
    const roomOccupied = Object.values(editorOccupancy).some((v) => v);
    this._sensorState.occupancy =
        this._sensorState.static_presence ||
        this._sensorState.motion_presence ||
        roomOccupied;

    return html`
      <div class="panel" @click=${(e: Event) => {
            const el = e.target as HTMLElement;
            if (!el.closest(".grid") && !el.closest(".zone-sidebar")) {
                if (!this._justPainted) this._activeZone = null;
            }
        }}>
        ${this._renderHeader()}
        <div class="editor-layout">
          <div style="min-width: 0;">
            <div class="grid-container" @click=${(e: Event) => {
                    if (!(e.target as HTMLElement).closest(".furniture-item")) {
                        this._selectedFurnitureId = null;
                    }
                }}>
              <epp-grid
                .grid=${this._grid}
                .zoneConfigs=${this._zoneConfigs}
                .targets=${this._targets}
                .roomWidth=${this._roomWidth}
                .roomDepth=${this._roomDepth}
                .perspective=${this._perspective}
                .furniture=${this._furniture}
                .selectedFurnitureId=${this._selectedFurnitureId}
                .sidebarTab=${this._sidebarTab}
                .editable=${true}
                .activeZone=${this._activeZone}
                .showHitCounts=${this._showHitCounts}
                .occupancy=${editorOccupancy}
                .targetPrevXY=${this._zoneEngineState.targetPrevXY}
                .heatmapColors=${this._showHitCounts ? this._computeHeatmapColors() : null}
                .localize=${this._localize}
                .maxGridPx=${480}
                .frozenBounds=${this._frozenBounds}
                @cell-paint=${(e: CustomEvent) => {
                        const { index, action } = e.detail;
                        if (action === "down") this._onCellMouseDown(index);
                        else if (action === "enter") this._onCellMouseEnter(index);
                        else if (action === "up") this._onCellMouseUp();
                    }}
                @furniture-select=${(e: CustomEvent) => {
                        this._selectedFurnitureId = e.detail;
                    }}
                @furniture-pointer-down=${(e: CustomEvent) => {
                        const { e: ptrEvent, id, type, handle } = e.detail;
                        this._onFurniturePointerDown(ptrEvent, id, type, handle);
                    }}
                @furniture-delete=${(e: CustomEvent) => {
                        this._removeFurniture(e.detail);
                    }}
              ></epp-grid>
            </div>
            ${this._sidebarTab === "zones" ? this._renderDebugLog() : nothing}
          </div>
          <div class="zone-sidebar">
            <div class="sidebar-title">${this._sidebarTab === "furniture" ? this._localize("sidebar.furniture") : this._localize("sidebar.detection_zones")}</div>
            ${this._sidebarTab === "zones"
                ? html`<epp-zone-sidebar
                    .zoneConfigs=${this._zoneConfigs}
                    .activeZone=${this._activeZone}
                    .roomType=${this._roomType}
                    .roomTrigger=${this._roomTrigger}
                    .roomRenew=${this._roomRenew}
                    .roomTimeout=${this._roomTimeout}
                    .roomHandoffTimeout=${this._roomHandoffTimeout}
                    .roomEntryPoint=${this._roomEntryPoint}
                    .localZoneState=${this._zoneEngineState.localZoneState}
                    .localize=${this._localize}
                    @zone-select=${(e: CustomEvent) => { this._activeZone = e.detail.zone; }}
                    @zone-add=${() => { this._addZone(); }}
                    @zone-remove=${(e: CustomEvent) => { this._removeZone(e.detail.slot); }}
                    @zone-config-change=${(e: CustomEvent) => {
                            const { index, updates } = e.detail;
                            const configs = [...this._zoneConfigs];
                            configs[index] = { ...configs[index]!, ...updates };
                            this._zoneConfigs = configs;
                        }}
                    @room-config-change=${(e: CustomEvent) => {
                            const { updates } = e.detail;
                            if (updates.roomType !== undefined) this._roomType = updates.roomType;
                            if (updates.roomTrigger !== undefined) this._roomTrigger = updates.roomTrigger;
                            if (updates.roomRenew !== undefined) this._roomRenew = updates.roomRenew;
                            if (updates.roomTimeout !== undefined) this._roomTimeout = updates.roomTimeout;
                            if (updates.roomHandoffTimeout !== undefined) this._roomHandoffTimeout = updates.roomHandoffTimeout;
                            if (updates.roomEntryPoint !== undefined) this._roomEntryPoint = updates.roomEntryPoint;
                        }}
                    @dirty=${() => { this._dirty = true; }}
                  ></epp-zone-sidebar>`
                : html`<epp-furniture-sidebar
                    .furniture=${this._furniture}
                    .selectedFurnitureId=${this._selectedFurnitureId}
                    .hass=${this.hass}
                    .localize=${this._localize}
                    .showCustomIconPicker=${this._showCustomIconPicker}
                    .customIconValue=${this._customIconValue}
                    @furniture-add=${(e: CustomEvent) => { this._addFurniture(e.detail); }}
                    @furniture-add-custom=${(e: CustomEvent) => { this._addCustomFurniture(e.detail); }}
                    @furniture-remove=${(e: CustomEvent) => { this._removeFurniture(e.detail); }}
                    @furniture-update=${(e: CustomEvent) => { this._updateFurniture(e.detail.id, e.detail.updates); }}
                    @furniture-select=${(e: CustomEvent) => { this._selectedFurnitureId = e.detail; }}
                    @custom-icon-toggle=${() => { this._showCustomIconPicker = !this._showCustomIconPicker; }}
                    @custom-icon-change=${(e: CustomEvent) => { this._customIconValue = e.detail; }}
                    @dirty=${() => { this._dirty = true; }}
                  ></epp-furniture-sidebar>`
            }
            ${this._renderSaveCancelButtons()}
          </div>
        </div>
      </div>
    `;
}
```

- [ ] **Step 3: Build and verify**

```bash
cd frontend && npm run build
```

Expected: builds successfully, editor view works and is centered.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/eppgrid-panel.ts
git commit -m "refactor: inline epp-editor-view into panel render method"
```

---

### Task 4: Delete wrapper components and their tests

**Files:**
- Delete: `frontend/src/components/epp-live-view.ts`
- Delete: `frontend/src/components/epp-editor-view.ts`
- Delete: `frontend/src/__tests__/components/epp-live-view.test.ts`
- Delete: `frontend/src/__tests__/components/epp-editor-view.test.ts`

- [ ] **Step 1: Delete the files**

```bash
rm frontend/src/components/epp-live-view.ts
rm frontend/src/components/epp-editor-view.ts
rm frontend/src/__tests__/components/epp-live-view.test.ts
rm frontend/src/__tests__/components/epp-editor-view.test.ts
```

- [ ] **Step 2: Commit**

```bash
git add -A frontend/src/components/epp-live-view.ts frontend/src/components/epp-editor-view.ts \
  frontend/src/__tests__/components/epp-live-view.test.ts frontend/src/__tests__/components/epp-editor-view.test.ts
git commit -m "refactor: delete inlined view wrapper components and their tests"
```

---

### Task 5: Update panel tests that reference the deleted components

**Files:**
- Modify: `frontend/src/__tests__/panel-view-wiring.test.ts`
- Modify: `frontend/src/__tests__/panel-render-views.test.ts`
- Modify: `frontend/src/__tests__/panel-event-handlers.test.ts`
- Modify: `frontend/src/__tests__/panel-dom-events.test.ts`
- Modify: `frontend/src/__tests__/panel-coverage-gaps.test.ts`
- Modify: `frontend/src/__tests__/panel-branch-coverage.test.ts`

These tests import the deleted view components and query for `<epp-live-view>` / `<epp-editor-view>` in the panel's shadow DOM. They need updating to query for `.panel` directly instead of piercing through the wrapper's shadow root.

- [ ] **Step 1: Update each test file**

For each file:
1. Remove imports of `epp-live-view.js` and `epp-editor-view.js`
2. Replace `shadowRoot.querySelector("epp-live-view")` with `shadowRoot.querySelector(".panel")` (or whatever the test was checking)
3. Remove `.shadowRoot` chains that pierced through the wrapper — the elements are now direct children of the panel's shadow root
4. Update any assertions about `<epp-live-view>` or `<epp-editor-view>` elements existing

The exact changes depend on what each test asserts. Read each test, understand what it's checking, and adjust the DOM queries.

- [ ] **Step 2: Run tests**

```bash
cd frontend && npx vitest run
```

Expected: all tests pass (some may need further query adjustments).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/__tests__/
git commit -m "test: update panel tests for inlined view wrappers"
```

---

### Task 6: Build, verify, and clean up

**Files:**
- Modify: `custom_components/eppgrid/frontend/eppgrid-panel.js` (auto-generated by build)

- [ ] **Step 1: Final build**

```bash
cd frontend && npm run build
```

- [ ] **Step 2: Verify in browser**

Load the panel in HA — confirm:
- Live overview grid is centered (matches the "before" screenshot)
- Editor view grid is centered
- Live menu (dots-vertical) works — opens/closes, items navigate correctly
- Zone editor sidebar works
- Furniture sidebar works

- [ ] **Step 3: Commit built output**

```bash
git add custom_components/eppgrid/frontend/eppgrid-panel.js
git commit -m "build: update compiled panel after inlining view wrappers"
```
