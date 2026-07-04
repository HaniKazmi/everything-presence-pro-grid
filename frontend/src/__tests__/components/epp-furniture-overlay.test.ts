import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../../components/epp-furniture-overlay.js";
import type { EppFurnitureOverlay } from "../../components/epp-furniture-overlay.js";
import type { FurnitureItem } from "../../lib/furniture.js";
import { roomStartCol } from "../../lib/grid.js";

function renderTo(tpl: any): HTMLDivElement {
	const container = document.createElement("div");
	document.body.appendChild(container);
	render(tpl, container);
	return container;
}

function createOverlay(
	overrides: Record<string, any> = {},
): EppFurnitureOverlay {
	const el = document.createElement("epp-furniture-overlay") as any;
	el.furniture = [];
	el.selectedFurnitureId = null;
	el.roomWidth = 3000;
	el.cellPx = 28;
	el.minCol = 0;
	el.minRow = 0;
	el.visCols = 20;
	el.visRows = 20;
	el.sidebarTab = "furniture";
	el.localize = (k: string) => k;
	Object.assign(el, overrides);
	return el as EppFurnitureOverlay;
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

// 2000mm at cellPx=28 → ~193px per side, well above the 30px desktop
// threshold, so all eight handles render.
const LARGE_FURNITURE: FurnitureItem = {
	...SAMPLE_FURNITURE,
	width: 2000,
	height: 2000,
};

const ICON_FURNITURE: FurnitureItem = {
	id: "f2",
	type: "icon",
	icon: "mdi:desk",
	label: "Desk",
	x: 100,
	y: 200,
	width: 1400,
	height: 700,
	rotation: 45,
	lockAspect: false,
};

describe("epp-furniture-overlay element", () => {
	it("is registered as a custom element", () => {
		const Ctor = customElements.get("epp-furniture-overlay");
		expect(Ctor).toBeDefined();
	});

	it("can be created via document.createElement", () => {
		const el = document.createElement("epp-furniture-overlay");
		expect(el).toBeInstanceOf(HTMLElement);
	});

	it("renders nothing when furniture is empty", () => {
		const el = createOverlay();
		const result = (el as any).render();
		// Lit's nothing sentinel
		expect(result).toBeDefined();
	});

	it("renders furniture items with svg type", () => {
		const el = createOverlay({ furniture: [SAMPLE_FURNITURE] });
		const result = (el as any).render();
		expect(result).toBeDefined();
	});

	it("renders furniture items with icon type", () => {
		const el = createOverlay({ furniture: [ICON_FURNITURE] });
		const result = (el as any).render();
		expect(result).toBeDefined();
	});

	it("renders non-interactive when sidebarTab is not furniture", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			sidebarTab: "zones",
		});
		const result = (el as any).render();
		expect(result).toBeDefined();
	});

	it("renders selected furniture with handles", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});
		const result = (el as any).render();
		expect(result).toBeDefined();
	});
});

