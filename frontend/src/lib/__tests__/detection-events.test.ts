import { describe, expect, it } from "vitest";
import { formatEvent } from "../detection-events.js";

// Resolvers mirroring the panel: zone 0 is the Room, named zones get "Zone N";
// targets are 0-based on the wire but presented 1-based.
const zoneName = (z: number) => (z === 0 ? "Room" : `Zone ${z}`);
const targetLabel = (t: number) => `Target ${t + 1}`;

// Stub localize: echo the key, and when params are present append them as JSON
// so tests can assert that resolved names/numbers were interpolated through.
const t = (k: string, p?: Record<string, unknown>) =>
	p ? `${k} ${JSON.stringify(p)}` : k;

describe("formatEvent", () => {
	it("maps sensor codes to their keys", () => {
		expect(formatEvent("sa", zoneName, targetLabel, t)).toBe(
			"live.events.static_active",
		);
		expect(formatEvent("sp", zoneName, targetLabel, t)).toBe(
			"live.events.static_fading",
		);
		expect(formatEvent("sc", zoneName, targetLabel, t)).toContain(
			"static_cleared",
		);
		expect(formatEvent("ma", zoneName, targetLabel, t)).toBe(
			"live.events.motion_active",
		);
		expect(formatEvent("mp", zoneName, targetLabel, t)).toBe(
			"live.events.motion_fading",
		);
		expect(formatEvent("mc", zoneName, targetLabel, t)).toContain(
			"motion_cleared",
		);
	});

	it("maps room and mmwave codes", () => {
		expect(formatEvent("oo", zoneName, targetLabel, t)).toBe(
			"live.events.room_occupied",
		);
		expect(formatEvent("of", zoneName, targetLabel, t)).toBe(
			"live.events.room_empty",
		);
		expect(formatEvent("wo", zoneName, targetLabel, t)).toBe(
			"live.events.mmwave_on",
		);
		expect(formatEvent("wf", zoneName, targetLabel, t)).toBe(
			"live.events.mmwave_off",
		);
	});

	it("resolves zone names for zone codes", () => {
		expect(formatEvent("zo:2", zoneName, targetLabel, t)).toContain(
			"zone_occupied",
		);
		expect(formatEvent("zo:2", zoneName, targetLabel, t)).toContain("Zone 2");
		expect(formatEvent("zp:1", zoneName, targetLabel, t)).toContain(
			"zone_clearing",
		);
		expect(formatEvent("zp:1", zoneName, targetLabel, t)).toContain("Zone 1");
		expect(formatEvent("zc:0", zoneName, targetLabel, t)).toContain(
			"zone_cleared",
		);
		expect(formatEvent("zc:0", zoneName, targetLabel, t)).toContain("Room");
	});

	it("resolves zone name for force-clear", () => {
		expect(formatEvent("fc:1", zoneName, targetLabel, t)).toContain(
			"force_clear",
		);
		expect(formatEvent("fc:1", zoneName, targetLabel, t)).toContain("Zone 1");
	});

	it("resolves target label + secs for stuck dismiss", () => {
		const out = formatEvent("td:0:60", zoneName, targetLabel, t);
		expect(out).toContain("stuck_dismiss");
		expect(out).toContain("Target 1");
		expect(out).toContain("60");
	});

	it("resolves target label + zone for entered", () => {
		const out = formatEvent("te:0:3", zoneName, targetLabel, t);
		expect(out).toContain("target_entered");
		expect(out).toContain("Target 1");
		expect(out).toContain("Zone 3");
	});

	it("resolves target label for left", () => {
		const out = formatEvent("tl:2", zoneName, targetLabel, t);
		expect(out).toContain("target_left");
		expect(out).toContain("Target 3");
	});

	it("resolves target label + both zones for moved", () => {
		const out = formatEvent("tm:1:0:2", zoneName, targetLabel, t);
		expect(out).toContain("target_moved");
		expect(out).toContain("Target 2");
		expect(out).toContain("Room");
		expect(out).toContain("Zone 2");
	});

	it("resolves count for dropped", () => {
		const out = formatEvent("xd:4", zoneName, targetLabel, t);
		expect(out).toContain("dropped");
		expect(out).toContain("4");
	});

	it("returns the raw code for an unknown head token", () => {
		expect(formatEvent("zz:9", zoneName, targetLabel, t)).toBe("zz:9");
		expect(formatEvent("", zoneName, targetLabel, t)).toBe("");
		expect(formatEvent("qqq", zoneName, targetLabel, t)).toBe("qqq");
	});
});
