import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import "../../components/epp-overlay-sidebar.js";
import type { EppOverlaySidebar } from "../../components/epp-overlay-sidebar.js";
import { CELL_INTERFERENCE_SUPPRESS } from "../../lib/grid.js";

function renderTo(tpl: any): HTMLDivElement {
	const container = document.createElement("div");
	document.body.appendChild(container);
	render(tpl, container);
	return container;
}

function createSidebar(overrides: Record<string, any> = {}): EppOverlaySidebar {
	const el = document.createElement("epp-overlay-sidebar") as any;
	el.localize = (k: string) => k;
	Object.assign(el, overrides);
	return el as EppOverlaySidebar;
}

describe("epp-overlay-sidebar element", () => {
	it("is registered as a custom element", () => {
		const Ctor = customElements.get("epp-overlay-sidebar");
		expect(Ctor).toBeDefined();
	});

	it("can be created via document.createElement", () => {
		const el = document.createElement("epp-overlay-sidebar");
		expect(el).toBeInstanceOf(HTMLElement);
	});

	it("renders with default state without crashing", () => {
		const el = createSidebar();
		const result = (el as any).render();
		expect(result).toBeDefined();
	});

	it("interferenceLevel defaults to 1", () => {
		const el = createSidebar();
		expect((el as any).interferenceLevel).toBe(1);
	});

	it("overlayMode defaults to null", () => {
		const el = createSidebar();
		expect((el as any).overlayMode).toBeNull();
	});

	it("renders entry/exit overlay item", () => {
		const el = createSidebar();
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const items = c.querySelectorAll(".overlay-item");
		expect(items.length).toBeGreaterThanOrEqual(1);

		document.body.removeChild(c);
	});

	it("renders interference overlay item", () => {
		const el = createSidebar();
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const items = c.querySelectorAll(".overlay-item");
		expect(items.length).toBeGreaterThanOrEqual(2);

		document.body.removeChild(c);
	});

	it("entry/exit item has active class when overlayMode is entry", () => {
		const el = createSidebar({ overlayMode: "entry" });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const items = c.querySelectorAll(".overlay-item");
		expect(items[0].classList.contains("active")).toBe(true);

		document.body.removeChild(c);
	});

	it("entry/exit item does not have active class when overlayMode is interference", () => {
		const el = createSidebar({ overlayMode: "interference" });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const items = c.querySelectorAll(".overlay-item");
		expect(items[0].classList.contains("active")).toBe(false);

		document.body.removeChild(c);
	});

	it("interference item has active class when overlayMode is interference", () => {
		const el = createSidebar({ overlayMode: "interference" });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const items = c.querySelectorAll(".overlay-item");
		expect(items[1].classList.contains("active")).toBe(true);

		document.body.removeChild(c);
	});

	it("level selector is hidden when overlayMode is not interference", () => {
		const el = createSidebar({ overlayMode: null });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const levelSelector = c.querySelector(".level-selector");
		expect(levelSelector).toBeNull();

		document.body.removeChild(c);
	});

	it("level selector is hidden when overlayMode is entry", () => {
		const el = createSidebar({ overlayMode: "entry" });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const levelSelector = c.querySelector(".level-selector");
		expect(levelSelector).toBeNull();

		document.body.removeChild(c);
	});

	it("level selector is visible when overlayMode is interference", () => {
		const el = createSidebar({ overlayMode: "interference" });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const levelSelector = c.querySelector(".level-selector");
		expect(levelSelector).not.toBeNull();

		document.body.removeChild(c);
	});

	it("level selector shows 4 buttons: 1, 2, 3, suppress", () => {
		const el = createSidebar({ overlayMode: "interference" });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const btns = c.querySelectorAll(".level-btn");
		expect(btns.length).toBe(4);
		expect(btns[0].textContent?.trim()).toBe("1");
		expect(btns[1].textContent?.trim()).toBe("2");
		expect(btns[2].textContent?.trim()).toBe("3");
		expect(btns[3].textContent?.trim()).toBe("✕");

		document.body.removeChild(c);
	});

	it("active level button has active class", () => {
		const el = createSidebar({ overlayMode: "interference", interferenceLevel: 2 });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const btns = c.querySelectorAll(".level-btn");
		expect(btns[0].classList.contains("active")).toBe(false);
		expect(btns[1].classList.contains("active")).toBe(true);
		expect(btns[2].classList.contains("active")).toBe(false);
		expect(btns[3].classList.contains("active")).toBe(false);

		document.body.removeChild(c);
	});

	it("suppress button (level 7) has active class when interferenceLevel is CELL_INTERFERENCE_SUPPRESS", () => {
		const el = createSidebar({ overlayMode: "interference", interferenceLevel: CELL_INTERFERENCE_SUPPRESS });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const btns = c.querySelectorAll(".level-btn");
		expect(btns[3].classList.contains("active")).toBe(true);

		document.body.removeChild(c);
	});
});

