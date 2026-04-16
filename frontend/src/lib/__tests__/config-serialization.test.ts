import { describe, expect, it } from "vitest";
import {
	parseCalibration,
	parseConfig,
	parseFurniture,
	parseGrid,
	parseSettings,
	parseZoneConfigs,
} from "../config-serialization.js";
import { cellIsInside, GRID_CELL_COUNT, MAX_ZONES } from "../grid.js";

describe("parseCalibration", () => {
	it("returns perspective and room dimensions when valid", () => {
		const config = {
			calibration: {
				perspective: [1, 0, 0, 0, 1, 0, 0, 0],
				room_width: 3000,
				room_depth: 4000,
			},
		};
		const result = parseCalibration(config);
		expect(result.perspective).toEqual([1, 0, 0, 0, 1, 0, 0, 0]);
		expect(result.roomWidth).toBe(3000);
		expect(result.roomDepth).toBe(4000);
	});

	it("returns null perspective when no calibration", () => {
		const result = parseCalibration({});
		expect(result.perspective).toBeNull();
		expect(result.roomWidth).toBe(0);
		expect(result.roomDepth).toBe(0);
	});

	it("returns null perspective when room_width is 0", () => {
		const config = {
			calibration: {
				perspective: [1, 0, 0, 0, 1, 0, 0, 0],
				room_width: 0,
				room_depth: 4000,
			},
		};
		const result = parseCalibration(config);
		expect(result.perspective).toBeNull();
	});

	it("returns null perspective when perspective is missing", () => {
		const config = {
			calibration: {
				room_width: 3000,
				room_depth: 4000,
			},
		};
		const result = parseCalibration(config);
		expect(result.perspective).toBeNull();
	});

	it("handles null config", () => {
		const result = parseCalibration(null);
		expect(result.perspective).toBeNull();
	});

	it("defaults room_depth to 0 when missing", () => {
		const config = {
			calibration: {
				perspective: [1, 0, 0, 0, 1, 0, 0, 0],
				room_width: 3000,
			},
		};
		const result = parseCalibration(config);
		expect(result.roomDepth).toBe(0);
	});
});

describe("parseFurniture", () => {
	it("parses valid furniture items", () => {
		const raw = [
			{
				id: "f1",
				type: "icon",
				icon: "mdi:sofa",
				label: "Sofa",
				x: 100,
				y: 200,
				width: 600,
				height: 400,
				rotation: 45,
				lockAspect: true,
			},
		];
		const result = parseFurniture(raw);
		expect(result).toHaveLength(1);
		expect(result[0]).toEqual(raw[0]);
	});

	it("applies defaults for missing fields", () => {
		const raw = [{}];
		const result = parseFurniture(raw);
		expect(result[0].id).toBe("f_load_0");
		expect(result[0].type).toBe("icon");
		expect(result[0].icon).toBe("mdi:help");
		expect(result[0].label).toBe("Item");
		expect(result[0].x).toBe(0);
		expect(result[0].y).toBe(0);
		expect(result[0].width).toBe(600);
		expect(result[0].height).toBe(600);
		expect(result[0].rotation).toBe(0);
		expect(result[0].lockAspect).toBe(true); // type !== "svg"
	});

	it("sets lockAspect false for svg type", () => {
		const raw = [{ type: "svg" }];
		const result = parseFurniture(raw);
		expect(result[0].lockAspect).toBe(false);
	});

	it("preserves explicit lockAspect", () => {
		const raw = [{ type: "svg", lockAspect: true }];
		const result = parseFurniture(raw);
		expect(result[0].lockAspect).toBe(true);
	});

	it("handles null/undefined input", () => {
		expect(parseFurniture(null as any)).toEqual([]);
		expect(parseFurniture(undefined as any)).toEqual([]);
	});

	it("generates sequential ids for items without id", () => {
		const raw = [{}, {}, {}];
		const result = parseFurniture(raw);
		expect(result[0].id).toBe("f_load_0");
		expect(result[1].id).toBe("f_load_1");
		expect(result[2].id).toBe("f_load_2");
	});

	it("preserves x=0 and y=0 explicitly set", () => {
		const raw = [{ x: 0, y: 0 }];
		const result = parseFurniture(raw);
		expect(result[0].x).toBe(0);
		expect(result[0].y).toBe(0);
	});
});

