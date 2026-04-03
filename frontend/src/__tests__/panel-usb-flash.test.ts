/**
 * Tests for the USB flash handler private methods in EPPGridPanel:
 *   _handleUsbFlash(variant)
 *   _handleWifiProvision(ssid, password)
 *   _handleWifiScan()
 *
 * These are tested by calling private methods directly via `(panel as any)`.
 */

import { render } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EPPGridPanel } from "../eppgrid-panel.js";

// Mock the USB flash service module before any imports that use it
vi.mock("../lib/usb-flash-service.js", () => ({
	flashFirmware: vi.fn(),
	runWifiScan: vi.fn(),
	runWifiProvision: vi.fn(),
	detectIpAddress: vi.fn(),
}));

import {
	detectIpAddress,
	flashFirmware,
	runWifiProvision,
	runWifiScan,
} from "../lib/usb-flash-service.js";

/** Reset all mocks to their default happy-path implementations. */
function resetServiceMocks() {
	(flashFirmware as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
	(runWifiScan as ReturnType<typeof vi.fn>).mockResolvedValue({
		writer: { releaseLock: vi.fn() },
		reader: { releaseLock: vi.fn() },
		networks: [{ ssid: "TestNet", rssi: -50, authRequired: true }],
	});
	(runWifiProvision as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
	(detectIpAddress as ReturnType<typeof vi.fn>).mockResolvedValue(
		"192.168.1.42",
	);
}

function makeMockPort() {
	return {
		open: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
		readable: { getReader: vi.fn() },
		writable: { getWriter: vi.fn() },
	};
}

function createPanel(): EPPGridPanel {
	const el = new EPPGridPanel();
	(el as any).hass = {
		callWS: vi.fn().mockResolvedValue({ devices: [] }),
		connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
	};
	return el;
}

describe("_handleUsbFlash", () => {
	let panel: EPPGridPanel;
	let mockPort: ReturnType<typeof makeMockPort>;

	beforeEach(() => {
		vi.clearAllMocks();
		resetServiceMocks();
		panel = createPanel();
		mockPort = makeMockPort();

		vi.stubGlobal("navigator", {
			...navigator,
			serial: {
				requestPort: vi.fn().mockResolvedValue(mockPort),
			},
		});
	});

	it("sets state to connecting, then flashing, then wifi_scan, then wifi_provision on success", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("connecting");
		expect(steps).toContain("flashing");
		expect(steps).toContain("wifi_scan");
		expect(steps).toContain("wifi_provision");
	});

	it("stores the serial port on the controller after requestPort", async () => {
		const ctrl = (panel as any)._flasherCtrl;

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		expect(ctrl.serialPort).toBe(mockPort);
	});

	it("calls flashFirmware with the port and variant", async () => {
		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		expect(flashFirmware).toHaveBeenCalledWith(
			mockPort,
			"eppgrid-wifi",
			expect.any(Function),
		);
	});

	it("calls runWifiScan after flashing", async () => {
		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		expect(runWifiScan).toHaveBeenCalledWith(mockPort);
	});

	it("stores wifi networks on the controller after scanning", async () => {
		const ctrl = (panel as any)._flasherCtrl;

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		expect(ctrl.wifiNetworks).toEqual([
			{ ssid: "TestNet", rssi: -50, authRequired: true },
		]);
	});

	it("stores _serialWriter and _serialReader from scan result", async () => {
		const ctrl = (panel as any)._flasherCtrl;

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		expect((ctrl as any)._serialWriter).toBeDefined();
		expect((ctrl as any)._serialReader).toBeDefined();
	});

	it("resets state (not error) when requestPort throws NotFoundError", async () => {
		const notFound = new DOMException("No port selected", "NotFoundError");
		(
			navigator.serial.requestPort as ReturnType<typeof vi.fn>
		).mockRejectedValue(notFound);

		const ctrl = (panel as any)._flasherCtrl;
		const resetSpy = vi.spyOn(ctrl, "resetUsbState");

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		expect(resetSpy).toHaveBeenCalled();
		expect(ctrl.usbFlashState).toBeNull();
	});

	it("sets error state when requestPort throws a non-NotFoundError", async () => {
		const boom = new Error("USB exploded");
		(
			navigator.serial.requestPort as ReturnType<typeof vi.fn>
		).mockRejectedValue(boom);

		const ctrl = (panel as any)._flasherCtrl;

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		expect(ctrl.usbFlashState).toEqual({
			step: "error",
			error: "USB exploded",
		});
	});

	it("sets error state when flashFirmware throws", async () => {
		(flashFirmware as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("Flash failed"),
		);

		const ctrl = (panel as any)._flasherCtrl;

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		expect(ctrl.usbFlashState).toEqual({
			step: "error",
			error: "Flash failed",
		});
	});

	it("sets error state when runWifiScan throws", async () => {
		(runWifiScan as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("Scan failed"),
		);

		const ctrl = (panel as any)._flasherCtrl;

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		expect(ctrl.usbFlashState).toEqual({
			step: "error",
			error: "Scan failed",
		});
	});

	it("reports flashing progress via updateUsbState callback", async () => {
		let capturedProgressCallback: ((pct: number) => void) | undefined;
		(flashFirmware as ReturnType<typeof vi.fn>).mockImplementation(
			(_port: any, _variant: any, onProgress: (pct: number) => void) => {
				capturedProgressCallback = onProgress;
				return Promise.resolve();
			},
		);

		const ctrl = (panel as any)._flasherCtrl;
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		// The callback was captured during flashFirmware; call it retroactively
		// to verify its shape (it's already been stored in the closure)
		// Alternatively, we can observe that if we call it after the fact it
		// would call updateUsbState — verify by calling the stored cb directly
		if (capturedProgressCallback) {
			capturedProgressCallback(55);
			const flashingCalls = updateSpy.mock.calls.filter(
				(c: any[]) => c[0].step === "flashing" && c[0].progress === 55,
			);
			expect(flashingCalls.length).toBeGreaterThan(0);
		}
	});

	it("sets error with 'Unknown error' message when err has no message", async () => {
		(
			navigator.serial.requestPort as ReturnType<typeof vi.fn>
		).mockRejectedValue(
			{ name: "SomeError" }, // no .message
		);

		const ctrl = (panel as any)._flasherCtrl;

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		expect(ctrl.usbFlashState).toEqual({
			step: "error",
			error: "Unknown error",
		});
	});
});

describe("_handleWifiProvision", () => {
	let panel: EPPGridPanel;
	let mockWriter: { releaseLock: ReturnType<typeof vi.fn> };
	let mockReader: { releaseLock: ReturnType<typeof vi.fn> };
	let mockPort: ReturnType<typeof makeMockPort>;

	beforeEach(() => {
		vi.clearAllMocks();
		resetServiceMocks();
		panel = createPanel();

		mockWriter = { releaseLock: vi.fn() };
		mockReader = { releaseLock: vi.fn() };
		mockPort = makeMockPort();

		// Pre-wire ctrl with a serial port and writer/reader (as _handleUsbFlash would)
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = mockPort;
		(ctrl as any)._serialWriter = mockWriter;
		(ctrl as any)._serialReader = mockReader;
	});

	it("calls runWifiProvision with writer, ssid, password", async () => {
		await (panel as any)._handleWifiProvision("MySSID", "s3cr3t");

		expect(runWifiProvision).toHaveBeenCalledWith(
			mockWriter,
			"MySSID",
			"s3cr3t",
		);
	});

	it("sets state to reading_ip after runWifiProvision", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await (panel as any)._handleWifiProvision("MySSID", "s3cr3t");

		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("reading_ip");
	});

	it("calls detectIpAddress with reader and 30000ms timeout", async () => {
		await (panel as any)._handleWifiProvision("MySSID", "s3cr3t");

		expect(detectIpAddress).toHaveBeenCalledWith(mockReader, 30000);
	});

	it("releases reader and writer locks after IP detection", async () => {
		await (panel as any)._handleWifiProvision("MySSID", "s3cr3t");

		expect(mockReader.releaseLock).toHaveBeenCalled();
		expect(mockWriter.releaseLock).toHaveBeenCalled();
	});

	it("closes the serial port after provisioning", async () => {
		await (panel as any)._handleWifiProvision("MySSID", "s3cr3t");

		expect(mockPort.close).toHaveBeenCalled();
	});

	it("sets ctrl.serialPort to null after closing", async () => {
		const ctrl = (panel as any)._flasherCtrl;

		await (panel as any)._handleWifiProvision("MySSID", "s3cr3t");

		expect(ctrl.serialPort).toBeNull();
	});

	it("calls addEsphomeDevice with the detected IP", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		const addSpy = vi
			.spyOn(ctrl, "addEsphomeDevice")
			.mockResolvedValue(undefined);

		await (panel as any)._handleWifiProvision("MySSID", "s3cr3t");

		expect(addSpy).toHaveBeenCalledWith("192.168.1.42");
	});

	it("sets state to adding_device then complete with the IP", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		vi.spyOn(ctrl, "addEsphomeDevice").mockResolvedValue(undefined);
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await (panel as any)._handleWifiProvision("MySSID", "s3cr3t");

		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("adding_device");
		expect(steps).toContain("complete");

		const completeCall = updateSpy.mock.calls.find(
			(c: any[]) => c[0].step === "complete",
		);
		expect(completeCall?.[0].ip).toBe("192.168.1.42");
	});

	it("sets error state when runWifiProvision throws", async () => {
		(runWifiProvision as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("provision failed"),
		);

		const ctrl = (panel as any)._flasherCtrl;

		await (panel as any)._handleWifiProvision("MySSID", "s3cr3t");

		expect(ctrl.usbFlashState).toEqual({
			step: "error",
			error: "provision failed",
		});
	});

	it("sets error state when detectIpAddress throws", async () => {
		(detectIpAddress as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("timeout"),
		);

		const ctrl = (panel as any)._flasherCtrl;

		await (panel as any)._handleWifiProvision("MySSID", "s3cr3t");

		expect(ctrl.usbFlashState).toEqual({
			step: "error",
			error: "timeout",
		});
	});

	it("uses fallback error message 'WiFi provisioning failed' when err has no message", async () => {
		(runWifiProvision as ReturnType<typeof vi.fn>).mockRejectedValue({});

		const ctrl = (panel as any)._flasherCtrl;

		await (panel as any)._handleWifiProvision("MySSID", "s3cr3t");

		expect(ctrl.usbFlashState).toEqual({
			step: "error",
			error: "WiFi provisioning failed",
		});
	});
});

