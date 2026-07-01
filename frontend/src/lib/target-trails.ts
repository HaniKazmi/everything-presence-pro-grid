// Shared movement-trail ring-buffer logic used by both the live panel and the
// dashboard card. Behaviour-preserving extraction of the panel's inline loop
// (see target-controller.ts) — keeps a bounded polyline per target slot,
// clearing a slot immediately when its target goes inactive/invalid so a
// reused LD2450 slot never inherits a stale trail from a departed target.

export const TRAIL_MAX = 60;

export type TrailPoint = { x: number; y: number };

/** Creates `count` empty polylines, one per target slot. */
export function createTrails(count = 3): TrailPoint[][] {
	return Array.from({ length: count }, () => []);
}

/**
 * Mutates `trails` in place: appends each active target's position to its
 * polyline (capped at `max` points, dropping the oldest), and clears the
 * polyline for any slot whose target is inactive or has a null position.
 */
export function updateTrails(
	trails: TrailPoint[][],
	targets: Array<{ x: number | null; y: number | null; status: string }>,
	max = TRAIL_MAX,
): void {
	for (let i = 0; i < targets.length && i < trails.length; i++) {
		const t = targets[i];
		if (t.x != null && t.y != null && t.status === "active") {
			const line = trails[i];
			line.push({ x: t.x, y: t.y });
			if (line.length > max) line.splice(0, line.length - max);
		} else {
			trails[i].length = 0;
		}
	}
}
