// `@vitest/browser/context` is deprecated (it warns on every browser run, and
// stops working in vitest's next major). The modern entry point is `vitest/browser`,
// which exports the identical `page` API — but it is exposed ONLY through the
// package's `exports` map, and this project's `moduleResolution: "node"` (node10)
// cannot read `exports` maps, so `tsc` rejects it with TS2307. Making the switch
// therefore means moving tsconfig to `moduleResolution: "bundler"`, which changes
// how EVERY import in the project resolves its types — too large a blast radius to
// smuggle into a bug-fix branch. Deliberately deferred to its own PR; until then the
// deprecation warning is cosmetic and this import works.
import { page } from "@vitest/browser/context";
import { describe, expect, it, vi } from "vitest";
import type { EppGrid } from "../../components/epp-grid.js";
import type { EPPGridPanel } from "../../eppgrid-panel.js";
import "../../eppgrid-panel.js";
import { initGridFromRoom } from "../../lib/grid.js";
import { createZoneEngineState } from "../../lib/zone-engine.js";
import { registerPanelCleanup } from "../helpers/panel-cleanup.js";

// Real-layout regression tests for #338 (and for #339, the first attempt to fix
// it, which shipped a worse bug through a full review cycle).
//
// #338: <epp-grid> sized the map from the WINDOW — `window.innerHeight` minus
// its own getBoundingClientRect().top minus a hand-tuned reserve constant. That
// constant could not know what the panel rendered BELOW the map, so when the
// detection log expanded the map kept claiming every pixel down to the window
// bottom and pushed the log clean past the fold — with nothing able to scroll to
// it (`.panel--grid` is deliberately overflow:hidden, and adding a scroll
// container is not an option: see "introduces no scroll container" below).
//
// The fix inverts the measurement: the panel makes the map's card (.grid-container)
// `flex: 1; min-height: 0` of a height-bounded column, and the grid measures the
// BOX IT WAS GIVEN (its own clientHeight, less the caption rendered inside it).
// Anything a caller renders below the grid simply takes its space first.
//
// The headline invariant, and what every test here defends: A SMALLER BOX MAY
// ONLY EVER PRODUCE A SMALLER-OR-EQUAL MAP. #339 broke exactly that — a 200px
// minimum-height floor meant that once the budget fell under it the budget
// became 0, which fitCellPx reads as "unmeasured" and answers with width-fit:
// the map TRIPLED as the box shrank.
//
// These tests must run in a real browser: happy-dom has no layout engine at all
// (clientHeight is always 0, getBoundingClientRect() returns zeros), so every
// geometry assertion below would pass vacuously there — on the bug as readily as
// on the fix. `npm run test:browser` runs them in headless Chromium.

const mounted: HTMLElement[] = [];
registerPanelCleanup(mounted);

/**
 * The viewports that matter, once, by name.
 *
 * `band` sits inside the ~490-610px band where the deleted DESKTOP_MIN_HEIGHT_PX
 * floor used to flip the map from height-fit to width-fit — #339 shipped through a
 * full review cycle because every reviewer sampled above the band and below it, and
 * nobody landed in it. `short` is below it (where the second inversion lived), and
 * `mobile` is the other side of the 819px breakpoint: the viewport-cap path.
 */
const VIEWPORT: Record<
	"desktop" | "band" | "short" | "mobile",
	[number, number]
> = {
	desktop: [1600, 1000],
	band: [1440, 560],
	short: [1500, 460],
	mobile: [420, 900],
};

