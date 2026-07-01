import { describe, expect, it } from "vitest";
import { parseFurniture } from "../../lib/config-serialization.js";

describe("parseFurniture text labels", () => {
	it("round-trips a text item's fields", () => {
		const [item] = parseFurniture([
			{
				type: "text",
				text: "Kids' corner",
				fontFamily: "georgia",
				fontSize: 250,
				color: "#112233",
				bold: true,
				italic: true,
				align: "left",
				background: "#ffffff",
				x: 100,
				y: 200,
				width: 800,
				height: 300,
				rotation: 0,
			},
		]);
		expect(item.type).toBe("text");
		expect(item.text).toBe("Kids' corner");
		expect(item.fontFamily).toBe("georgia");
		expect(item.fontSize).toBe(250);
		expect(item.color).toBe("#112233");
		expect(item.bold).toBe(true);
		expect(item.italic).toBe(true);
		expect(item.align).toBe("left");
		expect(item.background).toBe("#ffffff");
	});

	it("applies defaults / sanitizes bad text fields", () => {
		const [item] = parseFurniture([
			{
				type: "text",
				text: "x",
				fontFamily: "wingdings",
				fontSize: 999999,
				color: "red",
				align: "justify",
				background: "not-a-color",
				x: 0,
				y: 0,
				width: 10,
				height: 10,
			},
		]);
		expect(item.fontFamily).toBe("arial"); // unknown -> default
		expect(item.fontSize).toBe(3000); // clamped to max
		expect(item.color).toBeUndefined(); // invalid -> unset (themed)
		expect(item.align).toBe("center"); // invalid -> default
		expect(item.background).toBeUndefined();
	});

	it("leaves icon items without text fields (BWC)", () => {
		const [item] = parseFurniture([
			{ type: "icon", icon: "mdi:desk", x: 0, y: 0, width: 600, height: 600 },
		]);
		expect(item.type).toBe("icon");
		expect(item.text).toBeUndefined();
		expect(item.fontFamily).toBeUndefined();
	});

	it("truncates over-long text on load (corrupted/hand-edited blob)", () => {
		const [item] = parseFurniture([
			{
				type: "text",
				text: "x".repeat(1000),
				x: 0,
				y: 0,
				width: 10,
				height: 10,
			},
		]);
		expect(item.text?.length).toBe(512);
	});
});
