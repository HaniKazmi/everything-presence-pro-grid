/**
 * Tests for panel <-> child-component event wiring.
 *
 * Each test renders the panel, finds a child element, dispatches a
 * CustomEvent, then asserts the panel state changed accordingly.
 */

import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import "../components/epp-editor-view.js";
import "../components/epp-furniture-overlay.js";
import "../components/epp-furniture-sidebar.js";
import "../components/epp-grid.js";
import "../components/epp-live-sidebar.js";
import "../components/epp-live-view.js";
import "../components/epp-settings-view.js";
import "../components/epp-wizard.js";
import "../components/epp-zone-sidebar.js";
import { GRID_CELL_COUNT, GRID_COLS, initGridFromRoom } from "../lib/grid.js";
import { ZONE_TYPE_DEFAULTS } from "../lib/zone-defaults.js";
import { createZoneEngineState } from "../lib/zone-engine.js";

function createPanel(): EPPGridPanel {
	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	el.hass = {
		callWS: vi.fn().mockResolvedValue({}),
		connection: { subscribeMessage: vi.fn().mockResolvedValue(() => {}) },
	};
	const a = el as any;
	a._grid = initGridFromRoom(3000, 4000);
	a._zoneConfigs = new Array(7).fill(null);
	a._activeZone = 0;
	a._dirty = false;
	a._loading = false;
	a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
	a._roomWidth = 3000;
	a._roomDepth = 4000;
	a._furniture = [];
	a._selectedFurnitureId = null;
	a._view = "live";
	a._devices = [
		{
			mac: "AA:BB:CC:DD:EE:01",
			name: "T",
			host: null,
			available: true,
			configured: true,
			config_protocol_status: "compatible",
		},
	];
	a._selectedMac = "AA:BB:CC:DD:EE:01";
	a._targets = [];
	a._sensorState = {
		occupancy: false,
		static_presence: false,
		motion_presence: false,
		target_presence: false,
		illuminance: 150,
		temperature: 22.5,
		humidity: 45,
		co2: 400,
	};
	a._zoneState = { occupancy: {}, target_counts: {}, frame_count: 0 };
	a._openAccordions = new Set();
	a._showUnsavedDialog = false;
	a._pendingNavigation = null;
	a._saving = false;
	a._showDeleteCalibrationDialog = false;
	a._showTemplateSave = false;
	a._showTemplateLoad = false;
	a._reportingConfig = {};
	a._offsetsConfig = {};
	a._targetAutoRange = true;
	a._targetMaxDistance = 6;
	a._staticAutoRange = true;
	a._staticMinDistance = 0.3;
	a._staticMaxDistance = 16;
	a._roomType = "normal";
	a._roomTrigger = ZONE_TYPE_DEFAULTS.normal.trigger;
	a._roomRenew = ZONE_TYPE_DEFAULTS.normal.renew;
	a._roomTimeout = ZONE_TYPE_DEFAULTS.normal.timeout;
	a._roomHandoffTimeout = ZONE_TYPE_DEFAULTS.normal.handoff_timeout;
	a._roomEntryPoint = false;
	a._showHitCounts = false;
	a._zoneEngineState = createZoneEngineState();
	a._showCustomIconPicker = false;
	a._customIconValue = "";
	a._isPainting = false;
	a._frozenBounds = null;
	a._sidebarTab = "zones";
	a._setupStep = null;
	a._wizardCornerIndex = 0;
	a._wizardCorners = [null, null, null, null];
	a._wizardRoomWidth = 3000;
	a._wizardRoomDepth = 4000;
	a._wizardCapturing = false;
	a._wizardCaptureProgress = 0;
	a._wizardCapturePaused = false;
	a._wizardCaptureCancelled = false;
	a._wizardOffsetSide = "";
	a._wizardOffsetFb = "";
	a._wizardSaving = false;
	a._templateName = "";
	a._fovCache = null;
	a._fovPerspective = null;
	return el;
}