/** Mount the real panel on the live-overview view, in a real full-height page. */
async function mountLivePanel(): Promise<EPPGridPanel> {
	// HA gives the panel host a definite height; :host is `height: 100%`, so the
	// chain needs html/body to be full-height too or the whole model is unbounded.
	document.documentElement.style.height = "100%";
	document.body.style.height = "100%";
	document.body.style.margin = "0";

	const testDevice = {
		mac: "AA:BB:CC:DD:EE:01",
		name: "Test",
		host: null,
		available: true,
		configured: true,
		firmware_status: "compatible",
	};

	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	el.hass = {
		callWS: vi.fn().mockResolvedValue({}),
		connection: {
			// A real mount runs the real connectedCallback -> _initialize(),
			// which awaits this subscription and then unconditionally copies
			// the controller's device list back onto the panel — so unlike the
			// happy-dom `createPanel()` helper (which never connects the
			// element and so never runs that path), a bare stub here would
			// race our `_devices`/`_selectedMac` seed below back to empty.
			// Answering the device-list subscription for real avoids the race
			// instead of fighting it.
			subscribeMessage: vi.fn(
				(callback: (msg: unknown) => void, request: { type: string }) => {
					if (request.type === "eppgrid/subscribe_device_list") {
						callback({ devices: [testDevice] });
					}
					return Promise.resolve(() => {});
				},
			),
		},
	} as never;
	const a = el as unknown as Record<string, unknown>;
	a._grid = initGridFromRoom(3000, 4000);
	a._zoneConfigs = [
		{ type: "default", trigger: 5, renew: 3, timeout: 10, handoff_timeout: 3 },
		null,
		null,
		null,
		null,
		null,
		null,
		null,
	];
	a._activeZone = 0;
	a._dirty = false;
	a._loading = false;
	a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
	a._roomWidth = 3000;
	a._roomDepth = 4000;
	a._furniture = [];
	a._selectedFurnitureId = null;
	a._view = "live";
	a._sidebarTab = "zones";
	a._devices = [testDevice];
	a._selectedMac = "AA:BB:CC:DD:EE:01";
	a._targets = [];
	a._sensorState = {
		occupancy: false,
		static_presence: false,
		motion_presence: false,
		target_presence: false,
	};
	a._zoneState = { occupancy: {}, target_counts: {}, frame_count: 0 };
	a._zoneEngineState = createZoneEngineState();
	a._openAccordions = new Set();
	a._entitiesConfig = {};
	a._heatmapCells = [];
	a._targetTrails = [];
	a._showBackendDebugLog = false;

	document.body.appendChild(el);
	mounted.push(el);
	await settle(el);
	return el;
}

/** Size the viewport, then mount the live-overview panel into it. */
async function mountAt(w: number, h: number): Promise<EPPGridPanel> {
	await page.viewport(w, h);
	return mountLivePanel();
}

const gridEl = (p: EPPGridPanel): EppGrid =>
	p.shadowRoot!.querySelector("epp-grid")!;

/** The map itself (the bordered cell grid inside epp-grid's shadow root). */
const mapRect = (p: EPPGridPanel): DOMRect =>
	gridEl(p).shadowRoot!.querySelector(".grid")!.getBoundingClientRect();

const logEl = (p: EPPGridPanel): HTMLElement | null =>
	p.shadowRoot!.querySelector(".debug-log-container");

/**
 * Wait for the panel, the grid, and the grid's post-layout settle pass (a
 * rAF-scheduled re-measure that can schedule one more Lit update).
 */
async function settle(p: EPPGridPanel): Promise<void> {
	await p.updateComplete;
	const g = p.shadowRoot?.querySelector("epp-grid");
	if (g) await g.updateComplete;
	await new Promise((r) =>
		requestAnimationFrame(() => requestAnimationFrame(() => r(null))),
	);
	await p.updateComplete;
	if (g) await g.updateComplete;
}

describe("live overview map fits its box", () => {
	it("renders a map inside the viewport at the desktop size", async () => {
		const panel = await mountAt(...VIEWPORT.desktop);
		const map = mapRect(panel);
		expect(map.height).toBeGreaterThan(0);
		expect(map.bottom).toBeLessThanOrEqual(window.innerHeight);
	});
});

/** Expand the detection-events log below the map, then let the layout settle. */
async function expandLog(p: EPPGridPanel): Promise<void> {
	(p as unknown as Record<string, unknown>)._showBackendDebugLog = true;
	await settle(p);
}

/**
 * Change the viewport and let the resize propagate all the way through: the
 * window 'resize' hook / ResizeObserver re-measures the grid's box, which
 * schedules a Lit update whose own updated() re-measures again. One settle()
 * pass can land mid-convergence, so do two.
 */
async function resizeTo(p: EPPGridPanel, w: number, h: number): Promise<void> {
	await page.viewport(w, h);
	await settle(p);
	await settle(p);
}

/** The desktop viewports the log/map invariants are checked at. */
const LOG_VIEWPORTS: Array<[number, number]> = [
	VIEWPORT.desktop,
	VIEWPORT.band,
	VIEWPORT.short,
];

