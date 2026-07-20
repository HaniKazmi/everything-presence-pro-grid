// Real-browser regression test: clicking a tooltip-wrapped control (e.g. the
// card's heatmap switch) must not leave the hint stuck on screen.
//
// History: epp-tooltip showed the hint on `:host(:focus-within)` so keyboard
// users could read it. A mouse click also moves DOM focus into the wrapped
// control, so after clicking the switch and moving the pointer away the hint
// stayed visible until focus landed elsewhere on the page (reported bug).
//
// Must run in a real browser: happy-dom has no cascade and resolves
// :focus-visible as plain :focus, so it cannot tell keyboard focus from a mouse
// press — the very distinction under test. `npm run test:browser` runs it.
import { page, userEvent } from "@vitest/browser/context";
import { describe, expect, it } from "vitest";
import "../../ui/epp-toggle.js";
import "../../ui/epp-tooltip.js";
import type { EppToggle } from "../../ui/epp-toggle.js";
import type { EppTooltip } from "../../ui/epp-tooltip.js";
import { registerPanelCleanup } from "../helpers/panel-cleanup.js";

const mounted: HTMLElement[] = [];
registerPanelCleanup(mounted);

/**
 * A tooltip wrapping `trigger`, preceded by a focusable element (so Tab can
 * reach the trigger from outside) and followed by a far-away hover target.
 */
async function mount(trigger: HTMLElement): Promise<{
	tip: EppTooltip;
	before: HTMLElement;
	elsewhere: HTMLElement;
}> {
	await page.viewport(600, 400);
	document.body.style.margin = "0";

	const host = document.createElement("div");
	host.style.padding = "80px";
	const before = document.createElement("button");
	before.textContent = "before";
	const tip = document.createElement("epp-tooltip") as EppTooltip;
	tip.content = "Show heatmap";
	tip.appendChild(trigger);
	const elsewhere = document.createElement("div");
	elsewhere.textContent = "elsewhere";
	elsewhere.style.cssText = "position:fixed;bottom:0;right:0;padding:20px";
	host.append(before, tip, elsewhere);
	document.body.appendChild(host);
	mounted.push(host);

	await tip.updateComplete;
	return { tip, before, elsewhere };
}

/** A bare checkbox trigger — the trigger itself is the clickable element. */
async function mountCheckbox() {
	const control = document.createElement("input");
	control.type = "checkbox";
	return { control, ...(await mount(control)) };
}

/**
 * An epp-toggle trigger, so the focused control sits a shadow root deeper.
 * With `label` set the row is `space-between` across a wide host, leaving the
 * label text and the gap beside it as non-focusable area inside the tooltip —
 * the shape used by the panel's toggle rows.
 */
async function mountToggle(label = "") {
	const toggle = document.createElement("epp-toggle") as EppToggle;
	toggle.controlLabel = "Show heatmap";
	toggle.label = label;
	toggle.style.width = "300px";
	const mounts = await mount(toggle);
	await toggle.updateComplete;
	// The native input is visually hidden behind the slider — click what a user
	// clicks; the enclosing label forwards activation (and focus) to the input.
	const control = toggle.shadowRoot?.querySelector(
		".toggle-slider",
	) as HTMLElement;
	const deadSpace = toggle.shadowRoot?.querySelector(".label") as HTMLElement;
	return { control, deadSpace, ...mounts };
}

/**
 * Assert the hint's settled opacity. Polls rather than sleeping a fixed span:
 * the 0.12s fade means an immediate read catches an in-between value, and every
 * assertion below is a transition between the two settled states.
 */
async function expectHintOpacity(tip: EppTooltip, expected: string) {
	const bubble = tip.shadowRoot?.querySelector(".tip") as HTMLElement;
	await expect.poll(() => getComputedStyle(bubble).opacity).toBe(expected);
}

describe("epp-tooltip click dismissal", () => {
	it("shows the hint while hovering the control", async () => {
		const { tip, control } = await mountCheckbox();
		await userEvent.hover(control);
		await expectHintOpacity(tip, "1");
	});

	it("hides the hint after a click once the pointer moves away", async () => {
		const { tip, control, elsewhere } = await mountCheckbox();

		await userEvent.click(control);
		await userEvent.hover(elsewhere);

		await expectHintOpacity(tip, "0");
	});

	// The reported case: the card's heatmap switch is an epp-toggle, so the
	// focused control lives one shadow root deeper than the tooltip — the case
	// that rules out a CSS-only :focus-visible selector, since that pseudo-class
	// never propagates to a shadow host.
	it("hides the hint after clicking a control inside a nested shadow root", async () => {
		const { tip, control, elsewhere } = await mountToggle();

		await userEvent.click(control);
		await userEvent.hover(elsewhere);

		await expectHintOpacity(tip, "0");
	});

	// Guards the blur-on-click alternative: dismissing the hint must not cost the
	// user their focus position (Space would no longer re-toggle the switch).
	it("keeps the clicked control focused", async () => {
		const { control } = await mountCheckbox();

		await userEvent.click(control);

		expect(document.activeElement).toBe(control);
	});

	it("shows the hint when the control is reached by keyboard", async () => {
		const { tip, before } = await mountCheckbox();

		before.focus();
		await userEvent.keyboard("{Tab}");

		await expectHintOpacity(tip, "1");
	});

	// A press on the row's label focuses nothing, so no focusout ever follows to
	// clear state a press-based implementation would have set on pointerdown —
	// leaving it stuck, suppressing the hint for a keyboard user who Tabs onto
	// the control afterwards.
	it("still shows the keyboard hint after a press that focused nothing", async () => {
		const { tip, before, elsewhere, deadSpace } =
			await mountToggle("Show heatmap");

		await userEvent.click(deadSpace);
		// The pointer must leave, or :hover would show the hint regardless and
		// mask a marker left stuck by the press.
		await userEvent.hover(elsewhere);
		before.focus();
		await userEvent.keyboard("{Tab}");

		await expectHintOpacity(tip, "1");
	});
});
