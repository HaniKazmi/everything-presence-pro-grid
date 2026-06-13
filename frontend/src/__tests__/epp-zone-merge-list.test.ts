import { describe, expect, it } from "vitest";
import "../components/epp-zone-merge-list.js";
import type { EppZoneMergeList } from "../components/epp-zone-merge-list.js";
import type { DeviceGroupSource, DeviceGroupZoneGroup } from "../types.js";

async function fixture(): Promise<EppZoneMergeList> {
	const el = document.createElement("epp-zone-merge-list") as EppZoneMergeList;
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

const TWO_SOURCES: DeviceGroupSource[] = [
	{
		mac: "AA",
		name: "Left",
		available: true,
		enabled_presence: [],
		zones: [{ index: 2, name: "Desk", enabled: true }],
	},
	{
		mac: "BB",
		name: "Right",
		available: true,
		enabled_presence: [],
		zones: [{ index: 3, name: "Couch", enabled: true }],
	},
];

function $(el: EppZoneMergeList, sel: string): HTMLElement | null {
	return el.shadowRoot!.querySelector(sel) as HTMLElement | null;
}
function $all(el: EppZoneMergeList, sel: string): HTMLElement[] {
	return [...el.shadowRoot!.querySelectorAll(sel)] as HTMLElement[];
}
function availableLabels(el: EppZoneMergeList): string[] {
	return $all(el, '[data-testid="available-zone"]').map((n) =>
		n.textContent!.trim(),
	);
}
function nextDetail(el: EppZoneMergeList): Promise<DeviceGroupZoneGroup[]> {
	return new Promise((resolve) => {
		el.addEventListener(
			"zone-groups-changed",
			(e: Event) => resolve((e as CustomEvent).detail.zone_groups),
			{ once: true },
		);
	});
}
async function startMerge(el: EppZoneMergeList): Promise<void> {
	($(el, '[data-testid="create-merge"]') as HTMLButtonElement).click();
	await el.updateComplete;
}
async function setMergeName(el: EppZoneMergeList, name: string): Promise<void> {
	const input = $(el, '[data-testid="merge-name"]') as HTMLInputElement;
	input.value = name;
	input.dispatchEvent(new Event("input"));
	await el.updateComplete;
}
async function check(
	el: EppZoneMergeList,
	key: string,
	on: boolean,
): Promise<void> {
	const box = el.shadowRoot!.querySelector(
		`[data-testid="merge-checkbox"][data-key="${key}"]`,
	) as HTMLInputElement;
	box.checked = on;
	box.dispatchEvent(new Event("change"));
	await el.updateComplete;
}

describe("epp-zone-merge-list", () => {
	it("lists ungrouped enabled zones by device name", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		expect(availableLabels(el)).toEqual(["Left → Desk", "Right → Couch"]);
	});

	it("omits disabled zones", async () => {
		const el = await fixture();
		el.sources = [
			{
				mac: "AA",
				name: "Left",
				available: true,
				enabled_presence: [],
				zones: [
					{ index: 2, name: "Desk", enabled: true },
					{ index: 4, name: "Hidden", enabled: false },
				],
			},
		];
		el.zoneGroups = [];
		await el.updateComplete;
		expect(availableLabels(el)).toEqual(["Left → Desk"]);
	});

	it("'Create merged zone' reveals a name field + a checkbox per available zone", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		expect($(el, '[data-testid="merge-name"]')).toBeNull();
		await startMerge(el);
		expect($(el, '[data-testid="merge-name"]')).not.toBeNull();
		expect($all(el, '[data-testid="merge-checkbox"]').length).toBe(2);
	});

	it("Merge is disabled until a name and at least one zone are chosen", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		await startMerge(el);
		const confirm = $(el, '[data-testid="merge-confirm"]') as HTMLButtonElement;
		expect(confirm.disabled).toBe(true);
		await setMergeName(el, "Bed");
		expect(confirm.disabled).toBe(true); // no zone yet
		await check(el, "AA|2", true);
		expect(confirm.disabled).toBe(false);
	});

	it("merging emits a new zone group with the checked members", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		await startMerge(el);
		await setMergeName(el, "Bed");
		await check(el, "AA|2", true);
		await check(el, "BB|3", true);
		const detail = nextDetail(el);
		($(el, '[data-testid="merge-confirm"]') as HTMLButtonElement).click();
		const groups = await detail;
		expect(groups.length).toBe(1);
		expect(groups[0].name).toBe("Bed");
		expect(groups[0].members).toEqual([
			{ mac: "AA", zone_index: 2 },
			{ mac: "BB", zone_index: 3 },
		]);
	});

	it("Cancel exits merge mode without emitting", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		let fired = false;
		el.addEventListener("zone-groups-changed", () => {
			fired = true;
		});
		await startMerge(el);
		($(el, '[data-testid="merge-cancel"]') as HTMLButtonElement).click();
		await el.updateComplete;
		expect($(el, '[data-testid="merge-name"]')).toBeNull();
		expect(fired).toBe(false);
	});

	it("shows merged zones in their own section with member labels", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [
			{
				id: "g1",
				name: "Bed",
				members: [
					{ mac: "AA", zone_index: 2 },
					{ mac: "BB", zone_index: 3 },
				],
			},
		];
		await el.updateComplete;
		expect($(el, '[data-testid="merged-zone"]')).not.toBeNull();
		expect($(el, ".group-name")!.textContent!.trim()).toBe("Zone Bed");
		const members = $all(el, ".member").map((m) => m.textContent!.trim());
		expect(members).toEqual(["Left → Desk", "Right → Couch"]);
		// Grouped zones are no longer offered as available.
		expect(availableLabels(el)).toEqual([]);
	});

	it("deletes a merged zone", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [{ id: "g1", name: "Bed", members: [] }];
		await el.updateComplete;
		const detail = nextDetail(el);
		($(el, '[data-testid="delete-merge"]') as HTMLButtonElement).click();
		expect(await detail).toEqual([]);
	});

	it("editing a merged zone pre-fills its name + members and saves changes", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [
			{ id: "g1", name: "Bed", members: [{ mac: "AA", zone_index: 2 }] },
		];
		await el.updateComplete;
		($(el, '[data-testid="edit-merge"]') as HTMLButtonElement).click();
		await el.updateComplete;
		// name pre-filled, the member pre-checked, and the other ungrouped zone
		// (BB|3) offered too
		expect(
			($(el, '[data-testid="merge-name"]') as HTMLInputElement).value,
		).toBe("Bed");
		expect(
			(
				el.shadowRoot!.querySelector(
					'[data-testid="merge-checkbox"][data-key="AA|2"]',
				) as HTMLInputElement
			).checked,
		).toBe(true);
		// add BB|3, rename, save
		await setMergeName(el, "Bedroom");
		await check(el, "BB|3", true);
		const detail = nextDetail(el);
		($(el, '[data-testid="merge-confirm"]') as HTMLButtonElement).click();
		const groups = await detail;
		expect(groups.length).toBe(1);
		expect(groups[0].id).toBe("g1");
		expect(groups[0].name).toBe("Bedroom");
		expect(groups[0].members).toEqual([
			{ mac: "AA", zone_index: 2 },
			{ mac: "BB", zone_index: 3 },
		]);
	});

	it("labels a member from an unknown device gracefully", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [
			{ id: "g1", name: "Mixed", members: [{ mac: "ZZ", zone_index: 9 }] },
		];
		await el.updateComplete;
		expect($(el, ".member")!.textContent!.trim()).toBe(
			"Unknown device → Zone 9",
		);
	});
});
