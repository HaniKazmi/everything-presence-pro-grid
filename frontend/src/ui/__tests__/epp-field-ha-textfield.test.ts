import { describe, expect, it } from "vitest";

// Register ha-textfield stub but NOT ha-input — we test the middle branch.
// epp-field resolves its tag once at construction (class-field initializer):
// it checks customElements.get("ha-input") first (false), then
// customElements.get("ha-textfield") (true), so the stub must exist before the
// fixture constructs an element. Each vitest test file runs in its own
// worker/window, so this stub does not affect other test files.
if (!customElements.get("ha-textfield")) {
	customElements.define("ha-textfield", class extends HTMLElement {});
}

import "../epp-field.js";
import type { EppField } from "../epp-field.js";

async function fixture(): Promise<EppField> {
	const el = document.createElement("epp-field") as EppField;
	el.label = "Distance";
	el.value = "5";
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-field (ha-textfield registered, ha-input absent)", () => {
	it("uses ha-textfield as the control when ha-textfield is registered but ha-input is not", async () => {
		const el = await fixture();
		const control = el.shadowRoot!.querySelector("[data-field-control]");
		expect(control).toBeTruthy();
		expect(control!.tagName).toBe("HA-TEXTFIELD");
	});
});