describe("epp-furniture-overlay DOM rendering", () => {
	it("renders all 8 resize handles for a large unlocked item", () => {
		const el = createOverlay({
			furniture: [LARGE_FURNITURE],
			selectedFurnitureId: "f1",
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const handles = c.querySelectorAll(".furn-handle");
		expect(handles.length).toBe(8);

		document.body.removeChild(c);
	});

	it("renders all 8 resize handles for a mid-size item (~97px)", () => {
		// 1000mm at cellPx=28 → ~97px per side: above the 30px desktop threshold
		// on both axes, so all eight handles render.
		const el = createOverlay({
			furniture: [{ ...LARGE_FURNITURE, width: 1000, height: 1000 }],
			selectedFurnitureId: "f1",
		});
		const c = renderTo((el as any).render());

		expect(c.querySelectorAll(".furn-handle").length).toBe(8);

		document.body.removeChild(c);
	});

	it("renders all 8 resize handles for an ~77px item", () => {
		// 800mm at cellPx=28 → ~77px per side: above the 30px desktop threshold.
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});
		const c = renderTo((el as any).render());

		expect(c.querySelectorAll(".furn-handle").length).toBe(8);

		document.body.removeChild(c);
	});

	it("renders only the 4 corner handles for a tiny item (below 30px both axes)", () => {
		const el = createOverlay({
			furniture: [{ ...SAMPLE_FURNITURE, width: 250, height: 250 }], // ~24px
			selectedFurnitureId: "f1",
		});
		const c = renderTo((el as any).render());

		expect(c.querySelectorAll(".furn-handle").length).toBe(4);
		for (const corner of ["ne", "nw", "se", "sw"]) {
			expect(c.querySelector(`.furn-handle-${corner}`)).not.toBeNull();
		}
		for (const edge of ["n", "s", "e", "w"]) {
			expect(c.querySelector(`.furn-handle-${edge}`)).toBeNull();
		}

		document.body.removeChild(c);
	});

	it("shows top & bottom handles (not left/right) for a wide, short item", () => {
		// 1400mm → ~135px wide (>=30); 250mm → ~24px tall (<30).
		const el = createOverlay({
			furniture: [{ ...SAMPLE_FURNITURE, width: 1400, height: 250 }],
			selectedFurnitureId: "f1",
		});
		const c = renderTo((el as any).render());

		expect(c.querySelector(".furn-handle-n")).not.toBeNull();
		expect(c.querySelector(".furn-handle-s")).not.toBeNull();
		expect(c.querySelector(".furn-handle-e")).toBeNull();
		expect(c.querySelector(".furn-handle-w")).toBeNull();
		expect(c.querySelectorAll(".furn-handle").length).toBe(6);

		document.body.removeChild(c);
	});

	it("shows left & right handles (not top/bottom) for a tall, narrow item", () => {
		// 250mm → ~24px wide (<30); 1400mm → ~135px tall (>=30).
		const el = createOverlay({
			furniture: [{ ...SAMPLE_FURNITURE, width: 250, height: 1400 }],
			selectedFurnitureId: "f1",
		});
		const c = renderTo((el as any).render());

		expect(c.querySelector(".furn-handle-e")).not.toBeNull();
		expect(c.querySelector(".furn-handle-w")).not.toBeNull();
		expect(c.querySelector(".furn-handle-n")).toBeNull();
		expect(c.querySelector(".furn-handle-s")).toBeNull();
		expect(c.querySelectorAll(".furn-handle").length).toBe(6);

		document.body.removeChild(c);
	});

	it("renders only the 4 corner handles for a hard-locked item", () => {
		const el = createOverlay({
			furniture: [{ ...LARGE_FURNITURE, lockAspect: true }],
			selectedFurnitureId: "f1",
		});
		const c = renderTo((el as any).render());

		expect(c.querySelectorAll(".furn-handle").length).toBe(4);
		for (const edge of ["n", "s", "e", "w"]) {
			expect(c.querySelector(`.furn-handle-${edge}`)).toBeNull();
		}

		document.body.removeChild(c);
	});

	it("renders rotate stem and handle when selected", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const stem = c.querySelector(".furn-rotate-stem");
		const handle = c.querySelector(".furn-rotate-handle");
		expect(stem).not.toBeNull();
		expect(handle).not.toBeNull();

		document.body.removeChild(c);
	});

	it("renders delete button when selected", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const deleteBtn = c.querySelector(".furn-delete-btn");
		expect(deleteBtn).not.toBeNull();

		document.body.removeChild(c);
	});

	it("does not render handles when not selected", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: null,
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const handles = c.querySelectorAll(".furn-handle");
		expect(handles.length).toBe(0);

		document.body.removeChild(c);
	});

	it("applies non-interactive class when sidebarTab is not furniture", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			sidebarTab: "zones",
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const overlay = c.querySelector(".furniture-overlay");
		expect(overlay?.classList.contains("non-interactive")).toBe(true);

		document.body.removeChild(c);
	});

	it("does not apply non-interactive class when sidebarTab is furniture", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			sidebarTab: "furniture",
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const overlay = c.querySelector(".furniture-overlay");
		expect(overlay?.classList.contains("non-interactive")).toBe(false);

		document.body.removeChild(c);
	});

	it("does not render resize/rotate/delete handles for a selected item when not editing", () => {
		// Selection handles are editing affordances. A still-selected item carried
		// to a non-furniture tab must not render (or expose clickable) handles.
		const el = createOverlay({
			furniture: [LARGE_FURNITURE],
			selectedFurnitureId: "f1",
			sidebarTab: "zones",
		});
		const c = renderTo((el as any).render());

		expect(c.querySelectorAll(".furn-handle").length).toBe(0);
		expect(c.querySelector(".furn-rotate-handle")).toBeNull();
		expect(c.querySelector(".furn-delete-btn")).toBeNull();

		document.body.removeChild(c);
	});

	it("hides edge handles below the 44px touch threshold when narrow", () => {
		// 400mm → ~39px per side: above desktop 30 but below touch 44.
		const el = createOverlay({
			furniture: [{ ...SAMPLE_FURNITURE, width: 400, height: 400 }],
			selectedFurnitureId: "f1",
		});
		(el as any)._isNarrow = true;
		const c = renderTo((el as any).render());

		expect(c.querySelectorAll(".furn-handle").length).toBe(4); // corners only

		document.body.removeChild(c);
	});

	it("does not mark a selected item as .selected when not editing", () => {
		// Without editing, the blue selection outline/glow must not show either —
		// the item renders as a plain, unselected icon.
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
			sidebarTab: "zones",
		});
		const c = renderTo((el as any).render());

		expect(c.querySelector(".furniture-item.selected")).toBeNull();

		document.body.removeChild(c);
	});

	it("shows edge handles at that same ~39px size on desktop (30px)", () => {
		const el = createOverlay({
			furniture: [{ ...SAMPLE_FURNITURE, width: 400, height: 400 }],
			selectedFurnitureId: "f1",
		});
		// _isNarrow defaults to false (desktop)
		const c = renderTo((el as any).render());

		expect(c.querySelectorAll(".furn-handle").length).toBe(8);

		document.body.removeChild(c);
	});

	it("tracks the narrow breakpoint across connect / change / disconnect", () => {
		const el = createOverlay();
		document.body.appendChild(el); // connectedCallback: seeds from matchMedia
		// happy-dom's matchMedia reports matches:false (wide) by default.
		expect((el as any)._isNarrow).toBe(false);
		// Exercise the change handler directly (happy-dom won't emit the event).
		(el as any)._onNarrowMql({ matches: true } as MediaQueryList);
		expect((el as any)._isNarrow).toBe(true);
		document.body.removeChild(el); // disconnectedCallback: removes the listener
	});

	it("positions furniture items correctly based on room coordinates", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			cellPx: 28,
			minCol: 0,
			minRow: 0,
			roomWidth: 3000,
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const item = c.querySelector(".furniture-item") as HTMLElement;
		expect(item).not.toBeNull();
		if (item) {
			expect(item.style.transform).toContain("rotate(0deg)");
		}

		document.body.removeChild(c);
	});
});

