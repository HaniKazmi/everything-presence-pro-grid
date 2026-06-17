import { describe, expect, it } from "vitest";
import "../../components/epp-device-group-editor.js";
import type { EppDeviceGroupEditor } from "../../components/epp-device-group-editor.js";
import type {
	DeviceGroup,
	DeviceGroupSource,
	DeviceInfo,
} from "../../types.js";

async function fixture(): Promise<EppDeviceGroupEditor> {
	const el = document.createElement(
		"epp-device-group-editor",
	) as EppDeviceGroupEditor;
	el.hass = {};
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

// The editor now composes the epp-* primitives (epp-field for the name,
// epp-toggle per source, epp-button for the actions). Each carries the
// component's data-testid on its host and emits a single value-changed
// ({ detail: { value } }); we target by data-testid and drive that event to
// stay widget-agnostic.
function nameField(
	el: EppDeviceGroupEditor,
): HTMLElement & { value: string; label: string } {
	return el.shadowRoot!.querySelector(
		'[data-testid="name-field"]',
	) as HTMLElement & {
		value: string;
		label: string;
	};
}
function deviceToggles(el: EppDeviceGroupEditor): HTMLElement[] {
	return [
		...el.shadowRoot!.querySelectorAll('[data-testid="device-toggle"]'),
	] as HTMLElement[];
}
function toggle(
	el: EppDeviceGroupEditor,
	mac: string,
): HTMLElement & { checked: boolean } {
	return el.shadowRoot!.querySelector(
		`[data-testid="device-toggle"][data-mac="${mac}"]`,
	) as HTMLElement & { checked: boolean };
}
function actionBtn(el: EppDeviceGroupEditor, label: string): HTMLElement {
	return [...el.shadowRoot!.querySelectorAll("epp-button")].find(
		(b) => b.textContent?.trim() === label,
	) as HTMLElement;
}
function saveBtn(el: EppDeviceGroupEditor): HTMLElement {
	return actionBtn(el, "Save");
}
function emitValueChanged(target: HTMLElement, value: unknown): void {
	target.dispatchEvent(
		new CustomEvent("value-changed", {
			detail: { value },
			bubbles: true,
			composed: true,
		}),
	);
}
function setName(el: EppDeviceGroupEditor, value: string): void {
	emitValueChanged(nameField(el), value);
}
function setToggle(el: EppDeviceGroupEditor, mac: string, on: boolean): void {
	emitValueChanged(toggle(el, mac), on);
}

const DEVICES: DeviceInfo[] = [
	{
		mac: "AA",
		name: "Left",
		host: null,
		available: true,
		configured: true,
		area: null,
		firmware_status: "compatible",
		current_connection_count: null,
	},
	{
		mac: "BB",
		name: "Right",
		host: null,
		available: true,
		configured: true,
		area: null,
		firmware_status: "compatible",
		current_connection_count: null,
	},
];

const SOURCE_AA: DeviceGroupSource = {
	mac: "AA",
	name: "Left",
	available: true,
	enabled_presence: ["occupancy"],
	zones: [{ index: 2, name: "Desk", enabled: true }],
};

const SOURCE_BB: DeviceGroupSource = {
	mac: "BB",
	name: "Right",
	available: true,
	enabled_presence: ["occupancy"],
	zones: [{ index: 3, name: "Couch", enabled: true }],
};

const EXISTING: DeviceGroup = {
	id: "g1",
	name: "Bedroom",
	area_id: "bedroom",
	sources: [SOURCE_AA],
	zone_groups: [{ id: "zg1", name: "Bed", members: [] }],
	exposed_entities: { presence: [], zones: [] },
};

// A group referencing a source device that no longer exists (available: false,
// name fell back to the MAC) alongside a still-present source.
const DEAD_SOURCE: DeviceGroupSource = {
	mac: "28:DEAD",
	name: "28:DEAD",
	available: false,
	enabled_presence: [],
	zones: [],
};
const EXISTING_WITH_MISSING: DeviceGroup = {
	id: "g2",
	name: "Stale",
	area_id: null,
	sources: [SOURCE_AA, DEAD_SOURCE],
	zone_groups: [],
	exposed_entities: { presence: [], zones: [] },
};

describe("epp-device-group-editor", () => {
	it("is registered as a custom element", () => {
		expect(customElements.get("epp-device-group-editor")).toBeDefined();
	});

	it("labels the name field 'Device name' (no example placeholder)", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		expect(nameField(el).label).toBe("Device name");
	});

	it("renders a toggle for every available device", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const toggles = deviceToggles(el);
		expect(toggles.length).toBe(2);
		expect(toggles.map((t) => t.getAttribute("data-mac"))).toEqual([
			"AA",
			"BB",
		]);
	});

	it("frames the editor in an ha-card", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector("ha-card")).not.toBeNull();
	});

	it("shows each source device's name but not its mac", async () => {
		const el = await fixture();
		el.availableDevices = [
			{ ...DEVICES[0], mac: "28:05:A5:11:22:33", name: "Kitchen" },
		];
		await el.updateComplete;
		const row = el.shadowRoot!.querySelector(".source-row") as HTMLElement;
		expect(row.textContent).toContain("Kitchen");
		expect(row.textContent).not.toContain("28:05:A5:11:22:33");
	});

	it("shows the device's area name in parentheses after the name", async () => {
		const el = await fixture();
		el.availableDevices = [
			{ ...DEVICES[0], name: "Kitchen", area: "Downstairs" },
		];
		await el.updateComplete;
		const name = el.shadowRoot!.querySelector(".source-name") as HTMLElement;
		expect(name.textContent!.trim()).toBe("Kitchen (Downstairs)");
	});

	it("puts all the source rows in a single box", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const boxes = el.shadowRoot!.querySelectorAll(".source-box");
		expect(boxes.length).toBe(1);
		expect(boxes[0].querySelectorAll(".source-row").length).toBe(2);
	});

	it("renders the device name before its toggle in the row", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const row = el.shadowRoot!.querySelector(".source-row") as HTMLElement;
		const name = row.querySelector(".source-name") as HTMLElement;
		const tog = row.querySelector(
			'[data-testid="device-toggle"]',
		) as HTMLElement;
		expect(name).not.toBeNull();
		// name comes before the toggle in document order (toggle sits on the right)
		expect(
			name.compareDocumentPosition(tog) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("does not render a 'Basics' heading", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const headings = [...el.shadowRoot!.querySelectorAll("h3")].map((h) =>
			h.textContent?.trim(),
		);
		expect(headings).not.toContain("Basics");
	});

	it("starts with Save disabled (no name, no sources)", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		expect((saveBtn(el) as HTMLButtonElement).disabled).toBe(true);
	});

	it("never renders a Delete button (deletion lives in the list kebab)", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING;
		await el.updateComplete;
		const del = [...el.shadowRoot!.querySelectorAll("epp-button")].find(
			(b) => b.textContent?.trim() === "Delete",
		);
		expect(del).toBeUndefined();
	});

	it("populates the draft from existingGroup via willUpdate", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING;
		await el.updateComplete;
		expect(nameField(el).value).toBe("Bedroom");
		expect(toggle(el, "AA").checked).toBe(true);
		expect(toggle(el, "BB").checked).toBe(false);
	});

	it("enables Save once a name and a source are chosen", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		setName(el, "Office");
		setToggle(el, "AA", true);
		await el.updateComplete;
		expect((saveBtn(el) as HTMLButtonElement).disabled).toBe(false);
	});

	it("keeps Save disabled when editing until a change is made", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING; // already valid (name + source)
		await el.updateComplete;
		// valid but pristine -> Save stays disabled
		expect((saveBtn(el) as HTMLButtonElement).disabled).toBe(true);
		setName(el, "Bedroom 2");
		await el.updateComplete;
		expect((saveBtn(el) as HTMLButtonElement).disabled).toBe(false);
	});

	it("re-disables Save when an edit is reverted to the original", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING;
		await el.updateComplete;
		setName(el, "Changed");
		await el.updateComplete;
		expect((saveBtn(el) as HTMLButtonElement).disabled).toBe(false);
		setName(el, "Bedroom"); // back to the pristine value
		await el.updateComplete;
		expect((saveBtn(el) as HTMLButtonElement).disabled).toBe(true);
	});

	it("emits dirty-changed true then false as the form is changed and reverted", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		const seen: boolean[] = [];
		el.addEventListener("dirty-changed", (e) =>
			seen.push((e as CustomEvent).detail.dirty),
		);
		el.existingGroup = EXISTING; // load -> pristine, no emit
		await el.updateComplete;
		setName(el, "X");
		await el.updateComplete;
		setName(el, "Bedroom");
		await el.updateComplete;
		expect(seen).toEqual([true, false]);
	});

	it("flags a missing source device with a warning + a removable row", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES; // AA, BB — note: 28:DEAD is gone
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING_WITH_MISSING;
		await el.updateComplete;
		// a warning note is shown
		expect(
			el.shadowRoot!.querySelector('[data-testid="missing-warning"]'),
		).not.toBeNull();
		// the missing device is listed as its own row (with a toggle to drop it)
		const row = el.shadowRoot!.querySelector('[data-testid="missing-source"]');
		expect(row).not.toBeNull();
		expect(row!.textContent).toContain("28:DEAD");
		expect(toggle(el, "28:DEAD")).not.toBeNull();
	});

	it("toggling off a missing source drops it from the save payload", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING_WITH_MISSING;
		await el.updateComplete;
		setToggle(el, "28:DEAD", false);
		await el.updateComplete;
		const detail = new Promise<Record<string, unknown>>((resolve) => {
			el.addEventListener("save", (e) => resolve((e as CustomEvent).detail), {
				once: true,
			});
		});
		saveBtn(el).click();
		expect((await detail).sources).toEqual(["AA"]);
	});

	it("removing a source prunes its merged-zone members and drops empty merged zones", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES; // AA, BB
		el.sourcesByMac = { AA: SOURCE_AA, BB: SOURCE_BB };
		el.existingGroup = {
			id: "g3",
			name: "Mixed",
			area_id: null,
			sources: [SOURCE_AA, SOURCE_BB],
			zone_groups: [
				{
					id: "zgX",
					name: "Span",
					members: [
						{ mac: "AA", zone_index: 2 },
						{ mac: "BB", zone_index: 3 },
					],
				},
				{ id: "zgY", name: "Solo", members: [{ mac: "BB", zone_index: 3 }] },
			],
			exposed_entities: { presence: [], zones: [] },
		};
		await el.updateComplete;
		setToggle(el, "BB", false); // remove BB
		await el.updateComplete;
		const detail = new Promise<Record<string, unknown>>((resolve) => {
			el.addEventListener("save", (e) => resolve((e as CustomEvent).detail), {
				once: true,
			});
		});
		saveBtn(el).click();
		const payload = await detail;
		expect(payload.sources).toEqual(["AA"]);
		// zgX keeps only AA's member; zgY (BB-only) is dropped entirely
		expect(payload.zone_groups).toEqual([
			{ id: "zgX", name: "Span", members: [{ mac: "AA", zone_index: 2 }] },
		]);
	});

	it("does not show a missing-source warning when every source is present", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING; // only SOURCE_AA, which is available
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector('[data-testid="missing-warning"]'),
		).toBeNull();
		expect(
			el.shadowRoot!.querySelector('[data-testid="missing-source"]'),
		).toBeNull();
	});

	it("renders Cancel to the left of Save", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const labels = [...el.shadowRoot!.querySelectorAll("epp-button")].map((b) =>
			b.textContent?.trim(),
		);
		expect(labels.indexOf("Cancel")).toBeLessThan(labels.indexOf("Save"));
	});

	it("toggling a source off removes it from the draft", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING;
		await el.updateComplete;
		setToggle(el, "AA", false);
		await el.updateComplete;
		// only source removed -> Save disabled
		expect((saveBtn(el) as HTMLButtonElement).disabled).toBe(true);
	});

	it("emits save with the trimmed payload", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		setName(el, "  Office  ");
		setToggle(el, "AA", true);
		await el.updateComplete;

		const detail = new Promise<Record<string, unknown>>((resolve) => {
			el.addEventListener("save", (e) => resolve((e as CustomEvent).detail), {
				once: true,
			});
		});
		saveBtn(el).click();
		expect(await detail).toEqual({
			id: null,
			name: "Office",
			sources: ["AA"],
			area_id: null,
			zone_groups: [],
		});
	});

	it("emits cancel", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const detail = new Promise<void>((resolve) => {
			el.addEventListener("cancel", () => resolve(), { once: true });
		});
		const cancel = actionBtn(el, "Cancel");
		cancel.click();
		await expect(detail).resolves.toBeUndefined();
	});

	it("renders selected sources' zones in the merge list", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING;
		await el.updateComplete;
		const mergeList = el.shadowRoot!.querySelector("epp-zone-merge-list") as {
			sources: DeviceGroupSource[];
		};
		expect(mergeList.sources).toEqual([SOURCE_AA]);
	});

	it("surfaces a device's zones as soon as it is toggled on (no save needed)", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		// Candidate sources for ALL devices are supplied up front by the view.
		el.sourcesByMac = { AA: SOURCE_AA, BB: SOURCE_BB };
		await el.updateComplete;
		const mergeList = el.shadowRoot!.querySelector("epp-zone-merge-list") as {
			sources: DeviceGroupSource[];
		};
		expect(mergeList.sources).toEqual([]);

		setToggle(el, "BB", true);
		await el.updateComplete;
		expect(mergeList.sources).toEqual([SOURCE_BB]);
	});

	it("updates the draft area_id from the area picker", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const picker = el.shadowRoot!.querySelector(
			"ha-area-picker",
		) as HTMLElement;
		picker.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "kitchen" },
				bubbles: true,
				composed: true,
			}),
		);
		setName(el, "K");
		setToggle(el, "AA", true);
		await el.updateComplete;
		const detail = new Promise<Record<string, unknown>>((resolve) => {
			el.addEventListener("save", (e) => resolve((e as CustomEvent).detail), {
				once: true,
			});
		});
		saveBtn(el).click();
		expect((await detail).area_id).toBe("kitchen");
	});

	it("updates draft zone_groups when the merge list changes", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING;
		await el.updateComplete;
		const mergeList = el.shadowRoot!.querySelector(
			"epp-zone-merge-list",
		) as HTMLElement;
		mergeList.dispatchEvent(
			new CustomEvent("zone-groups-changed", {
				detail: { zone_groups: [{ id: "zg9", name: "New", members: [] }] },
				bubbles: true,
				composed: true,
			}),
		);
		const detail = new Promise<Record<string, unknown>>((resolve) => {
			el.addEventListener("save", (e) => resolve((e as CustomEvent).detail), {
				once: true,
			});
		});
		saveBtn(el).click();
		expect((await detail).zone_groups).toEqual([
			{ id: "zg9", name: "New", members: [] },
		]);
	});

	it("clears area_id when the area picker is emptied", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING; // starts with area_id "bedroom"
		await el.updateComplete;
		(
			el.shadowRoot!.querySelector("ha-area-picker") as HTMLElement
		).dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "" },
				bubbles: true,
				composed: true,
			}),
		);
		const detail = new Promise<Record<string, unknown>>((resolve) => {
			el.addEventListener("save", (e) => resolve((e as CustomEvent).detail), {
				once: true,
			});
		});
		saveBtn(el).click();
		expect((await detail).area_id).toBeNull();
	});

	it("previews the presence sensors that will be created", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = {
			AA: { ...SOURCE_AA, enabled_presence: ["occupancy", "mmwave_presence"] },
		};
		await el.updateComplete;
		// nothing selected yet -> no preview
		expect(
			el.shadowRoot!.querySelector('[data-testid="sensors-preview"]'),
		).toBeNull();

		setToggle(el, "AA", true);
		await el.updateComplete;
		const chips = [
			...el.shadowRoot!.querySelectorAll('[data-testid="sensor-chip"]'),
		].map((c) => c.textContent!.trim());
		// Occupancy first, then the remaining presence sensors, then zones
		expect(chips).toEqual(["Occupancy", "mmWave presence", "Desk"]);
	});

	// Keep last: registering HA elements is global for the test environment, so
	// this exercises the ha-input/ha-switch branches inside the primitives while
	// every test above covers the ha-textfield/checkbox fallbacks. The editor
	// now delegates to epp-field / epp-toggle, which render the HA-native widget
	// in their own shadow root when it is registered.
	it("uses HA-native ha-input and ha-switch (via the primitives) when registered", async () => {
		if (!customElements.get("ha-input")) {
			customElements.define("ha-input", class extends HTMLElement {});
		}
		if (!customElements.get("ha-switch")) {
			customElements.define("ha-switch", class extends HTMLElement {});
		}
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		// The editor composes the primitives...
		const field = el.shadowRoot!.querySelector(
			'epp-field[data-testid="name-field"]',
		) as HTMLElement;
		const toggles = [
			...el.shadowRoot!.querySelectorAll(
				'epp-toggle[data-testid="device-toggle"]',
			),
		] as HTMLElement[];
		expect(field).not.toBeNull();
		expect(toggles.length).toBe(2);
		// ...and the primitives use the HA-native widgets when registered.
		await (field as HTMLElement & { updateComplete: Promise<unknown> })
			.updateComplete;
		expect(field.shadowRoot!.querySelector("ha-input")).not.toBeNull();
		for (const t of toggles) {
			await (t as HTMLElement & { updateComplete: Promise<unknown> })
				.updateComplete;
			expect(t.shadowRoot!.querySelector("ha-switch")).not.toBeNull();
		}
	});
});

