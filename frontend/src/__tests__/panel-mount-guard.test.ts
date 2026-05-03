import { afterEach, describe, expect, it, vi } from "vitest";
import {
	checkAndRemount,
	ensureObserversAttached,
	findEppPanelHost,
	installPanelMountGuard,
	isEppPanelMissing,
	remountEppPanel,
	uninstallPanelMountGuard,
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

		const resolver = haRoot
			.shadowRoot!.querySelector("home-assistant-main")!
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

		const host = haRoot
			.shadowRoot!.querySelector("home-assistant-main")!
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

		const host = haRoot
			.shadowRoot!.querySelector("home-assistant-main")!
			.shadowRoot!.querySelector("partial-panel-resolver")!
			.querySelector("ha-panel-custom") as HTMLElement;
		(host as any).panel = {
			config: { _panel_custom: { name: "other-panel" } },
		};

		checkAndRemount();

		expect(host.children.length).toBe(0);
	});
});

describe("installPanelMountGuard", () => {
	afterEach(() => {
		document.body.innerHTML = "";
		uninstallPanelMountGuard();
	});

	function fireVisibilityChange(state: "visible" | "hidden"): void {
		Object.defineProperty(document, "visibilityState", {
			value: state,
			configurable: true,
		});
		document.dispatchEvent(new Event("visibilitychange"));
	}

	it("remounts on visibilitychange when tab becomes visible", () => {
		installPanelMountGuard();

		const haRoot = buildHaShadowTree(true);
		(haRoot as any).hass = { any: "value" };
		document.body.appendChild(haRoot);
		const host = haRoot
			.shadowRoot!.querySelector("home-assistant-main")!
			.shadowRoot!.querySelector("partial-panel-resolver")!
			.querySelector("ha-panel-custom") as HTMLElement;
		(host as any).panel = {
			config: { _panel_custom: { name: "eppgrid-panel" } },
		};

		fireVisibilityChange("visible");

		expect(host.children.length).toBe(1);
	});

	it("does nothing on visibilitychange when tab becomes hidden", () => {
		installPanelMountGuard();

		const haRoot = buildHaShadowTree(true);
		(haRoot as any).hass = { any: "value" };
		document.body.appendChild(haRoot);
		const host = haRoot
			.shadowRoot!.querySelector("home-assistant-main")!
			.shadowRoot!.querySelector("partial-panel-resolver")!
			.querySelector("ha-panel-custom") as HTMLElement;
		(host as any).panel = {
			config: { _panel_custom: { name: "eppgrid-panel" } },
		};

		fireVisibilityChange("hidden");

		expect(host.children.length).toBe(0);
	});

	it("ends up with a single net visibilitychange listener after repeated installs", () => {
		// Repeated installs (e.g. HMR / module reload races) must not stack
		// listeners — every fired event handles remount once, not N times.
		const addSpy = vi.spyOn(document, "addEventListener");
		const removeSpy = vi.spyOn(document, "removeEventListener");

		installPanelMountGuard();
		installPanelMountGuard();
		installPanelMountGuard();

		const adds = addSpy.mock.calls.filter(
			([event]) => event === "visibilitychange",
		).length;
		const removes = removeSpy.mock.calls.filter(
			([event]) => event === "visibilitychange",
		).length;
		expect(adds - removes).toBe(1);
		addSpy.mockRestore();
		removeSpy.mockRestore();
	});

	it("re-installs cleanly when the flag is already set (e.g. module reload)", () => {
		// Simulates a stale flag from a previous module instance: a second
		// install must tear down old observers and re-register, not silently
		// no-op leaving the new module's observers detached.
		(window as any).__eppGridMountGuardInstalled = true;
		const spy = vi.spyOn(document, "addEventListener");

		installPanelMountGuard();

		const adds = spy.mock.calls.filter(
			([event]) => event === "visibilitychange",
		).length;
		expect(adds).toBe(1);
		spy.mockRestore();
	});

	it("a second install invokes the previous module's teardown closure", () => {
		// Cross-module-reload scenario: the OLD module's listener and
		// observer references aren't reachable from the new module's
		// scope. Without a globally-stashed teardown, calling
		// removeEventListener with the new module's `handleVisibilityChange`
		// reference doesn't match the old listener — so the old listener
		// stays attached and we'd stack a second one. The teardown closure
		// captures the old module's references, so storing it on `window`
		// lets the new module reach them.
		installPanelMountGuard();
		const oldTeardown = (window as any).__eppGridMountGuardTeardown;
		expect(typeof oldTeardown).toBe("function");

		const teardownSpy = vi.fn(oldTeardown);
		(window as any).__eppGridMountGuardTeardown = teardownSpy;

		installPanelMountGuard();

		expect(teardownSpy).toHaveBeenCalledTimes(1);
		// New install must replace the teardown with its own.
		expect((window as any).__eppGridMountGuardTeardown).not.toBe(teardownSpy);
	});

	it("uninstallPanelMountGuard removes the listener and clears the flag", () => {
		installPanelMountGuard();
		expect((window as any).__eppGridMountGuardInstalled).toBe(true);

		uninstallPanelMountGuard();
		expect((window as any).__eppGridMountGuardInstalled).toBeUndefined();

		const haRoot = buildHaShadowTree(true);
		(haRoot as any).hass = { any: "value" };
		document.body.appendChild(haRoot);
		const host = haRoot
			.shadowRoot!.querySelector("home-assistant-main")!
			.shadowRoot!.querySelector("partial-panel-resolver")!
			.querySelector("ha-panel-custom") as HTMLElement;
		(host as any).panel = {
			config: { _panel_custom: { name: "eppgrid-panel" } },
		};

		fireVisibilityChange("visible");

		expect(host.children.length).toBe(0);
	});

	it("uninstallPanelMountGuard is a no-op when not installed", () => {
		const spy = vi.spyOn(document, "removeEventListener");
		uninstallPanelMountGuard();
		const visibilityRemovals = spy.mock.calls.filter(
			([event]) => event === "visibilitychange",
		);
		expect(visibilityRemovals).toHaveLength(0);
		spy.mockRestore();
	});
});

