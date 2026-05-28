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
