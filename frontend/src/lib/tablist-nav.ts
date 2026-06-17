/**
 * Roving-tabindex keyboard navigation for a horizontal WAI-ARIA tablist.
 *
 * Returns the index focus should move to for a navigation keypress, or `null`
 * if the key isn't one we handle — so the caller can leave it alone. In
 * particular Enter/Space return `null`, which (on native `<button>` tabs) lets
 * the browser's synthesized click run the existing activation handler: this is
 * **manual activation** — arrows move focus, Enter/Space/click commit, focus
 * and selection are allowed to diverge while arrowing.
 *
 * `current` is the index of the currently-FOCUSED tab (not the selected one),
 * so repeated arrow presses walk the row rather than jumping relative to the
 * selection.
 */
export function tablistKeydownIndex(
	e: KeyboardEvent,
	current: number,
	count: number,
): number | null {
	if (count <= 0) return null;
	switch (e.key) {
		case "ArrowRight":
			return (current + 1) % count;
		case "ArrowLeft":
			return (current - 1 + count) % count;
		case "Home":
			return 0;
		case "End":
			return count - 1;
		default:
			return null;
	}
}
