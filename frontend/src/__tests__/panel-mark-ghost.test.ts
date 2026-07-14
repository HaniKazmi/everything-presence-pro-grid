/**
 * Tests for the target context menu methods on EPPGridPanel:
 *   _targetCellIndex, _setOverlay, _dismissTarget,
 *   _showTargetMenu, _closeTargetMenu
 */
import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import { mapTargetToGridCell } from "../lib/coordinates.js";
import {
	CELL_OVERLAY_INTERFERENCE,
	CELL_OVERLAY_NONE,
	CELL_OVERLAY_SUPPRESS,
	cellOverlay,
	GRID_COLS,
	initGridFromRoom,
} from "../lib/grid.js";
import { createZoneEngineState } from "../lib/zone-engine.js";

function createPanel(): EPPGridPanel {
	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	el.hass = {
		callWS: vi.fn().mockResolvedValue({}),
		connection: { subscribeMessage: vi.fn().mockResolvedValue(() => {}) },
	};
	const a = el as any;
	a._grid = initGridFromRoom(3000, 4000);
	a._zoneConfigs = [
		{ type: "default", trigger: 5, renew: 3, timeout: 10, handoff_timeout: 3 },
		null,
		null,
		null,
		null,
		null,
		null,
		null,
	];
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
	a._navGuard._pendingNavigation = null;
	a._saving = false;
	a._showDeleteCalibrationDialog = false;
	a._showConfigurationBackup = false;
	a._showConfigurationRestore = false;
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
	// Zone 0 defaults live on _zoneConfigs[0]; set up above.
	a._zoneEngineState = createZoneEngineState();
	a._showCustomIconPicker = false;
	a._customIconValue = "";
	a._isPainting = false;
	a._frozenBounds = null;
	a._sidebarTab = "zones";
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
	a._configurationName = "";
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

/**
 * Build a valid _targetMenu STATE for a given room position. x/y are the room
 * coordinates the cell-index lookups run off; menuX/menuY are where the menu is
 * drawn (px relative to `.grid-container`).
 */
function makeMenuDetail(
	x: number,
	y: number,
	targetIndex = 0,
): { targetIndex: number; x: number; y: number; menuX: number; menuY: number } {
	return { targetIndex, x, y, menuX: 40, menuY: 60 };
}

/** Build a `target-click` EVENT detail as <epp-grid> dispatches it. */
function makeClickDetail(
	x: number,
	y: number,
	clientX: number,
	clientY: number,
): {
	targetIndex: number;
	x: number;
	y: number;
	clientX: number;
	clientY: number;
} {
	return { targetIndex: 0, x, y, clientX, clientY };
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
	it("keeps the target's room coordinates for the cell-index lookups", () => {
		const a = createPanel() as any;
		a._showTargetMenu(makeClickDetail(1500, 2000, 800, 400));
		expect(a._targetMenu.targetIndex).toBe(0);
		expect(a._targetMenu.x).toBe(1500);
		expect(a._targetMenu.y).toBe(2000);
	});

	it("anchors the menu to the DOT, in px relative to the card", async () => {
		// The menu renders inside `.grid-container` (position: relative), but the map
		// is centred inside that card and is smaller than it in BOTH axes — so the
		// event's percentages-of-the-map put the menu hundreds of px from its dot
		// (#338). The panel converts the dot's client-space centre into the card's
		// coordinate space instead.
		const el = createPanel();
		document.body.appendChild(el);
		await el.updateComplete;
		await new Promise((r) => setTimeout(r, 0));
		const a = el as any;
		// connectedCallback -> _initialize() copies the (empty) controller device list
		// back over the seed, so re-seed AFTER mounting (and after that async pass) to
		// get the live view — and therefore the card — rendered.
		a._devices = [
			{
				mac: "AA:BB:CC:DD:EE:01",
				name: "Test Sensor",
				host: null,
				available: true,
				configured: true,
				firmware_status: "compatible",
			},
		];
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._loading = false;
		await el.updateComplete;

		const card = el.shadowRoot!.querySelector(".grid-container");
		expect(card).not.toBeNull();
		// happy-dom has no layout, so hand the card a box to be offset by — a BORDER
		// box (what getBoundingClientRect reports) plus the 1px border the real card
		// has. The menu is absolutely positioned, so its left/top resolve against the
		// card's PADDING box: the border has to come off too, or every menu sits 1px
		// down and right of its dot.
		(card as HTMLElement).getBoundingClientRect = () =>
			({ left: 100, top: 40 }) as DOMRect;
		Object.defineProperty(card, "clientLeft", { value: 1 });
		Object.defineProperty(card, "clientTop", { value: 1 });

		a._showTargetMenu(makeClickDetail(1500, 2000, 800, 400));
		expect(a._targetMenu.menuX).toBe(699);
		expect(a._targetMenu.menuY).toBe(359);

		el.remove();
	});

	it("falls back to client coordinates when the card is not rendered yet", () => {
		// Unmounted panel: no shadow root, so no card to be relative to.
		const a = createPanel() as any;
		a._showTargetMenu(makeClickDetail(1500, 2000, 800, 400));
		expect(a._targetMenu.menuX).toBe(800);
		expect(a._targetMenu.menuY).toBe(400);
	});
});

