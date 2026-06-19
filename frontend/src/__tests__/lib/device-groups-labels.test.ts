import { describe, expect, it } from "vitest";
import {
	exposedSensorChips,
	PRESENCE_LABELS,
	presenceCoverage,
	zoneRowLabel,
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

describe("presenceCoverage", () => {
	it("splits sources into providers and missing by slot", () => {
		const cov = presenceCoverage("occupancy", [
			{ name: "Sensor 1", enabled_presence: ["occupancy"] },
			{ name: "Sensor 2", enabled_presence: ["static_presence"] },
		]);
		expect(cov).toEqual({ provided: ["Sensor 1"], missing: ["Sensor 2"] });
	});

	it("a source providing the slot is never also listed as missing", () => {
		const cov = presenceCoverage("static_presence", [
			{ name: "A", enabled_presence: ["static_presence", "occupancy"] },
			{ name: "B", enabled_presence: ["static_presence"] },
		]);
		expect(cov.provided).toEqual(["A", "B"]);
		expect(cov.missing).toEqual([]);
	});

	it("preserves source order in both lists", () => {
		const cov = presenceCoverage("motion_presence", [
			{ name: "First", enabled_presence: [] },
			{ name: "Second", enabled_presence: ["motion_presence"] },
			{ name: "Third", enabled_presence: [] },
		]);
		expect(cov.provided).toEqual(["Second"]);
		expect(cov.missing).toEqual(["First", "Third"]);
	});

	it("no sources -> empty coverage", () => {
		expect(presenceCoverage("occupancy", [])).toEqual({
			provided: [],
			missing: [],
		});
	});
});

describe("zoneRowLabel", () => {
	it("joins zone and device with a middot separator", () => {
		expect(zoneRowLabel("Bed", "Sensor 1")).toBe("Bed · Sensor 1");
	});
});
