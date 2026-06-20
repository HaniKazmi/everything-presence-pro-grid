import { describe, expect, it } from "vitest";
import "./epp-flasher-view.js";
import type { UsbFlashState } from "../types.js";
import type { EppFlasherView } from "./epp-flasher-view.js";

async function mountWithDeviceNaming(
	mac = "AA:BB:CC:DD:EE:FF",
	ip = "1.2.3.4",
): Promise<EppFlasherView> {
	const el = document.createElement("epp-flasher-view") as EppFlasherView;
	el.usbFlashState = {
		step: "device_naming",
		ip,
		mac,
	} satisfies UsbFlashState;
	el.localize = ((k: string) => k) as never;
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-flasher-view device_naming step", () => {
	it("renders epp-setup-form when step is device_naming", async () => {
		const el = await mountWithDeviceNaming();
		expect(el.shadowRoot?.querySelector("epp-setup-form")).not.toBeNull();
	});

	it("prefills name from MAC tail", async () => {
		const el = await mountWithDeviceNaming("AA:BB:CC:DD:EE:FF");
		const form = el.shadowRoot?.querySelector(
			"epp-setup-form",
		) as HTMLElement & {
			name: string;
		};
		expect(form.name).toBe("everything-presence-pro-ddeeff");
	});

	it("re-dispatches setup-submit as device-setup-submit with same detail", async () => {
		const el = await mountWithDeviceNaming();
		let capturedDetail: unknown;
		el.addEventListener("device-setup-submit", (e) => {
			capturedDetail = (e as CustomEvent).detail;
		});
		const form = el.shadowRoot?.querySelector("epp-setup-form") as HTMLElement;
		form.dispatchEvent(
			new CustomEvent("setup-submit", {
				detail: { name: "My Sensor", areaId: "area_1", calibrate: true },
				bubbles: true,
				composed: true,
			}),
		);
		expect(capturedDetail).toEqual({
			name: "My Sensor",
			areaId: "area_1",
			calibrate: true,
		});
	});

	it("re-dispatches setup-skip as device-setup-skip", async () => {
		const el = await mountWithDeviceNaming();
		let fired = false;
		el.addEventListener("device-setup-skip", () => {
			fired = true;
		});
		const form = el.shadowRoot?.querySelector("epp-setup-form") as HTMLElement;
		form.dispatchEvent(
			new CustomEvent("setup-skip", { bubbles: true, composed: true }),
		);
		expect(fired).toBe(true);
	});

	it("does not bubble the original setup-submit event (stopPropagation)", async () => {
		const el = await mountWithDeviceNaming();
		let rawFired = false;
		el.addEventListener("setup-submit", () => {
			rawFired = true;
		});
		const form = el.shadowRoot?.querySelector("epp-setup-form") as HTMLElement;
		form.dispatchEvent(
			new CustomEvent("setup-submit", {
				detail: { name: "X", areaId: null, calibrate: false },
				bubbles: true,
				composed: true,
			}),
		);
		expect(rawFired).toBe(false);
	});

	it("does not bubble the original setup-skip event (stopPropagation)", async () => {
		const el = await mountWithDeviceNaming();
		let rawFired = false;
		el.addEventListener("setup-skip", () => {
			rawFired = true;
		});
		const form = el.shadowRoot?.querySelector("epp-setup-form") as HTMLElement;
		form.dispatchEvent(
			new CustomEvent("setup-skip", { bubbles: true, composed: true }),
		);
		expect(rawFired).toBe(false);
	});

	it("exposes a hass property (attribute: false)", async () => {
		const el = document.createElement("epp-flasher-view") as EppFlasherView;
		const mockHass = { states: {} };
		(el as unknown as { hass: unknown }).hass = mockHass;
		document.body.appendChild(el);
		await el.updateComplete;
		expect((el as unknown as { hass: unknown }).hass).toBe(mockHass);
	});
});
