import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../eppgrid-card.js";
import {
	__resetEntitySuggestionCache,
	applyCardDefaults,
	type EppGridCard,
	getEntitySuggestion,
} from "../eppgrid-card.js";

// A calibrated snapshot so the map renders (parseConfig needs a perspective).
// NOTE: parseCalibration requires exactly 8 numbers — [1, 0, 0, 0, 1, 0, 0, 0]
// is the identity-like 8-element form used throughout the test suite.
const CALIBRATED = {
	calibration: {
		perspective: [1, 0, 0, 0, 1, 0, 0, 0],
		room_width: 3000,
		room_depth: 3000,
	},
};

// Each test uses a UNIQUE device_id — the OverviewStore registry is a
// module-level singleton that persists across tests in this file.
function makeHass() {
	let cb: ((msg: unknown) => void) | undefined;
	const subscribeMessage = vi.fn(async (c: (msg: unknown) => void) => {
		cb = c;
		return vi.fn();
	});
	return {
		hass: { connection: { subscribeMessage }, locale: { language: "en" } },
		emit: (m: unknown) => cb?.(m),
		subscribeMessage,
	};
}

async function mount(
	config: any,
	h = makeHass(),
	snapshot: unknown = CALIBRATED,
): Promise<EppGridCard> {
	const el = document.createElement("eppgrid-card") as EppGridCard;
	el.setConfig(config);
	el.hass = h.hass as never;
	document.body.appendChild(el);
	await el.updateComplete;
	h.emit({ snapshot });
	await el.updateComplete;
	return el;
}

afterEach(() => document.body.replaceChildren());

describe("applyCardDefaults", () => {
	it("returns all defaults when no config is provided", () => {
		const result = applyCardDefaults({});
		expect(result.type).toBe("custom:eppgrid-card");
		expect(result.device_id).toBe("");
		expect(result.show_map).toBe(true);
		expect(result.show_sensors).toBe(true);
		expect(result.layout).toBe("horizontal");
		expect(result.show_furniture).toBe(true);
		expect(result.show_overlays).toBe(true);
		// presence absent → all five true
		expect(result.sensors.presence.occupancy).toBe(true);
		expect(result.sensors.presence.static_presence).toBe(true);
		expect(result.sensors.presence.motion_presence).toBe(true);
		expect(result.sensors.presence.target_presence).toBe(true);
		expect(result.sensors.presence.mmwave).toBe(true);
		expect(result.sensors.zones).toBe(true);
		expect(result.sensors.environmental.temperature).toBe(true);
		expect(result.sensors.environmental.humidity).toBe(true);
		expect(result.sensors.environmental.illuminance).toBe(true);
		expect(result.sensors.environmental.co2).toBe(true);
	});

	it("preserves show_map: false", () => {
		const result = applyCardDefaults({ show_map: false });
		expect(result.show_map).toBe(false);
	});

	it("returns all env keys true when sensors.environmental is absent", () => {
		const result = applyCardDefaults({ sensors: {} });
		expect(result.sensors.environmental.temperature).toBe(true);
		expect(result.sensors.environmental.humidity).toBe(true);
		expect(result.sensors.environmental.illuminance).toBe(true);
		expect(result.sensors.environmental.co2).toBe(true);
	});

	it("returns all presence keys true when sensors.presence is absent", () => {
		const result = applyCardDefaults({ sensors: {} });
		expect(result.sensors.presence.occupancy).toBe(true);
		expect(result.sensors.presence.static_presence).toBe(true);
		expect(result.sensors.presence.motion_presence).toBe(true);
		expect(result.sensors.presence.target_presence).toBe(true);
		expect(result.sensors.presence.mmwave).toBe(true);
	});

	it("returns only occupancy true when presence has only occupancy: true", () => {
		const result = applyCardDefaults({
			sensors: { presence: { occupancy: true } },
		});
		expect(result.sensors.presence.occupancy).toBe(true);
		expect(result.sensors.presence.static_presence).toBe(false);
		expect(result.sensors.presence.motion_presence).toBe(false);
		expect(result.sensors.presence.target_presence).toBe(false);
		expect(result.sensors.presence.mmwave).toBe(false);
	});

	it("returns only temperature true when environmental has only temperature: true", () => {
		const result = applyCardDefaults({
			sensors: { environmental: { temperature: true } },
		});
		expect(result.sensors.environmental.temperature).toBe(true);
		expect(result.sensors.environmental.humidity).toBe(false);
		expect(result.sensors.environmental.illuminance).toBe(false);
		expect(result.sensors.environmental.co2).toBe(false);
	});

	it("preserves device_id", () => {
		const result = applyCardDefaults({ device_id: "my-device" });
		expect(result.device_id).toBe("my-device");
	});
});

