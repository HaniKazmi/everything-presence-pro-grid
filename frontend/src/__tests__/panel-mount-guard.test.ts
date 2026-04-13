import { afterEach, describe, expect, it } from "vitest";
import {
	checkAndRemount,
	findEppPanelHost,
	isEppPanelMissing,
	remountEppPanel,
} from "../panel-mount-guard.js";

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

	it("returns null when home-assistant-main is absent", () => {
		const haRoot = document.createElement("home-assistant");
		haRoot.attachShadow({ mode: "open" });
		document.body.appendChild(haRoot);
		expect(findEppPanelHost()).toBeNull();
	});

	it("returns null when partial-panel-resolver is absent", () => {
		const haRoot = document.createElement("home-assistant");
		const haShadow = haRoot.attachShadow({ mode: "open" });
		const main = document.createElement("home-assistant-main");
		haShadow.appendChild(main);
		main.attachShadow({ mode: "open" });
		document.body.appendChild(haRoot);
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

describe("remountEppPanel", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("appends an eppgrid-panel child with hass and panel props", () => {
		const haRoot = document.createElement("home-assistant");
		const hassObj = { foo: "bar" };
		(haRoot as any).hass = hassObj;
		document.body.appendChild(haRoot);

		const host = document.createElement("ha-panel-custom");
		const panelObj = { config: { _panel_custom: { name: "eppgrid-panel" } } };
		(host as any).panel = panelObj;
		document.body.appendChild(host);

		remountEppPanel(host);

		expect(host.children.length).toBe(1);
		const child = host.firstElementChild as HTMLElement;
		expect(child.tagName.toLowerCase()).toBe("eppgrid-panel");
		expect((child as any).hass).toBe(hassObj);
		expect((child as any).panel).toBe(panelObj);
	});

	it("does nothing when home-assistant.hass is missing", () => {
		const host = document.createElement("ha-panel-custom");
		(host as any).panel = {
			config: { _panel_custom: { name: "eppgrid-panel" } },
		};
		document.body.appendChild(host);

		remountEppPanel(host);

		expect(host.children.length).toBe(0);
	});
});

describe("checkAndRemount", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("remounts when host is our panel with no children", () => {
		const haRoot = buildHaShadowTree(true);
		(haRoot as any).hass = { any: "value" };
		document.body.appendChild(haRoot);

		const resolver = haRoot.shadowRoot!
			.querySelector("home-assistant-main")!
			.shadowRoot!.querySelector("partial-panel-resolver")!;
		const host = resolver.querySelector("ha-panel-custom") as HTMLElement;
		(host as any).panel = {
			config: { _panel_custom: { name: "eppgrid-panel" } },
		};

		checkAndRemount();

		expect(host.children.length).toBe(1);
		expect(host.firstElementChild?.tagName.toLowerCase()).toBe("eppgrid-panel");
	});

	it("is a no-op when no ha-panel-custom found", () => {
		expect(() => checkAndRemount()).not.toThrow();
	});

	it("is a no-op when panel already has a child", () => {
		const haRoot = buildHaShadowTree(true);
		(haRoot as any).hass = { any: "value" };
		document.body.appendChild(haRoot);

		const host = haRoot.shadowRoot!
			.querySelector("home-assistant-main")!
			.shadowRoot!.querySelector("partial-panel-resolver")!
			.querySelector("ha-panel-custom") as HTMLElement;
		(host as any).panel = {
			config: { _panel_custom: { name: "eppgrid-panel" } },
		};
		host.appendChild(document.createElement("eppgrid-panel"));

		checkAndRemount();

		expect(host.children.length).toBe(1);
	});

	it("is a no-op for a different panel type", () => {
		const haRoot = buildHaShadowTree(true);
		(haRoot as any).hass = { any: "value" };
		document.body.appendChild(haRoot);

		const host = haRoot.shadowRoot!
			.querySelector("home-assistant-main")!
			.shadowRoot!.querySelector("partial-panel-resolver")!
			.querySelector("ha-panel-custom") as HTMLElement;
		(host as any).panel = {
			config: { _panel_custom: { name: "other-panel" } },
		};

		checkAndRemount();

		expect(host.children.length).toBe(0);
	});
});
