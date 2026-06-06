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

	it("starts with Save disabled (no name, no sources)", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const save = [...el.shadowRoot!.querySelectorAll("button")].find(
			(b) => b.textContent?.trim() === "Save",
		) as HTMLButtonElement;
		expect(save.disabled).toBe(true);
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
		const name = el.shadowRoot!.querySelector(
			'input[type="text"]',
		) as HTMLInputElement;
		expect(name.value).toBe("Bedroom");
		const checked = el.shadowRoot!.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;
		expect(checked.checked).toBe(true);
		// id present -> Delete button rendered
		const del = [...el.shadowRoot!.querySelectorAll("button")].find(
			(b) => b.textContent?.trim() === "Delete",
		);
		expect(del).toBeDefined();
	});

	it("enables Save once a name and a source are chosen", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const name = el.shadowRoot!.querySelector(
			'input[type="text"]',
		) as HTMLInputElement;
		name.value = "Office";
		name.dispatchEvent(new Event("input"));
		const box = el.shadowRoot!.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;
		box.checked = true;
		box.dispatchEvent(new Event("change"));
		await el.updateComplete;
		const save = [...el.shadowRoot!.querySelectorAll("button")].find(
			(b) => b.textContent?.trim() === "Save",
		) as HTMLButtonElement;
		expect(save.disabled).toBe(false);
	});

	it("unchecking a source removes it from the draft", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING;
		await el.updateComplete;
		const box = el.shadowRoot!.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;
		box.checked = false;
		box.dispatchEvent(new Event("change"));
		await el.updateComplete;
		// only source removed -> Save disabled
		const save = [...el.shadowRoot!.querySelectorAll("button")].find(
			(b) => b.textContent?.trim() === "Save",
		) as HTMLButtonElement;
		expect(save.disabled).toBe(true);
	});

	it("emits save with the trimmed payload", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const name = el.shadowRoot!.querySelector(
			'input[type="text"]',
		) as HTMLInputElement;
		name.value = "  Office  ";
		name.dispatchEvent(new Event("input"));
		const box = el.shadowRoot!.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;
		box.checked = true;
		box.dispatchEvent(new Event("change"));
		await el.updateComplete;

		const detail = new Promise<Record<string, unknown>>((resolve) => {
			el.addEventListener("save", (e) => resolve((e as CustomEvent).detail), {
				once: true,
			});
		});
		const save = [...el.shadowRoot!.querySelectorAll("button")].find(
			(b) => b.textContent?.trim() === "Save",
		) as HTMLButtonElement;
		save.click();
		const payload = await detail;
		expect(payload).toEqual({
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
		// fill name + source so save is enabled, then verify area flows through
		const name = el.shadowRoot!.querySelector(
			'input[type="text"]',
		) as HTMLInputElement;
		name.value = "K";
		name.dispatchEvent(new Event("input"));
		const box = el.shadowRoot!.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;
		box.checked = true;
		box.dispatchEvent(new Event("change"));
		await el.updateComplete;
		const detail = new Promise<Record<string, unknown>>((resolve) => {
			el.addEventListener("save", (e) => resolve((e as CustomEvent).detail), {
				once: true,
			});
		});
		(
			[...el.shadowRoot!.querySelectorAll("button")].find(
				(b) => b.textContent?.trim() === "Save",
			) as HTMLButtonElement
		).click();
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
		(
			[...el.shadowRoot!.querySelectorAll("button")].find(
				(b) => b.textContent?.trim() === "Save",
			) as HTMLButtonElement
		).click();
		expect((await detail).zone_groups).toEqual([
			{ id: "zg9", name: "New", members: [] },
		]);
	});
});
