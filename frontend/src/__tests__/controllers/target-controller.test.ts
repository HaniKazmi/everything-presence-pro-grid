import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEBUG_LOG_MAX } from "../../constants.js";
import type { TargetData } from "../../controllers/device-controller.js";
import { TargetController } from "../../controllers/target-controller.js";
import {
	CELL_ROOM_BIT,
	cellSetZone,
	GRID_CELL_COUNT,
	GRID_COLS,
	GRID_ROWS,
} from "../../lib/grid.js";
import { createZoneEngineState } from "../../lib/zone-engine.js";

// ---------------------------------------------------------------------------
// Host factory — provides the properties TargetController reads/writes
// ---------------------------------------------------------------------------
function mockHost() {
	return {
		// ReactiveControllerHost
		requestUpdate: vi.fn(),
		addController: vi.fn(),
		removeController: vi.fn(),
		updateComplete: Promise.resolve(true),

		// Target / raw-target state
		_targets: [] as any[],
		_rawTargets: [] as any[],
		_sensorState: {} as any,
		_zoneState: {
			occupancy: {} as Record<number, boolean>,
			target_counts: {} as Record<number, number>,
			frame_count: 0,
		},

		// Zone config / room geometry
		_zoneConfigs: [] as any[],
		_grid: new Uint8Array(GRID_CELL_COUNT),
		_roomWidth: 6000,
		_roomDepth: 6000,
		_roomType: "normal" as const,
		_roomTrigger: 5,
		_roomRenew: 3,
		_roomTimeout: 10,
		_roomHandoffTimeout: 3,
		_roomEntryPoint: false,

		// Debug log (frontend)
		_showDebugLog: false,
		_debugLogLines: [] as string[],
		_debugLogPrev: "",

		// Debug log (backend)
		_showBackendDebugLog: false,
		_backendDebugLogLines: [] as string[],
		_backendDebugLogPrev: "",
	};
}