describe("a smaller box only ever produces a smaller map (monotonicity)", () => {
	// SAMPLING IS NOT A PROOF. LOG_VIEWPORTS above brackets the cliff without landing
	// in it — which is the identical mistake that let #339 through, made twice.
	// The second inversion lived at a viewport height of ~400px (in real HA, where
	// the app header eats ~64px above the panel, ~465-485px — a browser window
	// snapped to the top half of a 1080p screen): the card's remainder fell to 19px,
	// the caption rendered inside the grid is 27px, the budget went negative, latched
	// to 0, and fitCellPx read that 0 as "never measured" and fell back to width-fit.
	// The map went 33px -> 738px, overflowed its 53px card, painted over the heatmap
	// toggle and the log, and hung 125px below the fold.
	//
	// So don't sample the invariant — SWEEP it. Walk the viewport height all the way
	// down and assert the map never grows and never escapes its card at ANY step. A
	// cliff cannot hide between two of these; it has to survive all of them.
	const HEIGHTS = [600, 560, 520, 480, 460, 440, 420, 400, 380, 340, 300];

	it("never grows the map, and never overflows the card, as the viewport shrinks", async () => {
		const panel = await mountAt(1500, HEIGHTS[0]);
		await expandLog(panel);

		const seen: Array<{ h: number; map: number; slack: number }> = [];
		for (const h of HEIGHTS) {
			await resizeTo(panel, 1500, h);
			const map = mapRect(panel);
			const card = panel
				.shadowRoot!.querySelector(".grid-container")!
				.getBoundingClientRect();
			seen.push({
				h,
				map: map.height,
				// >0 means the map is spilling out of the box that is supposed to bound it.
				slack: map.bottom - card.bottom,
			});
		}

		const trace = seen
			.map(
				(s) => `${s.h}px: map=${s.map.toFixed(1)} spill=${s.slack.toFixed(1)}`,
			)
			.join("\n  ");

		for (let i = 1; i < seen.length; i++) {
			expect(
				seen[i].map,
				`map GREW when the viewport shrank (${seen[i - 1].h}px -> ${seen[i].h}px)\n  ${trace}`,
			).toBeLessThanOrEqual(seen[i - 1].map);
		}
		for (const s of seen) {
			expect(
				s.slack,
				`map overflowed its card at ${s.h}px\n  ${trace}`,
			).toBeLessThanOrEqual(1);
		}
		// Sanity: the sweep must actually be exercising the shrink, not measuring a
		// map that was already at its floor the whole way down.
		expect(seen[0].map).toBeGreaterThan(seen[seen.length - 1].map);
	});
});

describe.each(
	LOG_VIEWPORTS,
)("detection log stays reachable at %ix%i", (w, h) => {
	it("keeps the expanded log inside the viewport", async () => {
		const panel = await mountAt(w, h);
		await expandLog(panel);

		const log = logEl(panel);
		expect(log).not.toBeNull();
		// #338: the log rendered past the bottom of the window and NOTHING could
		// scroll to it (.panel--grid is deliberately overflow:hidden).
		expect(log!.getBoundingClientRect().bottom).toBeLessThanOrEqual(
			window.innerHeight + 1,
		);
	});

	it("shrinks the map when the log expands", async () => {
		const panel = await mountAt(w, h);
		const collapsed = mapRect(panel).height;
		await expandLog(panel);
		const expanded = mapRect(panel).height;

		// STRICTLY smaller, and that strictness is the point. Two bugs die here:
		// #339, where reserving more space for the log pushed the budget under a
		// floor, dropped it to 0 and fell back to width-fit — the map got 3x BIGGER
		// and shoved the log 687px below the fold; and #338, where the map measured
		// the WINDOW and so ignored the log entirely — it neither grew nor shrank,
		// which a `<=` guard happily accepts. The log's 99px+chrome must come out of
		// the map: measured 708->588 / 273->153 / 168->48 across these viewports.
		expect(expanded).toBeLessThan(collapsed);
	});

	it("keeps the map inside its card", async () => {
		const panel = await mountAt(w, h);
		await expandLog(panel);
		const card = panel
			.shadowRoot!.querySelector(".grid-container")!
			.getBoundingClientRect();
		const map = mapRect(panel);
		expect(map.bottom).toBeLessThanOrEqual(card.bottom + 1);
		expect(map.height).toBeGreaterThan(0);
	});

	it("introduces no scroll container between the map and the panel", async () => {
		const panel = await mountAt(w, h);
		await expandLog(panel);
		// A correct container model needs NO new scroll container. One here would
		// re-create both hazards: measuring a viewport-relative top inside a
		// scroller is a re-render feedback loop, and overflow-y:auto silently
		// forces overflow-x:auto, which clips the target menu.
		const col = getComputedStyle(
			panel.shadowRoot!.querySelector(".grid-column")!,
		);
		expect(col.overflowY).toBe("visible");
		expect(col.overflowX).toBe("visible");
	});
});

