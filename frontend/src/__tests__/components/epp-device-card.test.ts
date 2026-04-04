import { describe, expect, it } from "vitest";
import "../../components/epp-device-card.js";
import type { EppDeviceCard } from "../../components/epp-device-card.js";

describe("epp-device-card element", () => {
	it("is registered as a custom element", () => {
		const Ctor = customElements.get("epp-device-card");
		expect(Ctor).toBeDefined();
	});

	it("can be created via document.createElement", () => {
		const el = document.createElement("epp-device-card");
		expect(el).toBeInstanceOf(HTMLElement);
	});

	it("setConfig is a no-op", () => {
		const el = document.createElement("epp-device-card") as EppDeviceCard;
		expect(() => el.setConfig({})).not.toThrow();
	});

	it("renders the eppgrid-panel element", async () => {
		const el = document.createElement("epp-device-card") as EppDeviceCard;
		el.hass = { callWS: () => Promise.resolve({}) };
		document.body.appendChild(el);
		await el.updateComplete;

		const shadow = el.shadowRoot!;
		expect(shadow.querySelector("eppgrid-panel")).not.toBeNull();

		document.body.removeChild(el);
	});

	it("passes hass property to eppgrid-panel", async () => {
		const el = document.createElement("epp-device-card") as EppDeviceCard;
		const hass = { callWS: () => Promise.resolve({}), user: { name: "Test" } };
		el.hass = hass;
		document.body.appendChild(el);
		await el.updateComplete;

		const shadow = el.shadowRoot!;
		const panel = shadow.querySelector("eppgrid-panel") as any;
		expect(panel.hass).toBe(hass);

		document.body.removeChild(el);
	});
});
