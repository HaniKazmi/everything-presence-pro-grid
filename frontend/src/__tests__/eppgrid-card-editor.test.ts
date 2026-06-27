import { afterEach, describe, expect, it, vi } from "vitest";
import * as CardModule from "../eppgrid-card.js";
import "../eppgrid-card-editor.js";
import type { EppGridCardEditor } from "../eppgrid-card-editor.js";
import { buildSchema } from "../eppgrid-card-editor.js";

afterEach(() => document.body.replaceChildren());

describe("eppgrid-card-editor", () => {
	it("loads the device list from the overview ws command", async () => {
		const callWS = vi.fn(async () => [
			{ device_id: "d1", name: "Living Room", mac: "AA" },
		]);
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "" } as any);
		el.hass = { callWS, locale: { language: "en" } } as any;
		document.body.appendChild(el);
		await el.updateComplete;
		await Promise.resolve();
		expect(callWS).toHaveBeenCalledWith({
			type: "eppgrid/overview/list_devices",
		});
	});

	it("re-emits value-changed as config-changed and stops propagation", () => {
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "d1" } as any);
		const got = vi.fn();
		el.addEventListener("config-changed", (e: any) => got(e.detail.config));
		const stop = vi.fn();
		el._valueChanged({
			stopPropagation: stop,
			detail: {
				value: { type: "custom:eppgrid-card", device_id: "d1", title: "X" },
			},
		} as any);
		expect(stop).toHaveBeenCalled();
		expect(got).toHaveBeenCalledWith(expect.objectContaining({ title: "X" }));
	});

	it("re-enables a part when the user turns both off", () => {
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "d1" } as any);
		const got = vi.fn();
		el.addEventListener("config-changed", (e: any) => got(e.detail.config));
		el._valueChanged({
			stopPropagation: vi.fn(),
			detail: {
				value: {
					type: "custom:eppgrid-card",
					device_id: "d1",
					show_map: false,
					show_sensors: false,
				},
			},
		} as any);
		const cfg = got.mock.calls.at(-1)![0];
		expect(cfg.show_map || cfg.show_sensors).toBe(true);
	});

	it("exposes hass via getter after it is set", () => {
		const callWS = vi.fn(async () => []);
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		const hassObj = { callWS, locale: { language: "en" } } as any;
		el.hass = hassObj;
		expect(el.hass).toBe(hassObj);
	});

	it("handles callWS errors gracefully and leaves devices empty", async () => {
		const callWS = vi.fn(async () => {
			throw new Error("network error");
		});
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "" } as any);
		el.hass = { callWS, locale: { language: "en" } } as any;
		document.body.appendChild(el);
		await el.updateComplete;
		await Promise.resolve();
		// No crash; callWS was called
		expect(callWS).toHaveBeenCalled();
	});

	it("does not re-fetch devices when already loaded", async () => {
		let callCount = 0;
		const callWS = vi.fn(async () => {
			callCount += 1;
			return [{ device_id: "d1", name: "Room", mac: "BB" }];
		});
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "" } as any);
		const hassObj = { callWS, locale: { language: "en" } } as any;
		el.hass = hassObj;
		document.body.appendChild(el);
		await el.updateComplete;
		// Wait for first fetch to complete
		await Promise.resolve();
		await Promise.resolve();
		const countAfterFirst = callCount;
		// Setting hass again should not trigger a second fetch (devices already loaded)
		el.hass = hassObj;
		await Promise.resolve();
		expect(callCount).toBe(countAfterFirst);
	});

	it("renders nothing before hass or config are set", async () => {
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		document.body.appendChild(el);
		await el.updateComplete;
		// No hass/config — render guard returns nothing, no error
		expect(el.shadowRoot?.children.length ?? 0).toBe(0);
	});

	it("auto-selects first device when config has no device_id", async () => {
		const callWS = vi.fn(async () => [
			{ device_id: "d1", name: "Room", mac: "AA" },
		]);
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "" } as any);
		const fired = vi.fn();
		el.addEventListener("config-changed", (e: any) => fired(e.detail.config));
		el.hass = { callWS, locale: { language: "en" } } as any;
		document.body.appendChild(el);
		await el.updateComplete;
		await Promise.resolve();
		await Promise.resolve();
		expect(fired).toHaveBeenCalled();
		expect(fired.mock.calls.at(-1)![0].device_id).toBe("d1");
	});

	it("_computeLabel returns localized label for known key", async () => {
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.hass = {
			callWS: vi.fn(async () => []),
			locale: { language: "en" },
		} as any;
		const result = (el as any)._computeLabel({ name: "show_map" });
		expect(result).toBe("Show map");
	});

	it("_computeLabel falls back to raw name for unknown key", async () => {
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.hass = {
			callWS: vi.fn(async () => []),
			locale: { language: "en" },
		} as any;
		const result = (el as any)._computeLabel({ name: "unknown_field_xyz" });
		expect(result).toBe("unknown_field_xyz");
	});

	it("buildSchema has presence as a nested expandable with five boolean keys", () => {
		const schema = buildSchema([]) as any[];
		const sensorsEntry = schema.find((s: any) => s.name === "sensors");
		expect(sensorsEntry).toBeTruthy();
		const presenceEntry = sensorsEntry.schema.find(
			(s: any) => s.name === "presence",
		);
		expect(presenceEntry).toBeTruthy();
		expect(presenceEntry.type).toBe("expandable");
		const presenceKeys = presenceEntry.schema.map((s: any) => s.name);
		expect(presenceKeys).toEqual([
			"occupancy",
			"static_presence",
			"motion_presence",
			"target_presence",
			"mmwave",
		]);
		// each is a boolean selector
		for (const item of presenceEntry.schema) {
			expect(item.selector).toEqual({ boolean: {} });
		}
	});

	it("passes defaulted config to form (show_map true when omitted)", async () => {
		// Spy on applyCardDefaults to verify the editor calls it
		const spy = vi.spyOn(CardModule, "applyCardDefaults");

		const callWS = vi.fn(async () => []);
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "d1" } as any);
		el.hass = { callWS, locale: { language: "en" } } as any;
		document.body.appendChild(el);
		await el.updateComplete;
		await Promise.resolve();

		// Verify the spy was called with the config
		expect(spy).toHaveBeenCalledWith(
			expect.objectContaining({ device_id: "d1" }),
		);

		// Verify the spy's return value had show_map: true
		const result = spy.mock.results[spy.mock.results.length - 1]?.value;
		expect(result?.show_map).toBe(true);

		spy.mockRestore();
	});
});
