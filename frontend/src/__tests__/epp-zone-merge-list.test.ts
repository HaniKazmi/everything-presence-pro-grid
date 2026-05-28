import { describe, expect, it } from "vitest";
import "../components/epp-zone-merge-list.js";
import type { EppZoneMergeList } from "../components/epp-zone-merge-list.js";

async function fixture(): Promise<EppZoneMergeList> {
	const el = document.createElement("epp-zone-merge-list") as EppZoneMergeList;
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-zone-merge-list", () => {
	it("renders available zones from sources prop", async () => {
		const el = await fixture();
		el.sources = [
			{
				mac: "AA",
				name: "Left",
				available: true,
				enabled_presence: [],
				zones: [{ index: 2, name: "Desk", enabled: true }],
			},
		];
		el.zoneGroups = [];
		await el.updateComplete;
		const available = el.shadowRoot!.querySelectorAll(
			'[data-testid="available-zone"]',
		);
		expect(available.length).toBe(1);
	});

	it("emits zone-groups-changed with new group on add", async () => {
		const el = await fixture();
		el.sources = [
			{
				mac: "AA",
				name: "Left",
				available: true,
				enabled_presence: [],
				zones: [{ index: 2, name: "Desk", enabled: true }],
			},
		];
		el.zoneGroups = [];
		await el.updateComplete;
		const events: unknown[] = [];
		el.addEventListener("zone-groups-changed", (e: Event) => {
			events.push((e as CustomEvent).detail);
		});
		const newBtn = el.shadowRoot!.querySelector(
			'[data-testid="new-group"]',
		) as HTMLButtonElement;
		newBtn.click();
		await el.updateComplete;
		expect(events.length).toBe(1);
		const detail = events[0] as {
			zone_groups: { id: string; name: string; members: unknown[] }[];
		};
		expect(detail.zone_groups.length).toBe(1);
	});
});
