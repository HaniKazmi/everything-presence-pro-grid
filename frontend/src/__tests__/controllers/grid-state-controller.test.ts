import { beforeEach, describe, expect, it, vi } from "vitest";
import { GridStateController } from "../../controllers/grid-state-controller.js";
import type { FurnitureItem, FurnitureSticker } from "../../lib/furniture.js";
import {
	CELL_INTERFERENCE_SHIFT,
	CELL_ROOM_BIT,
	cellInterference,
	GRID_CELL_COUNT,
	MAX_ZONES,
} from "../../lib/grid.js";
import { ZONE_COLORS, type ZoneConfig } from "../../lib/zone-defaults.js";

// Build a minimal host with all properties the controller reads/writes
function mockHost(overrides: Record<string, any> = {}) {
	return {
		// ReactiveControllerHost
		requestUpdate: vi.fn(),
		addController: vi.fn(),
		removeController: vi.fn(),
		updateComplete: Promise.resolve(true),
		// Grid
		_grid: new Uint8Array(GRID_CELL_COUNT),
		_roomWidth: 3000,
		_roomDepth: 3000,
		_activeZone: null as number | null,
		_isPainting: false,
		_frozenBounds: null as any,
		_paintAction: "set" as "set" | "clear",
		_justPainted: false,
		_dirty: false,
		_sidebarTab: "zones",
		_selectedFurnitureId: null as string | null,
		_dragState: null as any,
		// Overlays
		_overlayMode: null as string | null,
		_interferenceLevel: 1,
		// Zones
		_zoneConfigs: Array.from(
			{ length: MAX_ZONES },
			() => null,
		) as (ZoneConfig | null)[],
		// Furniture
		_furniture: [] as FurnitureItem[],
		// Templates
		_templateName: "",
		_showTemplateSave: false,
		_showTemplateLoad: false,
		// Misc
		_view: "edit",
		_saving: false,
		shadowRoot: null,
		...overrides,
	};
}

