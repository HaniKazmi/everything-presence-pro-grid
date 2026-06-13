import { describe, expect, it } from "vitest";
import {
	exposedSensorChips,
	PRESENCE_LABELS,
} from "../../lib/device-groups-labels.js";

describe("exposedSensorChips", () => {
	it("labels presence slots, names zones, and sorts the combined list", () => {
		expect(
			exposedSensorChips({
				presence: ["occupancy"],
				zones: [{ name: "Zone Window" }, { name: "Zone Bed" }],
			}),
		).toEqual([
			{ name: "Occupancy", kind: "presence" },
			{ name: "Zone Bed", kind: "zone" },
			{ name: "Zone Window", kind: "zone" },
		]);
	});

	it("sorts zone names numerically (Zone 2 before Zone 10)", () => {
		expect(
			exposedSensorChips({
				presence: [],
				zones: [{ name: "Zone 10" }, { name: "Zone 2" }],
			}).map((c) => c.name),
		).toEqual(["Zone 2", "Zone 10"]);
	});

	it("falls back to the raw slot key for an unknown presence slot", () => {
		expect(exposedSensorChips({ presence: ["weird_slot"], zones: [] })).toEqual(
			[{ name: "weird_slot", kind: "presence" }],
		);
	});

	it("exposes a label for every known presence slot", () => {
		expect(PRESENCE_LABELS.mmwave_presence).toBe("mmWave presence");
	});
});
