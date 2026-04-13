import { afterEach, describe, expect, it } from "vitest";
import { findEppPanelHost, isEppPanelMissing } from "../panel-mount-guard.js";

function buildHaShadowTree(withPanelCustom = true): HTMLElement {
	const haRoot = document.createElement("home-assistant");
	const haShadow = haRoot.attachShadow({ mode: "open" });
	const main = document.createElement("home-assistant-main");
	haShadow.appendChild(main);
	const mainShadow = main.attachShadow({ mode: "open" });
	const resolver = document.createElement("partial-panel-resolver");
	mainShadow.appendChild(resolver);
	if (withPanelCustom) {
		const panelCustom = document.createElement("ha-panel-custom");
		resolver.appendChild(panelCustom);
	}
	return haRoot;
}

describe("findEppPanelHost", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("returns the ha-panel-custom element when tree exists", () => {
		document.body.appendChild(buildHaShadowTree(true));
		const host = findEppPanelHost();
		expect(host?.tagName.toLowerCase()).toBe("ha-panel-custom");
	});

	it("returns null when home-assistant is absent", () => {
		expect(findEppPanelHost()).toBeNull();
	});

	it("returns null when ha-panel-custom is absent", () => {
		document.body.appendChild(buildHaShadowTree(false));
		expect(findEppPanelHost()).toBeNull();
	});
});

function makeHost(
	panelName: string | undefined,
	childCount: number,
): HTMLElement {
	const host = document.createElement("ha-panel-custom");
	(host as any).panel = {
		config: panelName ? { _panel_custom: { name: panelName } } : {},
	};
	for (let i = 0; i < childCount; i++) {
		host.appendChild(document.createElement("span"));
	}
	return host;
}

describe("isEppPanelMissing", () => {
	it("returns true for our panel with no children", () => {
		expect(isEppPanelMissing(makeHost("eppgrid-panel", 0))).toBe(true);
	});

	it("returns false when panel has a child", () => {
		expect(isEppPanelMissing(makeHost("eppgrid-panel", 1))).toBe(false);
	});

	it("returns false for a different panel type", () => {
		expect(isEppPanelMissing(makeHost("other-panel", 0))).toBe(false);
	});

	it("returns false when panel config is missing", () => {
		expect(isEppPanelMissing(makeHost(undefined, 0))).toBe(false);
	});

	it("returns false when panel prop is absent", () => {
		const host = document.createElement("ha-panel-custom");
		expect(isEppPanelMissing(host)).toBe(false);
	});
});
