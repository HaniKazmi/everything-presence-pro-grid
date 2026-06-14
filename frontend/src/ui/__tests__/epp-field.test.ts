import { describe, expect, it } from "vitest";
import "../epp-field.js";
import type { EppField } from "../epp-field.js";

async function fixture(): Promise<EppField> {
	const el = document.createElement("epp-field") as EppField;
	el.label = "Room name";
	el.value = "Living room";
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-field", () => {
	it("renders a labelled control carrying the value", async () => {
		const el = await fixture();
		const control = el.shadowRoot!.querySelector(
			"[data-field-control]",
		) as HTMLInputElement;
		expect(control).toBeTruthy();
		expect((control as unknown as { label: string }).label).toBe("Room name");
		expect((control as unknown as { value: string }).value).toBe("Living room");
	});

	it("renders the unit suffix when provided", async () => {
		const el = await fixture();
		el.unit = "cm";
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".unit")!.textContent).toContain("cm");
	});

	it("re-emits value-changed with detail.value on input", async () => {
		const el = await fixture();
		let received: string | undefined;
		el.addEventListener("value-changed", (e) => {
			received = (e as CustomEvent<{ value: string }>).detail.value;
		});
		const control = el.shadowRoot!.querySelector(
			"[data-field-control]",
		) as HTMLInputElement;
		(control as unknown as { value: string }).value = "Office";
		control.dispatchEvent(new Event("input", { bubbles: true }));
		expect(received).toBe("Office");
	});

	it("swallows the inner control's own value-changed so consumers get only ours", async () => {
		const el = await fixture();
		let count = 0;
		el.addEventListener("value-changed", () => {
			count++;
		});
		const control = el.shadowRoot!.querySelector("[data-field-control]")!;
		// Simulate an inner ha-* element firing its own composed value-changed.
		control.dispatchEvent(
			new CustomEvent("value-changed", { bubbles: true, composed: true }),
		);
		// It must be stopped at the wrapper, not propagated to consumers.
		expect(count).toBe(0);
	});
});