describe("the target menu closes when its layout moves", () => {
	/** One record per ResizeObserver the panel (or the grid) constructs. */
	type Rec = { cb: () => void; targets: Element[]; disconnected: boolean };

	/**
	 * happy-dom ships a ResizeObserver that never invokes its callback (it has no
	 * layout engine), so swap in one we can drive by hand. Returns the recorder plus
	 * the restore fn.
	 */
	function fakeResizeObserver(): {
		instances: Rec[];
		restore: () => void;
	} {
		const instances: Rec[] = [];
		const RealRO = globalThis.ResizeObserver;
		globalThis.ResizeObserver = class {
			rec: Rec;
			constructor(cb: () => void) {
				this.rec = { cb, targets: [], disconnected: false };
				instances.push(this.rec);
			}
			observe(target: Element) {
				this.rec.targets.push(target);
			}
			unobserve() {}
			disconnect() {
				this.rec.disconnected = true;
			}
		} as unknown as typeof ResizeObserver;
		return {
			instances,
			restore: () => {
				globalThis.ResizeObserver = RealRO;
			},
		};
	}

	/**
	 * Mount the panel on the live view and hand back the observer that is watching
	 * the CARD (`.grid-container`) — <epp-grid> observes itself too, so asserting on
	 * "some observer" would prove nothing.
	 */
	async function mountAndFindCardObserver(
		instances: Rec[],
	): Promise<{ el: EPPGridPanel; a: any; cardObs: Rec }> {
		const el = createPanel();
		document.body.appendChild(el);
		await el.updateComplete;
		await new Promise((r) => setTimeout(r, 0));
		const a = el as any;
		// connectedCallback -> _initialize() copies the (empty) controller device list
		// back over createPanel()'s seed, so re-seed AFTER mounting (and after that
		// async pass) to get the live view — and therefore the card — rendered.
		a._devices = [
			{
				mac: "AA:BB:CC:DD:EE:01",
				name: "Test Sensor",
				host: null,
				available: true,
				configured: true,
				firmware_status: "compatible",
			},
		];
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._loading = false;
		await el.updateComplete;

		const card = el.shadowRoot!.querySelector(".grid-container");
		expect(card).not.toBeNull();
		const cardObs = instances.find((i) => i.targets.includes(card as Element));
		expect(cardObs).toBeDefined();
		return { el, a, cardObs: cardObs as Rec };
	}

	it("closes when its CARD's box changes with no window resize, and disconnects on unmount", async () => {
		// Docking/undocking the HA sidebar is an IN-PAGE layout change: the panel's
		// column reflows and the map moves, but NO window 'resize' event fires (HA's
		// own Lovelace layout uses a ResizeObserver for exactly this reason). So watch
		// the box the menu is actually anchored to: `.grid-container`, its positioning
		// context.
		const ro = fakeResizeObserver();
		try {
			const { el, a, cardObs } = await mountAndFindCardObserver(ro.instances);

			a._targetMenu = makeMenuDetail(1500, 2000, 0);
			cardObs.cb(); // the card's box changed; the window's did not
			expect(a._targetMenu).toBeNull();

			// And the observer goes away with the panel — HA destroys and recreates
			// this panel on rebuild and on its 5-minute hidden-suspend, so an observer
			// left connected leaks one instance (and its closure over the panel) per
			// cycle.
			el.remove();
			expect(cardObs.disconnected).toBe(true);
		} finally {
			ro.restore();
		}
	});

	it("closes on a viewport resize through the CARD's box, not through a window listener", async () => {
		// A viewport change moves the map out from under the menu, so the menu must go
		// — but the mechanism is the card observer, not a `window.resize` hook. The
		// card is `flex: 1` of a height-bounded column, so a viewport change resizes it
		// and the observer fires (proved for real in the Chromium suite: "closes on
		// window resize" in browser/grid-layout.browser.test.ts). A window hook
		// alongside it was strictly redundant: the menu's anchor snapshot is
		// CARD-relative, so a viewport change that does NOT move the card cannot
		// invalidate it.
		const ro = fakeResizeObserver();
		try {
			const { el, a, cardObs } = await mountAndFindCardObserver(ro.instances);

			a._targetMenu = makeMenuDetail(1500, 2000, 0);
			// A bare window resize is not itself a trigger — nothing listens for it.
			window.dispatchEvent(new Event("resize"));
			expect(a._targetMenu).not.toBeNull();

			// What a real viewport change does: the card's box changes, the observer
			// fires, the menu closes.
			cardObs.cb();
			expect(a._targetMenu).toBeNull();
			el.remove();
		} finally {
			ro.restore();
		}
	});
});

