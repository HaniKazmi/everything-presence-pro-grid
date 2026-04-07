import { beforeEach, describe, expect, it, vi } from "vitest";
import { FlasherController } from "../../controllers/flasher-controller.js";
import type { FlashableDevice } from "../../types.js";

function mockHost() {
	return {
		requestUpdate: vi.fn(),
		addController: vi.fn(),
		removeController: vi.fn(),
		updateComplete: Promise.resolve(true),
	};
}

function mockHass(devices: FlashableDevice[] = []) {
	return {
		callWS: vi.fn().mockResolvedValue({ devices }),
		connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
	};
}

describe("FlasherController", () => {
	let host: ReturnType<typeof mockHost>;
	let hass: ReturnType<typeof mockHass>;
	let ctrl: FlasherController;

	beforeEach(() => {
		host = mockHost();
		hass = mockHass();
		ctrl = new FlasherController(host);
		ctrl.hass = hass;
	});

	// --- Construction ---
	describe("constructor", () => {
		it("registers itself with the host", () => {
			expect(host.addController).toHaveBeenCalledWith(ctrl);
		});

		it("initializes with empty state", () => {
			const freshHost = mockHost();
			const freshCtrl = new FlasherController(freshHost);
			expect(freshCtrl.flashableDevices).toEqual([]);
			expect(freshCtrl.loading).toBe(true);
		});

		it("initializes USB state fields to defaults", () => {
			const freshHost = mockHost();
			const freshCtrl = new FlasherController(freshHost);
			expect(freshCtrl.usbConnected).toBe(false);
			expect(freshCtrl.usbDeviceMac).toBeNull();
			expect(freshCtrl.usbExistingDevice).toBeNull();
		});

		it("opRunning defaults to false", () => {
			const freshHost = mockHost();
			const freshCtrl = new FlasherController(freshHost);
			expect(freshCtrl.opRunning).toBe(false);
		});
	});

	// --- Lifecycle ---
	describe("hostDisconnected", () => {
		it("does not throw when called", () => {
			expect(() => ctrl.hostDisconnected()).not.toThrow();
		});
	});

	// --- loadDevices ---
	describe("loadDevices", () => {
		it("calls eppgrid/list_flashable_devices", async () => {
			await ctrl.loadDevices();
			expect(hass.callWS).toHaveBeenCalledWith({
				type: "eppgrid/list_flashable_devices",
			});
		});

		it("sets flashableDevices from response", async () => {
			const devices: FlashableDevice[] = [
				{
					mac: "aa:bb:cc:dd:ee:ff",
					name: "Sensor A",
					host: "192.168.1.10",
					available: true,
					firmware_type: "eppgrid",
					firmware_version: "1.0.0",
					esphome_config_entry_id: "entry-123",
					update_available: false,
				},
			];
			ctrl.hass = mockHass(devices);
			await ctrl.loadDevices();
			expect(ctrl.flashableDevices).toEqual(devices);
		});

		it("sets loading=false after successful load", async () => {
			await ctrl.loadDevices();
			expect(ctrl.loading).toBe(false);
		});

		it("calls host.requestUpdate after loading", async () => {
			await ctrl.loadDevices();
			expect(host.requestUpdate).toHaveBeenCalled();
		});

		it("handles WS error gracefully — sets empty array and loading=false", async () => {
			ctrl.hass = {
				callWS: vi.fn().mockRejectedValue(new Error("ws error")),
				connection: { subscribeMessage: vi.fn() },
			};
			await ctrl.loadDevices();
			expect(ctrl.flashableDevices).toEqual([]);
			expect(ctrl.loading).toBe(false);
		});

		it("calls host.requestUpdate on error", async () => {
			ctrl.hass = {
				callWS: vi.fn().mockRejectedValue(new Error("ws error")),
				connection: { subscribeMessage: vi.fn() },
			};
			await ctrl.loadDevices();
			expect(host.requestUpdate).toHaveBeenCalled();
		});

		it("sets loading=false and returns when hass is null", async () => {
			ctrl.hass = null;
			await ctrl.loadDevices();
			expect(ctrl.loading).toBe(false);
		});

		it("stores firmwareBaseUrl from response", async () => {
			ctrl.hass = {
				callWS: vi.fn().mockResolvedValue({
					devices: [],
					firmware_base_url: "https://example.com/fw",
				}),
				connection: { subscribeMessage: vi.fn() },
			};
			await ctrl.loadDevices();
			expect(ctrl.firmwareBaseUrl).toBe("https://example.com/fw");
		});

		it("defaults firmwareBaseUrl to empty string when not in response", async () => {
			ctrl.hass = {
				callWS: vi.fn().mockResolvedValue({ devices: [] }),
				connection: { subscribeMessage: vi.fn() },
			};
			await ctrl.loadDevices();
			expect(ctrl.firmwareBaseUrl).toBe("");
		});
	});

	// --- subscribeDeviceList ---
	describe("subscribeDeviceList", () => {
		it("subscribes to eppgrid/subscribe_flashable_devices", async () => {
			hass.connection.subscribeMessage = vi.fn().mockResolvedValue(vi.fn());
			await ctrl.subscribeDeviceList();
			expect(hass.connection.subscribeMessage).toHaveBeenCalledWith(
				expect.any(Function),
				{ type: "eppgrid/subscribe_flashable_devices" },
			);
		});

		it("applies device list from subscription callback", async () => {
			const devices: FlashableDevice[] = [
				{
					mac: "aa:bb:cc:dd:ee:ff",
					name: "Sensor A",
					host: "192.168.1.10",
					available: true,
					firmware_type: "eppgrid",
					firmware_version: "1.0.0",
					esphome_config_entry_id: "entry-123",
					update_available: false,
				},
			];
			hass.connection.subscribeMessage = vi.fn().mockImplementation((cb: any) => {
				cb({ devices, firmware_base_url: "/api/fw", latest_firmware_version: "2.0" });
				return Promise.resolve(vi.fn());
			});
			await ctrl.subscribeDeviceList();
			expect(ctrl.flashableDevices).toEqual(devices);
			expect(ctrl.firmwareBaseUrl).toBe("/api/fw");
			expect(ctrl.firmwareVersion).toBe("2.0");
			expect(ctrl.loading).toBe(false);
		});

		it("fires onDeviceListChanged callback", async () => {
			const cb = vi.fn();
			ctrl.onDeviceListChanged = cb;
			hass.connection.subscribeMessage = vi.fn().mockImplementation((msgCb: any) => {
				msgCb({ devices: [] });
				return Promise.resolve(vi.fn());
			});
			await ctrl.subscribeDeviceList();
			expect(cb).toHaveBeenCalled();
		});

		it("falls back to loadDevices on subscription error", async () => {
			hass.connection.subscribeMessage = vi.fn().mockRejectedValue(new Error("fail"));
			const loadSpy = vi.spyOn(ctrl, "loadDevices");
			await ctrl.subscribeDeviceList();
			expect(loadSpy).toHaveBeenCalled();
		});

		it("does nothing when hass is null", async () => {
			ctrl.hass = null;
			await ctrl.subscribeDeviceList();
			// No error thrown, no subscription
		});

		it("unsubscribes previous subscription before resubscribing", async () => {
			const unsub1 = vi.fn();
			hass.connection.subscribeMessage = vi.fn().mockResolvedValue(unsub1);
			await ctrl.subscribeDeviceList();

			const unsub2 = vi.fn();
			hass.connection.subscribeMessage = vi.fn().mockResolvedValue(unsub2);
			await ctrl.subscribeDeviceList();

			expect(unsub1).toHaveBeenCalled();
		});
	});

	// --- unsubscribeDeviceList ---
	describe("unsubscribeDeviceList", () => {
		it("calls unsub function from subscription", async () => {
			const unsub = vi.fn();
			hass.connection.subscribeMessage = vi.fn().mockResolvedValue(unsub);
			await ctrl.subscribeDeviceList();
			ctrl.unsubscribeDeviceList();
			expect(unsub).toHaveBeenCalled();
		});

		it("does not throw when no subscription exists", () => {
			expect(() => ctrl.unsubscribeDeviceList()).not.toThrow();
		});

		it("handles stale subscription gracefully", async () => {
			hass.connection.subscribeMessage = vi.fn().mockResolvedValue(() => {
				throw new Error("stale");
			});
			await ctrl.subscribeDeviceList();
			expect(() => ctrl.unsubscribeDeviceList()).not.toThrow();
		});
	});

	// --- hostDisconnected cleans up subscription ---
	describe("hostDisconnected with subscription", () => {
		it("unsubscribes device list on disconnect", async () => {
			const unsub = vi.fn();
			hass.connection.subscribeMessage = vi.fn().mockResolvedValue(unsub);
			await ctrl.subscribeDeviceList();
			ctrl.hostDisconnected();
			expect(unsub).toHaveBeenCalled();
		});
	});

	// --- deleteEsphomeDevice ---
	describe("deleteEsphomeDevice", () => {
		it("calls eppgrid/delete_esphome_device with config_entry_id", async () => {
			await ctrl.deleteEsphomeDevice("entry-abc");
			expect(hass.callWS).toHaveBeenCalledWith({
				type: "eppgrid/delete_esphome_device",
				config_entry_id: "entry-abc",
			});
		});

		it("does nothing when hass is null", async () => {
			ctrl.hass = null;
			await expect(
				ctrl.deleteEsphomeDevice("entry-abc"),
			).resolves.toBeUndefined();
			expect(hass.callWS).not.toHaveBeenCalled();
		});
	});

	// --- addEsphomeDevice ---
	describe("addEsphomeDevice", () => {
		it("calls eppgrid/add_esphome_device with host", async () => {
			await ctrl.addEsphomeDevice("192.168.1.10");
			expect(hass.callWS).toHaveBeenCalledWith({
				type: "eppgrid/add_esphome_device",
				host: "192.168.1.10",
			});
		});

		it("does nothing when hass is null", async () => {
			ctrl.hass = null;
			await expect(
				ctrl.addEsphomeDevice("192.168.1.10"),
			).resolves.toBeUndefined();
			expect(hass.callWS).not.toHaveBeenCalled();
		});
	});

	// --- hass getter/setter ---
	describe("hass", () => {
		it("stores and returns the hass reference", () => {
			const h = mockHass();
			ctrl.hass = h;
			expect(ctrl.hass).toBe(h);
		});
	});

	// --- USB Flash State ---
	describe("USB flash state", () => {
		it("initializes usbFlashState to null", () => {
			const freshHost = mockHost();
			const freshCtrl = new FlasherController(freshHost);
			expect(freshCtrl.usbFlashState).toBeNull();
		});

		it("initializes wifiNetworks to empty array", () => {
			const freshHost = mockHost();
			const freshCtrl = new FlasherController(freshHost);
			expect(freshCtrl.wifiNetworks).toEqual([]);
		});

		it("initializes serialPort to null", () => {
			const freshHost = mockHost();
			const freshCtrl = new FlasherController(freshHost);
			expect((freshCtrl as any)._serialPort).toBeNull();
		});
	});

	// --- serialPort getter/setter ---
	describe("serialPort", () => {
		it("stores a port via setter and retrieves it via getter", () => {
			const mockPort = {
				open: vi.fn(),
				close: vi.fn().mockResolvedValue(undefined),
			} as unknown as SerialPort;

			ctrl.serialPort = mockPort;
			expect(ctrl.serialPort).toBe(mockPort);
		});

		it("returns null when no port has been set", () => {
			const freshHost = mockHost();
			const freshCtrl = new FlasherController(freshHost);
			expect(freshCtrl.serialPort).toBeNull();
		});

		it("can be reset to null after being set", () => {
			const mockPort = {
				open: vi.fn(),
				close: vi.fn().mockResolvedValue(undefined),
			} as unknown as SerialPort;

			ctrl.serialPort = mockPort;
			ctrl.serialPort = null;
			expect(ctrl.serialPort).toBeNull();
		});
	});

	describe("updateUsbState", () => {
		it("sets usbFlashState and requests update", () => {
			ctrl.updateUsbState({ step: "flashing", progress: 42 });
			expect(ctrl.usbFlashState).toEqual({ step: "flashing", progress: 42 });
			expect(host.requestUpdate).toHaveBeenCalled();
		});

		it("merges partial state updates", () => {
			ctrl.updateUsbState({ step: "flashing", progress: 0 });
			ctrl.updateUsbState({ step: "flashing", progress: 75 });
			expect(ctrl.usbFlashState).toEqual({ step: "flashing", progress: 75 });
		});
	});

	describe("resetUsbState", () => {
		it("clears USB flash state", () => {
			ctrl.updateUsbState({ step: "flashing" });
			ctrl.resetUsbState();
			expect(ctrl.usbFlashState).toBeNull();
			expect(ctrl.wifiNetworks).toEqual([]);
		});

		it("increments opId", () => {
			const before = ctrl.opId;
			ctrl.resetUsbState();
			expect(ctrl.opId).toBe(before + 1);
		});

		it("clears serialPort", () => {
			ctrl.serialPort = { close: vi.fn().mockResolvedValue(undefined) } as any;
			ctrl.resetUsbState();
			expect(ctrl.serialPort).toBeNull();
		});
	});

	describe("hostDisconnected with USB", () => {
		it("closes serial port if open", () => {
			const mockPort = { close: vi.fn().mockResolvedValue(undefined) };
			(ctrl as any)._serialPort = mockPort;
			ctrl.hostDisconnected();
			expect(mockPort.close).toHaveBeenCalled();
		});
	});
});
