# Unified Target Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the detection zone editor reuse the same target rendering logic as the live overview, with the frontend zone engine overwriting the backend `status` field in-place rather than using a separate display status system. The frontend zone engine should be a line-by-line mirror of the backend `_tick` method so both can be compared side by side.

**Architecture:** The `subscribe_grid_targets` subscription populates `_targets[]` with `{x, y, signal, status}`. The live overview uses `status` directly for rendering. The detection zone editor runs its frontend zone engine (a line-by-line mirror of backend `_tick`) to recalculate per-target `status` and position based on unsaved grid/zone config, then overwrites `_targets[].status` (and x/y for pending targets). Both screens then use the same rendering code. The frontend zone engine also produces zone occupancy for the sidebar. `sensors.occupancy` is derived from `static_presence || motion_presence || room_occupancy`.

**Tech Stack:** TypeScript/Lit, rollup build

**Key files:**
- Backend zone engine: `custom_components/eppgrid/zone_engine.py` — `_tick` method (lines 481-735)
- Frontend zone engine: `frontend/src/eppgrid-panel.ts` — `_runLocalZoneEngine` method
- Data catalog: `docs/backend-data-catalog.md`

---

## Current State

- `_targets[]` populated from `subscribe_grid_targets` with backend `{x, y, signal, status}`
- Live overview grid renders targets using `t.status` directly — works correctly
- Zone editor has a separate `_getTargetDisplayStatus(i)` method that independently derives status — buggy, doesn't match backend
- Zone editor has its own target rendering code that differs from the live overview
- Frontend zone engine (`_runLocalZoneEngine`) returns only zone occupancy; target status is derived separately
- `_targetLastInRoomPos` stores grid cell coords `{col, row}` — backend stores room-space mm `(x, y)` in `_target_prev_xy`

## Target State

- `_runLocalZoneEngine` produces per-target results (status + display position) just like backend `_tick` does (lines 661-700)
- These results overwrite `_targets[i].status` and (for pending) `_targets[i].x/y`
- Zone editor target rendering uses the SAME code as the live overview
- `_getTargetDisplayStatus` is deleted
- `_targetLastInRoomPos` renamed to `_targetPrevXY`, stores room-space mm `{x, y}` — mirrors backend's `_target_prev_xy`
- `sensors.occupancy` derived from `static_presence || motion_presence || room_occupancy`

---

### Task 1: Make `_targetLastInRoomPos` store room-space mm (match backend `_target_prev_xy`)

**Files:**
- Modify: `frontend/src/eppgrid-panel.ts`

- [ ] **Step 1: Rename and change type**

Rename `_targetLastInRoomPos` to `_targetPrevXY`. Change type from `{col, row}` to `{x, y}` in room-space mm:

```typescript
// Old:
private _targetLastInRoomPos: ({ col: number; row: number } | null)[] = [null, null, null];

// New (mirrors backend _target_prev_xy):
private _targetPrevXY: ({ x: number; y: number } | null)[] = [null, null, null];
```

- [ ] **Step 2: Update where it's set in `_runLocalZoneEngine`**

Where it's currently set (after `cellIsInside` passes):
```typescript
// Old:
this._targetLastInRoomPos[i] = { col, row };

// New — store room-space mm from the target (mirrors backend line 530):
this._targetPrevXY[i] = { x: t.x, y: t.y };
```

- [ ] **Step 3: Update `_getTargetDisplayStatus` reference (temporary — will be deleted later)**

Update the reference in `_getTargetDisplayStatus` from `_targetLastInRoomPos` to `_targetPrevXY`, and use `.x`/`.y` instead of `.col`/`.row`. This keeps things working until we delete the method in Task 3.

- [ ] **Step 4: Build and verify**

Run: `cd frontend && npx rollup -c`

- [ ] **Step 5: Commit**

```
git commit -m "refactor: rename _targetLastInRoomPos to _targetPrevXY, store room-space mm"
```

---

### Task 2: Add per-target result output to `_runLocalZoneEngine`

**Files:**
- Modify: `frontend/src/eppgrid-panel.ts` — `_runLocalZoneEngine` method

Mirror backend `_tick` lines 661-700: after the state machine, build per-target results.

