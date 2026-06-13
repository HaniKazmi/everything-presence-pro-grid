import { describe, expect, it } from "vitest";
import "../../components/epp-kebab-menu.js";
import type { EppKebabMenu } from "../../components/epp-kebab-menu.js";

async function fixture(items: EppKebabMenu["items"]): Promise<EppKebabMenu> {
	const el = document.createElement("epp-kebab-menu") as EppKebabMenu;
	el.items = items;
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

const ITEMS = [
	{ id: "edit", label: "Edit" },
	{ id: "delete", label: "Delete", danger: true },
];

describe("epp-kebab-menu", () => {
	it("is registered as a custom element", () => {
		expect(customElements.get("epp-kebab-menu")).toBeDefined();
	});

	it("keeps the menu closed until the trigger is clicked", async () => {
		const el = await fixture(ITEMS);
		expect(
			el.shadowRoot!.querySelector('[data-testid="kebab-item"]'),
		).toBeNull();
	});

	it("opens the menu when the trigger is clicked", async () => {
		const el = await fixture(ITEMS);
		(
			el.shadowRoot!.querySelector(
				'[data-testid="kebab-trigger"]',
			) as HTMLElement
		).click();
		await el.updateComplete;
		const labels = [
			...el.shadowRoot!.querySelectorAll('[data-testid="kebab-item"]'),
		].map((n) => n.textContent!.trim());
		expect(labels).toEqual(["Edit", "Delete"]);
	});

	it("emits item-select with the chosen id and closes", async () => {
		const el = await fixture(ITEMS);
		(
			el.shadowRoot!.querySelector(
				'[data-testid="kebab-trigger"]',
			) as HTMLElement
		).click();
		await el.updateComplete;
		const detail = new Promise<{ id: string }>((resolve) => {
			el.addEventListener("item-select", (e) =>
				resolve((e as CustomEvent).detail),
			);
		});
		(
			el.shadowRoot!.querySelector(
				'[data-testid="kebab-item"][data-id="edit"]',
			) as HTMLElement
		).click();
		expect((await detail).id).toBe("edit");
		await el.updateComplete;
		// menu closes after a selection
		expect(
			el.shadowRoot!.querySelector('[data-testid="kebab-item"]'),
		).toBeNull();
	});

	it("renders an icon for items that have one", async () => {
		const el = await fixture([
			{ id: "cog", label: "Settings", icon: "mdi:cog" },
		]);
		(
			el.shadowRoot!.querySelector(
				'[data-testid="kebab-trigger"]',
			) as HTMLElement
		).click();
		await el.updateComplete;
		const item = el.shadowRoot!.querySelector(
			'[data-testid="kebab-item"][data-id="cog"]',
		) as HTMLElement;
		const icon = item.querySelector("ha-icon");
		expect(icon).not.toBeNull();
		expect(icon!.getAttribute("icon")).toBe("mdi:cog");
	});

	it("renders a divider entry as a non-selectable separator", async () => {
		const el = await fixture([
			{ id: "a", label: "A" },
			{ divider: true },
			{ id: "b", label: "B" },
		]);
		(
			el.shadowRoot!.querySelector(
				'[data-testid="kebab-trigger"]',
			) as HTMLElement
		).click();
		await el.updateComplete;
		// two selectable items, plus a separator that is not a kebab-item
		expect(
			el.shadowRoot!.querySelectorAll('[data-testid="kebab-item"]').length,
		).toBe(2);
		expect(
			el.shadowRoot!.querySelector('[data-testid="kebab-divider"]'),
		).not.toBeNull();
	});

	it("marks danger items so they can be styled", async () => {
		const el = await fixture(ITEMS);
		(
			el.shadowRoot!.querySelector(
				'[data-testid="kebab-trigger"]',
			) as HTMLElement
		).click();
		await el.updateComplete;
		const del = el.shadowRoot!.querySelector(
			'[data-testid="kebab-item"][data-id="delete"]',
		) as HTMLElement;
		expect(del.classList.contains("danger")).toBe(true);
	});

	it("closes the menu on an outside pointerdown", async () => {
		const el = await fixture(ITEMS);
		(
			el.shadowRoot!.querySelector(
				'[data-testid="kebab-trigger"]',
			) as HTMLElement
		).click();
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector('[data-testid="kebab-item"]'),
		).not.toBeNull();
		document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector('[data-testid="kebab-item"]'),
		).toBeNull();
	});

	it("closes the menu when the trigger is clicked a second time", async () => {
		const el = await fixture(ITEMS);
		const trigger = el.shadowRoot!.querySelector(
			'[data-testid="kebab-trigger"]',
		) as HTMLElement;
		trigger.click();
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector('[data-testid="kebab-item"]'),
		).not.toBeNull();
		trigger.click();
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector('[data-testid="kebab-item"]'),
		).toBeNull();
	});

	it("detaches its outside listener when removed while open", async () => {
		const el = await fixture(ITEMS);
		(
			el.shadowRoot!.querySelector(
				'[data-testid="kebab-trigger"]',
			) as HTMLElement
		).click();
		await el.updateComplete;
		let fired = false;
		el.addEventListener("item-select", () => {
			fired = true;
		});
		el.remove();
		// A stray outside pointerdown after removal must not throw or re-fire.
		document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		expect(fired).toBe(false);
	});

	// Keep last: registering HA elements is global for the test environment.
	// Exercises the native ha-button-menu branch; every test above covers the
	// hand-rolled fallback.
	it("uses ha-button-menu + ha-list-item and emits on @action when registered", async () => {
		for (const name of ["ha-button-menu", "ha-icon-button", "ha-list-item"]) {
			if (!customElements.get(name)) {
				customElements.define(name, class extends HTMLElement {});
			}
		}
		const el = await fixture([
			{ id: "edit", label: "Edit", icon: "mdi:pencil" },
			{ divider: true },
			{ id: "delete", label: "Delete", danger: true },
		]);
		const menu = el.shadowRoot!.querySelector("ha-button-menu");
		expect(menu).not.toBeNull();
		// two selectable list items + an icon on the first + a separator
		expect(el.shadowRoot!.querySelectorAll("ha-list-item").length).toBe(2);
		expect(el.shadowRoot!.querySelector("ha-icon")).not.toBeNull();
		expect(
			el.shadowRoot!.querySelector('[data-testid="kebab-divider"]'),
		).not.toBeNull();
		const detail = new Promise<{ id: string }>((resolve) => {
			el.addEventListener("item-select", (e) =>
				resolve((e as CustomEvent).detail),
			);
		});
		// HA fires `action` with the chosen item index.
		// An out-of-range index (e.g. menu closed without a pick) must not emit.
		menu!.dispatchEvent(
			new CustomEvent("action", {
				detail: { index: 99 },
				bubbles: true,
				composed: true,
			}),
		);
		// A `closed` event from the menu is swallowed (no throw).
		menu!.dispatchEvent(
			new CustomEvent("closed", { bubbles: true, composed: true }),
		);
		menu!.dispatchEvent(
			new CustomEvent("action", {
				detail: { index: 1 },
				bubbles: true,
				composed: true,
			}),
		);
		expect((await detail).id).toBe("delete");
	});
});
