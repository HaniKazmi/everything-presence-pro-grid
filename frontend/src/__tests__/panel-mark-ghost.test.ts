/**
 * Tests for the target context menu methods on EPPGridPanel:
 *   _targetCellIndex, _setInterference, _dismissTarget,
 *   _showTargetMenu, _closeTargetMenu
 */
import { describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import { mapTargetToGridCell } from "../lib/coordinates.js";
import {
	CELL_INTERFERENCE_SUPPRESS,
	cellInterference,
	GRID_COLS,
	initGridFromRoom,
} from "../lib/grid.js";
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
			name: "Test Sensor",
			host: null,
			available: true,
			configured: true,
		},
	];
	a._selectedMac = "AA:BB:CC:DD:EE:01";
	a._targets = [];
	a._rawTargets = [];
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
	a._entitiesConfig = {};
	a._temperatureOffset = 0;
	a._humidityOffset = 0;
	a._illuminanceOffset = 0;
	a._motionTimeout = 5;
	a._staticTimeout = 30;
	a._staticTriggerThreshold = 3;
	a._staticRenewThreshold = 3;
	a._staticOnDelay = 0;
	a._targetAutoDistance = true;
	a._targetMaxDistance = 6;
	a._staticAutoDistance = true;
	a._staticMinDistance = 0.3;
	a._staticMaxDistance = 16;
	a._roomType = "normal";
	a._roomTrigger = ZONE_TYPE_DEFAULTS.normal.trigger;
	a._roomRenew = ZONE_TYPE_DEFAULTS.normal.renew;
	a._roomTimeout = ZONE_TYPE_DEFAULTS.normal.timeout;
	a._roomHandoffTimeout = ZONE_TYPE_DEFAULTS.normal.handoff_timeout;
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
	a._targetMenu = null;
	a._dismissedTargets = new Map();
	return el;
}

/** Find a cell position (x, y in mm) that maps to a known inside cell. */
function insideCellCoords(
	roomWidth: number,
	roomDepth: number,
): { x: number; y: number; col: number; row: number; idx: number } {
	const pos = mapTargetToGridCell(
		roomWidth / 2,
		roomDepth / 2,
		roomWidth,
		roomDepth,
	)!;
	const col = Math.floor(pos.col);
	const row = Math.floor(pos.row);
	return {
		x: roomWidth / 2,
		y: roomDepth / 2,
		col,
		row,
		idx: row * GRID_COLS + col,
	};
}

/** Build a valid targetMenu detail for a given position. */
function makeMenuDetail(
	x: number,
	y: number,
	targetIndex = 0,
): { targetIndex: number; x: number; y: number; pctX: number; pctY: number } {
	return { targetIndex, x, y, pctX: 50, pctY: 50 };
}

describe("_targetCellIndex", () => {
	it("returns correct cell index for inside-room coordinates", () => {
		const a = createPanel() as any;
		const { x, y, idx } = insideCellCoords(3000, 4000);
		expect(a._targetCellIndex(x, y)).toBe(idx);
	});

	it("returns -1 for coordinates outside the room bounds", () => {
		const a = createPanel() as any;
		expect(a._targetCellIndex(-9999, -9999)).toBe(-1);
	});

	it("returns -1 when roomWidth/roomDepth are zero", () => {
		const a = createPanel() as any;
		a._roomWidth = 0;
		a._roomDepth = 0;
		expect(a._targetCellIndex(1500, 2000)).toBe(-1);
	});
});

describe("_showTargetMenu", () => {
	it("sets _targetMenu to the provided detail", () => {
		const a = createPanel() as any;
		const detail = makeMenuDetail(1500, 2000, 0);
		a._showTargetMenu(detail);
		expect(a._targetMenu).toEqual(detail);
	});
});

describe("_closeTargetMenu", () => {
	it("clears _targetMenu to null", () => {
		const a = createPanel() as any;
		a._targetMenu = makeMenuDetail(1500, 2000, 0);
		a._closeTargetMenu();
		expect(a._targetMenu).toBeNull();
	});
});

