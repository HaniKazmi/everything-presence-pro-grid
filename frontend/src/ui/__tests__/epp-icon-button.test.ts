import { describe, expect, it } from "vitest";
import "../epp-icon-button.js";
import type { EppIconButton } from "../epp-icon-button.js";

async function fixture(): Promise<EppIconButton> {
	const el = document.createElement("epp-icon-button") as EppIconButton;
	el.icon = "mdi:delete";
	el.label = "Remove zone";
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-icon-button", () => {
	it("renders an ha-icon with the given icon", async () => {
		const el = await fixture();
		const icon = el.shadowRoot!.querySelector("ha-icon")!;
		expect(icon.getAttribute("icon")).toBe("mdi:delete");
	});

	it("exposes the label as aria-label for a11y", async () => {
		const el = await fixture();
		expect(
			el.shadowRoot!.querySelector("button")!.getAttribute("aria-label"),
		).toBe("Remove zone");
	});

	it("blocks clicks when disabled", async () => {
		const el = await fixture();
		el.disabled = true;
		await el.updateComplete;
		let clicked = false;
		el.addEventListener("click", () => {
			clicked = true;
		});
		el.shadowRoot!.querySelector("button")!.click();
		expect(clicked).toBe(false);
	});
});
