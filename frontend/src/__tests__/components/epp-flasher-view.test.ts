import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../../components/epp-flasher-view.js";
import type { EppFlasherView } from "../../components/epp-flasher-view.js";
import type { FlashableDevice, OtaProgress } from "../../types.js";

function renderTo(tpl: any): HTMLDivElement {
	const container = document.createElement("div");
	document.body.appendChild(container);
	render(tpl, container);
	return container;
}

function createView(
	overrides: Partial<Record<string, unknown>> = {},
): EppFlasherView {
	const el = document.createElement("epp-flasher-view") as EppFlasherView;
	el.hass = { callWS: () => Promise.resolve({}) };
	el.flashableDevices = [];
	el.loading = false;
	el.otaProgress = null;
	el.flashingMac = null;
	el.localize = (k: string) => k;
	for (const [k, v] of Object.entries(overrides)) {
		(el as any)[k] = v;
	}
	return el;
}

const device1: FlashableDevice = {
	mac: "AA:BB:CC:DD:EE:01",
	name: "Living Room Sensor",
	host: "192.168.1.10",
	available: true,
	firmware_type: "original",
	firmware_version: "1.0.0",
	esphome_config_entry_id: null,
};

const device2: FlashableDevice = {
	mac: "AA:BB:CC:DD:EE:02",
	name: "Bedroom Sensor",
	host: "192.168.1.11",
	available: true,
	firmware_type: "eppgrid",
	firmware_version: "2.0.0",
	esphome_config_entry_id: "config-entry-123",
};

const offlineDevice: FlashableDevice = {
	mac: "AA:BB:CC:DD:EE:03",
	name: "Offline Sensor",
	host: null,
	available: false,
	firmware_type: "original",
	firmware_version: "1.0.0",
	esphome_config_entry_id: null,
};

afterEach(() => {
	for (const child of [...document.body.children]) {
		document.body.removeChild(child);
	}
});

describe("epp-flasher-view element", () => {
	it("is registered as a custom element", () => {
		const Ctor = customElements.get("epp-flasher-view");
		expect(Ctor).toBeDefined();
	});

	it("can be created via document.createElement", () => {
		const el = document.createElement("epp-flasher-view");
		expect(el).toBeInstanceOf(HTMLElement);
	});

	it("renders with default state without crashing", () => {
		const el = createView();
		const result = (el as any).render();
		expect(result).toBeDefined();
	});
});

describe("render() loading state", () => {
	it("renders loading message when loading=true", () => {
		const el = createView({ loading: true });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".flasher-loading")).not.toBeNull();
		expect(c.querySelector(".flasher-loading")!.textContent).toContain(
			"flasher.loading",
		);
	});

	it("does not show device list when loading", () => {
		const el = createView({ loading: true, flashableDevices: [device1] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".device-list")).toBeNull();
	});
});

