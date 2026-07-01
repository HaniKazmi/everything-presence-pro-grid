import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import "../../components/epp-furniture-sidebar.js";
import type { EppFurnitureSidebar } from "../../components/epp-furniture-sidebar.js";
import type { FurnitureItem } from "../../lib/furniture.js";

function renderTo(tpl: any): HTMLDivElement {
	const container = document.createElement("div");
	document.body.appendChild(container);
	render(tpl, container);
	return container;
}

function createSidebar(
	overrides: Record<string, any> = {},
): EppFurnitureSidebar {
	const el = document.createElement("epp-furniture-sidebar") as any;
	el.furniture = [];
	el.selectedFurnitureId = null;
	el.hass = {};
	el.localize = (k: string) => k;
	el.showCustomIconPicker = false;
	el.customIconValue = "";
	Object.assign(el, overrides);
	return el as EppFurnitureSidebar;
}

const SAMPLE_FURNITURE: FurnitureItem = {
	id: "f1",
	type: "svg",
	icon: "armchair",
	label: "Chair",
	x: 100,
	y: 200,
	width: 800,
	height: 800,
	rotation: 0,
	lockAspect: false,
};

describe("epp-furniture-sidebar element", () => {
	it("is registered as a custom element", () => {
		const Ctor = customElements.get("epp-furniture-sidebar");
		expect(Ctor).toBeDefined();
	});

	it("can be created via document.createElement", () => {
		const el = document.createElement(
			"epp-furniture-sidebar",
		) as EppFurnitureSidebar;
		expect(el).toBeInstanceOf(HTMLElement);
	});

	it("renders with default state without crashing", () => {
		const el = createSidebar();
		const result = (el as any).render();
		expect(result).toBeDefined();
	});

	it("renders furniture catalog", () => {
		const el = createSidebar();
		const result = (el as any)._renderFurnitureSidebar();
		expect(result).toBeDefined();
	});

	it("renders with selected furniture", () => {
		const el = createSidebar({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});
		const result = (el as any)._renderFurnitureSidebar();
		expect(result).toBeDefined();
	});

	it("renders with custom icon picker open", () => {
		const el = createSidebar({
			showCustomIconPicker: true,
			customIconValue: "mdi:lamp",
		});
		const result = (el as any)._renderFurnitureSidebar();
		expect(result).toBeDefined();
	});

	it("renders with empty custom icon value", () => {
		const el = createSidebar({
			showCustomIconPicker: true,
			customIconValue: "",
		});
		const result = (el as any)._renderFurnitureSidebar();
		expect(result).toBeDefined();
	});
});

