import { mapTargetToGridCell } from "./coordinates.js";
import {
	cellHasOverlayEntry,
	cellIsInside,
	cellZone,
	GRID_CELL_COUNT,
	GRID_COLS,
	GRID_ROWS,
} from "./grid.js";
import { getZoneThresholds, type ZoneConfig } from "./zone-defaults.js";

// ---- Interfaces ----

export interface ZoneState {
	occupied: boolean;
	pendingSince: number | null;
	confirmedTargets: Set<number>;
}

export interface ZoneEngineState {
	localZoneState: Map<number, ZoneState>;
	targetPrev: ({ col: number; row: number } | null)[];
	targetGateCount: number[];
	targetPrevXY: ({ x: number; y: number } | null)[];
	staticState: "active" | "pending" | "inactive";
	motionState: "active" | "pending" | "inactive";
	staticPendingSince: number | null;
	motionPendingSince: number | null;
	sensorsEverActive: boolean;
}

export interface ZoneEngineParams {
	targets: {
		x: number | null;
		y: number | null;
		signal: number;
		speed: number;
		status: string;
	}[];
	grid: Uint8Array;
	roomWidth: number;
	roomDepth: number;
	zoneConfigs: (ZoneConfig | null)[];
	roomType: ZoneConfig["type"];
	roomTrigger: number;
	roomRenew: number;
	roomTimeout: number;
	roomHandoffTimeout: number;
	staticPresence?: boolean;
	motionPresence?: boolean;
	staticTimeout?: number; // seconds
	motionTimeout?: number; // seconds
	now?: number; // seconds (defaults to Date.now() / 1000)
}

export interface ZoneEngineResult {
	occupancy: Record<number, boolean>;
	targets: { status: "active" | "pending" | "inactive" }[];
	staticState: "active" | "pending" | "inactive";
	motionState: "active" | "pending" | "inactive";
	sensorOccupancy: boolean;
}

// ---- Factory ----

export function createZoneEngineState(): ZoneEngineState {
	return {
		localZoneState: new Map(),
		targetPrev: [null, null, null],
		targetGateCount: [0, 0, 0],
		targetPrevXY: [null, null, null],
		staticState: "inactive",
		motionState: "inactive",
		staticPendingSince: null,
		motionPendingSince: null,
		sensorsEverActive: false,
	};
}

// ---- Engine ----

const MAX_MOVEMENT_CELLS = 5;
const MAX_TARGETS = 3;

