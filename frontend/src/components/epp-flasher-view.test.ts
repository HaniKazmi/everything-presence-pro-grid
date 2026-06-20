import { describe, expect, it } from "vitest";
import "./epp-flasher-view.js";
import type { EppFlasherView } from "./epp-flasher-view.js";

describe("epp-flasher-view", () => {
	it("exposes a hass property (attribute: false)", async () => {
		const el = document.createElement("epp-flasher-view") as EppFlasherView;
		const mockHass = { states: {} };
		(el as unknown as { hass: unknown }).hass = mockHass;
		document.body.appendChild(el);
		await el.updateComplete;
		expect((el as unknown as { hass: unknown }).hass).toBe(mockHass);
	});
});