describe("parseGrid", () => {
	it("uses grid_bytes when available", () => {
		const bytes = new Array(GRID_CELL_COUNT).fill(0);
		bytes[0] = 1;
		bytes[5] = 3;
		const layout = { grid_bytes: bytes };
		const grid = parseGrid(layout, 3000, 3000);
		expect(grid[0]).toBe(1);
		expect(grid[5]).toBe(3);
		expect(grid.length).toBe(GRID_CELL_COUNT);
	});

	it("initializes from room dimensions when no grid_bytes", () => {
		const grid = parseGrid({}, 3000, 3000);
		let count = 0;
		for (let i = 0; i < GRID_CELL_COUNT; i++) {
			if (cellIsInside(grid[i])) count++;
		}
		expect(count).toBeGreaterThan(0);
	});

	it("returns empty grid when no grid_bytes and no room dimensions", () => {
		const grid = parseGrid({}, 0, 0);
		let count = 0;
		for (let i = 0; i < GRID_CELL_COUNT; i++) {
			if (cellIsInside(grid[i])) count++;
		}
		expect(count).toBe(0);
	});

	it("handles null layout", () => {
		const grid = parseGrid(null, 0, 0);
		expect(grid.length).toBe(GRID_CELL_COUNT);
	});

	it("ignores grid_bytes that is not an array", () => {
		const grid = parseGrid({ grid_bytes: "not-an-array" }, 3000, 3000);
		// Should fall through to initGridFromRoom
		let count = 0;
		for (let i = 0; i < GRID_CELL_COUNT; i++) {
			if (cellIsInside(grid[i])) count++;
		}
		expect(count).toBeGreaterThan(0);
	});
});

describe("parseZoneConfigs", () => {
	it("returns MAX_ZONES null entries and default zone0 for empty layout", () => {
		const result = parseZoneConfigs({});
		expect(result.zone0).toEqual({ type: "normal" });
		expect(result.zones).toHaveLength(MAX_ZONES);
		for (const z of result.zones) {
			expect(z).toBeNull();
		}
	});

	it("parses named zones from zone_slots indices 1-7", () => {
		const layout = {
			zone_slots: [
				null,
				{
					name: "Kitchen",
					color: "#FF0000",
					type: "custom",
					trigger: 3,
					renew: 2,
					timeout: 5,
					handoff_timeout: 1,
				},
			],
		};
		const result = parseZoneConfigs(layout);
		expect(result.zones[0]).toEqual({
			name: "Kitchen",
			color: "#FF0000",
			type: "custom",
			trigger: 3,
			renew: 2,
			timeout: 5,
			handoff_timeout: 1,
		});
		// Rest should be null
		for (let i = 1; i < MAX_ZONES; i++) {
			expect(result.zones[i]).toBeNull();
		}
	});

	it("handles null layout", () => {
		const result = parseZoneConfigs(null);
		expect(result.zone0).toEqual({ type: "normal" });
		expect(result.zones).toHaveLength(MAX_ZONES);
		for (const z of result.zones) {
			expect(z).toBeNull();
		}
	});

	it("defaults zone0.type to 'normal' when slot 0 has no type", () => {
		const layout = { zone_slots: [{}] };
		const result = parseZoneConfigs(layout);
		expect(result.zone0.type).toBe("normal");
	});
});

describe("parseZoneConfigs (length 8)", () => {
	it("parses zone 0 from slot 0", () => {
		const layout = {
			zone_slots: [
				{
					type: "rest",
					trigger: 7,
					renew: 1,
					timeout: 30,
					handoff_timeout: 10,
				},
				{
					name: "Living",
					color: "#ff0000",
					type: "normal",
					trigger: 5,
					renew: 3,
					timeout: 10,
					handoff_timeout: 3,
				},
				null,
				null,
				null,
				null,
				null,
				null,
			],
		};
		const result = parseZoneConfigs(layout);
		expect(result.zone0).toEqual({
			type: "rest",
			trigger: 7,
			renew: 1,
			timeout: 30,
			handoff_timeout: 10,
		});
		expect(result.zones[0]?.name).toBe("Living");
		expect(result.zones).toHaveLength(7);
	});
});