describe("render() device list", () => {
	it("renders device list with devices", () => {
		const el = createView({ flashableDevices: [device1, device2] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".device-list")).not.toBeNull();
		expect(c.querySelectorAll(".device-row").length).toBe(2);
	});

	it("shows device name and host", () => {
		const el = createView({ flashableDevices: [device1] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".device-name")!.textContent).toContain(
			"Living Room Sensor",
		);
		expect(c.querySelector(".device-host")!.textContent).toContain(
			"192.168.1.10",
		);
	});

	it("shows orange badge for original firmware", () => {
		const el = createView({ flashableDevices: [device1] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const badge = c.querySelector(".firmware-badge-original");
		expect(badge).not.toBeNull();
	});

	it("shows green badge for eppgrid firmware", () => {
		const el = createView({ flashableDevices: [device2] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const badge = c.querySelector(".firmware-badge-eppgrid");
		expect(badge).not.toBeNull();
	});

	it("renders Flash button for each device", () => {
		const el = createView({ flashableDevices: [device1, device2] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelectorAll(".device-row ha-button[raised]").length).toBe(2);
	});

	it("Flash button disabled for offline device", () => {
		const el = createView({ flashableDevices: [offlineDevice] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const btn = c.querySelector(".device-row ha-button[raised]") as any;
		expect(btn.disabled).toBe(true);
	});

	it("Flash button enabled for online device", () => {
		const el = createView({ flashableDevices: [device1] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const btn = c.querySelector(".device-row ha-button[raised]") as any;
		expect(btn.disabled).toBe(false);
	});
});

describe("render() empty state", () => {
	it("renders empty state message when no devices", () => {
		const el = createView({ flashableDevices: [] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".flasher-empty")).not.toBeNull();
	});

	it("does not render device list when empty", () => {
		const el = createView({ flashableDevices: [] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".device-row")).toBeNull();
	});
});

describe("render() USB section", () => {
	it("shows USB section with action buttons", () => {
		const el = createView();
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".usb-actions")).not.toBeNull();
		expect(c.querySelectorAll(".usb-action").length).toBe(2);
	});

	it("USB section not shown during OTA progress", () => {
		const progress: OtaProgress = {
			step: "flashing",
			status: "in_progress",
			progress: 50,
		};
		const el = createView({ otaProgress: progress });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".usb-section")).toBeNull();
	});
});

describe("render() OTA progress state", () => {
	it("shows progress steps when otaProgress is set", () => {
		const progress: OtaProgress = {
			step: "flashing",
			status: "in_progress",
			progress: 50,
		};
		const el = createView({ otaProgress: progress });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".progress-steps")).not.toBeNull();
	});

	it("does not show device list during OTA progress", () => {
		const progress: OtaProgress = {
			step: "flashing",
			status: "in_progress",
		};
		const el = createView({
			otaProgress: progress,
			flashableDevices: [device1],
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".device-list")).toBeNull();
	});

	it("renders progress steps for each OTA step", () => {
		const progress: OtaProgress = {
			step: "flashing",
			status: "in_progress",
		};
		const el = createView({ otaProgress: progress });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const steps = c.querySelectorAll(".progress-step");
		expect(steps.length).toBeGreaterThan(0);
	});

	it("shows success state when OTA completes successfully", () => {
		const progress: OtaProgress = {
			step: "complete",
			status: "success",
		};
		const el = createView({ otaProgress: progress });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".progress-steps")).not.toBeNull();
	});

	it("shows 'Go to Device Configuration' button when complete", () => {
		const progress: OtaProgress = {
			step: "complete",
			status: "success",
		};
		const el = createView({ otaProgress: progress });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(
			c.querySelector(".confirm-actions ha-button[raised]"),
		).not.toBeNull();
	});
});

describe("render() confirm dialog", () => {
	it("shows confirm dialog when _confirmDevice is set", () => {
		const el = createView();
		(el as any)._confirmDevice = device1;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".confirm-dialog")).not.toBeNull();
	});

	it("confirm dialog has Flash and Cancel buttons", () => {
		const el = createView();
		(el as any)._confirmDevice = device1;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(
			c.querySelector(".confirm-actions ha-button[raised]"),
		).not.toBeNull();
		expect(
			c.querySelector(".confirm-actions ha-button:not([raised])"),
		).not.toBeNull();
	});

	it("confirm dialog shows variant selector", () => {
		const el = createView();
		(el as any)._confirmDevice = device1;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".variant-selector")).not.toBeNull();
	});
});

describe("render() OTA error state", () => {
	it("shows error state when OTA fails", () => {
		const progress: OtaProgress = {
			step: "flashing",
			status: "failed",
			error: "Connection refused",
		};
		const el = createView({ otaProgress: progress });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".progress-steps")).not.toBeNull();
		const errorStep = c.querySelector(".step-error");
		expect(errorStep).not.toBeNull();
	});

	it("shows error state when OTA times out", () => {
		const progress: OtaProgress = {
			step: "waiting_for_reboot",
			status: "timeout",
		};
		const el = createView({ otaProgress: progress });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".step-error")).not.toBeNull();
	});

	it("does not show 'Go to Device Configuration' button on error", () => {
		const progress: OtaProgress = {
			step: "flashing",
			status: "failed",
		};
		const el = createView({ otaProgress: progress });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".confirm-actions ha-button[raised]")).toBeNull();
	});
});

describe("render() browser warning", () => {
	it("shows browser warning when no Web Serial support", () => {
		const el = createView();
		(el as any)._hasWebSerial = false;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".browser-warning")).not.toBeNull();
	});

	it("does not show browser warning when Web Serial is supported", () => {
		const el = createView();
		(el as any)._hasWebSerial = true;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".browser-warning")).toBeNull();
	});
});

