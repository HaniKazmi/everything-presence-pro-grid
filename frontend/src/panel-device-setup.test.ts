import { html, render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EPPGridPanel } from "./eppgrid-panel.js";
import "./eppgrid-panel.js";
import type { DeviceInfo } from "./types.js";

function makeDeviceInfo(over: Partial<DeviceInfo> = {}): DeviceInfo {
	return {
		mac: "AA:BB:CC:DD:EE:FF",
		name: "Auto",
		host: "1.2.3.4",
		available: true,
		configured: false,
		area: null,
		firmware_status: "compatible",
		current_connection_count: 0,
		onboarded: false,
		...over,
	};
}

function createPanel(): EPPGridPanel {
	const el = new EPPGridPanel();
	(el as never as { hass: unknown }).hass = {
		callWS: vi.fn().mockResolvedValue({ devices: [] }),
		connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
	};
	(el as never as { _localize: (k: string) => string })._localize = ((
		k: string,
	) => k) as never;
	return el;
}

describe("panel device setup", () => {
	it("calls configure_device on setup-complete", async () => {
		const panel = createPanel();
		const callWS = (
			panel as never as { hass: { callWS: ReturnType<typeof vi.fn> } }
		).hass.callWS;
		await (
			panel as never as {
				_onDeviceSetupComplete: (e: CustomEvent) => Promise<void>;
			}
		)._onDeviceSetupComplete(
			new CustomEvent("setup-complete", {
				detail: {
					mac: "AA:BB:CC:DD:EE:FF",
					name: "Bed",
					areaId: "a1",
					calibrate: false,
				},
			}),
		);
		expect(callWS).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "eppgrid/configure_device",
				mac: "AA:BB:CC:DD:EE:FF",
				area_id: "a1",
			}),
		);
		expect((panel as never as { _setupOpen: boolean })._setupOpen).toBe(false);
	});

	it("calls configure_device (mac only) on dialog setup-skip", async () => {
		const panel = createPanel();
		const callWS = (
			panel as never as { hass: { callWS: ReturnType<typeof vi.fn> } }
		).hass.callWS;
		await (
			panel as never as {
				_onDeviceSetupDialogSkip: (e: CustomEvent) => Promise<void>;
			}
		)._onDeviceSetupDialogSkip(
			new CustomEvent("setup-skip", { detail: { mac: "AA:BB:CC:DD:EE:FF" } }),
		);
		expect(callWS).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "eppgrid/configure_device",
				mac: "AA:BB:CC:DD:EE:FF",
			}),
		);
	});

	it("sends name:null to configure_device when name is blank", async () => {
		const panel = createPanel();
		const callWS = (
			panel as never as { hass: { callWS: ReturnType<typeof vi.fn> } }
		).hass.callWS;
		await (
			panel as never as {
				_onDeviceSetupComplete: (e: CustomEvent) => Promise<void>;
			}
		)._onDeviceSetupComplete(
			new CustomEvent("setup-complete", {
				detail: {
					mac: "AA:BB:CC:DD:EE:FF",
					name: "",
					areaId: null,
					calibrate: false,
				},
			}),
		);
		expect(callWS).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "eppgrid/configure_device",
				mac: "AA:BB:CC:DD:EE:FF",
				name: null,
				area_id: null,
			}),
		);
	});

	it("hands off to calibration when calibrate is true", async () => {
		const panel = createPanel();
		const selectSpy = vi.fn().mockReturnValue(undefined);
		(
			panel as never as { _selectDeviceForCalibration: (mac: string) => void }
		)._selectDeviceForCalibration = selectSpy as never;
		await (
			panel as never as {
				_onDeviceSetupComplete: (e: CustomEvent) => Promise<void>;
			}
		)._onDeviceSetupComplete(
			new CustomEvent("setup-complete", {
				detail: {
					mac: "AA:BB:CC:DD:EE:FF",
					name: "Bed",
					areaId: null,
					calibrate: true,
				},
			}),
		);
		expect(selectSpy).toHaveBeenCalledWith("AA:BB:CC:DD:EE:FF");
	});

	it("does not hand off to calibration when calibrate is false", async () => {
		const panel = createPanel();
		const selectSpy = vi.fn();
		(
			panel as never as { _selectDeviceForCalibration: (mac: string) => void }
		)._selectDeviceForCalibration = selectSpy as never;
		await (
			panel as never as {
				_onDeviceSetupComplete: (e: CustomEvent) => Promise<void>;
			}
		)._onDeviceSetupComplete(
			new CustomEvent("setup-complete", {
				detail: {
					mac: "AA:BB:CC:DD:EE:FF",
					name: "Bed",
					areaId: null,
					calibrate: false,
				},
			}),
		);
		expect(selectSpy).not.toHaveBeenCalled();
	});

	it("renders a banner when an un-onboarded device exists", () => {
		const panel = createPanel();
		(panel as never as { _devices: DeviceInfo[] })._devices = [
			makeDeviceInfo({ onboarded: false }),
		];
		const tpl = (
			panel as never as { _renderSetupBanner: () => unknown }
		)._renderSetupBanner();
		expect(tpl).toBeTruthy();
		(panel as never as { _devices: DeviceInfo[] })._devices = [
			makeDeviceInfo({ onboarded: true }),
		];
		// nothing renders -> falsy-ish sentinel; assert it differs from the banner case
		const tpl2 = (
			panel as never as { _renderSetupBanner: () => unknown }
		)._renderSetupBanner();
		expect(tpl2).not.toBe(tpl);
	});

	it("does not render a banner while the setup dialog is open", () => {
		const panel = createPanel();
		(panel as never as { _devices: DeviceInfo[] })._devices = [
			makeDeviceInfo({ onboarded: false }),
		];
		(panel as never as { _setupOpen: boolean })._setupOpen = true;
		const tpl = (
			panel as never as { _renderSetupBanner: () => unknown }
		)._renderSetupBanner();
		const empty = (
			panel as never as { _renderSetupBanner: () => unknown }
		)._renderSetupBanner();
		// Both calls return the same `nothing` sentinel when the dialog is open.
		expect(tpl).toBe(empty);
	});

	it("opens the dialog via _openDeviceSetup", () => {
		const panel = createPanel();
		const dev = makeDeviceInfo();
		(
			panel as never as { _openDeviceSetup: (d: DeviceInfo) => void }
		)._openDeviceSetup(dev);
		expect((panel as never as { _setupOpen: boolean })._setupOpen).toBe(true);
		expect(
			(panel as never as { _setupDevice: DeviceInfo })._setupDevice.mac,
		).toBe(dev.mac);
	});
});