- [ ] **Step 1: Change return type**

```typescript
// Old:
private _runLocalZoneEngine(): Record<number, boolean>

// New:
private _runLocalZoneEngine(): {
    occupancy: Record<number, boolean>;
    targets: { status: TargetStatus; x: number; y: number; signal: number }[];
}
```

- [ ] **Step 2: Build per-target results after the state machine, before the debug log**

Insert after the state machine loop and cleanup, before the debug log section. This mirrors backend lines 661-700 line by line:

```typescript
// Build per-target results (mirrors backend _tick lines 661-700)
const activeTargets = new Set<number>();
for (let i = 0; i < MAX_TARGETS && i < this._targets.length; i++) {
    if (this._targets[i].x != null && this._targets[i].y != null) {
        activeTargets.add(i);
    }
}

const targetResults: { status: TargetStatus; x: number; y: number; signal: number }[] = [];
for (let i = 0; i < MAX_TARGETS && i < this._targets.length; i++) {
    const sig = targetSignal.get(i) ?? 0;
    if (activeTargets.has(i) && sig > 0) {
        // Active target with signal (backend line 666-672)
        targetResults.push({
            status: "active",
            x: this._targets[i].x,
            y: this._targets[i].y,
            signal: sig,
        });
    } else {
        // Check if this target is pending in any zone (backend lines 674-691)
        let isPending = false;
        if (!activeTargets.has(i)) {
            for (const [, st] of this._localZoneState) {
                if (st.occupied && st.pendingSince !== null && st.confirmedTargets.has(i)) {
                    isPending = true;
                    break;
                }
            }
        }
        if (isPending) {
            const xy = this._targetPrevXY[i];
            targetResults.push({
                status: "pending",
                x: xy ? xy.x : 0,
                y: xy ? xy.y : 0,
                signal: 0,
            });
        } else {
            targetResults.push({
                status: "inactive",
                x: 0,
                y: 0,
                signal: 0,
            });
        }
    }
}
```

**Note on `activeTargets`:** The backend uses `tw.active` (tumbling window had frames). The frontend equivalent is `x != null && y != null` (sensor is tracking — `subscribe_grid_targets` sends `null` when not tracking).

**Note on `targetSignal`:** Currently the zone engine uses `t.signal` directly. To mirror the backend, introduce a `targetSignal` map that gets populated during the per-target loop (backend line 520/525: `target_signal[i] = signal`). The frontend already has `zoneSignal` but not `targetSignal`. Add:

```typescript
const targetSignal: Map<number, number> = new Map();
```

And in the per-target loop, after `const signal = t.signal;`:
```typescript
targetSignal.set(i, signal);
```

This should be set in both the "outside room" and "inside room" paths, matching backend lines 520 and 525.

- [ ] **Step 3: Update both return statements**

Change returns from `return occupancy;` to `return { occupancy, targets: targetResults };`

There are two return paths:
1. Early return in debug log: `if (body === this._debugLogPrev) return ...;`
2. Final return at end of method

Both need updating. Since `targetResults` is built before the debug log section, it's available for both.

- [ ] **Step 4: Build and verify**

Run: `cd frontend && npx rollup -c`

- [ ] **Step 5: Commit**

```
git commit -m "feat: add per-target results to frontend zone engine, mirroring backend _tick"
```

---

### Task 3: Apply target overwrites, unify rendering, delete dead code

**Files:**
- Modify: `frontend/src/eppgrid-panel.ts`

- [ ] **Step 1: Update caller of `_runLocalZoneEngine` to apply overwrites**

In `_renderVisibleCells` (~line 4787), change:
```typescript
occupancy = this._runLocalZoneEngine();
```
to:
```typescript
const engineResult = this._runLocalZoneEngine();
occupancy = engineResult.occupancy;

// Overwrite _targets with frontend zone engine results.
// For active: keep backend's 5Hz x/y, use engine's status.
// For pending: use engine's last-in-room x/y.
// For inactive: status is enough — rendering hides them.
for (let i = 0; i < engineResult.targets.length && i < this._targets.length; i++) {
    const tr = engineResult.targets[i];
    this._targets[i].status = tr.status;
    if (tr.status === "pending") {
        this._targets[i].x = tr.x;
        this._targets[i].y = tr.y;
    }
}

// Derive sensors.occupancy from unsaved zone config
const roomOccupied = Object.values(occupancy).some((v) => v);
this._sensorState.occupancy =
    this._sensorState.static_presence ||
    this._sensorState.motion_presence ||
    roomOccupied;
```