export function runLocalZoneEngine(
	state: ZoneEngineState,
	params: ZoneEngineParams,
): ZoneEngineResult {
	const now = params.now ?? Date.now() / 1000;

	const zoneConfirmed: Map<number, boolean> = new Map();
	const targetSignal: Map<number, number> = new Map();
	const targetZonePrev: (number | null)[] = [null, null, null];
	const targetZoneCurr: (number | null)[] = [null, null, null];
	const targetLeftRoom: boolean[] = [false, false, false];

	// Snapshot prev cell overlay info before per-target loop clears it.
	// Check the target's cell AND its neighbours — the median position may
	// land one cell away from the actual overlay cell at the boundary.
	const targetWasOnOverlay: boolean[] = [false, false, false];
	const targetPrevZone: (number | null)[] = [null, null, null];
	for (let i = 0; i < MAX_TARGETS && i < params.targets.length; i++) {
		const prev = state.targetPrev[i];
		if (prev !== null) {
			const prevIdx = prev.row * GRID_COLS + prev.col;
			if (
				prevIdx >= 0 &&
				prevIdx < GRID_CELL_COUNT &&
				cellIsInside(params.grid[prevIdx])
			) {
				const prevZid = cellZone(params.grid[prevIdx]);
				targetPrevZone[i] = prevZid;
				// Check cell and same-zone neighbours for overlay
				for (let dr = -1; dr <= 1 && !targetWasOnOverlay[i]; dr++) {
					for (let dc = -1; dc <= 1 && !targetWasOnOverlay[i]; dc++) {
						const nr = prev.row + dr;
						const nc = prev.col + dc;
						if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
							const ni = nr * GRID_COLS + nc;
							if (cellHasOverlayEntry(params.grid[ni]) && cellZone(params.grid[ni]) === prevZid) {
								targetWasOnOverlay[i] = true;
							}
						}
					}
				}
			}
		}
	}

	for (let i = 0; i < MAX_TARGETS && i < params.targets.length; i++) {
		const t = params.targets[i];

		// Check if sensor is tracking (x/y non-null), NOT backend status.
		// The zone editor ignores backend status and recalculates its own.
		if (t.x == null || t.y == null) {
			state.targetPrev[i] = null;
			state.targetGateCount[i] = 0;
			continue;
		}

		const signal = t.signal;
		if (signal <= 0) continue;

		targetSignal.set(i, signal);

		const pos = mapTargetToGridCell(
			t.x,
			t.y,
			params.roomWidth,
			params.roomDepth,
		);
		if (!pos) {
			targetLeftRoom[i] = true;
			state.targetPrev[i] = null;
			state.targetGateCount[i] = 0;
			continue;
		}
		const col = Math.floor(pos.col);
		const row = Math.floor(pos.row);
		if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
			targetLeftRoom[i] = true;
			state.targetPrev[i] = null;
			state.targetGateCount[i] = 0;
			continue;
		}
		const idx = row * GRID_COLS + col;
		const cellVal = params.grid[idx];
		if (!cellIsInside(cellVal)) {
			targetLeftRoom[i] = true;
			state.targetPrev[i] = null;
			state.targetGateCount[i] = 0;
			continue;
		}

		const zid = cellZone(cellVal);
		targetZoneCurr[i] = zid;

		const prev = state.targetPrev[i];
		if (prev !== null) {
			const prevIdx = prev.row * GRID_COLS + prev.col;
			if (
				prevIdx >= 0 &&
				prevIdx < GRID_CELL_COUNT &&
				cellIsInside(params.grid[prevIdx])
			) {
				targetZonePrev[i] = cellZone(params.grid[prevIdx]);
			}
		}

		// Record last in-room position (room-space mm) for pending display
		state.targetPrevXY[i] = { x: t.x, y: t.y };

		let continuous = false;
		if (prev !== null) {
			const dist = Math.max(Math.abs(col - prev.col), Math.abs(row - prev.row));
			continuous = dist <= MAX_MOVEMENT_CELLS;
		}

		const thresholds = getZoneThresholds(
			zid,
			params.zoneConfigs,
			params.roomType,
			params.roomTrigger,
			params.roomRenew,
			params.roomTimeout,
			params.roomHandoffTimeout,
		);
		const { trigger, renew } = thresholds;
		const st = state.localZoneState.get(zid);
		const isOccupied = st?.occupied ?? false;
		const isClear = !isOccupied;

		let baseTrigger = isClear ? trigger : renew;
		// Check cell and same-zone neighbours for overlay (median may lag behind actual position)
		let cellOverlay = cellHasOverlayEntry(cellVal);
		if (!cellOverlay) {
			for (let dr = -1; dr <= 1 && !cellOverlay; dr++) {
				for (let dc = -1; dc <= 1 && !cellOverlay; dc++) {
					const nr = row + dr;
					const nc = col + dc;
					if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
						const ni = nr * GRID_COLS + nc;
						if (cellHasOverlayEntry(params.grid[ni]) && cellZone(params.grid[ni]) === zid) {
							cellOverlay = true;
						}
					}
				}
			}
		}
		const needsGating = !cellOverlay && !continuous;
		// Instant entry: near overlay cell → threshold=1
		if (cellOverlay && isClear) {
			baseTrigger = 1;
		}

		if (needsGating && isClear) {
			// Gating: raise threshold and require consecutive qualifying ticks.
			// At 10Hz tick rate, 2 ticks = ~200ms. If false positives become
			// a problem: increase gate count, use wall-clock gating, or raise offset.
			const gatedThresh = Math.min(baseTrigger + 2, 8);
			if (signal >= gatedThresh) {
				state.targetGateCount[i]++;
				if (state.targetGateCount[i] >= 2) {
					zoneConfirmed.set(zid, true);
					if (st) st.confirmedTargets.add(i);
					state.targetPrev[i] = { col, row };
					state.targetGateCount[i] = 0;
				} else {
					state.targetPrev[i] = { col, row };
				}
			} else {
				state.targetPrev[i] = null;
				state.targetGateCount[i] = 0;
			}
		} else {
			if (signal >= baseTrigger) {
				zoneConfirmed.set(zid, true);
				if (st) st.confirmedTargets.add(i);
				state.targetPrev[i] = { col, row };
				state.targetGateCount[i] = 0;
			} else {
				state.targetPrev[i] = { col, row };
			}
		}
	}

	// Handoff detection
	for (let i = 0; i < MAX_TARGETS; i++) {
		const prevZid = targetZonePrev[i];
		const currZid = targetZoneCurr[i];
		if (prevZid === null || currZid === null || prevZid === currZid) continue;

		const srcSt = state.localZoneState.get(prevZid);
		if (!srcSt) continue;
		srcSt.confirmedTargets.delete(i);
		if (
			srcSt.confirmedTargets.size === 0 &&
			srcSt.occupied &&
			srcSt.pendingSince === null
		) {
			const handoffThresholds = getZoneThresholds(
				prevZid,
				params.zoneConfigs,
				params.roomType,
				params.roomTrigger,
				params.roomRenew,
				params.roomTimeout,
				params.roomHandoffTimeout,
			);
			const { timeout, handoffTimeout } = handoffThresholds;
			srcSt.pendingSince = now - (timeout - handoffTimeout);
		}
	}

	// Overlay exit handoff: target disappears or leaves room from overlay cell → use handoff timeout.
	// We keep confirmedTargets intact so the target renders as PENDING.
	for (let i = 0; i < MAX_TARGETS && i < params.targets.length; i++) {
		const t = params.targets[i];
		const isGone = t.x == null || t.y == null;
		if ((isGone || targetLeftRoom[i]) && targetWasOnOverlay[i] && targetPrevZone[i] !== null) {
			const prevZid = targetPrevZone[i] as number;
			const st = state.localZoneState.get(prevZid);
			if (st?.occupied) {
				// Check if this target is the only confirmed target remaining
				let remaining = 0;
				for (const tid of st.confirmedTargets) {
					if (tid !== i) remaining++;
				}
				if (remaining === 0) {
					const th = getZoneThresholds(
						prevZid,
						params.zoneConfigs,
						params.roomType,
						params.roomTrigger,
						params.roomRenew,
						params.roomTimeout,
						params.roomHandoffTimeout,
					);
					const accel = now - (th.timeout - th.handoffTimeout);
					if (st.pendingSince === null) {
						st.pendingSince = accel;
					} else if (st.pendingSince > accel) {
						st.pendingSince = accel;
					}
				}
			}
		}
	}

	// State machine per zone
	const occupancy: Record<number, boolean> = {};
	const allZoneIds = new Set<number>();
	for (let i = 0; i < params.grid.length; i++) {
		if (cellIsInside(params.grid[i])) allZoneIds.add(cellZone(params.grid[i]));
	}
	for (const zid of allZoneIds) {
		let st = state.localZoneState.get(zid);
		if (!st) {
			st = {
				occupied: false,
				pendingSince: null,
				confirmedTargets: new Set(),
			};
			state.localZoneState.set(zid, st);
		}
		const zoneThresholds = getZoneThresholds(
			zid,
			params.zoneConfigs,
			params.roomType,
			params.roomTrigger,
			params.roomRenew,
			params.roomTimeout,
			params.roomHandoffTimeout,
		);
		const { timeout } = zoneThresholds;
		const confirmed = zoneConfirmed.get(zid) ?? false;

		if (!st.occupied) {
			if (confirmed) {
				st.occupied = true;
				st.pendingSince = null;
			}
		} else if (st.pendingSince === null) {
			if (!confirmed) {
				st.pendingSince = now;
			}
		} else {
			if (confirmed) {
				st.pendingSince = null;
			} else {
				if (now - st.pendingSince >= timeout) {
					st.occupied = false;
					st.pendingSince = null;
					st.confirmedTargets.clear();
				}
			}
		}
		occupancy[zid] = st.occupied;
	}

	// Clear stale zones no longer in the grid
	for (const zid of state.localZoneState.keys()) {
		if (!allZoneIds.has(zid)) {
			state.localZoneState.delete(zid);
		}
	}

	// activeTargets = sensor is tracking (mirrors backend tw.active)
	const activeTargets = new Set<number>();
	for (let i = 0; i < MAX_TARGETS && i < params.targets.length; i++) {
		if (params.targets[i].x != null && params.targets[i].y != null) {
			activeTargets.add(i);
		}
	}

	// Clean up stale confirmed targets in non-pending zones
	// (mirrors backend _tick lines 705-709)
	for (let i = 0; i < MAX_TARGETS && i < params.targets.length; i++) {
		if (!activeTargets.has(i)) {
			for (const st of state.localZoneState.values()) {
				if (st.pendingSince === null) {
					st.confirmedTargets.delete(i);
				}
			}
		}
	}

	// Sensor presence state machine
	const staticOn = params.staticPresence ?? false;
	const motionOn = params.motionPresence ?? false;
	const staticTimeout = params.staticTimeout ?? 10;
	const motionTimeout = params.motionTimeout ?? 10;

	if (staticOn) {
		state.staticState = "active";
		state.staticPendingSince = null;
		state.sensorsEverActive = true;
	} else if (state.staticState === "active") {
		state.staticState = "pending";
		state.staticPendingSince = now;
	} else if (
		state.staticState === "pending" &&
		state.staticPendingSince !== null
	) {
		if (now - state.staticPendingSince >= staticTimeout) {
			state.staticState = "inactive";
			state.staticPendingSince = null;
		}
	}

	if (motionOn) {
		state.motionState = "active";
		state.motionPendingSince = null;
		state.sensorsEverActive = true;
	} else if (state.motionState === "active") {
		state.motionState = "pending";
		state.motionPendingSince = now;
	} else if (
		state.motionState === "pending" &&
		state.motionPendingSince !== null
	) {
		if (now - state.motionPendingSince >= motionTimeout) {
			state.motionState = "inactive";
			state.motionPendingSince = null;
		}
	}

	// Force-clear: when both sensors inactive and no zones OCCUPIED, clear pending zones
	// Only applies when sensors have been active at some point (prevents force-clear
	// on sensor-free deployments where sensors are always default-inactive)
	if (
		state.sensorsEverActive &&
		state.staticState === "inactive" &&
		state.motionState === "inactive"
	) {
		let anyOccupied = false;
		for (const [, st] of state.localZoneState) {
			if (st.occupied && st.pendingSince === null) {
				anyOccupied = true;
				break;
			}
		}
		if (!anyOccupied) {
			for (const [zid, st] of state.localZoneState) {
				if (st.occupied && st.pendingSince !== null) {
					st.occupied = false;
					st.pendingSince = null;
					st.confirmedTargets.clear();
					occupancy[zid] = false;
				}
			}
		}
	}

	// Compute sensor occupancy
	const sensorOccupancy =
		state.staticState !== "inactive" ||
		state.motionState !== "inactive" ||
		Object.values(occupancy).some((v) => v);

	// Build per-target status (mirrors backend _tick lines 661-700).
	// Only status is needed — position for pending display is handled
	// by targetPrevXY in the rendering layer.
	const targetResults: { status: "active" | "pending" | "inactive" }[] = [];
	for (let i = 0; i < MAX_TARGETS && i < params.targets.length; i++) {
		const sig = targetSignal.get(i) ?? 0;
		const inRoom = targetZoneCurr[i] !== null;
		if (activeTargets.has(i) && sig > 0 && inRoom) {
			targetResults.push({ status: "active" });
		} else {
			let isPending = false;
			if (!activeTargets.has(i) || !inRoom) {
				for (const [, st] of state.localZoneState) {
					if (
						st.occupied &&
						st.pendingSince !== null &&
						st.confirmedTargets.has(i)
					) {
						isPending = true;
						break;
					}
				}
			}
			targetResults.push({ status: isPending ? "pending" : "inactive" });
		}
	}

	return {
		occupancy,
		targets: targetResults,
		staticState: state.staticState,
		motionState: state.motionState,
		sensorOccupancy,
	};
}