describe("epp-furniture-sidebar DOM events", () => {
	it("clicking a sticker fires furniture-add", () => {
		const el = createSidebar();
		const handler = vi.fn();
		el.addEventListener("furniture-add", handler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const stickers = c.querySelectorAll(".furn-sticker:not(.furn-custom)");
		if (stickers.length > 0) {
			(stickers[0] as HTMLElement).click();
			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler.mock.calls[0][0].detail).toBeDefined();
		}
		document.body.removeChild(c);
	});

	it("typing in the search input filters the catalog", () => {
		const el = createSidebar({
			localize: (k: string) =>
				({
					"furniture.sofa_2_seat": "Sofa (2 seat)",
					"furniture.sofa_3_seat": "Sofa (3 seat)",
					"furniture.lamp": "Lamp",
				})[k] ?? k,
		});

		const tpl1 = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl1);
		const before = c.querySelectorAll(".furn-sticker:not(.furn-custom)").length;

		const input = c.querySelector(".furn-search") as HTMLInputElement;
		expect(input).toBeTruthy();
		input.value = "sofa";
		input.dispatchEvent(new Event("input"));

		// Re-render with the now-updated _searchQuery state
		const tpl2 = (el as any)._renderFurnitureSidebar();
		render(tpl2, c);
		const after = c.querySelectorAll(".furn-sticker:not(.furn-custom)").length;

		expect(after).toBeLessThan(before);
		expect(after).toBeGreaterThan(0);
		document.body.removeChild(c);
	});

	it("custom icon button fires custom-icon-toggle", () => {
		const el = createSidebar();
		const handler = vi.fn();
		el.addEventListener("custom-icon-toggle", handler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const customBtn = c.querySelector(".furn-custom") as HTMLElement;
		if (customBtn) {
			customBtn.click();
			expect(handler).toHaveBeenCalledTimes(1);
		}
		document.body.removeChild(c);
	});

	it("custom icon picker cancel fires toggle and change events", () => {
		const el = createSidebar({
			showCustomIconPicker: true,
			customIconValue: "mdi:lamp",
		});
		const toggleHandler = vi.fn();
		const changeHandler = vi.fn();
		el.addEventListener("custom-icon-toggle", toggleHandler);
		el.addEventListener("custom-icon-change", changeHandler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const backBtn = c.querySelector(".wizard-btn-back") as HTMLElement;
		if (backBtn) {
			backBtn.click();
			expect(toggleHandler).toHaveBeenCalledTimes(1);
			expect(changeHandler).toHaveBeenCalledTimes(1);
			expect(changeHandler.mock.calls[0][0].detail).toBe("");
		}
		document.body.removeChild(c);
	});

	it("custom icon picker dialog-dismiss (Escape) fires toggle and change events", () => {
		const el = createSidebar({
			showCustomIconPicker: true,
			customIconValue: "mdi:lamp",
		});
		const toggleHandler = vi.fn();
		const changeHandler = vi.fn();
		el.addEventListener("custom-icon-toggle", toggleHandler);
		el.addEventListener("custom-icon-change", changeHandler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const dialog = c.querySelector("epp-dialog[open]") as HTMLElement;
		expect(dialog).not.toBeNull();
		// Escape emits dialog-dismiss; must behave exactly like the Cancel
		// button (close the picker + clear the pending value).
		dialog.dispatchEvent(new CustomEvent("dialog-dismiss"));
		expect(toggleHandler).toHaveBeenCalledTimes(1);
		expect(changeHandler).toHaveBeenCalledTimes(1);
		expect(changeHandler.mock.calls[0][0].detail).toBe("");
		document.body.removeChild(c);
	});

	it("custom icon picker add fires furniture-add-custom", () => {
		const el = createSidebar({
			showCustomIconPicker: true,
			customIconValue: "mdi:star",
		});
		const handler = vi.fn();
		el.addEventListener("furniture-add-custom", handler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const primaryBtn = c.querySelector(".wizard-btn-primary") as HTMLElement;
		if (primaryBtn) {
			primaryBtn.click();
			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler.mock.calls[0][0].detail).toBe("mdi:star");
		}
		document.body.removeChild(c);
	});

	it("search input precedes the selected-info box in DOM order", () => {
		// Search must be pinned at the top of the sidebar; the selected-info
		// panel belongs just below it, not above. This protects against
		// regressions where the selected box gets reinserted above the search.
		const el = createSidebar({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});
		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const search = c.querySelector(".furn-search") as HTMLElement;
		const info = c.querySelector(".furn-selected-info") as HTMLElement;
		expect(search).toBeTruthy();
		expect(info).toBeTruthy();
		expect(
			search.compareDocumentPosition(info) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		document.body.removeChild(c);
	});

	it("search input stays pinned (position: sticky) when catalog scrolls", () => {
		const el = createSidebar();
		document.body.appendChild(el as unknown as HTMLElement);
		// Flush Lit's initial render so the shadow root is populated.
		(el as any).requestUpdate?.();
		return (el as any).updateComplete.then(() => {
			const search = (el as any).shadowRoot.querySelector(
				".furn-search",
			) as HTMLElement;
			expect(search).toBeTruthy();
			const cs = getComputedStyle(search);
			expect(cs.position).toBe("sticky");
			expect(cs.top).toBe("0px");
			document.body.removeChild(el as unknown as HTMLElement);
		});
	});

	it("furniture remove button fires furniture-remove", () => {
		const el = createSidebar({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});
		const handler = vi.fn();
		el.addEventListener("furniture-remove", handler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const removeBtn = c.querySelector(".sidebar-remove-btn") as HTMLElement;
		if (removeBtn) {
			removeBtn.click();
			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler.mock.calls[0][0].detail).toBe("f1");
		}
		document.body.removeChild(c);
	});

	it("furniture dimension inputs fire furniture-update", () => {
		const el = createSidebar({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});
		const handler = vi.fn();
		el.addEventListener("furniture-update", handler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const inputs = c.querySelectorAll(
			".furn-dims input",
		) as NodeListOf<HTMLInputElement>;
		if (inputs.length >= 3) {
			inputs[0].value = "120";
			inputs[0].dispatchEvent(new Event("change"));
			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler.mock.calls[0][0].detail.id).toBe("f1");
			expect(handler.mock.calls[0][0].detail.updates.width).toBe(1200);

			inputs[1].value = "100";
			inputs[1].dispatchEvent(new Event("change"));
			expect(handler).toHaveBeenCalledTimes(2);
			expect(handler.mock.calls[1][0].detail.updates.height).toBe(1000);

			inputs[2].value = "45";
			inputs[2].dispatchEvent(new Event("change"));
			expect(handler).toHaveBeenCalledTimes(3);
			expect(handler.mock.calls[2][0].detail.updates.rotation).toBe(45);
		}
		document.body.removeChild(c);
	});

	it("renders icon-type catalog items with ha-icon fallback", async () => {
		// Temporarily add an icon-type entry to exercise the non-SVG branch
		const { FURNITURE_CATALOG } = await import("../../constants.js");
		const orig = [...FURNITURE_CATALOG];
		FURNITURE_CATALOG.push({
			type: "icon",
			icon: "mdi:test-icon",
			label: "furniture.custom",
			defaultWidth: 400,
			defaultHeight: 400,
			lockAspect: true,
		});
		try {
			const el = createSidebar();
			const tpl = (el as any)._renderFurnitureSidebar();
			const c = renderTo(tpl);
			const icons = c.querySelectorAll("ha-icon");
			// Should have at least the mdi:plus for custom + our test icon
			expect(icons.length).toBeGreaterThanOrEqual(2);
			document.body.removeChild(c);
		} finally {
			FURNITURE_CATALOG.length = 0;
			FURNITURE_CATALOG.push(...orig);
		}
	});

	it("icon picker value-changed fires custom-icon-change", () => {
		const el = createSidebar({
			showCustomIconPicker: true,
			customIconValue: "",
		});
		const handler = vi.fn();
		el.addEventListener("custom-icon-change", handler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const picker = c.querySelector("ha-icon-picker") as HTMLElement;
		if (picker) {
			picker.dispatchEvent(
				new CustomEvent("value-changed", {
					detail: { value: "mdi:lamp" },
				}),
			);
			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler.mock.calls[0][0].detail).toBe("mdi:lamp");
		}
		document.body.removeChild(c);
	});

	it("icon picker value-changed coerces null/undefined to empty string", () => {
		const el = createSidebar({
			showCustomIconPicker: true,
			customIconValue: "mdi:lamp",
		});
		const handler = vi.fn();
		el.addEventListener("custom-icon-change", handler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const picker = c.querySelector("ha-icon-picker") as HTMLElement;
		// Downstream consumers (panel reflects this back into customIconValue,
		// which is then `.trim()`-ed) require a string — null gets coerced.
		picker.dispatchEvent(
			new CustomEvent("value-changed", { detail: { value: null } }),
		);
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail).toBe("");

		// `??` (not `||`) preserves an explicit empty string the user typed.
		picker.dispatchEvent(
			new CustomEvent("value-changed", { detail: { value: "" } }),
		);
		expect(handler).toHaveBeenCalledTimes(2);
		expect(handler.mock.calls[1][0].detail).toBe("");

		picker.dispatchEvent(
			new CustomEvent("value-changed", { detail: { value: undefined } }),
		);
		expect(handler).toHaveBeenCalledTimes(3);
		expect(handler.mock.calls[2][0].detail).toBe("");

		document.body.removeChild(c);
	});

	it("rotation input parses fractional degrees (parseFloat)", () => {
		const el = createSidebar({
			furniture: [{ ...SAMPLE_FURNITURE, id: "f1", rotation: 0 }],
			selectedFurnitureId: "f1",
		});
		const handler = vi.fn();
		el.addEventListener("furniture-update", handler);
		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);
		const inputs = c.querySelectorAll(
			".furn-dims input",
		) as NodeListOf<HTMLInputElement>;
		inputs[2].value = "12.5";
		inputs[2].dispatchEvent(new Event("change"));
		const calls = handler.mock.calls;
		const last = calls[calls.length - 1][0].detail.updates.rotation;
		expect(last).toBeCloseTo(12.5, 6);
		document.body.removeChild(c);
	});

	it("rotation input wraps negatives to 0..360 (e.g. -90 → 270)", () => {
		const el = createSidebar({
			furniture: [{ ...SAMPLE_FURNITURE, id: "f1", rotation: 0 }],
			selectedFurnitureId: "f1",
		});
		const handler = vi.fn();
		el.addEventListener("furniture-update", handler);
		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);
		const inputs = c.querySelectorAll(
			".furn-dims input",
		) as NodeListOf<HTMLInputElement>;
		inputs[2].value = "-90";
		inputs[2].dispatchEvent(new Event("change"));
		const calls = handler.mock.calls;
		const last = calls[calls.length - 1][0].detail.updates.rotation;
		expect(last).toBe(270);

		inputs[2].value = "450";
		inputs[2].dispatchEvent(new Event("change"));
		const calls2 = handler.mock.calls;
		const last2 = calls2[calls2.length - 1][0].detail.updates.rotation;
		expect(last2).toBe(90);
		document.body.removeChild(c);
	});

	it("ignores a cleared/non-finite rotation field (NaN must not reach state)", () => {
		const el = createSidebar({
			furniture: [{ ...SAMPLE_FURNITURE, id: "f1", rotation: 0 }],
			selectedFurnitureId: "f1",
		});
		const handler = vi.fn();
		el.addEventListener("furniture-update", handler);
		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);
		const inputs = c.querySelectorAll(
			".furn-dims input",
		) as NodeListOf<HTMLInputElement>;
		inputs[2].value = "";
		inputs[2].dispatchEvent(new Event("change"));
		expect(handler).not.toHaveBeenCalled();
		document.body.removeChild(c);
	});
});

