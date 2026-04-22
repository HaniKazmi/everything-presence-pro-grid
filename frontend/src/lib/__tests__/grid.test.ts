import { describe, expect, it } from "vitest";
import {
	CELL_INTERFERENCE_MASK,
	CELL_INTERFERENCE_SHIFT,
	CELL_INTERFERENCE_SUPPRESS,
	CELL_OVERLAY_ENTRY,
	CELL_OVERLAY_ENTRY_LEGACY_MASK,
	CELL_OVERLAY_INTERFERENCE,
	CELL_OVERLAY_MASK,
	CELL_OVERLAY_NONE,
	CELL_OVERLAY_SHIFT,
	CELL_OVERLAY_SUPPRESS,
	CELL_ROOM_BIT,
	cellHasOverlayEntry,
	cellInterference,
	cellIsInside,
	cellOverlay,
	cellSetInside,
	cellSetInterference,
	cellSetOverlay,
	cellSetOverlayEntry,
	cellSetZone,
	cellZone,
	GRID_CELL_COUNT,
	GRID_COLS,
	GRID_ROWS,
	getRawRoomBounds,
	getRoomBounds,
	initGridFromRoom,
	MAX_ZONES,
} from "../grid.js";

describe("cellIsInside", () => {
	it("returns true when room bit is set", () => {
		expect(cellIsInside(0x01)).toBe(true);
		expect(cellIsInside(0x0f)).toBe(true);
	});

	it("returns false when room bit is clear", () => {
		expect(cellIsInside(0x00)).toBe(false);
		expect(cellIsInside(0x0e)).toBe(false);
	});
});

describe("cellZone", () => {
	it("extracts zone 0 from a plain inside cell", () => {
		expect(cellZone(CELL_ROOM_BIT)).toBe(0);
	});

	it("extracts correct zone 1-7", () => {
		for (let z = 0; z <= 7; z++) {
			const val = (z << 1) | CELL_ROOM_BIT;
			expect(cellZone(val)).toBe(z);
		}
	});

	it("ignores the room bit", () => {
		// zone 3, room bit clear
		const val = 3 << 1;
		expect(cellZone(val)).toBe(3);
	});
});

describe("cellSetInside", () => {
	it("sets room bit while preserving zone", () => {
		const val = cellSetZone(0, 5);
		const result = cellSetInside(val, true);
		expect(cellIsInside(result)).toBe(true);
		expect(cellZone(result)).toBe(5);
	});

	it("clears room bit while preserving zone", () => {
		const val = cellSetZone(CELL_ROOM_BIT, 3);
		const result = cellSetInside(val, false);
		expect(cellIsInside(result)).toBe(false);
		expect(cellZone(result)).toBe(3);
	});

	it("round-trips with cellIsInside", () => {
		const val = 0x00;
		expect(cellIsInside(cellSetInside(val, true))).toBe(true);
		expect(cellIsInside(cellSetInside(val, false))).toBe(false);
	});
});

describe("cellSetZone", () => {
	it("sets zone while preserving room bit", () => {
		const result = cellSetZone(CELL_ROOM_BIT, 4);
		expect(cellIsInside(result)).toBe(true);
		expect(cellZone(result)).toBe(4);
	});

	it("overwrites previous zone", () => {
		let val = cellSetZone(CELL_ROOM_BIT, 2);
		val = cellSetZone(val, 6);
		expect(cellZone(val)).toBe(6);
		expect(cellIsInside(val)).toBe(true);
	});

	it("clamps zone to 3 bits (0-7)", () => {
		const result = cellSetZone(0, 0xff);
		expect(cellZone(result)).toBe(7);
	});

	it("round-trips with cellZone", () => {
		for (let z = 0; z <= MAX_ZONES; z++) {
			expect(cellZone(cellSetZone(CELL_ROOM_BIT, z))).toBe(z);
		}
	});
});

