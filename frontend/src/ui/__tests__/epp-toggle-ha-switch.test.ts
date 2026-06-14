import { beforeAll, describe, expect, it } from "vitest";
// This file covers BOTH branches of the ha-switch ternary in epp-toggle.ts
// using a single happy-dom window:
//
// 1. False branch (ha-switch absent) — tested in the first describe block
// 2. True branch (ha-switch present) — stub registered in beforeAll of second describe
//
// Using a static import (the branch is evaluated at render() time, not module-load time).
// Each vitest test file has its own happy-dom window, so stubs here do not leak.
import "../epp-toggle.js";
import type { EppToggle } from "../epp-toggle.js";

async function fixture(label = "test"): Promise<EppToggle> {
	const el = document.createElement("epp-toggle") as EppToggle;
	el.label = label;
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-toggle (ha-switch absent)", () => {
	it("uses the fallback label+checkbox when ha-switch is not registered", async () => {
		const el = await fixture("fallback");
		const control = el.shadowRoot!.querySelector("[data-toggle-control]");
		expect(control).toBeTruthy();
		// In the fallback path, data-toggle-control is on the <input> inside the label
		expect(control!.tagName.toLowerCase()).toBe("input");
	});
});

describe("epp-toggle (ha-switch registered)", () => {
	beforeAll(() => {
		// Register stub here so it only affects THIS describe's tests.
		// beforeAll runs after the preceding describe's tests complete, so
		// the first describe correctly sees the fallback path.
		if (!customElements.get("ha-switch")) {
			customElements.define("ha-switch", class extends HTMLElement {});
		}
	});

	it("uses ha-switch as the control when ha-switch is registered", async () => {
		const el = await fixture("ha-switch");
		const control = el.shadowRoot!.querySelector("[data-toggle-control]");
		expect(control).toBeTruthy();
		expect(control!.tagName.toLowerCase()).toBe("ha-switch");
	});
});
