import { describe, expect, it } from "vitest";
import "../epp-dialog.js";
import type { EppDialog } from "../epp-dialog.js";

async function fixture(open: boolean, heading = ""): Promise<EppDialog> {
	const el = document.createElement("epp-dialog") as EppDialog;
	el.open = open;
	el.heading = heading;
	el.innerHTML = `<p>body</p><div slot="actions"><button>ok</button></div>`;
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-dialog", () => {
	it("renders nothing when closed", async () => {
		const el = await fixture(false);
		expect(el.shadowRoot!.querySelector(".overlay")).toBeNull();
	});

	it("renders an overlay + modal card when open", async () => {
		const el = await fixture(true);
		const card = el.shadowRoot!.querySelector(".card");
		expect(el.shadowRoot!.querySelector(".overlay")).not.toBeNull();
		expect(card!.getAttribute("role")).toBe("dialog");
		expect(card!.getAttribute("aria-modal")).toBe("true");
	});

	it("renders the heading in an h3 when set", async () => {
		const el = await fixture(true, "Back up configuration");
		expect(el.shadowRoot!.querySelector("h3")!.textContent).toContain(
			"Back up configuration",
		);
		expect(
			el.shadowRoot!.querySelector(".card")!.getAttribute("aria-label"),
		).toBe("Back up configuration");
	});

	it("exposes default and actions slots", async () => {
		const el = await fixture(true);
		expect(el.shadowRoot!.querySelector("slot:not([name])")).not.toBeNull();
		expect(el.shadowRoot!.querySelector('slot[name="actions"]')).not.toBeNull();
	});

	it("emits dialog-dismiss on Escape when open", async () => {
		const el = await fixture(true);
		let dismissed = 0;
		el.addEventListener("dialog-dismiss", () => dismissed++);
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		expect(dismissed).toBe(1);
	});

	it("does NOT emit dialog-dismiss on Escape when closed", async () => {
		const el = await fixture(false);
		let dismissed = 0;
		el.addEventListener("dialog-dismiss", () => dismissed++);
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		expect(dismissed).toBe(0);
	});

	it("falls back to label for aria-label when there is no heading", async () => {
		const el = await fixture(true);
		el.label = "Confirm action";
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector(".card")!.getAttribute("aria-label"),
		).toBe("Confirm action");
		expect(el.shadowRoot!.querySelector("h3")).toBeNull();
	});
});
