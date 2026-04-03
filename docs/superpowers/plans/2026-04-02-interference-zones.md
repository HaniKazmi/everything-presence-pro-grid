# Interference Zones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-cell interference overlays that increase trigger/renew thresholds (or suppress detection entirely) for cells with persistent movement sources like fans or curtains.

**Architecture:** Bits 5-7 of the cell byte encode interference level (0=none, 1-3=add 2/4/6 to thresholds, 7=suppress). A new "Overlays" tab in the editor sidebar hosts both entry/exit and interference painting. On the live view, clicking a target offers "Mark as ghost" to increment interference on that cell. Both zone engines (TypeScript + C++ firmware) read the interference bits and adjust thresholds accordingly.

**Tech Stack:** TypeScript/Lit (frontend), C++ (firmware), Vitest (tests)

**Spec:** `docs/superpowers/specs/2026-04-02-interference-zones-design.md`

---

### Task 1: Cell Byte Constants & Helpers (TypeScript)

**Files:**
- Modify: `frontend/src/lib/grid.ts:1-26`
- Test: `frontend/src/lib/__tests__/grid.test.ts` (create if needed, or add to existing)

- [ ] **Step 1: Write failing tests for interference helpers**

In `frontend/src/lib/__tests__/grid.test.ts`, add tests for the new interference helpers. If this file doesn't exist, create it.

```typescript
import { describe, expect, it } from "vitest";
import {
  CELL_INTERFERENCE_MASK,
  CELL_INTERFERENCE_SHIFT,
  CELL_INTERFERENCE_SUPPRESS,
  CELL_OVERLAY_ENTRY,
  CELL_ROOM_BIT,
  cellInterference,
  cellSetInterference,
  cellHasOverlayEntry,
  cellSetOverlayEntry,
} from "../grid.js";

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
    const cell = CELL_ROOM_BIT | CELL_OVERLAY_ENTRY; // room + entry overlay
    const result = cellSetInterference(cell, 2);
    expect(cellInterference(result)).toBe(2);
    expect(result & CELL_ROOM_BIT).toBe(CELL_ROOM_BIT); // room preserved
  });

  it("cellSetInterference clears entry overlay (mutual exclusivity)", () => {
    const cell = CELL_ROOM_BIT | CELL_OVERLAY_ENTRY;
    const result = cellSetInterference(cell, 1);
    expect(cellHasOverlayEntry(result)).toBe(false);
    expect(cellInterference(result)).toBe(1);
  });

  it("cellSetInterference with 0 does not clear entry overlay", () => {
    const cell = CELL_ROOM_BIT | CELL_OVERLAY_ENTRY;
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

  it("CELL_INTERFERENCE_SUPPRESS is 7", () => {
    expect(CELL_INTERFERENCE_SUPPRESS).toBe(7);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/__tests__/grid.test.ts`
Expected: FAIL — `cellInterference` and constants not exported from grid.ts

- [ ] **Step 3: Add interference constants and helpers to grid.ts**

In `frontend/src/lib/grid.ts`, update the comment header, add constants, add helpers, and modify `cellSetOverlayEntry` to enforce mutual exclusivity:

```typescript
// Bit 0: room (0=outside, 1=inside)
// Bits 1-3: zone (0=room default, 1-7=named zone)
// Bit 4: overlay — entry/exit
// Bits 5-7: interference level (0=none, 1-3=+2/4/6 thresh, 7=suppress)
export const CELL_ROOM_BIT = 0x01;
export const CELL_ZONE_MASK = 0x0e; // bits 1-3
export const CELL_ZONE_SHIFT = 1;
export const CELL_OVERLAY_ENTRY = 0x10; // bit 4
export const CELL_INTERFERENCE_MASK = 0xe0; // bits 5-7
export const CELL_INTERFERENCE_SHIFT = 5;
export const CELL_INTERFERENCE_SUPPRESS = 7;
export const MAX_ZONES = 7;
```

Update `cellSetOverlayEntry` to clear interference when setting entry overlay:

```typescript
export const cellSetOverlayEntry = (v: number, on: boolean): number =>
	on
		? (v | CELL_OVERLAY_ENTRY) & ~CELL_INTERFERENCE_MASK
		: v & ~CELL_OVERLAY_ENTRY;
```

Add interference helpers:

```typescript
export const cellInterference = (v: number): number =>
	(v >> CELL_INTERFERENCE_SHIFT) & 0x07;
export const cellSetInterference = (v: number, level: number): number =>
	level > 0
		? ((v & ~CELL_INTERFERENCE_MASK) | ((level & 0x07) << CELL_INTERFERENCE_SHIFT)) & ~CELL_OVERLAY_ENTRY
		: (v & ~CELL_INTERFERENCE_MASK);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/lib/__tests__/grid.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite to check for regressions**

Run: `cd frontend && npx vitest run`
Expected: All tests pass. The changed `cellSetOverlayEntry` signature is backward-compatible (same args), but behaviour now clears interference bits when setting entry — check no tests assume entry + interference can coexist.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/grid.ts frontend/src/lib/__tests__/grid.test.ts
git commit -m "feat: add interference cell byte constants and helpers"
```

---

### Task 2: Cell Byte Constants & Helpers (C++ Firmware)

