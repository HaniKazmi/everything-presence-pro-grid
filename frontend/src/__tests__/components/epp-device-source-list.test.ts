import { describe, expect, it } from "vitest";
import "../../components/epp-device-source-list.js";
import type { EppDeviceSourceList } from "../../components/epp-device-source-list.js";
import type { DeviceInfo } from "../../types.js";

async function fixture(): Promise<EppDeviceSourceList> {
	const el = document.createElement(
		"epp-device-source-list",
	) as EppDeviceSourceList;
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

function emitValueChanged(target: HTMLElement, value: unknown): void {
	target.dispatchEvent(
		new CustomEvent("value-changed", {
			detail: { value },
			bubbles: true,
			composed: true,
		}),
	);
}

function toggle(
	el: EppDeviceSourceList,
	mac: string,
): HTMLElement & { checked: boolean } {
	return el.shadowRoot!.querySelector(
		`[data-testid="device-toggle"][data-mac="${mac}"]`,
	) as HTMLElement & { checked: boolean };
}

const DEVICES: DeviceInfo[] = [
	{
		mac: "AA",
		name: "Kitchen",
		host: null,
		available: true,
		configured: true,
		area: null,
		firmware_status: "compatible",
		current_connection_count: null,
	},
	{
		mac: "BB",
		name: "Living Room",
		host: null,
		available: false,
		configured: true,
		area: null,
		firmware_status: "compatible",
		current_connection_count: null,
	},
];

const MISSING_SOURCES = [{ mac: "28:DEAD", name: "Old Device" }];

describe("epp-device-source-list", () => {
	it("is registered as a custom element", () => {
		expect(customElements.get("epp-device-source-list")).toBeDefined();
	});

	it("renders one device-row per availableDevices entry", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const rows = el.shadowRoot!.querySelectorAll('[data-testid="device-row"]');
		expect(rows.length).toBe(2);
	});

	it("renders a toggle for each available device with data-mac", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const toggles = [
			...el.shadowRoot!.querySelectorAll('[data-testid="device-toggle"]'),
		] as HTMLElement[];
		expect(toggles.length).toBe(2);
		expect(toggles.map((t) => t.getAttribute("data-mac"))).toEqual([
			"AA",
			"BB",
		]);
	});

	it("marks toggle checked for devices in selectedMacs, unchecked otherwise", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.selectedMacs = ["AA"];
		await el.updateComplete;
		expect(toggle(el, "AA").checked).toBe(true);
		expect(toggle(el, "BB").checked).toBe(false);
	});

	it("shows name with area in parentheses for a device that has an area", async () => {
		const el = await fixture();
		el.availableDevices = [
			{ ...DEVICES[0], name: "Kitchen", area: "Downstairs" },
		];
		await el.updateComplete;
		const name = el.shadowRoot!.querySelector(".source-name") as HTMLElement;
		expect(name.textContent!.trim()).toBe("Kitchen (Downstairs)");
	});

	it("does not show the MAC address in the device row", async () => {
		const el = await fixture();
		el.availableDevices = [
			{ ...DEVICES[0], mac: "28:05:A5:11:22:33", name: "Kitchen" },
		];
		await el.updateComplete;
		const row = el.shadowRoot!.querySelector(
			'[data-testid="device-row"]',
		) as HTMLElement;
		expect(row.textContent).toContain("Kitchen");
		expect(row.textContent).not.toContain("28:05:A5:11:22:33");
	});

	it("shows Online badge for an available device", async () => {
		const el = await fixture();
		el.availableDevices = [{ ...DEVICES[0], available: true }];
		await el.updateComplete;
		const badge = el.shadowRoot!.querySelector(
			'[data-testid="device-badge"]',
		) as HTMLElement;
		expect(badge).not.toBeNull();
		expect(badge.textContent).toContain("Online");
	});

	it("shows Offline badge for an unavailable device", async () => {
		const el = await fixture();
		el.availableDevices = [{ ...DEVICES[1], available: false }];
		await el.updateComplete;
		const badge = el.shadowRoot!.querySelector(
			'[data-testid="device-badge"]',
		) as HTMLElement;
		expect(badge).not.toBeNull();
		expect(badge.textContent).toContain("Offline");
	});

	it("renders 'no longer exists' badge for a missingSources entry", async () => {
		const el = await fixture();
		el.availableDevices = [];
		el.missingSources = MISSING_SOURCES;
		await el.updateComplete;
		const badge = el.shadowRoot!.querySelector(
			'[data-testid="device-badge"]',
		) as HTMLElement;
		expect(badge).not.toBeNull();
		expect(badge.textContent).toContain("no longer exists");
	});

	it("renders a device-row for each missingSources entry", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.missingSources = MISSING_SOURCES;
		await el.updateComplete;
		const rows = el.shadowRoot!.querySelectorAll('[data-testid="device-row"]');
		// 2 available + 1 missing
		expect(rows.length).toBe(3);
	});

	it("shows missing-warning when missingSources is non-empty", async () => {
		const el = await fixture();
		el.availableDevices = [];
		el.missingSources = MISSING_SOURCES;
		await el.updateComplete;
		const warning = el.shadowRoot!.querySelector(
			'[data-testid="missing-warning"]',
		);
		expect(warning).not.toBeNull();
		expect(warning!.textContent).toContain("no longer");
	});

	it("does not show missing-warning when missingSources is empty", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.missingSources = [];
		await el.updateComplete;
		const warning = el.shadowRoot!.querySelector(
			'[data-testid="missing-warning"]',
		);
		expect(warning).toBeNull();
	});

	it("emits source-toggled with { mac, on } when a device toggle fires value-changed", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.selectedMacs = ["AA"];
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("source-toggled", (e) => events.push(e as CustomEvent));

		emitValueChanged(toggle(el, "AA"), false);
		expect(events.length).toBe(1);
		expect(events[0].detail).toEqual({ mac: "AA", on: false });
	});

	it("emits source-toggled for a missing-source row toggle", async () => {
		const el = await fixture();
		el.availableDevices = [];
		el.missingSources = MISSING_SOURCES;
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("source-toggled", (e) => events.push(e as CustomEvent));

		emitValueChanged(toggle(el, "28:DEAD"), false);
		expect(events.length).toBe(1);
		expect(events[0].detail).toEqual({ mac: "28:DEAD", on: false });
	});

	it("puts device name before the toggle in document order", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const row = el.shadowRoot!.querySelector(
			'[data-testid="device-row"]',
		) as HTMLElement;
		const name = row.querySelector(".source-name") as HTMLElement;
		const tog = row.querySelector(
			'[data-testid="device-toggle"]',
		) as HTMLElement;
		expect(name).not.toBeNull();
		expect(
			name.compareDocumentPosition(tog) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("uses epp-toggle for device toggles", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const toggles = el.shadowRoot!.querySelectorAll(
			'epp-toggle[data-testid="device-toggle"]',
		);
		expect(toggles.length).toBe(2);
	});

	// Keep last: registering HA elements is global for the test environment, so
	// this exercises the ha-switch branch inside epp-toggle while every test
	// above covers the checkbox fallback.
	it("uses ha-switch (via epp-toggle) when ha-switch is registered", async () => {
		if (!customElements.get("ha-switch")) {
			customElements.define("ha-switch", class extends HTMLElement {});
		}
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const toggleEls = [
			...el.shadowRoot!.querySelectorAll(
				'epp-toggle[data-testid="device-toggle"]',
			),
		] as (HTMLElement & { updateComplete: Promise<unknown> })[];
		expect(toggleEls.length).toBe(2);
		for (const t of toggleEls) {
			await t.updateComplete;
			expect(t.shadowRoot!.querySelector("ha-switch")).not.toBeNull();
		}
	});
});