describe("parseSettings", () => {
	it("returns defaults when settings is undefined", () => {
		const s = parseSettings(undefined);
		expect(s.temperatureOffset).toBe(0);
		expect(s.humidityOffset).toBe(0);
		expect(s.illuminanceOffset).toBe(0);
		expect(s.motionTimeout).toBe(5);
		expect(s.targetAutoDistance).toBe(true);
		expect(s.targetMaxDistance).toBe(6);
		expect(s.staticAutoDistance).toBe(true);
		expect(s.staticMinDistance).toBe(0.3);
		expect(s.staticMaxDistance).toBe(16);
		expect(s.staticTriggerThreshold).toBe(3);
		expect(s.staticRenewThreshold).toBe(3);
		expect(s.staticTimeout).toBe(30);
		expect(s.staticOnDelay).toBe(0);
		expect(s.entities).toEqual({});
	});

	it("reads values from settings object", () => {
		const s = parseSettings({
			temperature_offset: -1.5,
			humidity_offset: 2.0,
			illuminance_offset: -10,
			motion_timeout: 10,
			target_auto_distance: false,
			target_max_distance: 4,
			static_auto_distance: false,
			static_min_distance: 1,
			static_max_distance: 8,
			static_trigger_threshold: 5,
			static_renew_threshold: 4,
			static_timeout: 60,
			static_on_delay: 2,
		});
		expect(s.temperatureOffset).toBe(-1.5);
		expect(s.humidityOffset).toBe(2.0);
		expect(s.illuminanceOffset).toBe(-10);
		expect(s.motionTimeout).toBe(10);
		expect(s.targetAutoDistance).toBe(false);
		expect(s.targetMaxDistance).toBe(4);
		expect(s.staticAutoDistance).toBe(false);
		expect(s.staticMinDistance).toBe(1);
		expect(s.staticMaxDistance).toBe(8);
		expect(s.staticTriggerThreshold).toBe(5);
		expect(s.staticRenewThreshold).toBe(4);
		expect(s.staticTimeout).toBe(60);
		expect(s.staticOnDelay).toBe(2);
	});

	it("passes entities from separate argument", () => {
		const s = parseSettings({}, { room_occupancy: true, room_presence: false });
		expect(s.entities).toEqual({ room_occupancy: true, room_presence: false });
	});

	it("parses log_levels from third argument", () => {
		const result = parseSettings({ temperature_offset: 0 }, undefined, {
			epp: "Debug",
			system: "Warning",
		});
		expect(result.logLevels).toEqual({ epp: "Debug", system: "Warning" });
	});

	it("defaults logLevels to empty object", () => {
		const result = parseSettings({});
		expect(result.logLevels).toEqual({});
	});

	it("returns LED defaults when not present", () => {
		const result = parseSettings({});
		expect(result.ledMode).toBe("Manual Control");
		expect(result.ledBrightness).toBe(1.0);
		expect(result.ledPresenceColor).toBe("#CC33FF");
	});

	it("parses LED settings from raw", () => {
		const result = parseSettings({
			led_mode: "Presence",
			led_brightness: 0.8,
			led_presence_color: "#00FF00",
		});
		expect(result.ledMode).toBe("Presence");
		expect(result.ledBrightness).toBe(0.8);
		expect(result.ledPresenceColor).toBe("#00FF00");
	});

	it("defaults relayTriggerMode to disabled when not set", () => {
		const s = parseSettings(undefined);
		expect(s.relayTriggerMode).toBe("disabled");
	});

	it("defaults relayContactMode to no when not set", () => {
		const s = parseSettings(undefined);
		expect(s.relayContactMode).toBe("no");
	});

	it("reads relayTriggerMode from settings object", () => {
		const s = parseSettings({ relay_trigger_mode: "motion" });
		expect(s.relayTriggerMode).toBe("motion");
	});

	it("reads relayContactMode from settings object", () => {
		const s = parseSettings({ relay_contact_mode: "nc" });
		expect(s.relayContactMode).toBe("nc");
	});
});

describe("parseConfig", () => {
	it("parses a complete config", () => {
		const config = {
			calibration: {
				perspective: [1, 0, 100, 0, 1, 200, 0, 0],
				room_width: 3000,
				room_depth: 4000,
			},
			room_layout: {
				furniture: [{ icon: "mdi:table", label: "Table" }],
				grid_bytes: new Array(GRID_CELL_COUNT).fill(0),
				zone_slots: [{ type: "rest" }, { name: "Zone A" }],
			},
			settings: {
				temperature_offset: 5,
				motion_timeout: 10,
			},
			entities: { room_occupancy: true },
		};
		const result = parseConfig(config);
		expect(result.calibration.perspective).toEqual([
			1, 0, 100, 0, 1, 200, 0, 0,
		]);
		expect(result.calibration.roomWidth).toBe(3000);
		expect(result.furniture).toHaveLength(1);
		expect(result.grid.length).toBe(GRID_CELL_COUNT);
		expect(result.zoneConfigs[0]!.name).toBe("Zone A");
		expect(result.zone0.type).toBe("rest");
		expect(result.settings.temperatureOffset).toBe(5);
		expect(result.settings.motionTimeout).toBe(10);
		expect(result.settings.entities).toEqual({ room_occupancy: true });
	});

	it("handles minimal config", () => {
		const result = parseConfig({});
		expect(result.calibration.perspective).toBeNull();
		expect(result.furniture).toEqual([]);
		expect(result.grid.length).toBe(GRID_CELL_COUNT);
		expect(result.zoneConfigs.every((z) => z === null)).toBe(true);
		expect(result.zone0.type).toBe("normal");
		expect(result.settings.temperatureOffset).toBe(0);
		expect(result.settings.motionTimeout).toBe(5);
		expect(result.settings.entities).toEqual({});
	});

	it("handles null config", () => {
		const result = parseConfig(null);
		expect(result.calibration.perspective).toBeNull();
		expect(result.furniture).toEqual([]);
	});

	it("initializes grid from room dimensions when no grid_bytes", () => {
		const config = {
			calibration: {
				perspective: [1, 0, 0, 0, 1, 0, 0, 0],
				room_width: 3000,
				room_depth: 3000,
			},
		};
		const result = parseConfig(config);
		let count = 0;
		for (let i = 0; i < GRID_CELL_COUNT; i++) {
			if (cellIsInside(result.grid[i])) count++;
		}
		expect(count).toBeGreaterThan(0);
	});
});
