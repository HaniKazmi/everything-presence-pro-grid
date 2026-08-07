import { describe, expect, it } from "vitest";
import { DOCS_BASE_URL, getHelpUrl } from "../../lib/help-url.js";

describe("lib/help-url", () => {
	describe("DOCS_BASE_URL", () => {
		it("points at the published mkdocs site and ends with a slash", () => {
			expect(DOCS_BASE_URL).toBe(
				"https://hanikazmi.github.io/everything-presence-pro-grid/",
			);
		});
	});

	describe("getHelpUrl", () => {
		it("maps live overview to user-guide/live-overview/", () => {
			expect(
				getHelpUrl({ panelTab: "config", view: "live", sidebarTab: "zones" }),
			).toBe(`${DOCS_BASE_URL}user-guide/live-overview/`);
		});

		it("maps editor + zones to user-guide/detection-zones/", () => {
			expect(
				getHelpUrl({ panelTab: "config", view: "editor", sidebarTab: "zones" }),
			).toBe(`${DOCS_BASE_URL}user-guide/detection-zones/`);
		});

		it("maps editor + overlays to user-guide/overlays/", () => {
			expect(
				getHelpUrl({
					panelTab: "config",
					view: "editor",
					sidebarTab: "overlays",
				}),
			).toBe(`${DOCS_BASE_URL}user-guide/overlays/`);
		});

		it("maps editor + furniture to user-guide/furniture/", () => {
			expect(
				getHelpUrl({
					panelTab: "config",
					view: "editor",
					sidebarTab: "furniture",
				}),
			).toBe(`${DOCS_BASE_URL}user-guide/furniture/`);
		});

		it("maps settings to user-guide/settings/", () => {
			expect(
				getHelpUrl({
					panelTab: "config",
					view: "settings",
					sidebarTab: "zones",
				}),
			).toBe(`${DOCS_BASE_URL}user-guide/settings/`);
		});

		it("maps tutorial to user-guide/calibration/", () => {
			expect(
				getHelpUrl({
					panelTab: "config",
					view: "tutorial",
					sidebarTab: "zones",
				}),
			).toBe(`${DOCS_BASE_URL}user-guide/calibration/`);
		});

		it("maps calibrate to user-guide/calibration/", () => {
			expect(
				getHelpUrl({
					panelTab: "config",
					view: "calibrate",
					sidebarTab: "zones",
				}),
			).toBe(`${DOCS_BASE_URL}user-guide/calibration/`);
		});

		it("maps panelTab=device-groups to user-guide/device-groups/ regardless of view", () => {
			expect(
				getHelpUrl({
					panelTab: "device-groups",
					view: "live",
					sidebarTab: "zones",
				}),
			).toBe(`${DOCS_BASE_URL}user-guide/device-groups/`);
			expect(
				getHelpUrl({
					panelTab: "device-groups",
					view: "editor",
					sidebarTab: "furniture",
				}),
			).toBe(`${DOCS_BASE_URL}user-guide/device-groups/`);
		});

		it("maps panelTab=flasher to user-guide/flashing-firmware/ regardless of view", () => {
			expect(
				getHelpUrl({ panelTab: "flasher", view: "live", sidebarTab: "zones" }),
			).toBe(`${DOCS_BASE_URL}user-guide/flashing-firmware/`);
			expect(
				getHelpUrl({
					panelTab: "flasher",
					view: "settings",
					sidebarTab: "zones",
				}),
			).toBe(`${DOCS_BASE_URL}user-guide/flashing-firmware/`);
			expect(
				getHelpUrl({
					panelTab: "flasher",
					view: "editor",
					sidebarTab: "overlays",
				}),
			).toBe(`${DOCS_BASE_URL}user-guide/flashing-firmware/`);
		});
	});
});