describe("GridStateController", () => {
	let host: ReturnType<typeof mockHost>;
	let ctrl: GridStateController;

	beforeEach(() => {
		host = mockHost();
		ctrl = new GridStateController(host);
		localStorage.clear();
	});

	// =========================================================================
	// Construction
	// =========================================================================
	describe("constructor", () => {
		it("registers itself with the host", () => {
			expect(host.addController).toHaveBeenCalledWith(ctrl);
		});

		it("stores the host reference", () => {
			// Verify the controller can operate on the host by exercising a simple
			// method — the private `host` reference was set correctly.
			host._zoneConfigs = [null, null, null, null, null, null, null];
			ctrl.addZone();
			expect(host._zoneConfigs[0]).not.toBeNull();
		});
	});

	// =========================================================================
	// addZone()
	// =========================================================================
	describe("addZone()", () => {
		it("fills the first empty slot", () => {
			ctrl.addZone();
			expect(host._zoneConfigs[0]).not.toBeNull();
			expect(host._zoneConfigs[0]!.name).toBe("Zone 1");
		});

		it("uses the first unused color", () => {
			ctrl.addZone();
			expect(host._zoneConfigs[0]!.color).toBe(ZONE_COLORS[0]);
		});

		it("skips already-used colors when picking a color", () => {
			// Manually occupy slot 0 with the first color
			host._zoneConfigs[0] = {
				name: "Zone 1",
				color: ZONE_COLORS[0],
				type: "normal",
			};
			ctrl.addZone(); // should fill slot 1
			expect(host._zoneConfigs[1]!.color).toBe(ZONE_COLORS[1]);
		});

		it("sets _activeZone to the 1-based slot number", () => {
			ctrl.addZone();
			expect(host._activeZone).toBe(1);
		});

		it("marks the host as dirty", () => {
			ctrl.addZone();
			expect(host._dirty).toBe(true);
		});

		it("fills a gap rather than always using slot 0", () => {
			// Occupy slots 0 and 2 so slot 1 is the first empty
			host._zoneConfigs[0] = {
				name: "Zone 1",
				color: ZONE_COLORS[0],
				type: "normal",
			};
			host._zoneConfigs[2] = {
				name: "Zone 3",
				color: ZONE_COLORS[2],
				type: "normal",
			};
			ctrl.addZone();
			expect(host._zoneConfigs[1]).not.toBeNull();
			expect(host._activeZone).toBe(2);
		});

		it("does nothing when all slots are full", () => {
			host._zoneConfigs = ZONE_COLORS.map((color, i) => ({
				name: `Zone ${i + 1}`,
				color,
				type: "normal" as const,
			}));
			ctrl.addZone();
			// _dirty would only be set if a zone was actually added — it was already false
			expect(host._dirty).toBe(false);
		});
	});

	// =========================================================================
	// removeZone(slot)
	// =========================================================================
	describe("removeZone(slot)", () => {
		beforeEach(() => {
			// Add a zone in slot 1
			host._zoneConfigs[0] = {
				name: "Zone 1",
				color: ZONE_COLORS[0],
				type: "normal",
			};
			host._activeZone = 1;
		});

		it("nulls out the slot", () => {
			ctrl.removeZone(1);
			expect(host._zoneConfigs[0]).toBeNull();
		});

		it("clears all grid cells painted with that zone", () => {
			// Paint a few cells with zone 1 (bit pattern: inside=1, zone=1 → 0x03)
			const grid = new Uint8Array(GRID_CELL_COUNT);
			grid[10] = 0x03; // inside, zone 1
			grid[20] = 0x03;
			host._grid = grid;
			ctrl.removeZone(1);
			// Zone bits should be cleared — cell should be plain inside (0x01) or outside (0x00)
			expect((host._grid[10] & 0x0e) >> 1).toBe(0); // zone bits == 0
			expect((host._grid[20] & 0x0e) >> 1).toBe(0);
		});

		it("clears _activeZone when it matches the removed slot", () => {
			host._activeZone = 1;
			ctrl.removeZone(1);
			expect(host._activeZone).toBeNull();
		});

		it("leaves _activeZone unchanged when a different slot is removed", () => {
			host._zoneConfigs[1] = {
				name: "Zone 2",
				color: ZONE_COLORS[1],
				type: "normal",
			};
			host._activeZone = 1;
			ctrl.removeZone(2);
			expect(host._activeZone).toBe(1);
		});

		it("marks the host as dirty", () => {
			ctrl.removeZone(1);
			expect(host._dirty).toBe(true);
		});

		it("calls requestUpdate", () => {
			ctrl.removeZone(1);
			expect(host.requestUpdate).toHaveBeenCalled();
		});

		it("does nothing for out-of-range slots", () => {
			ctrl.removeZone(0);
			ctrl.removeZone(MAX_ZONES + 1);
			expect(host._dirty).toBe(false);
		});

		it("does nothing when the slot is already null", () => {
			ctrl.removeZone(2); // slot 2 is null
			expect(host._dirty).toBe(false);
		});
	});

	// =========================================================================
	// addFurniture(sticker)
	// =========================================================================
	describe("addFurniture(sticker)", () => {
		const sticker: FurnitureSticker = {
			type: "icon",
			icon: "mdi:sofa",
			label: "furniture.sofa",
			defaultWidth: 600,
			defaultHeight: 400,
			lockAspect: false,
		};

		it("adds a new item to the furniture list", () => {
			ctrl.addFurniture(sticker);
			expect(host._furniture).toHaveLength(1);
		});

		it("creates an item with the correct type and icon", () => {
			ctrl.addFurniture(sticker);
			const item = host._furniture[0] as FurnitureItem;
			expect(item.type).toBe("icon");
			expect(item.icon).toBe("mdi:sofa");
			expect(item.label).toBe("furniture.sofa");
		});

		it("creates an item with a unique id", () => {
			ctrl.addFurniture(sticker);
			ctrl.addFurniture(sticker);
			const ids = (host._furniture as FurnitureItem[]).map((f) => f.id);
			expect(new Set(ids).size).toBe(2);
		});

		it("selects the newly added item", () => {
			ctrl.addFurniture(sticker);
			expect(host._selectedFurnitureId).toBe(
				(host._furniture[0] as FurnitureItem).id,
			);
		});

		it("marks the host as dirty", () => {
			ctrl.addFurniture(sticker);
			expect(host._dirty).toBe(true);
		});

		it("centers the item within the room", () => {
			host._roomWidth = 3000;
			host._roomDepth = 3000;
			ctrl.addFurniture(sticker);
			const item = host._furniture[0] as FurnitureItem;
			// createFurnitureItem centers: x = (3000 - 600) / 2 = 1200
			expect(item.x).toBe(1200);
			expect(item.y).toBe(1300);
		});
	});

	// =========================================================================
	// removeFurniture(id)
	// =========================================================================
	describe("removeFurniture(id)", () => {
		let itemA: FurnitureItem;
		let itemB: FurnitureItem;

		beforeEach(() => {
			itemA = {
				id: "f_a",
				type: "icon",
				icon: "mdi:sofa",
				label: "sofa",
				x: 0,
				y: 0,
				width: 600,
				height: 400,
				rotation: 0,
				lockAspect: false,
			};
			itemB = {
				id: "f_b",
				type: "icon",
				icon: "mdi:chair",
				label: "chair",
				x: 0,
				y: 0,
				width: 400,
				height: 400,
				rotation: 0,
				lockAspect: false,
			};
			host._furniture = [itemA, itemB];
		});

		it("removes the item with the given id", () => {
			ctrl.removeFurniture("f_a");
			expect(host._furniture).toHaveLength(1);
			expect((host._furniture[0] as FurnitureItem).id).toBe("f_b");
		});

		it("clears _selectedFurnitureId when the selected item is removed", () => {
			host._selectedFurnitureId = "f_a";
			ctrl.removeFurniture("f_a");
			expect(host._selectedFurnitureId).toBeNull();
		});

		it("leaves _selectedFurnitureId unchanged when a different item is removed", () => {
			host._selectedFurnitureId = "f_b";
			ctrl.removeFurniture("f_a");
			expect(host._selectedFurnitureId).toBe("f_b");
		});

		it("marks the host as dirty", () => {
			ctrl.removeFurniture("f_a");
			expect(host._dirty).toBe(true);
		});

		it("does nothing (no error) when id does not exist", () => {
			ctrl.removeFurniture("nonexistent");
			expect(host._furniture).toHaveLength(2);
		});
	});

	// =========================================================================
	// saveTemplate() / loadTemplate() / deleteTemplate()
	// =========================================================================
	describe("saveTemplate()", () => {
		beforeEach(() => {
			host._templateName = "My Template";
			host._grid = new Uint8Array(GRID_CELL_COUNT);
			host._grid[5] = CELL_ROOM_BIT; // mark one inside cell
			host._zoneConfigs = [
				{ name: "Zone 1", color: ZONE_COLORS[0], type: "normal" },
				...Array(MAX_ZONES - 1).fill(null),
			];
			host._roomWidth = 3000;
			host._roomDepth = 4000;
			host._furniture = [];
		});

		it("saves template data to localStorage", () => {
			ctrl.saveTemplate();
			const stored = JSON.parse(
				localStorage.getItem("epp_layout_templates") || "[]",
			);
			expect(stored).toHaveLength(1);
			expect(stored[0].name).toBe("My Template");
		});

		it("stores grid bytes, zone configs, and room dimensions", () => {
			ctrl.saveTemplate();
			const stored = JSON.parse(
				localStorage.getItem("epp_layout_templates") || "[]",
			);
			const tmpl = stored[0];
			expect(tmpl.grid[5]).toBe(CELL_ROOM_BIT);
			expect(tmpl.roomWidth).toBe(3000);
			expect(tmpl.roomDepth).toBe(4000);
			expect(tmpl.zones[0].name).toBe("Zone 1");
		});

		it("clears _templateName and hides the save dialog", () => {
			host._showTemplateSave = true;
			ctrl.saveTemplate();
			expect(host._templateName).toBe("");
			expect(host._showTemplateSave).toBe(false);
		});

		it("overwrites an existing template with the same name", () => {
			ctrl.saveTemplate();
			host._templateName = "My Template";
			host._roomWidth = 5000;
			ctrl.saveTemplate();
			const stored = JSON.parse(
				localStorage.getItem("epp_layout_templates") || "[]",
			);
			expect(stored).toHaveLength(1);
			expect(stored[0].roomWidth).toBe(5000);
		});

		it("does nothing when template name is blank", () => {
			host._templateName = "   ";
			ctrl.saveTemplate();
			const stored = JSON.parse(
				localStorage.getItem("epp_layout_templates") || "[]",
			);
			expect(stored).toHaveLength(0);
		});

		it("appends a second template with a different name", () => {
			ctrl.saveTemplate();
			host._templateName = "Other Template";
			ctrl.saveTemplate();
			const stored = JSON.parse(
				localStorage.getItem("epp_layout_templates") || "[]",
			);
			expect(stored).toHaveLength(2);
		});
	});

	describe("loadTemplate()", () => {
		const TEMPLATE = {
			name: "Loaded",
			grid: Array.from({ length: GRID_CELL_COUNT }, (_, i) =>
				i === 3 ? CELL_ROOM_BIT : 0,
			),
			zones: [{ name: "Zone 1", color: ZONE_COLORS[0], type: "normal" }],
			roomWidth: 2400,
			roomDepth: 3600,
			furniture: [
				{
					id: "f_x",
					type: "icon",
					icon: "mdi:sofa",
					label: "sofa",
					x: 100,
					y: 200,
					width: 600,
					height: 400,
					rotation: 0,
					lockAspect: false,
				},
			],
		};

		beforeEach(() => {
			localStorage.setItem("epp_layout_templates", JSON.stringify([TEMPLATE]));
		});

		it("restores grid, room dimensions, zones, and furniture", () => {
			ctrl.loadTemplate("Loaded");
			expect(host._roomWidth).toBe(2400);
			expect(host._roomDepth).toBe(3600);
			expect(host._grid[3]).toBe(CELL_ROOM_BIT);
			expect(host._zoneConfigs).toHaveLength(MAX_ZONES);
			expect(host._zoneConfigs[0]).toMatchObject({ name: "Zone 1" });
			expect(host._furniture).toHaveLength(1);
		});

		it("pads zoneConfigs to MAX_ZONES slots", () => {
			ctrl.loadTemplate("Loaded");
			expect(host._zoneConfigs).toHaveLength(MAX_ZONES);
			// Slots beyond the saved template should be null
			for (let i = 1; i < MAX_ZONES; i++) {
				expect(host._zoneConfigs[i]).toBeNull();
			}
		});

		it("closes the load dialog", () => {
			host._showTemplateLoad = true;
			ctrl.loadTemplate("Loaded");
			expect(host._showTemplateLoad).toBe(false);
		});

		it("does nothing when the template name does not exist", () => {
			ctrl.loadTemplate("Nonexistent");
			expect(host._roomWidth).toBe(3000); // unchanged from mockHost default
		});

		it("handles templates without furniture field", () => {
			const tmplNoFurniture = { ...TEMPLATE, furniture: undefined };
			localStorage.setItem(
				"epp_layout_templates",
				JSON.stringify([tmplNoFurniture]),
			);
			ctrl.loadTemplate("Loaded");
			expect(host._furniture).toEqual([]);
		});
	});

	describe("deleteTemplate()", () => {
		beforeEach(() => {
			localStorage.setItem(
				"epp_layout_templates",
				JSON.stringify([
					{ name: "Alpha", grid: [], zones: [], roomWidth: 0, roomDepth: 0 },
					{ name: "Beta", grid: [], zones: [], roomWidth: 0, roomDepth: 0 },
				]),
			);
		});

		it("removes the named template from localStorage", () => {
			ctrl.deleteTemplate("Alpha");
			const stored = JSON.parse(
				localStorage.getItem("epp_layout_templates") || "[]",
			);
			expect(stored.map((t: any) => t.name)).not.toContain("Alpha");
		});

		it("leaves other templates intact", () => {
			ctrl.deleteTemplate("Alpha");
			const stored = JSON.parse(
				localStorage.getItem("epp_layout_templates") || "[]",
			);
			expect(stored).toHaveLength(1);
			expect(stored[0].name).toBe("Beta");
		});

		it("calls requestUpdate", () => {
			ctrl.deleteTemplate("Alpha");
			expect(host.requestUpdate).toHaveBeenCalled();
		});

		it("does not throw when the name does not exist", () => {
			expect(() => ctrl.deleteTemplate("Nonexistent")).not.toThrow();
		});
	});

	// =========================================================================
	// applyPaintToCell(index)
	// =========================================================================
	describe("applyPaintToCell(index)", () => {
		it("does nothing when _activeZone is null", () => {
			host._activeZone = null;
			const originalGrid = new Uint8Array(host._grid);
			ctrl.applyPaintToCell(5);
			expect(host._grid).toEqual(originalGrid);
		});

		it("paints an inside cell with an active zone-0 stroke (set action)", () => {
			host._activeZone = 0;
			host._paintAction = "set";
			ctrl.applyPaintToCell(5);
			// After a "set" on zone-0, the cell should be marked inside (CELL_ROOM_BIT)
			expect(host._grid[5] & 0x01).toBe(1);
		});

		it("creates a new Uint8Array (immutable update)", () => {
			host._activeZone = 0;
			host._paintAction = "set";
			const before = host._grid;
			ctrl.applyPaintToCell(5);
			expect(host._grid).not.toBe(before);
		});

		it("marks the host as dirty", () => {
			host._activeZone = 0;
			host._paintAction = "set";
			ctrl.applyPaintToCell(5);
			expect(host._dirty).toBe(true);
		});

		it("calls requestUpdate", () => {
			host._activeZone = 0;
			host._paintAction = "set";
			ctrl.applyPaintToCell(5);
			expect(host.requestUpdate).toHaveBeenCalled();
		});

		it("paints a zone onto an inside cell", () => {
			// First make cell 5 an inside cell (zone 0)
			host._grid[5] = CELL_ROOM_BIT;
			host._activeZone = 1;
			host._paintAction = "set";
			ctrl.applyPaintToCell(5);
			// Zone 1 bits: inside=1, zone=1 → 0x03
			expect(host._grid[5]).toBe(0x03);
		});

		it("does not modify an outside cell when painting a zone", () => {
			// Cell 5 is outside (0x00)
			host._activeZone = 1;
			host._paintAction = "set";
			ctrl.applyPaintToCell(5);
			// applyPaintToCell returns null for outside cells — grid unchanged
			expect(host._grid[5]).toBe(0x00);
		});

		it("does not change _roomWidth when painting zone-0 boundary cells", () => {
			host._activeZone = 0;
			host._paintAction = "set";
			host._roomWidth = 3000;
			host._roomDepth = 3000;
			// Paint a cell far from the room center — grid bounds would differ from calibrated dims
			ctrl.applyPaintToCell(0);
			// Calibrated room dimensions must be preserved (perspective depends on them)
			expect(host._roomWidth).toBe(3000);
			expect(host._roomDepth).toBe(3000);
			expect(host.requestUpdate).toHaveBeenCalled();
		});
	});

	// =========================================================================
	// Interference painting via onCellMouseDown / applyPaintToCell
	// =========================================================================
	describe("interference painting", () => {
		beforeEach(() => {
			// Mark cell 5 as inside the room so paint functions accept it
			host._grid[5] = CELL_ROOM_BIT;
			host._overlayMode = "interference";
			host._interferenceLevel = 2;
			vi.spyOn(window, "addEventListener").mockImplementation(() => {});
		});

		it("onCellMouseDown sets isPainting and applies interference paint", () => {
			ctrl.onCellMouseDown(5);
			expect(host._isPainting).toBe(true);
			// Interference level 2 should be encoded in bits 5-7
			expect(cellInterference(host._grid[5])).toBe(2);
			expect(host._dirty).toBe(true);
		});

		it("onCellMouseDown uses determineInterferencePaintAction (toggles off when already set)", () => {
			// Pre-paint cell 5 with interference level 2
			host._grid[5] = CELL_ROOM_BIT | (2 << CELL_INTERFERENCE_SHIFT);
			ctrl.onCellMouseDown(5);
			// Same level → should toggle to clear
			expect(host._paintAction).toBe("clear");
			expect(cellInterference(host._grid[5])).toBe(0);
		});

		it("applyPaintToCell with interference mode calls applyInterferencePaintToCell", () => {
			host._paintAction = "set";
			ctrl.applyPaintToCell(5);
			expect(cellInterference(host._grid[5])).toBe(2);
			expect(host._dirty).toBe(true);
		});

		it("applyPaintToCell with interference mode clears when paintAction is clear", () => {
			// Pre-paint cell 5 with interference level 2
			host._grid[5] = CELL_ROOM_BIT | (2 << CELL_INTERFERENCE_SHIFT);
			host._paintAction = "clear";
			ctrl.applyPaintToCell(5);
			expect(cellInterference(host._grid[5])).toBe(0);
		});

		it("onCellMouseDown with entry overlay mode still works", () => {
			host._overlayMode = "entry";
			ctrl.onCellMouseDown(5);
			expect(host._isPainting).toBe(true);
			// Entry overlay sets bit 4
			expect(host._grid[5] & 0x10).toBe(0x10);
		});
	});

	// =========================================================================
	// Lifecycle stubs
	// =========================================================================
	describe("lifecycle", () => {
		it("hostConnected does not throw", () => {
			expect(() => ctrl.hostConnected()).not.toThrow();
		});

		it("hostDisconnected does not throw", () => {
			expect(() => ctrl.hostDisconnected()).not.toThrow();
		});
	});

	describe("onFurniturePointerDown rotation", () => {
		it("finds furniture item through nested shadow DOMs for rotation center", () => {
			const item: FurnitureItem = {
				id: "f1",
				type: "sofa-2" as any,
				x: 500,
				y: 500,
				width: 600,
				height: 300,
				rotation: 45,
			};
			host._furniture = [item];

			// Mock furniture item element with getBoundingClientRect
			const furnitureEl = document.createElement("div");
			furnitureEl.classList.add("furniture-item");
			furnitureEl.setAttribute("data-id", "f1");
			furnitureEl.getBoundingClientRect = () => ({
				left: 200,
				top: 100,
				width: 60,
				height: 30,
				right: 260,
				bottom: 130,
				x: 200,
				y: 100,
				toJSON: () => {},
			});

			// Build nested shadow DOM mock:
			// host.shadowRoot -> epp-grid -> shadowRoot -> epp-furniture-overlay -> shadowRoot -> .furniture-item
			const overlayShadow = document.createElement("div");
			overlayShadow.appendChild(furnitureEl);

			const overlay = document.createElement("div");
			Object.defineProperty(overlay, "shadowRoot", { value: overlayShadow });

			const eppGridShadow = document.createElement("div");
			eppGridShadow.appendChild(overlay);
			const origGridQS = eppGridShadow.querySelector.bind(eppGridShadow);
			eppGridShadow.querySelector = ((sel: string) => {
				if (sel === "epp-furniture-overlay") return overlay;
				return origGridQS(sel);
			}) as any;

			const eppGrid = document.createElement("div");
			Object.defineProperty(eppGrid, "shadowRoot", { value: eppGridShadow });

			const hostShadow = document.createElement("div");
			hostShadow.appendChild(eppGrid);
			const origHostQS = hostShadow.querySelector.bind(hostShadow);
			hostShadow.querySelector = ((sel: string) => {
				if (sel === "epp-grid") return eppGrid;
				return origHostQS(sel);
			}) as any;

			host.shadowRoot = hostShadow as any;

			// Simulate pointerdown for rotation at (250, 130) - right of center
			const ev = new PointerEvent("pointerdown", {
				clientX: 250,
				clientY: 130,
			});

			// Need to mock addEventListener on window
			const addSpy = vi
				.spyOn(window, "addEventListener")
				.mockImplementation(() => {});

			ctrl.onFurniturePointerDown(ev, "f1", "rotate");

			addSpy.mockRestore();

			// Verify drag state was created with correct center
			expect(host._dragState).not.toBeNull();
			expect(host._dragState.centerX).toBe(230); // 200 + 60/2
			expect(host._dragState.centerY).toBe(115); // 100 + 30/2
			expect(host._dragState.startAngle).not.toBe(0);
		});
	});

	describe("onFurnitureDrag", () => {
		it("finds .grid through nested epp-grid shadow DOM", () => {
			// Set up a furniture item and drag state
			const item: FurnitureItem = {
				id: "f1",
				type: "sofa-2" as any,
				x: 500,
				y: 500,
				width: 600,
				height: 300,
				rotation: 0,
			};
			host._furniture = [item];
			host._dragState = {
				id: "f1",
				type: "move",
				startX: 100,
				startY: 100,
				origX: 500,
				origY: 500,
				origW: 600,
				origH: 300,
				origRot: 0,
			};

			// Mock the nested shadow DOM: host.shadowRoot -> epp-grid -> shadowRoot -> .grid -> cell
			const cellEl = document.createElement("div");
			Object.defineProperty(cellEl, "offsetWidth", { value: 30 });

			const gridDiv = document.createElement("div");
			gridDiv.classList.add("grid");
			gridDiv.appendChild(cellEl);

			const eppGridShadow = document.createElement("div");
			eppGridShadow.appendChild(gridDiv);

			const eppGrid = document.createElement("div");
			// Mock epp-grid's shadowRoot
			Object.defineProperty(eppGrid, "shadowRoot", { value: eppGridShadow });

			const hostShadow = document.createElement("div");
			hostShadow.appendChild(eppGrid);
			// querySelector("epp-grid") needs to find our mock element
			const origQS = hostShadow.querySelector.bind(hostShadow);
			hostShadow.querySelector = ((sel: string) => {
				if (sel === "epp-grid") return eppGrid;
				return origQS(sel);
			}) as any;

			host.shadowRoot = hostShadow as any;

			// Simulate a drag event
			const ev = new PointerEvent("pointermove", {
				clientX: 130,
				clientY: 120,
			});
			ctrl.onFurnitureDrag(ev);

			// The furniture item should have moved (not silently aborted)
			const updated = host._furniture[0];
			expect(updated.x).not.toBe(500);
		});
	});
});