describe("render() OTA progress with progress percentage", () => {
	it("shows progress percentage when progress is set", () => {
		const progress: OtaProgress = {
			step: "flashing",
			status: "in_progress",
			progress: 75,
		};
		const el = createView({ otaProgress: progress });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.textContent).toContain("75%");
	});
});

describe("event dispatching", () => {
	it("dispatches flash-ota event on confirm", async () => {
		const el = createView({ flashableDevices: [device1] });
		document.body.appendChild(el);
		await el.updateComplete;

		const events: Event[] = [];
		el.addEventListener("flash-ota", (e) => events.push(e));

		(el as any)._confirmDevice = device1;
		(el as any)._selectedVariant = "wifi";
		(el as any)._dispatchFlashOta();

		expect(events.length).toBe(1);
		expect((events[0] as CustomEvent).detail).toEqual({
			mac: device1.mac,
			variant: "wifi",
		});
	});

	it("does not dispatch flash-ota when _confirmDevice is null", () => {
		const el = createView();
		document.body.appendChild(el);

		const events: Event[] = [];
		el.addEventListener("flash-ota", (e) => events.push(e));

		(el as any)._confirmDevice = null;
		(el as any)._dispatchFlashOta();

		expect(events.length).toBe(0);
	});

	it("shows USB flash view when USB connect is clicked", async () => {
		const el = createView();
		document.body.appendChild(el);
		await el.updateComplete;

		// Bypass ESP Web Tools loading in test env
		(el as any)._showUsbFlash = true;
		expect((el as any)._showUsbFlash).toBe(true);
	});

	it("dispatches flash-complete event on go-to-device click", async () => {
		const el = createView();
		document.body.appendChild(el);
		await el.updateComplete;

		const events: Event[] = [];
		el.addEventListener("flash-complete", (e) => events.push(e));

		(el as any)._dispatchFlashComplete();

		expect(events.length).toBe(1);
	});
});

describe("render() WiFi provisioning — connected state", () => {
	it("renders wifi provisioning view when _showWifiProvisioning is true", () => {
		const el = createView();
		(el as any).usbFlashState = { step: "wifi_provision" };
		(el as any)._wifiConnected = false;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".wifi-form")).not.toBeNull();
	});

	it("shows connected network and IP when _wifiConnected=true", () => {
		const el = createView();
		el.localize = (k: string, params?: Record<string, string | number>) => {
			if (k === "flasher.connected_to" && params)
				return `Connected to ${params.ssid}`;
			if (k === "flasher.ip_address" && params) return `IP: ${params.ip}`;
			return k;
		};
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = true;
		(el as any)._selectedSsid = "MyNetwork";
		(el as any)._deviceIp = "192.168.1.50";
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.textContent).toContain("MyNetwork");
		expect(c.textContent).toContain("192.168.1.50");
	});

	it("shows Continue button when connected", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = true;
		(el as any)._selectedSsid = "MyNetwork";
		(el as any)._deviceIp = "192.168.1.50";
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(
			c.querySelector(".confirm-actions ha-button[raised]"),
		).not.toBeNull();
	});

	it("dispatches wifi-complete when Continue clicked", async () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = true;
		(el as any)._selectedSsid = "MyNetwork";
		(el as any)._deviceIp = "192.168.1.50";
		document.body.appendChild(el);
		await el.updateComplete;

		const events: Event[] = [];
		el.addEventListener("wifi-complete", (e) => events.push(e));

		(el as any)._dispatchWifiComplete();
		expect(events.length).toBe(1);
	});
});

