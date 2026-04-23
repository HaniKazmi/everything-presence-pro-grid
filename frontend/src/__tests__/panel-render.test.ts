import { describe, expect, it } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import { GRID_CELL_COUNT } from "../lib/grid.js";

describe("panel element creation", () => {
	it("can be created via document.createElement", () => {
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		expect(el).toBeInstanceOf(HTMLElement);
	});

	it("is registered as a custom element", () => {
		const Ctor = customElements.get("eppgrid-panel");
		expect(Ctor).toBeDefined();
	});

	it("can be connected to the DOM", () => {
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		// Mock hass to prevent WS calls during connectedCallback
		el.hass = {
			callWS: async () => ({}),
			connection: { subscribeMessage: async () => () => {} },
		};
		document.body.appendChild(el);
		expect(el.isConnected).toBe(true);
		document.body.removeChild(el);
	});
});

describe("panel loading state", () => {
	it("starts in loading state by default", () => {
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		const a = el as any;
		expect(a._loading).toBe(true);
	});

	it("has empty devices by default", () => {
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		const a = el as any;
		expect(a._devices).toEqual([]);
	});
});

describe("panel renders without throwing", () => {
	it("renders loading state when _loading is true", () => {
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		el.hass = {
			callWS: async () => ({}),
			connection: { subscribeMessage: async () => () => {} },
		};
		const a = el as any;
		a._loading = true;

		// Calling render() directly should not throw
		const result = a.render();
		expect(result).toBeDefined();
	});

	it("renders loading state when _devices is empty", () => {
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		el.hass = {
			callWS: async () => ({}),
			connection: { subscribeMessage: async () => () => {} },
		};
		const a = el as any;
		a._loading = false;
		a._devices = [];

		const result = a.render();
		expect(result).toBeDefined();
	});

	it("has default grid of correct size", () => {
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		const a = el as any;
		expect(a._grid).toBeInstanceOf(Uint8Array);
		expect(a._grid.length).toBe(GRID_CELL_COUNT);
	});

	it("has default zone-slots tuple of length 8 with Zone0Config at slot 0", () => {
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		const a = el as any;
		// Length-8 tuple: slot 0 is always Zone0Config (room boundary);
		// slots 1..7 are named-zone configs or null.
		expect(a._zoneConfigs).toHaveLength(8);
		expect(a._zoneConfigs[0]).toMatchObject({ type: "default" });
		for (let i = 1; i < 8; i++) {
			expect(a._zoneConfigs[i]).toBeNull();
		}
	});

	it("has _dirty = false by default", () => {
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		const a = el as any;
		expect(a._dirty).toBe(false);
	});
});
