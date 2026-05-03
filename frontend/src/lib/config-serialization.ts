import type { FurnitureItem } from "./furniture.js";
import {
	GRID_CELL_COUNT,
	initGridFromRoom,
	MAX_ZONES,
	NUM_ZONE_SLOTS,
} from "./grid.js";
import {
	ZONE_TYPE_KEYS,
	type Zone0Config,
	type ZoneConfig,
} from "./zone-defaults.js";

// Coerce an unknown stored `type` to a valid key. Pre-0.95 layouts used
// "normal"/"thoroughfare"/"rest" — those (and anything else unrecognised)
// fall through to "default" so the <select> has a matching option.
function normalizeType(raw: unknown): Zone0Config["type"] {
	return ZONE_TYPE_KEYS.includes(raw as Zone0Config["type"])
		? (raw as Zone0Config["type"])
		: "default";
}

/**
 * Parsed calibration data from config.
 */
export interface ParsedCalibration {
	perspective: number[] | null;
	roomWidth: number;
	roomDepth: number;
}

/**
 * Parsed settings data from config.
 */
export interface ParsedSettings {
	temperatureOffset: number;
	humidityOffset: number;
	illuminanceOffset: number;
	motionTimeout: number;
	targetAutoDistance: boolean;
	targetMaxDistance: number;
	staticAutoDistance: boolean;
	staticMinDistance: number;
	staticMaxDistance: number;
	staticTriggerThreshold: number;
	staticRenewThreshold: number;
	staticTimeout: number;
	staticOnDelay: number;
	entities: Record<string, boolean>;
	logLevels: Record<string, string>;
	ledMode: string;
	ledBrightness: number;
	ledPresenceColor: string;
	relayTriggerMode: string;
	relayContactMode: string;
	targetUpdateRateMs: number;
	zoneUpdateRateMs: number;
}

/**
 * Full parsed config result — pure data, no side effects.
 */
export interface ParsedConfig {
	calibration: ParsedCalibration;
	furniture: FurnitureItem[];
	grid: Uint8Array;
	zone0: Zone0Config;
	zoneConfigs: (ZoneConfig | null)[];
	settings: ParsedSettings;
}

/**
 * Parse calibration from raw config object.
 *
 * @param config Raw config object from backend
 * @returns Parsed calibration data
 */
export function parseCalibration(config: any): ParsedCalibration {
	const cal = config?.calibration;
	const persp = cal?.perspective;
	const valid =
		Array.isArray(persp) &&
		persp.length === 8 &&
		persp.every((c) => typeof c === "number" && Number.isFinite(c)) &&
		persp.some((c) => Math.abs(c) > 1e-9);
	if (valid && cal.room_width > 0) {
		return {
			perspective: persp,
			roomWidth: cal.room_width || 0,
			roomDepth: cal.room_depth || 0,
		};
	}
	return { perspective: null, roomWidth: 0, roomDepth: 0 };
}

/**
 * Parse furniture items from raw layout data, applying defaults for missing fields.
 *
 * @param rawFurniture Raw furniture array from layout
 * @returns Parsed furniture items with all fields filled
 */
function toFiniteNumber(v: unknown, fallback: number): number {
	const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
	return Number.isFinite(n) ? n : fallback;
}

function toPositiveSize(v: unknown, fallback: number): number {
	const n = toFiniteNumber(v, fallback);
	return n > 0 ? n : fallback;
}

function toNonEmptyString(v: unknown, fallback: string): string {
	if (typeof v === "string" && v.length > 0) return v;
	if (typeof v === "number" && Number.isFinite(v)) return String(v);
	return fallback;
}

export function parseFurniture(rawFurniture: any[]): FurnitureItem[] {
	return (rawFurniture || []).map((f: any, i: number) => {
		const rawType = toNonEmptyString(f?.type, "icon");
		const type: "icon" | "svg" = rawType === "svg" ? "svg" : "icon";
		return {
			id: toNonEmptyString(f?.id, `f_load_${i}`),
			type,
			icon: toNonEmptyString(f?.icon, "mdi:help"),
			label: toNonEmptyString(f?.label, "Item"),
			x: toFiniteNumber(f?.x, 0),
			y: toFiniteNumber(f?.y, 0),
			width: toPositiveSize(f?.width, 600),
			height: toPositiveSize(f?.height, 600),
			rotation: toFiniteNumber(f?.rotation, 0),
			lockAspect:
				typeof f?.lockAspect === "boolean" ? f.lockAspect : type !== "svg",
		};
	});
}

/**
 * Parse the grid from layout data, or initialize from room dimensions.
 *
 * @param layout Raw layout object
 * @param roomWidth Room width in mm
 * @param roomDepth Room depth in mm
 * @returns The grid Uint8Array
 */