describe("epp-furniture-overlay gap-aware scaling (clean-map plain mode)", () => {
	// The grid maps a real-world cell to `cellPx + gap` pixels: gap is 1px in
	// gridline mode but 0 in the clean-map card (grid gap: 0). The overlay must
	// use the SAME pitch as the grid it sits over, else furniture is scaled by
	// (cellPx+1)/cellPx — an error of 1/cellPx that grows on small cards and
	// makes furniture "scale differently" as the card resizes.
	it("sizes furniture by cellPx alone when gapPx is 0", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			cellPx: 28,
			gapPx: 0,
		});
		const c = renderTo((el as any).render());
		const item = c.querySelector(".furniture-item") as HTMLElement;
		// 800mm / 300 * 28 = 74.6667 (NOT * 29 = 77.33)
		expect(parseFloat(item.style.width)).toBeCloseTo((800 / 300) * 28, 1);
		expect(parseFloat(item.style.height)).toBeCloseTo((800 / 300) * 28, 1);
		document.body.removeChild(c);
	});

	it("positions furniture on the cellPx pitch (step + mm offset) when gapPx is 0", () => {
		// left = (startCol - minCol) * step + mmToPx(item.x); with gapPx=0 BOTH
		// the step term and the in-room mm term must use pitch cellPx (28), not 29.
		const startCol = roomStartCol(3000);
		const el = createOverlay({
			furniture: [{ ...SAMPLE_FURNITURE, x: 600, y: 0 }],
			cellPx: 28,
			gapPx: 0,
			minCol: 0,
			minRow: 0,
			roomWidth: 3000,
		});
		const c = renderTo((el as any).render());
		const item = c.querySelector(".furniture-item") as HTMLElement;
		// step = 28; mmToPx(600, 28, 0) = (600/300) * 28 = 56
		expect(parseFloat(item.style.left)).toBeCloseTo(startCol * 28 + 56, 1);
		document.body.removeChild(c);
	});

	it("defaults to a 1px gap (cellPx+1 pitch) when gapPx is unset", () => {
		const el = createOverlay({ furniture: [SAMPLE_FURNITURE], cellPx: 28 });
		const c = renderTo((el as any).render());
		const item = c.querySelector(".furniture-item") as HTMLElement;
		// 800mm / 300 * 29 = 77.33
		expect(parseFloat(item.style.width)).toBeCloseTo((800 / 300) * 29, 1);
		document.body.removeChild(c);
	});
});

