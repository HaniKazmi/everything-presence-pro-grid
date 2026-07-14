import { page } from "@vitest/browser/context";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EppGrid } from "../../components/epp-grid.js";
import type { EPPGridPanel } from "../../eppgrid-panel.js";
import "../../eppgrid-panel.js";
import { initGridFromRoom } from "../../lib/grid.js";
import { createZoneEngineState } from "../../lib/zone-engine.js";

// Real-layout regression tests for #338. happy-dom has no layout, so these
// geometry assertions can only live in a real browser. See
// docs/handoffs/2026-07-14-epp-grid-container-measurement.md.

const mounted: HTMLElement[] = [];

afterEach(() => {
	while (mounted.length) mounted.pop()!.remove();
});

/** Mount the real panel on the live-overview view, in a real full-height page. */
async function mountLivePanel(): Promise<EPPGridPanel> {
	// HA gives the panel host a definite height; :host is `height: 100%`, so the
	// chain needs html/body to be full-height too or the whole model is unbounded.
	document.documentElement.style.height = "100%";
	document.body.style.height = "100%";
	document.body.style.margin = "0";

	const testDevice = {
		mac: "AA:BB:CC:DD:EE:01",
		name: "Test",
		host: null,
		available: true,
		configured: true,
		firmware_status: "compatible",
	};

	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	el.hass = {
		callWS: vi.fn().mockResolvedValue({}),
		connection: {
			// A real mount runs the real connectedCallback -> _initialize(),
			// which awaits this subscription and then unconditionally copies
			// the controller's device list back onto the panel — so unlike the
			// happy-dom `createPanel()` helper (which never connects the
			// element and so never runs that path), a bare stub here would
			// race our `_devices`/`_selectedMac` seed below back to empty.
			// Answering the device-list subscription for real avoids the race
			// instead of fighting it.
			subscribeMessage: vi.fn(
				(callback: (msg: unknown) => void, request: { type: string }) => {
					if (request.type === "eppgrid/subscribe_device_list") {
						callback({ devices: [testDevice] });
					}
					return Promise.resolve(() => {});
				},
			),
		},
	} as never;
	const a = el as unknown as Record<string, unknown>;
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
	a._sidebarTab = "zones";
	a._devices = [testDevice];
	a._selectedMac = "AA:BB:CC:DD:EE:01";
	a._targets = [];
	a._sensorState = {
		occupancy: false,
		static_presence: false,
		motion_presence: false,
		target_presence: false,
	};
	a._zoneState = { occupancy: {}, target_counts: {}, frame_count: 0 };
	a._zoneEngineState = createZoneEngineState();
	a._openAccordions = new Set();
	a._entitiesConfig = {};
	a._heatmapCells = [];
	a._targetTrails = [];
	a._showBackendDebugLog = false;

	document.body.appendChild(el);
	mounted.push(el);
	await settle(el);
	return el;
}

const gridEl = (p: EPPGridPanel): EppGrid =>
	p.shadowRoot!.querySelector("epp-grid")!;

/** The map itself (the bordered cell grid inside epp-grid's shadow root). */
const mapRect = (p: EPPGridPanel): DOMRect =>
	gridEl(p).shadowRoot!.querySelector(".grid")!.getBoundingClientRect();

const logEl = (p: EPPGridPanel): HTMLElement | null =>
	p.shadowRoot!.querySelector(".debug-log-container");

/**
 * Wait for the panel, the grid, and the grid's post-layout settle pass (a
 * rAF-scheduled re-measure that can schedule one more Lit update).
 */
async function settle(p: EPPGridPanel): Promise<void> {
	await p.updateComplete;
	const g = p.shadowRoot?.querySelector("epp-grid");
	if (g) await g.updateComplete;
	await new Promise((r) =>
		requestAnimationFrame(() => requestAnimationFrame(() => r(null))),
	);
	await p.updateComplete;
	if (g) await g.updateComplete;
}

describe("live overview map fits its box", () => {
	it("renders a map inside the viewport at 1600x1000", async () => {
		await page.viewport(1600, 1000);
		const panel = await mountLivePanel();
		const map = mapRect(panel);
		expect(map.height).toBeGreaterThan(0);
		expect(map.bottom).toBeLessThanOrEqual(window.innerHeight);
	});
});
