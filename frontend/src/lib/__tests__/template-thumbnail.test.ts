import { describe, expect, it } from "vitest";
import {
	CELL_ROOM_BIT,
	CELL_ZONE_SHIFT,
	GRID_CELL_COUNT,
	GRID_COLS,
} from "../../lib/grid.js";
import { renderTemplateThumbnail } from "../../lib/template-thumbnail.js";

function makeGrid(
	insideCells: { col: number; row: number; zone?: number }[],
): number[] {
	const grid = new Array(GRID_CELL_COUNT).fill(0);
	for (const { col, row, zone } of insideCells) {
		grid[row * GRID_COLS + col] =
			CELL_ROOM_BIT | ((zone ?? 0) << CELL_ZONE_SHIFT);
	}
	return grid;
}

describe("renderTemplateThumbnail", () => {
	it("renders svg with rect elements for inside cells", async () => {
		// 2x2 room at cols 9-10, rows 0-1 (centered in 20-col grid for 600mm width)
		const grid = makeGrid([
			{ col: 9, row: 0 },
			{ col: 10, row: 0 },
			{ col: 9, row: 1 },
			{ col: 10, row: 1 },
		]);
		const result = renderTemplateThumbnail(
			grid,
			new Array(7).fill(null),
			600,
			600,
			[],
		);

		// Result is a Lit SVGTemplateResult — render into a div to inspect DOM
		const container = document.createElement("div");

		// Use Lit's render to get DOM
		const { render } = await import("lit");
		render(result, container);

		const svg = container.querySelector("svg");
		expect(svg).not.toBeNull();
		// viewBox should crop to room bounds with 1-cell padding: cols 8-11, rows 0-2
		// That's getRoomBounds behavior: min-1, max+1 clamped
		expect(svg!.getAttribute("viewBox")).toBeTruthy();

		// Should have rect elements for inside cells
		const rects = svg!.querySelectorAll("rect");
		expect(rects.length).toBeGreaterThanOrEqual(4);
	});

	it("returns empty svg when grid has no inside cells", async () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		const result = renderTemplateThumbnail(
			grid,
			new Array(7).fill(null),
			3000,
			3000,
			[],
		);

		const container = document.createElement("div");
		const { render } = await import("lit");
		render(result, container);

		const svg = container.querySelector("svg");
		expect(svg).not.toBeNull();
		// No rects since no inside cells
		const rects = svg!.querySelectorAll("rect");
		expect(rects.length).toBe(0);
	});

	it("renders furniture items as outlined rects", async () => {
		// Room: 3000mm wide, centered at cols 5-14 (10 cols), rows 0-9 (10 rows)
		const grid = makeGrid(
			Array.from({ length: 100 }, (_, i) => ({
				col: 5 + (i % 10),
				row: Math.floor(i / 10),
			})),
		);
		const furniture = [
			{
				id: "f1",
				type: "icon" as const,
				icon: "mdi:bed",
				label: "Bed",
				x: 300, // 300mm from left edge of room
				y: 600, // 600mm from top edge of room
				width: 1200,
				height: 900,
				rotation: 0,
				lockAspect: false,
			},
		];
		const result = renderTemplateThumbnail(
			grid,
			new Array(7).fill(null),
			3000,
			3000,
			furniture,
		);

		const container = document.createElement("div");
		const { render } = await import("lit");
		render(result, container);

		// Should have a furniture rect with stroke and no fill
		const svgEl = container.querySelector("svg");
		const allRects = svgEl!.querySelectorAll("rect");
		const furnitureRects = Array.from(allRects).filter(
			(r) => r.getAttribute("fill") === "none",
		);
		expect(furnitureRects.length).toBe(1);
		expect(furnitureRects[0].getAttribute("stroke")).toBeTruthy();
	});

	it("renders furniture with rotation as transform", async () => {
		const grid = makeGrid(
			Array.from({ length: 100 }, (_, i) => ({
				col: 5 + (i % 10),
				row: Math.floor(i / 10),
			})),
		);
		const furniture = [
			{
				id: "f1",
				type: "icon" as const,
				icon: "mdi:bed",
				label: "Bed",
				x: 300,
				y: 600,
				width: 1200,
				height: 900,
				rotation: 45,
				lockAspect: false,
			},
		];
		const result = renderTemplateThumbnail(
			grid,
			new Array(7).fill(null),
			3000,
			3000,
			furniture,
		);

		const container = document.createElement("div");
		const { render } = await import("lit");
		render(result, container);

		const svgEl = container.querySelector("svg");
		const allRects = svgEl!.querySelectorAll("rect");
		const furnitureRects = Array.from(allRects).filter(
			(r) => r.getAttribute("fill") === "none",
		);
		expect(furnitureRects.length).toBe(1);
		// Should have transform with rotation
		expect(furnitureRects[0].getAttribute("transform")).toContain("rotate");
	});

	it("applies zone colors to cells", async () => {
		const grid = makeGrid([
			{ col: 10, row: 0, zone: 0 },
			{ col: 10, row: 1, zone: 1 },
		]);
		const zoneConfigs = [
			{ name: "Kitchen", color: "#E69F00", type: "normal" as const },
			null,
			null,
			null,
			null,
			null,
			null,
		];
		const result = renderTemplateThumbnail(grid, zoneConfigs, 300, 600, []);

		const container = document.createElement("div");
		const { render } = await import("lit");
		render(result, container);

		const rects = container.querySelectorAll("svg rect");
		const fills = Array.from(rects).map((r) => r.getAttribute("fill"));
		// Zone 1 cell should use the zone color
		expect(fills).toContain("#E69F00");
	});
});