describe("_dismissTarget", () => {
	it("adds target to _dismissedTargets, sends WS command, and closes menu", async () => {
		const a = createPanel() as any;
		const { x, y, idx } = insideCellCoords(3000, 4000);
		a._targetMenu = makeMenuDetail(x, y, 2);

		await a._dismissTarget();

		expect(a._dismissedTargets.get(2)).toBe(idx);
		expect(a._targetMenu).toBeNull();
		expect(a.hass.callWS).toHaveBeenCalledWith({
			type: "eppgrid/dismiss_target",
			mac: "AA:BB:CC:DD:EE:01",
			target_index: 2,
			cell_index: idx,
		});
	});

	it("does nothing when _targetMenu is null", async () => {
		const a = createPanel() as any;
		a._targetMenu = null;
		await a._dismissTarget();
		expect(a._dismissedTargets.size).toBe(0);
		expect(a.hass.callWS).not.toHaveBeenCalled();
	});

	it("still closes menu even if cell index is invalid", async () => {
		const a = createPanel() as any;
		// Use out-of-bounds coords so _targetCellIndex returns -1
		a._targetMenu = makeMenuDetail(-9999, -9999, 0);
		await a._dismissTarget();
		// idx < 0, so target is not added to the map
		expect(a._dismissedTargets.size).toBe(0);
		// menu is closed
		expect(a._targetMenu).toBeNull();
		// No WS call for invalid cell
		expect(a.hass.callWS).not.toHaveBeenCalled();
	});

	it("still dismisses locally if WS call fails", async () => {
		const a = createPanel() as any;
		a.hass.callWS = vi.fn().mockRejectedValue(new Error("network error"));
		const { x, y, idx } = insideCellCoords(3000, 4000);
		a._targetMenu = makeMenuDetail(x, y, 1);

		await a._dismissTarget();

		expect(a._dismissedTargets.get(1)).toBe(idx);
		expect(a._targetMenu).toBeNull();
	});
});

describe("_setInterference", () => {
	it("sets interference level 1 on the target's cell and calls applyLayout", async () => {
		const a = createPanel() as any;
		a._gridCtrl = { applyLayout: vi.fn().mockResolvedValue(undefined) };
		const { x, y, idx } = insideCellCoords(3000, 4000);
		a._targetMenu = makeMenuDetail(x, y, 0);

		expect(cellInterference(a._grid[idx])).toBe(0);

		await a._setInterference(1);

		expect(cellInterference(a._grid[idx])).toBe(1);
		expect(a._dirty).toBe(true);
		expect(a._gridCtrl.applyLayout).toHaveBeenCalledOnce();
		expect(a._targetMenu).toBeNull();
	});

	it("sets suppress level on the target's cell", async () => {
		const a = createPanel() as any;
		a._gridCtrl = { applyLayout: vi.fn().mockResolvedValue(undefined) };
		const { x, y, idx } = insideCellCoords(3000, 4000);
		a._targetMenu = makeMenuDetail(x, y, 0);

		await a._setInterference(CELL_INTERFERENCE_SUPPRESS);

		expect(cellInterference(a._grid[idx])).toBe(CELL_INTERFERENCE_SUPPRESS);
		expect(a._gridCtrl.applyLayout).toHaveBeenCalledOnce();
	});

	it("does nothing when _targetMenu is null", async () => {
		const a = createPanel() as any;
		a._gridCtrl = { applyLayout: vi.fn().mockResolvedValue(undefined) };
		a._targetMenu = null;

		await a._setInterference(1);

		expect(a._gridCtrl.applyLayout).not.toHaveBeenCalled();
		expect(a._dirty).toBe(false);
	});

	it("does nothing for outside-room cells and closes menu", async () => {
		const a = createPanel() as any;
		a._gridCtrl = { applyLayout: vi.fn().mockResolvedValue(undefined) };
		// Use a target position that is outside the room
		a._targetMenu = makeMenuDetail(-1000, -1000, 0);

		await a._setInterference(1);

		expect(a._gridCtrl.applyLayout).not.toHaveBeenCalled();
		expect(a._dirty).toBe(false);
		expect(a._targetMenu).toBeNull();
	});

	it("does nothing for out-of-bounds grid coordinates and closes menu", async () => {
		const a = createPanel() as any;
		a._gridCtrl = { applyLayout: vi.fn().mockResolvedValue(undefined) };
		a._targetMenu = makeMenuDetail(99999, 99999, 0);

		await a._setInterference(1);

		expect(a._gridCtrl.applyLayout).not.toHaveBeenCalled();
		expect(a._dirty).toBe(false);
		expect(a._targetMenu).toBeNull();
	});
});
