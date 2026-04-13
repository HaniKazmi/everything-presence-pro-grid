import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findEppPanelHost } from "../panel-mount-guard.js";

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
