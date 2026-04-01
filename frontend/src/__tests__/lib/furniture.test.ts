import { describe, expect, it } from "vitest";
import { isFurnitureOutsideGrid } from "../../lib/furniture.js";

describe("isFurnitureOutsideGrid", () => {
	it("returns false when item is fully inside bounds", () => {
		expect(
			isFurnitureOutsideGrid(
				{ x: 100, y: 100, width: 200, height: 200 },
				0,
				1800,
				0,
				1800,
			),
		).toBe(false);
	});

	it("returns false when item partially overlaps bounds", () => {
		// Item right edge at 300, bounds start at 0 — overlaps
		expect(
			isFurnitureOutsideGrid(
				{ x: -100, y: 100, width: 200, height: 200 },
				0,
				1800,
				0,
				1800,
			),
		).toBe(false);
	});

	it("returns true when item is completely to the right of bounds", () => {
		expect(
			isFurnitureOutsideGrid(
				{ x: 2000, y: 100, width: 200, height: 200 },
				0,
				1800,
				0,
				1800,
			),
		).toBe(true);
	});

	it("returns true when item is completely below bounds", () => {
		expect(
			isFurnitureOutsideGrid(
				{ x: 100, y: 2000, width: 200, height: 200 },
				0,
				1800,
				0,
				1800,
			),
		).toBe(true);
	});

	it("returns true when item is completely to the left of bounds", () => {
		expect(
			isFurnitureOutsideGrid(
				{ x: -500, y: 100, width: 200, height: 200 },
				0,
				1800,
				0,
				1800,
			),
		).toBe(true);
	});

	it("returns true when item is completely above bounds", () => {
		expect(
			isFurnitureOutsideGrid(
				{ x: 100, y: -500, width: 200, height: 200 },
				0,
				1800,
				0,
				1800,
			),
		).toBe(true);
	});
});