const containers: HTMLDivElement[] = [];

afterEach(() => {
	for (const c of containers) c.remove();
	containers.length = 0;
});

function renderPanel(el: EPPGridPanel): HTMLDivElement {
	const container = document.createElement("div");
	document.body.appendChild(container);
	containers.push(container);
	render((el as any).render(), container);
	return container;
}

// =========================================================
// 1. Editor view event wiring
// =========================================================
describe("Editor view event wiring", () => {
	function editorPanel(): [EPPGridPanel, HTMLDivElement] {
		const el = createPanel();
		const a = el as any;
		a._view = "editor";
		const container = renderPanel(el);
		return [el, container];
	}

	it("zone-select sets _activeZone", () => {
		const [el, container] = editorPanel();
		const editorView = container.querySelector("epp-editor-view")!;
		editorView.dispatchEvent(
			new CustomEvent("zone-select", { detail: { zone: 3 }, bubbles: true }),
		);
		expect((el as any)._activeZone).toBe(3);
	});

	it("zone-add calls _addZone", () => {
		const [el, container] = editorPanel();
		const spy = vi.spyOn(el as any, "_addZone");
		const editorView = container.querySelector("epp-editor-view")!;
		editorView.dispatchEvent(new CustomEvent("zone-add", { bubbles: true }));
		expect(spy).toHaveBeenCalled();
	});

	it("zone-remove calls _removeZone with slot", () => {
		const [el, container] = editorPanel();
		const spy = vi.spyOn(el as any, "_removeZone");
		const editorView = container.querySelector("epp-editor-view")!;
		editorView.dispatchEvent(
			new CustomEvent("zone-remove", {
				detail: { slot: 2 },
				bubbles: true,
			}),
		);
		expect(spy).toHaveBeenCalledWith(2);
	});

	it("zone-config-change updates _zoneConfigs[0].trigger", () => {
		const [el, container] = editorPanel();
		const a = el as any;
		// Set a non-null zone config at index 0
		a._zoneConfigs[0] = {
			name: "Zone 1",
			color: "#ff0000",
			type: "normal",
			trigger: 5,
			renew: 2,
			timeout: 10,
			handoff_timeout: 2,
			entry_point: false,
		};
		// Re-render with the zone config in place
		const container2 = renderPanel(el);
		const editorView = container2.querySelector("epp-editor-view")!;
		editorView.dispatchEvent(
			new CustomEvent("zone-config-change", {
				detail: { index: 0, updates: { trigger: 8 } },
				bubbles: true,
			}),
		);
		expect(a._zoneConfigs[0].trigger).toBe(8);
	});

	it("room-config-change updates _roomType", () => {
		const [el, container] = editorPanel();
		const editorView = container.querySelector("epp-editor-view")!;
		editorView.dispatchEvent(
			new CustomEvent("room-config-change", {
				detail: { updates: { roomType: "rest" } },
				bubbles: true,
			}),
		);
		expect((el as any)._roomType).toBe("rest");
	});

	it("room-config-change updates all room fields", () => {
		const [el, container] = editorPanel();
		const a = el as any;
		const editorView = container.querySelector("epp-editor-view")!;
		editorView.dispatchEvent(
			new CustomEvent("room-config-change", {
				detail: {
					updates: {
						roomTrigger: 3,
						roomRenew: 2,
						roomTimeout: 5,
						roomHandoffTimeout: 1,
						roomEntryPoint: true,
					},
				},
				bubbles: true,
			}),
		);
		expect(a._roomTrigger).toBe(3);
		expect(a._roomRenew).toBe(2);
		expect(a._roomTimeout).toBe(5);
		expect(a._roomHandoffTimeout).toBe(1);
		expect(a._roomEntryPoint).toBe(true);
	});

	it("dirty sets _dirty to true", () => {
		const [el, container] = editorPanel();
		const editorView = container.querySelector("epp-editor-view")!;
		editorView.dispatchEvent(new CustomEvent("dirty", { bubbles: true }));
		expect((el as any)._dirty).toBe(true);
	});

	it("furniture-add calls _addFurniture", () => {
		const [el, container] = editorPanel();
		const spy = vi.spyOn(el as any, "_addFurniture");
		const editorView = container.querySelector("epp-editor-view")!;
		editorView.dispatchEvent(
			new CustomEvent("furniture-add", {
				detail: { type: "svg", icon: "armchair" },
				bubbles: true,
			}),
		);
		expect(spy).toHaveBeenCalledWith({ type: "svg", icon: "armchair" });
	});

	it("furniture-remove calls _removeFurniture", () => {
		const [el, container] = editorPanel();
		const spy = vi.spyOn(el as any, "_removeFurniture");
		const editorView = container.querySelector("epp-editor-view")!;
		editorView.dispatchEvent(
			new CustomEvent("furniture-remove", {
				detail: "furn-1",
				bubbles: true,
			}),
		);
		expect(spy).toHaveBeenCalledWith("furn-1");
	});

	it("furniture-update calls _updateFurniture", () => {
		const [el, container] = editorPanel();
		const spy = vi.spyOn(el as any, "_updateFurniture");
		const editorView = container.querySelector("epp-editor-view")!;
		editorView.dispatchEvent(
			new CustomEvent("furniture-update", {
				detail: { id: "f1", updates: { x: 500 } },
				bubbles: true,
			}),
		);
		expect(spy).toHaveBeenCalledWith("f1", { x: 500 });
	});

	it("custom-icon-toggle toggles _showCustomIconPicker", () => {
		const [el, container] = editorPanel();
		const a = el as any;
		expect(a._showCustomIconPicker).toBe(false);
		const editorView = container.querySelector("epp-editor-view")!;
		editorView.dispatchEvent(
			new CustomEvent("custom-icon-toggle", { bubbles: true }),
		);
		expect(a._showCustomIconPicker).toBe(true);
	});

	it("custom-icon-change sets _customIconValue", () => {
		const [el, container] = editorPanel();
		const editorView = container.querySelector("epp-editor-view")!;
		editorView.dispatchEvent(
			new CustomEvent("custom-icon-change", {
				detail: "mdi:sofa",
				bubbles: true,
			}),
		);
		expect((el as any)._customIconValue).toBe("mdi:sofa");
	});

	it("editor-panel-click sets _activeZone to null when not just painted", () => {
		const [el, container] = editorPanel();
		const a = el as any;
		a._justPainted = false;
		a._activeZone = 2;
		const editorView = container.querySelector("epp-editor-view")!;
		editorView.dispatchEvent(
			new CustomEvent("editor-panel-click", { bubbles: true }),
		);
		expect(a._activeZone).toBeNull();
	});

	it("editor-grid-container-click sets _selectedFurnitureId to null", () => {
		const [el, container] = editorPanel();
		const a = el as any;
		a._selectedFurnitureId = "furn-42";
		const editorView = container.querySelector("epp-editor-view")!;
		editorView.dispatchEvent(
			new CustomEvent("editor-grid-container-click", { bubbles: true }),
		);
		expect(a._selectedFurnitureId).toBeNull();
	});
});

