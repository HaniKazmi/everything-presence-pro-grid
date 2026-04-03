import { render } from "lit";
import { afterEach, describe, expect, it } from "vitest";
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
			"Loading devices",
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

		expect(c.querySelectorAll(".flash-btn").length).toBe(2);
	});

	it("Flash button disabled for offline device", () => {
		const el = createView({ flashableDevices: [offlineDevice] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const btn = c.querySelector(".flash-btn") as HTMLButtonElement;
		expect(btn.disabled).toBe(true);
	});

	it("Flash button enabled for online device", () => {
		const el = createView({ flashableDevices: [device1] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const btn = c.querySelector(".flash-btn") as HTMLButtonElement;
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
	it("shows USB section", () => {
		const el = createView();
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".usb-section")).not.toBeNull();
	});

	it("shows connect button in USB section", () => {
		const el = createView();
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".usb-connect-btn")).not.toBeNull();
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

		expect(c.querySelector(".go-device-btn")).not.toBeNull();
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

		expect(c.querySelector(".flash-btn")).not.toBeNull();
		expect(c.querySelector(".cancel-btn")).not.toBeNull();
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

		expect(c.querySelector(".go-device-btn")).toBeNull();
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

	it("dispatches usb-connect event on USB connect click", async () => {
		const el = createView();
		document.body.appendChild(el);
		await el.updateComplete;

		const events: Event[] = [];
		el.addEventListener("usb-connect", (e) => events.push(e));

		(el as any)._dispatchUsbConnect();

		expect(events.length).toBe(1);
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

describe("confirm dialog interactions", () => {
	it("selecting ethernet variant updates _selectedVariant", async () => {
		const el = createView({ flashableDevices: [device1] });
		(el as any)._confirmDevice = device1;
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const ethernetRadio = root.querySelector(
			'input[value="ethernet"]',
		) as HTMLInputElement;
		ethernetRadio.dispatchEvent(new Event("change"));

		expect((el as any)._selectedVariant).toBe("ethernet");
	});

	it("selecting wifi variant updates _selectedVariant", async () => {
		const el = createView({ flashableDevices: [device1] });
		(el as any)._confirmDevice = device1;
		(el as any)._selectedVariant = "ethernet";
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const wifiRadio = root.querySelector(
			'input[value="wifi"]',
		) as HTMLInputElement;
		wifiRadio.dispatchEvent(new Event("change"));

		expect((el as any)._selectedVariant).toBe("wifi");
	});

	it("cancel button clears _confirmDevice", async () => {
		const el = createView({ flashableDevices: [device1] });
		(el as any)._confirmDevice = device1;
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const cancelBtn = root.querySelector(".cancel-btn") as HTMLButtonElement;
		cancelBtn.click();

		expect((el as any)._confirmDevice).toBeNull();
	});

	it("Flash button in device row sets _confirmDevice", async () => {
		const el = createView({ flashableDevices: [device1] });
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const flashBtn = root.querySelector(".flash-btn") as HTMLButtonElement;
		flashBtn.click();

		expect((el as any)._confirmDevice).toBe(device1);
	});
});
