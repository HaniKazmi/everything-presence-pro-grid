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

	// In this test env neither ha-input nor ha-textfield is registered, so the
	// native <input> fallback is used — which has no visible label, hence the
	// aria-label.
	it("sets aria-label on the native input fallback", async () => {
		const el = await fixture();
		const control = el.shadowRoot!.querySelector("[data-field-control]")!;
		expect(control.tagName).toBe("INPUT");
		expect(control.getAttribute("aria-label")).toBe("Room name");
	});

	it("omits aria-label on the native input when label is empty", async () => {
		const el = document.createElement("epp-field") as EppField;
		document.body.appendChild(el);
		await el.updateComplete;
		const control = el.shadowRoot!.querySelector("[data-field-control]")!;
		expect(control.hasAttribute("aria-label")).toBe(false);
	});

	it("passes a placeholder through to the control", async () => {
		const el = document.createElement("epp-field") as EppField;
		el.placeholder = "e.g. 65";
		document.body.appendChild(el);
		await el.updateComplete;
		const control = el.shadowRoot!.querySelector("[data-field-control]")!;
		expect(control.getAttribute("placeholder")).toBe("e.g. 65");
	});

	it("omits placeholder when not set", async () => {
		const el = await fixture();
		const control = el.shadowRoot!.querySelector("[data-field-control]")!;
		expect(control.hasAttribute("placeholder")).toBe(false);
	});

	it("passes autocomplete through to the control", async () => {
		const el = document.createElement("epp-field") as EppField;
		el.autocomplete = "off";
		document.body.appendChild(el);
		await el.updateComplete;
		const control = el.shadowRoot!.querySelector("[data-field-control]")!;
		expect(control.getAttribute("autocomplete")).toBe("off");
	});

	it("omits autocomplete when not set", async () => {
		const el = await fixture();
		const control = el.shadowRoot!.querySelector("[data-field-control]")!;
		expect(control.hasAttribute("autocomplete")).toBe(false);
	});

	it("passes number min/max/step through", async () => {
		const el = document.createElement("epp-field") as EppField;
		el.type = "number";
		el.min = "0";
		el.max = "100";
		el.step = "1";
		document.body.appendChild(el);
		await el.updateComplete;
		const control = el.shadowRoot!.querySelector("[data-field-control]")!;
		expect(control.getAttribute("min")).toBe("0");
		expect(control.getAttribute("max")).toBe("100");
		expect(control.getAttribute("step")).toBe("1");
	});

	it("omits min/max/step when not set", async () => {
		const el = await fixture();
		const control = el.shadowRoot!.querySelector("[data-field-control]")!;
		expect(control.hasAttribute("min")).toBe(false);
		expect(control.hasAttribute("max")).toBe(false);
		expect(control.hasAttribute("step")).toBe(false);
	});
});