describe("epp-furniture-overlay events", () => {
	it("fires furniture-select on item pointerdown", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: null,
		});

		const selectHandler = vi.fn();
		el.addEventListener("furniture-select", selectHandler);

		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const item = c.querySelector(".furniture-item") as HTMLElement;
		if (item) {
			item.dispatchEvent(
				new PointerEvent("pointerdown", {
					clientX: 500,
					clientY: 300,
					bubbles: true,
				}),
			);
			expect(selectHandler).toHaveBeenCalledTimes(1);
			expect(selectHandler.mock.calls[0][0].detail).toBe("f1");
		}

		document.body.removeChild(c);
	});

	it("fires furniture-pointer-down with move type on item pointerdown", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
		});

		const ptrHandler = vi.fn();
		el.addEventListener("furniture-pointer-down", ptrHandler);

		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const item = c.querySelector(".furniture-item") as HTMLElement;
		if (item) {
			item.dispatchEvent(
				new PointerEvent("pointerdown", {
					clientX: 500,
					clientY: 300,
					bubbles: true,
				}),
			);
			expect(ptrHandler).toHaveBeenCalledTimes(1);
			const detail = ptrHandler.mock.calls[0][0].detail;
			expect(detail.id).toBe("f1");
			expect(detail.type).toBe("move");
		}

		document.body.removeChild(c);
	});

	it("fires furniture-pointer-down with resize type on handle pointerdown", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});

		const ptrHandler = vi.fn();
		el.addEventListener("furniture-pointer-down", ptrHandler);

		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const handle = c.querySelector(".furn-handle-se") as HTMLElement;
		if (handle) {
			handle.dispatchEvent(
				new PointerEvent("pointerdown", {
					clientX: 500,
					clientY: 300,
					bubbles: true,
				}),
			);
			expect(ptrHandler).toHaveBeenCalled();
			const detail = ptrHandler.mock.calls[0][0].detail;
			expect(detail.id).toBe("f1");
			expect(detail.type).toBe("resize");
			expect(detail.handle).toBe("se");
		}

		document.body.removeChild(c);
	});

	it("forwards item rotation in furniture-pointer-down resize detail", () => {
		const rotated: FurnitureItem = { ...ICON_FURNITURE, id: "rot1" };
		const el = createOverlay({
			furniture: [rotated],
			selectedFurnitureId: "rot1",
		});
		const ptrHandler = vi.fn();
		el.addEventListener("furniture-pointer-down", ptrHandler);

		const c = renderTo((el as any).render());
		const handle = c.querySelector(".furn-handle-se") as HTMLElement;
		handle.dispatchEvent(
			new PointerEvent("pointerdown", {
				clientX: 100,
				clientY: 100,
				bubbles: true,
			}),
		);
		const detail = ptrHandler.mock.calls[0][0].detail;
		expect(detail.type).toBe("resize");
		expect(detail.rotation).toBe(45);
		document.body.removeChild(c);
	});

	it("forwards item rotation in furniture-pointer-down move detail", () => {
		const rotated: FurnitureItem = { ...ICON_FURNITURE, id: "rot2" };
		const el = createOverlay({
			furniture: [rotated],
			selectedFurnitureId: "rot2",
		});
		const ptrHandler = vi.fn();
		el.addEventListener("furniture-pointer-down", ptrHandler);

		const c = renderTo((el as any).render());
		const item = c.querySelector(
			'.furniture-item[data-id="rot2"]',
		) as HTMLElement;
		item.dispatchEvent(
			new PointerEvent("pointerdown", {
				clientX: 100,
				clientY: 100,
				bubbles: true,
			}),
		);
		// move detail is fired second (after furniture-select fires nothing on
		// furniture-pointer-down listener); pick the move event by type.
		const moveCall = ptrHandler.mock.calls.find(
			(c) => c[0].detail?.type === "move",
		);
		expect(moveCall).toBeTruthy();
		expect(moveCall![0].detail.rotation).toBe(45);
		document.body.removeChild(c);
	});

	it("fires furniture-pointer-down with rotate type on rotate handle", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});

		const ptrHandler = vi.fn();
		el.addEventListener("furniture-pointer-down", ptrHandler);

		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const rotateHandle = c.querySelector(".furn-rotate-handle") as HTMLElement;
		if (rotateHandle) {
			rotateHandle.dispatchEvent(
				new PointerEvent("pointerdown", {
					clientX: 500,
					clientY: 300,
					bubbles: true,
				}),
			);
			expect(ptrHandler).toHaveBeenCalled();
			const detail = ptrHandler.mock.calls[0][0].detail;
			expect(detail.id).toBe("f1");
			expect(detail.type).toBe("rotate");
		}

		document.body.removeChild(c);
	});

	it("fires furniture-delete on delete button pointerdown", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});

		const deleteHandler = vi.fn();
		el.addEventListener("furniture-delete", deleteHandler);

		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const deleteBtn = c.querySelector(".furn-delete-btn") as HTMLElement;
		if (deleteBtn) {
			deleteBtn.dispatchEvent(
				new PointerEvent("pointerdown", {
					bubbles: true,
				}),
			);
			expect(deleteHandler).toHaveBeenCalledTimes(1);
			expect(deleteHandler.mock.calls[0][0].detail).toBe("f1");
		}

		document.body.removeChild(c);
	});
});