**Files:**
- Modify: `firmware/lib/epp_zone_engine/include/epp_types.h:19-21`
- Modify: `firmware/lib/epp_zone_engine/include/epp_grid.h:25-26`
- Modify: `firmware/lib/epp_zone_engine/src/epp_grid.cpp:35-37`

No firmware tests exist, so this is a code-only task matching the TypeScript helpers.

- [ ] **Step 1: Update constants in epp_types.h**

Replace lines 20-21 in `firmware/lib/epp_zone_engine/include/epp_types.h`:

```cpp
constexpr uint8_t CELL_INTERFERENCE_MASK = 0xE0;  // bits 5-7: interference level
constexpr int CELL_INTERFERENCE_SHIFT = 5;
constexpr int CELL_INTERFERENCE_SUPPRESS = 7;
```

- [ ] **Step 2: Add interference method to Grid class in epp_grid.h**

After `cell_has_overlay_entry` (line 26), add:

```cpp
    /// Extract the interference level (0-7) from a cell byte.
    int cell_interference(int cell_index) const;
```

- [ ] **Step 3: Implement cell_interference in epp_grid.cpp**

After `cell_has_overlay_entry` implementation (line 37), add:

```cpp
int Grid::cell_interference(int cell_index) const {
    return (cells_[cell_index] & CELL_INTERFERENCE_MASK) >> CELL_INTERFERENCE_SHIFT;
}
```

- [ ] **Step 4: Commit**

```bash
git add firmware/lib/epp_zone_engine/include/epp_types.h \
       firmware/lib/epp_zone_engine/include/epp_grid.h \
       firmware/lib/epp_zone_engine/src/epp_grid.cpp
git commit -m "feat: add interference cell byte constants and helpers (firmware)"
```

---

### Task 3: Zone Engine — Interference Logic (TypeScript)

**Files:**
- Modify: `frontend/src/lib/zone-engine.ts:1-10,169-270`
- Test: `frontend/src/lib/__tests__/zone-engine.test.ts`

- [ ] **Step 1: Write failing tests for interference threshold adjustment**

Add to `frontend/src/lib/__tests__/zone-engine.test.ts`:

```typescript
import {
  CELL_ROOM_BIT,
  cellSetOverlayEntry,
  cellSetZone,
  cellSetInterference,
  CELL_INTERFERENCE_SUPPRESS,
  GRID_CELL_COUNT,
  GRID_COLS,
} from "../grid.js";
```

Update the imports at the top of the file to include `cellSetInterference` and `CELL_INTERFERENCE_SUPPRESS`.

Then add a new describe block:

```typescript
describe("interference zones", () => {
  let state: ZoneEngineState;

  beforeEach(() => {
    state = createZoneEngineState();
  });

  it("interference level 1 adds +2 to trigger threshold", () => {
    // Zone 1 has trigger=3. With interference level 1, effective trigger=5.
    // Signal=4 should NOT trigger (4 < 5).
    const grid = makeParityGrid();
    // Cell (col=9, row=1) is zone 1. Set interference level 1.
    grid[1 * GRID_COLS + 9] = cellSetInterference(
      cellSetZone(CELL_ROOM_BIT, 1),
      1,
    );
    // Also set entry overlay on the cell so we bypass gating
    grid[1 * GRID_COLS + 9] = cellSetOverlayEntry(grid[1 * GRID_COLS + 9], true);
    // Wait — entry overlay clears interference. Use a neighbor overlay instead.
    // Set overlay on adjacent cell (col=8, row=1) which is zone 0
    grid[1 * GRID_COLS + 8] = cellSetOverlayEntry(grid[1 * GRID_COLS + 8], true);
    // Re-set interference on the target cell (no entry overlay)
    grid[1 * GRID_COLS + 9] = cellSetInterference(
      cellSetZone(CELL_ROOM_BIT, 1),
      1,
    );

    const params = makeDefaultParams({
      targets: [makeTarget(450, 450, 4)], // signal 4
      grid,
    });
    // With overlay neighbor, gating is bypassed. Effective trigger = 3+2 = 5.
    // Signal 4 < 5, should NOT occupy.
    const result = runLocalZoneEngine(state, params);
    expect(result.occupancy[1]).toBe(false);
  });

  it("interference level 1 allows detection when signal meets adjusted threshold", () => {
    const grid = makeParityGrid();
    grid[1 * GRID_COLS + 9] = cellSetInterference(
      cellSetZone(CELL_ROOM_BIT, 1),
      1,
    );
    grid[1 * GRID_COLS + 8] = cellSetOverlayEntry(grid[1 * GRID_COLS + 8], true);

    const params = makeDefaultParams({
      targets: [makeTarget(450, 450, 5)], // signal 5 >= effective trigger 5
      grid,
    });
    const result = runLocalZoneEngine(state, params);
    expect(result.occupancy[1]).toBe(true);
  });

  it("interference level 3 adds +6, capped at 9", () => {
    // Zone 1 trigger=3 + 6 = 9. Signal 8 should NOT trigger.
    const grid = makeParityGrid();
    grid[1 * GRID_COLS + 9] = cellSetInterference(
      cellSetZone(CELL_ROOM_BIT, 1),
      3,
    );
    grid[1 * GRID_COLS + 8] = cellSetOverlayEntry(grid[1 * GRID_COLS + 8], true);

    const params = makeDefaultParams({
      targets: [makeTarget(450, 450, 8)], // signal 8 < 9
      grid,
    });
    const result = runLocalZoneEngine(state, params);
    expect(result.occupancy[1]).toBe(false);
  });

  it("interference suppress (7) prevents detection entirely", () => {
    const grid = makeParityGrid();
    grid[1 * GRID_COLS + 9] = cellSetInterference(
      cellSetZone(CELL_ROOM_BIT, 1),
      CELL_INTERFERENCE_SUPPRESS,
    );
    grid[1 * GRID_COLS + 8] = cellSetOverlayEntry(grid[1 * GRID_COLS + 8], true);

    const params = makeDefaultParams({
      targets: [makeTarget(450, 450, 9)], // max signal
      grid,
    });
    const result = runLocalZoneEngine(state, params);
    expect(result.occupancy[1]).toBe(false);
  });

  it("interference affects renew threshold too", () => {
    // First, occupy zone 1 normally (no interference)
    const grid = makeParityGrid();
    grid[1 * GRID_COLS + 8] = cellSetOverlayEntry(grid[1 * GRID_COLS + 8], true);
    const params = makeDefaultParams({
      targets: [makeTarget(450, 450, 5)],
      grid,
    });
    runLocalZoneEngine(state, params);
    expect(state.localZoneState.get(1)?.occupied).toBe(true);

    // Now add interference level 2 (+4 to renew). Zone 1 renew=2, effective=6.
    // Signal=5 should NOT sustain (5 < 6), starting pending-clear.
    grid[1 * GRID_COLS + 9] = cellSetInterference(
      cellSetZone(CELL_ROOM_BIT, 1),
      2,
    );
    const params2 = makeDefaultParams({
      targets: [makeTarget(450, 450, 5)],
      grid,
      now: params.now + 0.1,
    });
    const result2 = runLocalZoneEngine(state, params2);
    // Zone should start pending-clear since signal < effective renew
    expect(state.localZoneState.get(1)?.pendingSince).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/__tests__/zone-engine.test.ts`
