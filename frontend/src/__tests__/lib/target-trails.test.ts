import { describe, expect, it } from "vitest";
import {
	createTrails,
	TRAIL_MAX,
	updateTrails,
} from "../../lib/target-trails.js";

const active = (x: number, y: number) => ({ x, y, status: "active" });

describe("target-trails", () => {
	it("createTrails returns N empty polylines", () => {
		expect(createTrails()).toEqual([[], [], []]);
		expect(createTrails(2)).toEqual([[], []]);
	});

	it("appends the active target position to its polyline", () => {
		const trails = createTrails();
		updateTrails(trails, [active(10, 20)]);
		updateTrails(trails, [active(11, 21)]);
		expect(trails[0]).toEqual([
			{ x: 10, y: 20 },
			{ x: 11, y: 21 },
		]);
	});

	it("caps a polyline at max, dropping oldest points", () => {
		const trails = createTrails(1);
		for (let i = 0; i < TRAIL_MAX + 5; i++)
			updateTrails(trails, [active(i, i)]);
		expect(trails[0].length).toBe(TRAIL_MAX);
		expect(trails[0][0]).toEqual({ x: 5, y: 5 });
	});

	it("clears a slot when its target is inactive or invalid", () => {
		const trails = createTrails(1);
		updateTrails(trails, [active(1, 1)]);
		updateTrails(trails, [{ x: null, y: null, status: "inactive" }]);
		expect(trails[0]).toEqual([]);
	});
});
