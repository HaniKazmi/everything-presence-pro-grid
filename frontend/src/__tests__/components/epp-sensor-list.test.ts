import { describe, expect, it } from "vitest";
import "../../components/epp-sensor-list.js";
import type { EppSensorList } from "../../components/epp-sensor-list.js";
import type {
	DeviceGroupSource,
	DeviceGroupZoneGroup,
	DeviceGroupZoneMember,
} from "../../types.js";

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

	it("coverage line shows providers, and flags a missing provider", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		const occRow = $(
			el,
			'[data-testid="presence-row"][data-slot="occupancy"]',
		) as HTMLElement;
		const occCov = occRow.querySelector(
			'[data-testid="coverage"]',
		) as HTMLElement;
		expect(occCov.textContent).toContain("Left");
		expect(occCov.textContent).toContain("Right");
		const staticRow = $(
			el,
			'[data-testid="presence-row"][data-slot="static_presence"]',
		) as HTMLElement;
		const staticCov = staticRow.querySelector(
			'[data-testid="coverage"]',
		) as HTMLElement;
		expect(staticCov.textContent).toContain("Left"); // provider
		expect(staticCov.textContent).toContain("Right"); // missing one named
		expect(staticCov.textContent).toContain("off in HA"); // missing marker
	});

	it("renders exactly one combined Rest of room row, default ON", async () => {
		const el = await fixture();
		el.sources = TWO_SOURCES;
		el.zoneGroups = [];
		await el.updateComplete;
		const rows = $all(el, '[data-testid="rest-of-room-row"]');
		expect(rows.length).toBe(1);
		expect(rows[0].textContent).toContain("Zone Rest of Room");
		expect(rows[0].textContent).toContain("combined");
		const t = $(el, '[data-testid="rest-of-room-toggle"]') as HTMLElement & {
			checked: boolean;
		};
		expect(t.checked).toBe(true);
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

	it("hides the Rest of room row when no source has an enabled zone 0", async () => {
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
