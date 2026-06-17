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

	it("closes the menu when Escape is pressed", async () => {
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
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
		);
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

	it("keeps the open popover anchored when the window scrolls or resizes", async () => {
		const el = await fixture(ITEMS);
		(
			el.shadowRoot!.querySelector(
				'[data-testid="kebab-trigger"]',
			) as HTMLElement
		).click();
		await el.updateComplete;
		// While open, scroll/resize must re-anchor the popover without throwing,
		// and the menu must stay open.
		window.dispatchEvent(new Event("scroll"));
		window.dispatchEvent(new Event("resize"));
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".menu")).not.toBeNull();
	});

	it("ignores a pointerdown that originates inside the menu (stays open)", async () => {
		const el = await fixture(ITEMS);
		const trigger = el.shadowRoot!.querySelector(
			'[data-testid="kebab-trigger"]',
		) as HTMLElement;
		trigger.click();
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector('[data-testid="kebab-item"]'),
		).not.toBeNull();
		// A pointerdown whose composed path includes the kebab is ours — the
		// outside handler must early-return and leave the menu open.
		trigger.dispatchEvent(
			new Event("pointerdown", { bubbles: true, composed: true }),
		);
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector('[data-testid="kebab-item"]'),
		).not.toBeNull();
	});

	// HA removed `ha-button-menu` in 2026.02 and our HA floor (hacs.json) is
	// 2026.5.0, so the kebab must NEVER depend on a native HA menu — it always
	// renders its own self-contained popover. Defining `ha-button-menu` must not
	// change that. (Keep last: registering an HA element is global for the test
	// environment.)
	it("renders its self-contained popover even when ha-button-menu is defined", async () => {
		if (!customElements.get("ha-button-menu")) {
			customElements.define("ha-button-menu", class extends HTMLElement {});
		}
		const el = await fixture(ITEMS);
		// No native menu element is used, only our own trigger.
		expect(el.shadowRoot!.querySelector("ha-button-menu")).toBeNull();
		expect(
			el.shadowRoot!.querySelector(
				"epp-icon-button[data-testid='kebab-trigger']",
			),
		).not.toBeNull();
		// It still opens its own popover with the items.
		(
			el.shadowRoot!.querySelector(
				'[data-testid="kebab-trigger"]',
			) as HTMLElement
		).click();
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".menu")).not.toBeNull();
		expect(
			el.shadowRoot!.querySelectorAll('[data-testid="kebab-item"]').length,
		).toBe(2);
	});

	it("fallback popover is fixed-positioned so it stays reachable on short viewports", () => {
		// The fallback .menu is position:fixed + JS-anchored to the trigger
		// (_positionFallbackMenu) so it escapes overflow/clip ancestors, flips above
		// the trigger when there's more room, and caps to the viewport with its own
		// scroll. happy-dom has no layout, so guard the CSS contract here; the
		// positioning behaviour itself is verified in-browser. Must NOT regress to
		// position:absolute (which opened straight down, off the bottom of the page).
		const cssText = (
			customElements.get("epp-kebab-menu") as unknown as {
				styles: { cssText: string };
			}
		).styles.cssText;
		const menuRule = cssText.slice(
			cssText.indexOf(".menu {"),
			cssText.indexOf("}", cssText.indexOf(".menu {")),
		);
		expect(menuRule).toMatch(/position:\s*fixed/);
		expect(menuRule).not.toMatch(/position:\s*absolute/);
		expect(menuRule).toMatch(/box-sizing:\s*border-box/);
	});
});
