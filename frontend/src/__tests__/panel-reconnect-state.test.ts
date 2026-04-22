/**
 * Tests for panel state preservation across HA WebSocket drops and
 * device availability blips.  The user-facing contract is: if you are
 * editing (or just viewing) a device and the device goes offline and
 * comes back, you return to exactly where you were — same tab, same
 * dirty edits, same perspective — without the panel refetching config
 * behind your back.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";

type DeviceListCb = (msg: { devices: any[] }) => void;

const mountedPanels: EPPGridPanel[] = [];

function makeDevice(mac: string, available: boolean) {
	return {
		mac,
		name: "Alpha",
		host: null,
		available,
		configured: true,
		firmware_status: available ? "compatible" : "unavailable",
		current_connection_count: null,
		area: null,
	};
}

async function mountPanel(initialDevices: any[]) {
	localStorage.clear();
	if (initialDevices[0]) {
		localStorage.setItem("epp_selected_mac", initialDevices[0].mac);
	}
	const captured: { deviceListCb: DeviceListCb | null } = {
		deviceListCb: null,
	};
	const hass: any = {
		callWS: vi.fn().mockImplementation((msg: any) => {
			if (msg.type === "eppgrid/get_config") {
				// Parser treats a missing calibration as `perspective: null`,
				// so setting _perspective manually in the test lets us detect
				// any stray _applyConfig() call as a regression.
				return Promise.resolve({
					config: { calibration: null, room_layout: {} },
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
				}
				return Promise.resolve(() => {});
			}),
		},
		locale: { language: "en" },
		language: "en",
	};
	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	el.hass = hass;
	document.body.appendChild(el);
	mountedPanels.push(el);
	await el.updateComplete;
	await new Promise((r) => setTimeout(r, 0));
	await new Promise((r) => setTimeout(r, 0));
	await el.updateComplete;
	return {
		el,
		a: el as any,
		hass,
		pushDeviceList: (devices: any[]) => captured.deviceListCb!({ devices }),
		getConfigCallCount: () =>
			(hass.callWS as any).mock.calls.filter(
				(c: any[]) => c[0]?.type === "eppgrid/get_config",
			).length,
		sessionSubCount: () =>
			(hass.connection.subscribeMessage as any).mock.calls.filter(
				(c: any[]) => c[1]?.type === "eppgrid/subscribe_device",
			).length,
	};
}

describe("panel state survives device offline→online", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		while (mountedPanels.length) {
			const el = mountedPanels.pop()!;
			if (el.parentNode) {
				el.parentNode.removeChild(el);
			}
		}
	});

	it("preserves editor view and dirty state across unavailable→available", async () => {
		const { el, a, pushDeviceList } = await mountPanel([
			makeDevice("aa", true),
		]);
		// Simulate the user having opened the editor with a perspective
		// loaded and an in-progress edit.
		a._perspective = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		a._roomWidth = 4000;
		a._roomDepth = 3000;
		a._view = "editor";
		a._dirty = true;
		a._furniture = [
			{
				id: "f1",
				type: "icon",
				icon: "mdi:sofa",
				label: "Sofa",
				x: 100,
				y: 100,
				width: 600,
				height: 600,
				rotation: 0,
				lockAspect: true,
			},
		];
		await el.updateComplete;

		// Device drops offline.
		pushDeviceList([makeDevice("aa", false)]);
		await el.updateComplete;

		// Device comes back online.
		pushDeviceList([makeDevice("aa", true)]);
		await el.updateComplete;
		await new Promise((r) => setTimeout(r, 0));

		expect(a._view).toBe("editor");
		expect(a._dirty).toBe(true);
		expect(a._furniture).toHaveLength(1);
		expect(a._furniture[0].id).toBe("f1");
		expect(a._perspective).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		expect(a._roomWidth).toBe(4000);
		expect(a._roomDepth).toBe(3000);
	});

	it("preserves perspective when device list arrives transiently empty then repopulates", async () => {
		const { el, a, pushDeviceList } = await mountPanel([
			makeDevice("aa", true),
		]);
		a._perspective = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		a._roomWidth = 4000;
		a._roomDepth = 3000;
		a._view = "editor";
		await el.updateComplete;

		// HA integration reloads and pushes an empty list before it has
		// re-discovered devices.
		pushDeviceList([]);
		await el.updateComplete;

		// Device reappears.
		pushDeviceList([makeDevice("aa", true)]);
		await el.updateComplete;
		await new Promise((r) => setTimeout(r, 0));

		expect(a._perspective).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		expect(a._view).toBe("editor");
		expect(a._selectedMac).toBe("aa");
	});

	it("does not refetch or reapply config on the reconnect path", async () => {
		const { el, pushDeviceList, getConfigCallCount } = await mountPanel([
			makeDevice("aa", true),
		]);
		const before = getConfigCallCount();

		pushDeviceList([makeDevice("aa", false)]);
		await el.updateComplete;
		pushDeviceList([makeDevice("aa", true)]);
		await el.updateComplete;
		await new Promise((r) => setTimeout(r, 0));

		expect(getConfigCallCount()).toBe(before);
	});

	it("re-opens a fresh device session when the device transitions back to available", async () => {
		const { el, a, pushDeviceList, sessionSubCount } = await mountPanel([
			makeDevice("aa", true),
		]);
		const before = sessionSubCount();

		pushDeviceList([makeDevice("aa", false)]);
		await el.updateComplete;
		pushDeviceList([makeDevice("aa", true)]);
		await el.updateComplete;
		await new Promise((r) => setTimeout(r, 0));

		expect(sessionSubCount()).toBeGreaterThan(before);
		expect(a._deviceCtrl.hasDeviceSession).toBe(true);
	});
});
