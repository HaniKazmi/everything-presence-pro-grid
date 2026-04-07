import { afterEach, describe, expect, it, vi } from "vitest";
import "../../components/epp-flasher-card.js";
import type { EppFlasherCard } from "../../components/epp-flasher-card.js";

function createCard(): EppFlasherCard {
	const el = document.createElement("epp-flasher-card") as EppFlasherCard;
	return el;
}

afterEach(() => {
	for (const child of [...document.body.children]) {
		document.body.removeChild(child);
	}
});

describe("epp-flasher-card element", () => {
	it("is registered as a custom element", () => {
		const Ctor = customElements.get("epp-flasher-card");
		expect(Ctor).toBeDefined();
	});

	it("does not throw when module is re-imported (panel reload guard)", async () => {
		vi.resetModules();
		await expect(
			import("../../components/epp-flasher-card.js"),
		).resolves.toBeDefined();
	});

	it("can be created via document.createElement", () => {
		const el = createCard();
		expect(el).toBeInstanceOf(HTMLElement);
	});

	it("setConfig is a no-op", () => {
		const el = createCard();
		expect(() => el.setConfig({})).not.toThrow();
	});

	it("renders epp-flasher-view inside", async () => {
		const el = createCard();
		el.hass = {
			callWS: vi.fn().mockResolvedValue({ devices: [] }),
			connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
		};
		document.body.appendChild(el);
		await el.updateComplete;

		const shadow = el.shadowRoot!;
		expect(shadow.querySelector("epp-flasher-view")).not.toBeNull();
	});

	it("has a _flasherCtrl controller", () => {
		const el = createCard();
		expect((el as any)._flasherCtrl).toBeDefined();
	});

	it("passes flashableDevices from controller to view", async () => {
		const el = createCard();
		el.hass = {
			callWS: vi.fn().mockResolvedValue({ devices: [] }),
			connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
		};
		document.body.appendChild(el);
		await el.updateComplete;

		const shadow = el.shadowRoot!;
		const view = shadow.querySelector("epp-flasher-view") as any;
		expect(Array.isArray(view.flashableDevices)).toBe(true);
	});

	it("passes loading state from controller to view", async () => {
		const el = createCard();
		// Don't set hass — controller loading starts true, loadDevices won't run
		document.body.appendChild(el);
		await el.updateComplete;

		const shadow = el.shadowRoot!;
		const view = shadow.querySelector("epp-flasher-view") as any;
		// loading is a boolean
		expect(typeof view.loading).toBe("boolean");
	});

	it("updated() sets hass on controller and calls subscribeDeviceList when loading=true", async () => {
		const el = createCard();
		const loadSpy = vi.spyOn((el as any)._flasherCtrl, "subscribeDeviceList");

		const hass = {
			callWS: vi.fn().mockResolvedValue({ devices: [] }),
			connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
		};
		el.hass = hass;
		document.body.appendChild(el);
		await el.updateComplete;

		expect((el as any)._flasherCtrl.hass).toBe(hass);
		expect(loadSpy).toHaveBeenCalled();
	});

	it("updated() does not call subscribeDeviceList again when loading=false", async () => {
		const el = createCard();
		const hass = {
			callWS: vi.fn().mockResolvedValue({ devices: [] }),
			connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
		};
		el.hass = hass;
		document.body.appendChild(el);
		await el.updateComplete;

		// Now loading is false (after first load), change hass again
		const loadSpy = vi.spyOn((el as any)._flasherCtrl, "subscribeDeviceList");
		(el as any)._flasherCtrl.loading = false;
		el.hass = { ...hass };
		await el.updateComplete;

		expect(loadSpy).not.toHaveBeenCalled();
	});
});
