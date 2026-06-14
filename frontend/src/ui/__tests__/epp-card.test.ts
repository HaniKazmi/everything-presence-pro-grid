import { describe, expect, it } from "vitest";
import "../epp-card.js";
import type { EppCard } from "../epp-card.js";

async function fixture(heading = ""): Promise<EppCard> {
	const el = document.createElement("epp-card") as EppCard;
	if (heading) el.heading = heading;
	el.innerHTML = "<p>body</p>";
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-card", () => {
	it("renders the heading when provided", async () => {
		const el = await fixture("Detection");
		expect(
			el.shadowRoot!.querySelector(".card-heading")!.textContent,
		).toContain("Detection");
	});

	it("omits the heading element when no heading", async () => {
		const el = await fixture();
		expect(el.shadowRoot!.querySelector(".card-heading")).toBeNull();
	});

	it("renders a default slot for content", async () => {
		const el = await fixture("Detection");
		expect(el.shadowRoot!.querySelector("slot:not([name])")).toBeTruthy();
	});

	it("hides the actions footer when no actions are slotted", async () => {
		const el = await fixture("Detection");
		const actions = el.shadowRoot!.querySelector(
			".card-actions",
		) as HTMLElement;
		expect(actions.hasAttribute("hidden")).toBe(true);
	});

	it("shows the actions footer when actions are slotted", async () => {
		const el = document.createElement("epp-card") as EppCard;
		const btn = document.createElement("button");
		btn.setAttribute("slot", "actions");
		btn.textContent = "OK";
		el.appendChild(btn);
		document.body.appendChild(el);
		await el.updateComplete;
		// slotchange fires after the first render; wait for the follow-up update.
		await el.updateComplete;
		const actions = el.shadowRoot!.querySelector(
			".card-actions",
		) as HTMLElement;
		expect(actions.hasAttribute("hidden")).toBe(false);
	});

	it("adds the elevated class when elevated is true", async () => {
		const el = await fixture();
		el.elevated = true;
		await el.updateComplete;
		const card = el.shadowRoot!.querySelector(".card") as HTMLElement;
		expect(card.classList.contains("elevated")).toBe(true);
	});

	it("reveals the actions footer when an action is added dynamically", async () => {
		// Start with no actions → footer hidden.
		const el = await fixture("With Actions");
		const actions = el.shadowRoot!.querySelector(
			".card-actions",
		) as HTMLElement;
		expect(actions.hasAttribute("hidden")).toBe(true);

		// Consumer inserts an action button after first render, then the slot fires.
		const btn = document.createElement("button");
		btn.setAttribute("slot", "actions");
		el.appendChild(btn);
		const actionsSlot = el.shadowRoot!.querySelector(
			'slot[name="actions"]',
		) as HTMLSlotElement;
		actionsSlot.dispatchEvent(new Event("slotchange"));
		await el.updateComplete;

		// The slotchange handler must have re-rendered and un-hidden the footer.
		expect(actions.hasAttribute("hidden")).toBe(false);
	});
});
