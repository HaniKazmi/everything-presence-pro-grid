import { describe, expect, it } from "vitest";
import "../../components/epp-grid.js";
import type { EppGrid } from "../../components/epp-grid.js";
import {
	CELL_OVERLAY_INTERFERENCE,
	CELL_ROOM_BIT,
	cellSetOverlay,
	initGridFromRoom,
} from "../../lib/grid.js";

function gridWithOverlay(): Uint8Array {
	const grid = initGridFromRoom(3000, 3000);
	// pick an inside cell and stamp an interference overlay on it
	const idx = grid.findIndex((b) => (b & CELL_ROOM_BIT) !== 0);
	grid[idx] = cellSetOverlay(grid[idx], CELL_OVERLAY_INTERFERENCE);
	return grid;
}

async function mount(showOverlays: boolean): Promise<EppGrid> {
	const el = document.createElement("epp-grid") as EppGrid;
	el.roomWidth = 3000;
	el.roomDepth = 3000;
	el.perspective = [1, 0, 0, 0, 1, 0, 0, 0, 1];
	el.grid = gridWithOverlay();
	el.showOverlays = showOverlays;
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-grid showOverlays", () => {
	it("renders overlay stripes by default (true)", async () => {
		const el = await mount(true);
		const styled = [...el.shadowRoot!.querySelectorAll(".cell")].some((c) =>
			(c as HTMLElement).getAttribute("style")?.includes("background-image"),
		);
		expect(styled).toBe(true);
	});

	it("omits overlay stripes when showOverlays is false", async () => {
		const el = await mount(false);
		const styled = [...el.shadowRoot!.querySelectorAll(".cell")].some((c) =>
			(c as HTMLElement).getAttribute("style")?.includes("background-image"),
		);
		expect(styled).toBe(false);
	});
});
