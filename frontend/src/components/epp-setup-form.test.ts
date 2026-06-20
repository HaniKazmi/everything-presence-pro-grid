import { describe, expect, it } from "vitest";
import "./epp-setup-form.js";
import type { EppSetupForm } from "./epp-setup-form.js";

async function mount(name = "Auto Name"): Promise<EppSetupForm> {
	const el = document.createElement("epp-setup-form") as EppSetupForm;
	el.name = name;
	el.localize = ((k: string) => k) as never;
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-setup-form", () => {
	it("initializes _name from the name property and renders name + area", async () => {
		const el = await mount("Bedroom");
		expect((el as never as { _name: string })._name).toBe("Bedroom");
		expect(el.shadowRoot?.querySelector("epp-field")).not.toBeNull();
		expect(
			el.shadowRoot?.querySelector("ha-area-picker, epp-field:nth-of-type(2)"),
		).not.toBeNull();
	});

	it("updates _name and _areaId from field changes", async () => {
		const el = await mount();
		const fields = [
			...(el.shadowRoot?.querySelectorAll("epp-field, ha-area-picker") ?? []),
		] as HTMLElement[];
		fields[0].dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "Bed" },
				bubbles: true,
				composed: true,
			}),
		);
		fields[fields.length - 1].dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "area_9" },
				bubbles: true,
				composed: true,
			}),
		);
		expect((el as never as { _name: string })._name).toBe("Bed");
		expect((el as never as { _areaId: string | null })._areaId).toBe("area_9");
	});

	it("emits setup-submit with collected data and calibrate flag", async () => {
		const el = await mount("Bedroom");
		(el as never as { _areaId: string | null })._areaId = "area_1";
		let detail: unknown;
		el.addEventListener("setup-submit", (e) => {
			detail = (e as CustomEvent).detail;
		});
		(el as never as { _submit: (c: boolean) => void })._submit(true);
		expect(detail).toEqual({
			name: "Bedroom",
			areaId: "area_1",
			calibrate: true,
		});
	});

	it("emits setup-skip", async () => {
		const el = await mount();
		let fired = false;
		el.addEventListener("setup-skip", () => {
			fired = true;
		});
		(el as never as { _onSkip: () => void })._onSkip();
		expect(fired).toBe(true);
	});
});
