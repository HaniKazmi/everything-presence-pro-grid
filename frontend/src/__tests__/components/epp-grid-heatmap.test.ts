import { describe, expect, it } from "vitest";
import "../../components/epp-grid.js";
import type { EppGrid } from "../../components/epp-grid.js";
import { initGridFromRoom } from "../../lib/grid.js";

/** Full 6000x6000mm room -> every cell (20x20 @ 300mm) has the room bit set. */
function fullRoomGrid(): Uint8Array {
	return initGridFromRoom(6000, 6000);
}

async function grid(props: Partial<EppGrid>): Promise<EppGrid> {
	const el = document.createElement("epp-grid") as EppGrid;
	Object.assign(el, {
		roomWidth: 6000,
		roomDepth: 6000,
		grid: fullRoomGrid(),
		...props,
	});
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-grid heatmap overlay", () => {
	it("hides the heatmap overlay unless showHeatmap is set", async () => {
		const el = await grid({
			showHeatmap: false,
			heatmapCells: new Array(400).fill(10),
		});
		expect(el.shadowRoot!.querySelector(".heatmap-overlay")).toBeNull();
	});

	it("renders one heat cell per non-zero value when enabled", async () => {
		const cells = new Array(400).fill(0);
		cells[0] = 255;
		cells[21] = 128;
		const el = await grid({ showHeatmap: true, heatmapCells: cells });
		const overlay = el.shadowRoot!.querySelector(".heatmap-overlay");
		expect(overlay).not.toBeNull();
		expect(overlay!.querySelectorAll(".heat-cell").length).toBe(2);
	});
});