describe("epp-furniture-overlay shadow DOM resize handles", () => {
	let el: EppFurnitureOverlay;

	afterEach(() => {
		if (el?.parentNode) el.parentNode.removeChild(el);
	});

	const DIRECTIONS = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;

	for (const dir of DIRECTIONS) {
		it(`fires furniture-pointer-down with resize handle "${dir}" via shadow DOM`, async () => {
			el = createOverlay({
				furniture: [LARGE_FURNITURE],
				selectedFurnitureId: "f1",
			});
			document.body.appendChild(el);
			await el.updateComplete;

			const handler = vi.fn();
			el.addEventListener("furniture-pointer-down", handler);

			const handle = el.shadowRoot!.querySelector(
				`.furn-handle-${dir}`,
			) as HTMLElement;
			expect(handle).not.toBeNull();

			handle.dispatchEvent(
				new PointerEvent("pointerdown", {
					bubbles: true,
					composed: true,
					clientX: 100,
					clientY: 100,
				}),
			);

			// The event bubbles from handle -> parent item, so the handler
			// fires twice: once for resize (handle) and once for move (item).
			// The resize event fires first because the handle is deeper in the DOM.
			expect(handler).toHaveBeenCalled();
			const resizeCall = handler.mock.calls.find(
				(c: any) => c[0].detail.type === "resize",
			);
			expect(resizeCall).toBeDefined();
			const detail = resizeCall![0].detail;
			expect(detail.id).toBe("f1");
			expect(detail.type).toBe("resize");
			expect(detail.handle).toBe(dir);
		});
	}
});

describe("epp-furniture-overlay default localize", () => {
	let el: EppFurnitureOverlay;

	afterEach(() => {
		if (el?.parentNode) el.parentNode.removeChild(el);
	});

	it("uses default localize identity function when none is provided", () => {
		el = document.createElement("epp-furniture-overlay") as EppFurnitureOverlay;
		el.furniture = [];
		el.selectedFurnitureId = null;
		el.roomWidth = 3000;
		el.cellPx = 28;
		el.minCol = 0;
		el.minRow = 0;
		el.visCols = 20;
		el.visRows = 20;
		el.sidebarTab = "furniture";
		// Do NOT set localize — use the default
		expect(el.localize("test_key")).toBe("test_key");
		expect(el.localize("another.key")).toBe("another.key");
	});
});