describe("_handleWifiScan", () => {
	let panel: EPPGridPanel;

	beforeEach(() => {
		vi.clearAllMocks();
		resetServiceMocks();
		panel = createPanel();
	});

	it("returns early without calling runWifiScan when serialPort is null", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = null;

		await (panel as any)._handleWifiScan();

		expect(runWifiScan).not.toHaveBeenCalled();
	});

	it("calls runWifiScan with the serial port when port is set", async () => {
		const mockPort = makeMockPort();
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = mockPort;

		await (panel as any)._handleWifiScan();

		expect(runWifiScan).toHaveBeenCalledWith(mockPort);
	});

	it("updates wifiNetworks on the controller after a scan", async () => {
		const mockPort = makeMockPort();
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = mockPort;

		await (panel as any)._handleWifiScan();

		expect(ctrl.wifiNetworks).toEqual([
			{ ssid: "TestNet", rssi: -50, authRequired: true },
		]);
	});

	it("stores new _serialWriter and _serialReader from scan result", async () => {
		const mockPort = makeMockPort();
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = mockPort;

		await (panel as any)._handleWifiScan();

		expect((ctrl as any)._serialWriter).toBeDefined();
		expect((ctrl as any)._serialReader).toBeDefined();
	});

	it("sets state to wifi_provision after successful scan", async () => {
		const mockPort = makeMockPort();
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = mockPort;
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await (panel as any)._handleWifiScan();

		const lastCall = updateSpy.mock.calls[updateSpy.mock.calls.length - 1];
		expect(lastCall[0].step).toBe("wifi_provision");
	});

	it("releases old reader lock before re-scanning when locks exist", async () => {
		const mockPort = makeMockPort();
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = mockPort;

		const oldReader = { releaseLock: vi.fn() };
		const oldWriter = { releaseLock: vi.fn() };
		(ctrl as any)._serialReader = oldReader;
		(ctrl as any)._serialWriter = oldWriter;

		await (panel as any)._handleWifiScan();

		expect(oldReader.releaseLock).toHaveBeenCalled();
		expect(oldWriter.releaseLock).toHaveBeenCalled();
	});

	it("ignores errors from runWifiScan and keeps current state", async () => {
		(runWifiScan as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("scan error"),
		);

		const mockPort = makeMockPort();
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = mockPort;
		ctrl.usbFlashState = { step: "wifi_provision" };

		// Should not throw
		await expect((panel as any)._handleWifiScan()).resolves.toBeUndefined();

		// State should be unchanged
		expect(ctrl.usbFlashState).toEqual({ step: "wifi_provision" });
	});

	it("silently ignores releaseLock errors before re-scanning", async () => {
		const mockPort = makeMockPort();
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = mockPort;

		const throwingReader = {
			releaseLock: vi.fn().mockImplementation(() => {
				throw new Error("already released");
			}),
		};
		const throwingWriter = {
			releaseLock: vi.fn().mockImplementation(() => {
				throw new Error("already released");
			}),
		};
		(ctrl as any)._serialReader = throwingReader;
		(ctrl as any)._serialWriter = throwingWriter;

		// Should not throw despite releaseLock errors
		await expect((panel as any)._handleWifiScan()).resolves.toBeUndefined();

		expect(runWifiScan).toHaveBeenCalled();
	});
});

