import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceController } from "../../controllers/device-controller.js";
import type { DeviceInfo } from "../../types.js";

function mockHost() {
	return {
		requestUpdate: vi.fn(),
		addController: vi.fn(),
		removeController: vi.fn(),
		updateComplete: Promise.resolve(true),
	};
}

function mockHass(devices: DeviceInfo[] = []) {
	return {
		callWS: vi.fn().mockResolvedValue({ devices }),
		connection: {
			subscribeMessage: vi.fn().mockResolvedValue(vi.fn()),
		},
	};
}

function makeDevice(mac: string, available: boolean): DeviceInfo {
	return {
		mac,
		name: "EPP",
		host: null,
		available,
		configured: true,
		firmware_status: "compatible",
		current_connection_count: null,
		area: null,
	};
}

describe("DeviceController", () => {
	let host: ReturnType<typeof mockHost>;
	let hass: ReturnType<typeof mockHass>;
	let ctrl: DeviceController;

	beforeEach(() => {
		host = mockHost();
		hass = mockHass();
		ctrl = new DeviceController(host);
		ctrl.hass = hass;
		localStorage.clear();
	});

	// --- Construction ---
	describe("constructor", () => {
		it("registers itself with the host", () => {
			expect(host.addController).toHaveBeenCalledWith(ctrl);
		});

		it("initializes with default state", () => {
			expect(ctrl.devices).toEqual([]);
			expect(ctrl.selectedMac).toBe("");
			expect(ctrl.loading).toBe(true);
		});
	});

	// --- Lifecycle ---
	describe("hostDisconnected", () => {
		it("closes the device session", async () => {
			ctrl.hass = mockHass();
			await ctrl.openDeviceSession("aa:bb");
			expect(ctrl.hasDeviceSession).toBe(true);
			ctrl.hostDisconnected();
			expect(ctrl.hasDeviceSession).toBe(false);
		});
	});

	// --- loadDevices ---
	describe("loadDevices", () => {
		it("loads and sorts devices by name", async () => {
			const devices: DeviceInfo[] = [
				{
					mac: "bb",
					name: "Zed",
					host: null,
					available: true,
					configured: true,
					firmware_status: "compatible",
					current_connection_count: null,
					area: null,
				},
				{
					mac: "aa",
					name: "Alpha",
					host: null,
					available: true,
					configured: true,
					firmware_status: "compatible",
					current_connection_count: null,
					area: null,
				},
			];
			ctrl.hass = mockHass(devices);
			await ctrl.loadDevices();

			expect(ctrl.devices).toHaveLength(2);
			expect(ctrl.devices[0].name).toBe("Alpha");
			expect(ctrl.devices[1].name).toBe("Zed");
		});

		it("selects the first device by default", async () => {
			const devices: DeviceInfo[] = [
				{
					mac: "bb",
					name: "Zed",
					host: null,
					available: true,
					configured: true,
					firmware_status: "compatible",
					current_connection_count: null,
					area: null,
				},
				{
					mac: "aa",
					name: "Alpha",
					host: null,
					available: true,
					configured: true,
					firmware_status: "compatible",
					current_connection_count: null,
					area: null,
				},
			];
			ctrl.hass = mockHass(devices);
			await ctrl.loadDevices();

			// Sorted, so "Alpha" (mac "aa") is first
			expect(ctrl.selectedMac).toBe("aa");
		});

		it("restores selected mac from localStorage", async () => {
			localStorage.setItem("epp_selected_mac", "bb");
			const devices: DeviceInfo[] = [
				{
					mac: "bb",
					name: "Zed",
					host: null,
					available: true,
					configured: true,
					firmware_status: "compatible",
					current_connection_count: null,
					area: null,
				},
				{
					mac: "aa",
					name: "Alpha",
					host: null,
					available: true,
					configured: true,
					firmware_status: "compatible",
					current_connection_count: null,
					area: null,
				},
			];
			ctrl.hass = mockHass(devices);
			await ctrl.loadDevices();

			expect(ctrl.selectedMac).toBe("bb");
		});

		it("falls back to first device when stored mac not found", async () => {
			localStorage.setItem("epp_selected_mac", "gone");
			const devices: DeviceInfo[] = [
				{
					mac: "aa",
					name: "Alpha",
					host: null,
					available: true,
					configured: true,
					firmware_status: "compatible",
					current_connection_count: null,
					area: null,
				},
			];
			ctrl.hass = mockHass(devices);
			await ctrl.loadDevices();

			expect(ctrl.selectedMac).toBe("aa");
		});

		it("sets empty devices on callWS failure", async () => {
			ctrl.hass = {
				callWS: vi.fn().mockRejectedValue(new Error("fail")),
				connection: { subscribeMessage: vi.fn() },
			};
			await ctrl.loadDevices();
			expect(ctrl.devices).toEqual([]);
		});

		it("does nothing when hass is null", async () => {
			ctrl.hass = null;
			await ctrl.loadDevices();
			expect(ctrl.devices).toEqual([]);
		});

		it("populates showRoomCalibrationTutorial from the response", async () => {
			const devices: DeviceInfo[] = [];
			ctrl.hass = {
				callWS: vi.fn().mockResolvedValue({
					devices,
					show_room_calibration_tutorial: false,
				}),
				connection: { subscribeMessage: vi.fn() },
			};
			await ctrl.loadDevices();
			expect(ctrl.showRoomCalibrationTutorial).toBe(false);
		});

		it("defaults showRoomCalibrationTutorial to true when flag is missing", async () => {
			ctrl.hass = mockHass([]);
			await ctrl.loadDevices();
			expect(ctrl.showRoomCalibrationTutorial).toBe(true);
		});

		it("calls host.requestUpdate after loading", async () => {
			const devices: DeviceInfo[] = [
				{
					mac: "aa",
					name: "A",
					host: null,
					available: true,
					configured: true,
					firmware_status: "compatible",
					current_connection_count: null,
					area: null,
				},
			];
			ctrl.hass = mockHass(devices);
			await ctrl.loadDevices();
			expect(host.requestUpdate).toHaveBeenCalled();
		});
	});

	// --- loadDeviceConfig ---
	describe("setShowRoomCalibrationTutorial", () => {
		it("updates the flag and triggers a host update when the value changes", () => {
			ctrl.showRoomCalibrationTutorial = true;
			host.requestUpdate.mockClear();

			ctrl.setShowRoomCalibrationTutorial(false);

			expect(ctrl.showRoomCalibrationTutorial).toBe(false);
			expect(host.requestUpdate).toHaveBeenCalledTimes(1);
		});

		it("does not trigger a host update when the value is unchanged", () => {
			ctrl.showRoomCalibrationTutorial = true;
			host.requestUpdate.mockClear();

			ctrl.setShowRoomCalibrationTutorial(true);

			expect(host.requestUpdate).not.toHaveBeenCalled();
		});
	});

	describe("subscribeDeviceList", () => {
		it("updates showRoomCalibrationTutorial from subscription messages", async () => {
			let capturedCb: ((msg: any) => void) | null = null;
			ctrl.hass = {
				callWS: vi.fn(),
				connection: {
					subscribeMessage: vi.fn((cb: any) => {
						capturedCb = cb;
						return Promise.resolve(() => {});
					}),
				},
			};

			await ctrl.subscribeDeviceList();
			expect(capturedCb).not.toBeNull();

			capturedCb!({ devices: [], show_room_calibration_tutorial: false });
			expect(ctrl.showRoomCalibrationTutorial).toBe(false);

			capturedCb!({ devices: [], show_room_calibration_tutorial: true });
			expect(ctrl.showRoomCalibrationTutorial).toBe(true);
		});
	});

	describe("reopenSession", () => {
		it("opens the device session and subscribes to targets without fetching config", async () => {
			const unsub = vi.fn();
			const callWS = vi.fn().mockResolvedValue({ config: {} });
			const subscribeMessage = vi.fn().mockResolvedValue(unsub);
			ctrl.hass = { callWS, connection: { subscribeMessage } };

			await ctrl.reopenSession("aa");

			// No config fetch on the reconnect path.
			const getConfigCalls = callWS.mock.calls.filter(
				(c: any[]) => c[0]?.type === "eppgrid/get_config",
			);
			expect(getConfigCalls).toHaveLength(0);

			// Session and target subscriptions are opened.
			const subTypes = subscribeMessage.mock.calls.map(
				(c: any[]) => c[1]?.type,
			);
			expect(subTypes).toContain("eppgrid/subscribe_device");
			expect(subTypes).toContain("eppgrid/subscribe_grid_targets");
			expect(ctrl.hasDeviceSession).toBe(true);
		});
	});

	describe("loadDeviceConfig", () => {
		it("returns the config from the backend", async () => {
			ctrl.hass = {
				callWS: vi.fn().mockResolvedValue({ config: { key: "val" } }),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
			};
			const config = await ctrl.loadDeviceConfig("aa");
			expect(config).toEqual({ key: "val" });
		});

		it("returns null when callWS fails", async () => {
			ctrl.hass = {
				callWS: vi.fn().mockRejectedValue(new Error("nope")),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
			};
			const config = await ctrl.loadDeviceConfig("aa");
			expect(config).toBeNull();
		});

		it("opens a device session and subscribes to targets", async () => {
			const unsubFn = vi.fn();
			ctrl.hass = {
				callWS: vi.fn().mockResolvedValue({ config: {} }),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(unsubFn) },
			};
			await ctrl.loadDeviceConfig("aa");
			expect(ctrl.hasDeviceSession).toBe(true);
			// subscribeMessage called for: device session, grid targets, raw targets
			expect(ctrl.hass.connection.subscribeMessage).toHaveBeenCalledTimes(3);
		});
	});

	// --- Session management ---
	describe("openDeviceSession", () => {
		it("subscribes to eppgrid/subscribe_device", async () => {
			await ctrl.openDeviceSession("aa");
			expect(hass.connection.subscribeMessage).toHaveBeenCalledWith(
				expect.any(Function),
				{ type: "eppgrid/subscribe_device", mac: "aa" },
			);
			expect(ctrl.hasDeviceSession).toBe(true);
		});

		it("closes previous session before opening new one", async () => {
			const unsub1 = vi.fn();
			const conn = { subscribeMessage: vi.fn().mockResolvedValue(unsub1) };
			ctrl.hass = {
				callWS: vi.fn(),
				connection: conn,
			};
			await ctrl.openDeviceSession("aa");

			// Same connection — unsub1 should be called when opening new session
			conn.subscribeMessage.mockResolvedValue(vi.fn());
			await ctrl.openDeviceSession("bb");

			expect(unsub1).toHaveBeenCalled();
			expect(ctrl.hasDeviceSession).toBe(true);
		});

		it("clears stale subscriptions when connection changes", async () => {
			const unsub1 = vi.fn();
			ctrl.hass = {
				callWS: vi.fn(),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(unsub1) },
			};
			await ctrl.openDeviceSession("aa");
			expect(ctrl.hasDeviceSession).toBe(true);

			// New connection — stale sub is cleared without calling unsub
			ctrl.hass = {
				callWS: vi.fn(),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
			};
			expect(ctrl.hasDeviceSession).toBe(false);
			expect(unsub1).not.toHaveBeenCalled();
		});

		it("does nothing when mac is empty", async () => {
			await ctrl.openDeviceSession("");
			expect(hass.connection.subscribeMessage).not.toHaveBeenCalled();
			expect(ctrl.hasDeviceSession).toBe(false);
		});

		it("does nothing when hass is null", async () => {
			ctrl.hass = null;
			await ctrl.openDeviceSession("aa");
			expect(ctrl.hasDeviceSession).toBe(false);
		});

		it("handles subscription failure gracefully", async () => {
			const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
			ctrl.hass = {
				callWS: vi.fn(),
				connection: {
					subscribeMessage: vi.fn().mockRejectedValue(new Error("fail")),
				},
			};
			await ctrl.openDeviceSession("aa");
			expect(ctrl.hasDeviceSession).toBe(false);
			expect(warn).toHaveBeenCalledWith(
				"Failed to open device session:",
				expect.any(Error),
			);
			warn.mockRestore();
		});

		it("sets connectionFailed when subscription fails with connection_failed code", async () => {
			const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
			const err = Object.assign(new Error("fail"), {
				code: "connection_failed",
			});
			ctrl.hass = {
				callWS: vi.fn(),
				connection: {
					subscribeMessage: vi.fn().mockRejectedValue(err),
				},
			};
			expect(ctrl.connectionFailed).toBe(false);
			await ctrl.openDeviceSession("aa");
			expect(ctrl.connectionFailed).toBe(true);
			warn.mockRestore();
		});

		it("sets connectionFailed when subscription fails with not_found code", async () => {
			const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
			const err = Object.assign(new Error("fail"), { code: "not_found" });
			ctrl.hass = {
				callWS: vi.fn(),
				connection: {
					subscribeMessage: vi.fn().mockRejectedValue(err),
				},
			};
			expect(ctrl.connectionFailed).toBe(false);
			await ctrl.openDeviceSession("aa");
			expect(ctrl.connectionFailed).toBe(true);
			warn.mockRestore();
		});

		it("does not set connectionFailed for unrelated errors", async () => {
			const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
			ctrl.hass = {
				callWS: vi.fn(),
				connection: {
					subscribeMessage: vi.fn().mockRejectedValue(new Error("unrelated")),
				},
			};
			expect(ctrl.connectionFailed).toBe(false);
			await ctrl.openDeviceSession("aa");
			expect(ctrl.connectionFailed).toBe(false);
			warn.mockRestore();
		});

		it("clears connectionFailed on successful session", async () => {
			(ctrl as any)._connectionFailed = true;
			await ctrl.openDeviceSession("aa");
			expect(ctrl.connectionFailed).toBe(false);
		});
	});

	describe("closeDeviceSession", () => {
		it("calls unsubscribe and clears the session", async () => {
			const unsub = vi.fn();
			ctrl.hass = {
				callWS: vi.fn(),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(unsub) },
			};
			await ctrl.openDeviceSession("aa");
			ctrl.closeDeviceSession();
			expect(unsub).toHaveBeenCalled();
			expect(ctrl.hasDeviceSession).toBe(false);
		});

		it("handles stale unsub gracefully", async () => {
			const unsub = vi.fn().mockImplementation(() => {
				throw new Error("stale");
			});
			ctrl.hass = {
				callWS: vi.fn(),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(unsub) },
			};
			await ctrl.openDeviceSession("aa");
			// Should not throw
			ctrl.closeDeviceSession();
			expect(ctrl.hasDeviceSession).toBe(false);
		});
	});

	// --- Target subscription ---
	describe("subscribeTargets", () => {
		it("subscribes to grid targets and display", () => {
			ctrl.subscribeTargets("aa");
			const calls = hass.connection.subscribeMessage.mock.calls;
			expect(calls).toHaveLength(2);
			expect(calls[0][1]).toEqual({
				type: "eppgrid/subscribe_grid_targets",
				mac: "aa",
			});
			expect(calls[1][1]).toEqual({
				type: "eppgrid/subscribe_raw_targets",
				mac: "aa",
			});
		});

		it("does nothing when hass is null", () => {
			ctrl.hass = null;
			ctrl.subscribeTargets("aa");
			expect(hass.connection.subscribeMessage).not.toHaveBeenCalled();
		});

		it("does nothing when mac is empty", () => {
			ctrl.subscribeTargets("");
			expect(hass.connection.subscribeMessage).not.toHaveBeenCalled();
		});

		it("unsubscribes previous target subscription", () => {
			const unsub = vi.fn();
			// Manually set previous unsub
			(ctrl as any)._unsubTargets = unsub;
			ctrl.subscribeTargets("aa");
			expect(unsub).toHaveBeenCalled();
		});

		it("calls onTargetData callback with processed event data", async () => {
			let capturedCallback: ((event: any) => void) | undefined;
			ctrl.hass = {
				callWS: vi.fn(),
				connection: {
					subscribeMessage: vi.fn().mockImplementation((cb: any, msg: any) => {
						if (msg.type === "eppgrid/subscribe_grid_targets") {
							capturedCallback = cb;
						}
						return Promise.resolve(vi.fn());
					}),
				},
			};

			const onTargetData = vi.fn();
			ctrl.onTargetData = onTargetData;
			ctrl.subscribeTargets("aa");

			// Wait for subscription promises
			await new Promise((r) => setTimeout(r, 0));

			expect(capturedCallback).toBeDefined();
			capturedCallback!({
				targets: [{ x: 100, y: 200, status: "active", signal: 50 }],
				sensors: { occupancy: true, static_presence: false },
				zones: {
					occupancy: { 1: true },
					target_counts: { 1: 2 },
					frame_count: 5,
				},
			});

			expect(onTargetData).toHaveBeenCalledWith({
				targets: [{ x: 100, y: 200, speed: 0, status: "active", signal: 50 }],
				sensors: {
					occupancy: true,
					static_presence: false,
					motion_presence: false,
					target_presence: false,
					illuminance: null,
					temperature: null,
					humidity: null,
					co2: null,
				},
				zones: {
					occupancy: { 1: true },
					target_counts: { 1: 2 },
					frame_count: 5,
					debug_log: undefined,
				},
			});
		});

		it("handles events without sensors or zones", async () => {
			let capturedCallback: ((event: any) => void) | undefined;
			ctrl.hass = {
				callWS: vi.fn(),
				connection: {
					subscribeMessage: vi.fn().mockImplementation((cb: any, msg: any) => {
						if (msg.type === "eppgrid/subscribe_grid_targets") {
							capturedCallback = cb;
						}
						return Promise.resolve(vi.fn());
					}),
				},
			};

			const onTargetData = vi.fn();
			ctrl.onTargetData = onTargetData;
			ctrl.subscribeTargets("aa");
			await new Promise((r) => setTimeout(r, 0));

			capturedCallback!({ targets: [] });
			expect(onTargetData).toHaveBeenCalledWith({
				targets: [],
				sensors: {
					occupancy: false,
					static_presence: false,
					motion_presence: false,
					target_presence: false,
					illuminance: null,
					temperature: null,
					humidity: null,
					co2: null,
				},
				zones: null,
			});
		});
	});

	describe("subscribeTargets retry", () => {
		it("retries subscription after failure", async () => {
			vi.useFakeTimers();
			const unsub = vi.fn();
			hass.connection.subscribeMessage = vi
				.fn()
				.mockRejectedValueOnce(new Error("unknown command"))
				.mockResolvedValueOnce(vi.fn()) // display sub
				.mockResolvedValueOnce(unsub); // grid retry

			ctrl.subscribeTargets("aa");

			// First attempt fails, display succeeds
			await vi.advanceTimersByTimeAsync(0);

			// Retry fires after 2s
			await vi.advanceTimersByTimeAsync(2000);
			await vi.advanceTimersByTimeAsync(0);

			expect(hass.connection.subscribeMessage).toHaveBeenCalledTimes(3);
			expect((ctrl as any)._unsubTargets).toBe(unsub);

			vi.useRealTimers();
		});

		it("does not retry after unsubscribeTargets is called", async () => {
			vi.useFakeTimers();
			hass.connection.subscribeMessage = vi
				.fn()
				.mockRejectedValueOnce(new Error("unknown command"))
				.mockResolvedValueOnce(vi.fn());

			ctrl.subscribeTargets("aa");
			await vi.advanceTimersByTimeAsync(0);

			ctrl.unsubscribeTargets();

			await vi.advanceTimersByTimeAsync(2000);
			await vi.advanceTimersByTimeAsync(0);

			// Only 2 initial calls (grid + display), no retry
			expect(hass.connection.subscribeMessage).toHaveBeenCalledTimes(2);

			vi.useRealTimers();
		});
		it("clears pending retry timer on new subscribeTargets call", async () => {
			vi.useFakeTimers();
			hass.connection.subscribeMessage = vi
				.fn()
				.mockRejectedValueOnce(new Error("unknown command"))
				.mockResolvedValueOnce(vi.fn()) // display sub
				.mockResolvedValueOnce(vi.fn()) // second grid sub
				.mockResolvedValueOnce(vi.fn()); // second display sub

			ctrl.subscribeTargets("aa");
			await vi.advanceTimersByTimeAsync(0);

			// Retry is pending — call subscribeTargets again before it fires
			ctrl.subscribeTargets("bb");
			await vi.advanceTimersByTimeAsync(0);

			// Advance past where the old retry would have fired
			await vi.advanceTimersByTimeAsync(2000);
			await vi.advanceTimersByTimeAsync(0);

			// Should have: grid(aa) + display(aa) + grid(bb) + display(bb) = 4
			// NOT 5 (no stale retry for "aa")
			expect(hass.connection.subscribeMessage).toHaveBeenCalledTimes(4);

			vi.useRealTimers();
		});
	});

	describe("unsubscribeTargets", () => {
		it("calls unsub and clears references", () => {
			const unsub = vi.fn();
			(ctrl as any)._unsubTargets = unsub;
			ctrl.unsubscribeTargets();
			expect(unsub).toHaveBeenCalled();
			expect((ctrl as any)._unsubTargets).toBeUndefined();
		});

		it("handles stale unsub gracefully", () => {
			(ctrl as any)._unsubTargets = () => {
				throw new Error("stale");
			};
			ctrl.unsubscribeTargets();
			expect((ctrl as any)._unsubTargets).toBeUndefined();
		});
	});

	// --- Display subscription ---
	describe("subscribeDisplay", () => {
		it("subscribes to raw targets", () => {
			ctrl.subscribeDisplay("aa");
			expect(hass.connection.subscribeMessage).toHaveBeenCalledWith(
				expect.any(Function),
				{ type: "eppgrid/subscribe_raw_targets", mac: "aa" },
			);
		});

		it("does nothing when hass is null", () => {
			ctrl.hass = null;
			ctrl.subscribeDisplay("aa");
			expect(hass.connection.subscribeMessage).not.toHaveBeenCalled();
		});

		it("does nothing when mac is empty", () => {
			ctrl.subscribeDisplay("");
			expect(hass.connection.subscribeMessage).not.toHaveBeenCalled();
		});

		it("calls onRawTargetData callback with processed data", async () => {
			let capturedCallback: ((event: any) => void) | undefined;
			ctrl.hass = {
				callWS: vi.fn(),
				connection: {
					subscribeMessage: vi.fn().mockImplementation((cb: any) => {
						capturedCallback = cb;
						return Promise.resolve(vi.fn());
					}),
				},
			};

			const onRawTargetData = vi.fn();
			ctrl.onRawTargetData = onRawTargetData;
			ctrl.subscribeDisplay("aa");
			await new Promise((r) => setTimeout(r, 0));

			capturedCallback!({ targets: [{ raw_x: 10, raw_y: 20 }] });
			expect(onRawTargetData).toHaveBeenCalledWith([{ raw_x: 10, raw_y: 20 }]);
		});

		it("swallows subscription rejection without surfacing an uncaught promise", async () => {
			const unhandled: unknown[] = [];
			const handler = (reason: unknown) => {
				unhandled.push(reason);
			};
			process.on("unhandledRejection", handler);
			try {
				ctrl.hass = {
					callWS: vi.fn(),
					connection: {
						subscribeMessage: vi
							.fn()
							.mockRejectedValue(new Error("socket closed")),
					},
				};
				ctrl.subscribeDisplay("aa");
				// Let the microtask queue flush so the rejection fires if uncaught.
				await new Promise((r) => setTimeout(r, 0));
				await new Promise((r) => setTimeout(r, 0));
				expect(unhandled).toEqual([]);
			} finally {
				process.off("unhandledRejection", handler);
			}
		});
	});

	describe("unsubscribeDisplay", () => {
		it("calls unsub and clears reference", () => {
			const unsub = vi.fn();
			(ctrl as any)._unsubDisplay = unsub;
			ctrl.unsubscribeDisplay();
			expect(unsub).toHaveBeenCalled();
			expect((ctrl as any)._unsubDisplay).toBeUndefined();
		});

		it("handles stale unsub gracefully", () => {
			(ctrl as any)._unsubDisplay = () => {
				throw new Error("stale");
			};
			ctrl.unsubscribeDisplay();
			expect((ctrl as any)._unsubDisplay).toBeUndefined();
		});
	});

	// --- selectDevice ---
	describe("selectDevice", () => {
		it("updates selectedMac and saves to localStorage", () => {
			ctrl.selectDevice("cc:dd");
			expect(ctrl.selectedMac).toBe("cc:dd");
			expect(localStorage.getItem("epp_selected_mac")).toBe("cc:dd");
		});

		it("calls host.requestUpdate", () => {
			ctrl.selectDevice("cc:dd");
			expect(host.requestUpdate).toHaveBeenCalled();
		});

		it("resets availability tracker to avoid stale-edge reconnect", () => {
			const reopenSpy = vi.spyOn(ctrl, "reopenSession").mockResolvedValue();

			// Prime: "aa" available → offline. Tracker latches to false.
			(ctrl as any)._applyDeviceList([makeDevice("aa", true)]);
			(ctrl as any)._applyDeviceList([makeDevice("aa", false)]);
			reopenSpy.mockClear();

			// User switches to "bb" — tracker must reset so the next push
			// is treated as an initial observation (prev === null) and not
			// a stale false→true rising edge.
			ctrl.selectDevice("bb");
			(ctrl as any)._applyDeviceList([makeDevice("bb", true)]);

			expect(reopenSpy).not.toHaveBeenCalled();
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

	// --- reconnecting guard ---
	describe("reconnecting", () => {
		it("is false initially", () => {
			expect(ctrl.reconnecting).toBe(false);
		});

		it("is true while loadDeviceConfig is in progress", async () => {
			let resolveSubscribe!: (unsub: () => void) => void;
			ctrl.hass = {
				callWS: vi.fn().mockResolvedValue({ config: {} }),
				connection: {
					subscribeMessage: vi.fn().mockImplementation(
						() =>
							new Promise<() => void>((resolve) => {
								resolveSubscribe = resolve;
							}),
					),
				},
			};

			const promise = ctrl.loadDeviceConfig("aa");
			// Allow callWS to resolve and openDeviceSession to start
			await new Promise((r) => setTimeout(r, 0));

			expect(ctrl.reconnecting).toBe(true);

			resolveSubscribe(vi.fn());
			await promise;

			expect(ctrl.reconnecting).toBe(false);
		});

		it("is false after loadDeviceConfig fails", async () => {
			ctrl.hass = {
				callWS: vi.fn().mockRejectedValue(new Error("fail")),
				connection: {
					subscribeMessage: vi.fn().mockRejectedValue(new Error("no connect")),
				},
			};
			vi.spyOn(console, "warn").mockImplementation(() => {});

			await ctrl.loadDeviceConfig("aa");
			expect(ctrl.reconnecting).toBe(false);

			vi.restoreAllMocks();
		});

		it("prevents duplicate subscribe_device calls during async gap", async () => {
			let resolveFirst!: (unsub: () => void) => void;
			const subscribeMock = vi
				.fn()
				.mockImplementationOnce(
					() =>
						new Promise<() => void>((resolve) => {
							resolveFirst = resolve;
						}),
				)
				.mockResolvedValue(vi.fn());

			ctrl.hass = {
				callWS: vi.fn().mockResolvedValue({ config: {} }),
				connection: { subscribeMessage: subscribeMock },
			};

			// First call — starts the async subscribe
			const p1 = ctrl.loadDeviceConfig("aa");
			await new Promise((r) => setTimeout(r, 0));

			// Second call while first is pending — should be blocked by guard
			expect(ctrl.reconnecting).toBe(true);
			const p2 = ctrl.loadDeviceConfig("aa");

			resolveFirst(vi.fn());
			await p1;
			await p2;

			// Only ONE subscribe_device call should have been made
			const deviceSubs = subscribeMock.mock.calls.filter(
				(c: any[]) => c[1]?.type === "eppgrid/subscribe_device",
			);
			expect(deviceSubs).toHaveLength(1);
		});
	});

	// --- Availability edge transitions ---
	describe("availability transitions", () => {
		it("re-opens session (without refetching config) when selected device transitions offline→online", async () => {
			const reopenSpy = vi.spyOn(ctrl, "reopenSession").mockResolvedValue();
			const loadSpy = vi.spyOn(ctrl, "loadDeviceConfig");

			(ctrl as any)._applyDeviceList([makeDevice("aa", true)]);
			ctrl.selectedMac = "aa";
			reopenSpy.mockClear();
			loadSpy.mockClear();

			(ctrl as any)._applyDeviceList([makeDevice("aa", false)]);
			expect(reopenSpy).not.toHaveBeenCalled();

			(ctrl as any)._applyDeviceList([makeDevice("aa", true)]);
			expect(reopenSpy).toHaveBeenCalledWith("aa");
			// Config must NOT be re-fetched on the reconnect path — the
			// host keeps its in-memory config so local edits survive.
			expect(loadSpy).not.toHaveBeenCalled();
		});

		it("does not reconnect when a non-selected device flips availability", async () => {
			const reopenSpy = vi.spyOn(ctrl, "reopenSession").mockResolvedValue();

			(ctrl as any)._applyDeviceList([
				makeDevice("aa", true),
				makeDevice("bb", true),
			]);
			ctrl.selectedMac = "aa";
			reopenSpy.mockClear();

			// "bb" goes offline and back — "aa" stays available
			(ctrl as any)._applyDeviceList([
				makeDevice("aa", true),
				makeDevice("bb", false),
			]);
			(ctrl as any)._applyDeviceList([
				makeDevice("aa", true),
				makeDevice("bb", true),
			]);

			expect(reopenSpy).not.toHaveBeenCalled();
		});

		it("does not reconnect on the first device_list message", async () => {
			// The host's first-load flow drives the initial connect, so the
			// controller must not pre-empt it when prev === null.
			const reopenSpy = vi.spyOn(ctrl, "reopenSession").mockResolvedValue();

			ctrl.selectedMac = "aa";
			(ctrl as any)._applyDeviceList([makeDevice("aa", true)]);

			expect(reopenSpy).not.toHaveBeenCalled();
		});

		it("closes device session when selected device transitions online→offline", async () => {
			const closeSpy = vi.spyOn(ctrl, "closeDeviceSession");

			(ctrl as any)._applyDeviceList([makeDevice("aa", true)]);
			ctrl.selectedMac = "aa";
			closeSpy.mockClear();

			(ctrl as any)._applyDeviceList([makeDevice("aa", false)]);

			expect(closeSpy).toHaveBeenCalledTimes(1);
		});

		it("fires onSessionClosed so host can clear live-target state", () => {
			const onClosed = vi.fn();
			ctrl.onSessionClosed = onClosed;

			(ctrl as any)._applyDeviceList([makeDevice("aa", true)]);
			ctrl.selectedMac = "aa";
			onClosed.mockClear();

			(ctrl as any)._applyDeviceList([makeDevice("aa", false)]);

			expect(onClosed).toHaveBeenCalledTimes(1);
		});
	});
});