describe("touch support CSS", () => {
	it("disables touch-action on draggable furniture surfaces", () => {
		// Without touch-action: none the browser claims the touch gesture for
		// scrolling mid-drag, firing pointercancel and wedging the drag.
		const cssText = (
			(customElements.get("epp-furniture-overlay") as any).styles as {
				cssText: string;
			}
		).cssText;
		expect(cssText).toMatch(/\.furniture-item\s*{[^}]*touch-action:\s*none/);
		expect(cssText).toMatch(/\.furn-handle\s*{[^}]*touch-action:\s*none/);
		expect(cssText).toMatch(
			/\.furn-rotate-handle\s*{[^}]*touch-action:\s*none/,
		);
	});
});

describe("furniture bounding box visibility", () => {
	it("hides the bounding box border when not editing (non-interactive)", () => {
		// The light grey box around a furniture icon is an editing affordance.
		// When the overlay is non-interactive (any non-furniture sidebar tab) the
		// border colour is made transparent so the icon shows without its box,
		// while the 1px border still reserves layout so nothing shifts on tab
		// switch.
		const cssText = (
			(customElements.get("epp-furniture-overlay") as any).styles as {
				cssText: string;
			}
		).cssText;
		expect(cssText).toMatch(
			/\.furniture-overlay\.non-interactive\s+\.furniture-item\s*{[^}]*border-color:\s*transparent/,
		);
	});
});

describe("FLOOR_PLAN_SVGS own-property lookup", () => {
	it("falls back to ha-icon for an svg item whose icon name hits the prototype chain", async () => {
		// "constructor" is truthy via Object.prototype on a plain-object SVG
		// catalog — a truthiness check would try to render it as a floor-plan
		// SVG with viewBox undefined.
		const el = createOverlay({
			furniture: [{ ...SAMPLE_FURNITURE, type: "svg", icon: "constructor" }],
		});
		document.body.appendChild(el);
		await (el as any).updateComplete;

		expect(el.shadowRoot!.querySelector(".furn-svg")).toBeNull();
		expect(el.shadowRoot!.querySelector("ha-icon")).not.toBeNull();

		document.body.removeChild(el);
	});
});

describe("epp-furniture-overlay auto-contrast", () => {
	it("applies a colour var + has-halo to items present in the map", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			furnitureTones: new Map([
				[
					"f1",
					{
						color: "var(--epp-furniture-on-dark, #eef2f7)",
						halo: "var(--epp-furniture-halo-on-dark, rgba(0, 0, 0, 0.85))",
					},
				],
			]),
		});
		const c = renderTo((el as any).render());
		const outer = c.querySelector(".furniture-item") as HTMLElement;
		const style = outer.getAttribute("style") ?? "";
		expect(style).toContain("--epp-furniture-color:");
		expect(style).toContain("--epp-furniture-halo-color:");
		expect(outer.classList.contains("has-halo")).toBe(true);
		document.body.removeChild(c);
	});

	it("leaves items absent from the map grey with no halo", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			furnitureTones: new Map(),
		});
		const c = renderTo((el as any).render());
		const outer = c.querySelector(".furniture-item") as HTMLElement;
		const style = outer.getAttribute("style") ?? "";
		expect(style).not.toContain("--epp-furniture-color");
		expect(outer.classList.contains("has-halo")).toBe(false);
		document.body.removeChild(c);
	});
});

const TEXT_ITEM = {
	id: "t1",
	type: "text" as const,
	icon: "mdi:format-text",
	label: "text_label.label",
	x: 100,
	y: 100,
	width: 800,
	height: 300,
	rotation: 0,
	lockAspect: false,
	text: "Kids' corner",
	fontFamily: "georgia",
	fontSize: 200,
	align: "left" as const,
	bold: true,
	italic: true,
	color: "#112233",
	background: "#ffffff",
};

