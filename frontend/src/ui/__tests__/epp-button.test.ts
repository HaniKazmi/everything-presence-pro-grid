import { describe, expect, it } from "vitest";
import "../epp-button.js";
import type { EppButton } from "../epp-button.js";

async function fixture(attrs = ""): Promise<EppButton> {
	const el = document.createElement("epp-button") as EppButton;
	if (attrs) el.setAttribute("variant", attrs);
	el.textContent = "Save";
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-button", () => {
	it("renders an inner native button carrying the variant class", async () => {
		const el = await fixture("primary");
		const btn = el.shadowRoot!.querySelector("button")!;
		expect(btn).toBeTruthy();
		expect(btn.classList.contains("primary")).toBe(true);
	});

	it("defaults to the neutral variant", async () => {
		const el = await fixture();
		expect(
			el.shadowRoot!.querySelector("button")!.classList.contains("neutral"),
		).toBe(true);
	});

	it("reflects disabled to the inner button and blocks clicks", async () => {
		const el = await fixture("primary");
		el.disabled = true;
		await el.updateComplete;
		const btn = el.shadowRoot!.querySelector("button")!;
		expect(btn.disabled).toBe(true);
		let clicked = false;
		el.addEventListener("click", () => {
			clicked = true;
		});
		btn.click();
		expect(clicked).toBe(false);
	});

	it("lets clicks bubble from the host when enabled", async () => {
		const el = await fixture("primary");
		let clicked = false;
		el.addEventListener("click", () => {
			clicked = true;
		});
		el.shadowRoot!.querySelector("button")!.click();
		expect(clicked).toBe(true);
	});
});
