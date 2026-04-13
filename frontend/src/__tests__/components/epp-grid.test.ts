import { describe, expect, it } from "vitest";
import "../../components/epp-grid.js";
import type { EppGrid } from "../../components/epp-grid.js";
import type { FurnitureItem } from "../../lib/furniture.js";
import {
	CELL_INTERFERENCE_SUPPRESS,
	CELL_ROOM_BIT,
	cellSetInterference,
	cellSetZone,
	GRID_CELL_COUNT,
	initGridFromRoom,
} from "../../lib/grid.js";
import { ZONE_COLORS } from "../../lib/zone-defaults.js";
import type { Target } from "../../types.js";

function createGrid(overrides: Record<string, any> = {}): EppGrid {
	const el = document.createElement("epp-grid") as any;
	el.grid = initGridFromRoom(3000, 4000);
	el.zoneConfigs = new Array(7).fill(null);
	el.targets = [];
	el.roomWidth = 3000;
	el.roomDepth = 4000;
	el.perspective = [1, 0, 0, 0, 1, 0, 0, 0];
	el.furniture = [];
	el.selectedFurnitureId = null;
	el.sidebarTab = "zones";
	el.editable = false;
	el.activeZone = null;
	el.showHitCounts = false;
	el.occupancy = {};
	el.targetPrevXY = [];
	el.heatmapColors = null;
	el.localize = (k: string) => k;
	el.maxGridPx = 480;
	el.frozenBounds = null;
	Object.assign(el, overrides);
	return el as EppGrid;
}

const SAMPLE_FURNITURE: FurnitureItem = {
	id: "f1",
	type: "svg",
	icon: "armchair",
	label: "Chair",
	x: 100,
	y: 200,
	width: 800,
	height: 800,
	rotation: 0,
	lockAspect: false,
};

describe("epp-grid element", () => {
	it("is registered as a custom element", () => {
		expect(customElements.get("epp-grid")).toBeDefined();
	});

	it("creates with default properties", () => {
		const el = createGrid();
		expect(el.grid).toBeDefined();
		expect(el.editable).toBe(false);
		expect(el.occupancy).toEqual({});
	});

	it("reflects editable property to the editable attribute", async () => {
		// The CSS rules `:host(:not([editable]))` and `:host([editable])` rely
		// on the attribute being present, so the property must reflect.
		// Without reflection, the wrapper's overflow:hidden stays applied in
		// editor mode and clips overflowing children (e.g. the furniture
		// rotation handle that sits above its item).
		const el = createGrid({ editable: true });
		document.body.appendChild(el);
		await el.updateComplete;

		expect(el.hasAttribute("editable")).toBe(true);

		el.editable = false;
		await el.updateComplete;
		expect(el.hasAttribute("editable")).toBe(false);

		document.body.removeChild(el);
	});
});

describe("epp-grid render", () => {
	it("renders grid-targets-wrapper and grid divs", async () => {
		const el = createGrid();
		document.body.appendChild(el);
		await el.updateComplete;

		const wrapper = el.shadowRoot!.querySelector(".grid-targets-wrapper");
		expect(wrapper).not.toBeNull();

		const grid = el.shadowRoot!.querySelector(".grid");
		expect(grid).not.toBeNull();

		document.body.removeChild(el);
	});

	it("renders cells matching visible range", async () => {
		const el = createGrid();
		document.body.appendChild(el);
		await el.updateComplete;

		const cells = el.shadowRoot!.querySelectorAll(".cell");
		expect(cells.length).toBeGreaterThan(0);

		document.body.removeChild(el);
	});

	it("renders grid-dimensions when metrics available", async () => {
		const el = createGrid();
		document.body.appendChild(el);
		await el.updateComplete;

		const dims = el.shadowRoot!.querySelector(".grid-dimensions");
		expect(dims).not.toBeNull();

		document.body.removeChild(el);
	});

	it("renders no grid-dimensions when no room", async () => {
		const el = createGrid({ grid: new Uint8Array(GRID_CELL_COUNT) });
		document.body.appendChild(el);
		await el.updateComplete;

		const dims = el.shadowRoot!.querySelector(".grid-dimensions");
		// Empty grid has no metrics
		expect(dims).toBeNull();

		document.body.removeChild(el);
	});
});