export function parseGrid(
	layout: any,
	roomWidth: number,
	roomDepth: number,
): Uint8Array {
	if (layout?.grid_bytes && Array.isArray(layout.grid_bytes)) {
		return new Uint8Array(layout.grid_bytes);
	}
	if (roomWidth > 0 && roomDepth > 0) {
		return initGridFromRoom(roomWidth, roomDepth);
	}
	return new Uint8Array(GRID_CELL_COUNT);
}

/**
 * Parsed zone configurations: zone 0 (room boundary) and named zones 1-7.
 */
export interface ParsedZoneConfigs {
	zone0: Zone0Config;
	zones: (ZoneConfig | null)[];
}

/**
 * Parse zone configurations from layout data.
 *
 * `zone_slots` is a length-8 array: index 0 holds zone 0's settings
 * (`{ type, trigger?, renew?, timeout?, handoff_timeout? }`, no name/color);
 * indices 1-7 hold named zones (`ZoneConfig | null`).
 *
 * Fail-closed at the storage boundary: if the incoming data isn't exactly
 * length NUM_ZONE_SLOTS or slot 0 isn't an object, return the default shape
 * rather than risk silently shifting zone indices (e.g. legacy length-7
 * arrays where slot 0 was a named zone, not zone 0).
 *
 * @param layout Raw layout object (should contain a `zone_slots` array)
 * @returns Parsed zone 0 config plus MAX_ZONES named zone configs
 */
export function parseZoneConfigs(layout: any): ParsedZoneConfigs {
	const defaultResult: ParsedZoneConfigs = {
		zone0: { type: "default" },
		zones: Array(MAX_ZONES).fill(null),
	};
	const slots = layout?.zone_slots;
	if (!Array.isArray(slots) || slots.length !== NUM_ZONE_SLOTS) {
		return defaultResult;
	}
	if (!slots[0] || typeof slots[0] !== "object") {
		return defaultResult;
	}
	const zone0: Zone0Config = {
		type: normalizeType(slots[0].type),
		trigger: slots[0].trigger,
		renew: slots[0].renew,
		timeout: slots[0].timeout,
		handoff_timeout: slots[0].handoff_timeout,
	};
	const zones = Array.from({ length: MAX_ZONES }, (_, i) => {
		const s = slots[i + 1];
		if (!s || typeof s !== "object") return null;
		return { ...s, type: normalizeType(s.type) } as ZoneConfig;
	});
	return { zone0, zones };
}

/**
 * Parse settings from raw config object, applying defaults.
 *
 * @param raw Raw settings object (may be undefined)
 * @param entities Entity states from backend (may be undefined)
 * @returns Parsed settings with defaults applied
 */
export function parseSettings(
	raw: any,
	entities?: any,
	logLevels?: any,
): ParsedSettings {
	const s = raw || {};
	return {
		temperatureOffset: s.temperature_offset ?? 0,
		humidityOffset: s.humidity_offset ?? 0,
		illuminanceOffset: s.illuminance_offset ?? 0,
		motionTimeout: s.motion_timeout ?? 5,
		targetAutoDistance: s.target_auto_distance ?? true,
		targetMaxDistance: s.target_max_distance ?? 6,
		staticAutoDistance: s.static_auto_distance ?? true,
		staticMinDistance: s.static_min_distance ?? 0.3,
		staticMaxDistance: s.static_max_distance ?? 16,
		staticTriggerThreshold: s.static_trigger_threshold ?? 3,
		staticRenewThreshold: s.static_renew_threshold ?? 3,
		staticTimeout: s.static_timeout ?? 30,
		staticOnDelay: s.static_on_delay ?? 0,
		entities: entities || {},
		logLevels: logLevels ?? {},
		ledMode: s.led_mode ?? "Manual Control",
		ledBrightness: s.led_brightness ?? 1.0,
		ledPresenceColor: s.led_presence_color ?? "#CC33FF",
		relayTriggerMode: s.relay_trigger_mode ?? "disabled",
		relayContactMode: s.relay_contact_mode ?? "no",
		targetUpdateRateMs: s.target_update_rate_ms ?? 1000,
		zoneUpdateRateMs: s.zone_update_rate_ms ?? 1000,
	};
}

/**
 * Parse the full config object into structured data.
 * This is a pure function: no side effects, no DOM, no `this`.
 *
 * @param config Raw config from the backend
 * @returns ParsedConfig with all fields populated
 */
export function parseConfig(config: any): ParsedConfig {
	const calibration = parseCalibration(config);
	const layout = config?.room_layout || {};

	const furniture = parseFurniture(layout.furniture);
	const grid = parseGrid(layout, calibration.roomWidth, calibration.roomDepth);
	const { zone0, zones: zoneConfigs } = parseZoneConfigs(layout);

	return {
		calibration,
		furniture,
		grid,
		zone0,
		zoneConfigs,
		settings: parseSettings(
			config?.settings,
			config?.entities,
			config?.log_levels,
		),
	};
}
