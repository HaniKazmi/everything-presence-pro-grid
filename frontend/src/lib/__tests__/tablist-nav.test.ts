import { describe, expect, it } from "vitest";
import { tablistKeydownIndex } from "../tablist-nav.js";

const key = (k: string) => new KeyboardEvent("keydown", { key: k });

describe("tablistKeydownIndex", () => {
	it("ArrowRight advances, wrapping past the end", () => {
		expect(tablistKeydownIndex(key("ArrowRight"), 0, 3)).toBe(1);
		expect(tablistKeydownIndex(key("ArrowRight"), 2, 3)).toBe(0);
	});

	it("ArrowLeft retreats, wrapping past the start", () => {
		expect(tablistKeydownIndex(key("ArrowLeft"), 1, 3)).toBe(0);
		expect(tablistKeydownIndex(key("ArrowLeft"), 0, 3)).toBe(2);
	});

	it("Home/End jump to first/last", () => {
		expect(tablistKeydownIndex(key("Home"), 2, 3)).toBe(0);
		expect(tablistKeydownIndex(key("End"), 0, 3)).toBe(2);
	});

	it("returns null for keys that aren't navigation (so Enter/Space/Tab pass through)", () => {
		expect(tablistKeydownIndex(key("Enter"), 0, 3)).toBeNull();
		expect(tablistKeydownIndex(key(" "), 0, 3)).toBeNull();
		expect(tablistKeydownIndex(key("Tab"), 0, 3)).toBeNull();
		expect(tablistKeydownIndex(key("a"), 0, 3)).toBeNull();
	});

	it("returns null for an empty tablist (no division by zero)", () => {
		expect(tablistKeydownIndex(key("ArrowRight"), 0, 0)).toBeNull();
	});
});