describe("module-level install", () => {
	afterEach(() => {
		document.body.innerHTML = "";
		uninstallPanelMountGuard();
	});

	it("is installed when eppgrid-panel module is imported", async () => {
		uninstallPanelMountGuard();
		await import("../eppgrid-panel.js");
		expect((window as any).__eppGridMountGuardInstalled).toBe(true);
	});
});

describe("installPanelMountGuard MutationObserver", () => {
	afterEach(() => {
		uninstallPanelMountGuard();
		document.body.innerHTML = "";
	});

	function flushMicrotasks(): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, 0));
	}

	it("remounts when host loses its child while tab stays visible", async () => {
		const haRoot = buildHaShadowTree(true);
		(haRoot as any).hass = { any: "value" };
		document.body.appendChild(haRoot);
		const host = haRoot
			.shadowRoot!.querySelector("home-assistant-main")!
			.shadowRoot!.querySelector("partial-panel-resolver")!
			.querySelector("ha-panel-custom") as HTMLElement;
		(host as any).panel = {
			config: { _panel_custom: { name: "eppgrid-panel" } },
		};
		host.appendChild(document.createElement("eppgrid-panel"));

		// Tab is and stays visible — no visibilitychange will fire.
		Object.defineProperty(document, "visibilityState", {
			value: "visible",
			configurable: true,
		});

		installPanelMountGuard();

		// Simulate HA's panel resolver clearing our child during a WS reconnect.
		host.removeChild(host.firstElementChild!);
		await flushMicrotasks();

		expect(host.children.length).toBe(1);
		expect(host.firstElementChild?.tagName.toLowerCase()).toBe("eppgrid-panel");
	});

	it("re-attaches the inner observer when partial-panel-resolver swaps host", async () => {
		const haRoot = buildHaShadowTree(true);
		(haRoot as any).hass = { any: "value" };
		document.body.appendChild(haRoot);
		const resolver = haRoot
			.shadowRoot!.querySelector("home-assistant-main")!
			.shadowRoot!.querySelector("partial-panel-resolver")!;
		const oldHost = resolver.querySelector("ha-panel-custom") as HTMLElement;
		(oldHost as any).panel = {
			config: { _panel_custom: { name: "eppgrid-panel" } },
		};
		oldHost.appendChild(document.createElement("eppgrid-panel"));

		Object.defineProperty(document, "visibilityState", {
			value: "visible",
			configurable: true,
		});
		installPanelMountGuard();

		// Resolver replaces ha-panel-custom with a fresh empty one (still our panel)
		resolver.removeChild(oldHost);
		const newHost = document.createElement("ha-panel-custom");
		(newHost as any).panel = {
			config: { _panel_custom: { name: "eppgrid-panel" } },
		};
		resolver.appendChild(newHost);
		await flushMicrotasks();

		// First mutation (resolver childList) should trigger remount of the new
		// empty host AND attach a fresh inner observer. Verify both halves:
		expect(newHost.children.length).toBe(1);
		expect(newHost.firstElementChild?.tagName.toLowerCase()).toBe(
			"eppgrid-panel",
		);

		// Now if the new host's child is removed, the freshly-attached inner
		// observer should remount it too.
		newHost.removeChild(newHost.firstElementChild!);
		await flushMicrotasks();
		expect(newHost.children.length).toBe(1);
	});

	it("does not remount when the configured panel is not eppgrid-panel", async () => {
		const haRoot = buildHaShadowTree(true);
		(haRoot as any).hass = { any: "value" };
		document.body.appendChild(haRoot);
		const host = haRoot
			.shadowRoot!.querySelector("home-assistant-main")!
			.shadowRoot!.querySelector("partial-panel-resolver")!
			.querySelector("ha-panel-custom") as HTMLElement;
		(host as any).panel = {
			config: { _panel_custom: { name: "some-other-panel" } },
		};
		host.appendChild(document.createElement("other-panel"));

		Object.defineProperty(document, "visibilityState", {
			value: "visible",
			configurable: true,
		});
		installPanelMountGuard();

		host.removeChild(host.firstElementChild!);
		await flushMicrotasks();

		expect(host.children.length).toBe(0);
	});

	it("uninstall disconnects the observers so later mutations are ignored", async () => {
		const haRoot = buildHaShadowTree(true);
		(haRoot as any).hass = { any: "value" };
		document.body.appendChild(haRoot);
		const host = haRoot
			.shadowRoot!.querySelector("home-assistant-main")!
			.shadowRoot!.querySelector("partial-panel-resolver")!
			.querySelector("ha-panel-custom") as HTMLElement;
		(host as any).panel = {
			config: { _panel_custom: { name: "eppgrid-panel" } },
		};
		host.appendChild(document.createElement("eppgrid-panel"));

		Object.defineProperty(document, "visibilityState", {
			value: "visible",
			configurable: true,
		});
		installPanelMountGuard();
		uninstallPanelMountGuard();

		host.removeChild(host.firstElementChild!);
		await flushMicrotasks();

		expect(host.children.length).toBe(0);
	});

	it("install is safe when partial-panel-resolver is not yet present", () => {
		// No HA shadow tree at install time — must not throw.
		expect(() => installPanelMountGuard()).not.toThrow();
	});

	it("ensureObserversAttached attaches observers when DOM appears after install", async () => {
		// Install BEFORE the HA tree exists — mirrors the real load order
		// where our module is imported before partial-panel-resolver is built.
		Object.defineProperty(document, "visibilityState", {
			value: "visible",
			configurable: true,
		});
		installPanelMountGuard();

		// Now build the HA tree — observers were never attached during install.
		const haRoot = buildHaShadowTree(true);
		(haRoot as any).hass = { any: "value" };
		document.body.appendChild(haRoot);
		const host = haRoot
			.shadowRoot!.querySelector("home-assistant-main")!
			.shadowRoot!.querySelector("partial-panel-resolver")!
			.querySelector("ha-panel-custom") as HTMLElement;
		(host as any).panel = {
			config: { _panel_custom: { name: "eppgrid-panel" } },
		};
		host.appendChild(document.createElement("eppgrid-panel"));

		// The panel calls this from connectedCallback to wire observers
		// once the DOM is actually present.
		ensureObserversAttached();

		// Tab stays visible the whole time — only the MutationObserver can save us.
		host.removeChild(host.firstElementChild!);
		await flushMicrotasks();

		expect(host.children.length).toBe(1);
		expect(host.firstElementChild?.tagName.toLowerCase()).toBe("eppgrid-panel");
	});
});