Expected: FAIL — zone engine doesn't read interference bits yet

- [ ] **Step 3: Implement interference logic in zone-engine.ts**

In `frontend/src/lib/zone-engine.ts`:

Add `cellInterference` and `CELL_INTERFERENCE_SUPPRESS` to the imports from `./grid.js` (line 2-9):

```typescript
import {
	cellHasOverlayEntry,
	cellInterference,
	cellIsInside,
	cellZone,
	CELL_INTERFERENCE_SUPPRESS,
	GRID_CELL_COUNT,
	GRID_COLS,
	GRID_ROWS,
} from "./grid.js";
```

After line 170 (`const cellVal = params.grid[idx];`) and line 171 (`if (!cellIsInside(cellVal)) {`), add a suppress check. After the `cellIsInside` check block (around line 176, after the `continue;`), add:

```typescript
		// Interference suppress: skip this cell entirely
		const interference = cellInterference(cellVal);
		if (interference === CELL_INTERFERENCE_SUPPRESS) {
			state.targetPrev[i] = null;
			state.targetGateCount[i] = 0;
			continue;
		}
```

Then after line 211 (`const { trigger, renew } = thresholds;`), add the interference threshold adjustment:

```typescript
		// Apply interference: increase thresholds
		const effectiveTrigger = interference > 0
			? Math.min(trigger + interference * 2, 9)
			: trigger;
		const effectiveRenew = interference > 0
			? Math.min(renew + interference * 2, 9)
			: renew;
```

Then update line 216 to use effective thresholds:

```typescript
		let baseTrigger = isClear ? effectiveTrigger : effectiveRenew;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/lib/__tests__/zone-engine.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/zone-engine.ts frontend/src/lib/__tests__/zone-engine.test.ts
git commit -m "feat: zone engine reads interference bits, adjusts trigger/renew thresholds"
```

---

### Task 4: Zone Engine — Interference Logic (C++ Firmware)

**Files:**
- Modify: `firmware/lib/epp_zone_engine/src/epp_zone_engine.cpp:228-300`

No firmware tests. Match the TypeScript logic exactly.

- [ ] **Step 1: Add suppress check after cell lookup**

In `epp_zone_engine.cpp`, after the existing `cell_is_room` check (around line 205-210 where the target is skipped if outside room), add:

```cpp
        // Interference suppress: skip this cell entirely
        int interference = grid_.cell_interference(cell);
        if (interference == CELL_INTERFERENCE_SUPPRESS) {
            target_has_prev_[i] = false;
            target_gate_count_[i] = 0;
            continue;
        }
```

- [ ] **Step 2: Adjust thresholds based on interference level**

After lines 230-231 where `trigger_thresh` and `renew_thresh` are computed:

```cpp
            int trigger_thresh = threshold_to_frame_count(rt.config.trigger);
            int renew_thresh = threshold_to_frame_count(rt.config.renew);

            // Apply interference: increase thresholds
            if (interference > 0) {
                trigger_thresh = std::min(trigger_thresh + interference * 2, 9);
                renew_thresh = std::min(renew_thresh + interference * 2, 9);
            }
```

- [ ] **Step 3: Commit**

