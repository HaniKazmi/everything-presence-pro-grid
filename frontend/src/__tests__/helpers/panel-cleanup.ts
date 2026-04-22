import { afterEach } from "vitest";

/**
 * Registers an `afterEach` hook that pops every tracked panel off the given
 * list and removes it from the DOM so leftover elements (and their
 * controllers / listeners / subscriptions) can't leak across tests.
 *
 * Pass the module-scoped tracking list once; push newly mounted panels
 * onto it from your `mountPanel` helper.
 */
export function registerPanelCleanup(panels: HTMLElement[]): void {
	afterEach(() => {
		while (panels.length) {
			const el = panels.pop()!;
			if (el.parentNode) {
				el.parentNode.removeChild(el);
			}
		}
	});
}
