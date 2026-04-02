/**
 * Tests for _markGhost — clicking a target dot on the live grid view
 * increments the interference level on that target's cell.
 */
import { describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import { mapTargetToGridCell } from "../lib/coordinates.js";
import {
	CELL_INTERFERENCE_SUPPRESS,
	cellInterference,
	cellSetInterference,
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

describe("_markGhost", () => {
	it("increments interference from 0 to 1", async () => {
		const a = createPanel() as any;
		// Stub applyLayout to avoid real WS calls
		a._gridCtrl = { applyLayout: vi.fn().mockResolvedValue(undefined) };
		const { x, y, idx } = insideCellCoords(3000, 4000);

		// Verify cell starts at interference 0
		expect(cellInterference(a._grid[idx])).toBe(0);

		await a._markGhost(x, y);

		expect(cellInterference(a._grid[idx])).toBe(1);
		expect(a._dirty).toBe(true);
	});

	it("increments from 1 to 2 to 3 to suppress", async () => {
		const a = createPanel() as any;
		a._gridCtrl = { applyLayout: vi.fn().mockResolvedValue(undefined) };
		const { x, y, idx } = insideCellCoords(3000, 4000);

		// Set interference to 1
		a._grid[idx] = cellSetInterference(a._grid[idx], 1);
		await a._markGhost(x, y);
		expect(cellInterference(a._grid[idx])).toBe(2);

		// Now at 2 -> 3
		await a._markGhost(x, y);
		expect(cellInterference(a._grid[idx])).toBe(3);

		// Now at 3 -> suppress (7)
		await a._markGhost(x, y);
		expect(cellInterference(a._grid[idx])).toBe(CELL_INTERFERENCE_SUPPRESS);
	});

	it("does nothing when already suppressed", async () => {
		const a = createPanel() as any;
		a._gridCtrl = { applyLayout: vi.fn().mockResolvedValue(undefined) };
		const { x, y, idx } = insideCellCoords(3000, 4000);

		a._grid[idx] = cellSetInterference(
			a._grid[idx],
			CELL_INTERFERENCE_SUPPRESS,
		);
		const before = a._grid[idx];

		await a._markGhost(x, y);

		expect(a._grid[idx]).toBe(before);
		expect(a._gridCtrl.applyLayout).not.toHaveBeenCalled();
	});

	it("does nothing for outside-room cells", async () => {
		const a = createPanel() as any;
		a._gridCtrl = { applyLayout: vi.fn().mockResolvedValue(undefined) };

		// Use coordinates that map to an outside cell (0,0 is typically outside)
		// With roomWidth=3000 roomDepth=4000, x=0 y=0 maps to the start col
		// which may or may not be inside. Use a completely outside coordinate.
		// Target coords that map far outside the room:
		await a._markGhost(-1000, -1000);

		expect(a._gridCtrl.applyLayout).not.toHaveBeenCalled();
		expect(a._dirty).toBe(false);
	});

	it("calls applyLayout to persist", async () => {
		const a = createPanel() as any;
		const applyLayout = vi.fn().mockResolvedValue(undefined);
		a._gridCtrl = { applyLayout };
		const { x, y } = insideCellCoords(3000, 4000);

		await a._markGhost(x, y);

		expect(applyLayout).toHaveBeenCalledOnce();
	});

	it("does nothing for invalid room dimensions", async () => {
		const a = createPanel() as any;
		a._gridCtrl = { applyLayout: vi.fn().mockResolvedValue(undefined) };
		a._roomWidth = 0;
		a._roomDepth = 0;

		await a._markGhost(1500, 2000);

		expect(a._gridCtrl.applyLayout).not.toHaveBeenCalled();
	});

	it("does nothing for out-of-bounds grid coordinates", async () => {
		const a = createPanel() as any;
		a._gridCtrl = { applyLayout: vi.fn().mockResolvedValue(undefined) };

		// Very large coordinates that would map beyond the grid
		await a._markGhost(99999, 99999);

		expect(a._gridCtrl.applyLayout).not.toHaveBeenCalled();
	});
});
