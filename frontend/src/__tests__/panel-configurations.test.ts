import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import { CELL_ROOM_BIT, GRID_CELL_COUNT, GRID_COLS } from "../lib/grid.js";
import type { Zone0Config, ZoneConfig } from "../lib/zone-defaults.js";

// Valid length-8 zone slots for test configurations (slot 0 = Zone0Config).
const VALID_ZONES: (Zone0Config | ZoneConfig | null)[] = [
	{ type: "default", trigger: 5, renew: 3, timeout: 10, handoff_timeout: 3 },
	null,
	null,
	null,
	null,
	null,
	null,
	null,
];

function createPanel(): EPPGridPanel {
	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	el.hass = {
		callWS: vi.fn().mockResolvedValue({}),
		connection: { subscribeMessage: vi.fn().mockResolvedValue(() => {}) },
	};
	const a = el as any;
	a._grid = new Uint8Array(GRID_CELL_COUNT);
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
	a._perspective = null;
	a._roomWidth = 3000;
	a._roomDepth = 4000;
	a._furniture = [];
	a._selectedFurnitureId = null;
	a._showConfigurationBackup = false;
	a._showConfigurationRestore = false;
	a._configurationName = "";
	return el;
}

describe("_getConfigurations", () => {
	it("returns configurations from controller cache", () => {
		const a = createPanel() as any;
		const configurations = [
			{
				name: "Test",
				grid: [],
				zones: VALID_ZONES,
				roomWidth: 3000,
				roomDepth: 4000,
			},
		];
		a._gridCtrl.configurations = configurations;
		expect(a._getConfigurations()).toEqual(configurations);
	});

	it("returns empty array when cache is empty", () => {
		const a = createPanel() as any;
		a._gridCtrl.configurations = [];
		expect(a._getConfigurations()).toEqual([]);
	});
});

describe("_saveConfiguration", () => {
	it("calls controller saveConfiguration", async () => {
		const a = createPanel() as any;
		a._configurationName = "My layout";
		a._grid = new Uint8Array(GRID_CELL_COUNT);
		a._roomWidth = 5000;
		a._roomDepth = 6000;
		a._furniture = [];
		a._zoneConfigs = [
			{
				type: "default",
				trigger: 5,
				renew: 3,
				timeout: 10,
				handoff_timeout: 3,
			},
			null,
			null,
			null,
			null,
			null,
			null,
			null,
		];

		a.hass.callWS
			.mockResolvedValueOnce({}) // save_configuration
			.mockResolvedValueOnce({ configurations: {} }); // list_configurations

		await a._saveConfiguration();

		expect(a.hass.callWS).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "eppgrid/save_configuration",
				name: "My layout",
			}),
		);
	});
});