```bash
git add firmware/lib/epp_zone_engine/src/epp_zone_engine.cpp
git commit -m "feat: firmware zone engine reads interference bits, adjusts thresholds"
```

---

### Task 5: Interference Cell Painting

**Files:**
- Modify: `frontend/src/lib/cell-painting.ts`
- Test: `frontend/src/lib/__tests__/cell-painting.test.ts`

- [ ] **Step 1: Write failing tests for interference painting**

Add to `frontend/src/lib/__tests__/cell-painting.test.ts`:

Update imports to include new functions and constants:

```typescript
import {
  applyOverlayPaintToCell,
  applyPaintToCell,
  clearZoneFromGrid,
  determineOverlayPaintAction,
  determinePaintAction,
  applyInterferencePaintToCell,
  determineInterferencePaintAction,
} from "../cell-painting.js";
import {
  CELL_OVERLAY_ENTRY,
  CELL_ROOM_BIT,
  cellHasOverlayEntry,
  cellInterference,
  cellIsInside,
  cellSetInterference,
  cellSetOverlayEntry,
  cellSetZone,
  cellZone,
  GRID_CELL_COUNT,
  MAX_ZONES,
} from "../grid.js";
```

Add test block:

```typescript
describe("determineInterferencePaintAction", () => {
  it("returns 'set' when cell has no interference at this level", () => {
    expect(determineInterferencePaintAction(CELL_ROOM_BIT, 2)).toBe("set");
  });

  it("returns 'clear' when cell already has this interference level", () => {
    const cell = cellSetInterference(CELL_ROOM_BIT, 2);
    expect(determineInterferencePaintAction(cell, 2)).toBe("clear");
  });

  it("returns 'set' when cell has a different interference level", () => {
    const cell = cellSetInterference(CELL_ROOM_BIT, 1);
    expect(determineInterferencePaintAction(cell, 3)).toBe("set");
  });
});

describe("applyInterferencePaintToCell", () => {
  it("sets interference level on inside cell", () => {
    const result = applyInterferencePaintToCell(CELL_ROOM_BIT, 2, "set");
    expect(result).not.toBeNull();
    expect(cellInterference(result!)).toBe(2);
  });

  it("clears interference on inside cell", () => {
    const cell = cellSetInterference(CELL_ROOM_BIT, 3);
    const result = applyInterferencePaintToCell(cell, 3, "clear");
    expect(result).not.toBeNull();
    expect(cellInterference(result!)).toBe(0);
  });

  it("returns null for outside cell", () => {
    expect(applyInterferencePaintToCell(0, 2, "set")).toBeNull();
  });

  it("clears entry overlay when setting interference (mutual exclusivity)", () => {
    const cell = CELL_ROOM_BIT | CELL_OVERLAY_ENTRY;
    const result = applyInterferencePaintToCell(cell, 1, "set");
    expect(result).not.toBeNull();
    expect(cellHasOverlayEntry(result!)).toBe(false);
    expect(cellInterference(result!)).toBe(1);
  });

  it("preserves zone bits when setting interference", () => {
    const cell = cellSetZone(CELL_ROOM_BIT, 3);
    const result = applyInterferencePaintToCell(cell, 2, "set");
    expect(result).not.toBeNull();
    expect(cellZone(result!)).toBe(3);
    expect(cellInterference(result!)).toBe(2);
  });

  it("sets suppress level (7)", () => {
    const result = applyInterferencePaintToCell(CELL_ROOM_BIT, 7, "set");
    expect(result).not.toBeNull();
    expect(cellInterference(result!)).toBe(7);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/__tests__/cell-painting.test.ts`
Expected: FAIL — `applyInterferencePaintToCell` and `determineInterferencePaintAction` not exported

- [ ] **Step 3: Implement interference painting functions**

Add to `frontend/src/lib/cell-painting.ts`:

Update imports:

```typescript
import {
  CELL_ROOM_BIT,
  cellHasOverlayEntry,
  cellInterference,
  cellIsInside,
  cellSetInterference,
  cellSetOverlayEntry,
  cellSetZone,
  cellZone,
  GRID_CELL_COUNT,
  MAX_ZONES,
} from "./grid.js";
```

Add new functions after `applyOverlayPaintToCell`:

```typescript
/**
 * Determine the paint action for an interference paint stroke.
 *
 * @param cellValue Current cell byte value
 * @param level Interference level to paint (1-3 or 7 for suppress)
 * @returns "clear" if cell already has this level, "set" otherwise
 */
export function determineInterferencePaintAction(
	cellValue: number,
	level: number,
): PaintAction {
	return cellInterference(cellValue) === level ? "clear" : "set";
}

/**
 * Apply an interference paint action to a single grid cell.
 *
 * Returns null if the cell is outside the room.
 */
export function applyInterferencePaintToCell(
	cellValue: number,
	level: number,
	paintAction: PaintAction,
): number | null {
	if (!cellIsInside(cellValue)) return null;
	return cellSetInterference(cellValue, paintAction === "set" ? level : 0);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/lib/__tests__/cell-painting.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/cell-painting.ts frontend/src/lib/__tests__/cell-painting.test.ts
git commit -m "feat: add interference painting functions"
```

---

### Task 6: Grid Cell Rendering — Interference Stripes

