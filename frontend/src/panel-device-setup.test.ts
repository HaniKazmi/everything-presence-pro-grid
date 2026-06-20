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
	it("calls configure_device on setup-complete when something changed", async () => {
		const panel = createPanel();
		const callWS = (
			panel as never as { hass: { callWS: ReturnType<typeof vi.fn> } }
		).hass.callWS;
		// seed _devices so the handler sees a name change (Bed ≠ Auto)
		(panel as never as { _devices: DeviceInfo[] })._devices = [
			makeDeviceInfo({ mac: "AA:BB:CC:DD:EE:FF", name: "Auto" }),
		];
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
					recreateEntityIds: true,
				},
			}),
		);
		expect(callWS).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "eppgrid/configure_device",
				mac: "AA:BB:CC:DD:EE:FF",
				area_id: "a1",
				recreate_entity_ids: true,
			}),
		);
		expect((panel as never as { _setupOpen: boolean })._setupOpen).toBe(false);
	});

	it("does NOT call configure_device on skip (setup-skip)", async () => {
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
		expect(callWS).not.toHaveBeenCalled();
		expect((panel as never as { _setupOpen: boolean })._setupOpen).toBe(false);
	});

	it("does NOT call configure_device on setup-complete when nothing changed", async () => {
		const panel = createPanel();
		const callWS = (
			panel as never as { hass: { callWS: ReturnType<typeof vi.fn> } }
		).hass.callWS;
		// seed _devices with matching values — no change
		(panel as never as { _devices: DeviceInfo[] })._devices = [
			makeDeviceInfo({ mac: "AA:BB:CC:DD:EE:FF", name: "Auto", area: null }),
		];
		await (
			panel as never as {
				_onDeviceSetupComplete: (e: CustomEvent) => Promise<void>;
			}
		)._onDeviceSetupComplete(
			new CustomEvent("setup-complete", {
				detail: {
					mac: "AA:BB:CC:DD:EE:FF",
					name: "Auto",
					areaId: null,
					recreateEntityIds: false,
				},
			}),
		);
		expect(callWS).not.toHaveBeenCalled();
		expect((panel as never as { _setupOpen: boolean })._setupOpen).toBe(false);
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

describe("panel calibration gate", () => {
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

	it("never renders a setup banner", () => {
		const panel = createPanel();
		const a = panel as never as Record<string, unknown>;
		primeForWizard(a);
		a._devices = [
			makeDeviceInfo({
				mac: "AA:BB:CC:DD:EE:FF",
				name: null as never,
				area: null,
			}),
		];
		a._selectedMac = "AA:BB:CC:DD:EE:FF";
		a._view = "live";
		a._panelTab = "config";
		a._renderControllerErrorBanner = (() => html``) as never;
		a._renderLiveOverview = (() =>
			html`<div class="live-overview"></div>`) as never;
		(a._deviceCtrl as Record<string, unknown>) = {
			connectionFailed: false,
			reconnecting: false,
		};
		const c = renderTo((a._renderTabContent as () => unknown).call(panel));
		expect(c.querySelector(".setup-banner")).toBeNull();
	});

	it("renders the calibration wizard for a selected device regardless of name/area", () => {
		const panel = createPanel();
		const a = panel as never as Record<string, unknown>;
		primeForWizard(a);
		a._devices = [
			makeDeviceInfo({
				mac: "AA:BB:CC:DD:EE:FF",
				name: null as never,
				area: null,
			}),
		];
		a._selectedMac = "AA:BB:CC:DD:EE:FF";
		a._view = "calibrate";
		a._panelTab = "config";
		const c = renderTo((a._renderTabContent as () => unknown).call(panel));
		expect(c.querySelector("epp-wizard")).not.toBeNull();
	});
});

describe("panel — _onDeviceReadyForSetup and _waitForDevice", () => {
	it("_waitForDevice matches by host===ip", async () => {
		const panel = createPanel();
		const dev = makeDeviceInfo({ mac: "AA:BB:CC:DD:EE:FF", host: "1.2.3.4" });
		const a = panel as never as Record<string, unknown>;
		let call = 0;
		a._loadDevices = vi.fn().mockImplementation(async () => {
			if (call++ === 0) {
				a._devices = [dev];
			}
		}) as never;
		a._devices = [];
		vi.useFakeTimers();
		const p = (
			a._waitForDevice as (ip: string, mac?: string) => Promise<unknown>
		)("1.2.3.4", undefined);
		await vi.advanceTimersByTimeAsync(0);
		const result = await p;
		vi.useRealTimers();
		expect(result).toBe(dev);
	});

	it("_waitForDevice falls back to the flashed MAC when host doesn't match", async () => {
		const panel = createPanel();
		const dev = makeDeviceInfo({ mac: "AA:BB:CC:DD:EE:FF", host: "9.9.9.9" });
		const a = panel as never as Record<string, unknown>;
		let call = 0;
		a._loadDevices = vi.fn().mockImplementation(async () => {
			if (call++ === 0) {
				a._devices = [dev];
			}
		}) as never;
		a._devices = [];
		vi.useFakeTimers();
		const p = (
			a._waitForDevice as (ip: string, mac?: string) => Promise<unknown>
		)("1.2.3.4", "AA:BB:CC:DD:EE:FF");
		await vi.advanceTimersByTimeAsync(0);
		const result = await p;
		vi.useRealTimers();
		expect(result).toBe(dev);
	});

	it("_waitForDevice returns null after max attempts", async () => {
		const panel = createPanel();
		const a = panel as never as Record<string, unknown>;
		a._loadDevices = vi.fn().mockResolvedValue(undefined) as never;
		a._devices = [];
		vi.useFakeTimers();
		const p = (a._waitForDevice as (ip: string) => Promise<unknown>)("1.2.3.4");
		await vi.advanceTimersByTimeAsync(31000); // 30 * 1000ms
		const result = await p;
		vi.useRealTimers();
		expect(result).toBeNull();
	});

	it("_onDeviceReadyForSetup selects the device, shows config, and opens the modal", async () => {
		const panel = createPanel();
		const dev = makeDeviceInfo({ mac: "AA:BB:CC:DD:EE:FF", host: "1.2.3.4" });
		const a = panel as never as Record<string, unknown>;
		a._waitForDevice = vi.fn().mockResolvedValue(dev) as never;
		a._selectAndShowConfig = vi.fn() as never;
		a._openDeviceSetup = vi.fn() as never;
		const fakeCtrl = {
			resetUsbState: vi.fn().mockResolvedValue(undefined),
			updateUsbState: vi.fn(),
		};
		a._flasherCtrl = fakeCtrl as never;

		await (
			a._onDeviceReadyForSetup as (ip: string, mac?: string) => Promise<void>
		)("1.2.3.4", "AA:BB:CC:DD:EE:FF");

		expect(a._selectAndShowConfig).toHaveBeenCalledWith(dev.mac);
		expect(a._openDeviceSetup).toHaveBeenCalledWith(dev);
		expect(fakeCtrl.resetUsbState).toHaveBeenCalled();
	});

	it("_onDeviceReadyForSetup surfaces failure when device never appears", async () => {
		const panel = createPanel();
		const a = panel as never as Record<string, unknown>;
		a._waitForDevice = vi.fn().mockResolvedValue(null) as never;
		const fakeCtrl = { updateUsbState: vi.fn(), resetUsbState: vi.fn() };
		a._flasherCtrl = fakeCtrl as never;
		a._openDeviceSetup = vi.fn() as never;

		await (a._onDeviceReadyForSetup as (ip: string) => Promise<void>)(
			"1.2.3.4",
		);

		expect(fakeCtrl.updateUsbState).toHaveBeenCalledWith(
			expect.objectContaining({ step: "complete", haAdd: { type: "failed" } }),
		);
		expect(a._openDeviceSetup).not.toHaveBeenCalled();
	});

	it("cancel mid-poll: opId bump aborts _waitForDevice and does NOT open the setup modal", async () => {
		const panel = createPanel();
		const a = panel as never as Record<string, unknown>;

		// _loadDevices never finds the device
		a._loadDevices = vi.fn().mockResolvedValue(undefined) as never;
		a._devices = [];

		// Track calls to _openDeviceSetup and flasher methods
		a._openDeviceSetup = vi.fn() as never;
		a._selectAndShowConfig = vi.fn() as never;

		let opId = 1;
		const fakeCtrl = {
			get opId() {
				return opId;
			},
			resetUsbState: vi.fn().mockResolvedValue(undefined),
			updateUsbState: vi.fn(),
		};
		a._flasherCtrl = fakeCtrl as never;

		vi.useFakeTimers();
		const p = (
			a._onDeviceReadyForSetup as (ip: string, mac?: string) => Promise<void>
		)("1.2.3.4", "AA:BB:CC:DD:EE:FF");

		// Advance a few iterations then simulate Cancel bumping opId
		await vi.advanceTimersByTimeAsync(2500);
		opId = 2; // user clicked Cancel → handleFlasherCancel → opId bumped

		// Let the poll run to completion
		await vi.advanceTimersByTimeAsync(31000);
		await p;
		vi.useRealTimers();

		// Must NOT open the setup modal or call resetUsbState
		expect(a._openDeviceSetup).not.toHaveBeenCalled();
		expect(fakeCtrl.resetUsbState).not.toHaveBeenCalled();
		// Must NOT surface a "failed" complete (cancel handler already cleaned up)
		expect(fakeCtrl.updateUsbState).not.toHaveBeenCalled();
	});
});

describe("panel device setup — dialog wiring", () => {
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
					recreateEntityIds: false,
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