describe("width/height input guards", () => {
	function dimsInputs(el: any): NodeListOf<HTMLInputElement> {
		const tpl = el._renderFurnitureSidebar();
		const c = renderTo(tpl);
		return c.querySelectorAll(".furn-dims input");
	}

	it("ignores a cleared width field (NaN must not reach state)", () => {
		const el = createSidebar({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});
		const handler = vi.fn();
		el.addEventListener("furniture-update", handler);
		const inputs = dimsInputs(el);

		inputs[0].value = "";
		inputs[0].dispatchEvent(new Event("change"));

		// Pre-guard this emitted { width: NaN }, which rendered width: NaNpx.
		expect(handler).not.toHaveBeenCalled();
	});

	it("ignores a cleared height field", () => {
		const el = createSidebar({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});
		const handler = vi.fn();
		el.addEventListener("furniture-update", handler);
		const inputs = dimsInputs(el);

		inputs[1].value = "";
		inputs[1].dispatchEvent(new Event("change"));

		expect(handler).not.toHaveBeenCalled();
	});

	it("clamps width and height to >= 100mm", () => {
		const el = createSidebar({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});
		const handler = vi.fn();
		el.addEventListener("furniture-update", handler);
		const inputs = dimsInputs(el);

		inputs[0].value = "5"; // 5cm = 50mm — below the 100mm floor
		inputs[0].dispatchEvent(new Event("change"));
		expect(handler.mock.calls[0][0].detail.updates.width).toBe(100);

		inputs[1].value = "0";
		inputs[1].dispatchEvent(new Event("change"));
		expect(handler.mock.calls[1][0].detail.updates.height).toBe(100);
	});
});