describe("eppgrid-card setConfig", () => {
	it("renders a placeholder when no device_id is configured", async () => {
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({ type: "custom:eppgrid-card" } as any);
		const h = makeHass();
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".placeholder")).toBeTruthy();
		expect(el.shadowRoot!.querySelector("epp-grid")).toBeNull();
	});

	it("renders a placeholder when both map and sensors are disabled", async () => {
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "d",
			show_map: false,
			show_sensors: false,
		} as any);
		const h = makeHass();
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".placeholder")).toBeTruthy();
		expect(el.shadowRoot!.querySelector("epp-grid")).toBeNull();
		expect(el.shadowRoot!.querySelector("epp-live-sidebar")).toBeNull();
	});

	it("registers the card type in window.customCards", () => {
		const entry = (window as any).customCards?.find(
			(c: any) => c.type === "eppgrid-card",
		);
		expect(entry).toBeTruthy();
		expect(entry.name).toContain("Everything Presence Pro Grid");
	});
});

describe("eppgrid-card rendering", () => {
	it("renders only the map when show_sensors is false", async () => {
		const el = await mount({
			type: "custom:eppgrid-card",
			device_id: "card-map",
			show_sensors: false,
		});
		expect(el.shadowRoot!.querySelector("epp-grid")).toBeTruthy();
		expect(el.shadowRoot!.querySelector("epp-live-sidebar")).toBeNull();
	});

	it("renders only the sensors when show_map is false", async () => {
		const el = await mount({
			type: "custom:eppgrid-card",
			device_id: "card-sensors",
			show_map: false,
		});
		expect(el.shadowRoot!.querySelector("epp-grid")).toBeNull();
		expect(el.shadowRoot!.querySelector("epp-live-sidebar")).toBeTruthy();
	});

	it("shows the uncalibrated placeholder when the snapshot has no perspective", async () => {
		const el = await mount(
			{ type: "custom:eppgrid-card", device_id: "card-uncal" },
			makeHass(),
			{},
		);
		expect(el.shadowRoot!.querySelector("epp-grid")).toBeNull();
		expect(el.shadowRoot!.querySelector(".placeholder")).toBeTruthy();
	});

	it("subscribes once via the store and updates on snapshot/data", async () => {
		const h = makeHass();
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "card-sub" });
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		expect(h.subscribeMessage).toHaveBeenCalledTimes(1);
		h.emit({ snapshot: CALIBRATED });
		h.emit({
			targets: [],
			sensors: {
				occupancy: true,
				illuminance: null,
				temperature: null,
				humidity: null,
				co2: null,
			},
			zones: { occupancy: {}, target_counts: {}, frame_count: 1 },
		});
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector("epp-grid")).toBeTruthy();
		expect(el.shadowRoot!.querySelector("epp-live-sidebar")).toBeTruthy();
	});

	it("getGridOptions adapts to the configured parts", () => {
		const both = document.createElement("eppgrid-card") as EppGridCard;
		both.setConfig({ type: "custom:eppgrid-card", device_id: "card-grid-a" });
		const sensorsOnly = document.createElement("eppgrid-card") as EppGridCard;
		sensorsOnly.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-grid-b",
			show_map: false,
		});
		expect(both.getGridOptions().columns).toBeGreaterThan(
			sensorsOnly.getGridOptions().columns,
		);
	});

	it("getCardSize returns larger size for map-only than sensors-only", () => {
		const mapOnly = document.createElement("eppgrid-card") as EppGridCard;
		mapOnly.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-cs-map",
			show_sensors: false,
		});
		const sensorsOnly = document.createElement("eppgrid-card") as EppGridCard;
		sensorsOnly.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-cs-sensors",
			show_map: false,
		});
		// map adds 6, sensors-only adds 4 to the base of 1
		expect(mapOnly.getCardSize()).toBe(7);
		expect(sensorsOnly.getCardSize()).toBe(5);
	});

	it("getConfigElement and getStubConfig return expected values", () => {
		// Import EppGridCard class via customElements registry (avoids importing the class directly)
		const CardClass = customElements.get("eppgrid-card") as typeof EppGridCard;
		const editor = CardClass.getConfigElement();
		expect(editor.tagName.toLowerCase()).toBe("eppgrid-card-editor");
		const stub = CardClass.getStubConfig();
		expect(stub).toHaveProperty("device_id", "");
	});

	it("hass getter returns the assigned hass object", () => {
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "card-getter" });
		const h = makeHass();
		el.hass = h.hass as never;
		expect(el.hass).toBe(h.hass);
	});

	it("shows offline banner when data.available is false", async () => {
		const h = makeHass();
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "card-offline" });
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		h.emit({ available: false });
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".offline")).toBeTruthy();
	});

	it("passes envKeys to epp-live-sidebar when sensors.environmental is configured", async () => {
		const el = await mount(
			{
				type: "custom:eppgrid-card",
				device_id: "card-envkeys",
				show_map: false,
				sensors: { environmental: { temperature: true, co2: false } },
			},
			makeHass(),
			CALIBRATED,
		);
		const sidebar = el.shadowRoot!.querySelector("epp-live-sidebar") as any;
		expect(sidebar).toBeTruthy();
		// envKeys should only include the true entries
		expect(sidebar.envKeys).toEqual(["temperature"]);
	});

	it("passes presenceKeys=null to epp-live-sidebar when sensors.presence is absent", async () => {
		const el = await mount(
			{
				type: "custom:eppgrid-card",
				device_id: "card-preskeys-null",
				show_map: false,
			},
			makeHass(),
			CALIBRATED,
		);
		const sidebar = el.shadowRoot!.querySelector("epp-live-sidebar") as any;
		expect(sidebar).toBeTruthy();
		expect(sidebar.presenceKeys).toBeNull();
	});

	it("passes presenceKeys=['occupancy'] when only occupancy is true", async () => {
		const el = await mount(
			{
				type: "custom:eppgrid-card",
				device_id: "card-preskeys-occ",
				show_map: false,
				sensors: { presence: { occupancy: true } },
			},
			makeHass(),
			CALIBRATED,
		);
		const sidebar = el.shadowRoot!.querySelector("epp-live-sidebar") as any;
		expect(sidebar).toBeTruthy();
		expect(sidebar.presenceKeys).toEqual(["occupancy"]);
	});

	it("passes presenceKeys=[] when all presence keys are false", async () => {
		const el = await mount(
			{
				type: "custom:eppgrid-card",
				device_id: "card-preskeys-empty",
				show_map: false,
				sensors: { presence: {} },
			},
			makeHass(),
			CALIBRATED,
		);
		const sidebar = el.shadowRoot!.querySelector("epp-live-sidebar") as any;
		expect(sidebar).toBeTruthy();
		expect(sidebar.presenceKeys).toEqual([]);
	});
});