async function mountOverlay(overrides: Record<string, unknown> = {}) {
	const el = document.createElement("epp-furniture-overlay") as any;
	el.cellPx = 28;
	el.sidebarTab = "furniture";
	Object.assign(el, overrides);
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-furniture-overlay text items", () => {
	it("renders a text item with its text and styles", async () => {
		const el = await mountOverlay({ furniture: [TEXT_ITEM] });
		const node = el.shadowRoot.querySelector(".furniture-item--text");
		expect(node).toBeTruthy();
		const content = node.querySelector(
			".furniture-text-content",
		) as HTMLElement;
		expect(content.textContent).toContain("Kids' corner");
		expect(content.getAttribute("style")).toContain("Georgia");
		expect(content.getAttribute("style")).toContain("font-weight: 700");
		expect(content.getAttribute("style")).toContain("font-style: italic");
		expect(content.getAttribute("style")).toContain("#112233");
		expect(content.getAttribute("style")).toContain("left");
	});

	it("renders the text, never the item's icon, for a text item (regression: no mdi:format-text glyph)", async () => {
		const el = await mountOverlay({ furniture: [TEXT_ITEM] });
		const node = el.shadowRoot.querySelector(".furniture-item--text");
		expect(node).toBeTruthy();
		// Unselected: the icon branch (<ha-icon icon="...">) must not render at
		// all — the label content is the text span, not the item's icon glyph.
		expect(node.querySelector("ha-icon")).toBeNull();
		expect(
			el.shadowRoot.querySelector('ha-icon[icon="mdi:format-text"]'),
		).toBeNull();
		expect(
			node.querySelector(".furniture-text-content")?.textContent,
		).toContain("Kids' corner");
	});

	it("shows rotate + delete but NO resize handles for a selected text item", async () => {
		const el = await mountOverlay({
			furniture: [TEXT_ITEM],
			selectedFurnitureId: "t1",
		});
		const node = el.shadowRoot.querySelector(".furniture-item--text");
		expect(node.querySelector(".furn-rotate-handle")).toBeTruthy();
		expect(node.querySelector(".furn-delete-btn")).toBeTruthy();
		expect(node.querySelector(".furn-handle")).toBeNull();
	});

	it("still shows resize handles for a selected icon/svg item", async () => {
		const iconItem = { ...TEXT_ITEM, id: "i1", type: "icon" as const };
		const el = await mountOverlay({
			furniture: [iconItem],
			selectedFurnitureId: "i1",
		});
		const node = el.shadowRoot.querySelector(".furniture-item");
		expect(node.querySelector(".furn-handle")).toBeTruthy();
	});

	it("applies default styling when optional text fields are unset", async () => {
		const bareItem = {
			id: "t2",
			type: "text" as const,
			icon: "mdi:format-text",
			label: "text_label.label",
			x: 100,
			y: 100,
			width: 800,
			height: 300,
			rotation: 0,
			lockAspect: false,
			text: undefined,
			fontFamily: undefined,
			fontSize: undefined,
			align: undefined,
			bold: false,
			italic: false,
			color: undefined,
			background: undefined,
		};
		const el = await mountOverlay({ furniture: [bareItem] });
		const node = el.shadowRoot.querySelector(".furniture-item--text");
		const content = node.querySelector(
			".furniture-text-content",
		) as HTMLElement;
		expect(content.textContent).toBe("");
		const style = content.getAttribute("style");
		expect(style).toContain("font-weight: 400");
		expect(style).toContain("font-style: normal");
		expect(style).toContain("var(--epp-text");
		expect(style).toContain("text-align: center");
		expect(style).not.toContain("color-mix");
	});

	it("fires move/rotate/delete events for a selected text item", async () => {
		const el = await mountOverlay({
			furniture: [TEXT_ITEM],
			selectedFurnitureId: "t1",
		});
		const moveHandler = vi.fn();
		const rotateHandler = vi.fn();
		const deleteHandler = vi.fn();
		el.addEventListener("furniture-pointer-down", (e: any) => {
			if (e.detail.type === "move") moveHandler(e.detail);
			if (e.detail.type === "rotate") rotateHandler(e.detail);
		});
		el.addEventListener("furniture-delete", deleteHandler);

		const node = el.shadowRoot.querySelector(
			".furniture-item--text",
		) as HTMLElement;
		node.dispatchEvent(
			new PointerEvent("pointerdown", { bubbles: true, composed: true }),
		);
		expect(moveHandler).toHaveBeenCalledWith(
			expect.objectContaining({ id: "t1", type: "move" }),
		);

		const rotateHandle = node.querySelector(
			".furn-rotate-handle",
		) as HTMLElement;
		rotateHandle.dispatchEvent(
			new PointerEvent("pointerdown", { bubbles: true, composed: true }),
		);
		expect(rotateHandler).toHaveBeenCalledWith(
			expect.objectContaining({ id: "t1", type: "rotate" }),
		);

		const deleteBtn = node.querySelector(".furn-delete-btn") as HTMLElement;
		deleteBtn.dispatchEvent(
			new PointerEvent("pointerdown", { bubbles: true, composed: true }),
		);
		expect(deleteHandler).toHaveBeenCalledTimes(1);
		expect(deleteHandler.mock.calls[0][0].detail).toBe("t1");
	});
});

