import { GRID_CELL_MM, GRID_COLS, MAX_RANGE } from "./grid.js";

/**
 * Map a target to percentage coordinates for the editor grid.
 * Uses the backend's already-transformed x/y (perspective applied server-side).
 */
export function mapTargetToPercent(
	targetX: number,
	targetY: number,
	roomWidth: number,
	roomDepth: number,
): { x: number; y: number } {
	if (roomWidth > 0 && roomDepth > 0) {
		const rx = Math.max(0, Math.min(targetX, roomWidth));
		const ry = Math.max(0, Math.min(targetY, roomDepth));
		return {
			x: (rx / roomWidth) * 100,
			y: (ry / roomDepth) * 100,
		};
	}
	return {
		x: (targetX / MAX_RANGE) * 100,
		y: (targetY / MAX_RANGE) * 100,
	};
}

/**
 * Map a target to a fractional grid cell position (col, row).
 * Returns null if room dimensions are invalid.
 */
export function mapTargetToGridCell(
	targetX: number,
	targetY: number,
	roomWidth: number,
	roomDepth: number,
): { col: number; row: number } | null {
	if (roomWidth <= 0 || roomDepth <= 0) return null;

	// Room is centered horizontally in the grid
	const roomCols = Math.ceil(roomWidth / GRID_CELL_MM);
	const startCol = Math.floor((GRID_COLS - roomCols) / 2);

	// target x/y are room-space mm (perspective applied server-side)
	const col = startCol + targetX / GRID_CELL_MM;
	const row = targetY / GRID_CELL_MM;

	return { col, row };
}

// FOV geometry constants (120-degree wedge)
const FOV_X_EXTENT = MAX_RANGE * Math.sin(Math.PI / 3); // ~5196

/** Map raw sensor coords to percentage in the FOV view (marking step). */
export function rawToFovPct(
	rawX: number,
	rawY: number,
): { xPct: number; yPct: number } {
	const halfW = FOV_X_EXTENT;
	return {
		xPct: ((rawX + halfW) / (halfW * 2)) * 100,
		yPct: (rawY / MAX_RANGE) * 100,
	};
}

export interface SmoothBufferEntry {
	x: number;
	y: number;
	t: number;
}

/**
 * 1-second rolling median smoother for raw readings during marking.
 * Returns the smoothed x/y and the updated buffer (immutable style).
 */
export function getSmoothedValue(
	buffer: SmoothBufferEntry[],
	newX: number,
	newY: number,
	now: number,
): { x: number; y: number; buffer: SmoothBufferEntry[] } {
	// Find prune boundary in the input (entries older than 1s are dropped).
	let start = 0;
	while (start < buffer.length && now - buffer[start].t > 1000) {
		start++;
	}

	const len = buffer.length - start + 1;
	const pruned: SmoothBufferEntry[] = new Array(len);
	const xs = new Array<number>(len);
	const ys = new Array<number>(len);
	for (let i = 0; i < len - 1; i++) {
		const e = buffer[start + i];
		pruned[i] = e;
		xs[i] = e.x;
		ys[i] = e.y;
	}
	pruned[len - 1] = { x: newX, y: newY, t: now };
	xs[len - 1] = newX;
	ys[len - 1] = newY;

	xs.sort((a, b) => a - b);
	ys.sort((a, b) => a - b);
	const mid = len >> 1;
	const x = len % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
	const y = len % 2 ? ys[mid] : (ys[mid - 1] + ys[mid]) / 2;

	return { x, y, buffer: pruned };
}
