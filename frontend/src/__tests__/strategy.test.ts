import { describe, expect, it } from "vitest";
import { EPPGridStrategy } from "../strategy.js";

describe("EPPGridStrategy", () => {
	it("generates a single-view dashboard with the device card", async () => {
		const config = await EPPGridStrategy.generate();
		expect(config.views).toHaveLength(1);
		expect(config.views[0].title).toBe("Everything Presence Pro Grid");
		expect(config.views[0].cards).toEqual([{ type: "custom:epp-device-card" }]);
	});
});
