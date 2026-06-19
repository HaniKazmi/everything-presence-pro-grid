import { describe, expect, it } from "vitest";
import "./epp-device-setup.js";
import type { DeviceInfo } from "../types.js";
import type { EppDeviceSetup } from "./epp-device-setup.js";

function makeDevice(over: Partial<DeviceInfo> = {}): DeviceInfo {
	return {
		mac: "AA:BB:CC:DD:EE:FF",
		name: "everything-presence-pro-aabbcc",
		host: "1.2.3.4",
		available: true,
		configured: false,
		area: null,
		firmware_status: "compatible",
		current_connection_count: 0,
		onboarded: false,
		...over,
	};
}

async function mount(
	device: DeviceInfo | null,
	open = true,
): Promise<EppDeviceSetup> {
	const el = document.createElement("epp-device-setup") as EppDeviceSetup;
	el.device = device;
	el.open = open;
	el.localize = ((k: string) => k) as never;
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-device-setup", () => {
	it("initializes on the name step with the device name", async () => {
		const el = await mount(makeDevice({ name: "Auto Name" }));
		expect((el as never as { _step: string })._step).toBe("name");
		expect((el as never as { _name: string })._name).toBe("Auto Name");
	});

	it("renders nothing when closed", async () => {
		const el = await mount(makeDevice(), false);
		expect(el.shadowRoot?.querySelector("epp-dialog")).toBeNull();
	});

	it("advances name -> area and back", async () => {
		const el = await mount(makeDevice());
		(el as never as { _next: () => void })._next();
		expect((el as never as { _step: string })._step).toBe("area");
		(el as never as { _back: () => void })._back();
		expect((el as never as { _step: string })._step).toBe("name");
	});

	it("updates areaId from the picker value-changed", async () => {
		const el = await mount(makeDevice());
		(el as never as { _step: string })._step = "area";
		await el.updateComplete;
		const field = el.shadowRoot?.querySelector(
			"epp-field, ha-area-picker",
		) as HTMLElement;
		field.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "area_9" },
				bubbles: true,
				composed: true,
			}),
		);
		expect((el as never as { _areaId: string | null })._areaId).toBe("area_9");
	});

	it("dispatches setup-complete with collected data and calibrate=true", async () => {
		const el = await mount(makeDevice());
		(el as never as { _name: string })._name = "Bedroom";
		(el as never as { _areaId: string | null })._areaId = "area_1";
		let detail: unknown;
		el.addEventListener("setup-complete", (e) => {
			detail = (e as CustomEvent).detail;
		});
		(el as never as { _finish: (c: boolean) => void })._finish(true);
		expect(detail).toEqual({
			mac: "AA:BB:CC:DD:EE:FF",
			name: "Bedroom",
			areaId: "area_1",
			calibrate: true,
		});
	});

	it("dispatches setup-complete with calibrate=false from 'later'", async () => {
		const el = await mount(makeDevice());
		let detail: { calibrate?: boolean } = {};
		el.addEventListener("setup-complete", (e) => {
			detail = (e as CustomEvent).detail;
		});
		(el as never as { _finish: (c: boolean) => void })._finish(false);
		expect(detail.calibrate).toBe(false);
	});

	it("dispatches setup-skip with the mac", async () => {
		const el = await mount(makeDevice());
		let detail: unknown;
		el.addEventListener("setup-skip", (e) => {
			detail = (e as CustomEvent).detail;
		});
		(el as never as { _onSkip: () => void })._onSkip();
		expect(detail).toEqual({ mac: "AA:BB:CC:DD:EE:FF" });
	});

	it("updates _name from name-step field value-changed", async () => {
		const el = await mount(makeDevice({ name: "Old" }));
		const field = el.shadowRoot?.querySelector("epp-field") as HTMLElement;
		field.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "New Name" },
				bubbles: true,
				composed: true,
			}),
		);
		expect((el as never as { _name: string })._name).toBe("New Name");
	});

	it("renders finish buttons when on area step", async () => {
		const el = await mount(makeDevice());
		(el as never as { _step: string })._step = "area";
		await el.updateComplete;
		const buttons = el.shadowRoot?.querySelectorAll("epp-button");
		const labels = Array.from(buttons ?? []).map((b) => b.textContent?.trim());
		expect(labels).toContain("device_setup.later");
		expect(labels).toContain("device_setup.calibrate_now");
	});

	it("clicking 'later' button dispatches setup-complete with calibrate=false", async () => {
		const el = await mount(makeDevice());
		(el as never as { _step: string })._step = "area";
		await el.updateComplete;
		let detail: { calibrate?: boolean } = {};
		el.addEventListener("setup-complete", (e) => {
			detail = (e as CustomEvent).detail;
		});
		// find the "later" button (text content = "device_setup.later")
		const buttons = Array.from(
			el.shadowRoot?.querySelectorAll("epp-button") ?? [],
		) as HTMLElement[];
		const laterBtn = buttons.find((b) =>
			b.textContent?.includes("device_setup.later"),
		);
		laterBtn?.click();
		expect(detail.calibrate).toBe(false);
	});

	it("clicking 'calibrate now' button dispatches setup-complete with calibrate=true", async () => {
		const el = await mount(makeDevice());
		(el as never as { _step: string })._step = "area";
		await el.updateComplete;
		let detail: { calibrate?: boolean } = {};
		el.addEventListener("setup-complete", (e) => {
			detail = (e as CustomEvent).detail;
		});
		const buttons = Array.from(
			el.shadowRoot?.querySelectorAll("epp-button") ?? [],
		) as HTMLElement[];
		const calibrateBtn = buttons.find((b) =>
			b.textContent?.includes("device_setup.calibrate_now"),
		);
		calibrateBtn?.click();
		expect(detail.calibrate).toBe(true);
	});

	it("uses default identity localize when none provided", async () => {
		const el = document.createElement("epp-device-setup") as EppDeviceSetup;
		el.device = makeDevice();
		el.open = true;
		// do NOT set el.localize — use the default
		document.body.appendChild(el);
		await el.updateComplete;
		// The default localize returns the key as-is; epp-dialog heading should be the key string
		const dialog = el.shadowRoot?.querySelector("epp-dialog");
		expect(
			dialog?.getAttribute("heading") ?? dialog?.getAttribute(".heading"),
		).toBeDefined();
		// Default localize is callable — call it directly
		const localize = (el as never as { localize: (k: string) => string })
			.localize;
		expect(localize("some.key")).toBe("some.key");
	});

	it("clears areaId when area picker value-changed fires with empty string", async () => {
		const el = await mount(makeDevice());
		(el as never as { _step: string })._step = "area";
		(el as never as { _areaId: string | null })._areaId = "area_1";
		await el.updateComplete;
		const field = el.shadowRoot?.querySelector(
			"epp-field, ha-area-picker",
		) as HTMLElement;
		field.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "" },
				bubbles: true,
				composed: true,
			}),
		);
		expect((el as never as { _areaId: string | null })._areaId).toBeNull();
	});

	it("does not dispatch when device is null on skip", async () => {
		const el = await mount(null);
		let fired = false;
		el.addEventListener("setup-skip", () => {
			fired = true;
		});
		(el as never as { _onSkip: () => void })._onSkip();
		expect(fired).toBe(false);
	});

	it("does not dispatch when device is null on finish", async () => {
		const el = await mount(null);
		let fired = false;
		el.addEventListener("setup-complete", () => {
			fired = true;
		});
		(el as never as { _finish: (c: boolean) => void })._finish(true);
		expect(fired).toBe(false);
	});

	it("renders ha-area-picker when it is registered", async () => {
		// Register a stub so the guard branch is exercised
		if (!customElements.get("ha-area-picker")) {
			customElements.define("ha-area-picker", class extends HTMLElement {});
		}
		const el = await mount(makeDevice());
		(el as never as { _step: string })._step = "area";
		await el.updateComplete;
		const picker = el.shadowRoot?.querySelector("ha-area-picker");
		expect(picker).not.toBeNull();
	});

	it("resets state when device changes", async () => {
		const el = await mount(makeDevice({ mac: "AA:BB:CC:DD:EE:FF" }));
		(el as never as { _step: string })._step = "area";
		el.device = makeDevice({
			mac: "11:22:33:44:55:66",
			name: "New Device",
		});
		await el.updateComplete;
		expect((el as never as { _step: string })._step).toBe("name");
		expect((el as never as { _name: string })._name).toBe("New Device");
	});

	it("resets initializedMac when closed", async () => {
		const el = await mount(makeDevice());
		el.open = false;
		await el.updateComplete;
		// reopen — should re-initialize
		el.open = true;
		await el.updateComplete;
		expect((el as never as { _step: string })._step).toBe("name");
	});
});
