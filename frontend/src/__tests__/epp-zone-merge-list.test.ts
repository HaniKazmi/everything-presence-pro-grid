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
function deviceNames(el: EppZoneMergeList): string[] {
	return $all(el, '[data-testid="zone-table-device"]').map((n) =>
		n.textContent!.trim(),
	);
}
function zoneNames(el: EppZoneMergeList): string[] {
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
// The merged-zone box wires Edit/Delete through the kebab's `item-select`
// event, so drive it directly rather than opening the popover.
function kebabSelect(el: EppZoneMergeList, id: string, idx = 0): void {
	const menus = [...el.shadowRoot!.querySelectorAll("epp-kebab-menu")];
	menus[idx].dispatchEvent(
		new CustomEvent("item-select", {
			detail: { id },
			bubbles: true,
			composed: true,
		}),
	);
}
async function startMerge(el: EppZoneMergeList): Promise<void> {
	($(el, '[data-testid="create-merge"]') as HTMLElement).click();
	await el.updateComplete;
}
// The name field is now an <epp-field> (carrying the merge-name data-testid on
// its host); it emits a single value-changed ({ detail: { value } }). Drive that
// event directly to stay widget-agnostic.
async function setMergeName(el: EppZoneMergeList, name: string): Promise<void> {
	const field = $(el, '[data-testid="merge-name"]') as HTMLElement;
	field.dispatchEvent(
		new CustomEvent("value-changed", {
			detail: { value: name },
			bubbles: true,
			composed: true,
		}),
	);
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
	it("lays out ungrouped enabled zones as a device → zones table", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		expect(deviceNames(el)).toEqual(["Left", "Right"]);
		expect(zoneNames(el)).toEqual(["Desk", "Couch"]);
	});

	it("lists a device once with all of its zones beside it", async () => {
		const el = await fixture();
		el.sources = [
			{
				mac: "AA",
				name: "Left",
				available: true,
				enabled_presence: [],
				zones: [
					{ index: 1, name: "Desk", enabled: true },
					{ index: 2, name: "Sofa", enabled: true },
				],
			},
		];
		el.zoneGroups = [];
		await el.updateComplete;
		// device name appears once, both its zones on the right
		expect(deviceNames(el)).toEqual(["Left"]);
		expect(zoneNames(el)).toEqual(["Desk", "Sofa"]);
	});

	it("omits disabled zones from the table", async () => {
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
		expect(deviceNames(el)).toEqual(["Left"]);
		expect(zoneNames(el)).toEqual(["Desk"]);
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

	it("Merge stays disabled until a name and at least two zones are chosen", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		await startMerge(el);
		const confirm = $(el, '[data-testid="merge-confirm"]') as HTMLButtonElement;
		expect(confirm.disabled).toBe(true);
		await setMergeName(el, "Bed");
		expect(confirm.disabled).toBe(true); // no zones yet
		await check(el, "AA|2", true);
		expect(confirm.disabled).toBe(true); // only one zone
		await check(el, "BB|3", true);
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

	it("unchecking a zone drops it back below the merge threshold", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		await startMerge(el);
		await setMergeName(el, "Bed");
		await check(el, "AA|2", true);
		await check(el, "BB|3", true);
		const confirm = $(el, '[data-testid="merge-confirm"]') as HTMLButtonElement;
		expect(confirm.disabled).toBe(false);
		await check(el, "BB|3", false);
		expect(confirm.disabled).toBe(true);
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
		($(el, '[data-testid="merge-cancel"]') as HTMLElement).click();
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
		// members render as a device → zone grid (like the available zones)
		const memberDevices = $all(el, '[data-testid="merged-member-device"]').map(
			(m) => m.textContent!.trim(),
		);
		const memberZones = $all(el, '[data-testid="merged-member-zone"]').map(
			(m) => m.textContent!.trim(),
		);
		expect(memberDevices).toEqual(["Left", "Right"]);
		expect(memberZones).toEqual(["Desk", "Couch"]);
		// Grouped zones are no longer offered in the available table.
		expect(zoneNames(el)).toEqual([]);
	});

	it("kebab Delete removes a merged zone", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [{ id: "g1", name: "Bed", members: [] }];
		await el.updateComplete;
		const detail = nextDetail(el);
		kebabSelect(el, "delete");
		expect(await detail).toEqual([]);
	});

	it("kebab Edit pre-fills a merged zone's name + members and saves changes", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [
			{ id: "g1", name: "Bed", members: [{ mac: "AA", zone_index: 2 }] },
		];
		await el.updateComplete;
		kebabSelect(el, "edit");
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
		expect(
			$(el, '[data-testid="merged-member-device"]')!.textContent!.trim(),
		).toBe("Unknown device");
		expect(
			$(el, '[data-testid="merged-member-zone"]')!.textContent!.trim(),
		).toBe("Zone 9");
	});

	it("lays the available zones out in a single bordered box", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		const boxes = el.shadowRoot!.querySelectorAll(".zone-box");
		expect(boxes.length).toBe(1);
		expect(
			boxes[0].querySelectorAll('[data-testid="available-zone"]').length,
		).toBe(2);
	});

	it("places the checkbox to the right of the zone name in merge mode", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		await startMerge(el);
		const cell = el.shadowRoot!.querySelector(
			'[data-testid="available-zone"]',
		) as HTMLElement;
		const name = cell.querySelector(".zt-zone-name") as HTMLElement;
		const box = cell.querySelector(
			'[data-testid="merge-checkbox"]',
		) as HTMLElement;
		expect(name).not.toBeNull();
		expect(box).not.toBeNull();
		// name comes before the checkbox (checkbox sits on the right)
		expect(
			name.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("renders Edit + a divider + a danger Delete (with icons) in the merged-zone kebab", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [{ id: "g1", name: "Bed", members: [] }];
		await el.updateComplete;
		const menu = el.shadowRoot!.querySelector("epp-kebab-menu") as unknown as {
			items: { id?: string; icon?: string; danger?: boolean; divider?: true }[];
		};
		expect(menu.items.map((i) => i.id ?? "divider")).toEqual([
			"edit",
			"divider",
			"delete",
		]);
		expect(menu.items[0].icon).toBeTruthy();
		expect(menu.items[2].danger).toBe(true);
		expect(menu.items[2].icon).toBeTruthy();
	});

	// Keep last: registering HA elements is global for the test environment.
	// Exercises the ha-input / ha-checkbox branches; every test above covers the
	// ha-textfield / checkbox fallbacks. The name field is now an <epp-field>,
	// which renders ha-input inside ITS OWN shadow root; the zone-selection
	// control stays a direct ha-checkbox in this component's shadow root.
	it("uses HA-native ha-input and ha-checkbox when registered", async () => {
		for (const name of ["ha-input", "ha-checkbox"]) {
			if (!customElements.get(name)) {
				customElements.define(name, class extends HTMLElement {});
			}
		}
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		await startMerge(el);
		const field = $(el, '[data-testid="merge-name"]') as HTMLElement;
		await (field as HTMLElement & { updateComplete: Promise<unknown> })
			.updateComplete;
		expect(field.shadowRoot!.querySelector("ha-input")).not.toBeNull();
		expect(el.shadowRoot!.querySelectorAll("ha-checkbox").length).toBe(2);
	});
});
