import { describe, expect, it } from "vitest";
import {
	type DeviceGroupSourceState,
	deriveExposedEntities,
	type ZoneState,
} from "../lib/device-groups-projection.js";
import { REST_OF_ROOM_ID, REST_OF_ROOM_NAME } from "../types.js";

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
			{ kind: "group", id: "g1", name: "Zone Bed", available: false },
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
			{ kind: "group", id: "g1", name: "Zone Bed", available: true },
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
			{ kind: "group", id: "g1", name: "Zone Bed", available: false },
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
			{ kind: "group", id: "g1", name: "Zone Bed", available: true },
		]);
	});
});

describe("deriveExposedEntities — exclusions", () => {
	it("removes excluded presence slots from the union", () => {
		const result = deriveExposedEntities(
			[source("AA", "Left", ["occupancy", "static_presence"], [])],
			[],
			{ presence: ["static_presence"] },
		);
		expect(result.presence).toEqual(["occupancy"]);
	});

	it("removes an excluded passthrough zone by (mac, index)", () => {
		const result = deriveExposedEntities(
			[
				source(
					"AA",
					"Left",
					[],
					[
						{ index: 1, name: "Keep", enabled: true },
						{ index: 2, name: "Drop", enabled: true },
					],
				),
			],
			[],
			{ zones: [{ mac: "AA", zone_index: 2 }] },
		);
		expect(result.zones.map((z) => z.name)).toEqual(["Keep"]);
	});

	it("an excluded passthrough does not trigger collision prefixing on the survivor", () => {
		// Two "Desk" zones would normally both get a source prefix; once one is
		// excluded the remaining one is unique again and keeps its bare name.
		const result = deriveExposedEntities(
			[
				source("AA", "Left", [], [{ index: 2, name: "Desk", enabled: true }]),
				source("BB", "Right", [], [{ index: 3, name: "Desk", enabled: true }]),
			],
			[],
			{ zones: [{ mac: "BB", zone_index: 3 }] },
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

	it("an excluded zone group is omitted and its members are NOT resurfaced", () => {
		// Cross-phase contract: grouped_keys is built from ALL zone_groups, so an
		// excluded group's members stay suppressed (they do not fall back to
		// passthroughs). Matches the Python projection.
		const result = deriveExposedEntities(
			[source("AA", "Left", [], [{ index: 2, name: "Bed L", enabled: true }])],
			[{ id: "g1", name: "Bed", members: [{ mac: "AA", zone_index: 2 }] }],
			{ zoneGroups: ["g1"] },
		);
		expect(result.zones).toEqual([]);
	});
});

describe("deriveExposedEntities — combined Rest of room", () => {
	it("emits one RoR group (first) when any source has zone 0 enabled", () => {
		const result = deriveExposedEntities(
			[
				source("AA", "Left", [], [
					{ index: 0, name: "Rest of room", enabled: true },
					{ index: 1, name: "Bed", enabled: true },
				]),
				source("BB", "Right", [], [
					{ index: 0, name: "Rest of room", enabled: false },
				]),
			],
			[],
		);
		expect(result.zones).toEqual([
			{
				kind: "group",
				id: REST_OF_ROOM_ID,
				name: REST_OF_ROOM_NAME,
				available: true,
			},
			{
				kind: "passthrough",
				mac: "AA",
				zone_index: 1,
				name: "Bed",
				available: true,
			},
		]);
	});

	it("RoR available=false when every source's zone 0 is disabled", () => {
		const result = deriveExposedEntities(
			[source("AA", "Left", [], [{ index: 0, name: "Rest", enabled: false }])],
			[],
		);
		expect(result.zones).toEqual([
			{
				kind: "group",
				id: REST_OF_ROOM_ID,
				name: REST_OF_ROOM_NAME,
				available: false,
			},
		]);
	});

	it("no RoR group when no source has a zone 0 at all", () => {
		const result = deriveExposedEntities(
			[source("AA", "Left", [], [{ index: 2, name: "Desk", enabled: true }])],
			[],
		);
		expect(result.zones.some((z) => "id" in z && z.id === REST_OF_ROOM_ID)).toBe(
			false,
		);
	});

	it("RoR omitted when rest_of_room is in excluded.zoneGroups", () => {
		const result = deriveExposedEntities(
			[source("AA", "Left", [], [{ index: 0, name: "Rest", enabled: true }])],
			[],
			{ zoneGroups: [REST_OF_ROOM_ID] },
		);
		expect(result.zones).toEqual([]);
	});

	it("zone 0 is never a passthrough (only ever feeds RoR)", () => {
		const result = deriveExposedEntities(
			[source("AA", "Left", [], [{ index: 0, name: "Rest", enabled: true }])],
			[],
		);
		expect(result.zones.every((z) => z.kind !== "passthrough")).toBe(true);
	});
});
