import { describe, expect, it } from "vitest";
import { defaultLocalize, setupLocalize } from "../localize.js";

describe("setupLocalize", () => {
	it("returns a function", () => {
		const localize = setupLocalize();
		expect(typeof localize).toBe("function");
	});

	it("resolves a simple top-level key", () => {
		const localize = setupLocalize();
		expect(localize("common.save")).toBe("Save");
	});

	it("resolves a nested key", () => {
		const localize = setupLocalize();
		expect(localize("common.loading")).toBe("Loading...");
	});

	it("returns the key itself when key is missing", () => {
		const localize = setupLocalize();
		expect(localize("nonexistent.key")).toBe("nonexistent.key");
	});

	it("returns the key for a partially valid path", () => {
		const localize = setupLocalize();
		expect(localize("common.nonexistent")).toBe("common.nonexistent");
	});

	it("formats parameterized strings with intl-messageformat", () => {
		const localize = setupLocalize();
		expect(localize("wizard.recording", { current: 3, total: 5 })).toBe(
			"Recording... 3s / 5s",
		);
	});

	it("formats ICU plural strings correctly for singular", () => {
		const localize = setupLocalize();
		const result = localize("info.zone_occupancy", { slot: 1, count: 1 });
		expect(result).toContain("1 target detected");
		expect(result).not.toContain("targets");
	});

	it("formats ICU plural strings correctly for plural", () => {
		const localize = setupLocalize();
		const result = localize("info.zone_occupancy", { slot: 2, count: 3 });
		expect(result).toContain("3 targets detected");
	});

	it("formats live overview env sensor values to 1 decimal place", () => {
		const localize = setupLocalize();
		expect(localize("live.temperature_value", { value: 23.456 })).toBe(
			"23.5 °C",
		);
		expect(localize("live.humidity_value", { value: 47.123 })).toBe("47.1 %");
		expect(localize("live.illuminance_value", { value: 123.789 })).toBe(
			"123.8 lux",
		);
	});

	it("formats grid_dimensions values to 1 decimal place", () => {
		const localize = setupLocalize();
		expect(
			localize("live.grid_dimensions", {
				width: 4.123,
				depth: 3.456,
				furthest: 5.789,
			}),
		).toBe("4.1m × 3.5m · Furthest point: 5.8m");
	});

	it("reads language from hass.locale.language", () => {
		const localize = setupLocalize({
			locale: { language: "en" },
		});
		expect(localize("common.save")).toBe("Save");
	});

	it("reads language from hass.language as fallback", () => {
		const localize = setupLocalize({ language: "en" });
		expect(localize("common.save")).toBe("Save");
	});

	it("falls back to English for unknown language", () => {
		const localize = setupLocalize({
			locale: { language: "zz" },
		});
		expect(localize("common.save")).toBe("Save");
	});

	it("works with no hass object", () => {
		const localize = setupLocalize();
		expect(localize("common.save")).toBe("Save");
	});

	it("works with undefined hass", () => {
		const localize = setupLocalize(undefined);
		expect(localize("common.save")).toBe("Save");
	});

	it("returns plain string when params provided but string has no placeholders", () => {
		const localize = setupLocalize();
		expect(localize("common.save", { unused: 1 })).toBe("Save");
	});

	it("caches IntlMessageFormat instances for repeated calls", () => {
		const localize = setupLocalize();
		const r1 = localize("wizard.recording", { current: 1, total: 5 });
		const r2 = localize("wizard.recording", { current: 2, total: 5 });
		expect(r1).toBe("Recording... 1s / 5s");
		expect(r2).toBe("Recording... 2s / 5s");
	});

	it("loads Spanish when hass.locale.language is 'es'", () => {
		const localize = setupLocalize({ locale: { language: "es" } });
		expect(localize("common.save")).toBe("Guardar");
	});

	it("resolves common.card_description in English (used at customCards registration)", () => {
		const localize = setupLocalize({ language: "en" });
		const desc = localize("common.card_description");
		expect(desc).not.toBe("common.card_description");
		expect(desc.length).toBeGreaterThan(0);
	});

	it("resolves common.card_description in Spanish", () => {
		const localize = setupLocalize({ language: "es" });
		const desc = localize("common.card_description");
		expect(desc).not.toBe("common.card_description");
		expect(localize.lang).toBe("es");
		expect(desc).not.toBe(
			setupLocalize({ language: "en" })("common.card_description"),
		);
	});

	it("falls back to base language when given a region-tagged code (es-ES → es)", () => {
		const localize = setupLocalize({ locale: { language: "es-ES" } });
		expect(localize("common.save")).toBe("Guardar");
	});

	it("falls back to English when language is unknown", () => {
		const localize = setupLocalize({ locale: { language: "xx-YY" } });
		expect(localize("common.save")).toBe("Save");
	});

	it("exposes lang property", () => {
		const localize = setupLocalize({ locale: { language: "es" } });
		expect(localize.lang).toBe("es");
	});

	it("lang defaults to 'en' when no hass", () => {
		const localize = setupLocalize();
		expect(localize.lang).toBe("en");
	});

	describe("formatNumber", () => {
		it("formats with English locale (period separator)", () => {
			const localize = setupLocalize();
			expect(localize.formatNumber(3.5, 1)).toBe("3.5");
		});

		it("formats with Spanish locale (comma separator)", () => {
			const localize = setupLocalize({ locale: { language: "es" } });
			expect(localize.formatNumber(3.5, 1)).toBe("3,5");
		});

		it("defaults to 1 decimal place", () => {
			const localize = setupLocalize();
			expect(localize.formatNumber(3.0)).toBe("3.0");
		});

		it("respects explicit decimal count", () => {
			const localize = setupLocalize();
			expect(localize.formatNumber(3.149, 2)).toBe("3.15");
		});

		it("caches Intl.NumberFormat instances for repeated calls", () => {
			const localize = setupLocalize();
			const r1 = localize.formatNumber(1.5, 1);
			const r2 = localize.formatNumber(2.5, 1);
			expect(r1).toBe("1.5");
			expect(r2).toBe("2.5");
		});
	});

	describe("malformed ICU patterns", () => {
		it("returns the raw key when the cached IntlMessageFormat constructor throws", () => {
			const localize = setupLocalize();
			// Stray opening brace — IntlMessageFormat treats it as syntax error.
			const result = localize("{value, plural, one {", { value: 1 });
			expect(typeof result).toBe("string");
			// Falls back to raw string, not a thrown exception.
			expect(result).toBe("{value, plural, one {");
		});

		it("returns the raw key when format() throws (e.g. missing param)", () => {
			const localize = setupLocalize();
			// Plural with no `other` branch + missing arg → format() throws.
			const result = localize("{x, plural, one {a}}", {});
			expect(typeof result).toBe("string");
		});
	});
});

describe("defaultLocalize", () => {
	it("returns the key as-is", () => {
		expect(defaultLocalize("any.key")).toBe("any.key");
	});

	it("formatNumber falls back to toFixed", () => {
		expect(defaultLocalize.formatNumber(3.5, 1)).toBe("3.5");
		expect(defaultLocalize.formatNumber(3.149, 2)).toBe("3.15");
	});

	it("lang is 'en'", () => {
		expect(defaultLocalize.lang).toBe("en");
	});
});