// =========================================================
// 2. Live overview event wiring
// =========================================================
describe("Live overview event wiring", () => {
	function livePanel(): [EPPGridPanel, HTMLDivElement] {
		const el = createPanel();
		const a = el as any;
		a._view = "live";
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		const container = renderPanel(el);
		return [el, container];
	}

	it("navigate-view updates _view and _sidebarTab", () => {
		const [el, container] = livePanel();
		const liveView = container.querySelector("epp-live-view")!;
		liveView.dispatchEvent(
			new CustomEvent("navigate-view", {
				detail: { view: "editor", sidebarTab: "furniture" },
				bubbles: true,
			}),
		);
		expect((el as any)._view).toBe("editor");
		expect((el as any)._sidebarTab).toBe("furniture");
	});

	it("live-view-action change-placement calls _changePlacement", () => {
		const [el, container] = livePanel();
		const spy = vi.spyOn(el as any, "_changePlacement");
		const liveView = container.querySelector("epp-live-view")!;
		liveView.dispatchEvent(
			new CustomEvent("live-view-action", {
				detail: { action: "change-placement" },
				bubbles: true,
			}),
		);
		expect(spy).toHaveBeenCalled();
	});

	it("live-view-action show-delete-calibration sets dialog flag", () => {
		const [el, container] = livePanel();
		const liveView = container.querySelector("epp-live-view")!;
		liveView.dispatchEvent(
			new CustomEvent("live-view-action", {
				detail: { action: "show-delete-calibration" },
				bubbles: true,
			}),
		);
		expect((el as any)._showDeleteCalibrationDialog).toBe(true);
	});

	it("live-view-action show-template-save sets flag", () => {
		const [el, container] = livePanel();
		const liveView = container.querySelector("epp-live-view")!;
		liveView.dispatchEvent(
			new CustomEvent("live-view-action", {
				detail: { action: "show-template-save" },
				bubbles: true,
			}),
		);
		expect((el as any)._showTemplateSave).toBe(true);
	});

	it("live-view-action show-template-load sets flag", () => {
		const [el, container] = livePanel();
		const liveView = container.querySelector("epp-live-view")!;
		liveView.dispatchEvent(
			new CustomEvent("live-view-action", {
				detail: { action: "show-template-load" },
				bubbles: true,
			}),
		);
		expect((el as any)._showTemplateLoad).toBe(true);
	});

	it("uncalibrated wizard start-calibration calls _changePlacement", async () => {
		const el = createPanel();
		const a = el as any;
		a._view = "live";
		a._perspective = null; // uncalibrated
		const container = renderPanel(el);
		const spy = vi.spyOn(el as any, "_changePlacement");
		// The epp-wizard is rendered inside epp-live-view's shadow DOM
		// (passed as .gridTemplate). We need the live view to complete
		// its own render cycle so that the wizard appears in its shadow DOM.
		const liveView = container.querySelector("epp-live-view")!;
		expect(liveView).not.toBeNull();
		// Trigger the live view's Lit update cycle
		await liveView.updateComplete;
		const wizard = liveView.shadowRoot?.querySelector("epp-wizard");
		expect(wizard).not.toBeNull();
		wizard!.dispatchEvent(
			new CustomEvent("start-calibration", { bubbles: true }),
		);
		expect(spy).toHaveBeenCalled();
	});
});