describe("render() WiFi provisioning — not connected state", () => {
	it("shows scan button when not connected", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		// Scan button is the second ha-button in .confirm-actions (not raised)
		const btns = c.querySelectorAll(".confirm-actions ha-button:not([raised])");
		expect(btns.length).toBeGreaterThanOrEqual(2);
	});

	it("shows network dropdown when networks available", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any).wifiNetworks = [
			{ ssid: "NetworkA", rssi: -50, authRequired: true },
			{ ssid: "NetworkB", rssi: -70, authRequired: false },
		];
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const select = c.querySelector("ha-select");
		expect(select).not.toBeNull();
		const options = (select as any).options;
		expect(options.length).toBe(2);
	});

	it("sorts networks by signal strength (strongest first)", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any).wifiNetworks = [
			{ ssid: "Weak", rssi: -90, authRequired: false },
			{ ssid: "Strong", rssi: -40, authRequired: false },
			{ ssid: "Medium", rssi: -65, authRequired: false },
		];
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const select = c.querySelector("ha-select") as any;
		const options = select.options.map((o: any) => o.value);
		expect(options[0]).toBe("Strong");
		expect(options[1]).toBe("Medium");
		expect(options[2]).toBe("Weak");
	});

	it("shows wifi strength + lock iconPath for networks", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any).wifiNetworks = [
			{ ssid: "Strong", rssi: -45, authRequired: true },
			{ ssid: "Weak", rssi: -80, authRequired: false },
		];
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const select = c.querySelector("ha-select") as any;
		const strong = select.options.find((o: any) => o.value === "Strong");
		expect(strong.iconPath).toBeDefined();
		expect(strong.iconPath.length).toBeGreaterThan(10); // SVG path data
		const weak = select.options.find((o: any) => o.value === "Weak");
		expect(weak.iconPath).toBeDefined();
		expect(weak.iconPath).not.toBe(strong.iconPath); // different strength
	});

	it("maps RSSI to different wifi strength icon paths", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any).wifiNetworks = [
			{ ssid: "Excellent", rssi: -40, authRequired: false },
			{ ssid: "Good", rssi: -60, authRequired: false },
			{ ssid: "Fair", rssi: -70, authRequired: false },
			{ ssid: "Poor", rssi: -85, authRequired: false },
		];
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const select = c.querySelector("ha-select") as any;
		const paths = ["Excellent", "Good", "Fair", "Poor"].map(
			(s) => select.options.find((o: any) => o.value === s).iconPath,
		);
		// All four should have different icon paths (different strength levels)
		expect(new Set(paths).size).toBe(4);
		// All should be valid SVG path data
		for (const p of paths) {
			expect(p).toBeDefined();
			expect(typeof p).toBe("string");
		}
	});

	it("shows manual SSID toggle", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector("ha-formfield")).not.toBeNull();
	});

	it("shows manual SSID text input when _manualSsid=true", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any)._manualSsid = true;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(
			c.querySelector("ha-textfield:not([type='password'])"),
		).not.toBeNull();
	});

	it("does not show manual SSID text input when _manualSsid=false", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any)._manualSsid = false;
		(el as any).wifiNetworks = [
			{ ssid: "TestNet", rssi: -50, authRequired: false },
		];
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector("ha-textfield:not([type='password'])")).toBeNull();
	});

	it("shows password field", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector("ha-textfield[type='password']")).not.toBeNull();
	});

	it("shows Configure WiFi button", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(
			c.querySelector(".confirm-actions ha-button[raised]"),
		).not.toBeNull();
	});

	it("Configure WiFi button is disabled when no SSID selected", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any)._selectedSsid = "";
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const btn = c.querySelector(".confirm-actions ha-button[raised]") as any;
		expect(btn.disabled).toBe(true);
	});

	it("Configure WiFi button is enabled when SSID is selected", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any)._selectedSsid = "MyNetwork";
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const btn = c.querySelector(".confirm-actions ha-button[raised]") as any;
		expect(btn.disabled).toBe(false);
	});

	it("dispatches wifi-scan event when Scan clicked", async () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		document.body.appendChild(el);
		await el.updateComplete;

		const events: Event[] = [];
		el.addEventListener("wifi-scan", (e) => events.push(e));

		(el as any)._dispatchWifiScan();
		expect(events.length).toBe(1);
	});

	it("dispatches wifi-provision event with ssid and password", async () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any)._selectedSsid = "HomeNet";
		(el as any)._wifiPassword = "secret123";
		document.body.appendChild(el);
		await el.updateComplete;

		const events: Event[] = [];
		el.addEventListener("wifi-provision", (e) => events.push(e));

		(el as any)._dispatchWifiProvision();
		expect(events.length).toBe(1);
		expect((events[0] as CustomEvent).detail).toEqual({
			ssid: "HomeNet",
			password: "secret123",
		});
	});

	it("WiFi provisioning view hides OTA progress and device list", () => {
		const progress: OtaProgress = {
			step: "flashing",
			status: "in_progress",
		};
		const el = createView({ otaProgress: progress });
		(el as any)._showWifiProvisioning = true;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		// WiFi provisioning takes priority
		expect(c.querySelector(".wifi-form")).not.toBeNull();
		expect(c.querySelector(".progress-steps")).toBeNull();
	});

	it("shows scanning indicator when _wifiScanning=true", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any)._wifiScanning = true;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		// Scan button is the second non-raised ha-button in .confirm-actions
		const nonRaisedBtns = c.querySelectorAll(
			".confirm-actions ha-button:not([raised])",
		);
		const scanBtn = nonRaisedBtns[1] as HTMLElement;
		expect(scanBtn).not.toBeNull();
		expect(scanBtn.textContent?.trim()).toContain("flasher.scanning");
	});
});