describe("getRoomBounds", () => {
	it("returns padded bounds around inside cells", () => {
		const grid = new Uint8Array(GRID_CELL_COUNT);
		// Place a 3x2 room block starting at col=5, row=3
		for (let r = 3; r < 5; r++) {
			for (let c = 5; c < 8; c++) {
				grid[r * GRID_COLS + c] = CELL_ROOM_BIT;
			}
		}
		const bounds = getRoomBounds(grid);
		expect(bounds.minCol).toBe(4); // 5-1
		expect(bounds.maxCol).toBe(8); // 7+1
		expect(bounds.minRow).toBe(2); // 3-1
		expect(bounds.maxRow).toBe(5); // 4+1
	});

	it("clamps padding to grid edges", () => {
		const grid = new Uint8Array(GRID_CELL_COUNT);
		// Place cell at top-left corner (0,0)
		grid[0] = CELL_ROOM_BIT;
		const bounds = getRoomBounds(grid);
		expect(bounds.minCol).toBe(0);
		expect(bounds.minRow).toBe(0);
		expect(bounds.maxCol).toBe(1); // 0+1
		expect(bounds.maxRow).toBe(1); // 0+1
	});

	it("clamps padding at bottom-right corner", () => {
		const grid = new Uint8Array(GRID_CELL_COUNT);
		grid[(GRID_ROWS - 1) * GRID_COLS + (GRID_COLS - 1)] = CELL_ROOM_BIT;
		const bounds = getRoomBounds(grid);
		expect(bounds.maxCol).toBe(GRID_COLS - 1);
		expect(bounds.maxRow).toBe(GRID_ROWS - 1);
	});

	it("handles empty grid gracefully", () => {
		const grid = new Uint8Array(GRID_CELL_COUNT);
		const bounds = getRoomBounds(grid);
		// With no inside cells, minCol=GRID_COLS and maxCol=0 before padding
		// After padding: minCol = max(0, 20-1)=19, maxCol = min(19, 0+1)=1
		// This is the expected degenerate result for an empty grid
		expect(bounds.minCol).toBeGreaterThanOrEqual(0);
		expect(bounds.maxCol).toBeLessThan(GRID_COLS);
	});
});

describe("getRawRoomBounds", () => {
	it("returns exact bounds without padding", () => {
		const grid = new Uint8Array(GRID_CELL_COUNT);
		for (let r = 3; r < 5; r++) {
			for (let c = 5; c < 8; c++) {
				grid[r * GRID_COLS + c] = CELL_ROOM_BIT;
			}
		}
		const bounds = getRawRoomBounds(grid);
		expect(bounds.minCol).toBe(5);
		expect(bounds.maxCol).toBe(7);
		expect(bounds.minRow).toBe(3);
		expect(bounds.maxRow).toBe(4);
	});

	it("returns inverted bounds for empty grid (minCol > maxCol)", () => {
		const grid = new Uint8Array(GRID_CELL_COUNT);
		const bounds = getRawRoomBounds(grid);
		expect(bounds.minCol).toBeGreaterThan(bounds.maxCol);
	});
});

describe("initGridFromRoom", () => {
	it("creates grid with correct number of inside cells", () => {
		// 3000mm x 1500mm = 10 cols x 5 rows = 50 cells
		const grid = initGridFromRoom(3000, 1500);
		let count = 0;
		for (let i = 0; i < GRID_CELL_COUNT; i++) {
			if (cellIsInside(grid[i])) count++;
		}
		expect(count).toBe(50);
	});

	it("centers the room horizontally", () => {
		// 1800mm = 6 cols, centered in 20-col grid → starts at col 7
		const grid = initGridFromRoom(1800, 600);
		const bounds = getRawRoomBounds(grid);
		expect(bounds.minCol).toBe(7);
		expect(bounds.maxCol).toBe(12);
		expect(bounds.minRow).toBe(0);
		expect(bounds.maxRow).toBe(1);
	});

	it("starts room at row 0 (sensor at front wall)", () => {
		const grid = initGridFromRoom(6000, 6000);
		const bounds = getRawRoomBounds(grid);
		expect(bounds.minRow).toBe(0);
	});

	it("returns all-outside grid for zero dimensions", () => {
		const grid = initGridFromRoom(0, 0);
		let count = 0;
		for (let i = 0; i < GRID_CELL_COUNT; i++) {
			if (cellIsInside(grid[i])) count++;
		}
		expect(count).toBe(0);
	});

	it("has correct grid size", () => {
		const grid = initGridFromRoom(3000, 3000);
		expect(grid.length).toBe(GRID_CELL_COUNT);
	});
});

