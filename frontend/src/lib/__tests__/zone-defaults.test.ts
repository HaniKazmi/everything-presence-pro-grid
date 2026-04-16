import { describe, expect, it } from "vitest";
import {
	getZoneThresholds,
	resolveZone0Params,
	ZONE_COLORS,
	ZONE_TYPE_DEFAULTS,
	type Zone0Config,
	type ZoneConfig,
} from "../zone-defaults.js";

describe("ZONE_TYPE_DEFAULTS", () => {
	it("has all three zone types", () => {
		expect(ZONE_TYPE_DEFAULTS).toHaveProperty("normal");
		expect(ZONE_TYPE_DEFAULTS).toHaveProperty("thoroughfare");
		expect(ZONE_TYPE_DEFAULTS).toHaveProperty("rest");
	});

	it("each type has trigger, renew, timeout, handoff_timeout", () => {
		for (const type of ["normal", "thoroughfare", "rest"]) {
			const d = ZONE_TYPE_DEFAULTS[type];
			expect(d.trigger).toBeTypeOf("number");
			expect(d.renew).toBeTypeOf("number");
			expect(d.timeout).toBeTypeOf("number");
			expect(d.handoff_timeout).toBeTypeOf("number");
		}
	});

	it("normal type has expected defaults", () => {
		expect(ZONE_TYPE_DEFAULTS.normal).toEqual({
			trigger: 5,
			renew: 3,
			timeout: 10,
			handoff_timeout: 3,
		});
	});
});

describe("ZONE_COLORS", () => {
	it("has 7 entries", () => {
		expect(ZONE_COLORS).toHaveLength(7);
	});

	it("all entries are hex color strings", () => {
		for (const color of ZONE_COLORS) {
			expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
		}
	});
});

describe("getZoneThresholds", () => {
	const emptyConfigs: (ZoneConfig | null)[] = new Array(7).fill(null);

	it("zone 0 normal: returns normal defaults", () => {
		const result = getZoneThresholds(0, emptyConfigs, "normal", 5, 3, 10, 3);
		expect(result).toEqual({
			trigger: 5,
			renew: 3,
			timeout: 10,
			handoffTimeout: 3,
		});
	});

	it("zone 0 custom: uses provided custom values", () => {
		const result = getZoneThresholds(0, emptyConfigs, "custom", 8, 2, 15, 5);
		expect(result).toEqual({
			trigger: 8,
			renew: 2,
			timeout: 15,
			handoffTimeout: 5,
		});
	});

	it("named zone with normal type: returns normal defaults", () => {
		const configs: (ZoneConfig | null)[] = [
			{
				name: "Zone 1",
				color: "#E69F00",
				type: "normal",
			},
			...new Array(6).fill(null),
		];
		const result = getZoneThresholds(1, configs, "normal", 5, 3, 10, 3);
		expect(result).toEqual({
			trigger: 5,
			renew: 3,
			timeout: 10,
			handoffTimeout: 3,
		});
	});

	it("named zone with custom type: uses custom overrides", () => {
		const configs: (ZoneConfig | null)[] = [
			null,
			{
				name: "Zone 2",
				color: "#009E73",
				type: "custom",
				trigger: 9,
				renew: 1,
				timeout: 60,
				handoff_timeout: 20,
			},
			...new Array(5).fill(null),
		];
		const result = getZoneThresholds(2, configs, "normal", 5, 3, 10, 3);
		expect(result).toEqual({
			trigger: 9,
			renew: 1,
			timeout: 60,
			handoffTimeout: 20,
		});
	});

	it("named zone with custom type: falls back to normal defaults for undefined fields", () => {
		const configs: (ZoneConfig | null)[] = [
			{
				name: "Zone 1",
				color: "#E69F00",
				type: "custom",
				// No trigger, renew, timeout, handoff_timeout set
			},
			...new Array(6).fill(null),
		];
		const result = getZoneThresholds(1, configs, "normal", 5, 3, 10, 3);
		// Falls back to ZONE_TYPE_DEFAULTS.normal values
		expect(result.trigger).toBe(5);
		expect(result.renew).toBe(3);
		expect(result.timeout).toBe(10);
		expect(result.handoffTimeout).toBe(3);
	});

	it("null config for named zone: returns fallback defaults", () => {
		const result = getZoneThresholds(3, emptyConfigs, "normal", 5, 3, 10, 3);
		expect(result).toEqual({
			trigger: 5,
			renew: 3,
			timeout: 10,
			handoffTimeout: 3,
		});
	});

	it("out-of-range zone id: returns fallback defaults", () => {
		const result = getZoneThresholds(99, emptyConfigs, "normal", 5, 3, 10, 3);
		expect(result).toEqual({
			trigger: 5,
			renew: 3,
			timeout: 10,
			handoffTimeout: 3,
		});
	});

	it("rest zone type: returns rest defaults", () => {
		const configs: (ZoneConfig | null)[] = [
			{
				name: "Bedroom",
				color: "#F0E442",
				type: "rest",
			},
			...new Array(6).fill(null),
		];
		const result = getZoneThresholds(1, configs, "normal", 5, 3, 10, 3);
		expect(result).toEqual({
			trigger: 7,
			renew: 1,
			timeout: 30,
			handoffTimeout: 10,
		});
	});
});

