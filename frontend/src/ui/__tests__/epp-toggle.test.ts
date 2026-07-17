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

	it("omits the label span entirely when label is empty", async () => {
		const el = document.createElement("epp-toggle") as EppToggle;
		document.body.appendChild(el);
		await el.updateComplete;
		// No empty flex item / gap artifact when an enclosing row owns the label.
		expect(el.shadowRoot!.querySelector(".label")).toBeNull();
	});

	it("gives a bare switch an accessible name via controlLabel (aria-label on the control)", async () => {
		const el = document.createElement("epp-toggle") as EppToggle;
		el.controlLabel = "Heatmap";
		document.body.appendChild(el);
		await el.updateComplete;
		const control = el.shadowRoot!.querySelector("[data-toggle-control]")!;
		expect(control.getAttribute("aria-label")).toBe("Heatmap");
		// controlLabel is the accessible name only — it does not add a visible label.
		expect(el.shadowRoot!.querySelector(".label")).toBeNull();
	});

	it("omits aria-label on the control when controlLabel is unset", async () => {
		const el = document.createElement("epp-toggle") as EppToggle;
		document.body.appendChild(el);
		await el.updateComplete;
		const control = el.shadowRoot!.querySelector("[data-toggle-control]")!;
		expect(control.hasAttribute("aria-label")).toBe(false);
	});
});
