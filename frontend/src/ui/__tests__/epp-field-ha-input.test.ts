import { describe, expect, it } from "vitest";

// Register ha-input stub BEFORE importing epp-field.
// The branch in epp-field's render() checks customElements.get("ha-input")
// at call time, so the stub only needs to be present when render() runs —
// not necessarily before the module is loaded.
// Because each vitest test file runs in its own happy-dom window, this stub
// does not affect other test files.
if (!customElements.get("ha-input")) {
	customElements.define("ha-input", class extends HTMLElement {});
}

// Static import is fine — the branch is evaluated at render() time, not at
// module-load time.
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