describe("no oscillation while targets move", () => {
	it("holds the map at one height across a burst of target frames", async () => {
		const panel = await mountAt(...VIEWPORT.band);
		await expandLog(panel);

		const grid = gridEl(panel);
		let updates = 0;
		const orig = grid.updated.bind(grid);
		(grid as unknown as { updated: (c: unknown) => void }).updated = (c) => {
			updates++;
			orig(c as never);
		};

		const heights = new Set<number>();
		for (let i = 0; i < 12; i++) {
			(panel as unknown as Record<string, unknown>)._targets = [
				{ x: 300 + i * 50, y: 1200 + i * 30, status: "active", signal: 90 },
			];
			await settle(panel);
			heights.add(Math.round(mapRect(panel).height));
		}

		// The #339 scroll loop fired 3000 Lit updates in 1.2s, sweeping the cell size
		// 9px -> 47px. More than one distinct map height means we're oscillating.
		expect(heights.size).toBe(1);
		expect(updates).toBeLessThan(40);
	});
});

describe("the map grows back when its box does (no monotone ratchet)", () => {
	// The container model only holds if <epp-grid> has a DEFINITE height handed
	// down from the column. If it does not, `this.clientHeight` is the host's own
	// CONTENT height — i.e. the map's current size — and the height budget becomes
	// a pure function of the map that produced it: `heightFit === cellPx_current`.
	// The map can then shrink but NEVER grow back. These two tests are what decide
	// whether the CSS is really bounding the box or just appearing to.

	it("returns to its original height after a viewport HEIGHT round-trip", async () => {
		const panel = await mountAt(...VIEWPORT.desktop);
		await expandLog(panel);
		const before = mapRect(panel).height;
		expect(before).toBeGreaterThan(0);

		await resizeTo(panel, 1600, 600);
		const squeezed = mapRect(panel).height;
		expect(squeezed).toBeLessThan(before);

		await resizeTo(panel, 1600, 1000);
		expect(mapRect(panel).height).toBeCloseTo(before, 0);
	});

	it("returns to its original height after a viewport WIDTH round-trip", async () => {
		// The everyday version of the ratchet: opening the editor sidebar narrows
		// the grid column, so the map shrinks — it has to come back when the column
		// widens again.
		const panel = await mountAt(...VIEWPORT.desktop);
		await expandLog(panel);
		const before = mapRect(panel).height;
		expect(before).toBeGreaterThan(0);

		await resizeTo(panel, 1100, 1000);
		await resizeTo(panel, 1600, 1000);
		expect(mapRect(panel).height).toBeCloseTo(before, 0);
	});
});

describe("the caption inside the box is measured for real", () => {
	it("_captionBlockPx = the caption's offsetHeight + its 8px margin-top", async () => {
		const panel = await mountAt(...VIEWPORT.desktop);
		const grid = gridEl(panel);
		const cap = grid.shadowRoot!.querySelector<HTMLElement>(".grid-dimensions");
		expect(cap).not.toBeNull();
		// happy-dom reports offsetHeight 0, so the unit test can only prove the
		// margin term. In a real browser the caption has real height — this is the
		// end-to-end contract: the caption renders INSIDE the grid's box, so its
		// full block size comes off the top of the height budget.
		expect(cap!.offsetHeight).toBeGreaterThan(0);
		const captionPx = (
			grid as unknown as { _captionBlockPx: () => number }
		)._captionBlockPx();
		expect(captionPx).toBe(cap!.offsetHeight + 8);
		expect(captionPx).toBeGreaterThan(0);
	});
});

/** Put one target at a known room position and return its rendered dot. */
async function showTargetAt(
	p: EPPGridPanel,
	x: number,
	y: number,
): Promise<HTMLElement> {
	(p as unknown as Record<string, unknown>)._targets = [
		{ x, y, status: "active", signal: 90 },
	];
	await settle(p);
	const dot = gridEl(p).shadowRoot!.querySelector<HTMLElement>(".target-dot");
	expect(dot).not.toBeNull();
	return dot as HTMLElement;
}

