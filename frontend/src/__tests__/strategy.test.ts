import { describe, expect, it } from "vitest";
import { EPPGridStrategy } from "../strategy.js";

describe("EPPGridStrategy", () => {
	it("generates a two-view dashboard config", async () => {
		const config = await EPPGridStrategy.generate();
		expect(config.views).toHaveLength(2);
		expect(config.views[0].title).toBe("Device Configuration");
		expect(config.views[0].cards).toEqual([{ type: "custom:epp-device-card" }]);
		expect(config.views[1].title).toBe("Flash Firmware");
		expect(config.views[1].cards).toEqual([
			{ type: "custom:epp-flasher-card" },
		]);
	});
});