describe("cellHasOverlayEntry", () => {
	it("returns false for plain inside cell", () => {
		expect(cellHasOverlayEntry(CELL_ROOM_BIT)).toBe(false);
	});

	it("returns true when overlay bit is set", () => {
		expect(
			cellHasOverlayEntry(CELL_ROOM_BIT | CELL_OVERLAY_ENTRY_LEGACY_MASK),
		).toBe(true);
	});

	it("returns true regardless of zone bits", () => {
		const val = CELL_ROOM_BIT | CELL_OVERLAY_ENTRY_LEGACY_MASK | (3 << 1);
		expect(cellHasOverlayEntry(val)).toBe(true);
	});
});

describe("cellSetOverlayEntry", () => {
	it("sets overlay bit while preserving room and zone", () => {
		const val = cellSetZone(CELL_ROOM_BIT, 5);
		const result = cellSetOverlayEntry(val, true);
		expect(cellHasOverlayEntry(result)).toBe(true);
		expect(cellIsInside(result)).toBe(true);
		expect(cellZone(result)).toBe(5);
	});

	it("clears overlay bit while preserving room and zone", () => {
		const val = CELL_ROOM_BIT | CELL_OVERLAY_ENTRY_LEGACY_MASK | (2 << 1);
		const result = cellSetOverlayEntry(val, false);
		expect(cellHasOverlayEntry(result)).toBe(false);
		expect(cellIsInside(result)).toBe(true);
		expect(cellZone(result)).toBe(2);
	});

	it("round-trips with cellHasOverlayEntry", () => {
		const val = CELL_ROOM_BIT;
		expect(cellHasOverlayEntry(cellSetOverlayEntry(val, true))).toBe(true);
		expect(cellHasOverlayEntry(cellSetOverlayEntry(val, false))).toBe(false);
	});
});

describe("interference helpers", () => {
	it("cellInterference returns 0 for plain room cell", () => {
		expect(cellInterference(CELL_ROOM_BIT)).toBe(0);
	});

	it("cellInterference extracts value from bits 5-7", () => {
		const cell = CELL_ROOM_BIT | (3 << 5); // level 3
		expect(cellInterference(cell)).toBe(3);
	});

	it("cellInterference extracts suppress sentinel (7)", () => {
		const cell = CELL_ROOM_BIT | (7 << 5);
		expect(cellInterference(cell)).toBe(7);
	});

	it("cellSetInterference sets bits 5-7 without affecting other bits", () => {
		const cell = CELL_ROOM_BIT | CELL_OVERLAY_ENTRY_LEGACY_MASK;
		const result = cellSetInterference(cell, 2);
		expect(cellInterference(result)).toBe(2);
		expect(result & CELL_ROOM_BIT).toBe(CELL_ROOM_BIT);
	});

	it("cellSetInterference clears entry overlay (mutual exclusivity)", () => {
		const cell = CELL_ROOM_BIT | CELL_OVERLAY_ENTRY_LEGACY_MASK;
		const result = cellSetInterference(cell, 1);
		expect(cellHasOverlayEntry(result)).toBe(false);
		expect(cellInterference(result)).toBe(1);
	});

	it("cellSetInterference with 0 does not clear entry overlay", () => {
		const cell = CELL_ROOM_BIT | CELL_OVERLAY_ENTRY_LEGACY_MASK;
		const result = cellSetInterference(cell, 0);
		expect(cellHasOverlayEntry(result)).toBe(true);
		expect(cellInterference(result)).toBe(0);
	});

	it("cellSetOverlayEntry clears interference (mutual exclusivity)", () => {
		const cell = CELL_ROOM_BIT | (3 << 5);
		const result = cellSetOverlayEntry(cell, true);
		expect(cellInterference(result)).toBe(0);
		expect(cellHasOverlayEntry(result)).toBe(true);
	});

	it("cellSetOverlayEntry(false) does not clear interference", () => {
		const cell = CELL_ROOM_BIT | (2 << 5);
		const result = cellSetOverlayEntry(cell, false);
		expect(cellInterference(result)).toBe(2);
	});

	it("CELL_INTERFERENCE_MASK is 0xE0", () => {
		expect(CELL_INTERFERENCE_MASK).toBe(0xe0);
	});

	it("CELL_INTERFERENCE_SHIFT is 5", () => {
		expect(CELL_INTERFERENCE_SHIFT).toBe(5);
	});

	it("CELL_INTERFERENCE_SUPPRESS is 2", () => {
		expect(CELL_INTERFERENCE_SUPPRESS).toBe(2);
	});
});