describe("_loadConfiguration", () => {
	it("loads a configuration from controller cache", async () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		grid[0] = CELL_ROOM_BIT;
		const a = createPanel() as any;
		a._gridCtrl.configurations = [
			{
				name: "Saved",
				grid,
				zones: [
					{
						type: "default",
						trigger: 5,
						renew: 3,
						timeout: 10,
						handoff_timeout: 3,
					},
					{ name: "Z1", color: "#ff0000", type: "default" },
					null,
					null,
					null,
					null,
					null,
					null,
				],
				roomWidth: 5000,
				roomDepth: 6000,
				furniture: [],
			},
		];

		await a._loadConfiguration("Saved");

		expect(a._grid[0]).toBe(CELL_ROOM_BIT);
		expect(a._roomWidth).toBe(5000);
		expect(a._showConfigurationRestore).toBe(false);
	});

	it("loadConfiguration restores zone 0 and auto-applies", async () => {
		const a = createPanel() as any;
		// Grid with at least one cell painted as zone 1, so applyLayout's
		// zero-cell pruning doesn't drop it.
		const grid = new Array(GRID_CELL_COUNT).fill(CELL_ROOM_BIT);
		grid[0] = CELL_ROOM_BIT | (1 << 1); // cell in zone 1
		const cfg = {
			name: "Saved",
			grid,
			zones: [
				{
					type: "seating",
					trigger: 7,
					renew: 1,
					timeout: 30,
					handoff_timeout: 10,
				},
				{
					name: "Living",
					color: "#f00",
					type: "default",
					trigger: 5,
					renew: 3,
					timeout: 10,
					handoff_timeout: 3,
				},
				null,
				null,
				null,
				null,
				null,
				null,
			],
			roomWidth: 4000,
			roomDepth: 3000,
			furniture: [],
		};
		a._gridCtrl.configurations = [cfg];
		const callWS = vi.spyOn(a.hass, "callWS").mockResolvedValue({});

		await a._loadConfiguration("Saved");

		expect((a._zoneConfigs[0] as Zone0Config).type).toBe("seating");
		expect((a._zoneConfigs[1] as ZoneConfig)?.name).toBe("Living");
		// auto-apply fired set_room_layout — assert exact shape so a
		// regression that re-introduces .slice(1) (length-7 zone_slots)
		// is caught.
		const roomLayoutCalls = callWS.mock.calls.filter(
			(c) => (c[0] as { type?: string })?.type === "eppgrid/set_room_layout",
		);
		expect(roomLayoutCalls).toHaveLength(1);
		const payload = roomLayoutCalls[0][0] as { zone_slots: any[] };
		expect(payload.zone_slots).toHaveLength(8);
		// Non-custom types carry only `type` (plus name/color for named
		// slots) — backend fills timing from ZONE_TYPE_DEFAULTS.
		expect(payload.zone_slots[0]).toEqual({ type: "seating" });
		expect(payload.zone_slots[1]).toMatchObject({
			name: "Living",
			type: "default",
		});
		expect(payload.zone_slots[1]).not.toHaveProperty("trigger");
	});

	it("throws on old-format configuration with length-7 zones", async () => {
		const a = createPanel() as any;
		a._gridCtrl.configurations = [
			{
				name: "Old",
				grid: new Array(GRID_CELL_COUNT).fill(0),
				zones: [null, null, null, null, null, null, null], // length 7, old format
				roomWidth: 3000,
				roomDepth: 4000,
				furniture: [],
			},
		];
		a._showConfigurationRestore = true;

		const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		await a._loadConfiguration("Old");
		expect(errSpy).toHaveBeenCalled();
		// Dialog stays open so the failure is visible and the user can
		// try another configuration.
		expect(a._showConfigurationRestore).toBe(true);
		errSpy.mockRestore();
	});

	it("throws on configuration with null zone 0", async () => {
		const a = createPanel() as any;
		a._gridCtrl.configurations = [
			{
				name: "NullZone0",
				grid: new Array(GRID_CELL_COUNT).fill(0),
				zones: [null, null, null, null, null, null, null, null],
				roomWidth: 3000,
				roomDepth: 4000,
				furniture: [],
			},
		];

		const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		await a._loadConfiguration("NullZone0");
		expect(errSpy).toHaveBeenCalled();
		errSpy.mockRestore();
	});
});

describe("_deleteConfiguration", () => {
	it("calls controller deleteConfiguration", async () => {
		const a = createPanel() as any;
		a.hass.callWS
			.mockResolvedValueOnce({}) // delete_configuration
			.mockResolvedValueOnce({ configurations: {} }); // list_configurations

		await a._deleteConfiguration("Old");

		expect(a.hass.callWS).toHaveBeenCalledWith(
			expect.objectContaining({ type: "eppgrid/delete_configuration", name: "Old" }),
		);
	});
});

