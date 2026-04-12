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
			hass.connection.subscribeMessage = vi
				.fn()
				.mockImplementation((cb: any) => {
					cb({
						devices,
						firmware_base_url: "/api/fw",
						latest_firmware_version: "2.0",
					});
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
			hass.connection.subscribeMessage = vi
				.fn()
				.mockImplementation((msgCb: any) => {
					msgCb({ devices: [] });
					return Promise.resolve(vi.fn());
				});
			await ctrl.subscribeDeviceList();
			expect(cb).toHaveBeenCalled();
		});

		it("falls back to loadDevices on subscription error", async () => {
			hass.connection.subscribeMessage = vi
				.fn()
				.mockRejectedValue(new Error("fail"));
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

	// --- OTA state management ---
	describe("OTA state management", () => {
		let host: ReturnType<typeof mockHost>;
		let hass: ReturnType<typeof mockHass>;
		let ctrl: FlasherController;

		beforeEach(() => {
			host = mockHost();
			hass = mockHass();
			ctrl = new FlasherController(host);
			ctrl.hass = hass;
		});

		it("initializes with empty otaStates", () => {
			expect(ctrl.otaStates).toEqual({});
		});

		it("startOta sets updating state and calls update_firmware", async () => {
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "updating",
				progress: 0,
				error: null,
			});
			expect(hass.callWS).toHaveBeenCalledWith({
				type: "eppgrid/update_firmware",
				mac: "AA:BB:CC:DD:EE:01",
			});
		});

		it("startOta subscribes to ota progress", async () => {
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			expect(hass.connection.subscribeMessage).toHaveBeenCalledWith(
				expect.any(Function),
				{ type: "eppgrid/subscribe_ota_progress", mac: "AA:BB:CC:DD:EE:01" },
			);
		});

		it("updates progress on subscription events", async () => {
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "updating", progress: 65 });

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "updating",
				progress: 65,
				error: null,
			});
			expect(host.requestUpdate).toHaveBeenCalled();
		});

		it("transitions to error on timeout when progress stopped mid-update", async () => {
			vi.useFakeTimers();
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "updating", progress: 50 });

			vi.advanceTimersByTime(10000);

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "error",
				progress: null,
				error: "Connection lost during update",
			});
			vi.useRealTimers();
		});

		it("transitions to error on timeout when no progress was received", async () => {
			vi.useFakeTimers();
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			// No events arrive — initial timeout fires after 15s
			vi.advanceTimersByTime(15000);

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "error",
				progress: null,
				error: "Update timed out",
			});
			vi.useRealTimers();
		});

		it("transitions to success state", async () => {
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "success", version: "0.90.0-alpha" });

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("success");
		});

		it("transitions to error state with message", async () => {
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "error", message: "Connection lost" });

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "error",
				progress: null,
				error: "Connection lost",
			});
		});

		it("dismissOtaError clears state for a device", () => {
			ctrl.otaStates["AA:BB:CC:DD:EE:01"] = {
				state: "error",
				progress: null,
				error: "Connection lost",
			};
			ctrl.dismissOtaError("AA:BB:CC:DD:EE:01");

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toBeUndefined();
			expect(host.requestUpdate).toHaveBeenCalled();
		});

		it("sets error when update_firmware call fails", async () => {
			hass.callWS = vi.fn().mockRejectedValue(new Error("Device offline"));

			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "error",
				progress: null,
				error: "Failed to start update. Is the device online?",
			});
		});

		it("sets error when subscription fails after update_firmware succeeds", async () => {
			hass.connection.subscribeMessage = vi
				.fn()
				.mockRejectedValue(new Error("sub failed"));

			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "error",
				progress: null,
				error: "Failed to connect to device",
			});
		});

		it("error event with no message defaults to 'Update failed'", async () => {
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "error" });

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "error",
				progress: null,
				error: "Update failed",
			});
		});

		it("_otaSuccess auto-dismisses after 5 seconds", async () => {
			vi.useFakeTimers();
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "success" });

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("success");

			vi.advanceTimersByTime(5000);

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toBeUndefined();
			expect(host.requestUpdate).toHaveBeenCalled();
			vi.useRealTimers();
		});

		it("_otaSuccess auto-dismiss does not delete if state changed", async () => {
			vi.useFakeTimers();
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "success" });

			// Manually change state before timeout fires
			ctrl.otaStates["AA:BB:CC:DD:EE:01"] = {
				state: "updating",
				progress: 0,
				error: null,
			};

			vi.advanceTimersByTime(5000);

			// Should NOT have been deleted because state is no longer "success"
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toBeDefined();
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("updating");
			vi.useRealTimers();
		});

		it("progress >= 100 triggers _otaSuccess", async () => {
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "updating", progress: 100 });

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("success");
		});

		it("updating event with progress=0 uses 15s timeout", async () => {
			vi.useFakeTimers();
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "updating", progress: 0 });

			// After 10s, should still be updating (15s timeout)
			vi.advanceTimersByTime(10000);
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("updating");

			// After 15s total, should have timed out
			vi.advanceTimersByTime(5000);
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("error");
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].error).toBe(
				"Update timed out",
			);
			vi.useRealTimers();
		});

		it("updating event with progress > 0 uses 10s timeout", async () => {
			vi.useFakeTimers();
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "updating", progress: 25 });

			vi.advanceTimersByTime(10000);
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("error");
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].error).toBe(
				"Connection lost during update",
			);
			vi.useRealTimers();
		});

		it("timeout does not fire if state is no longer updating", async () => {
			vi.useFakeTimers();
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "updating", progress: 50 });

			// Manually change state before timeout
			ctrl.otaStates["AA:BB:CC:DD:EE:01"] = {
				state: "success",
				progress: null,
				error: null,
			};

			vi.advanceTimersByTime(10000);

			// Should still be success, not error
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("success");
			vi.useRealTimers();
		});

		it("_checkOtaDevicesOffline sets error when device goes offline during OTA", async () => {
			// Start OTA
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			// Set up subscription callback to capture the device list handler
			const deviceListCallback =
				hass.connection.subscribeMessage.mock.calls[0]?.[0];

			// Directly set updating state
			ctrl.otaStates["AA:BB:CC:DD:EE:01"] = {
				state: "updating",
				progress: 50,
				error: null,
			};

			// Simulate device going offline via _applyDeviceList
			ctrl.flashableDevices = [
				{
					mac: "AA:BB:CC:DD:EE:01",
					name: "Test",
					host: "192.168.1.10",
					available: false,
					firmware_type: "eppgrid",
					firmware_version: "1.0.0",
					esphome_config_entry_id: "entry-1",
					update_available: true,
					firmware_status: "firmware_behind",
				},
			];

			// Call _checkOtaDevicesOffline directly
			(ctrl as any)._checkOtaDevicesOffline();

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "error",
				progress: null,
				error: "Device went offline during update",
			});
		});

		it("_checkOtaDevicesOffline skips devices not in updating state", () => {
			ctrl.otaStates["AA:BB:CC:DD:EE:01"] = {
				state: "error",
				progress: null,
				error: "already failed",
			};
			ctrl.flashableDevices = [
				{
					mac: "AA:BB:CC:DD:EE:01",
					name: "Test",
					host: "192.168.1.10",
					available: false,
					firmware_type: "eppgrid",
					firmware_version: "1.0.0",
					esphome_config_entry_id: "entry-1",
					update_available: false,
					firmware_status: "compatible",
				},
			];

			(ctrl as any)._checkOtaDevicesOffline();

			// Should NOT have changed
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].error).toBe("already failed");
		});

		it("_checkOtaDevicesOffline skips available devices", () => {
			ctrl.otaStates["AA:BB:CC:DD:EE:01"] = {
				state: "updating",
				progress: 50,
				error: null,
			};
			ctrl.flashableDevices = [
				{
					mac: "AA:BB:CC:DD:EE:01",
					name: "Test",
					host: "192.168.1.10",
					available: true,
					firmware_type: "eppgrid",
					firmware_version: "1.0.0",
					esphome_config_entry_id: "entry-1",
					update_available: true,
					firmware_status: "firmware_behind",
				},
			];

			(ctrl as any)._checkOtaDevicesOffline();

			// Should still be updating
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("updating");
		});

		it("hostDisconnected cleans up OTA subscriptions and timeouts", async () => {
			vi.useFakeTimers();
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const unsub = hass.connection.subscribeMessage.mock.results[0].value;

			ctrl.hostDisconnected();

			expect(ctrl.otaStates).toEqual({});
			vi.useRealTimers();
		});

		it("_applyDeviceList triggers _checkOtaDevicesOffline", async () => {
			ctrl.otaStates["AA:BB:CC:DD:EE:01"] = {
				state: "updating",
				progress: 50,
				error: null,
			};

			// Subscribe to device list so _applyDeviceList works
			hass.connection.subscribeMessage = vi
				.fn()
				.mockImplementation((cb: any) => {
					cb({
						devices: [
							{
								mac: "AA:BB:CC:DD:EE:01",
								name: "Test",
								host: "192.168.1.10",
								available: false,
								firmware_type: "eppgrid",
								firmware_version: "1.0.0",
								esphome_config_entry_id: "entry-1",
								update_available: true,
								firmware_status: "firmware_behind",
							},
						],
					});
					return Promise.resolve(vi.fn());
				});

			await ctrl.subscribeDeviceList();

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "error",
				progress: null,
				error: "Device went offline during update",
			});
		});

		it("updating event with null progress uses 15s timeout", async () => {
			vi.useFakeTimers();
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "updating", progress: null });

			vi.advanceTimersByTime(15000);
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("error");
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].error).toBe(
				"Update timed out",
			);
			vi.useRealTimers();
		});
	});
});
