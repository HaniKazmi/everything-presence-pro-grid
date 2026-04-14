import { describe, expect, it } from "vitest";
import { FLOOR_PLAN_SVGS, FURNITURE_CATALOG } from "../constants.js";
import en from "../translations/en.json";
import es from "../translations/es.json";

describe("FURNITURE_CATALOG ceiling fan", () => {
	it("has a ceiling-fan sticker with matching SVG and translations", () => {
		const sticker = FURNITURE_CATALOG.find((s) => s.icon === "ceiling-fan");
		expect(sticker).toBeDefined();
		expect(sticker?.type).toBe("svg");
		expect(sticker?.label).toBe("furniture.ceiling_fan");
		expect(sticker?.defaultWidth).toBeGreaterThan(0);
		expect(sticker?.defaultHeight).toBeGreaterThan(0);

		expect(FLOOR_PLAN_SVGS["ceiling-fan"]).toBeDefined();
		expect(FLOOR_PLAN_SVGS["ceiling-fan"].viewBox).toBeTruthy();
		expect(FLOOR_PLAN_SVGS["ceiling-fan"].content).toBeTruthy();

		expect(
			(en as { furniture: Record<string, string> }).furniture.ceiling_fan,
		).toBeTruthy();
		expect(
			(es as { furniture: Record<string, string> }).furniture.ceiling_fan,
		).toBeTruthy();
	});
});