describe("_renderTargetMenu positioning", () => {
	it("positions the menu in px, not in percentages of the wrong box", () => {
		const a = createPanel() as any;
		a._targetMenu = {
			targetIndex: 0,
			x: 1500,
			y: 2000,
			menuX: 231,
			menuY: 117,
		};
		const c = document.createElement("div");
		render(a._renderTargetMenu(), c);
		const menu = c.querySelector(".target-menu") as HTMLElement;
		expect(menu.getAttribute("style")).toBe("left: 231px; top: 117px;");
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

describe("_setOverlay", () => {
	it("sets interference overlay on the target's cell and persists via WS without dirty/view-switch", async () => {
		const a = createPanel() as any;
		a._gridCtrl = { applyLayout: vi.fn().mockResolvedValue(undefined) };
		a._view = "live";
		const { x, y, idx } = insideCellCoords(3000, 4000);
		a._targetMenu = makeMenuDetail(x, y, 0);

		expect(cellOverlay(a._grid[idx])).toBe(CELL_OVERLAY_NONE);

		await a._setOverlay(CELL_OVERLAY_INTERFERENCE);

		expect(cellOverlay(a._grid[idx])).toBe(CELL_OVERLAY_INTERFERENCE);
		// One-shot save: should not mark the layout dirty or switch views
		expect(a._dirty).toBe(false);
		expect(a._view).toBe("live");
		// Should not go through applyLayout (which has side effects)
		expect(a._gridCtrl.applyLayout).not.toHaveBeenCalled();
		// Should call set_room_layout WS endpoint directly
		const callWS = a.hass.callWS as ReturnType<typeof vi.fn>;
		expect(callWS).toHaveBeenCalledWith(
			expect.objectContaining({ type: "eppgrid/set_room_layout" }),
		);
		expect(a._targetMenu).toBeNull();
	});

	it("sets suppress overlay on the target's cell", async () => {
		const a = createPanel() as any;
		a._gridCtrl = { applyLayout: vi.fn().mockResolvedValue(undefined) };
		const { x, y, idx } = insideCellCoords(3000, 4000);
		a._targetMenu = makeMenuDetail(x, y, 0);

		await a._setOverlay(CELL_OVERLAY_SUPPRESS);

		expect(cellOverlay(a._grid[idx])).toBe(CELL_OVERLAY_SUPPRESS);
		expect(
			(a.hass.callWS as ReturnType<typeof vi.fn>).mock.calls[0][0].type,
		).toBe("eppgrid/set_room_layout");
	});

	it("includes serialized furniture in the WS payload", async () => {
		const a = createPanel() as any;
		const { x, y } = insideCellCoords(3000, 4000);
		a._furniture = [
			{
				id: "f1",
				type: "icon",
				icon: "mdi:sofa",
				label: "Sofa",
				x: 100,
				y: 200,
				width: 600,
				height: 400,
				rotation: 30,
				lockAspect: false,
			},
		];
		a._targetMenu = makeMenuDetail(x, y, 0);

		await a._setOverlay(CELL_OVERLAY_INTERFERENCE);

		const callArg = (a.hass.callWS as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		expect(callArg.furniture).toEqual([
			{
				type: "icon",
				icon: "mdi:sofa",
				label: "Sofa",
				x: 100,
				y: 200,
				width: 600,
				height: 400,
				rotation: 30,
				lockAspect: false,
			},
		]);
	});

	it("reverts grid mutation when WS save fails", async () => {
		const a = createPanel() as any;
		const { x, y, idx } = insideCellCoords(3000, 4000);
		const before = a._grid[idx];
		a.hass.callWS = vi.fn().mockRejectedValue(new Error("boom"));
		a._targetMenu = makeMenuDetail(x, y, 0);

		await a._setOverlay(CELL_OVERLAY_INTERFERENCE);

		expect(cellOverlay(a._grid[idx])).toBe(cellOverlay(before));
		expect(a._dirty).toBe(false);
	});

	it("rollback only reverts the mutated cell — preserves concurrent edits", async () => {
		const a = createPanel() as any;
		const { x, y, idx } = insideCellCoords(3000, 4000);
		// Pick a different inside cell on the same row.
		const otherIdx = idx + 1;
		const otherOriginal = a._grid[otherIdx];
		const ourOriginal = a._grid[idx];

		// Resolve the WS save AFTER the test makes a concurrent edit.
		let resolveWs: (() => void) | undefined;
		a.hass.callWS = vi.fn().mockImplementation(
			() =>
				new Promise<void>((_resolve, reject) => {
					resolveWs = () => reject(new Error("boom"));
				}),
		);
		a._targetMenu = makeMenuDetail(x, y, 0);

		const setOverlayPromise = a._setOverlay(CELL_OVERLAY_INTERFERENCE);

		// While the WS call is "in flight", simulate the user editing
		// another cell on the same grid.
		const concurrentEdit = new Uint8Array(a._grid);
		concurrentEdit[otherIdx] = 0xff;
		a._grid = concurrentEdit;

		// Now reject the WS save.
		resolveWs!();
		await setOverlayPromise;

		// Our optimistic cell rolled back to its original value…
		expect(cellOverlay(a._grid[idx])).toBe(cellOverlay(ourOriginal));
		// …but the concurrent edit on the OTHER cell survived.
		expect(a._grid[otherIdx]).toBe(0xff);
		expect(a._grid[otherIdx]).not.toBe(otherOriginal);
	});

	it("does nothing when _targetMenu is null", async () => {
		const a = createPanel() as any;
		a._gridCtrl = { applyLayout: vi.fn().mockResolvedValue(undefined) };
		a._targetMenu = null;

		await a._setOverlay(CELL_OVERLAY_INTERFERENCE);

		expect(a._gridCtrl.applyLayout).not.toHaveBeenCalled();
		expect(a._dirty).toBe(false);
	});

	it("does nothing for outside-room cells and closes menu", async () => {
		const a = createPanel() as any;
		a._gridCtrl = { applyLayout: vi.fn().mockResolvedValue(undefined) };
		a._targetMenu = makeMenuDetail(-1000, -1000, 0);

		await a._setOverlay(CELL_OVERLAY_INTERFERENCE);

		expect(a._gridCtrl.applyLayout).not.toHaveBeenCalled();
		expect(a._dirty).toBe(false);
		expect(a._targetMenu).toBeNull();
	});

	it("does nothing for out-of-bounds grid coordinates and closes menu", async () => {
		const a = createPanel() as any;
		a._gridCtrl = { applyLayout: vi.fn().mockResolvedValue(undefined) };
		a._targetMenu = makeMenuDetail(99999, 99999, 0);

		await a._setOverlay(CELL_OVERLAY_INTERFERENCE);

		expect(a._gridCtrl.applyLayout).not.toHaveBeenCalled();
		expect(a._dirty).toBe(false);
		expect(a._targetMenu).toBeNull();
	});
});

describe("_renderTargetMenu inline handlers", () => {
	function renderMenu(a: any): HTMLDivElement {
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(a._renderTargetMenu(), c);
		return c;
	}

	it("backdrop click closes the menu", () => {
		const a = createPanel() as any;
		a._targetMenu = makeMenuDetail(1500, 2000, 0);
		const c = renderMenu(a);
		(c.querySelector(".target-menu-backdrop") as HTMLElement).click();
		expect(a._targetMenu).toBeNull();
		document.body.removeChild(c);
	});

	it("menu items dispatch dismiss / interference / suppress actions", async () => {
		const a = createPanel() as any;
		const { x, y, idx } = insideCellCoords(3000, 4000);
		a._targetMenu = makeMenuDetail(x, y, 0);
		const c = renderMenu(a);

		const items = c.querySelectorAll(".target-menu-item");
		expect(items.length).toBe(3);

		// Dismiss
		(items[0] as HTMLElement).click();
		await vi.waitFor(() => {
			expect(a._dismissedTargets.get(0)).toBe(idx);
		});

		// Mark interference
		a._targetMenu = makeMenuDetail(x, y, 0);
		(items[1] as HTMLElement).click();
		await vi.waitFor(() => {
			expect(cellOverlay(a._grid[idx])).toBe(CELL_OVERLAY_INTERFERENCE);
		});

		// Suppress detection
		a._targetMenu = makeMenuDetail(x, y, 0);
		(items[2] as HTMLElement).click();
		await vi.waitFor(() => {
			expect(cellOverlay(a._grid[idx])).toBe(CELL_OVERLAY_SUPPRESS);
		});

		document.body.removeChild(c);
	});
});
