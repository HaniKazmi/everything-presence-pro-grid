import { describe, expect, it } from "vitest";
import "../../components/epp-sensor-list.js";
import type { EppSensorList } from "../../components/epp-sensor-list.js";
import type {
	DeviceGroupSource,
	DeviceGroupZoneGroup,
	DeviceGroupZoneMember,
} from "../../types.js";
import { REST_OF_ROOM_NAME } from "../../types.js";

async function fixture(): Promise<EppSensorList> {
	const el = document.createElement("epp-sensor-list") as EppSensorList;
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

// AA exposes occupancy + static_presence, BB only occupancy. Both have an
// enabled Rest of room (zone 0) and a shared "Desk" (index 2); BB adds "Couch".
const TWO_SOURCES: DeviceGroupSource[] = [
	{
		mac: "AA",
		name: "Left",
		available: true,
		enabled_presence: ["occupancy", "static_presence"],
		zones: [
			{ index: 0, name: "Rest of room", enabled: true },
			{ index: 2, name: "Desk", enabled: true },
		],
	},
	{
		mac: "BB",
		name: "Right",
		available: true,
		enabled_presence: ["occupancy"],
		zones: [
			{ index: 0, name: "Rest of room", enabled: true },
			{ index: 2, name: "Desk", enabled: true },
			{ index: 3, name: "Couch", enabled: true },
		],
	},
];

function $(el: EppSensorList, sel: string): HTMLElement | null {
	return el.shadowRoot!.querySelector(sel) as HTMLElement | null;
}
function $all(el: EppSensorList, sel: string): HTMLElement[] {
	return [...el.shadowRoot!.querySelectorAll(sel)] as HTMLElement[];
}
function nextExclusions(el: EppSensorList): Promise<{
	excluded_presence: string[];
	excluded_zones: DeviceGroupZoneMember[];
	excluded_zone_groups: string[];
}> {
	return new Promise((resolve) => {
		el.addEventListener(
			"exclusions-changed",
			(e: Event) => resolve((e as CustomEvent).detail),
			{ once: true },
		);
	});
}
function nextGroups(el: EppSensorList): Promise<DeviceGroupZoneGroup[]> {
	return new Promise((resolve) => {
		el.addEventListener(
			"zone-groups-changed",
			(e: Event) => resolve((e as CustomEvent).detail.zone_groups),
			{ once: true },
		);
	});
}
// The kebab wires Edit/Delete through the kebab's `item-select` event.
function kebabSelect(el: EppSensorList, id: string, idx = 0): void {
	const menus = [...el.shadowRoot!.querySelectorAll("epp-kebab-menu")];
	menus[idx].dispatchEvent(
		new CustomEvent("item-select", {
			detail: { id },
			bubbles: true,
			composed: true,
		}),
	);
}
// Drive an epp-toggle's value-changed directly (widget-agnostic).
async function toggle(
	el: EppSensorList,
	sel: string,
	value: boolean,
): Promise<void> {
	const t = $(el, sel) as HTMLElement;
	t.dispatchEvent(
		new CustomEvent("value-changed", {
			detail: { value },
			bubbles: true,
			composed: true,
		}),
	);
	await el.updateComplete;
}

describe("epp-sensor-list — list mode", () => {
	it("is registered as a custom element", () => {
		expect(customElements.get("epp-sensor-list")).toBeTruthy();
	});

	it("renders presence rows in PRESENCE_SLOTS order, only for slots a source has", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		const slots = $all(el, '[data-testid="presence-row"]').map((r) =>
			r.getAttribute("data-slot"),
		);
		// Motion/Target/mmWave absent; occupancy before static_presence (slot order).
		expect(slots).toEqual(["occupancy", "static_presence"]);
	});

	it("presence toggles default ON when not excluded", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		const toggles = $all(el, '[data-testid="presence-toggle"]') as Array<
			HTMLElement & { checked: boolean }
		>;
		expect(toggles.every((t) => t.checked === true)).toBe(true);
	});

	it("toggling a presence off opts it out and passes other sets through", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		el.excludedZones = [{ mac: "AA", zone_index: 2 }];
		el.excludedZoneGroups = ["rest_of_room"];
		await el.updateComplete;
		const detail = nextExclusions(el);
		await toggle(
			el,
			'[data-testid="presence-row"][data-slot="occupancy"] [data-testid="presence-toggle"]',
			false,
		);
		const d = await detail;
		expect(d.excluded_presence).toEqual(["occupancy"]);
		expect(d.excluded_zones).toEqual([{ mac: "AA", zone_index: 2 }]);
		expect(d.excluded_zone_groups).toEqual(["rest_of_room"]);
	});

	it("a pre-excluded presence toggle is OFF and toggling it ON clears the exclusion", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		el.excludedPresence = ["occupancy"];
		await el.updateComplete;
		const t = $(
			el,
			'[data-testid="presence-row"][data-slot="occupancy"] [data-testid="presence-toggle"]',
		) as HTMLElement & { checked: boolean };
		expect(t.checked).toBe(false);
		const detail = nextExclusions(el);
		await toggle(
			el,
			'[data-testid="presence-row"][data-slot="occupancy"] [data-testid="presence-toggle"]',
			true,
		);
		expect((await detail).excluded_presence).toEqual([]);
	});

	it("coverage shows providers plain and off-in-HA providers struck through", async () => {
		const el = await fixture();
		el.sources = [
			{
				mac: "AA",
				name: "Kitchen",
				available: true,
				enabled_presence: ["occupancy"],
				zones: [],
			},
			{
				mac: "BB",
				name: "Lounge",
				available: true,
				enabled_presence: [],
				zones: [],
			},
		];
		await el.updateComplete;
		const row = $(
			el,
			'[data-testid="presence-row"][data-slot="occupancy"]',
		) as HTMLElement;
		const on = [...row.querySelectorAll('[data-testid="coverage-on"]')].map(
			(s) => s.textContent,
		);
		const off = [...row.querySelectorAll('[data-testid="coverage-off"]')].map(
			(s) => s.textContent,
		);
		expect(on).toEqual(["Kitchen"]);
		expect(off).toEqual(["Lounge"]);
		// No glyph/label cruft.
		const text = row.querySelector('[data-testid="coverage"]')!.textContent!;
		expect(text).not.toMatch(/✓|✗|off in HA/);
	});

	it("renders exactly one Rest of room row, default ON, with no 'combined' chip", async () => {
		const el = await fixture();
		el.sources = [
			{
				mac: "AA",
				name: "Kitchen",
				available: true,
				enabled_presence: [],
				zones: [{ index: 0, name: "Rest of room", enabled: true }],
			},
		];
		await el.updateComplete;
		const rows = $all(el, '[data-testid="rest-of-room-row"]');
		expect(rows).toHaveLength(1);
		expect(rows[0].textContent).toContain(REST_OF_ROOM_NAME);
		expect(rows[0].textContent).not.toContain("combined");
		expect(rows[0].querySelector(".chip")).toBeNull();
	});

	it("toggling Rest of room off opts out the rest_of_room group", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		const detail = nextExclusions(el);
		await toggle(el, '[data-testid="rest-of-room-toggle"]', false);
		expect((await detail).excluded_zone_groups).toEqual(["rest_of_room"]);
	});

	it("a pre-excluded Rest of room is OFF and toggling it ON clears the exclusion", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		el.excludedZoneGroups = ["rest_of_room"];
		await el.updateComplete;
		const t = $(el, '[data-testid="rest-of-room-toggle"]') as HTMLElement & {
			checked: boolean;
		};
		expect(t.checked).toBe(false);
		const detail = nextExclusions(el);
		await toggle(el, '[data-testid="rest-of-room-toggle"]', true);
		expect((await detail).excluded_zone_groups).toEqual([]);
	});

	it("hides the Rest of room row when no source has a zone 0", async () => {
		const el = await fixture();
		el.sources = [
			{
				mac: "AA",
				name: "Left",
				available: true,
				enabled_presence: ["occupancy"],
				zones: [{ index: 2, name: "Desk", enabled: true }],
			},
		];
		el.zoneGroups = [];
		await el.updateComplete;
		expect($(el, '[data-testid="rest-of-room-row"]')).toBeNull();
	});

	it("still shows the Rest of room row when a source has a zone 0 that is disabled", async () => {
		// Matches the projection contract: RoR is offered whenever a source HAS a
		// zone 0, even if disabled in HA, so the user can always opt out of it.
		const el = await fixture();
		el.sources = [
			{
				mac: "AA",
				name: "Left",
				available: true,
				enabled_presence: ["occupancy"],
				zones: [{ index: 0, name: "Rest of room", enabled: false }],
			},
		];
		el.zoneGroups = [];
		await el.updateComplete;
		expect($(el, '[data-testid="rest-of-room-row"]')).not.toBeNull();
	});

	it("lists index>=1 passthrough zones, same-named adjacent, labelled Zone · Device", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		const rows = $all(el, '[data-testid="zone-row"]');
		const labels = rows.map((r) => r.textContent!.replace(/\s+/g, " ").trim());
		// Numeric-aware by zone name (Couch < Desk), Desk rows adjacent, ties by device.
		expect(labels.some((l) => l.includes("Couch · Right"))).toBe(true);
		expect(labels.some((l) => l.includes("Desk · Left"))).toBe(true);
		expect(labels.some((l) => l.includes("Desk · Right"))).toBe(true);
		// The two Desk rows are adjacent.
		const deskIdx = labels
			.map((l, i) => (l.includes("Desk") ? i : -1))
			.filter((i) => i >= 0);
		expect(deskIdx[1] - deskIdx[0]).toBe(1);
		// Zone 0 is never a passthrough row.
		expect(labels.some((l) => l.includes("Rest of room"))).toBe(false);
		// data-key carries mac|index.
		const keys = rows.map((r) => r.getAttribute("data-key"));
		expect(keys).toContain("AA|2");
		expect(keys).toContain("BB|2");
		expect(keys).toContain("BB|3");
	});

	it("zone toggles default ON; toggling one off opts it out", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		const t = $(
			el,
			'[data-testid="zone-row"][data-key="AA|2"] [data-testid="zone-toggle"]',
		) as HTMLElement & { checked: boolean };
		expect(t.checked).toBe(true);
		const detail = nextExclusions(el);
		await toggle(
			el,
			'[data-testid="zone-row"][data-key="AA|2"] [data-testid="zone-toggle"]',
			false,
		);
		expect((await detail).excluded_zones).toEqual([
			{ mac: "AA", zone_index: 2 },
		]);
	});

	it("a pre-excluded zone is OFF and toggling it ON clears the exclusion", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		el.excludedZones = [{ mac: "AA", zone_index: 2 }];
		await el.updateComplete;
		const t = $(
			el,
			'[data-testid="zone-row"][data-key="AA|2"] [data-testid="zone-toggle"]',
		) as HTMLElement & { checked: boolean };
		expect(t.checked).toBe(false);
		const detail = nextExclusions(el);
		await toggle(
			el,
			'[data-testid="zone-row"][data-key="AA|2"] [data-testid="zone-toggle"]',
			true,
		);
		expect((await detail).excluded_zones).toEqual([]);
	});

	it("renders merged zones with a kebab, no toggle, members hidden from passthroughs", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [
			{
				id: "g1",
				name: "Bed",
				members: [
					{ mac: "AA", zone_index: 2 },
					{ mac: "BB", zone_index: 2 },
				],
			},
		];
		await el.updateComplete;
		const merged = $(el, '[data-testid="merged-zone"]') as HTMLElement;
		expect(merged).not.toBeNull();
		const text = merged.textContent!.replace(/\s+/g, " ").trim();
		expect(text).toContain("Bed");
		expect(text).toContain("Left");
		expect(text).toContain("Right");
		expect(text).toContain("merged");
		// No toggle inside a merged row.
		expect(merged.querySelector('[data-testid="zone-toggle"]')).toBeNull();
		// Merged members no longer appear as passthrough zone-rows (only BB|3 left).
		const keys = $all(el, '[data-testid="zone-row"]').map((r) =>
			r.getAttribute("data-key"),
		);
		expect(keys).toEqual(["BB|3"]);
		// Kebab carries Edit/Delete.
		const menu = merged.querySelector("epp-kebab-menu") as unknown as {
			items: { id?: string }[];
		};
		expect(menu.items.map((i) => i.id ?? "divider")).toEqual([
			"edit",
			"divider",
			"delete",
		]);
	});

	it("kebab Delete removes the merged zone", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [{ id: "g1", name: "Bed", members: [] }];
		await el.updateComplete;
		const detail = nextGroups(el);
		kebabSelect(el, "delete");
		expect(await detail).toEqual([]);
	});

	it("omits disabled index>=1 zones from the passthrough rows", async () => {
		const el = await fixture();
		el.sources = [
			{
				mac: "AA",
				name: "Left",
				available: true,
				enabled_presence: ["occupancy"],
				zones: [
					{ index: 2, name: "Desk", enabled: true },
					{ index: 4, name: "Hidden", enabled: false },
				],
			},
		];
		el.zoneGroups = [];
		await el.updateComplete;
		const keys = $all(el, '[data-testid="zone-row"]').map((r) =>
			r.getAttribute("data-key"),
		);
		expect(keys).toEqual(["AA|2"]);
	});

	it("merged-zone row shows a device+zone sub-line per member", async () => {
		const el = await fixture();
		el.sources = [
			{
				mac: "AA",
				name: "Sensor 1",
				available: true,
				enabled_presence: [],
				zones: [{ index: 3, name: "Bed", enabled: true }],
			},
			{
				mac: "BB",
				name: "Sensor 2",
				available: true,
				enabled_presence: [],
				zones: [{ index: 4, name: "Bed", enabled: true }],
			},
		];
		el.zoneGroups = [
			{
				id: "zg_x",
				name: "Bed",
				members: [
					{ mac: "AA", zone_index: 3 },
					{ mac: "BB", zone_index: 4 },
				],
			},
		];
		await el.updateComplete;
		const row = $(el, '[data-testid="merged-zone"]') as HTMLElement;
		expect(row.querySelector(".sensor-name")!.textContent).toBe("Bed");
		const sub = row
			.querySelector('[data-testid="merged-members"]')!
			.textContent!.trim();
		expect(sub).toBe("Bed · Sensor 1, Bed · Sensor 2");
	});

	// Keep last in this block: registering ha-switch is global for the test env.
	it("uses ha-switch for presence/zone/RoR toggles when registered", async () => {
		if (!customElements.get("ha-switch")) {
			customElements.define("ha-switch", class extends HTMLElement {});
		}
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		const toggles = $all(el, "epp-toggle") as Array<
			HTMLElement & { updateComplete: Promise<unknown> }
		>;
		for (const t of toggles) await t.updateComplete;
		expect(
			toggles.every((t) => t.shadowRoot!.querySelector("ha-switch") !== null),
		).toBe(true);
	});
});