**Files:**
- Modify: `frontend/src/components/epp-grid.ts:6-12,185-189`
- Test: `frontend/src/__tests__/components/epp-grid.test.ts`

- [ ] **Step 1: Write failing test for interference cell rendering**

Add to `frontend/src/__tests__/components/epp-grid.test.ts`:

```typescript
import {
  cellSetInterference,
  CELL_INTERFERENCE_SUPPRESS,
} from "../../lib/grid.js";
```

Add test:

```typescript
describe("interference cell rendering", () => {
  it("renders -45deg red stripes for interference level 1", () => {
    const el = createGrid();
    el.grid[0] = cellSetInterference(CELL_ROOM_BIT, 1);
    el.requestUpdate();
    const rendered = (el as any).render();
    const html = renderToString(rendered);
    expect(html).toContain("repeating-linear-gradient(-45deg");
    expect(html).toContain("#cc3333");
  });

  it("renders cross-hatch for suppress level", () => {
    const el = createGrid();
    el.grid[0] = cellSetInterference(CELL_ROOM_BIT, CELL_INTERFERENCE_SUPPRESS);
    el.requestUpdate();
    const rendered = (el as any).render();
    const html = renderToString(rendered);
    // Suppress has both -45deg and 45deg
    expect(html).toContain("-45deg");
    expect(html).toContain("45deg");
  });
});
```

Note: adapt the test setup to match existing patterns in this test file. The exact approach depends on how the existing tests render and inspect grid HTML.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/components/epp-grid.test.ts`
Expected: FAIL — no interference rendering code yet

- [ ] **Step 3: Implement interference rendering in epp-grid.ts**

In `frontend/src/components/epp-grid.ts`, add imports:

```typescript
import {
  cellHasOverlayEntry,
  cellInterference,
  cellIsInside,
  cellZone,
  CELL_INTERFERENCE_SUPPRESS,
  GRID_COLS,
  getRoomBounds,
} from "../lib/grid.js";
```

Replace the overlay marker block (lines 185-189) with:

```typescript
				let overlayMarker = "";
				if (cellIsInside(cellVal)) {
					if (cellHasOverlayEntry(cellVal)) {
						overlayMarker =
							"background-image: repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(60,60,60,0.7) 6px, rgba(60,60,60,0.7) 8px);";
					} else {
						const interf = cellInterference(cellVal);
						if (interf === CELL_INTERFERENCE_SUPPRESS) {
							overlayMarker =
								"background-image: repeating-linear-gradient(-45deg, transparent, transparent 5px, #cc3333 5px, #cc3333 7px), repeating-linear-gradient(45deg, transparent, transparent 5px, #cc3333 5px, #cc3333 7px);";
						} else if (interf === 3) {
							overlayMarker =
								"background-image: repeating-linear-gradient(-45deg, transparent, transparent 3px, #cc3333 3px, #cc3333 5px);";
						} else if (interf === 2) {
							overlayMarker =
								"background-image: repeating-linear-gradient(-45deg, transparent, transparent 5px, #cc3333 5px, #cc3333 7px);";
						} else if (interf === 1) {
							overlayMarker =
								"background-image: repeating-linear-gradient(-45deg, transparent, transparent 8px, #cc3333 8px, #cc3333 10px);";
						}
					}
				}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/__tests__/components/epp-grid.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/epp-grid.ts frontend/src/__tests__/components/epp-grid.test.ts
git commit -m "feat: render interference stripes on grid cells"
```

---

### Task 7: Overlay Sidebar Component

**Files:**
- Create: `frontend/src/components/epp-overlay-sidebar.ts`
- Test: `frontend/src/__tests__/components/epp-overlay-sidebar.test.ts`

- [ ] **Step 1: Write failing tests for overlay sidebar**

Create `frontend/src/__tests__/components/epp-overlay-sidebar.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";
import "../../../src/components/epp-overlay-sidebar.js";
import { EppOverlaySidebar } from "../../components/epp-overlay-sidebar.js";

function createElement(): EppOverlaySidebar {
  const el = document.createElement(
    "epp-overlay-sidebar",
  ) as EppOverlaySidebar;
  el.localize = (k: string) => k;
  return el;
}