describe("_renderConfigurationRestoreDialog", () => {
	it("renders configuration cards with SVG thumbnails", () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		grid[0] = CELL_ROOM_BIT;
		grid[1] = CELL_ROOM_BIT;
		grid[GRID_COLS] = CELL_ROOM_BIT;
		grid[GRID_COLS + 1] = CELL_ROOM_BIT;

		const a = createPanel() as any;
		a._gridCtrl.configurations = [
			{
				name: "Test Room",
				grid,
				zones: [
					VALID_ZONES[0],
					{ name: "Z1", color: "#E69F00", type: "default" },
					null,
					null,
					null,
					null,
					null,
					null,
				],
				roomWidth: 600,
				roomDepth: 600,
				furniture: [],
			},
		];

		const tpl = a._renderConfigurationRestoreDialog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const card = c.querySelector(".template-card");
		expect(card).not.toBeNull();

		const svgEl = c.querySelector(".template-card-thumbnail svg");
		expect(svgEl).not.toBeNull();

		const name = c.querySelector(".template-card-name");
		expect(name?.textContent).toBe("Test Room");

		document.body.removeChild(c);
	});

	it("template-card-size reflects painted-cell bounding box, not stored roomWidth", () => {
		// Configuration stores a small roomWidth from calibration (600mm), but the
		// painted grid extends further. The card label should match what the
		// footer shows (getGridRoomMetrics on the painted cells), so the user
		// sees the dimensions of the visible layout, not the calibration-time
		// room size.
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		// Paint a 3-col × 2-row block at the top-left corner (0.9m × 0.6m).
		for (let row = 0; row < 2; row++) {
			for (let col = 0; col < 3; col++) {
				grid[row * GRID_COLS + col] = CELL_ROOM_BIT;
			}
		}

		const a = createPanel() as any;
		a._gridCtrl.configurations = [
			{
				name: "Mismatch",
				grid,
				zones: VALID_ZONES,
				roomWidth: 600, // calibration-time value
				roomDepth: 600,
				furniture: [],
			},
		];

		const tpl = a._renderConfigurationRestoreDialog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const size = c.querySelector(".template-card-size");
		// Painted box: 3 cols × 300mm = 0.9m, 2 rows × 300mm = 0.6m.
		expect(size?.textContent).toBe("0.9m × 0.6m");

		document.body.removeChild(c);
	});

	it("renders no-configurations message when cache is empty", () => {
		const a = createPanel() as any;
		a._gridCtrl.configurations = [];

		const tpl = a._renderConfigurationRestoreDialog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const help = c.querySelector(".overlay-help");
		expect(help).not.toBeNull();

		document.body.removeChild(c);
	});

	it("clicking card triggers load", async () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		grid[0] = CELL_ROOM_BIT;
		const a = createPanel() as any;
		a._gridCtrl.configurations = [
			{
				name: "Clickable",
				grid,
				zones: VALID_ZONES,
				roomWidth: 3000,
				roomDepth: 4000,
				furniture: [],
			},
		];

		const tpl = a._renderConfigurationRestoreDialog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const card = c.querySelector(".template-card") as HTMLElement;
		expect(card).not.toBeNull();
		card.click();
		// Wait for the async _loadConfiguration -> applyLayout chain to settle.
		await vi.waitFor(() => {
			expect(a._showConfigurationRestore).toBe(false);
			expect(a._roomWidth).toBe(3000);
		});

		document.body.removeChild(c);
	});

	it("Enter key on card triggers load", async () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		grid[0] = CELL_ROOM_BIT;
		const a = createPanel() as any;
		a._gridCtrl.configurations = [
			{
				name: "Keyboard",
				grid,
				zones: VALID_ZONES,
				roomWidth: 4000,
				roomDepth: 5000,
				furniture: [],
			},
		];

		const tpl = a._renderConfigurationRestoreDialog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const card = c.querySelector(".template-card") as HTMLElement;
		expect(card).not.toBeNull();
		card.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

		await vi.waitFor(() => {
			expect(a._showConfigurationRestore).toBe(false);
			expect(a._roomWidth).toBe(4000);
		});

		document.body.removeChild(c);
	});

	it("clicking delete button removes configuration without loading", async () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		grid[0] = CELL_ROOM_BIT;
		const a = createPanel() as any;
		a._gridCtrl.configurations = [
			{
				name: "Keep",
				grid,
				zones: VALID_ZONES,
				roomWidth: 3000,
				roomDepth: 4000,
				furniture: [],
			},
			{
				name: "Delete",
				grid,
				zones: VALID_ZONES,
				roomWidth: 3000,
				roomDepth: 4000,
				furniture: [],
			},
		];

		a.hass.callWS
			.mockResolvedValueOnce({}) // delete_configuration
			.mockResolvedValueOnce({
				configurations: {
					Keep: {
						grid,
						zones: VALID_ZONES,
						roomWidth: 3000,
						roomDepth: 4000,
						furniture: [],
					},
				},
			});

		const origWidth = a._roomWidth;
		const tpl = a._renderConfigurationRestoreDialog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const deleteBtn = c.querySelector(".template-card-delete") as HTMLElement;
		expect(deleteBtn).not.toBeNull();
		deleteBtn.click();

		// Wait for async delete to complete
		await vi.waitFor(() => {
			expect(a.hass.callWS).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "eppgrid/delete_configuration",
					name: "Keep",
				}),
			);
		});

		expect(a._roomWidth).toBe(origWidth);

		document.body.removeChild(c);
	});

	it("Space key on delete button stops propagation", () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		grid[0] = CELL_ROOM_BIT;
		const a = createPanel() as any;
		a._gridCtrl.configurations = [
			{
				name: "T1",
				grid,
				zones: VALID_ZONES,
				roomWidth: 3000,
				roomDepth: 4000,
				furniture: [],
			},
		];

		const tpl = a._renderConfigurationRestoreDialog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const deleteBtn = c.querySelector(".template-card-delete") as HTMLElement;
		expect(deleteBtn).not.toBeNull();
		const cardKeydownSpy = vi.fn();
		const card = c.querySelector(".template-card") as HTMLElement;
		card.addEventListener("keydown", cardKeydownSpy);
		deleteBtn.dispatchEvent(
			new KeyboardEvent("keydown", { key: " ", bubbles: true }),
		);
		expect(cardKeydownSpy).not.toHaveBeenCalled();

		document.body.removeChild(c);
	});
});
