import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import { INITIAL_ZONE_SLOTS } from "../eppgrid-panel.js";
import { GRID_CELL_COUNT } from "../lib/grid.js";

type DeviceListCb = (msg: { devices: any[] }) => void;

function mockDeviceInfo(mac: string, name: string, available = true) {
	return {
		mac,
		name,
		host: null,
		available,
		configured: true,
		firmware_status: "compatible",
		current_connection_count: null,
	};
}

function makeHass(initialDevices: any[]) {
	const captured: { deviceListCb: DeviceListCb | null } = {
		deviceListCb: null,
	};
	const hass = {
		callWS: vi.fn().mockImplementation((msg: any) => {
			if (msg.type === "eppgrid/get_config") {
				return Promise.resolve({
					config: {
						calibration: { perspective: null, room_width: 0, room_depth: 0 },
						room_layout: {},
					},
				});
			}
			return Promise.resolve({});
		}),
		connection: {
			connected: true,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			subscribeMessage: vi.fn().mockImplementation((cb: any, msg: any) => {
				if (msg.type === "eppgrid/subscribe_device_list") {
					captured.deviceListCb = cb;
					cb({ devices: initialDevices });
					return Promise.resolve(() => {});
				}
				return Promise.resolve(() => {});
			}),
		},
		locale: { language: "en" },
		language: "en",
	};
	return { hass, captured };
}

async function mountPanel(initialDevices: any[]): Promise<{
	el: EPPGridPanel;
	a: any;
	pushDeviceList: (devices: any[]) => void;
}> {
	localStorage.clear();
	if (initialDevices[0]) {
		localStorage.setItem("epp_selected_mac", initialDevices[0].mac);
	}
	const { hass, captured } = makeHass(initialDevices);
	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	el.hass = hass;
	document.body.appendChild(el);
	await el.updateComplete;
	await new Promise((r) => setTimeout(r, 0));
	await new Promise((r) => setTimeout(r, 0));
	await el.updateComplete;
	return {
		el,
		a: el as any,
		pushDeviceList: (devices) => captured.deviceListCb!({ devices }),
	};
}

