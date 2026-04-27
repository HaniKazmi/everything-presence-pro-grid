import { describe, expect, it } from "vitest";
import {
	parseViewHash,
	type ViewState,
	viewHash,
} from "../../lib/view-hash.js";

describe("lib/view-hash", () => {
	describe("parseViewHash", () => {
		it("returns live overview for an empty hash", () => {
			expect(parseViewHash("")).toEqual({ view: "live", sidebarTab: "zones" });
		});

		it("returns live overview for a bare '#'", () => {
			expect(parseViewHash("#")).toEqual({ view: "live", sidebarTab: "zones" });
		});

		it("parses '#zones' as editor + zones", () => {
			expect(parseViewHash("#zones")).toEqual({
				view: "editor",
				sidebarTab: "zones",
			});
		});

		it("parses '#overlays' as editor + overlays", () => {
			expect(parseViewHash("#overlays")).toEqual({
				view: "editor",
				sidebarTab: "overlays",
			});
		});

		it("parses '#furniture' as editor + furniture", () => {
			expect(parseViewHash("#furniture")).toEqual({
				view: "editor",
				sidebarTab: "furniture",
			});
		});

		it("parses '#settings'", () => {
			expect(parseViewHash("#settings")).toEqual({
				view: "settings",
				sidebarTab: "zones",
			});
		});

		it("parses '#calibrate'", () => {
			expect(parseViewHash("#calibrate")).toEqual({
				view: "calibrate",
				sidebarTab: "zones",
			});
		});

		it("parses '#tutorial'", () => {
			expect(parseViewHash("#tutorial")).toEqual({
				view: "tutorial",
				sidebarTab: "zones",
			});
		});

		it("ignores an unknown hash and returns live", () => {
			expect(parseViewHash("#bogus")).toEqual({
				view: "live",
				sidebarTab: "zones",
			});
		});

		it("accepts a hash without leading '#'", () => {
			expect(parseViewHash("furniture")).toEqual({
				view: "editor",
				sidebarTab: "furniture",
			});
		});
	});

	describe("viewHash (serializer)", () => {
		it("returns empty string for live overview", () => {
			expect(viewHash({ view: "live", sidebarTab: "zones" })).toBe("");
			// sub-tab is ignored when view is live
			expect(viewHash({ view: "live", sidebarTab: "furniture" })).toBe("");
		});

		it("returns '#zones' for editor + zones", () => {
			expect(viewHash({ view: "editor", sidebarTab: "zones" })).toBe("#zones");
		});

		it("returns '#overlays' for editor + overlays", () => {
			expect(viewHash({ view: "editor", sidebarTab: "overlays" })).toBe(
				"#overlays",
			);
		});

		it("returns '#furniture' for editor + furniture", () => {
			expect(viewHash({ view: "editor", sidebarTab: "furniture" })).toBe(
				"#furniture",
			);
		});

		it("returns '#settings' regardless of sub-tab", () => {
			expect(viewHash({ view: "settings", sidebarTab: "zones" })).toBe(
				"#settings",
			);
			expect(viewHash({ view: "settings", sidebarTab: "furniture" })).toBe(
				"#settings",
			);
		});

		it("returns '#calibrate' regardless of sub-tab", () => {
			expect(viewHash({ view: "calibrate", sidebarTab: "zones" })).toBe(
				"#calibrate",
			);
			expect(viewHash({ view: "calibrate", sidebarTab: "furniture" })).toBe(
				"#calibrate",
			);
		});

		it("returns '#tutorial' regardless of sub-tab", () => {
			expect(viewHash({ view: "tutorial", sidebarTab: "zones" })).toBe(
				"#tutorial",
			);
			expect(viewHash({ view: "tutorial", sidebarTab: "furniture" })).toBe(
				"#tutorial",
			);
		});
	});

	describe("round-trip", () => {
		it("parse(serialize(x)) === x for all canonical states", () => {
			const cases: ViewState[] = [
				{ view: "live", sidebarTab: "zones" },
				{ view: "editor", sidebarTab: "zones" },
				{ view: "editor", sidebarTab: "overlays" },
				{ view: "editor", sidebarTab: "furniture" },
				{ view: "settings", sidebarTab: "zones" },
				{ view: "calibrate", sidebarTab: "zones" },
				{ view: "tutorial", sidebarTab: "zones" },
			];
			for (const state of cases) {
				const parsed = parseViewHash(viewHash(state));
				expect(parsed.view).toBe(state.view);
				if (state.view === "editor") {
					expect(parsed.sidebarTab).toBe(state.sidebarTab);
				}
			}
		});
	});
});