describe("epp-grid cell events", () => {
	it("dispatches cell-paint down on mousedown", async () => {
		const el = createGrid({ editable: true });
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("cell-paint", (e) => events.push(e as CustomEvent));

		const cell = el.shadowRoot!.querySelector(".cell") as HTMLElement;
		expect(cell).not.toBeNull();
		cell.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

		expect(events.length).toBe(1);
		expect(events[0].detail.action).toBe("down");
		expect(typeof events[0].detail.index).toBe("number");

		document.body.removeChild(el);
	});

	it("dispatches cell-paint enter on mouseenter", async () => {
		const el = createGrid({ editable: true });
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("cell-paint", (e) => events.push(e as CustomEvent));

		const cell = el.shadowRoot!.querySelector(".cell") as HTMLElement;
		cell.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

		expect(events.length).toBe(1);
		expect(events[0].detail.action).toBe("enter");

		document.body.removeChild(el);
	});

	it("dispatches cell-paint up on mouseup on grid", async () => {
		const el = createGrid({ editable: true });
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("cell-paint", (e) => events.push(e as CustomEvent));

		const grid = el.shadowRoot!.querySelector(".grid") as HTMLElement;
		grid.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

		expect(events.length).toBe(1);
		expect(events[0].detail.action).toBe("up");

		document.body.removeChild(el);
	});
});

describe("epp-grid target rendering", () => {
	it("renders target dots for active targets", async () => {
		const targets: Target[] = [
			{ x: 1500, y: 2000, speed: 0, status: "active", signal: 7 },
		];
		const el = createGrid({ targets });
		document.body.appendChild(el);
		await el.updateComplete;

		const dots = el.shadowRoot!.querySelectorAll(".target-dot");
		expect(dots.length).toBe(1);

		document.body.removeChild(el);
	});

	it("does not render dots for inactive targets", async () => {
		const targets: Target[] = [
			{ x: 1500, y: 2000, speed: 0, status: "inactive", signal: 0 },
		];
		const el = createGrid({ targets });
		document.body.appendChild(el);
		await el.updateComplete;

		const dots = el.shadowRoot!.querySelectorAll(".target-dot");
		expect(dots.length).toBe(0);

		document.body.removeChild(el);
	});

	it("renders pending targets with reduced opacity", async () => {
		const targets: Target[] = [
			{ x: 1500, y: 2000, speed: 0, status: "pending", signal: 5 },
		];
		const el = createGrid({ targets });
		document.body.appendChild(el);
		await el.updateComplete;

		const dot = el.shadowRoot!.querySelector(".target-dot") as HTMLElement;
		expect(dot).not.toBeNull();
		expect(dot.style.opacity).toBe("0.3");

		document.body.removeChild(el);
	});

	it("renders signal badge for active targets with signal > 0", async () => {
		const targets: Target[] = [
			{ x: 1500, y: 2000, speed: 0, status: "active", signal: 7 },
		];
		const el = createGrid({ targets });
		document.body.appendChild(el);
		await el.updateComplete;

		const overlay = el.shadowRoot!.querySelector(
			".targets-overlay",
		) as HTMLElement;
		// Signal badge is a div with the signal number
		expect(overlay.textContent).toContain("7");

		document.body.removeChild(el);
	});

	it("falls back to targetPrevXY for pending targets off-grid", async () => {
		const targets: Target[] = [
			{ x: 999999, y: 999999, speed: 0, status: "pending", signal: 5 },
		];
		const el = createGrid({
			targets,
			targetPrevXY: [{ x: 1500, y: 2000 }],
		});
		document.body.appendChild(el);
		await el.updateComplete;

		// Should render the dot using the fallback position
		const dots = el.shadowRoot!.querySelectorAll(".target-dot");
		expect(dots.length).toBe(1);

		document.body.removeChild(el);
	});
});