// The card/map size gap is what breaks a percentage-positioned menu, so sample
// where that gap is largest (the band) as well as at the everyday desktop size.
const MENU_VIEWPORTS: Array<[number, number]> = [
	VIEWPORT.desktop,
	VIEWPORT.band,
];

describe.each(
	MENU_VIEWPORTS,
)("target menu lands on its dot at %ix%i", (w, h) => {
	// The menu is positioned inside .grid-container (the CARD), but the
	// `target-click` event carried percentages OF THE MAP. The card was already
	// wider than the map before #338 (~192px of horizontal error); container
	// measurement made the card TALLER than the map too, with the map centred in
	// it, so the vertical error grew as well (~200px off at 1600x1000). The menu
	// has to anchor to the dot itself, in px.
	it.each([
		["right", 2900, 2000],
		["bottom", 1500, 3900],
	])("anchors to a dot near the map's %s edge", async (_edge, tx, ty) => {
		const panel = await mountAt(w, h);
		const dot = await showTargetAt(panel, tx, ty);
		const d = dot.getBoundingClientRect();

		dot.click();
		await settle(panel);

		const menu = panel.shadowRoot!.querySelector<HTMLElement>(".target-menu");
		expect(menu).not.toBeNull();
		const m = (menu as HTMLElement).getBoundingClientRect();

		// .target-menu is `transform: translate(-50%, 8px)` off its left/top, so a
		// correctly anchored menu is centred on the dot and hangs 8px below it.
		//
		// The tolerance is deliberately far below 1px. The menu's left/top resolve
		// against the card's PADDING box while getBoundingClientRect() reports its
		// BORDER box, so forgetting the card's 1px border (clientLeft/clientTop) is a
		// systematic 1px error in each axis — and a `< 3` tolerance hid exactly that.
		// Measured error here is 0; Chromium lays out in 1/64px (0.0156) LayoutUnits,
		// so 0.125 (8 of them) absorbs any sub-pixel rounding while still failing an
		// off-by-one-border regression by 8x.
		expect(
			Math.abs(m.left + m.width / 2 - (d.left + d.width / 2)),
		).toBeLessThan(0.125);
		expect(Math.abs(m.top - (d.top + d.height / 2 + 8))).toBeLessThan(0.125);

		// And it is actually on screen — a menu positioned off the card is a menu
		// the user cannot click.
		expect(m.left).toBeGreaterThanOrEqual(0);
		expect(m.top).toBeGreaterThanOrEqual(0);
		expect(m.right).toBeLessThanOrEqual(window.innerWidth);
		expect(m.bottom).toBeLessThanOrEqual(window.innerHeight);
	});

	it("keeps the card unclipped (no scroll container to cut the menu off)", async () => {
		const panel = await mountAt(w, h);
		// overflow-y:auto silently forces overflow-x:auto, which would clip a menu
		// that (correctly) hangs over the card's edge.
		const cs = getComputedStyle(
			panel.shadowRoot!.querySelector(".grid-container")!,
		);
		expect(cs.overflowX).toBe("visible");
		expect(cs.overflowY).toBe("visible");
	});
});