// =========================================================
// 3. Settings view event wiring
// =========================================================
describe("Settings view event wiring", () => {
	function settingsPanel(): [EPPGridPanel, HTMLDivElement] {
		const el = createPanel();
		const a = el as any;
		a._view = "settings";
		const container = renderPanel(el);
		return [el, container];
	}

	it("accordion-toggle updates _openAccordions", () => {
		const [el, container] = settingsPanel();
		const settingsView = container.querySelector("epp-settings-view")!;
		const newSet = new Set(["detection"]);
		settingsView.dispatchEvent(
			new CustomEvent("accordion-toggle", {
				detail: newSet,
				bubbles: true,
			}),
		);
		expect((el as any)._openAccordions).toBe(newSet);
	});

	it("setting-change updates the keyed property", () => {
		const [el, container] = settingsPanel();
		const settingsView = container.querySelector("epp-settings-view")!;
		settingsView.dispatchEvent(
			new CustomEvent("setting-change", {
				detail: { key: "targetMaxDistance", value: 4 },
				bubbles: true,
			}),
		);
		expect((el as any)._targetMaxDistance).toBe(4);
	});

	it("dirty sets _dirty to true", () => {
		const [el, container] = settingsPanel();
		const settingsView = container.querySelector("epp-settings-view")!;
		settingsView.dispatchEvent(new CustomEvent("dirty", { bubbles: true }));
		expect((el as any)._dirty).toBe(true);
	});

	it("cancel resets _dirty and _view and reloads config", () => {
		const [el, container] = settingsPanel();
		const a = el as any;
		a._dirty = true;
		const loadSpy = vi
			.spyOn(a, "_loadDeviceConfig")
			.mockResolvedValue(undefined);
		const settingsView = container.querySelector("epp-settings-view")!;
		settingsView.dispatchEvent(new CustomEvent("cancel", { bubbles: true }));
		expect(a._dirty).toBe(false);
		expect(a._view).toBe("live");
		expect(loadSpy).toHaveBeenCalledWith("AA:BB:CC:DD:EE:01");
	});
});

