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

	it("shows 'Skip and finish' button when nothing has changed", async () => {
		const el = await mount("Bedroom");
		const btn = el.shadowRoot?.querySelector("epp-button");
		expect(btn?.textContent?.trim()).toBe("device_setup.skip_and_finish");
	});

	it("shows 'Finish' button after the name has changed", async () => {
		const el = await mount("Bedroom");
		const nameField = el.shadowRoot?.querySelector("epp-field") as HTMLElement;
		nameField.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "New Name" },
				bubbles: true,
				composed: true,
			}),
		);
		await el.updateComplete;
		const btn = el.shadowRoot?.querySelector("epp-button");
		expect(btn?.textContent?.trim()).toBe("device_setup.finish");
	});

	it("shows 'Finish' button after only the area has changed", async () => {
		const el = await mount("Bedroom");
		const fields = [
			...(el.shadowRoot?.querySelectorAll("epp-field, ha-area-picker") ?? []),
		] as HTMLElement[];
		fields[fields.length - 1].dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "area_1" },
				bubbles: true,
				composed: true,
			}),
		);
		await el.updateComplete;
		const btn = el.shadowRoot?.querySelector("epp-button");
		expect(btn?.textContent?.trim()).toBe("device_setup.finish");
	});

	it("does NOT show recreate toggle when nothing has changed", async () => {
		const el = await mount("Bedroom");
		const toggle = el.shadowRoot?.querySelector("[data-test='recreate']");
		expect(toggle).toBeNull();
	});

	it("does NOT show recreate toggle when only area changed", async () => {
		const el = await mount("Bedroom");
		const fields = [
			...(el.shadowRoot?.querySelectorAll("epp-field, ha-area-picker") ?? []),
		] as HTMLElement[];
		fields[fields.length - 1].dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "area_1" },
				bubbles: true,
				composed: true,
			}),
		);
		await el.updateComplete;
		const toggle = el.shadowRoot?.querySelector("[data-test='recreate']");
		expect(toggle).toBeNull();
	});

	it("shows recreate toggle (checked) when name has changed", async () => {
		const el = await mount("Bedroom");
		const nameField = el.shadowRoot?.querySelector("epp-field") as HTMLElement;
		nameField.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "New Name" },
				bubbles: true,
				composed: true,
			}),
		);
		await el.updateComplete;
		const toggle = el.shadowRoot?.querySelector(
			"[data-test='recreate']",
		) as HTMLElement & { checked?: boolean };
		expect(toggle).not.toBeNull();
		// epp-toggle exposes checked property
		expect((toggle as never as { checked: boolean }).checked).toBe(true);
	});

	it("emits setup-submit with recreateEntityIds:true when name changed and checkbox checked", async () => {
		const el = await mount("Bedroom");
		// change the name
		const nameField = el.shadowRoot?.querySelector("epp-field") as HTMLElement;
		nameField.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "New Name" },
				bubbles: true,
				composed: true,
			}),
		);
		await el.updateComplete;

		let detail: unknown;
		el.addEventListener("setup-submit", (e) => {
			detail = (e as CustomEvent).detail;
		});
		(el as never as { _submit: () => void })._submit();
		expect(detail).toEqual({
			name: "New Name",
			areaId: null,
			recreateEntityIds: true,
		});
	});

	it("emits setup-submit with recreateEntityIds:false when checkbox unchecked", async () => {
		const el = await mount("Bedroom");
		// change the name
		const nameField = el.shadowRoot?.querySelector("epp-field") as HTMLElement;
		nameField.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "New Name" },
				bubbles: true,
				composed: true,
			}),
		);
		await el.updateComplete;

		// uncheck the recreate toggle
		(el as never as { _recreate: boolean })._recreate = false;
		await el.updateComplete;

		let detail: unknown;
		el.addEventListener("setup-submit", (e) => {
			detail = (e as CustomEvent).detail;
		});
		(el as never as { _submit: () => void })._submit();
		expect(detail).toEqual({
			name: "New Name",
			areaId: null,
			recreateEntityIds: false,
		});
	});

	it("emits setup-submit with recreateEntityIds:false when only area changed (no name change)", async () => {
		const el = await mount("Bedroom");
		(el as never as { _areaId: string | null })._areaId = "area_1";

		let detail: unknown;
		el.addEventListener("setup-submit", (e) => {
			detail = (e as CustomEvent).detail;
		});
		(el as never as { _submit: () => void })._submit();
		expect(detail).toEqual({
			name: "Bedroom",
			areaId: "area_1",
			recreateEntityIds: false,
		});
	});

	it("emits setup-submit when the primary button is clicked (DOM click)", async () => {
		const el = await mount("Bedroom");
		let detail: unknown;
		el.addEventListener("setup-submit", (e) => {
			detail = (e as CustomEvent).detail;
		});
		const btn = el.shadowRoot?.querySelector("epp-button") as HTMLElement;
		btn.click();
		await el.updateComplete;
		expect(detail).toBeDefined();
	});

	it("invokes _onRecreateChanged via DOM event and reflects in setup-submit", async () => {
		const el = await mount("Bedroom");
		// change name so recreate toggle renders
		const nameField = el.shadowRoot?.querySelector("epp-field") as HTMLElement;
		nameField.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "New Name" },
				bubbles: true,
				composed: true,
			}),
		);
		await el.updateComplete;

		// dispatch value-changed on the recreate toggle with value:false
		const toggle = el.shadowRoot?.querySelector(
			"[data-test='recreate']",
		) as HTMLElement;
		expect(toggle).not.toBeNull();
		toggle.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: false },
				bubbles: true,
				composed: true,
			}),
		);
		await el.updateComplete;

		// submit should carry recreateEntityIds:false (handler fired and set _recreate=false)
		let detail: unknown;
		el.addEventListener("setup-submit", (e) => {
			detail = (e as CustomEvent).detail;
		});
		(el as never as { _submit: () => void })._submit();
		expect(detail).toEqual({
			name: "New Name",
			areaId: null,
			recreateEntityIds: false,
		});

		// now dispatch value-changed with value:true and verify recreateEntityIds:true
		toggle.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: true },
				bubbles: true,
				composed: true,
			}),
		);
		await el.updateComplete;

		let detail2: unknown;
		el.addEventListener("setup-submit", (e) => {
			detail2 = (e as CustomEvent).detail;
		});
		(el as never as { _submit: () => void })._submit();
		expect((detail2 as { recreateEntityIds: boolean }).recreateEntityIds).toBe(
			true,
		);
	});

	it("renders ha-area-picker when ha-area-picker is registered", async () => {
		// Register a stub if not already present (persists for remaining tests, which is fine
		// because the fallback-branch tests use their own assertions independently)
		if (!customElements.get("ha-area-picker")) {
			customElements.define("ha-area-picker", class extends HTMLElement {});
		}
		const el = await mount("Bedroom");
		const picker = el.shadowRoot?.querySelector("ha-area-picker");
		expect(picker).not.toBeNull();
	});

	it("uses default identity localize when localize is not set", async () => {
		const el = document.createElement("epp-setup-form") as EppSetupForm;
		el.name = "Test";
		// intentionally do NOT set .localize — exercises the default (k)=>k initializer
		document.body.appendChild(el);
		await el.updateComplete;
		// The component renders without error using the default localize
		expect(el.shadowRoot?.querySelector("epp-field")).not.toBeNull();
		// Default localize returns the key unchanged
		const localize = (el as never as { localize: (k: string) => string })
			.localize;
		expect(localize("device_setup.name_label")).toBe("device_setup.name_label");
	});

	it("_onAreaChanged coerces empty string to null", async () => {
		const el = await mount("Bedroom");
		// First set a non-empty area
		const fields = [
			...(el.shadowRoot?.querySelectorAll("epp-field, ha-area-picker") ?? []),
		] as HTMLElement[];
		fields[fields.length - 1].dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "area_5" },
				bubbles: true,
				composed: true,
			}),
		);
		expect((el as never as { _areaId: string | null })._areaId).toBe("area_5");

		// Now clear the area (empty string should become null)
		fields[fields.length - 1].dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "" },
				bubbles: true,
				composed: true,
			}),
		);
		expect((el as never as { _areaId: string | null })._areaId).toBeNull();
	});
});
