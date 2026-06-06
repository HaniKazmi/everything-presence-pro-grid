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

function nextDetail(el: EppZoneMergeList): Promise<DeviceGroupZoneGroup[]> {
	return new Promise((resolve) => {
		el.addEventListener(
			"zone-groups-changed",
			(e: Event) => resolve((e as CustomEvent).detail.zone_groups),
			{ once: true },
		);
	});
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

	it("excludes already-grouped zones from the available pane", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [
			{ id: "g1", name: "Bed", members: [{ mac: "AA", zone_index: 2 }] },
		];
		await el.updateComplete;
		const labels = [
			...el.shadowRoot!.querySelectorAll('[data-testid="available-zone"]'),
		].map((n) => n.textContent?.trim());
		expect(labels).toEqual(["Right → Couch"]);
	});

	it("highlights the selected zone", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		const first = el.shadowRoot!.querySelector(
			'[data-testid="available-zone"]',
		) as HTMLElement;
		first.click();
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".zone-item.selected")).not.toBeNull();
	});

	it("renames a group via the name input", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [{ id: "g1", name: "Group", members: [] }];
		await el.updateComplete;
		const input = el.shadowRoot!.querySelector(
			".group-name",
		) as HTMLInputElement;
		const detail = nextDetail(el);
		input.value = "Bedroom";
		input.dispatchEvent(new Event("input"));
		const groups = await detail;
		expect(groups[0].name).toBe("Bedroom");
	});

	it("adds the selected zone to a group", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [{ id: "g1", name: "Bed", members: [] }];
		await el.updateComplete;
		(
			el.shadowRoot!.querySelector(
				'[data-testid="available-zone"]',
			) as HTMLElement
		).click();
		await el.updateComplete;
		const detail = nextDetail(el);
		const addBtn = [...el.shadowRoot!.querySelectorAll(".group button")].find(
			(b) => b.textContent?.includes("Add selected"),
		) as HTMLButtonElement;
		addBtn.click();
		const groups = await detail;
		expect(groups[0].members).toEqual([{ mac: "AA", zone_index: 2 }]);
	});

	it("ignores 'add selected' when no zone is selected", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [{ id: "g1", name: "Bed", members: [] }];
		await el.updateComplete;
		let fired = false;
		el.addEventListener("zone-groups-changed", () => {
			fired = true;
		});
		const addBtn = [...el.shadowRoot!.querySelectorAll(".group button")].find(
			(b) => b.textContent?.includes("Add selected"),
		) as HTMLButtonElement;
		addBtn.click();
		expect(fired).toBe(false);
	});

	it("removes a member from a group", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [
			{ id: "g1", name: "Bed", members: [{ mac: "AA", zone_index: 2 }] },
		];
		await el.updateComplete;
		const detail = nextDetail(el);
		const removeBtn = el.shadowRoot!.querySelector(
			".member .x",
		) as HTMLButtonElement;
		removeBtn.click();
		const groups = await detail;
		expect(groups[0].members).toEqual([]);
	});

	it("renders member labels, falling back for unknown sources/zones", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [
			{
				id: "g1",
				name: "Mixed",
				members: [
					{ mac: "AA", zone_index: 2 },
					{ mac: "ZZ", zone_index: 9 },
				],
			},
		];
		await el.updateComplete;
		const labels = [...el.shadowRoot!.querySelectorAll(".member span")].map(
			(n) => n.textContent?.trim(),
		);
		expect(labels).toEqual(["Left → Desk", "ZZ → Zone 9"]);
	});

	it("omits disabled zones from the available pane", async () => {
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
		const labels = [
			...el.shadowRoot!.querySelectorAll('[data-testid="available-zone"]'),
		].map((n) => n.textContent?.trim());
		expect(labels).toEqual(["Left → Desk"]);
	});

	it("only mutates the targeted group, leaving siblings untouched", async () => {
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
			{ id: "g2", name: "Other", members: [] },
		];
		await el.updateComplete;
		const detail = nextDetail(el);
		// remove only the first member of the first group
		const firstRemove = el.shadowRoot!.querySelector(
			".member .x",
		) as HTMLButtonElement;
		firstRemove.click();
		const groups = await detail;
		expect(groups[0].members).toEqual([{ mac: "BB", zone_index: 3 }]);
		expect(groups[1]).toEqual({ id: "g2", name: "Other", members: [] });
	});

	it("deletes a group", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [{ id: "g1", name: "Bed", members: [] }];
		await el.updateComplete;
		const detail = nextDetail(el);
		const delBtn = [...el.shadowRoot!.querySelectorAll(".group button.x")].find(
			(b) => b.textContent?.trim() === "Delete",
		) as HTMLButtonElement;
		delBtn.click();
		const groups = await detail;
		expect(groups).toEqual([]);
	});
});
