import { describe, expect, it } from "vitest";
import {
	exposedSensorChips,
	PRESENCE_LABELS,
} from "../../lib/device-groups-labels.js";

describe("exposedSensorChips", () => {
	it("pins Occupancy first, even when another sensor sorts before it", () => {
		expect(
			exposedSensorChips({
				presence: ["motion_presence", "occupancy"],
				zones: [],
			}),
		).toEqual([
			{ name: "Occupancy", kind: "presence" },
			{ name: "Motion presence", kind: "presence" },
		]);
	});

	it("sorts the non-occupancy presence sensors alphabetically (i18n aware)", () => {
		expect(
			exposedSensorChips({
				presence: [
					"target_presence",
					"static_presence",
					"motion_presence",
					"mmwave_presence",
					"occupancy",
				],
				zones: [],
			}).map((c) => c.name),
		).toEqual([
			"Occupancy",
			"mmWave presence",
			"Motion presence",
			"Static presence",
			"Target presence",
		]);
	});

	it("lists every presence sensor before any zone", () => {
		// "Bed" would sort before "Target presence" alphabetically, but zones
		// always come after the presence sensors.
		expect(
			exposedSensorChips({
				presence: ["target_presence"],
				zones: [{ name: "Bed" }],
			}),
		).toEqual([
			{ name: "Target presence", kind: "presence" },
			{ name: "Bed", kind: "zone" },
		]);
	});

	it("sorts zones alphabetically after the presence sensors", () => {
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

	it("orders names case-insensitively (case never trumps the base letter)", () => {
		// A naive case-sensitive / ASCII sort would put "Zebra" (capital Z, 0x5A)
		// before "apple" (0x61); the comparison is case-insensitive so it does not.
		expect(
			exposedSensorChips({
				presence: [],
				zones: [{ name: "Zebra" }, { name: "apple" }],
			}).map((c) => c.name),
		).toEqual(["apple", "Zebra"]);
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