describe("the target menu does not outlive the layout it was anchored to", () => {
	it("closes when its CARD is resized with the window untouched (the HA sidebar)", async () => {
		// Docking/undocking the HA sidebar is an IN-PAGE layout change: the panel's
		// box narrows, the column and the card with it, and the map re-centres and
		// re-fits — but `window.resize` NEVER FIRES (HA's own Lovelace layout uses a
		// ResizeObserver for precisely this reason). A window-resize hook therefore
		// cannot cover it, however confidently its comment claims to: the map moves
		// out from under the menu and the menu stays pinned to a px snapshot of where
		// the dot used to be. So observe the BOX the menu was anchored to, not the
		// window.
		const panel = await mountAt(...VIEWPORT.desktop);
		const dot = await showTargetAt(panel, 1500, 2000);

		dot.click();
		await settle(panel);
		expect(panel.shadowRoot!.querySelector(".target-menu")).not.toBeNull();

		const card = panel.shadowRoot!.querySelector(".grid-container")!;
		const before = card.getBoundingClientRect().width;

		// Narrow the panel host itself — exactly what the sidebar docking does — and
		// touch nothing else. No page.viewport() call, so no window 'resize' event.
		panel.style.width = "1000px";
		await settle(panel);
		await settle(panel);

		// Guard the test: if the card didn't actually move, it proves nothing.
		expect(card.getBoundingClientRect().width).toBeLessThan(before);
		expect(panel.shadowRoot!.querySelector(".target-menu")).toBeNull();
		panel.style.width = "";
	});

	it("closes on window resize", async () => {
		// The px anchor is a SNAPSHOT of where the dot was when the menu opened. A
		// layout change with no click behind it — window resize, the HA sidebar
		// collapsing, device rotation — moves the map out from under the menu, which
		// then points at nothing: measured 216px/197px adrift and entirely OFF-SCREEN
		// across this exact resize. (Layout changes that DO come from a click — the
		// log and heatmap toggles — are already covered: the click-outside handler
		// closes the menu on the very click that toggles them.) A transient popover
		// should not chase the layout; it should go away.
		const panel = await mountAt(...VIEWPORT.desktop);
		const dot = await showTargetAt(panel, 1500, 2000);

		dot.click();
		await settle(panel);
		expect(panel.shadowRoot!.querySelector(".target-menu")).not.toBeNull();

		await resizeTo(panel, 1440, 560);
		expect(panel.shadowRoot!.querySelector(".target-menu")).toBeNull();
	});
});

// The wizard's card must hug it at a roomy desktop size AND on a short viewport,
// where a stretched card would shrink BELOW the wizard and let it spill.
const WIZARD_VIEWPORTS: Array<[number, number]> = [
	VIEWPORT.desktop,
	VIEWPORT.short,
];

describe.each(
	WIZARD_VIEWPORTS,
)("the uncalibrated card hugs its wizard at %ix%i", (w, h) => {
	it("does not stretch the card around <epp-wizard>, and does not overflow it", async () => {
		const panel = await mountAt(w, h);
		(panel as unknown as Record<string, unknown>)._perspective = null;
		await settle(panel);

		const wizard = panel.shadowRoot!.querySelector<HTMLElement>(
			".grid-container epp-wizard",
		);
		expect(wizard).not.toBeNull();
		const card = panel
			.shadowRoot!.querySelector(".grid-container")!
			.getBoundingClientRect();
		const wiz = (wizard as HTMLElement).getBoundingClientRect();
		expect(wiz.height).toBeGreaterThan(0);

		// The card's flex:1 exists to hand the MAP a bounded box. The wizard neither
		// wants nor uses it: stretched, it framed a 314px wizard in an 836px card at
		// 1600x1000 — and on a short viewport the card shrank BELOW the wizard, which
		// then spilled ~35px past the card's bottom border. Content-sized, the card
		// is the wizard plus its own 16px padding + 1px border.
		expect(card.height - wiz.height).toBeLessThan(40);
		expect(wiz.bottom).toBeLessThanOrEqual(card.bottom);
	});
});

describe("mobile keeps the viewport cap, not container measurement", () => {
	it("caps the map to ~45% of the viewport and keeps the log reachable", async () => {
		const panel = await mountAt(...VIEWPORT.mobile);
		await expandLog(panel);

		const grid = gridEl(panel);
		// Mobile is the capHeightToHalfViewport path: the column is content-sized
		// (flex: 0 0 auto), so measuring the container would be circular.
		expect(grid.capHeightToHalfViewport).toBe(true);
		const map = mapRect(panel);
		expect(map.height).toBeGreaterThan(0);
		expect(map.height).toBeLessThanOrEqual(window.innerHeight * 0.45 + 1);

		// The card must NOT collapse around the map: a flex-basis:0 card in mobile's
		// content-sized column is the hazard the @media reset (flex: 0 0 auto) exists
		// to rule out. Guard it by geometry, not by reading the rule back.
		const card = panel
			.shadowRoot!.querySelector(".grid-container")!
			.getBoundingClientRect();
		expect(card.height).toBeGreaterThanOrEqual(map.height);

		// And the log below it still exists, sits BELOW the map (not under it), and
		// is on-screen.
		const log = logEl(panel);
		expect(log).not.toBeNull();
		const logRect = log!.getBoundingClientRect();
		expect(logRect.height).toBeGreaterThan(0);
		expect(logRect.top).toBeGreaterThanOrEqual(map.bottom);
		expect(logRect.bottom).toBeLessThanOrEqual(window.innerHeight + 1);
	});
});
