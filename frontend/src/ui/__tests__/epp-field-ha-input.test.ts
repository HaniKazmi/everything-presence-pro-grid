import { describe, expect, it } from "vitest";

// Register the ha-input stub before any epp-field element is constructed.
// epp-field resolves its control tag once, in a class-field initializer that
// runs at construction time (`customElements.get("ha-input")`), so the stub
// must exist before `document.createElement("epp-field")` is called in the
// fixture below — registering it at module top satisfies that.
// Because each vitest test file runs in its own worker/window, this stub does
// not affect other test files.
if (!customElements.get("ha-input")) {
	customElements.define("ha-input", class extends HTMLElement {});
}

import "../epp-field.js";
import type { EppField } from "../epp-field.js";

async function fixture(): Promise<EppField> {
	const el = document.createElement("epp-field") as EppField;
	el.label = "Room";
	el.value = "Living room";
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-field (ha-input registered)", () => {
	it("uses ha-input as the control when ha-input is registered", async () => {
		const el = await fixture();
		const control = el.shadowRoot!.querySelector("[data-field-control]");
		expect(control).toBeTruthy();
		expect(control!.tagName).toBe("HA-INPUT");
	});
});