describe("panel flasher-inline onboarding", () => {
	const containers: HTMLDivElement[] = [];

	afterEach(() => {
		for (const c of containers) c.remove();
		containers.length = 0;
	});

	function renderTo(tpl: unknown): HTMLDivElement {
		const c = document.createElement("div");
		document.body.appendChild(c);
		containers.push(c);
		render(tpl, c);
		return c;
	}

	it("on device-setup-submit: stashes pending setup and drives the add", () => {
		const panel = createPanel();
		const a = panel as never as Record<string, unknown>;
		a._flasherCtrl = {
			usbFlashState: { mac: "AA:BB:CC:DD:EE:FF" },
			handleDeviceNaming: vi.fn(),
		};
		(a._onDeviceSetupSubmit as (e: CustomEvent) => void).call(
			panel,
			new CustomEvent("device-setup-submit", {
				detail: { name: "Bed", areaId: "a1", calibrate: true },
			}),
		);
		expect(a._pendingSetup).toEqual({
			mac: "AA:BB:CC:DD:EE:FF",
			name: "Bed",
			areaId: "a1",
			calibrate: true,
		});
		expect(
			(a._flasherCtrl as { handleDeviceNaming: ReturnType<typeof vi.fn> })
				.handleDeviceNaming,
		).toHaveBeenCalled();
	});

	it("on device-setup-skip: stashes a no-name/no-calibrate pending setup and drives the add", () => {
		const panel = createPanel();
		const a = panel as never as Record<string, unknown>;
		a._flasherCtrl = {
			usbFlashState: { mac: "AA:BB:CC:DD:EE:FF" },
			handleDeviceNaming: vi.fn(),
		};
		(a._onDeviceSetupSkip as () => void).call(panel);
		expect(a._pendingSetup).toEqual({
			mac: "AA:BB:CC:DD:EE:FF",
			name: "",
			areaId: null,
			calibrate: false,
		});
		expect(
			(a._flasherCtrl as { handleDeviceNaming: ReturnType<typeof vi.fn> })
				.handleDeviceNaming,
		).toHaveBeenCalled();
	});

	it("applies pending setup via configure_device when the device appears", async () => {
		const panel = createPanel();
		const a = panel as never as Record<string, unknown>;
		const callWS = (a.hass as { callWS: ReturnType<typeof vi.fn> }).callWS;
		a._flasherCtrl = { resetUsbState: vi.fn() };
		a._loadDevices = (() => Promise.resolve()) as never;
		a._panelTab = "flasher";
		a._pendingSetup = {
			mac: "AA:BB:CC:DD:EE:FF",
			name: "Bed",
			areaId: "a1",
			calibrate: false,
		};
		a._devices = [
			makeDeviceInfo({ mac: "AA:BB:CC:DD:EE:FF", onboarded: false }),
		];
		await (a._maybeApplyPendingSetup as () => Promise<void>).call(panel);
		expect(callWS).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "eppgrid/configure_device",
				mac: "AA:BB:CC:DD:EE:FF",
				name: "Bed",
				area_id: "a1",
			}),
		);
		expect(a._pendingSetup).toBeNull();
		// Non-calibrate path routes to the config tab.
		expect(a._panelTab).toBe("config");
	});

	it("routes to calibration when applied pending setup has calibrate true", async () => {
		const panel = createPanel();
		const a = panel as never as Record<string, unknown>;
		a._flasherCtrl = { resetUsbState: vi.fn() };
		a._loadDevices = (() => Promise.resolve()) as never;
		const selectSpy = vi.fn();
		a._selectDeviceForCalibration = selectSpy as never;
		a._pendingSetup = {
			mac: "AA:BB:CC:DD:EE:FF",
			name: "Bed",
			areaId: null,
			calibrate: true,
		};
		a._devices = [
			makeDeviceInfo({ mac: "AA:BB:CC:DD:EE:FF", onboarded: false }),
		];
		await (a._maybeApplyPendingSetup as () => Promise<void>).call(panel);
		expect(selectSpy).toHaveBeenCalledWith("AA:BB:CC:DD:EE:FF");
	});

	it("does nothing when there is no pending setup", async () => {
		const panel = createPanel();
		const a = panel as never as Record<string, unknown>;
		const callWS = (a.hass as { callWS: ReturnType<typeof vi.fn> }).callWS;
		a._pendingSetup = null;
		a._devices = [makeDeviceInfo({ onboarded: false })];
		await (a._maybeApplyPendingSetup as () => Promise<void>).call(panel);
		expect(callWS).not.toHaveBeenCalled();
	});

	it("waits — keeps pending — until the device appears in the list", async () => {
		const panel = createPanel();
		const a = panel as never as Record<string, unknown>;
		const callWS = (a.hass as { callWS: ReturnType<typeof vi.fn> }).callWS;
		a._pendingSetup = {
			mac: "AA:BB:CC:DD:EE:FF",
			name: "Bed",
			areaId: null,
			calibrate: false,
		};
		a._devices = []; // device not yet discovered
		await (a._maybeApplyPendingSetup as () => Promise<void>).call(panel);
		expect(callWS).not.toHaveBeenCalled();
		expect(a._pendingSetup).not.toBeNull();
	});

	// Stub the full-page early-return guards in _renderTabContent so the
	// calibrate/tutorial branch is actually reached: a fresh panel defaults to
	// _loading=true (loading screen short-circuits) and would otherwise never
	// hit the wizard branch, making the gate test pass for the wrong reason.
	function primeForWizard(a: Record<string, unknown>): void {
		a._loading = false;
		a._haConnected = true;
		a._initRetryCount = 0;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		a._renderTabBar = (() => html`<div class="tab-bar"></div>`) as never;
		a._renderHeader = (() => html``) as never;
		a._getWizardSensorState = (() => ({})) as never;
	}

	it("calibration gate: un-onboarded selected device does not render the wizard", () => {
		const panel = createPanel();
		const a = panel as never as Record<string, unknown>;
		primeForWizard(a);
		a._devices = [
			makeDeviceInfo({ mac: "AA:BB:CC:DD:EE:FF", onboarded: false }),
		];
		a._selectedMac = "AA:BB:CC:DD:EE:FF";
		a._view = "calibrate";
		a._panelTab = "config";
		const c = renderTo((a._renderTabContent as () => unknown).call(panel));
		expect(c.querySelector("epp-wizard")).toBeNull();
	});

	it("calibration gate: onboarded selected device renders the wizard", () => {
		const panel = createPanel();
		const a = panel as never as Record<string, unknown>;
		primeForWizard(a);
		a._devices = [
			makeDeviceInfo({ mac: "AA:BB:CC:DD:EE:FF", onboarded: true }),
		];
		a._selectedMac = "AA:BB:CC:DD:EE:FF";
		a._view = "calibrate";
		a._panelTab = "config";
		const c = renderTo((a._renderTabContent as () => unknown).call(panel));
		expect(c.querySelector("epp-wizard")).not.toBeNull();
	});
});