describe("EppOverlaySidebar", () => {
  it("can be created", () => {
    const el = createElement();
    expect(el).toBeInstanceOf(EppOverlaySidebar);
  });

  it("dispatches overlay-select with mode 'entry' when entry/exit clicked", () => {
    const el = createElement();
    const spy = vi.fn();
    el.addEventListener("overlay-select", spy);
    el.overlayMode = null;
    const rendered = (el as any).render();
    // Verify render doesn't throw
    expect(rendered).toBeTruthy();
  });

  it("dispatches overlay-select with mode 'interference' when interference clicked", () => {
    const el = createElement();
    const spy = vi.fn();
    el.addEventListener("overlay-select", spy);
    el.overlayMode = null;
    const rendered = (el as any).render();
    expect(rendered).toBeTruthy();
  });

  it("dispatches interference-level-change when level button clicked", () => {
    const el = createElement();
    el.overlayMode = "interference";
    const rendered = (el as any).render();
    expect(rendered).toBeTruthy();
  });

  it("defaults interferenceLevel to 1", () => {
    const el = createElement();
    expect(el.interferenceLevel).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/__tests__/components/epp-overlay-sidebar.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create the overlay sidebar component**

Create `frontend/src/components/epp-overlay-sidebar.ts`:

```typescript
import { css, html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";
import { CELL_INTERFERENCE_SUPPRESS } from "../lib/grid.js";

export class EppOverlaySidebar extends LitElement {
  @property({ attribute: false }) overlayMode: string | null = null;
  @property({ type: Number }) interferenceLevel: number = 1;
  @property({ attribute: false }) localize: (
    key: string,
    params?: Record<string, string | number>,
  ) => string = (k) => k;

  static styles = css`
    :host {
      display: block;
    }
    .overlay-item {
      padding: 8px;
      border-radius: 6px;
      background: var(--card-background-color, #2a2a2a);
      border: 1px solid var(--divider-color, #444);
      margin-bottom: 8px;
      cursor: pointer;
    }
    .overlay-item.active {
      border-color: var(--primary-color, #03a9f4);
    }
    .overlay-item-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .overlay-dot {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 1px solid var(--divider-color, #666);
      flex-shrink: 0;
    }
    .overlay-name {
      flex: 1;
      font-size: 13px;
    }
    .overlay-hint {
      font-size: 11px;
      color: var(--secondary-text-color, #888);
    }
    .level-selector {
      padding: 8px 0 0 28px;
    }
    .level-label {
      font-size: 11px;
      color: var(--secondary-text-color, #888);
      margin-bottom: 6px;
    }
    .level-buttons {
      display: flex;
      gap: 4px;
    }
    .level-btn {
      width: 32px;
      height: 28px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid var(--divider-color, #555);
      background: var(--card-background-color, #333);
      color: var(--secondary-text-color, #aaa);
    }
    .level-btn.active {
      background: var(--primary-color, #03a9f4);
      color: #fff;
      border-color: var(--primary-color, #03a9f4);
    }
    .level-info {
      font-size: 10px;
      color: var(--disabled-text-color, #666);
      margin-top: 4px;
    }
  `;

  render() {
    return html`
      <div
        class="overlay-item ${this.overlayMode === "entry" ? "active" : ""}"
        @click=${() => this._selectOverlay("entry")}
      >
        <div class="overlay-item-row">
          <div
            class="overlay-dot"
            style="background: repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(60,60,60,0.7) 3px, rgba(60,60,60,0.7) 4px);"
          ></div>
          <span class="overlay-name"
            >${this.localize("overlays.entry_exit")}</span
          >
          <span class="overlay-hint"
            >${this.localize("overlays.click_to_paint")}</span
          >
        </div>
      </div>

      <div
        class="overlay-item ${this.overlayMode === "interference" ? "active" : ""}"
        @click=${() => this._selectOverlay("interference")}
      >
        <div class="overlay-item-row">
          <div
            class="overlay-dot"
            style="background: repeating-linear-gradient(-45deg, transparent, transparent 3px, #cc3333 3px, #cc3333 4px);"
          ></div>
          <span class="overlay-name"
            >${this.localize("overlays.interference")}</span
          >
          <span class="overlay-hint"
            >${this.localize("overlays.click_to_paint")}</span
          >
        </div>
        ${this.overlayMode === "interference"
          ? html`
              <div class="level-selector">
                <div class="level-label">
                  ${this.localize("overlays.level")}
                </div>
                <div class="level-buttons">
                  ${[1, 2, 3].map(
                    (lvl) => html`
                      <div
                        class="level-btn ${this.interferenceLevel === lvl ? "active" : ""}"
                        @click=${(e: Event) => {
                          e.stopPropagation();
                          this._setLevel(lvl);
                        }}
                      >
                        ${lvl}
                      </div>
                    `,
                  )}
                  <div
                    class="level-btn ${this.interferenceLevel === CELL_INTERFERENCE_SUPPRESS ? "active" : ""}"
                    @click=${(e: Event) => {
                      e.stopPropagation();
                      this._setLevel(CELL_INTERFERENCE_SUPPRESS);
                    }}
                  >
                    ✕
                  </div>
                </div>
                <div class="level-info">
                  ${this.localize("overlays.level_info")}
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _selectOverlay(mode: string): void {
    const newMode = this.overlayMode === mode ? null : mode;
    this.dispatchEvent(
      new CustomEvent("overlay-select", {
        detail: { mode: newMode },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _setLevel(level: number): void {
    this.interferenceLevel = level;
    this.dispatchEvent(
      new CustomEvent("interference-level-change", {
        detail: { level },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

customElements.define("epp-overlay-sidebar", EppOverlaySidebar);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/__tests__/components/epp-overlay-sidebar.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/epp-overlay-sidebar.ts \
       frontend/src/__tests__/components/epp-overlay-sidebar.test.ts
git commit -m "feat: add overlay sidebar component with entry/exit and interference"
```

---

### Task 8: Panel Wiring — Overlays Tab & Painting Integration

**Files:**
- Modify: `frontend/src/eppgrid-panel.ts:116,179,622,1505-1540`
- Modify: `frontend/src/controllers/grid-state-controller.ts:60-136`
- Modify: `frontend/src/components/epp-zone-sidebar.ts:354-378`
- Test: existing panel test files

- [ ] **Step 1: Write failing test for overlays tab**

Add a test to the appropriate panel test file (e.g. `frontend/src/__tests__/panel-render-views.test.ts` or create a new `panel-overlays.test.ts`):

```typescript
it("renders epp-overlay-sidebar when _sidebarTab is 'overlays'", () => {
  a._sidebarTab = "overlays";
  const rendered = a._renderEditorView();
  const html = renderToString(rendered);
  expect(html).toContain("epp-overlay-sidebar");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run` (relevant test file)
Expected: FAIL — "overlays" is not a valid `_sidebarTab` value yet

- [ ] **Step 3: Update _sidebarTab type and add overlays tab**

In `frontend/src/eppgrid-panel.ts`:

Line 116 — update type:
```typescript
@state() private _sidebarTab: "zones" | "overlays" | "furniture" | "live" = "zones";
```

Add a state property for interference level (near line 179 where `_overlayMode` is):
```typescript
@state() private _interferenceLevel: number = 1;
```

Update `_enterEditor` (line 622) to accept overlays:
```typescript
private _enterEditor(tab: "zones" | "overlays" | "furniture"): void {
```

Add import for the overlay sidebar component:
```typescript
import "./components/epp-overlay-sidebar.js";
```

In the sidebar rendering section (around lines 1505-1540), add the overlays tab case. Update the sidebar title (line 1508) to handle three tabs:
```typescript
<div class="sidebar-title">${
  this._sidebarTab === "furniture"
    ? this._localize("sidebar.furniture")
    : this._sidebarTab === "overlays"
      ? this._localize("sidebar.overlays")
      : this._localize("sidebar.detection_zones")
}</div>
```

Add the overlays sidebar rendering in the tab switch (after the zones case, before the furniture case):
```typescript
: this._sidebarTab === "overlays"
  ? html`<epp-overlay-sidebar
      .overlayMode=${this._overlayMode}
      .interferenceLevel=${this._interferenceLevel}
      .localize=${this._localize}
      @overlay-select=${(e: CustomEvent) => {
        this._overlayMode = e.detail.mode;
      }}
      @interference-level-change=${(e: CustomEvent) => {
        this._interferenceLevel = e.detail.level;
      }}
    ></epp-overlay-sidebar>`
```

- [ ] **Step 4: Remove overlays section from zone sidebar**

In `frontend/src/components/epp-zone-sidebar.ts`, remove lines 354-378 (the `<hr>`, overlays header, and entry/exit toggle). Also remove the `overlayMode` property and `overlay-select` event since they're no longer needed in this component.

- [ ] **Step 5: Update grid-state-controller to handle interference painting**

In `frontend/src/controllers/grid-state-controller.ts`:

Add imports:
```typescript
import {
  applyInterferencePaintToCell,
  determineInterferencePaintAction,
} from "../lib/cell-painting.js";
```

In `onCellMouseDown` (line 67), add interference painting mode before the overlay "entry" check:
```typescript
if (this.host._overlayMode === "interference") {
    this.host._isPainting = true;
    this.host._frozenBounds = getRoomBounds(this.host._grid);
    this.host._paintAction = determineInterferencePaintAction(
        this.host._grid[index],
        this.host._interferenceLevel,
    );
    this.applyPaintToCell(index);
    const onUp = () => {
        this.onCellMouseUp();
        window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mouseup", onUp);
    return;
}
```

In `applyPaintToCell` (line 115), add the interference case:
```typescript
if (this.host._overlayMode === "interference") {
    newValue = applyInterferencePaintToCell(
        this.host._grid[index],
        this.host._interferenceLevel,
        this.host._paintAction,
    );
} else if (this.host._overlayMode === "entry") {
```

- [ ] **Step 6: Add menu item for overlays tab in live view menu**

In `frontend/src/eppgrid-panel.ts`, in the live view menu (around line 1280-1288), add an overlays menu item between zones and furniture:

```typescript
<button class="sidebar-menu-item" @click=${() => {
    this._enterEditor("overlays");
  }}>
  <ha-icon icon="mdi:blur" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.overlays")}
</button>
```

- [ ] **Step 7: Run full test suite and fix any regressions**

Run: `cd frontend && npx vitest run`
Expected: All tests pass. Fix any test failures caused by the type change or removed overlay section.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/eppgrid-panel.ts \
       frontend/src/controllers/grid-state-controller.ts \
       frontend/src/components/epp-zone-sidebar.ts
git commit -m "feat: wire overlays tab, interference painting, remove overlays from zone sidebar"
```

---

### Task 9: Localization Strings

**Files:**
- Modify: `frontend/src/translations/en.json`

- [ ] **Step 1: Add localization strings**

Add new keys to `frontend/src/translations/en.json`. In the `"zones"` section (or create a new `"overlays"` section):

```json
"overlays": {
  "entry_exit": "Entry / Exit",
  "interference": "Interference",
  "click_to_paint": "click to paint",
  "level": "Level",
  "level_info": "1–3: increase threshold · ✕: suppress detection",
  "mark_as_ghost": "Mark as ghost"
},
"sidebar": {
  ...existing...
  "overlays": "Overlays"
},
"menu": {
  ...existing...
  "overlays": "Overlays"
}
```

Check the existing JSON structure and add keys in the appropriate sections. The component uses `this.localize("overlays.entry_exit")` etc., so the localization key path must match.

- [ ] **Step 2: Run full test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add frontend/src/translations/en.json
git commit -m "feat: add localization strings for overlays and interference"
```

---

### Task 10: Live View — Mark as Ghost

**Files:**
- Modify: `frontend/src/components/epp-grid.ts:92-106,274-289`
- Modify: `frontend/src/eppgrid-panel.ts` (add handler)
- Modify: `frontend/src/controllers/grid-state-controller.ts` (add markGhost method)
- Test: `frontend/src/__tests__/components/epp-grid.test.ts`

- [ ] **Step 1: Write failing test for mark-as-ghost event**

Add to `frontend/src/__tests__/components/epp-grid.test.ts`:

```typescript
it("dispatches mark-ghost event when target dot is clicked", () => {
  const el = createGrid();
  // Set up a target at a known position
  el.targets = [{ x: 450, y: 450, signal: 5, speed: 0, status: "active" }];
  el.roomWidth = 1200;
  el.roomDepth = 1200;
  const spy = vi.fn();
  el.addEventListener("mark-ghost", spy);
  // Render and find target dot
  const rendered = (el as any).render();
  // Verify the rendered output includes target dots
  expect(rendered).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/components/epp-grid.test.ts`

- [ ] **Step 3: Add click handler to target dots in epp-grid.ts**

In `frontend/src/components/epp-grid.ts`, update the target dot rendering (around line 274-278). Add `pointer-events: auto` to the target dot style and a click handler:

Update the `.target-dot` CSS (line 96) to add:
```css
.target-dot {
    ...existing...
    cursor: pointer;
    pointer-events: auto;
}
```

Update the target dot HTML (around line 274-278):
```typescript
return html`
    <div
        class="target-dot"
        style="left: ${xPct}%; top: ${yPct}%; background: ${TARGET_COLORS[i] || TARGET_COLORS[0]}; opacity: ${t.status === "pending" ? 0.3 : 1}; transition: opacity 0.5s ease;"
        @click=${(e: Event) => {
            e.stopPropagation();
            this.dispatchEvent(
                new CustomEvent("mark-ghost", {
                    detail: { targetIndex: i, x: t.x, y: t.y },
                    bubbles: true,
                    composed: true,
                }),
            );
        }}
    ></div>
```

- [ ] **Step 4: Handle mark-ghost in the panel**

In `frontend/src/eppgrid-panel.ts`, in `_renderLiveGrid()` (around line 1184-1210), add a handler on the `<epp-grid>`:

```typescript
@mark-ghost=${(e: CustomEvent) => {
    this._markGhost(e.detail.x, e.detail.y);
}}
```

Add the `_markGhost` method to the panel class:

```typescript
private async _markGhost(x: number, y: number): Promise<void> {
    const pos = mapTargetToGridCell(x, y, this._roomWidth, this._roomDepth);
    if (!pos) return;
    const col = Math.floor(pos.col);
    const row = Math.floor(pos.row);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;
    const idx = row * GRID_COLS + col;
    const cellVal = this._grid[idx];
    if (!cellIsInside(cellVal)) return;

    const current = cellInterference(cellVal);
    let next: number;
    if (current === 0) next = 1;
    else if (current < 3) next = current + 1;
    else if (current === 3) next = CELL_INTERFERENCE_SUPPRESS;
    else return; // already suppressed

    this._grid = new Uint8Array(this._grid);
    this._grid[idx] = cellSetInterference(this._grid[idx], next);
    this._dirty = true;
    await this._gridCtrl.applyLayout();
}
```

Add required imports to the panel (if not already):
```typescript
import { cellInterference, cellSetInterference, cellIsInside, CELL_INTERFERENCE_SUPPRESS, GRID_COLS, GRID_ROWS } from "./lib/grid.js";
import { mapTargetToGridCell } from "./lib/coordinates.js";
```

- [ ] **Step 5: Run full test suite**

Run: `cd frontend && npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/epp-grid.ts \
       frontend/src/eppgrid-panel.ts \
       frontend/src/__tests__/components/epp-grid.test.ts
git commit -m "feat: mark-as-ghost on live view target click"
```

---

### Task 11: Documentation & Build

**Files:**
- Modify: `docs/backend-data-catalog.md`

- [ ] **Step 1: Update cell byte layout documentation**

In `docs/backend-data-catalog.md`, find the cell byte layout description and update bits 5-7 from "reserved" to interference:

```
Each cell in `grid_bytes` is a uint8 with bit layout:
bit 0 = room (inside/outside),
bits 1-3 = zone (0-7),
bit 4 = entry/exit overlay (bypasses gating on entry, uses handoff timeout on exit),
bits 5-7 = interference level (0=none, 1-3=+2/4/6 to trigger/renew thresholds, 7=suppress detection).
```

- [ ] **Step 2: Build frontend bundle**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Run pre-commit checks**

Run: `cd frontend && npx biome lint src/ && npx vitest run --coverage`
Expected: Lint passes, tests pass, coverage > 90%

- [ ] **Step 4: Commit**

```bash
git add docs/backend-data-catalog.md frontend/dist/
git commit -m "docs: update cell byte layout for interference, rebuild frontend"
```
