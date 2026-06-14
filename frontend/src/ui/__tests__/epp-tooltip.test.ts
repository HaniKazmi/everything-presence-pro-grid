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
});
