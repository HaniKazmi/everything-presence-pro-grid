import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import { GRID_CELL_COUNT } from "../lib/grid.js";
import { INITIAL_ZONE_SLOTS } from "../eppgrid-panel.js";

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
	const captured: { deviceListCb: DeviceListCb | null } = { deviceListCb: null };
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
		a._furniture = [{ id: "f1", x: 0, y: 0, width: 300, height: 300, rot: 0, type: "bed" } as any];
		a._grid = new Uint8Array(GRID_CELL_COUNT).fill(1);
		a._zoneConfigs = INITIAL_ZONE_SLOTS.map((z) => (z ? { ...z } : null)) as any;
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
});
