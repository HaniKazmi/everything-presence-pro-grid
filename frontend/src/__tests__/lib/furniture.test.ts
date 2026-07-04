import { describe, expect, it } from "vitest";
import {
	clampTextSizeMm,
	createTextItem,
	DEFAULT_TEXT_FONT,
	DEFAULT_TEXT_SIZE_MM,
	EDGE_HANDLE_MIN_DESKTOP_PX,
	EDGE_HANDLE_MIN_TOUCH_PX,
	estimateTextBox,
	fontStack,
	isFurnitureOutsideGrid,
	TEXT_FONTS,
	TEXT_SIZE_MAX_MM,
	TEXT_SIZE_MIN_MM,
	visibleHandles,
} from "../../lib/furniture.js";

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

	describe("rotation-aware visual bounding box", () => {
		// CSS rotation pivots about the item's center, so the rendered extent
		// of a rotated item differs from its unrotated x/y/width/height box.
		// The overlap test must use the visual bbox or a 90°-rotated elongated
		// item visibly overlapping the grid gets classified as fully outside
		// (and silently dropped on save).

		it("returns false for a 90°-rotated tall item whose visual box overlaps on x", () => {
			// Unrotated box x:[2000,2200] is right of maxX=1800, but at 90° the
			// 2000mm height swings horizontal: visual x:[1100,3100] overlaps.
			expect(
				isFurnitureOutsideGrid(
					{ x: 2000, y: 100, width: 200, height: 2000, rotation: 90 },
					0,
					1800,
					0,
					1800,
				),
			).toBe(false);
		});

		it("returns false for a 90°-rotated wide item whose visual box overlaps on y", () => {
			// Unrotated box y:[2000,2200] is below maxY=1800, but at 90° the
			// 2000mm width swings vertical: visual y:[1100,3100] overlaps.
			expect(
				isFurnitureOutsideGrid(
					{ x: 100, y: 2000, width: 2000, height: 200, rotation: 90 },
					0,
					1800,
					0,
					1800,
				),
			).toBe(false);
		});

		it("returns true when even the rotated visual box has no overlap", () => {
			// Visual x:[3100,5100] — still fully right of maxX=1800.
			expect(
				isFurnitureOutsideGrid(
					{ x: 4000, y: 100, width: 200, height: 2000, rotation: 90 },
					0,
					1800,
					0,
					1800,
				),
			).toBe(true);
		});

		it("treats rotation 0 / missing rotation identically", () => {
			expect(
				isFurnitureOutsideGrid(
					{ x: 2000, y: 100, width: 200, height: 2000, rotation: 0 },
					0,
					1800,
					0,
					1800,
				),
			).toBe(true);
		});
	});
});

describe("text label helpers", () => {
	it("fontStack returns the stack for a known key", () => {
		expect(fontStack("georgia")).toContain("Georgia");
	});

	it("fontStack falls back to the first font for an unknown key", () => {
		expect(fontStack("nope")).toBe(TEXT_FONTS[0].stack);
	});

	it("clampTextSizeMm clamps to the allowed range", () => {
		expect(clampTextSizeMm(5)).toBe(TEXT_SIZE_MIN_MM);
		expect(clampTextSizeMm(99999)).toBe(TEXT_SIZE_MAX_MM);
		expect(clampTextSizeMm(200)).toBe(200);
	});

	it("clampTextSizeMm returns the default for non-finite input", () => {
		expect(clampTextSizeMm(Number.NaN)).toBe(DEFAULT_TEXT_SIZE_MM);
	});

	it("estimateTextBox grows with line count and character count", () => {
		const one = estimateTextBox("Hi", 200, false);
		const wide = estimateTextBox("A much longer line", 200, false);
		const tall = estimateTextBox("a\nb\nc", 200, false);
		expect(wide.width).toBeGreaterThan(one.width);
		expect(tall.height).toBeGreaterThan(one.height);
		expect(one.width).toBeGreaterThanOrEqual(200);
		expect(one.height).toBeGreaterThanOrEqual(200);
	});

	it("estimateTextBox makes bold text wider", () => {
		expect(estimateTextBox("Hello", 200, true).width).toBeGreaterThan(
			estimateTextBox("Hello", 200, false).width,
		);
	});

	it("createTextItem centers a text item with defaults", () => {
		const item = createTextItem("Label", 4000, 3000, "t1");
		expect(item.type).toBe("text");
		expect(item.text).toBe("Label");
		expect(item.fontFamily).toBe(DEFAULT_TEXT_FONT);
		expect(item.fontSize).toBe(DEFAULT_TEXT_SIZE_MM);
		expect(item.align).toBe("center");
		expect(item.bold).toBe(false);
		expect(item.rotation).toBe(0);
		// centered: x/y are the room center minus half the estimated box
		expect(item.x).toBeGreaterThan(0);
		expect(item.y).toBeGreaterThan(0);
		expect(item.width).toBeGreaterThan(0);
		expect(item.height).toBeGreaterThan(0);
	});
});

describe("visibleHandles", () => {
	it("shows all eight handles when both sides meet the threshold", () => {
		expect(visibleHandles(false, 100, 100, 30)).toEqual([
			"n",
			"s",
			"e",
			"w",
			"ne",
			"nw",
			"se",
			"sw",
		]);
	});

	it("shows only corners for an aspect-locked item", () => {
		expect(visibleHandles(true, 100, 100, 30)).toEqual([
			"ne",
			"nw",
			"se",
			"sw",
		]);
	});

	it("shows top/bottom (not left/right) when only width meets the threshold", () => {
		expect(visibleHandles(false, 100, 10, 30)).toEqual([
			"n",
			"s",
			"ne",
			"nw",
			"se",
			"sw",
		]);
	});

	it("shows left/right (not top/bottom) when only height meets the threshold", () => {
		expect(visibleHandles(false, 10, 100, 30)).toEqual([
			"e",
			"w",
			"ne",
			"nw",
			"se",
			"sw",
		]);
	});

	it("shows only corners when neither side meets the threshold", () => {
		expect(visibleHandles(false, 10, 10, 30)).toEqual(["ne", "nw", "se", "sw"]);
	});

	it("treats the threshold as inclusive (>=)", () => {
		expect(visibleHandles(false, 30, 30, 30)).toHaveLength(8);
		expect(visibleHandles(false, 29, 29, 30)).toEqual(["ne", "nw", "se", "sw"]);
	});

	it("exposes desktop and touch thresholds", () => {
		expect(EDGE_HANDLE_MIN_DESKTOP_PX).toBe(30);
		expect(EDGE_HANDLE_MIN_TOUCH_PX).toBe(44);
	});
});