// =========================================================
// 4. Wizard completion event wiring
// =========================================================
describe("Wizard completion event wiring", () => {
	function wizardPanel(): [EPPGridPanel, HTMLDivElement] {
		const el = createPanel();
		const a = el as any;
		a._setupStep = "guide";
		const container = renderPanel(el);
		return [el, container];
	}

	it("calibration-complete sets perspective, dimensions, clears setupStep, goes live", () => {
		const [el, container] = wizardPanel();
		const a = el as any;
		const wizard = container.querySelector("epp-wizard")!;
		wizard.dispatchEvent(
			new CustomEvent("calibration-complete", {
				detail: {
					perspective: [1, 0, 0, 0, 1, 0, 0, 0],
					roomWidth: 4000,
					roomDepth: 5000,
				},
				bubbles: true,
			}),
		);
		expect(a._perspective).toEqual([1, 0, 0, 0, 1, 0, 0, 0]);
		expect(a._roomWidth).toBe(4000);
		expect(a._roomDepth).toBe(5000);
		expect(a._setupStep).toBeNull();
		expect(a._view).toBe("live");
	});

	it("calibration-complete initializes grid from room dimensions", () => {
		const [el, container] = wizardPanel();
		const a = el as any;
		const wizard = container.querySelector("epp-wizard")!;
		wizard.dispatchEvent(
			new CustomEvent("calibration-complete", {
				detail: {
					perspective: [1, 0, 0, 0, 1, 0, 0, 0],
					roomWidth: 4000,
					roomDepth: 5000,
				},
				bubbles: true,
			}),
		);
		// Grid should match initGridFromRoom(4000, 5000)
		const expected = initGridFromRoom(4000, 5000);
		expect(a._grid).toEqual(expected);
	});

	it("wizard-cancel clears _setupStep", () => {
		const [el, container] = wizardPanel();
		const a = el as any;
		const wizard = container.querySelector("epp-wizard")!;
		wizard.dispatchEvent(new CustomEvent("wizard-cancel", { bubbles: true }));
		expect(a._setupStep).toBeNull();
	});
});

// =========================================================
// 5. Navigation guards (direct method calls)
// =========================================================
describe("Navigation guards", () => {
	it("_changePlacement when not dirty sets _setupStep to guide", () => {
		const el = createPanel();
		const a = el as any;
		a._dirty = false;
		a._changePlacement();
		expect(a._setupStep).toBe("guide");
	});

	it("_changePlacement when dirty shows unsaved dialog", () => {
		const el = createPanel();
		const a = el as any;
		a._dirty = true;
		a._changePlacement();
		expect(a._showUnsavedDialog).toBe(true);
	});

	it("_initGridFromRoom produces grid with correct length", () => {
		const el = createPanel();
		const a = el as any;
		a._roomWidth = 3000;
		a._roomDepth = 4000;
		a._initGridFromRoom();
		expect(a._grid.length).toBe(GRID_CELL_COUNT);
		// Verify it matches the standalone function
		const expected = initGridFromRoom(3000, 4000);
		expect(a._grid).toEqual(expected);
	});
});