describe("epp-overlay-sidebar events", () => {
	it("clicking entry/exit dispatches overlay-select with mode entry", () => {
		const el = createSidebar();
		const handler = vi.fn();
		el.addEventListener("overlay-select", handler);

		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const items = c.querySelectorAll(".overlay-item");
		(items[0] as HTMLElement).click();

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail.mode).toBe("entry");

		document.body.removeChild(c);
	});

	it("clicking entry/exit when already active dispatches overlay-select with mode null", () => {
		const el = createSidebar({ overlayMode: "entry" });
		const handler = vi.fn();
		el.addEventListener("overlay-select", handler);

		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const items = c.querySelectorAll(".overlay-item");
		(items[0] as HTMLElement).click();

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail.mode).toBeNull();

		document.body.removeChild(c);
	});

	it("clicking interference dispatches overlay-select with mode interference", () => {
		const el = createSidebar();
		const handler = vi.fn();
		el.addEventListener("overlay-select", handler);

		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const items = c.querySelectorAll(".overlay-item");
		(items[1] as HTMLElement).click();

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail.mode).toBe("interference");

		document.body.removeChild(c);
	});

	it("clicking interference when already active dispatches overlay-select with mode null", () => {
		const el = createSidebar({ overlayMode: "interference" });
		const handler = vi.fn();
		el.addEventListener("overlay-select", handler);

		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const items = c.querySelectorAll(".overlay-item");
		(items[1] as HTMLElement).click();

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail.mode).toBeNull();

		document.body.removeChild(c);
	});

	it("clicking a level button dispatches interference-level-change with the level value", () => {
		const el = createSidebar({ overlayMode: "interference" });
		const handler = vi.fn();
		el.addEventListener("interference-level-change", handler);

		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const btns = c.querySelectorAll(".level-btn");
		(btns[1] as HTMLElement).click(); // level 2

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail.level).toBe(2);

		document.body.removeChild(c);
	});

	it("clicking the suppress button dispatches interference-level-change with CELL_INTERFERENCE_SUPPRESS", () => {
		const el = createSidebar({ overlayMode: "interference" });
		const handler = vi.fn();
		el.addEventListener("interference-level-change", handler);

		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const btns = c.querySelectorAll(".level-btn");
		(btns[3] as HTMLElement).click(); // suppress = 7

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail.level).toBe(CELL_INTERFERENCE_SUPPRESS);

		document.body.removeChild(c);
	});

	it("level button click does not dispatch overlay-select (stops propagation)", () => {
		const el = createSidebar({ overlayMode: "interference" });
		const overlayHandler = vi.fn();
		el.addEventListener("overlay-select", overlayHandler);

		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const btns = c.querySelectorAll(".level-btn");
		(btns[0] as HTMLElement).click(); // level 1

		// overlay-select should NOT be fired — level click stops propagation
		expect(overlayHandler).not.toHaveBeenCalled();

		document.body.removeChild(c);
	});
});