- [ ] **Step 2: Replace zone editor target rendering with live overview pattern**

Replace the zone editor's target rendering block (~lines 4577-4597). Change from using `_getTargetDisplayStatus` to using `t.status` directly — same as the live overview at ~lines 3833-3844:

```typescript
${this._targets.map((t, i) => {
    if (t.status === "inactive") return nothing;
    const pos = this._mapTargetToGridCell(t);
    if (!pos) return nothing;
    const xPct = Math.max(0, Math.min(100, ((pos.col - minCol) / visCols) * 100));
    const yPct = Math.max(0, Math.min(100, ((pos.row - minRow) / visRows) * 100));
    return html`
        <div
            class="target-dot"
            style="left: ${xPct}%; top: ${yPct}%; background: ${TARGET_COLORS[i] || TARGET_COLORS[0]}; opacity: ${t.status === "pending" ? 0.3 : 1}; transition: opacity 0.5s ease;"
        ></div>
        ${t.status === "active" && t.signal > 0 ? html`
            <div style="position: absolute; left: ${xPct}%; top: ${yPct}%; transform: translate(-50%, -280%); background: rgba(0,0,0,0.7); color: #fff; font-size: 10px; font-weight: bold; padding: 0 4px; border-radius: 6px; pointer-events: none;">
                ${t.signal}
            </div>
        ` : nothing}
    `;
})}
```

- [ ] **Step 3: Delete `_getTargetDisplayStatus` method entirely**

Remove the method. Verify no references remain (search file for `_getTargetDisplayStatus`).

- [ ] **Step 4: Build and verify**

Run: `cd frontend && npx rollup -c`

- [ ] **Step 5: Commit**

```
git commit -m "feat: unify zone editor target rendering with live overview, delete _getTargetDisplayStatus"
```

---

### Task 4: Update data catalog

**Files:**
- Modify: `docs/backend-data-catalog.md`

- [ ] **Step 1: Update the frontend screen → API mapping table**

Update the Detection zone editor row:
```markdown
| Detection zone editor | `subscribe_grid_targets` | `_targets` | `x`, `y`, `signal` from backend; `status` overwritten by frontend zone engine using unsaved grid/zone config | `set_room_layout`, `rename_zone_entities` |
```

- [ ] **Step 2: Update Per-Target Room Gating section**

Replace the current explanation with:
```markdown
The frontend zone engine runs on each render frame in the detection zone editor. It reads `x`, `y`, `signal` from the backend subscription, recalculates per-target status using the current (possibly unsaved) grid (mirroring backend `_tick` lines 661-700), and overwrites `_targets[].status` (and position for pending targets). Both the live overview and zone editor then use the same target rendering logic — the only difference is where `status` comes from (backend vs frontend zone engine).
```

- [ ] **Step 3: Commit**

```
git commit -m "docs: update data catalog for unified target rendering"
```

---

### Task 5: Build final JS and manual verification

- [ ] **Step 1: Full rebuild**

Run: `cd frontend && npx rollup -c`

- [ ] **Step 2: Manual test checklist**

1. **Live overview grid** — targets render with backend status (solid=active, faded=pending, hidden=inactive)
2. **Detection zone editor** — targets render identically to live overview
3. **Zone editor: walk outside room** — target fades at last in-room position while zone is pending
4. **Zone editor: sensor stops tracking while zone pending** — target stays faded until zone clears
5. **Zone editor: stay outside until timeout** — target disappears when zone clears
6. **Zone editor: walk back into room** — target reappears solid
7. **Zone editor sidebar** — occupancy indicator reflects frontend zone engine, not backend
8. **FOV overlay** — unchanged, still works

- [ ] **Step 3: Commit built JS**

```
git commit -m "build: rebuild JS bundle"
```
