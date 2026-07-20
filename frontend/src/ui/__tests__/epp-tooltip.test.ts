import { describe, expect, it } from "vitest";
import "../epp-tooltip.js";
import type { EppTooltip } from "../epp-tooltip.js";

async function fixture(): Promise<EppTooltip> {
	const el = document.createElement("epp-tooltip") as EppTooltip;
	el.content = "Duplicate zone";
	el.innerHTML = "<button>copy</button>";
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-tooltip", () => {
	it("renders the trigger slot", async () => {
		const el = await fixture();
		expect(el.shadowRoot!.querySelector("slot:not([name])")).toBeTruthy();
	});

	it("renders the content in a role=tooltip element", async () => {
		const el = await fixture();
		const tip = el.shadowRoot!.querySelector('[role="tooltip"]')!;
		expect(tip.textContent).toContain("Duplicate zone");
	});

	// The hint shows on focus, but a pointer press focuses the trigger too — so
	// focus the browser would draw no focus ring for is marked, letting the CSS
	// show the hint for keyboard focus only. happy-dom resolves :focus-visible as
	// plain :focus, so it cannot tell the two kinds of focus apart: only the
	// unmarked direction is assertable here, and the real keyboard-vs-mouse
	// behaviour lives in src/__tests__/browser/tooltip-click-dismiss.browser.test.ts.
	it("leaves focus-visible focus unmarked, so the hint shows", async () => {
		const el = await fixture();
		const trigger = el.querySelector("button")!;
		trigger.focus();

		trigger.dispatchEvent(
			new Event("focusin", { bubbles: true, composed: true }),
		);

		expect(el.hasAttribute("pointer-focus")).toBe(false);
	});

	it("clears the marker once focus leaves the trigger", async () => {
		const el = await fixture();
		el.setAttribute("pointer-focus", "");

		el.querySelector("button")!.dispatchEvent(
			new Event("focusout", { bubbles: true, composed: true }),
		);

		expect(el.hasAttribute("pointer-focus")).toBe(false);
	});

	// A press on non-focusable padding (e.g. the gap in the panel's labelled
	// toggle row) focuses nothing, so no focusout ever follows to clear a marker
	// set on pointerdown alone. Left stuck, it would suppress the hint for a
	// later keyboard Tab onto the trigger.
	it("leaves no marker when a press focuses nothing", async () => {
		const el = await fixture();

		el.dispatchEvent(new Event("pointerdown", { bubbles: true }));

		expect(el.hasAttribute("pointer-focus")).toBe(false);
	});
});
