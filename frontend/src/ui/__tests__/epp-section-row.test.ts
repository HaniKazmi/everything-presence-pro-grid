import { describe, expect, it } from "vitest";
import "../epp-section-row.js";
import type { EppSectionRow } from "../epp-section-row.js";

async function fixture(helper = ""): Promise<EppSectionRow> {
	const el = document.createElement("epp-section-row") as EppSectionRow;
	el.label = "Max distance";
	if (helper) el.helper = helper;
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-section-row", () => {
	it("renders the label", async () => {
		const el = await fixture();
		expect(el.shadowRoot!.querySelector(".label")!.textContent).toContain(
			"Max distance",
		);
	});

	it("renders an epp-info-tip carrying the helper text when provided", async () => {
		const el = await fixture("How far the sensor looks.");
		const tip = el.shadowRoot!.querySelector("epp-info-tip") as HTMLElement & {
			text: string;
		};
		expect(tip).toBeTruthy();
		expect(tip.text).toBe("How far the sensor looks.");
	});

	it("omits the info-tip when no helper", async () => {
		const el = await fixture();
		expect(el.shadowRoot!.querySelector("epp-info-tip")).toBeNull();
	});
});