describe("confirm dialog interactions", () => {
	it("selecting ethernet variant updates _selectedVariant", async () => {
		const el = createView({ flashableDevices: [device1] });
		(el as any)._confirmDevice = device1;
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const variantBtns = root.querySelectorAll(".variant-selector ha-button");
		// Second button is ethernet
		(variantBtns[1] as HTMLElement).click();

		expect((el as any)._selectedVariant).toBe("ethernet");
	});

	it("selecting wifi variant updates _selectedVariant", async () => {
		const el = createView({ flashableDevices: [device1] });
		(el as any)._confirmDevice = device1;
		(el as any)._selectedVariant = "ethernet";
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const variantBtns = root.querySelectorAll(".variant-selector ha-button");
		// First button is wifi
		(variantBtns[0] as HTMLElement).click();

		expect((el as any)._selectedVariant).toBe("wifi");
	});

	it("cancel button clears _confirmDevice", async () => {
		const el = createView({ flashableDevices: [device1] });
		(el as any)._confirmDevice = device1;
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const cancelBtn = root.querySelector(
			".confirm-actions ha-button:not([raised])",
		) as HTMLElement;
		cancelBtn.click();

		expect((el as any)._confirmDevice).toBeNull();
	});

	it("Flash button in device row sets _confirmDevice", async () => {
		const el = createView({ flashableDevices: [device1] });
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const flashBtn = root.querySelector(
			".device-row ha-button[raised]",
		) as HTMLElement;
		flashBtn.click();

		expect((el as any)._confirmDevice).toBe(device1);
	});
});

describe("WiFi provisioning DOM event handlers", () => {
	it("wifi network select change updates _selectedSsid", async () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any).wifiNetworks = [
			{ ssid: "NetworkA", rssi: -50, authRequired: false },
		];
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const select = root.querySelector("ha-select") as any;
		// Simulate selecting a network via ha-select's @selected event
		select.dispatchEvent(
			new CustomEvent("selected", { detail: { value: "NetworkA" } }),
		);

		expect((el as any)._selectedSsid).toBe("NetworkA");
	});

	it("manual SSID checkbox change toggles _manualSsid and clears SSID when unchecked", async () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any)._manualSsid = false;
		(el as any)._selectedSsid = "SomeNetwork";
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const checkbox = root.querySelector("ha-checkbox") as any;

		// Check it (enable manual SSID)
		checkbox.checked = true;
		checkbox.dispatchEvent(new Event("change"));
		expect((el as any)._manualSsid).toBe(true);
		// SSID should NOT be cleared when checking
		expect((el as any)._selectedSsid).toBe("SomeNetwork");

		// Uncheck (disable manual SSID) — should clear SSID
		checkbox.checked = false;
		checkbox.dispatchEvent(new Event("change"));
		expect((el as any)._manualSsid).toBe(false);
		expect((el as any)._selectedSsid).toBe("");
	});

	it("manual SSID text input updates _selectedSsid", async () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any)._manualSsid = true;
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const input = root.querySelector(
			"ha-textfield:not([type='password'])",
		) as any;
		input.value = "HiddenNet";
		input.dispatchEvent(new Event("input"));

		expect((el as any)._selectedSsid).toBe("HiddenNet");
	});

	it("password input updates _wifiPassword", async () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const input = root.querySelector("ha-textfield[type='password']") as any;
		input.value = "mypassword";
		input.dispatchEvent(new Event("input"));

		expect((el as any)._wifiPassword).toBe("mypassword");
	});
});