describe("desktop scroll + pinned actions", () => {
	it("bounds the editor at all widths so the form scrolls + Cancel/Save pins", () => {
		// The form scrolls inside .editor-scroll while the Cancel/Save .actions bar
		// pins to the bottom — fed by the device-groups view's bounded .content.
		// Moved from a mobile-only @media to the base so it applies on desktop too.
		const Ctor = customElements.get("epp-device-group-editor") as any;
		const cssText = (Ctor.styles as { cssText?: string }[])
			.map((s) => s.cssText ?? String(s))
			.join("\n");
		const scroll = cssText.slice(
			cssText.indexOf(".editor-scroll {"),
			cssText.indexOf("}", cssText.indexOf(".editor-scroll {")),
		);
		expect(scroll).toMatch(/overflow-y:\s*auto/);
		expect(scroll).toMatch(/flex:\s*1/);
		const actions = cssText.slice(
			cssText.indexOf(".actions {"),
			cssText.indexOf("}", cssText.indexOf(".actions {")),
		);
		expect(actions).toMatch(/flex-shrink:\s*0/);
		// Consistent with the editor sidebar / settings bars: a top divider line.
		expect(actions).toMatch(/border-top:\s*1px solid/);
		expect(cssText).not.toContain("@media (max-width: 819px)");
	});
});