describe("resolveZone0Params", () => {
	it("non-custom type with no user fields: returns the type's defaults", () => {
		const z0: Zone0Config = { type: "rest" };
		expect(resolveZone0Params(z0)).toEqual({
			type: "rest",
			trigger: 7,
			renew: 1,
			timeout: 30,
			handoff_timeout: 10,
		});
	});

	it("non-custom type with user fields set: IGNORES user fields, returns type defaults", () => {
		const z0: Zone0Config = {
			type: "rest",
			trigger: 1,
			renew: 9,
			timeout: 999,
			handoff_timeout: 42,
		};
		expect(resolveZone0Params(z0)).toEqual({
			type: "rest",
			trigger: 7,
			renew: 1,
			timeout: 30,
			handoff_timeout: 10,
		});
	});

	it("non-custom thoroughfare type: returns thoroughfare defaults", () => {
		const z0: Zone0Config = { type: "thoroughfare" };
		expect(resolveZone0Params(z0)).toEqual({
			type: "thoroughfare",
			trigger: 3,
			renew: 2,
			timeout: 3,
			handoff_timeout: 1,
		});
	});

	it("custom type with all user fields: returns user values", () => {
		const z0: Zone0Config = {
			type: "custom",
			trigger: 8,
			renew: 2,
			timeout: 15,
			handoff_timeout: 5,
		};
		expect(resolveZone0Params(z0)).toEqual({
			type: "custom",
			trigger: 8,
			renew: 2,
			timeout: 15,
			handoff_timeout: 5,
		});
	});

	it("custom type with partial user fields: missing fields fall back to normal defaults", () => {
		const z0: Zone0Config = {
			type: "custom",
			trigger: 8,
			// renew, timeout, handoff_timeout unset
		};
		expect(resolveZone0Params(z0)).toEqual({
			type: "custom",
			trigger: 8,
			renew: ZONE_TYPE_DEFAULTS.normal.renew,
			timeout: ZONE_TYPE_DEFAULTS.normal.timeout,
			handoff_timeout: ZONE_TYPE_DEFAULTS.normal.handoff_timeout,
		});
	});

	it("custom type with no user fields: all fields fall back to normal defaults", () => {
		const z0: Zone0Config = { type: "custom" };
		expect(resolveZone0Params(z0)).toEqual({
			type: "custom",
			trigger: ZONE_TYPE_DEFAULTS.normal.trigger,
			renew: ZONE_TYPE_DEFAULTS.normal.renew,
			timeout: ZONE_TYPE_DEFAULTS.normal.timeout,
			handoff_timeout: ZONE_TYPE_DEFAULTS.normal.handoff_timeout,
		});
	});

	it("preserves the original zone type in the return value", () => {
		const z0: Zone0Config = { type: "normal" };
		expect(resolveZone0Params(z0).type).toBe("normal");
	});
});
