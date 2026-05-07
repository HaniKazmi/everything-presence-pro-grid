/**
 * Tests for panel behaviour when the Home Assistant WebSocket connection
 * drops and reconnects.  The panel should render a "connecting" UI while
 * disconnected, and re-initialise when the connection becomes ready again.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";

type Listener = (...args: any[]) => void;

function mockConnection(connected: boolean) {
	const listeners: Record<string, Listener[]> = {};
	return {
		connected,
		subscribeMessage: vi.fn().mockResolvedValue(vi.fn()),
		addEventListener: vi.fn((event: string, cb: Listener) => {
			if (!listeners[event]) listeners[event] = [];
			listeners[event].push(cb);
		}),
		removeEventListener: vi.fn((event: string, cb: Listener) => {
			listeners[event] = (listeners[event] || []).filter((l) => l !== cb);
		}),
		// Test helper – fire all listeners for an event synchronously.
		__emit(event: string, ...args: any[]) {
			for (const l of listeners[event] || []) l(...args);
		},
		__listenerCount(event: string) {
			return (listeners[event] || []).length;
		},
	};
}

function mockHass(connected = true) {
	const connection = mockConnection(connected);
	return {
		callWS: vi.fn().mockResolvedValue({ devices: [] }),
		connected,
		connection,
		locale: { language: "en" },
		language: "en",
	};
}

describe("panel HA reconnect handling", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("renders a reconnecting UI when hass.connection.connected is false", () => {
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		el.hass = mockHass(false);
		const a = el as any;
		// Force past the initial loading state so we're in the main render path.
		a._loading = false;
		a._devices = [
			{
				mac: "aa",
				name: "Alpha",
				host: null,
				available: true,
				configured: true,
				firmware_status: "compatible",
				current_connection_count: null,
			},
		];
		a._selectedMac = "aa";

		const result = a.render();
		// Render result is a Lit TemplateResult – stringify by grabbing its values.
		const serialised = JSON.stringify(result, (_k, v) =>
			typeof v === "function" ? "[fn]" : v,
		);
		// Must mention that we are (re)connecting to Home Assistant, not to the device.
		expect(serialised.toLowerCase()).toMatch(/home assistant|reconnect/);
	});

	it("registers ready/disconnected listeners on hass.connection when connected", async () => {
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		const hass = mockHass(true);
		el.hass = hass;
		document.body.appendChild(el);
		await el.updateComplete;
		// After connection, the panel should have registered listeners on both events.
		expect(hass.connection.__listenerCount("ready")).toBeGreaterThan(0);
		expect(hass.connection.__listenerCount("disconnected")).toBeGreaterThan(0);
		document.body.removeChild(el);
	});

	it("removes connection listeners when the element is disconnected", async () => {
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		const hass = mockHass(true);
		el.hass = hass;
		document.body.appendChild(el);
		await el.updateComplete;
		expect(hass.connection.__listenerCount("ready")).toBeGreaterThan(0);
		document.body.removeChild(el);
		expect(hass.connection.__listenerCount("ready")).toBe(0);
		expect(hass.connection.__listenerCount("disconnected")).toBe(0);
	});

	it("does not leak an unhandled rejection when _initialize fails during connect", async () => {
		const unhandled: unknown[] = [];
		const handler = (reason: unknown) => {
			unhandled.push(reason);
		};
		process.on("unhandledRejection", handler);
		try {
			const el = document.createElement("eppgrid-panel") as EPPGridPanel;
			const hass = mockHass(true);
			hass.connection.subscribeMessage = vi
				.fn()
				.mockRejectedValue(new Error("socket closed"));
			hass.callWS = vi.fn().mockRejectedValue(new Error("socket closed"));
			el.hass = hass;
			document.body.appendChild(el);
			await new Promise((r) => setTimeout(r, 0));
			await new Promise((r) => setTimeout(r, 0));
			expect(unhandled).toEqual([]);
			document.body.removeChild(el);
		} finally {
			process.off("unhandledRejection", handler);
		}
	});

	it("requests a re-render when a 'ready' event fires after disconnect", async () => {
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		const hass = mockHass(true);
		el.hass = hass;
		document.body.appendChild(el);
		await el.updateComplete;
		const a = el as any;
		a._loading = false;
		a._devices = [
			{
				mac: "aa",
				name: "Alpha",
				host: null,
				available: true,
				configured: true,
				firmware_status: "compatible",
				current_connection_count: null,
			},
		];
		a._selectedMac = "aa";
		await el.updateComplete;

		const spy = vi.spyOn(el, "requestUpdate");
		// Simulate HA losing the socket…
		hass.connection.connected = false;
		hass.connection.__emit("disconnected");
		// …and coming back.
		hass.connection.connected = true;
		hass.connection.__emit("ready");

		expect(spy).toHaveBeenCalled();
		document.body.removeChild(el);
	});
});