describe("panel device setup — calibrate handoff", () => {
	it("switches device, persists, loads config, and navigates for a new mac", () => {
		const panel = createPanel();
		const a = panel as never as Record<string, unknown>;
		a._selectedMac = "OLD:MAC";
		// Stub the device-selection + nav collaborators so the real
		// _selectDeviceForCalibration body runs without touching live controllers.
		const closeSpy = vi.fn();
		const loadSpy = vi.fn().mockResolvedValue(undefined);
		const applySpy = vi.fn();
		a._closeDeviceSession = closeSpy as never;
		a._loadDeviceConfig = loadSpy as never;
		a._applyView = applySpy as never;
		(a._deviceCtrl as { showRoomCalibrationTutorial: boolean }) = {
			showRoomCalibrationTutorial: false,
		} as never;
		(a._selectDeviceForCalibration as (mac: string) => void)(
			"AA:BB:CC:DD:EE:FF",
		);
		expect(closeSpy).toHaveBeenCalled();
		expect(a._selectedMac).toBe("AA:BB:CC:DD:EE:FF");
		expect(loadSpy).toHaveBeenCalledWith("AA:BB:CC:DD:EE:FF");
		expect(applySpy).toHaveBeenCalledWith(
			expect.objectContaining({ view: "calibrate" }),
		);
	});

	it("navigates to the tutorial view when the tutorial is not yet dismissed", () => {
		const panel = createPanel();
		const a = panel as never as Record<string, unknown>;
		a._selectedMac = "AA:BB:CC:DD:EE:FF";
		const closeSpy = vi.fn();
		const loadSpy = vi.fn().mockResolvedValue(undefined);
		const applySpy = vi.fn();
		a._closeDeviceSession = closeSpy as never;
		a._loadDeviceConfig = loadSpy as never;
		a._applyView = applySpy as never;
		(a._deviceCtrl as { showRoomCalibrationTutorial: boolean }) = {
			showRoomCalibrationTutorial: true,
		} as never;
		// Same mac as current selection -> skip the device-switch branch.
		(a._selectDeviceForCalibration as (mac: string) => void)(
			"AA:BB:CC:DD:EE:FF",
		);
		expect(closeSpy).not.toHaveBeenCalled();
		expect(loadSpy).not.toHaveBeenCalled();
		expect(applySpy).toHaveBeenCalledWith(
			expect.objectContaining({ view: "tutorial" }),
		);
	});

	it("raises the unsaved-changes dialog and does NOT navigate when dirty", () => {
		// Mirrors the _changePlacement dirty-state test in panel-nav-guard.test.ts:
		// _selectDeviceForCalibration must route through guardNavigation so that
		// unsaved edits are not silently discarded.
		const panel = createPanel();
		const a = panel as never as Record<string, unknown>;
		// Use the same mac so the device-switch branch is skipped; only the
		// navigation half is under test here.
		a._selectedMac = "AA:BB:CC:DD:EE:FF";
		a._dirty = true;
		const applySpy = vi.fn();
		a._applyView = applySpy as never;
		(a._deviceCtrl as { showRoomCalibrationTutorial: boolean }) = {
			showRoomCalibrationTutorial: false,
		} as never;
		(a._selectDeviceForCalibration as (mac: string) => void)(
			"AA:BB:CC:DD:EE:FF",
		);
		// The guard must have raised the dialog…
		expect(a._showUnsavedDialog).toBe(true);
		// …and must NOT have performed the view transition yet.
		expect(applySpy).not.toHaveBeenCalled();
	});
});