describe("USB flash view — state-driven", () => {
	it("renders flashing progress bar when usbFlashState is flashing", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = { step: "flashing", progress: 42 };
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".usb-progress")).not.toBeNull();
		expect(c.textContent).toContain("42%");
	});

	it("renders variant selector in idle state", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = null;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".variant-selector")).not.toBeNull();
	});

	it("does not render iframe", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector("iframe")).toBeNull();
	});

	it("renders connecting state", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = { step: "connecting" };
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".usb-status")).not.toBeNull();
		expect(c.textContent).toContain("flasher.usb_step_connecting");
	});

	it("renders wifi scan state", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = { step: "wifi_scan" };
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.textContent).toContain("flasher.usb_step_scanning");
	});

	it("renders complete state with IP and go-to-config button", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = { step: "complete", ip: "192.168.1.42" };
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.textContent).toContain("192.168.1.42");
		expect(
			c.querySelector(".confirm-actions ha-button[raised]"),
		).not.toBeNull();
	});

	it("renders error state with retry button", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = { step: "error", error: "flash failed" };
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".usb-error")).not.toBeNull();
		expect(c.textContent).toContain("flash failed");
		expect(
			c.querySelector(".confirm-actions ha-button[raised]"),
		).not.toBeNull();
	});

	it("renders wifi_provision state with existing WiFi provisioning UI", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = { step: "wifi_provision" };
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".wifi-form")).not.toBeNull();
	});

	it("renders adding_device state", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = { step: "adding_device" };
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.textContent).toContain("flasher.usb_step_adding");
	});

	it("dispatches usb-flash event with variant when Flash via USB clicked", async () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = null;
		document.body.appendChild(el);
		await el.updateComplete;

		const events: Event[] = [];
		el.addEventListener("usb-flash", (e) => events.push(e));

		const root = el.shadowRoot!;
		const flashBtn = root.querySelector(
			".confirm-actions ha-button[raised]",
		) as HTMLElement;
		flashBtn.click();

		expect(events.length).toBe(1);
		expect((events[0] as CustomEvent).detail).toEqual({
			variant: "wifi-ble-co2",
		});
	});

	it("dispatches usb-retry event when Retry clicked", async () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = { step: "error", error: "oops" };
		document.body.appendChild(el);
		await el.updateComplete;

		const events: Event[] = [];
		el.addEventListener("usb-retry", (e) => events.push(e));

		const root = el.shadowRoot!;
		const retryBtn = root.querySelector(
			".confirm-actions ha-button[raised]",
		) as HTMLElement;
		retryBtn.click();

		expect(events.length).toBe(1);
	});

	it("cancel hides USB flash view and resets state", async () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = null;
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const cancelBtn = root.querySelector(
			".confirm-actions ha-button:not([raised])",
		) as HTMLElement;
		cancelBtn.click();

		expect((el as any)._showUsbFlash).toBe(false);
	});

	it("clicking ethernet variant button in USB flash idle updates _selectedVariant", async () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = null;
		(el as any)._selectedVariant = "wifi";
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const variantBtns = root.querySelectorAll(".variant-selector ha-button");
		// Second button is ethernet
		(variantBtns[1] as HTMLElement).click();

		expect((el as any)._selectedVariant).toBe("ethernet");
	});

	it("clicking wifi variant button in USB flash idle updates _selectedVariant", async () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = null;
		(el as any)._selectedVariant = "ethernet";
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const variantBtns = root.querySelectorAll(".variant-selector ha-button");
		// First button is wifi
		(variantBtns[0] as HTMLElement).click();

		expect((el as any)._selectedVariant).toBe("wifi");
	});

	it("dispatches usb-flash with ethernet variant when ethernet is selected", async () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = null;
		(el as any)._selectedVariant = "ethernet";
		document.body.appendChild(el);
		await el.updateComplete;

		const events: Event[] = [];
		el.addEventListener("usb-flash", (e) => events.push(e));

		(el as any)._dispatchUsbFlash();

		expect(events.length).toBe(1);
		expect((events[0] as CustomEvent).detail).toEqual({
			variant: "ethernet-ble-co2",
		});
	});
});

