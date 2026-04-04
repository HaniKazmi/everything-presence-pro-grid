import { beforeEach, describe, expect, it, vi } from "vitest";
import { FlasherController } from "../../controllers/flasher-controller.js";
import type { FlashableDevice, OtaProgress } from "../../types.js";

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
			expect(freshCtrl.otaProgress).toBeNull();
			expect(freshCtrl.flashingMac).toBeNull();
		});

		it("initializes USB state fields to defaults", () => {
			const freshHost = mockHost();
			const freshCtrl = new FlasherController(freshHost);
			expect(freshCtrl.usbConnected).toBe(false);
			expect(freshCtrl.usbDeviceMac).toBeNull();
			expect(freshCtrl.usbExistingDevice).toBeNull();
		});
	});

	// --- Lifecycle ---
	describe("hostDisconnected", () => {
		it("calls unsubOta if set", async () => {
			const unsub = vi.fn();
			(ctrl as any)._unsubOta = unsub;
			ctrl.hostDisconnected();
			expect(unsub).toHaveBeenCalled();
			expect((ctrl as any)._unsubOta).toBeUndefined();
		});

		it("does not throw when no unsubOta is set", () => {
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
	});

	// --- startOtaFlash ---
	describe("startOtaFlash", () => {
		it("subscribes via hass.connection.subscribeMessage with correct params", async () => {
			// Resolve immediately so startOtaFlash can complete
			let capturedCallback: ((msg: OtaProgress) => void) | undefined;
			hass.connection.subscribeMessage = vi
				.fn()
				.mockImplementation((cb: (msg: OtaProgress) => void) => {
					capturedCallback = cb;
					// Return a promise that resolves to an unsub fn
					return Promise.resolve(vi.fn());
				});

			const flashPromise = ctrl.startOtaFlash("aa:bb", "eppgrid-wifi");

			// Trigger completion by calling the callback with a terminal status
			await new Promise((r) => setTimeout(r, 0));
			capturedCallback!({
				step: "complete",
				status: "success",
			});

			await flashPromise;

			expect(hass.connection.subscribeMessage).toHaveBeenCalledWith(
				expect.any(Function),
				{ type: "eppgrid/flash_ota", mac: "aa:bb", variant: "eppgrid-wifi" },
			);
		});

		it("sets flashingMac when starting", async () => {
			let capturedCallback: ((msg: OtaProgress) => void) | undefined;
			hass.connection.subscribeMessage = vi
				.fn()
				.mockImplementation((cb: (msg: OtaProgress) => void) => {
					capturedCallback = cb;
					return Promise.resolve(vi.fn());
				});

			const flashPromise = ctrl.startOtaFlash("aa:bb", "eppgrid-wifi");
			expect(ctrl.flashingMac).toBe("aa:bb");

			await new Promise((r) => setTimeout(r, 0));
			capturedCallback!({ step: "complete", status: "success" });
			await flashPromise;
		});

		it("tracks OTA progress via callback messages", async () => {
			let capturedCallback: ((msg: OtaProgress) => void) | undefined;
			hass.connection.subscribeMessage = vi
				.fn()
				.mockImplementation((cb: (msg: OtaProgress) => void) => {
					capturedCallback = cb;
					return Promise.resolve(vi.fn());
				});

			const flashPromise = ctrl.startOtaFlash("aa:bb", "eppgrid-wifi");
			await new Promise((r) => setTimeout(r, 0));

			// Send in-progress update
			capturedCallback!({
				step: "downloading_firmware",
				status: "in_progress",
				progress: 42,
			});
			expect(ctrl.otaProgress).toEqual({
				step: "downloading_firmware",
				status: "in_progress",
				progress: 42,
			});
			expect(host.requestUpdate).toHaveBeenCalled();

			// Resolve
			capturedCallback!({ step: "complete", status: "success" });
			await flashPromise;
		});

		it("resolves when status is success", async () => {
			let capturedCallback: ((msg: OtaProgress) => void) | undefined;
			hass.connection.subscribeMessage = vi
				.fn()
				.mockImplementation((cb: (msg: OtaProgress) => void) => {
					capturedCallback = cb;
					return Promise.resolve(vi.fn());
				});

			const flashPromise = ctrl.startOtaFlash("aa:bb", "eppgrid-wifi");
			await new Promise((r) => setTimeout(r, 0));
			capturedCallback!({ step: "complete", status: "success" });
			await expect(flashPromise).resolves.toBeUndefined();
		});

		it("resolves when status is failed", async () => {
			let capturedCallback: ((msg: OtaProgress) => void) | undefined;
			hass.connection.subscribeMessage = vi
				.fn()
				.mockImplementation((cb: (msg: OtaProgress) => void) => {
					capturedCallback = cb;
					return Promise.resolve(vi.fn());
				});

			const flashPromise = ctrl.startOtaFlash("aa:bb", "eppgrid-wifi");
			await new Promise((r) => setTimeout(r, 0));
			capturedCallback!({ step: "error", status: "failed", error: "oops" });
			await expect(flashPromise).resolves.toBeUndefined();
		});

		it("resolves when status is timeout", async () => {
			let capturedCallback: ((msg: OtaProgress) => void) | undefined;
			hass.connection.subscribeMessage = vi
				.fn()
				.mockImplementation((cb: (msg: OtaProgress) => void) => {
					capturedCallback = cb;
					return Promise.resolve(vi.fn());
				});

			const flashPromise = ctrl.startOtaFlash("aa:bb", "eppgrid-wifi");
			await new Promise((r) => setTimeout(r, 0));
			capturedCallback!({ step: "waiting_for_reboot", status: "timeout" });
			await expect(flashPromise).resolves.toBeUndefined();
		});

		it("calls unsub on terminal status and clears it", async () => {
			const unsub = vi.fn();
			let capturedCallback: ((msg: OtaProgress) => void) | undefined;
			hass.connection.subscribeMessage = vi
				.fn()
				.mockImplementation((cb: (msg: OtaProgress) => void) => {
					capturedCallback = cb;
					return Promise.resolve(unsub);
				});

			const flashPromise = ctrl.startOtaFlash("aa:bb", "eppgrid-wifi");
			await new Promise((r) => setTimeout(r, 0));
			capturedCallback!({ step: "complete", status: "success" });
			await flashPromise;

			expect(unsub).toHaveBeenCalled();
			expect((ctrl as any)._unsubOta).toBeUndefined();
		});

		it("does nothing when hass is null", async () => {
			ctrl.hass = null;
			await expect(
				ctrl.startOtaFlash("aa:bb", "eppgrid-wifi"),
			).resolves.toBeUndefined();
			expect(hass.connection.subscribeMessage).not.toHaveBeenCalled();
		});

		it("sets error otaProgress and clears flashingMac when subscribeMessage rejects", async () => {
			hass.connection.subscribeMessage = vi
				.fn()
				.mockRejectedValue(new Error("connection refused"));

			await ctrl.startOtaFlash("aa:bb", "eppgrid-wifi");

			expect(ctrl.otaProgress).toEqual({
				step: "error",
				status: "failed",
				error: "Failed to start OTA flash",
			});
			expect(ctrl.flashingMac).toBeNull();
			expect(host.requestUpdate).toHaveBeenCalled();
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
