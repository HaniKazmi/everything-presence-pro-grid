import {
	CELL_OVERLAY_NONE,
	CELL_ROOM_BIT,
	cellIsInside,
	cellOverlay,
	cellSetOverlay,
	cellSetZone,
	cellZone,
	GRID_CELL_COUNT,
	MAX_ZONES,
} from "./grid.js";

export type PaintAction = "set" | "clear";

/**
 * Determine the paint action (set or clear) when starting a paint stroke.
 *
 * For boundary painting (activeZone === 0):
 *   - If cell is plain inside room (no zone), action = "clear" (remove from room)
 *   - Otherwise, action = "set" (add to room)
 *
 * For zone painting (activeZone > 0):
 *   - If cell already has this zone, action = "clear" (unpaint)
 *   - Otherwise, action = "set" (paint zone)
 *
 * @param cellValue Current cell byte value
 * @param activeZone Active zone (0 = boundary, 1-7 = named zone)
 * @returns The paint action to use for the entire stroke
 */
export function determinePaintAction(
	cellValue: number,
	activeZone: number,
): PaintAction {
	if (activeZone === 0) {
		const isPlainRoom = cellIsInside(cellValue) && cellZone(cellValue) === 0;
		return isPlainRoom ? "clear" : "set";
	}
	return cellZone(cellValue) === activeZone ? "clear" : "set";
}

/**
 * Apply a paint action to a single grid cell and return the new cell value.
 *
 * Returns null if the cell should not be modified (e.g. painting a zone
 * on an outside cell).
 *
 * @param cellValue Current cell byte value
 * @param activeZone Active zone (0 = boundary, 1-7 = named zone)
 * @param paintAction Whether to "set" or "clear"
 * @returns New cell value, or null if no change should occur
 */
export function applyPaintToCell(
	cellValue: number,
	activeZone: number,
	paintAction: PaintAction,
): number | null {
	if (activeZone === 0) {
		// Boundary: set = plain inside room, clear = outside
		if (paintAction === "set") {
			return CELL_ROOM_BIT;
		}
		return 0;
	}

	// Named zone painting — only on inside-room cells
	if (!cellIsInside(cellValue)) return null;
	if (paintAction === "set") {
		return cellSetZone(cellValue | CELL_ROOM_BIT, activeZone);
	}
	return cellSetZone(cellValue, 0);
}

/**
 * Determine the paint action for an overlay paint stroke.
 *
 * @param cellValue Current cell byte value
 * @param kind The overlay kind being painted (CELL_OVERLAY_ENTRY |
 *   CELL_OVERLAY_INTERFERENCE | CELL_OVERLAY_SUPPRESS)
 * @returns "clear" if cell already has this overlay kind, "set" otherwise
 */
export function determineOverlayPaintAction(
	cellValue: number,
	kind: number,
): PaintAction {
	return cellOverlay(cellValue) === kind ? "clear" : "set";
}

/**
 * Apply an overlay paint action to a single grid cell.
 *
 * When setting, the overlay kind replaces any prior overlay on the cell.
 * When clearing, the overlay is removed regardless of its current kind.
 *
 * Returns null if the cell is outside the room.
 */
export function applyOverlayPaintToCell(
	cellValue: number,
	kind: number,
	paintAction: PaintAction,
): number | null {
	if (!cellIsInside(cellValue)) return null;
	return cellSetOverlay(
		cellValue,
		paintAction === "set" ? kind : CELL_OVERLAY_NONE,
	);
}

/**
 * Clear all cells of a specific zone back to zone 0 (room default).
 *
 * Returns a new grid with the zone cleared, or null when nothing changed
 * (slot out of range or no cells held that zone). Does NOT mutate the
 * original. Callers can treat null as "skip the assignment".
 */
export function clearZoneFromGrid(
	grid: Uint8Array,
	slot: number,
): Uint8Array | null {
	if (slot < 1 || slot > MAX_ZONES) return null;

	let firstHit = -1;
	for (let i = 0; i < GRID_CELL_COUNT; i++) {
		if (cellZone(grid[i]) === slot) {
			firstHit = i;
			break;
		}
	}
	if (firstHit === -1) return null;

	const newGrid = new Uint8Array(grid);
	for (let i = firstHit; i < GRID_CELL_COUNT; i++) {
		if (cellZone(newGrid[i]) === slot) {
			newGrid[i] = cellSetZone(newGrid[i], 0);
		}
	}
	return newGrid;
}
