// Bit 0: room (0=outside, 1=inside)
// Bits 1-3: zone (0=room default, 1-7=named zone)
// Bits 4-5: overlay (0=none, 1=entry, 2=interference, 3=suppress)
// Bits 6-7: unused
export const CELL_ROOM_BIT = 0x01;
export const CELL_ZONE_MASK = 0x0e; // bits 1-3
export const CELL_ZONE_SHIFT = 1;

// Legacy overlay constants — retained during migration, removed in Task 9.
// CELL_OVERLAY_ENTRY's value will change from 0x10 to 1 after migration.
export const CELL_OVERLAY_ENTRY_LEGACY_MASK = 0x10; // bit 4 (old)
export const CELL_INTERFERENCE_MASK = 0xe0; // bits 5-7 (old)
export const CELL_INTERFERENCE_SHIFT = 5; // (old)
export const CELL_INTERFERENCE_SUPPRESS = 2; // (old)

// New overlay field — bits 4-5, kind value 0..3
export const CELL_OVERLAY_MASK = 0x30;
export const CELL_OVERLAY_SHIFT = 4;
export const CELL_OVERLAY_NONE = 0;
export const CELL_OVERLAY_ENTRY = 1;
export const CELL_OVERLAY_INTERFERENCE = 2;
export const CELL_OVERLAY_SUPPRESS = 3;

export const MAX_ZONES = 7; // named zones 1-7
export const NUM_ZONE_SLOTS = 8; // zone 0 + named zones 1-7

export const GRID_COLS = 20;
export const GRID_ROWS = 20;
export const GRID_CELL_COUNT = GRID_COLS * GRID_ROWS;
export const GRID_CELL_MM = 300; // each cell represents 300mm x 300mm
export const MAX_RANGE = 6000;

export const cellIsInside = (v: number): boolean => (v & CELL_ROOM_BIT) !== 0;
export const cellZone = (v: number): number => (v >> CELL_ZONE_SHIFT) & 0x07;
export const cellSetInside = (v: number, inside: boolean): number =>
	inside ? v | CELL_ROOM_BIT : v & ~CELL_ROOM_BIT;
export const cellSetZone = (v: number, zone: number): number =>
	(v & ~CELL_ZONE_MASK) | ((zone & 0x07) << CELL_ZONE_SHIFT);
export const cellOverlay = (v: number): number =>
	(v >> CELL_OVERLAY_SHIFT) & 0x03;
export const cellSetOverlay = (v: number, kind: number): number =>
	(v & ~CELL_OVERLAY_MASK) | ((kind & 0x03) << CELL_OVERLAY_SHIFT);
export const cellHasOverlayEntry = (v: number): boolean =>
	(v & CELL_OVERLAY_ENTRY_LEGACY_MASK) !== 0;
export const cellSetOverlayEntry = (v: number, on: boolean): number =>
	on
		? (v | CELL_OVERLAY_ENTRY_LEGACY_MASK) & ~CELL_INTERFERENCE_MASK
		: v & ~CELL_OVERLAY_ENTRY_LEGACY_MASK;
export const cellInterference = (v: number): number =>
	(v >> CELL_INTERFERENCE_SHIFT) & 0x07;
export const cellSetInterference = (v: number, level: number): number =>
	level > 0
		? ((v & ~CELL_INTERFERENCE_MASK) |
				((level & 0x07) << CELL_INTERFERENCE_SHIFT)) &
			~CELL_OVERLAY_ENTRY_LEGACY_MASK
		: v & ~CELL_INTERFERENCE_MASK;

/** Get room bounds with 1-cell padding around inside cells. */
export function getRoomBounds(grid: Uint8Array): {
	minCol: number;
	maxCol: number;
	minRow: number;
	maxRow: number;
} {
	let minCol = GRID_COLS;
	let maxCol = 0;
	let minRow = GRID_ROWS;
	let maxRow = 0;
	for (let i = 0; i < GRID_CELL_COUNT; i++) {
		if (cellIsInside(grid[i])) {
			const col = i % GRID_COLS;
			const row = Math.floor(i / GRID_COLS);
			if (col < minCol) minCol = col;
			if (col > maxCol) maxCol = col;
			if (row < minRow) minRow = row;
			if (row > maxRow) maxRow = row;
		}
	}
	// Add 1-cell padding
	return {
		minCol: Math.max(0, minCol - 1),
		maxCol: Math.min(GRID_COLS - 1, maxCol + 1),
		minRow: Math.max(0, minRow - 1),
		maxRow: Math.min(GRID_ROWS - 1, maxRow + 1),
	};
}

/** Get raw room bounds without padding (only actual inside cells). */
export function getRawRoomBounds(grid: Uint8Array): {
	minCol: number;
	maxCol: number;
	minRow: number;
	maxRow: number;
} {
	let minCol = GRID_COLS;
	let maxCol = 0;
	let minRow = GRID_ROWS;
	let maxRow = 0;
	for (let i = 0; i < GRID_CELL_COUNT; i++) {
		if (cellIsInside(grid[i])) {
			const col = i % GRID_COLS;
			const row = Math.floor(i / GRID_COLS);
			if (col < minCol) minCol = col;
			if (col > maxCol) maxCol = col;
			if (row < minRow) minRow = row;
			if (row > maxRow) maxRow = row;
		}
	}
	return { minCol, maxCol, minRow, maxRow };
}

/** Initialize a grid from room dimensions (mm). Room is centered horizontally. */
export function initGridFromRoom(
	roomWidth: number,
	roomDepth: number,
): Uint8Array {
	const grid = new Uint8Array(GRID_CELL_COUNT);

	const roomCols = Math.ceil(roomWidth / GRID_CELL_MM);
	const roomRows = Math.ceil(roomDepth / GRID_CELL_MM);
	const startCol = Math.floor((GRID_COLS - roomCols) / 2);
	const startRow = 0; // sensor is at front wall

	for (let r = 0; r < GRID_ROWS; r++) {
		for (let c = 0; c < GRID_COLS; c++) {
			const idx = r * GRID_COLS + c;
			const inRoom =
				c >= startCol &&
				c < startCol + roomCols &&
				r >= startRow &&
				r < startRow + roomRows;

			if (inRoom) {
				grid[idx] = CELL_ROOM_BIT; // inside room, zone 0
			}
		}
	}

	return grid;
}
