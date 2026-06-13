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

// HA components (ha-input/ha-switch) aren't registered under happy-dom, so the
// editor falls back to ha-textfield / a checkbox; both expose value/checked +
// input/change the same way. We target by data-testid to stay widget-agnostic.
function nameField(
	el: EppDeviceGroupEditor,
): HTMLInputElement & { label: string } {
	return el.shadowRoot!.querySelector(
		'[data-testid="name-field"]',
	) as HTMLInputElement & {
		label: string;
	};
}
function deviceToggles(el: EppDeviceGroupEditor): HTMLInputElement[] {
	return [
		...el.shadowRoot!.querySelectorAll('[data-testid="device-toggle"]'),
	] as HTMLInputElement[];
}
function toggle(el: EppDeviceGroupEditor, mac: string): HTMLInputElement {
	return el.shadowRoot!.querySelector(
		`[data-testid="device-toggle"][data-mac="${mac}"]`,
	) as HTMLInputElement;
}
function saveBtn(el: EppDeviceGroupEditor): HTMLButtonElement {
	return [...el.shadowRoot!.querySelectorAll("button")].find(
		(b) => b.textContent?.trim() === "Save",
	) as HTMLButtonElement;
}
function setName(el: EppDeviceGroupEditor, value: string): void {
	const f = nameField(el);
	f.value = value;
	f.dispatchEvent(new Event("input"));
}
function setToggle(el: EppDeviceGroupEditor, mac: string, on: boolean): void {
	const t = toggle(el, mac);
	t.checked = on;
	t.dispatchEvent(new Event("change"));
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
		expect(saveBtn(el).disabled).toBe(true);
	});

	it("does not render a Delete button when creating a new group", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const del = [...el.shadowRoot!.querySelectorAll("button")].find(
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
		const del = [...el.shadowRoot!.querySelectorAll("button")].find(
			(b) => b.textContent?.trim() === "Delete",
		);
		expect(del).toBeDefined();
	});

	it("enables Save once a name and a source are chosen", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		setName(el, "Office");
		setToggle(el, "AA", true);
		await el.updateComplete;
		expect(saveBtn(el).disabled).toBe(false);
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
		expect(saveBtn(el).disabled).toBe(true);
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
		const cancel = [...el.shadowRoot!.querySelectorAll("button")].find(
			(b) => b.textContent?.trim() === "Cancel",
		) as HTMLButtonElement;
		cancel.click();
		await expect(detail).resolves.toBeUndefined();
	});

	it("emits delete with the group id", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING;
		await el.updateComplete;
		const detail = new Promise<{ id: string }>((resolve) => {
			el.addEventListener("delete", (e) => resolve((e as CustomEvent).detail), {
				once: true,
			});
		});
		const del = [...el.shadowRoot!.querySelectorAll("button")].find(
			(b) => b.textContent?.trim() === "Delete",
		) as HTMLButtonElement;
		del.click();
		expect((await detail).id).toBe("g1");
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

	// Keep last: registering HA elements is global for the test environment, so
	// this exercises the ha-input/ha-switch branches while every test above
	// covers the ha-textfield/checkbox fallbacks.
	it("uses HA-native ha-input and ha-switch when they are registered", async () => {
		if (!customElements.get("ha-input")) {
			customElements.define("ha-input", class extends HTMLElement {});
		}
		if (!customElements.get("ha-switch")) {
			customElements.define("ha-switch", class extends HTMLElement {});
		}
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector("ha-input")).not.toBeNull();
		expect(el.shadowRoot!.querySelectorAll("ha-switch").length).toBe(2);
	});
});