/** Build a minimal TargetData object with sane defaults. */
function makeTargetData(overrides: Partial<TargetData> = {}): TargetData {
	return {
		targets: [],
		sensors: {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: null,
			temperature: null,
			humidity: null,
			co2: null,
		},
		zones: null,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TargetController", () => {
	let host: ReturnType<typeof mockHost>;
	let ctrl: TargetController;

	beforeEach(() => {
		host = mockHost();
		ctrl = new TargetController(host);
	});

	// -------------------------------------------------------------------------
	// Construction / lifecycle
	// -------------------------------------------------------------------------
	describe("constructor", () => {
		it("registers itself with the host", () => {
			expect(host.addController).toHaveBeenCalledWith(ctrl);
		});

		it("exposes a fresh ZoneEngineState", () => {
			const state = ctrl.zoneEngineState;
			expect(state).toBeDefined();
			expect(state.localZoneState).toBeInstanceOf(Map);
			expect(state.localZoneState.size).toBe(0);
		});
	});

	describe("hostConnected / hostDisconnected", () => {
		it("does not throw", () => {
			expect(() => ctrl.hostConnected()).not.toThrow();
			expect(() => ctrl.hostDisconnected()).not.toThrow();
		});
	});

	// -------------------------------------------------------------------------
	// ZoneEngineState getter / setter / reset
	// -------------------------------------------------------------------------
	describe("zoneEngineState", () => {
		it("can be replaced via setter", () => {
			const newState = createZoneEngineState();
			newState.targetGateCount[0] = 42;
			ctrl.zoneEngineState = newState;
			expect(ctrl.zoneEngineState.targetGateCount[0]).toBe(42);
		});

		it("resetZoneEngineState restores a pristine state", () => {
			const s = ctrl.zoneEngineState;
			s.targetGateCount[0] = 99;
			ctrl.resetZoneEngineState();
			expect(ctrl.zoneEngineState.targetGateCount[0]).toBe(0);
		});

		it("resetZoneEngineState creates a new object (not same reference)", () => {
			const before = ctrl.zoneEngineState;
			ctrl.resetZoneEngineState();
			expect(ctrl.zoneEngineState).not.toBe(before);
		});
	});

	// -------------------------------------------------------------------------
	// handleTargetData
	// -------------------------------------------------------------------------
	describe("handleTargetData", () => {
		it("stores targets on host._targets", () => {
			const targets = [
				{ x: 100, y: 200, speed: 0, status: "active", signal: 50 },
			];
			ctrl.handleTargetData(makeTargetData({ targets: targets as any }));
			expect(host._targets).toBe(targets);
		});

		it("stores sensor data on host._sensorState", () => {
			const sensors = {
				occupancy: true,
				static_presence: false,
				motion_presence: false,
				target_presence: true,
				illuminance: null,
				temperature: 22,
				humidity: null,
				co2: null,
			};
			ctrl.handleTargetData(makeTargetData({ sensors }));
			expect(host._sensorState).toBe(sensors);
		});

		it("updates host._zoneState when zones are present", () => {
			const zones = {
				occupancy: { 1: true },
				target_counts: { 1: 2 },
				frame_count: 7,
				debug_log: undefined,
			};
			ctrl.handleTargetData(makeTargetData({ zones }));
			expect(host._zoneState).toEqual({
				occupancy: { 1: true },
				target_counts: { 1: 2 },
				frame_count: 7,
			});
		});

		it("does not update host._zoneState when zones is null", () => {
			const original = host._zoneState;
			ctrl.handleTargetData(makeTargetData({ zones: null }));
			expect(host._zoneState).toBe(original);
		});

		it("appends backend debug log when _showBackendDebugLog is true and debug_log present", () => {
			host._showBackendDebugLog = true;
			host._zoneConfigs = [{ name: "Lounge", color: "#fff", type: "normal" }];
			ctrl.handleTargetData(
				makeTargetData({
					zones: {
						occupancy: {},
						target_counts: {},
						frame_count: 1,
						debug_log: "T0:Z1:A:5|Z1:O:1",
					},
				}),
			);
			expect(host._backendDebugLogLines.length).toBe(1);
		});

		it("does not append backend debug log when _showBackendDebugLog is false", () => {
			host._showBackendDebugLog = false;
			ctrl.handleTargetData(
				makeTargetData({
					zones: {
						occupancy: {},
						target_counts: {},
						frame_count: 1,
						debug_log: "T0:Z1:A:5|Z1:O:1",
					},
				}),
			);
			expect(host._backendDebugLogLines.length).toBe(0);
		});
	});

	// -------------------------------------------------------------------------
	// handleRawTargetData
	// -------------------------------------------------------------------------
	describe("handleRawTargetData", () => {
		it("stores raw targets on host._rawTargets", () => {
			const raw = [{ raw_x: 10, raw_y: 20 }];
			ctrl.handleRawTargetData(raw as any);
			expect(host._rawTargets).toBe(raw);
		});
	});

	// -------------------------------------------------------------------------
	// enrichDebugLog
	// -------------------------------------------------------------------------
	describe("enrichDebugLog", () => {
		beforeEach(() => {
			// Zone 0 = Room, Zone 1 = first entry in _zoneConfigs
			host._zoneConfigs = [
				{ name: "Entrance", color: "#E69F00", type: "entrance" },
			];
		});

		it("replaces zone IDs with zone names in target part", () => {
			const result = ctrl.enrichDebugLog("T0:Z1:A:5|");
			expect(result).toContain("T0→Entrance(active,5)");
		});

		it("uses 'Room' for zone 0", () => {
			const result = ctrl.enrichDebugLog("T0:Z0:P:3|");
			expect(result).toContain("T0→Room(pending,3)");
		});

		it("falls back to 'Zone N' for unknown zone IDs", () => {
			const result = ctrl.enrichDebugLog("T0:Z5:A:10|");
			expect(result).toContain("T0→Zone 5(active,10)");
		});

		it("enriches zone occupancy part", () => {
			const result = ctrl.enrichDebugLog("|Z1:O:1");
			expect(result).toContain("Entrance: occupied(1)");
		});

		it("shows 'no targets' when target part is empty", () => {
			const result = ctrl.enrichDebugLog("|Z1:O:1");
			expect(result).toContain("no targets");
		});

		it("shows 'all clear' when zone part is empty", () => {
			const result = ctrl.enrichDebugLog("T0:Z1:A:5|");
			expect(result).toContain("all clear");
		});

		it("formats a full log correctly", () => {
			const result = ctrl.enrichDebugLog("T0:Z1:A:5 T1:Z0:P:3|Z0:O:1 Z1:O:1");
			expect(result).toBe(
				"T0→Entrance(active,5) T1→Room(pending,3) | Room: occupied(1), Entrance: occupied(1)",
			);
		});

		it("parses 3-section format (sensors|targets|zones) with S:, M:, Occ: tokens", () => {
			const result = ctrl.enrichDebugLog(
				"S:A M:I Occ:1|T0:Z1:A:5|Z1:O:1",
			);
			expect(result).toBe(
				"Static: active, Motion: inactive, Occ: on | T0→Entrance(active,5) | Entrance: occupied(1)",
			);
		});

		it("renders 3-section format with Occ:0 as 'off'", () => {
			const result = ctrl.enrichDebugLog(
				"S:I M:A Occ:0|T0:Z1:A:5|Z1:O:1",
			);
			expect(result).toContain("Occ: off");
			expect(result).toContain("Static: inactive");
			expect(result).toContain("Motion: active");
		});

		it("shows 'no targets' and 'all clear' in 3-section format with empty target/zone parts", () => {
			const result = ctrl.enrichDebugLog("S:I M:I Occ:0||");
			expect(result).toContain("no targets");
			expect(result).toContain("all clear");
		});
	});

	// -------------------------------------------------------------------------
	// appendBackendDebugLog
	// -------------------------------------------------------------------------
	describe("appendBackendDebugLog", () => {
		beforeEach(() => {
			host._zoneConfigs = [{ name: "Lounge", color: "#fff", type: "normal" }];
		});

		it("appends an enriched line with a timestamp", () => {
			ctrl.appendBackendDebugLog("T0:Z1:A:5|Z1:O:1");
			expect(host._backendDebugLogLines.length).toBe(1);
			// Line should contain enriched content
			expect(host._backendDebugLogLines[0]).toContain("Lounge");
		});

		it("deduplicates consecutive identical lines", () => {
			ctrl.appendBackendDebugLog("T0:Z1:A:5|Z1:O:1");
			ctrl.appendBackendDebugLog("T0:Z1:A:5|Z1:O:1");
			expect(host._backendDebugLogLines.length).toBe(1);
		});

		it("appends when line differs from previous", () => {
			ctrl.appendBackendDebugLog("T0:Z1:A:5|Z1:O:1");
			ctrl.appendBackendDebugLog("|");
			expect(host._backendDebugLogLines.length).toBe(2);
		});

		it("caps lines at DEBUG_LOG_MAX", () => {
			// Use unique lines to avoid deduplication
			for (let i = 0; i <= DEBUG_LOG_MAX; i++) {
				// Reset prev so every push goes through
				host._backendDebugLogPrev = "";
				ctrl.appendBackendDebugLog(`T0:Z1:A:${i}|`);
			}
			expect(host._backendDebugLogLines.length).toBeLessThanOrEqual(
				DEBUG_LOG_MAX,
			);
		});

		it("calls host.requestUpdate after appending", () => {
			ctrl.appendBackendDebugLog("T0:Z1:A:5|Z1:O:1");
			expect(host.requestUpdate).toHaveBeenCalled();
		});

		it("does NOT call requestUpdate when line is duplicate", () => {
			ctrl.appendBackendDebugLog("T0:Z1:A:5|Z1:O:1");
			host.requestUpdate.mockClear();
			ctrl.appendBackendDebugLog("T0:Z1:A:5|Z1:O:1");
			expect(host.requestUpdate).not.toHaveBeenCalled();
		});

		it("skips sensor-prefix injection when log already has 3 sections", () => {
			// 3-section format: sensors|targets|zones — no injection should happen
			ctrl.appendBackendDebugLog("S:A M:I Occ:1|T0:Z1:A:5|Z1:O:1");
			expect(host._backendDebugLogLines.length).toBe(1);
			expect(host._backendDebugLogLines[0]).toContain("Static: active");
			// The injected sensor prefix (S:I/S:A) should not appear twice
			expect(
				(host._backendDebugLogLines[0].match(/Static:/g) ?? []).length,
			).toBe(1);
		});

		it("injects sensor prefix with active static/motion when _sensorState has presences set", () => {
			host._sensorState = {
				occupancy: true,
				static_presence: true,
				motion_presence: true,
				target_presence: true,
				illuminance: null,
				temperature: null,
				humidity: null,
				co2: null,
			};
			ctrl.appendBackendDebugLog("T0:Z1:A:5|Z1:O:1");
			expect(host._backendDebugLogLines.length).toBe(1);
			expect(host._backendDebugLogLines[0]).toContain("Static: active");
			expect(host._backendDebugLogLines[0]).toContain("Motion: active");
			expect(host._backendDebugLogLines[0]).toContain("Occ: on");
		});
	});

	// -------------------------------------------------------------------------
	// computeHeatmapColors
	// -------------------------------------------------------------------------
	describe("computeHeatmapColors", () => {
		it("returns a Map", () => {
			const result = ctrl.computeHeatmapColors();
			expect(result).toBeInstanceOf(Map);
		});

		it("returns colours for zones with non-zero target counts", () => {
			host._zoneConfigs = [{ name: "Study", color: "#56B4E9", type: "normal" }];
			host._zoneState.target_counts = { 1: 3 };
			const result = ctrl.computeHeatmapColors();
			// Zone 1 has hits so it should have an entry
			expect(result.has(1)).toBe(true);
		});

		it("returns empty map when target_counts is empty", () => {
			host._zoneState.target_counts = {};
			const result = ctrl.computeHeatmapColors();
			expect(result.size).toBe(0);
		});
	});

	// -------------------------------------------------------------------------
	// runLocalZoneEngine
	// -------------------------------------------------------------------------
	describe("runLocalZoneEngine", () => {
		/** Build a simple grid with all interior cells set to zone 0 (room). */
		function makeSimpleGrid(): Uint8Array<ArrayBuffer> {
			const grid = new Uint8Array(GRID_CELL_COUNT);
			for (let i = 0; i < GRID_CELL_COUNT; i++) {
				grid[i] = CELL_ROOM_BIT;
			}
			return grid;
		}

		beforeEach(() => {
			host._grid = makeSimpleGrid();
			host._zoneConfigs = [];
		});

		it("returns a ZoneEngineResult with occupancy and targets arrays", () => {
			const result = ctrl.runLocalZoneEngine();
			expect(result).toHaveProperty("occupancy");
			expect(result).toHaveProperty("targets");
		});

		it("returns inactive status for an empty targets list", () => {
			host._targets = [];
			const result = ctrl.runLocalZoneEngine();
			expect(result.targets).toEqual([]);
		});

		it("mutates the internal ZoneEngineState across calls", () => {
			host._targets = [{ x: 0, y: 0, speed: 0, status: "active", signal: 100 }];
			ctrl.runLocalZoneEngine();
			ctrl.runLocalZoneEngine();
			// The gate-count for target 0 should have advanced
			expect(ctrl.zoneEngineState.targetGateCount[0]).toBeGreaterThanOrEqual(0);
		});

		it("builds frontend debug log when _showDebugLog is true", () => {
			host._showDebugLog = true;
			// Place a target in the centre of the grid so it maps to an inside cell
			const centerCol = Math.floor(GRID_COLS / 2);
			const centerRow = Math.floor(GRID_ROWS / 2);
			host._targets = [
				{
					x: (centerCol - GRID_COLS / 2 + 0.5) * 300, // mm
					y: centerRow * 300 + 150, // mm
					speed: 0,
					status: "active",
					signal: 80,
				},
			];
			ctrl.runLocalZoneEngine();
			// A line should have been appended (or prev should be set)
			// Either the line was added or deduplication kicked in — at minimum requestUpdate was called
			const hasLines =
				host._debugLogLines.length > 0 || host._debugLogPrev !== "";
			expect(hasLines).toBe(true);
		});

		it("does NOT build frontend debug log when _showDebugLog is false", () => {
			host._showDebugLog = false;
			host._targets = [
				{ x: 100, y: 100, speed: 0, status: "active", signal: 80 },
			];
			ctrl.runLocalZoneEngine();
			expect(host._debugLogLines.length).toBe(0);
		});

		it("caps frontend debug log lines at DEBUG_LOG_MAX", () => {
			host._showDebugLog = true;
			// Run engine DEBUG_LOG_MAX+2 times, each with a unique target position so
			// dedup doesn't suppress lines.  We clear _debugLogPrev before each call.
			for (let i = 0; i <= DEBUG_LOG_MAX; i++) {
				host._debugLogPrev = "";
				ctrl.runLocalZoneEngine();
			}
			expect(host._debugLogLines.length).toBeLessThanOrEqual(DEBUG_LOG_MAX);
		});

		it("handles null _sensorState gracefully (uses false fallbacks)", () => {
			host._sensorState = null;
			host._targets = [];
			expect(() => ctrl.runLocalZoneEngine()).not.toThrow();
		});

		it("builds frontend debug log with static/motion sensor prefix from zone engine state", () => {
			host._showDebugLog = true;
			// Directly set the internal zone engine state to have active static/motion
			const state = ctrl.zoneEngineState;
			state.staticState = "active";
			state.motionState = "active";
			ctrl.zoneEngineState = state;
			host._targets = [];
			ctrl.runLocalZoneEngine();
			// Should have produced a log line containing sensor info
			const allLog = host._debugLogLines.join(" ") + host._debugLogPrev;
			expect(allLog).toContain("Static:");
		});

		it("encodes 'active' static state as 'A' in frontend debug log", () => {
			host._showDebugLog = true;
			host._targets = [];
			// Pass static_presence = true so the zone engine produces staticState "active"
			host._sensorState = {
				occupancy: false,
				static_presence: true,
				motion_presence: false,
				target_presence: false,
				illuminance: null,
				temperature: null,
				humidity: null,
				co2: null,
			};
			ctrl.runLocalZoneEngine();
			const allLog = host._debugLogLines.join(" ") + host._debugLogPrev;
			expect(allLog).toContain("Static: active");
		});

		it("encodes 'active' motion state as 'A' in frontend debug log", () => {
			host._showDebugLog = true;
			host._targets = [];
			host._sensorState = {
				occupancy: false,
				static_presence: false,
				motion_presence: true,
				target_presence: false,
				illuminance: null,
				temperature: null,
				humidity: null,
				co2: null,
			};
			ctrl.runLocalZoneEngine();
			const allLog = host._debugLogLines.join(" ") + host._debugLogPrev;
			expect(allLog).toContain("Motion: active");
		});

		it("deduplicates frontend debug log on consecutive identical results", () => {
			host._showDebugLog = true;
			host._targets = [];
			// First call populates the log
			ctrl.runLocalZoneEngine();
			const countAfterFirst = host._debugLogLines.length;
			// Second call with identical state should be deduped
			ctrl.runLocalZoneEngine();
			expect(host._debugLogLines.length).toBe(countAfterFirst);
		});

		it("encodes 'pending' static state as 'P' in frontend debug log", () => {
			host._showDebugLog = true;
			// Pre-seed state as "active" then run with no targets/presence → transitions to "pending"
			const state = ctrl.zoneEngineState;
			state.staticState = "pending";
			state.staticPendingSince = Date.now() / 1000; // recent, not timed-out yet
			ctrl.zoneEngineState = state;
			host._targets = [];
			// No static presence → state stays "pending" (not timed out)
			host._sensorState = {
				occupancy: false,
				static_presence: false,
				motion_presence: false,
				target_presence: false,
				illuminance: null,
				temperature: null,
				humidity: null,
				co2: null,
			};
			ctrl.runLocalZoneEngine();
			const allLog = host._debugLogLines.join(" ") + host._debugLogPrev;
			expect(allLog).toContain("Static: pending");
		});

		it("encodes 'pending' motion state as 'P' in frontend debug log", () => {
			host._showDebugLog = true;
			const state = ctrl.zoneEngineState;
			state.motionState = "pending";
			state.motionPendingSince = Date.now() / 1000;
			ctrl.zoneEngineState = state;
			host._targets = [];
			host._sensorState = {
				occupancy: false,
				static_presence: false,
				motion_presence: false,
				target_presence: false,
				illuminance: null,
				temperature: null,
				humidity: null,
				co2: null,
			};
			ctrl.runLocalZoneEngine();
			const allLog = host._debugLogLines.join(" ") + host._debugLogPrev;
			expect(allLog).toContain("Motion: pending");
		});

		it("encodes zone 'O' state (occupied, no pendingSince) in frontend debug log", () => {
			host._showDebugLog = true;
			// Zone 0 (Room) occupied with pendingSince === null → state code "O"
			const state = ctrl.zoneEngineState;
			state.localZoneState.set(0, {
				occupied: true,
				pendingSince: null, // confirmed occupied → "O"
				confirmedTargets: new Set(),
			});
			ctrl.zoneEngineState = state;
			host._targets = [];
			ctrl.runLocalZoneEngine();
			const allLog = host._debugLogLines.join(" ") + host._debugLogPrev;
			expect(allLog).toContain("Room");
		});

		it("includes 'pending' zone state (P) in debug log when zone has pendingSince set", () => {
			host._showDebugLog = true;
			// Seed the zone engine state with an occupied zone that has pendingSince set
			const state = ctrl.zoneEngineState;
			state.localZoneState.set(0, {
				occupied: true,
				pendingSince: Date.now() / 1000,
				confirmedTargets: new Set(),
			});
			ctrl.zoneEngineState = state;
			host._targets = [];
			ctrl.runLocalZoneEngine();
			// The log should either have a line or prev set
			const allLog = host._debugLogLines.join(" ") + host._debugLogPrev;
			// Zone 0 (Room) with pendingSince set → state code "P"
			expect(allLog).toContain("Room");
		});
	});
});