describe("panel device setup — banner rendering", () => {
	const containers: HTMLDivElement[] = [];

	afterEach(() => {
		for (const c of containers) c.remove();
		containers.length = 0;
	});

	function renderTo(tpl: unknown): HTMLDivElement {
		const c = document.createElement("div");
		document.body.appendChild(c);
		containers.push(c);
		render(tpl, c);
		return c;
	}

	it("the banner action button opens the setup dialog when clicked", () => {
		const panel = createPanel();
		const a = panel as never as Record<string, unknown>;
		a._devices = [makeDeviceInfo({ onboarded: false, name: "New Sensor" })];
		const openSpy = vi.fn();
		a._openDeviceSetup = openSpy as never;
		const c = renderTo((a._renderSetupBanner as () => unknown).call(panel));
		const banner = c.querySelector(".setup-banner");
		expect(banner).not.toBeNull();
		const btn = banner!.querySelector("epp-button") as HTMLElement;
		expect(btn).not.toBeNull();
		btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		expect(openSpy).toHaveBeenCalledTimes(1);
		expect((openSpy.mock.calls[0][0] as DeviceInfo).mac).toBe(
			"AA:BB:CC:DD:EE:FF",
		);
	});

	it("renders the banner in the config tab (live overview state)", () => {
		// The banner is rendered by _renderTabContent (between the tab-bar and content),
		// not inside _renderLiveOverview itself, so it appears for all config-tab views.
		const panel = createPanel();
		const a = panel as never as Record<string, unknown>;
		a._devices = [makeDeviceInfo({ onboarded: false })];
		a._selectedMac = "AA:BB:CC:DD:EE:FF";
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		a._panelTab = "config";
		a._view = "live";
		a._loading = false;
		a._haConnected = true;
		(a._deviceCtrl as Record<string, unknown>) = {
			connectionFailed: false,
			reconnecting: false,
		};
		a._initRetryCount = 3;
		a._renderTabBar = (() => html`<div class="tab-bar"></div>`) as never;
		a._renderControllerErrorBanner = (() => html``) as never;
		a._renderHeader = (() => html``) as never;
		a._renderLiveOverview = (() =>
			html`<div class="live-overview"></div>`) as never;
		const c = renderTo((a._renderTabContent as () => unknown).call(panel));
		expect(c.querySelector(".setup-banner")).not.toBeNull();
	});

	it("renders the banner in the offline state (connectionFailed)", () => {
		// Regression: _renderSetupBanner was only called inside _renderLiveOverview,
		// so a freshly-flashed device (offline ~7-50s while booting) never showed the
		// signpost banner. The fix hoists it to _renderTabContent for all config-tab
		// states. This test verifies the offline early-return branch includes the banner.
		const panel = createPanel();
		const a = panel as never as Record<string, unknown>;
		a._devices = [makeDeviceInfo({ onboarded: false, name: "New Sensor" })];
		a._selectedMac = "AA:BB:CC:DD:EE:FF";
		// Simulate the connectionFailed branch (isOffline path triggers the same branch).
		(a._deviceCtrl as Record<string, unknown>) = {
			connectionFailed: true,
			reconnecting: false,
		};
		a._haConnected = true;
		a._loading = false;
		a._view = "live";
		a._panelTab = "config";
		a._initRetryCount = 3;
		// Stub collaborators called from _renderTabContent.
		a._renderTabBar = (() => html`<div class="tab-bar"></div>`) as never;
		a._renderHeader = (() => html``) as never;
		a._renderConnectionBanner = (() =>
			html`<div class="connection-banner"></div>`) as never;
		const c = renderTo((a._renderTabContent as () => unknown).call(panel));
		expect(c.querySelector(".setup-banner")).not.toBeNull();
	});

	it("constrains the setup-banner from growing to an equal flex share", () => {
		// Cascade-regression guard (layout can't be computed in happy-dom):
		// `.tab-layout > :not(.tab-bar) { flex: 1 }` makes every config-tab child
		// grow to an equal vertical share. The banner is such a child, so without
		// an override it grew to ~half the page. Verified visually in Chromium
		// (banner 383px -> 48px after the override); this guard just prevents the
		// override rule from being silently deleted.
		const cssText = (EPPGridPanel.styles as unknown as { cssText: string }[])
			.map((s) => s.cssText)
			.join("\n")
			.replace(/\s+/g, " ");
		expect(cssText).toMatch(
			/\.tab-layout > \.setup-banner \{[^}]*flex: 0 0 auto/,
		);
	});

	it("hosts the dialog and wires its setup-complete / setup-skip events", () => {
		const panel = createPanel();
		const a = panel as never as Record<string, unknown>;
		a._setupOpen = true;
		a._setupDevice = makeDeviceInfo();
		const completeSpy = vi.fn();
		const skipSpy = vi.fn();
		a._onDeviceSetupComplete = completeSpy as never;
		a._onDeviceSetupDialogSkip = skipSpy as never;
		const c = renderTo((a._renderGlobalDialogs as () => unknown).call(panel));
		const host = c.querySelector("epp-device-setup") as HTMLElement;
		expect(host).not.toBeNull();
		host.dispatchEvent(
			new CustomEvent("setup-complete", {
				detail: {
					mac: "AA:BB:CC:DD:EE:FF",
					name: "X",
					areaId: null,
					calibrate: false,
				},
				bubbles: true,
			}),
		);
		host.dispatchEvent(
			new CustomEvent("setup-skip", {
				detail: { mac: "AA:BB:CC:DD:EE:FF" },
				bubbles: true,
			}),
		);
		expect(completeSpy).toHaveBeenCalledTimes(1);
		expect(skipSpy).toHaveBeenCalledTimes(1);
	});
});
