import { describe, expect, it } from "vitest";
import { isSettingsValueDefault } from "../settings-defaults.js";

describe("isSettingsValueDefault", () => {
	it("returns false when defaultValue is a non-empty object (unsupported case)", () => {
		expect(isSettingsValueDefault({}, { a: 1 })).toBe(false);
		expect(isSettingsValueDefault({ a: 1 }, { a: 1 })).toBe(false);
	});

	it("returns true for empty value against empty-object default", () => {
		expect(isSettingsValueDefault({}, {})).toBe(true);
	});

	it("returns false for non-empty value against empty-object default", () => {
		expect(isSettingsValueDefault({ a: 1 }, {})).toBe(false);
	});

	it("returns true for matching scalar values", () => {
		expect(isSettingsValueDefault(0, 0)).toBe(true);
		expect(isSettingsValueDefault("a", "a")).toBe(true);
		expect(isSettingsValueDefault(true, true)).toBe(true);
	});

	it("returns false for differing scalar values", () => {
		expect(isSettingsValueDefault(1, 0)).toBe(false);
		expect(isSettingsValueDefault("a", "b")).toBe(false);
	});
});