// =========================================================
// Inline event handlers on epp-flasher-view in render()
// =========================================================
describe("epp-flasher-view inline event handlers", () => {
	let panel: EPPGridPanel;
	let container: HTMLDivElement;

	beforeEach(() => {
		vi.clearAllMocks();
		resetServiceMocks();
		panel = createPanel();
		// Put panel in flasher tab so epp-flasher-view is rendered
		(panel as any)._panelTab = "flasher";
		// Ensure flasher ctrl has hass so loadDevices doesn't choke
		(panel as any)._flasherCtrl.hass = (panel as any).hass;
		container = document.createElement("div");
		document.body.appendChild(container);
		render((panel as any).render(), container);
	});

	afterEach(() => {
		container.remove();
	});

	function getFlasherView(): Element {
		const el = container.querySelector("epp-flasher-view");
		if (!el) throw new Error("epp-flasher-view not found");
		return el;
	}

	it("@flash-ota calls flasherCtrl.startOtaFlash", () => {
		const ctrl = (panel as any)._flasherCtrl;
		const spy = vi.spyOn(ctrl, "startOtaFlash").mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("flash-ota", {
				detail: { mac: "aa:bb:cc", variant: "eppgrid-wifi" },
				bubbles: true,
			}),
		);

		expect(spy).toHaveBeenCalledWith("aa:bb:cc", "eppgrid-wifi");
	});

	it("@flash-complete calls _loadDevices and switches to config tab", () => {
		const loadSpy = vi
			.spyOn(panel as any, "_loadDevices")
			.mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("flash-complete", { bubbles: true }),
		);

		expect(loadSpy).toHaveBeenCalled();
		expect((panel as any)._panelTab).toBe("config");
	});

	it("@usb-flash calls _handleUsbFlash with variant", () => {
		const spy = vi
			.spyOn(panel as any, "_handleUsbFlash")
			.mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("usb-flash", {
				detail: { variant: "eppgrid-ble" },
				bubbles: true,
			}),
		);

		expect(spy).toHaveBeenCalledWith("eppgrid-ble");
	});

	it("@usb-retry calls flasherCtrl.resetUsbState", () => {
		const ctrl = (panel as any)._flasherCtrl;
		const spy = vi.spyOn(ctrl, "resetUsbState");

		getFlasherView().dispatchEvent(
			new CustomEvent("usb-retry", { bubbles: true }),
		);

		expect(spy).toHaveBeenCalled();
	});

	it("@wifi-scan calls _handleWifiScan", () => {
		const spy = vi
			.spyOn(panel as any, "_handleWifiScan")
			.mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("wifi-scan", { bubbles: true }),
		);

		expect(spy).toHaveBeenCalled();
	});

	it("@wifi-provision calls _handleWifiProvision with ssid and password", () => {
		const spy = vi
			.spyOn(panel as any, "_handleWifiProvision")
			.mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("wifi-provision", {
				detail: { ssid: "HomeNet", password: "pass123" },
				bubbles: true,
			}),
		);

		expect(spy).toHaveBeenCalledWith("HomeNet", "pass123");
	});

	it("@wifi-complete calls resetUsbState, _loadDevices, switches to config tab", () => {
		const ctrl = (panel as any)._flasherCtrl;
		const resetSpy = vi.spyOn(ctrl, "resetUsbState");
		const loadSpy = vi
			.spyOn(panel as any, "_loadDevices")
			.mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("wifi-complete", { bubbles: true }),
		);

		expect(resetSpy).toHaveBeenCalled();
		expect(loadSpy).toHaveBeenCalled();
		expect((panel as any)._panelTab).toBe("config");
	});
});
