import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import "../../components/epp-overlay-sidebar.js";
import type { EppOverlaySidebar } from "../../components/epp-overlay-sidebar.js";

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

	it("suppress item has active class when overlayMode is suppress", () => {
		const el = createSidebar({ overlayMode: "suppress" });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const items = c.querySelectorAll(".overlay-item");
		expect(items[2].classList.contains("active")).toBe(true);

		document.body.removeChild(c);
	});
});

describe("epp-overlay-sidebar default localize", () => {
	it("default localize returns the key unchanged", () => {
		const el = document.createElement("epp-overlay-sidebar") as any;
		expect(el.localize("some.key")).toBe("some.key");
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

	it("clicking suppress item dispatches overlay-select with mode suppress", () => {
		const el = createSidebar();
		const handler = vi.fn();
		el.addEventListener("overlay-select", handler);

		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const items = c.querySelectorAll(".overlay-item");
		(items[2] as HTMLElement).click();

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail.mode).toBe("suppress");

		document.body.removeChild(c);
	});
});