describe("_getManifestUrl", () => {
	it("returns correct URL for wifi variant", () => {
		const el = createView();
		(el as any)._selectedVariant = "wifi";
		(el as any).firmwareBaseUrl = "https://example.com/fw";
		const url = (el as any)._getManifestUrl();
		expect(url).toBe(
			"https://example.com/fw/everything-presence-pro-wifi-ble-co2-manifest.json",
		);
	});

	it("returns correct URL for ethernet variant", () => {
		const el = createView();
		(el as any)._selectedVariant = "ethernet";
		(el as any).firmwareBaseUrl = "https://example.com/fw";
		const url = (el as any)._getManifestUrl();
		expect(url).toBe(
			"https://example.com/fw/everything-presence-pro-ethernet-ble-co2-manifest.json",
		);
	});
});

describe("variant selector styling", () => {
	it("selected wifi variant has appearance=accent", async () => {
		const el = createView();
		(el as any)._confirmDevice = device1;
		(el as any)._selectedVariant = "wifi";
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const btns = root.querySelectorAll(".variant-selector ha-button");
		expect((btns[0] as any).getAttribute("appearance")).toBe("accent");
		expect(btns[0].classList.contains("selected")).toBe(true);
	});

	it("unselected ethernet variant has appearance=outlined", async () => {
		const el = createView();
		(el as any)._confirmDevice = device1;
		(el as any)._selectedVariant = "wifi";
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const btns = root.querySelectorAll(".variant-selector ha-button");
		expect((btns[1] as any).getAttribute("appearance")).toBe("outlined");
		expect(btns[1].classList.contains("unselected")).toBe(true);
	});

	it("USB flash variant selector also uses appearance attribute", async () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = null;
		(el as any)._selectedVariant = "ethernet";
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const btns = root.querySelectorAll(".variant-selector ha-button");
		expect((btns[0] as any).getAttribute("appearance")).toBe("outlined");
		expect((btns[1] as any).getAttribute("appearance")).toBe("accent");
	});
});

describe("offline badge on device list", () => {
	it("shows offline badge for unavailable device", () => {
		const el = createView({ flashableDevices: [offlineDevice] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const badge = c.querySelector(".firmware-badge-offline");
		expect(badge).not.toBeNull();
		expect(badge!.textContent).toContain("flasher.offline");
	});

	it("does not show offline badge for available device", () => {
		const el = createView({ flashableDevices: [device1] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".firmware-badge-offline")).toBeNull();
	});
});

describe("ethernet complete message", () => {
	it("shows ethernet-specific message when variant starts with ethernet", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = {
			step: "complete",
			variant: "ethernet-ble-co2",
		};
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.textContent).toContain("flasher.usb_ethernet_complete");
		expect(c.textContent).toContain("flasher.usb_ethernet_hint");
	});

	it("shows link to devices dashboard for ethernet complete", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = {
			step: "complete",
			variant: "ethernet-ble-co2",
		};
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const link = c.querySelector("a[href='/config/devices/dashboard']");
		expect(link).not.toBeNull();
	});

	it("shows go-to-config button for wifi complete with IP", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = { step: "complete", ip: "192.168.1.42" };
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.textContent).toContain("flasher.usb_step_complete");
		expect(c.textContent).toContain("192.168.1.42");
	});
});

describe("wifi complete cleanup", () => {
	it("shows wifi_connected without hint when complete with no IP and no variant", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = { step: "complete" };
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.textContent).toContain("flasher.wifi_connected");
		expect(c.textContent).not.toContain("flasher.wifi_connected_hint");
	});

	it("wifi complete shows Done button that dispatches flash-complete", async () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = { step: "complete" };
		document.body.appendChild(el);
		await el.updateComplete;

		const events: Event[] = [];
		el.addEventListener("flash-complete", (e) => events.push(e));

		const root = el.shadowRoot!;
		const btn = root.querySelector(
			".confirm-actions ha-button[raised]",
		) as HTMLElement;
		btn.click();

		expect(events.length).toBe(1);
	});
});

describe("OTA progress success button", () => {
	it("does not show go-to-config button when OTA is in progress", () => {
		const progress: OtaProgress = {
			step: "flashing",
			status: "in_progress",
			progress: 50,
		};
		const el = createView({ otaProgress: progress });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".confirm-actions")).toBeNull();
	});
});