async function startMerge(el: EppSensorList): Promise<void> {
	($(el, '[data-testid="mode-merge"]') as HTMLElement).click();
	await el.updateComplete;
}
async function setMergeName(el: EppSensorList, name: string): Promise<void> {
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
	el: EppSensorList,
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

describe("epp-sensor-list — merge mode", () => {
	it("shows a segmented List/Merge control; clicking Merge enters merge mode", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		expect($(el, '[data-testid="mode-list"]')).not.toBeNull();
		expect($(el, '[data-testid="mode-merge"]')).not.toBeNull();
		expect($(el, '[data-testid="merge-name"]')).toBeNull();
		await startMerge(el);
		expect($(el, '[data-testid="merge-name"]')).not.toBeNull();
		// One checkbox per enabled index-≥1 zone (Desk Left/Right + Couch = 3).
		expect($all(el, '[data-testid="merge-checkbox"]').length).toBe(3);
	});

	it("greys out presence + Rest of room toggles in merge mode, enabled in list mode", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		// List mode: enabled.
		const listToggles = [
			...$all(el, '[data-testid="presence-toggle"]'),
			$(el, '[data-testid="rest-of-room-toggle"]'),
		] as Array<HTMLElement & { disabled: boolean }>;
		expect(listToggles.every((t) => t.disabled === false)).toBe(true);
		await startMerge(el);
		const mergeToggles = [
			...$all(el, '[data-testid="presence-toggle"]'),
			$(el, '[data-testid="rest-of-room-toggle"]'),
		] as Array<HTMLElement & { disabled: boolean }>;
		expect(mergeToggles.every((t) => t.disabled === true)).toBe(true);
		// Their rows carry a disabled class.
		expect(
			$(el, '[data-testid="rest-of-room-row"]')!.classList.contains("disabled"),
		).toBe(true);
		expect(
			$(el, '[data-testid="presence-row"]')!.classList.contains("disabled"),
		).toBe(true);
	});

	it("offers a checkbox only for index-≥1 zones (Rest of room has none)", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		await startMerge(el);
		// Rest of room row has no merge checkbox.
		expect(
			$(el, '[data-testid="rest-of-room-row"]')!.querySelector(
				'[data-testid="merge-checkbox"]',
			),
		).toBeNull();
		const keys = $all(el, '[data-testid="merge-checkbox"]').map((b) =>
			b.getAttribute("data-key"),
		);
		expect(keys.sort()).toEqual(["AA|2", "BB|2", "BB|3"]);
	});

	it("keeps Merge disabled until a name + 2 checks, then emits a group and returns to list", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		await startMerge(el);
		const confirm = $(el, '[data-testid="merge-confirm"]') as HTMLButtonElement;
		expect(confirm.disabled).toBe(true);
		await setMergeName(el, "Bed");
		expect(confirm.disabled).toBe(true);
		await check(el, "AA|2", true);
		expect(confirm.disabled).toBe(true);
		await check(el, "BB|2", true);
		expect(confirm.disabled).toBe(false);
		const detail = nextGroups(el);
		($(el, '[data-testid="merge-confirm"]') as HTMLButtonElement).click();
		const groups = await detail;
		expect(groups.length).toBe(1);
		expect(groups[0].name).toBe("Bed");
		expect(groups[0].members).toEqual([
			{ mac: "AA", zone_index: 2 },
			{ mac: "BB", zone_index: 2 },
		]);
		// Back to list mode.
		await el.updateComplete;
		expect($(el, '[data-testid="merge-name"]')).toBeNull();
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

	it("clicking List exits merge mode without emitting", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		await startMerge(el);
		($(el, '[data-testid="mode-list"]') as HTMLElement).click();
		await el.updateComplete;
		expect($(el, '[data-testid="merge-name"]')).toBeNull();
		expect($(el, '[data-testid="zone-toggle"]')).not.toBeNull();
	});

	it("kebab Edit re-enters merge mode with the group's members pre-checked, then saves (leaving other groups untouched)", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [
			{ id: "g1", name: "Bed", members: [{ mac: "AA", zone_index: 2 }] },
			{ id: "g2", name: "Couch", members: [{ mac: "BB", zone_index: 3 }] },
		];
		await el.updateComplete;
		// First merged-zone kebab is g1.
		kebabSelect(el, "edit", 0);
		await el.updateComplete;
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
		// Other ungrouped index-≥1 zones are still offered.
		expect(
			el.shadowRoot!.querySelector(
				'[data-testid="merge-checkbox"][data-key="BB|2"]',
			),
		).not.toBeNull();
		await setMergeName(el, "Bedroom");
		await check(el, "BB|2", true);
		const detail = nextGroups(el);
		($(el, '[data-testid="merge-confirm"]') as HTMLButtonElement).click();
		const groups = await detail;
		expect(groups.length).toBe(2);
		const g1 = groups.find((g) => g.id === "g1")!;
		expect(g1.name).toBe("Bedroom");
		expect(g1.members).toEqual([
			{ mac: "AA", zone_index: 2 },
			{ mac: "BB", zone_index: 2 },
		]);
		// g2 passes through the edit unchanged.
		const g2 = groups.find((g) => g.id === "g2")!;
		expect(g2.name).toBe("Couch");
		expect(g2.members).toEqual([{ mac: "BB", zone_index: 3 }]);
	});

	it("edit mode: editing group's own members interleave alphabetically with other offered zones", async () => {
		// g1 owns BB|2 (Desk · Right). Ungrouped: AA|2 (Desk · Left), BB|3 (Couch · Right).
		// Full sorted order: Couch · Right, Desk · Left, Desk · Right.
		// Before fix, BB|2 was appended raw → order was Couch, Desk·Left, Desk·Right
		// only if the editing member happened to sort last, but the append skipped the sort.
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [
			{ id: "g1", name: "Bed", members: [{ mac: "BB", zone_index: 2 }] },
		];
		await el.updateComplete;
		kebabSelect(el, "edit", 0);
		await el.updateComplete;
		const keys = $all(el, '[data-testid="merge-checkbox"]').map((b) =>
			b.getAttribute("data-key"),
		);
		// All three zones present, fully sorted: Couch (BB|3), Desk·Left (AA|2), Desk·Right (BB|2).
		expect(keys).toEqual(["BB|3", "AA|2", "BB|2"]);
	});

	it("unchecking a zone drops it back below the merge threshold", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		await startMerge(el);
		await setMergeName(el, "Bed");
		await check(el, "AA|2", true);
		await check(el, "BB|2", true);
		const confirm = $(el, '[data-testid="merge-confirm"]') as HTMLButtonElement;
		expect(confirm.disabled).toBe(false);
		await check(el, "BB|2", false);
		expect(confirm.disabled).toBe(true);
	});

	// Keep last: registering ha-checkbox is global for the test env.
	it("uses ha-checkbox for merge checkboxes when registered", async () => {
		if (!customElements.get("ha-checkbox")) {
			customElements.define("ha-checkbox", class extends HTMLElement {});
		}
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		await startMerge(el);
		expect(el.shadowRoot!.querySelectorAll("ha-checkbox").length).toBe(3);
	});
});