describe("epp-grid occupancy", () => {
	it("applies box-shadow to occupied zone cells", async () => {
		const grid = initGridFromRoom(3000, 4000);
		const zoneConfigs = new Array(7).fill(null);
		zoneConfigs[0] = { name: "Zone 1", color: ZONE_COLORS[0], type: "normal" };

		// Paint zone 1 on inside cells
		for (let i = 0; i < grid.length; i++) {
			if (grid[i] & CELL_ROOM_BIT) {
				grid[i] = cellSetZone(grid[i], 1);
			}
		}

		const el = createGrid({
			grid,
			zoneConfigs,
			occupancy: { 1: true },
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const cells = el.shadowRoot!.querySelectorAll(
			".cell",
		) as NodeListOf<HTMLElement>;
		// At least one cell should have box-shadow for occupancy
		const hasOccupancyShadow = Array.from(cells).some((c) =>
			c.style.cssText.includes("box-shadow"),
		);
		expect(hasOccupancyShadow).toBe(true);

		document.body.removeChild(el);
	});
});

describe("epp-grid heatmap", () => {
	it("applies heatmap overlay to zone cells", async () => {
		const grid = initGridFromRoom(3000, 4000);
		const zoneConfigs = new Array(7).fill(null);
		zoneConfigs[0] = { name: "Zone 1", color: ZONE_COLORS[0], type: "normal" };

		for (let i = 0; i < grid.length; i++) {
			if (grid[i] & CELL_ROOM_BIT) {
				grid[i] = cellSetZone(grid[i], 1);
			}
		}

		const heatmapColors = new Map<number, string>();
		heatmapColors.set(1, "rgba(255,0,0,0.5)");

		const el = createGrid({
			grid,
			zoneConfigs,
			showHitCounts: true,
			heatmapColors,
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const cells = el.shadowRoot!.querySelectorAll(
			".cell",
		) as NodeListOf<HTMLElement>;
		const hasGradient = Array.from(cells).some((c) =>
			c.style.background.includes("linear-gradient"),
		);
		expect(hasGradient).toBe(true);

		document.body.removeChild(el);
	});
});

describe("epp-grid furniture overlay", () => {
	it("renders furniture overlay when furniture provided", async () => {
		const el = createGrid({
			furniture: [SAMPLE_FURNITURE],
			sidebarTab: "furniture",
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const overlay = el.shadowRoot!.querySelector("epp-furniture-overlay");
		expect(overlay).not.toBeNull();

		document.body.removeChild(el);
	});

	it("does not render furniture overlay when empty", async () => {
		const el = createGrid({ furniture: [] });
		document.body.appendChild(el);
		await el.updateComplete;

		const overlay = el.shadowRoot!.querySelector("epp-furniture-overlay");
		expect(overlay).toBeNull();

		document.body.removeChild(el);
	});

	it("re-emits furniture-select event", async () => {
		const el = createGrid({
			furniture: [SAMPLE_FURNITURE],
			sidebarTab: "furniture",
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("furniture-select", (e) =>
			events.push(e as CustomEvent),
		);

		const overlay = el.shadowRoot!.querySelector(
			"epp-furniture-overlay",
		) as any;
		overlay.dispatchEvent(
			new CustomEvent("furniture-select", {
				detail: "f1",
				bubbles: true,
				composed: true,
			}),
		);

		expect(events.length).toBe(1);
		expect(events[0].detail).toBe("f1");

		document.body.removeChild(el);
	});

	it("re-emits furniture-delete event", async () => {
		const el = createGrid({
			furniture: [SAMPLE_FURNITURE],
			sidebarTab: "furniture",
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("furniture-delete", (e) =>
			events.push(e as CustomEvent),
		);

		const overlay = el.shadowRoot!.querySelector(
			"epp-furniture-overlay",
		) as any;
		overlay.dispatchEvent(
			new CustomEvent("furniture-delete", {
				detail: "f1",
				bubbles: true,
				composed: true,
			}),
		);

		expect(events.length).toBe(1);
		expect(events[0].detail).toBe("f1");

		document.body.removeChild(el);
	});

	it("re-emits furniture-pointer-down event", async () => {
		const el = createGrid({
			furniture: [SAMPLE_FURNITURE],
			sidebarTab: "furniture",
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("furniture-pointer-down", (e) =>
			events.push(e as CustomEvent),
		);

		const overlay = el.shadowRoot!.querySelector(
			"epp-furniture-overlay",
		) as any;
		overlay.dispatchEvent(
			new CustomEvent("furniture-pointer-down", {
				detail: {
					e: new PointerEvent("pointerdown"),
					id: "f1",
					type: "move",
				},
				bubbles: true,
				composed: true,
			}),
		);

		expect(events.length).toBe(1);
		expect(events[0].detail.id).toBe("f1");

		document.body.removeChild(el);
	});
});

describe("epp-grid darkness (sensor FOV)", () => {
	it("renders dark background for cells outside sensor FOV", async () => {
		// Perspective: sensor at centre-top (1500,0), looking down (+Y)
		// h = [1,0,1500, 0,1,0, 0,0] → identity with x-offset 1500
		const perspective = [1, 0, 1500, 0, 1, 0, 0, 0];
		const el = createGrid({
			perspective,
			maxRangeMm: 6000,
			roomWidth: 3000,
			roomDepth: 4000,
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const cells = el.shadowRoot!.querySelectorAll(
			".cell",
		) as NodeListOf<HTMLElement>;
		const hasDarkCell = Array.from(cells).some((c) =>
			c.style.cssText.includes("c8c8c8"),
		);
		expect(hasDarkCell).toBe(true);

		document.body.removeChild(el);
	});

	it("no dark cells when perspective is null", async () => {
		const el = createGrid({
			perspective: null,
			maxRangeMm: 6000,
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const cells = el.shadowRoot!.querySelectorAll(
			".cell",
		) as NodeListOf<HTMLElement>;
		const hasDarkCell = Array.from(cells).some((c) =>
			c.style.cssText.includes("c8c8c8"),
		);
		expect(hasDarkCell).toBe(false);

		document.body.removeChild(el);
	});

	it("cells beyond maxRangeMm get dark background", async () => {
		// Sensor at centre-top looking down, tiny range = 500mm
		const perspective = [1, 0, 1500, 0, 1, 0, 0, 0];
		const el = createGrid({
			perspective,
			maxRangeMm: 500,
			roomWidth: 3000,
			roomDepth: 4000,
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const cells = el.shadowRoot!.querySelectorAll(
			".cell",
		) as NodeListOf<HTMLElement>;
		const darkCount = Array.from(cells).filter((c) =>
			c.style.cssText.includes("c8c8c8"),
		).length;
		// With 500mm range, most cells should be dark
		expect(darkCount).toBeGreaterThan(cells.length / 2);

		document.body.removeChild(el);
	});

	it("does not emit cell-paint for dark cells on mousedown", async () => {
		const perspective = [1, 0, 1500, 0, 1, 0, 0, 0];
		const el = createGrid({
			perspective,
			maxRangeMm: 6000,
			roomWidth: 3000,
			roomDepth: 4000,
			editable: true,
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("cell-paint", (e) => events.push(e as CustomEvent));

		const cells = el.shadowRoot!.querySelectorAll(
			".cell",
		) as NodeListOf<HTMLElement>;
		const darkCell = Array.from(cells).find((c) =>
			c.style.cssText.includes("c8c8c8"),
		);
		expect(darkCell).toBeDefined();
		darkCell!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

		expect(events.length).toBe(0);

		document.body.removeChild(el);
	});

	it("does not render interference stripes on dark cells", async () => {
		const perspective = [1, 0, 1500, 0, 1, 0, 0, 0];
		const grid = initGridFromRoom(3000, 4000);
		// Set interference on ALL inside cells so any dark inside cell would show stripes
		for (let i = 0; i < grid.length; i++) {
			if (grid[i] & CELL_ROOM_BIT) {
				grid[i] = cellSetInterference(grid[i], 1);
			}
		}
		const el = createGrid({
			perspective,
			maxRangeMm: 6000,
			roomWidth: 3000,
			roomDepth: 4000,
			grid,
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const cells = el.shadowRoot!.querySelectorAll(
			".cell",
		) as NodeListOf<HTMLElement>;
		// Dark cells should NOT have interference stripes (#cc3333)
		const darkWithStripes = Array.from(cells).filter(
			(c) =>
				c.style.cssText.includes("c8c8c8") &&
				c.style.cssText.includes("cc3333"),
		);
		expect(darkWithStripes.length).toBe(0);

		document.body.removeChild(el);
	});
});

describe("epp-grid target-click event", () => {
	it("dispatches target-click event when target dot is clicked", async () => {
		const targets: Target[] = [
			{ x: 1500, y: 2000, speed: 0, status: "active", signal: 7 },
		];
		const el = createGrid({ targets });
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("target-click", (e) => events.push(e as CustomEvent));

		const dot = el.shadowRoot!.querySelector(".target-dot") as HTMLElement;
		expect(dot).not.toBeNull();
		dot.click();

		expect(events.length).toBe(1);
		expect(events[0].detail.targetIndex).toBe(0);
		expect(events[0].detail.x).toBe(1500);
		expect(events[0].detail.y).toBe(2000);

		document.body.removeChild(el);
	});
});

describe("epp-grid target dot cursor guard", () => {
	it("target dot has clickable class when not editable", async () => {
		const targets: Target[] = [
			{ x: 1500, y: 2000, speed: 0, status: "active", signal: 7 },
		];
		const el = createGrid({ targets, editable: false });
		document.body.appendChild(el);
		await el.updateComplete;

		const dot = el.shadowRoot!.querySelector(".target-dot") as HTMLElement;
		expect(dot).not.toBeNull();
		expect(dot.classList.contains("clickable")).toBe(true);

		document.body.removeChild(el);
	});

	it("target dot does not have clickable class when editable", async () => {
		const targets: Target[] = [
			{ x: 1500, y: 2000, speed: 0, status: "active", signal: 7 },
		];
		const el = createGrid({ targets, editable: true });
		document.body.appendChild(el);
		await el.updateComplete;

		const dot = el.shadowRoot!.querySelector(".target-dot") as HTMLElement;
		expect(dot).not.toBeNull();
		expect(dot.classList.contains("clickable")).toBe(false);

		document.body.removeChild(el);
	});

	it("click on target dot in edit mode does not dispatch target-click", async () => {
		const targets: Target[] = [
			{ x: 1500, y: 2000, speed: 0, status: "active", signal: 7 },
		];
		const el = createGrid({ targets, editable: true });
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("target-click", (e) => events.push(e as CustomEvent));

		const dot = el.shadowRoot!.querySelector(".target-dot") as HTMLElement;
		dot.click();

		expect(events.length).toBe(0);

		document.body.removeChild(el);
	});
});

describe("epp-grid frozenBounds", () => {
	it("uses frozenBounds when set", async () => {
		const el = createGrid({
			frozenBounds: { minCol: 5, maxCol: 15, minRow: 2, maxRow: 12 },
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const cells = el.shadowRoot!.querySelectorAll(".cell");
		// 11 cols * 11 rows = 121 cells
		expect(cells.length).toBe(121);

		document.body.removeChild(el);
	});
});

describe("epp-grid dismissedTargets", () => {
	// For roomWidth=3000, roomDepth=4000, GRID_CELL_MM=300:
	//   startCol = floor((20-10)/2) = 5
	//   target x=1500, y=2000 → col=10, row=6.67 → idx = 6*20+10 = 130
	//   target x=1800, y=2000 → col=11, row=6.67 → idx = 6*20+11 = 131

	it("hides a target whose dismissed cell matches its current cell", async () => {
		const targets: Target[] = [
			{ x: 1500, y: 2000, speed: 0, status: "active", signal: 7 },
		];
		// Target is at cell 130 — dismissed at cell 130 → should be hidden
		const dismissedTargets = new Map([[0, 130]]);
		const el = createGrid({ targets, dismissedTargets });
		document.body.appendChild(el);
		await el.updateComplete;

		const dots = el.shadowRoot!.querySelectorAll(".target-dot");
		expect(dots.length).toBe(0);

		document.body.removeChild(el);
	});

	it("shows a target that has moved away from its dismissed cell and dispatches target-undismissed", async () => {
		const targets: Target[] = [
			{ x: 1800, y: 2000, speed: 0, status: "active", signal: 7 },
		];
		// Target is now at cell 131, but was dismissed at cell 130 → should render and clear
		const dismissedTargets = new Map([[0, 130]]);
		const el = createGrid({ targets, dismissedTargets });
		document.body.appendChild(el);
		await el.updateComplete;

		// Dot should be visible
		const dots = el.shadowRoot!.querySelectorAll(".target-dot");
		expect(dots.length).toBe(1);

		// Dismiss entry should be cleared
		expect(el.dismissedTargets.has(0)).toBe(false);

		document.body.removeChild(el);
	});

	it("dispatches target-undismissed event when target moves away from dismissed cell", async () => {
		const targets: Target[] = [
			{ x: 1800, y: 2000, speed: 0, status: "active", signal: 7 },
		];
		// Target is now at cell 131, but was dismissed at cell 130
		const dismissedTargets = new Map([[0, 130]]);
		const el = createGrid({ targets, dismissedTargets });
		document.body.appendChild(el);

		const events: CustomEvent[] = [];
		el.addEventListener("target-undismissed", (e) =>
			events.push(e as CustomEvent),
		);

		await el.updateComplete;

		expect(events.length).toBe(1);
		expect(events[0].detail.targetIndex).toBe(0);

		document.body.removeChild(el);
	});
});

describe("epp-grid interference target suppression", () => {
	// For roomWidth=3000, roomDepth=4000: target at x=1500,y=2000 → cell 130
	// cell 130 is inside the room (CELL_ROOM_BIT set by initGridFromRoom)

	it("hides a target on an interference cell when zone is not occupied", async () => {
		const grid = initGridFromRoom(3000, 4000);
		// Cell 130: set interference level 1 (zone stays 0 = unoccupied)
		grid[130] = cellSetInterference(grid[130], 1);

		const targets: Target[] = [
			{ x: 1500, y: 2000, speed: 0, status: "active", signal: 7 },
		];
		const el = createGrid({ targets, grid, occupancy: {} });
		document.body.appendChild(el);
		await el.updateComplete;

		const dots = el.shadowRoot!.querySelectorAll(".target-dot");
		expect(dots.length).toBe(0);

		document.body.removeChild(el);
	});

	it("shows a target on an interference cell when the zone IS occupied", async () => {
		const grid = initGridFromRoom(3000, 4000);
		// Cell 130: set interference level 1 AND zone 1
		grid[130] = cellSetInterference(grid[130], 1);
		grid[130] = cellSetZone(grid[130], 1);

		const targets: Target[] = [
			{ x: 1500, y: 2000, speed: 0, status: "active", signal: 7 },
		];
		// Zone 1 is occupied
		const el = createGrid({ targets, grid, occupancy: { 1: true } });
		document.body.appendChild(el);
		await el.updateComplete;

		const dots = el.shadowRoot!.querySelectorAll(".target-dot");
		expect(dots.length).toBe(1);

		document.body.removeChild(el);
	});
});

describe("epp-grid interference stripes", () => {
	/** Return the first cell that has an interference stripe style. */
	function findInterferenceCell(el: EppGrid): HTMLElement | null {
		const cells = el.shadowRoot!.querySelectorAll(
			".cell",
		) as NodeListOf<HTMLElement>;
		for (const c of cells) {
			if (c.style.cssText.includes("cc3333")) return c;
		}
		return null;
	}

	function buildGridWithInterference(level: number): Uint8Array {
		const grid = initGridFromRoom(3000, 4000);
		for (let i = 0; i < grid.length; i++) {
			if (grid[i] & CELL_ROOM_BIT) {
				grid[i] = cellSetInterference(grid[i], level);
			}
		}
		return grid;
	}

	it("renders -45deg cc3333 stripe for interference (level 1)", async () => {
		const grid = buildGridWithInterference(1);
		const el = createGrid({ grid });
		document.body.appendChild(el);
		await el.updateComplete;

		const cell = findInterferenceCell(el);
		expect(cell).not.toBeNull();
		const style = cell!.style.cssText;
		expect(style).toContain("-45deg");
		expect(style).toContain("#cc3333");
		// Single stripe pattern — not a cross-hatch
		expect(style.match(/-45deg/g)?.length).toBe(1);

		document.body.removeChild(el);
	});

	it("renders cross-hatch (both -45deg and 45deg) for suppress interference", async () => {
		const grid = buildGridWithInterference(CELL_INTERFERENCE_SUPPRESS);
		const el = createGrid({ grid });
		document.body.appendChild(el);
		await el.updateComplete;

		const cell = findInterferenceCell(el);
		expect(cell).not.toBeNull();
		const style = cell!.style.cssText;
		expect(style).toContain("-45deg");
		expect(style).toContain("45deg");
		expect(style).toContain("#cc3333");

		document.body.removeChild(el);
	});

	it("does not render interference stripes on outside cells", async () => {
		// Build a grid where all cells are outside (no CELL_ROOM_BIT) but have
		// interference bits set manually — outside cells must not show stripes.
		const grid = new Uint8Array(GRID_CELL_COUNT);
		for (let i = 0; i < grid.length; i++) {
			// Set interference level 1 without room bit
			grid[i] = cellSetInterference(grid[i], 1);
		}
		const el = createGrid({ grid });
		document.body.appendChild(el);
		await el.updateComplete;

		const cell = findInterferenceCell(el);
		expect(cell).toBeNull();

		document.body.removeChild(el);
	});
});
