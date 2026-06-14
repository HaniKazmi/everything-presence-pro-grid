import { describe, expect, it } from "vitest";
import "../epp-toggle.js";
import type { EppToggle } from "../epp-toggle.js";

async function fixture(): Promise<EppToggle> {
	const el = document.createElement("epp-toggle") as EppToggle;
	el.label = "Track this zone";
	el.checked = true;
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-toggle", () => {
	it("renders the label", async () => {
		const el = await fixture();
		expect(el.shadowRoot!.querySelector(".label")!.textContent).toContain(
			"Track this zone",
		);
	});

	it("renders a control reflecting checked", async () => {
		const el = await fixture();
		const control = el.shadowRoot!.querySelector(
			"[data-toggle-control]",
		) as HTMLInputElement;
		expect((control as unknown as { checked: boolean }).checked).toBe(true);
	});

	it("emits value-changed with the new boolean on change", async () => {
		const el = await fixture();
		let received: boolean | undefined;
		el.addEventListener("value-changed", (e) => {
			received = (e as CustomEvent<{ value: boolean }>).detail.value;
		});
		const control = el.shadowRoot!.querySelector(
			"[data-toggle-control]",
		) as HTMLInputElement;
		(control as unknown as { checked: boolean }).checked = false;
		control.dispatchEvent(new Event("change", { bubbles: true }));
		expect(received).toBe(false);
	});
});