const SEL_TEXT = {
	id: "t1",
	type: "text" as const,
	icon: "mdi:format-text",
	label: "text_label.label",
	x: 0,
	y: 0,
	width: 800,
	height: 300,
	rotation: 0,
	lockAspect: false,
	text: "Kids' corner",
	fontFamily: "arial",
	fontSize: 200,
	align: "center" as const,
	bold: false,
	italic: false,
};

async function mountSidebar(overrides: Record<string, unknown> = {}) {
	const el = document.createElement("epp-furniture-sidebar") as any;
	Object.assign(el, overrides);
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-furniture-sidebar text label editor", () => {
	it("dispatches furniture-add-text from the add-text button", async () => {
		const el = await mountSidebar();
		const spy = vi.fn();
		el.addEventListener("furniture-add-text", spy);
		const btn = el.shadowRoot.querySelector(".furn-add-text") as HTMLElement;
		expect(btn).toBeTruthy();
		btn.click();
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it("renders the text editor for a selected text item", async () => {
		const el = await mountSidebar({
			furniture: [SEL_TEXT],
			selectedFurnitureId: "t1",
		});
		expect(el.shadowRoot.querySelector(".furn-text-editor")).toBeTruthy();
		// Not the icon/svg selected-item box (its W/H/rotation editor):
		expect(el.shadowRoot.querySelector(".furn-selected-info")).toBeNull();
	});

	it("caps the text input at the backend's 512-char limit", async () => {
		const el = await mountSidebar({
			furniture: [SEL_TEXT],
			selectedFurnitureId: "t1",
		});
		const ta = el.shadowRoot.querySelector(
			".furn-text-input",
		) as HTMLTextAreaElement;
		expect(ta.getAttribute("maxlength")).toBe("512");
	});

	it("emits furniture-update when the text is edited", async () => {
		const el = await mountSidebar({
			furniture: [SEL_TEXT],
			selectedFurnitureId: "t1",
		});
		const spy = vi.fn();
		el.addEventListener("furniture-update", spy);
		const ta = el.shadowRoot.querySelector(
			".furn-text-input",
		) as HTMLTextAreaElement;
		ta.value = "New label";
		ta.dispatchEvent(new Event("input", { bubbles: true }));
		expect(spy).toHaveBeenCalled();
		const detail = spy.mock.calls.at(-1)![0].detail;
		expect(detail.id).toBe("t1");
		expect(detail.updates.text).toBe("New label");
	});

	it("emits bold + align updates from the style controls", async () => {
		const el = await mountSidebar({
			furniture: [SEL_TEXT],
			selectedFurnitureId: "t1",
		});
		const spy = vi.fn();
		el.addEventListener("furniture-update", spy);
		(el.shadowRoot.querySelector(".furn-bold") as HTMLElement).click();
		(
			el.shadowRoot.querySelector(
				'.furn-align[data-align="right"]',
			) as HTMLElement
		).click();
		const calls = spy.mock.calls.map((c) => c[0].detail.updates);
		expect(calls).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ bold: true }),
				expect.objectContaining({ align: "right" }),
			]),
		);
	});

	it("emits fontSize in mm when the size (cm) field changes", async () => {
		const el = await mountSidebar({
			furniture: [SEL_TEXT],
			selectedFurnitureId: "t1",
		});
		const spy = vi.fn();
		el.addEventListener("furniture-update", spy);
		const size = el.shadowRoot.querySelector(".furn-size") as HTMLInputElement;
		size.value = "30";
		size.dispatchEvent(new Event("change", { bubbles: true }));
		const detail = spy.mock.calls.at(-1)![0].detail;
		expect(detail.updates.fontSize).toBe(300); // 30cm -> 300mm
	});

	it("ignores a non-finite size (cm) value", async () => {
		const el = await mountSidebar({
			furniture: [SEL_TEXT],
			selectedFurnitureId: "t1",
		});
		const spy = vi.fn();
		el.addEventListener("furniture-update", spy);
		const size = el.shadowRoot.querySelector(".furn-size") as HTMLInputElement;
		size.value = "";
		size.dispatchEvent(new Event("change", { bubbles: true }));
		expect(spy).not.toHaveBeenCalled();
	});

	it("emits italic + font updates from the remaining style controls", async () => {
		const el = await mountSidebar({
			furniture: [SEL_TEXT],
			selectedFurnitureId: "t1",
		});
		const spy = vi.fn();
		el.addEventListener("furniture-update", spy);
		(el.shadowRoot.querySelector(".furn-italic") as HTMLElement).click();
		(
			el.shadowRoot.querySelector(
				'.furn-align[data-align="left"]',
			) as HTMLElement
		).click();
		const select = el.shadowRoot.querySelector(
			".furn-font",
		) as HTMLSelectElement;
		select.value = "georgia";
		select.dispatchEvent(new Event("change", { bubbles: true }));
		const calls = spy.mock.calls.map((c) => c[0].detail.updates);
		expect(calls).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ italic: true }),
				expect.objectContaining({ align: "left" }),
				expect.objectContaining({ fontFamily: "georgia" }),
			]),
		);
	});

	it("emits text colour and background updates from the colour pickers, stopping propagation", async () => {
		const el = await mountSidebar({
			furniture: [SEL_TEXT],
			selectedFurnitureId: "t1",
		});
		const spy = vi.fn();
		el.addEventListener("furniture-update", spy);
		const outerSpy = vi.fn();
		document.body.addEventListener("value-changed", outerSpy);

		const textColor = el.shadowRoot.querySelector(
			".furn-text-color",
		) as HTMLElement;
		textColor.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "#ff0000" },
				bubbles: true,
				composed: true,
			}),
		);
		const bgColor = el.shadowRoot.querySelector(
			".furn-bg-color",
		) as HTMLElement;
		bgColor.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "#00ff00" },
				bubbles: true,
				composed: true,
			}),
		);

		const calls = spy.mock.calls.map((c) => c[0].detail.updates);
		expect(calls).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ color: "#ff0000" }),
				expect.objectContaining({ background: "#00ff00" }),
			]),
		);
		// stopPropagation() on the re-dispatched color-picker event means it
		// never reaches a listener outside the sidebar's shadow tree.
		expect(outerSpy).not.toHaveBeenCalled();
		document.body.removeEventListener("value-changed", outerSpy);
	});

	it("clears the background via the 'No background' button", async () => {
		const el = await mountSidebar({
			furniture: [{ ...SEL_TEXT, background: "#00ff00" }],
			selectedFurnitureId: "t1",
		});
		const spy = vi.fn();
		el.addEventListener("furniture-update", spy);
		(el.shadowRoot.querySelector(".furn-bg-none") as HTMLElement).click();
		const detail = spy.mock.calls.at(-1)![0].detail;
		expect(detail.updates.background).toBeUndefined();
	});

	it("removes a selected text item via the editor's remove button", async () => {
		const el = await mountSidebar({
			furniture: [SEL_TEXT],
			selectedFurnitureId: "t1",
		});
		const spy = vi.fn();
		el.addEventListener("furniture-remove", spy);
		(
			el.shadowRoot.querySelector(
				".furn-text-editor .sidebar-remove-btn",
			) as HTMLElement
		).click();
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy.mock.calls[0][0].detail).toBe("t1");
	});

	it("falls back to defaults when optional text fields are unset", async () => {
		const bare = {
			id: "t2",
			type: "text" as const,
			icon: "mdi:format-text",
			label: "text_label.label",
			x: 0,
			y: 0,
			width: 800,
			height: 300,
			rotation: 0,
			lockAspect: false,
		};
		const el = await mountSidebar({
			furniture: [bare],
			selectedFurnitureId: "t2",
		});
		const ta = el.shadowRoot.querySelector(
			".furn-text-input",
		) as HTMLTextAreaElement;
		expect(ta.value).toBe("");
		const size = el.shadowRoot.querySelector(".furn-size") as any;
		expect(size.value).toBe("20"); // 200mm default -> 20cm
		const centerAlign = el.shadowRoot.querySelector(
			'.furn-align[data-align="center"]',
		) as HTMLElement;
		expect(centerAlign.getAttribute("aria-pressed")).toBe("true");
	});

	it("renders bold/italic controls as pressed when the item is bold+italic", async () => {
		const el = await mountSidebar({
			furniture: [{ ...SEL_TEXT, bold: true, italic: true }],
			selectedFurnitureId: "t1",
		});
		const bold = el.shadowRoot.querySelector(".furn-bold") as HTMLElement;
		const italic = el.shadowRoot.querySelector(".furn-italic") as HTMLElement;
		expect(bold.getAttribute("aria-pressed")).toBe("true");
		expect(italic.getAttribute("aria-pressed")).toBe("true");
	});
});
