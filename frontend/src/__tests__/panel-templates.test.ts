import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import { CELL_ROOM_BIT, GRID_CELL_COUNT, GRID_COLS } from "../lib/grid.js";
import { ZONE_COLORS } from "../lib/zone-defaults.js";

function createPanel(): EPPGridPanel {
	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	el.hass = {
		callWS: vi.fn().mockResolvedValue({}),
		connection: { subscribeMessage: vi.fn().mockResolvedValue(() => {}) },
	};
	const a = el as any;
	a._grid = new Uint8Array(GRID_CELL_COUNT);
	a._zoneConfigs = new Array(7).fill(null);
	a._activeZone = 0;
	a._dirty = false;
	a._loading = false;
	a._perspective = null;
	a._roomWidth = 3000;
	a._roomDepth = 4000;
	a._furniture = [];
	a._selectedFurnitureId = null;
	a._showTemplateSave = false;
	a._showTemplateLoad = false;
	a._templateName = "";
	return el;
}

describe("_getTemplates", () => {
	it("returns templates from controller cache", () => {
		const a = createPanel() as any;
		const templates = [
			{ name: "Test", grid: [], zones: [], roomWidth: 3000, roomDepth: 4000 },
		];
		a._gridCtrl.templates = templates;
		expect(a._getTemplates()).toEqual(templates);
	});

	it("returns empty array when cache is empty", () => {
		const a = createPanel() as any;
		a._gridCtrl.templates = [];
		expect(a._getTemplates()).toEqual([]);
	});
});

describe("_saveTemplate", () => {
	it("calls controller saveTemplate", async () => {
		const a = createPanel() as any;
		a._templateName = "My layout";
		a._grid = new Uint8Array(GRID_CELL_COUNT);
		a._roomWidth = 5000;
		a._roomDepth = 6000;
		a._furniture = [];
		a._zoneConfigs = new Array(7).fill(null);

		a.hass.callWS
			.mockResolvedValueOnce({}) // save_template
			.mockResolvedValueOnce({ templates: {} }); // list_templates

		await a._saveTemplate();

		expect(a.hass.callWS).toHaveBeenCalledWith(
			expect.objectContaining({ type: "eppgrid/save_template", name: "My layout" }),
		);
	});
});

describe("_loadTemplate", () => {
	it("loads a template from controller cache", () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		grid[0] = CELL_ROOM_BIT;
		const a = createPanel() as any;
		a._gridCtrl.templates = [
			{
				name: "Saved",
				grid,
				zones: [{ name: "Z1", color: "#ff0000", type: "normal" }],
				roomWidth: 5000,
				roomDepth: 6000,
				furniture: [],
			},
		];

		a._loadTemplate("Saved");

		expect(a._grid[0]).toBe(CELL_ROOM_BIT);
		expect(a._roomWidth).toBe(5000);
		expect(a._showTemplateLoad).toBe(false);
	});
});

describe("_deleteTemplate", () => {
	it("calls controller deleteTemplate", async () => {
		const a = createPanel() as any;
		a.hass.callWS
			.mockResolvedValueOnce({}) // delete_template
			.mockResolvedValueOnce({ templates: {} }); // list_templates

		await a._deleteTemplate("Old");

		expect(a.hass.callWS).toHaveBeenCalledWith(
			expect.objectContaining({ type: "eppgrid/delete_template", name: "Old" }),
		);
	});
});

describe("_renderTemplateLoadDialog", () => {
	it("renders template cards with SVG thumbnails", () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		grid[0] = CELL_ROOM_BIT;
		grid[1] = CELL_ROOM_BIT;
		grid[GRID_COLS] = CELL_ROOM_BIT;
		grid[GRID_COLS + 1] = CELL_ROOM_BIT;

		const a = createPanel() as any;
		a._gridCtrl.templates = [
			{
				name: "Test Room",
				grid,
				zones: [{ name: "Z1", color: "#E69F00", type: "normal" }],
				roomWidth: 600,
				roomDepth: 600,
				furniture: [],
			},
		];

		const tpl = a._renderTemplateLoadDialog();
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
});
