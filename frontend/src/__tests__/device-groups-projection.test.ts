import { describe, expect, it } from "vitest";
import {
	type DeviceGroupSourceState,
	deriveExposedEntities,
	type ZoneState,
} from "../lib/device-groups-projection.js";

function source(
	mac: string,
	name: string,
	enabledPresence: string[],
	zones: ZoneState[],
): DeviceGroupSourceState {
	return {
		mac,
		name,
		available: true,
		enabled_presence: enabledPresence,
		zones,
	};
}

describe("deriveExposedEntities — presence", () => {
	it("empty sources -> nothing", () => {
		expect(deriveExposedEntities([], [])).toEqual({ presence: [], zones: [] });
	});

	it("union of enabled presence across sources (canonical order)", () => {
		const result = deriveExposedEntities(
			[
				source("AA", "Left", ["occupancy"], []),
				source("BB", "Right", ["occupancy", "static_presence"], []),
			],
			[],
		);
		expect(result.presence).toEqual(["occupancy", "static_presence"]);
	});
});

describe("deriveExposedEntities — zones", () => {
	it("unmerged zones pass through with their name", () => {
		const result = deriveExposedEntities(
			[source("AA", "Left", [], [{ index: 2, name: "Desk", enabled: true }])],
			[],
		);
		expect(result.zones).toEqual([
			{
				kind: "passthrough",
				mac: "AA",
				zone_index: 2,
				name: "Desk",
				available: true,
			},
		]);
	});

	it("name collisions get source-name prefix", () => {
		const result = deriveExposedEntities(
			[
				source("AA", "Left", [], [{ index: 2, name: "Desk", enabled: true }]),
				source("BB", "Right", [], [{ index: 3, name: "Desk", enabled: true }]),
			],
			[],
		);
		const names = result.zones.map((z) => z.name).sort();
		expect(names).toEqual(["Left Desk", "Right Desk"]);
	});

	it("passthrough zones are sorted by index within a source", () => {
		const result = deriveExposedEntities(
			[
				source(
					"AA",
					"Left",
					[],
					[
						{ index: 3, name: "Far", enabled: true },
						{ index: 1, name: "Near", enabled: true },
					],
				),
			],
			[],
		);
		expect(result.zones.map((z) => z.name)).toEqual(["Near", "Far"]);
	});

	it("disabled zones are not exposed as passthroughs", () => {
		const result = deriveExposedEntities(
			[
				source(
					"AA",
					"Left",
					[],
					[
						{ index: 1, name: "On", enabled: true },
						{ index: 2, name: "Off", enabled: false },
					],
				),
			],
			[],
		);
		expect(result.zones.map((z) => z.name)).toEqual(["On"]);
	});

	it("a group whose members are all disabled is exposed as unavailable", () => {
		const result = deriveExposedEntities(
			[source("AA", "Left", [], [{ index: 2, name: "Bed L", enabled: false }])],
			[{ id: "g1", name: "Bed", members: [{ mac: "AA", zone_index: 2 }] }],
		);
		expect(result.zones).toEqual([
			{ kind: "group", id: "g1", name: "Bed", available: false },
		]);
	});

	it("a group member pointing at an unknown source is ignored", () => {
		const result = deriveExposedEntities(
			[source("AA", "Left", [], [{ index: 2, name: "Bed L", enabled: true }])],
			[
				{
					id: "g1",
					name: "Bed",
					members: [
						{ mac: "AA", zone_index: 2 },
						{ mac: "ZZ", zone_index: 9 },
					],
				},
			],
		);
		expect(result.zones).toEqual([
			{ kind: "group", id: "g1", name: "Bed", available: true },
		]);
	});

	it("a group member pointing at a non-existent zone index does not enable the group", () => {
		const result = deriveExposedEntities(
			[source("AA", "Left", [], [{ index: 2, name: "Bed L", enabled: true }])],
			[{ id: "g1", name: "Bed", members: [{ mac: "AA", zone_index: 99 }] }],
		);
		// The group is unavailable (its only member resolves to no real zone),
		// and the real zone 2 — never actually grouped — still passes through.
		expect(result.zones).toEqual([
			{ kind: "group", id: "g1", name: "Bed", available: false },
			{
				kind: "passthrough",
				mac: "AA",
				zone_index: 2,
				name: "Bed L",
				available: true,
			},
		]);
	});

	it("a zone in a group is excluded from passthroughs", () => {
		const result = deriveExposedEntities(
			[
				source("AA", "Left", [], [{ index: 2, name: "Bed L", enabled: true }]),
				source("BB", "Right", [], [{ index: 3, name: "Bed R", enabled: true }]),
			],
			[
				{
					id: "g1",
					name: "Bed",
					members: [
						{ mac: "AA", zone_index: 2 },
						{ mac: "BB", zone_index: 3 },
					],
				},
			],
		);
		expect(result.zones).toEqual([
			{ kind: "group", id: "g1", name: "Bed", available: true },
		]);
	});
});