describe("epp-furniture-overlay text auto-contrast", () => {
	const AUTO_TEXT = {
		id: "t1",
		type: "text" as const,
		icon: "mdi:format-text",
		label: "text_label.label",
		x: 100,
		y: 100,
		width: 800,
		height: 300,
		rotation: 0,
		lockAspect: false,
		text: "Hi",
		fontFamily: "arial",
		fontSize: 200,
		align: "center" as const,
		bold: false,
		italic: false,
		// no color, no background → auto
	};

	it("uses an explicit colour (no auto halo) when color is set", async () => {
		const el = await mountOverlay({
			furniture: [{ ...AUTO_TEXT, color: "#112233" }],
			furnitureTones: new Map([
				["t1", { color: "rgb(238, 242, 247)", halo: "rgba(0, 0, 0, 0.85)" }],
			]),
		});
		const node = el.shadowRoot.querySelector(".furniture-item--text");
		const span = node.querySelector(".furniture-text-content");
		expect(span.getAttribute("style")).toContain("#112233");
		expect(node.classList.contains("has-halo")).toBe(false);
	});

	it("auto-contrasts against the cell tone (colour + halo) when color is unset", async () => {
		const el = await mountOverlay({
			furniture: [AUTO_TEXT],
			furnitureTones: new Map([
				["t1", { color: "rgb(238, 242, 247)", halo: "rgba(0, 0, 0, 0.85)" }],
			]),
		});
		const node = el.shadowRoot.querySelector(".furniture-item--text");
		const span = node.querySelector(".furniture-text-content");
		expect(span.getAttribute("style")).toContain("rgb(238, 242, 247)");
		expect(node.classList.contains("has-halo")).toBe(true);
		expect(node.getAttribute("style")).toContain("--epp-furniture-halo-color");
	});

	it("auto-contrasts against the background box (no halo) when a box is set", async () => {
		const el = await mountOverlay({
			furniture: [{ ...AUTO_TEXT, background: "#000000" }],
			furnitureTones: new Map(),
		});
		const node = el.shadowRoot.querySelector(".furniture-item--text");
		const span = node.querySelector(".furniture-text-content");
		// black box → light ink
		expect(span.getAttribute("style")).toContain("--epp-furniture-on-dark");
		expect(node.classList.contains("has-halo")).toBe(false);
	});

	it("ignores a non-hex colour/background (defence-in-depth) and falls back to auto", async () => {
		const el = await mountOverlay({
			furniture: [{ ...AUTO_TEXT, color: "red)", background: "url(evil)" }],
			furnitureTones: new Map([
				["t1", { color: "rgb(1, 2, 3)", halo: "rgba(0, 0, 0, 0.85)" }],
			]),
		});
		const node = el.shadowRoot.querySelector(".furniture-item--text");
		const style = node
			.querySelector(".furniture-text-content")
			.getAttribute("style");
		// The malformed values must never reach the CSS string.
		expect(style).not.toContain("red)");
		expect(style).not.toContain("url(evil)");
		// Falls back to the cell tone (both explicit colour and box are invalid).
		expect(style).toContain("rgb(1, 2, 3)");
	});

	it("falls back to themed ink (no halo) when color, tone and box are all absent", async () => {
		const el = await mountOverlay({
			furniture: [AUTO_TEXT],
			furnitureTones: new Map(),
		});
		const node = el.shadowRoot.querySelector(".furniture-item--text");
		const span = node.querySelector(".furniture-text-content");
		expect(span.getAttribute("style")).toContain("var(--epp-text");
		expect(node.classList.contains("has-halo")).toBe(false);
	});
});