describe("cellOverlay (new 2-bit overlay field)", () => {
	it("returns CELL_OVERLAY_NONE for plain room cell", () => {
		expect(cellOverlay(CELL_ROOM_BIT)).toBe(CELL_OVERLAY_NONE);
	});

	it("extracts entry kind from bits 4-5", () => {
		const v = CELL_ROOM_BIT | (CELL_OVERLAY_ENTRY << CELL_OVERLAY_SHIFT);
		expect(cellOverlay(v)).toBe(CELL_OVERLAY_ENTRY);
	});

	it("extracts interference kind from bits 4-5", () => {
		const v = CELL_ROOM_BIT | (CELL_OVERLAY_INTERFERENCE << CELL_OVERLAY_SHIFT);
		expect(cellOverlay(v)).toBe(CELL_OVERLAY_INTERFERENCE);
	});

	it("extracts suppress kind from bits 4-5", () => {
		const v = CELL_ROOM_BIT | (CELL_OVERLAY_SUPPRESS << CELL_OVERLAY_SHIFT);
		expect(cellOverlay(v)).toBe(CELL_OVERLAY_SUPPRESS);
	});

	it("ignores bits outside the overlay mask", () => {
		// Set bits 6-7 (unused) and zone bits — should not affect overlay read
		const v = 0b11_00_111_1 | (CELL_OVERLAY_INTERFERENCE << CELL_OVERLAY_SHIFT);
		expect(cellOverlay(v)).toBe(CELL_OVERLAY_INTERFERENCE);
	});
});

describe("cellSetOverlay", () => {
	it("sets entry kind, preserves room and zone", () => {
		const v = cellSetZone(CELL_ROOM_BIT, 5);
		const result = cellSetOverlay(v, CELL_OVERLAY_ENTRY);
		expect(cellOverlay(result)).toBe(CELL_OVERLAY_ENTRY);
		expect(cellIsInside(result)).toBe(true);
		expect(cellZone(result)).toBe(5);
	});

	it("overwrites previous overlay kind", () => {
		let v = cellSetOverlay(CELL_ROOM_BIT, CELL_OVERLAY_ENTRY);
		v = cellSetOverlay(v, CELL_OVERLAY_SUPPRESS);
		expect(cellOverlay(v)).toBe(CELL_OVERLAY_SUPPRESS);
	});

	it("clears overlay when kind is CELL_OVERLAY_NONE", () => {
		const v = cellSetOverlay(CELL_ROOM_BIT, CELL_OVERLAY_INTERFERENCE);
		const result = cellSetOverlay(v, CELL_OVERLAY_NONE);
		expect(cellOverlay(result)).toBe(CELL_OVERLAY_NONE);
	});

	it("clamps kind to 2 bits (0-3)", () => {
		const result = cellSetOverlay(0, 0xff);
		expect(cellOverlay(result)).toBe(3);
	});

	it("round-trips for each kind", () => {
		for (const k of [
			CELL_OVERLAY_NONE,
			CELL_OVERLAY_ENTRY,
			CELL_OVERLAY_INTERFERENCE,
			CELL_OVERLAY_SUPPRESS,
		]) {
			expect(cellOverlay(cellSetOverlay(CELL_ROOM_BIT, k))).toBe(k);
		}
	});
});