describe("getEntitySuggestion", () => {
	beforeEach(() => __resetEntitySuggestionCache());

	it("returns null when the entity device_id is not in the EPP set", async () => {
		// Warm the cache with a device list that does NOT include "other-device"
		const hass = {
			callWS: vi
				.fn()
				.mockResolvedValue([{ device_id: "dev1", mac: "AA", name: "X" }]),
			entities: { "binary_sensor.other": { device_id: "other-device" } },
		};
		getEntitySuggestion(hass, "binary_sensor.other"); // kick off load
		// flush microtasks so the promise resolves
		await new Promise((r) => setTimeout(r, 0));
		expect(getEntitySuggestion(hass, "binary_sensor.other")).toBeNull();
	});

	it("returns null when the entity has no registry entry or no device_id", async () => {
		const hass = {
			callWS: vi
				.fn()
				.mockResolvedValue([{ device_id: "dev1", mac: "AA", name: "X" }]),
			entities: {},
		};
		getEntitySuggestion(hass, "binary_sensor.unknown"); // kick off load
		await new Promise((r) => setTimeout(r, 0));
		expect(getEntitySuggestion(hass, "binary_sensor.unknown")).toBeNull();
	});

	it("returns null on first call then suggests the card after the cache warms", async () => {
		const hass = {
			callWS: vi
				.fn()
				.mockResolvedValue([{ device_id: "dev1", mac: "AA", name: "X" }]),
			entities: { "binary_sensor.epp_occupancy": { device_id: "dev1" } },
		};
		// First call: cache not yet populated → null
		const first = getEntitySuggestion(hass, "binary_sensor.epp_occupancy");
		expect(first).toBeNull();
		// Flush microtasks so callWS resolves and cache populates
		await new Promise((r) => setTimeout(r, 0));
		// Second call: cache populated → suggest the card
		const second = getEntitySuggestion(hass, "binary_sensor.epp_occupancy");
		expect(second).toEqual({
			config: { type: "custom:eppgrid-card", device_id: "dev1" },
		});
	});

	it("returns null and does not throw when hass has no callWS", () => {
		const hass = {
			entities: { "binary_sensor.epp_occupancy": { device_id: "dev1" } },
		};
		expect(() =>
			getEntitySuggestion(hass, "binary_sensor.epp_occupancy"),
		).not.toThrow();
		expect(getEntitySuggestion(hass, "binary_sensor.epp_occupancy")).toBeNull();
	});
});