describe("panel device deletion handling", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("switches view back to 'live' when the selected device is removed", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const { el, a, pushDeviceList } = await mountPanel([dev1]);
		a._view = "editor";
		await el.updateComplete;

		pushDeviceList([]);
		await el.updateComplete;

		expect(a._view).toBe("live");
		document.body.removeChild(el);
	});

	it("clears cached per-device state when the selected device is removed", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const { el, a, pushDeviceList } = await mountPanel([dev1]);
		// Simulate loaded config state.
		a._perspective = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		a._roomWidth = 4000;
		a._roomDepth = 3000;
		a._setupStep = "mark-corner-0";
		a._furniture = [
			{
				id: "f1",
				x: 0,
				y: 0,
				width: 300,
				height: 300,
				rot: 0,
				type: "bed",
			} as any,
		];
		a._grid = new Uint8Array(GRID_CELL_COUNT).fill(1);
		a._zoneConfigs = INITIAL_ZONE_SLOTS.map((z) =>
			z ? { ...z } : null,
		) as any;
		await el.updateComplete;

		pushDeviceList([]);
		await el.updateComplete;

		expect(a._perspective).toBeNull();
		expect(a._roomWidth).toBe(0);
		expect(a._roomDepth).toBe(0);
		expect(a._setupStep).toBeNull();
		expect(a._furniture).toEqual([]);
		expect(Array.from(a._grid as Uint8Array)).toEqual(
			Array.from(new Uint8Array(GRID_CELL_COUNT)),
		);
		expect(a._zoneConfigs).toEqual(INITIAL_ZONE_SLOTS);
		document.body.removeChild(el);
	});

	it("closes the device session when the selected device is removed", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const { el, a, pushDeviceList } = await mountPanel([dev1]);
		const closeSpy = vi.spyOn(a._deviceCtrl, "closeDeviceSession");

		pushDeviceList([]);
		await el.updateComplete;

		expect(closeSpy).toHaveBeenCalled();
		document.body.removeChild(el);
	});

	it("auto-selects the first remaining device and loads its config on deletion", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const dev2 = mockDeviceInfo("bb", "Bravo");
		const { el, a, pushDeviceList } = await mountPanel([dev1, dev2]);
		const loadSpy = vi.spyOn(a, "_loadDeviceConfig");

		pushDeviceList([dev2]);
		await el.updateComplete;
		// Allow the async _loadDeviceConfig chain to settle.
		await new Promise((r) => setTimeout(r, 0));

		expect(a._selectedMac).toBe("bb");
		expect(loadSpy).toHaveBeenCalledWith("bb");
		document.body.removeChild(el);
	});

	it("does not load config when the device list becomes empty", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const { el, a, pushDeviceList } = await mountPanel([dev1]);
		const loadSpy = vi.spyOn(a, "_loadDeviceConfig");
		loadSpy.mockClear();

		pushDeviceList([]);
		await el.updateComplete;
		await new Promise((r) => setTimeout(r, 0));

		expect(a._selectedMac).toBe("");
		expect(loadSpy).not.toHaveBeenCalled();
		document.body.removeChild(el);
	});

	it("fires a hass-notification toast when the selected device is removed", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const { el, pushDeviceList } = await mountPanel([dev1]);
		const events: CustomEvent[] = [];
		el.addEventListener("hass-notification", (e) =>
			events.push(e as CustomEvent),
		);

		pushDeviceList([]);
		await el.updateComplete;

		expect(events.length).toBe(1);
		expect(events[0].detail.message).toMatch(/removed/i);
		expect(events[0].bubbles).toBe(true);
		expect(events[0].composed).toBe(true);
		document.body.removeChild(el);
	});

	it("does not trigger cleanup when a non-selected device is removed", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const dev2 = mockDeviceInfo("bb", "Bravo");
		const { el, a, pushDeviceList } = await mountPanel([dev1, dev2]);
		// Pre-seed cached state that cleanup would clobber.
		a._grid = new Uint8Array(GRID_CELL_COUNT).fill(1);
		a._view = "editor";
		const events: CustomEvent[] = [];
		el.addEventListener("hass-notification", (e) =>
			events.push(e as CustomEvent),
		);
		const closeSpy = vi.spyOn(a._deviceCtrl, "closeDeviceSession");

		pushDeviceList([dev1]); // remove dev2, keep selected dev1

		await el.updateComplete;

		expect(a._selectedMac).toBe("aa");
		expect(a._view).toBe("editor");
		expect(Array.from(a._grid as Uint8Array).every((b) => b === 1)).toBe(true);
		expect(events.length).toBe(0);
		expect(closeSpy).not.toHaveBeenCalled();
		document.body.removeChild(el);
	});

	it("unmounts editor components after the selected device is removed", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const { el, a, pushDeviceList } = await mountPanel([dev1]);
		// Put the panel in a state that renders editor children.
		a._view = "editor";
		a._perspective = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		a._roomWidth = 4000;
		a._roomDepth = 3000;
		await el.updateComplete;
		const html1 = el.shadowRoot?.innerHTML ?? "";
		expect(html1).toMatch(
			/epp-zone-sidebar|epp-overlay-sidebar|epp-furniture-sidebar/,
		);

		pushDeviceList([]);
		await el.updateComplete;

		const html2 = el.shadowRoot?.innerHTML ?? "";
		expect(html2).not.toMatch(/epp-zone-sidebar/);
		expect(html2).not.toMatch(/epp-overlay-sidebar/);
		expect(html2).not.toMatch(/epp-furniture-sidebar/);
		expect(html2).not.toMatch(/epp-settings-view/);
		document.body.removeChild(el);
	});

	it("clears sensor and zone observable state when the selected device is removed", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const { el, a, pushDeviceList } = await mountPanel([dev1]);
		// Pre-seed observable state that cleanup should clobber.
		a._sensorState = {
			occupancy: true,
			static_presence: true,
			motion_presence: true,
			target_presence: true,
			illuminance: 500,
			temperature: 22,
			humidity: 40,
			co2: 600,
		};
		a._zoneState = {
			occupancy: { 1: true },
			target_counts: { 1: 2 },
			frame_count: 42,
		};
		await el.updateComplete;

		pushDeviceList([]);
		await el.updateComplete;

		expect(a._sensorState.occupancy).toBe(false);
		expect(a._sensorState.static_presence).toBe(false);
		expect(a._sensorState.motion_presence).toBe(false);
		expect(a._sensorState.target_presence).toBe(false);
		expect(a._sensorState.illuminance).toBeNull();
		expect(a._sensorState.temperature).toBeNull();
		expect(a._sensorState.humidity).toBeNull();
		expect(a._sensorState.co2).toBeNull();
		expect(a._zoneState.occupancy).toEqual({});
		expect(a._zoneState.target_counts).toEqual({});
		expect(a._zoneState.frame_count).toBe(0);
		document.body.removeChild(el);
	});

	it("does not apply stale device config when selected device changed during load", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const dev2 = mockDeviceInfo("bb", "Bravo");
		const { el, a, pushDeviceList } = await mountPanel([dev1, dev2]);

		// Seed a known clean baseline.
		a._perspective = null;
		a._grid = new Uint8Array(GRID_CELL_COUNT);
		await el.updateComplete;

		// Stub the device controller's loadDeviceConfig to return a Promise we control.
		// When the second pushDeviceList fires, dev2 is selected and _loadDeviceConfig("bb")
		// runs. We want that call to hang until AFTER we've deleted dev2.
		let resolveLoad: ((config: any) => void) | null = null;
		const loadPromise = new Promise<any>((resolve) => {
			resolveLoad = resolve;
		});
		vi.spyOn(a._deviceCtrl, "loadDeviceConfig").mockImplementation(() => loadPromise);

		// Step 1: delete dev1 (the selected device). DeviceController picks dev2 as replacement.
		// The panel fires _loadDeviceConfig("bb") which awaits the pending loadPromise.
		pushDeviceList([dev2]);
		await el.updateComplete;
		await new Promise((r) => setTimeout(r, 0));
		expect(a._selectedMac).toBe("bb");

		// Step 2: delete dev2 before the pending load resolves. Now _selectedMac === "".
		pushDeviceList([]);
		await el.updateComplete;
		expect(a._selectedMac).toBe("");

		// Step 3: resolve the pending load with dev2 config that would populate state.
		// Because _selectedMac is no longer "bb", the result MUST be dropped.
		resolveLoad!({
			calibration: {
				perspective: [1, 2, 3, 4, 5, 6, 7, 8, 9],
				room_width: 4000,
				room_depth: 3000,
			},
			room_layout: {},
		});
		await new Promise((r) => setTimeout(r, 0));
		await new Promise((r) => setTimeout(r, 0));
		await el.updateComplete;

		expect(a._perspective).toBeNull();
		expect(a._roomWidth).toBe(0);
		expect(a._roomDepth).toBe(0);
		document.body.removeChild(el);
	});
});
