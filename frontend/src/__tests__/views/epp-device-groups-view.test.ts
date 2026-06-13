import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../views/epp-device-groups-view.js";
import type { DeviceGroup, DeviceGroupSource } from "../../types.js";
import type { EppDeviceGroupsView } from "../../views/epp-device-groups-view.js";

function makeGroup(over: Partial<DeviceGroup> = {}): DeviceGroup {
	return {
		id: "g1",
		name: "Bedroom",
		area_id: null,
		sources: [
			{
				mac: "AA",
				name: "Left",
				available: true,
				enabled_presence: [],
				zones: [],
			},
		],
		zone_groups: [],
		exposed_entities: {
			presence: ["occupancy"],
			zones: [{ kind: "group", id: "z1", name: "Bed", available: true }],
		},
		...over,
	};
}

interface FakeController {
	onChange: ReturnType<typeof vi.fn>;
	subscribe: ReturnType<typeof vi.fn>;
	create: ReturnType<typeof vi.fn>;
	update: ReturnType<typeof vi.fn>;
	delete: ReturnType<typeof vi.fn>;
	candidateSources: DeviceGroupSource[];
	groups: DeviceGroup[];
	emit(groups: DeviceGroup[]): void;
}

function makeController(): FakeController {
	let cb: ((g: DeviceGroup[]) => void) | null = null;
	const unsub = vi.fn();
	return {
		onChange: vi.fn((c: (g: DeviceGroup[]) => void) => {
			cb = c;
			return unsub;
		}),
		subscribe: vi.fn().mockResolvedValue(undefined),
		create: vi.fn().mockResolvedValue(undefined),
		update: vi.fn().mockResolvedValue(undefined),
		delete: vi.fn().mockResolvedValue(undefined),
		candidateSources: [],
		groups: [],
		emit(groups: DeviceGroup[]) {
			this.groups = groups;
			cb?.(groups);
		},
	};
}

async function fixture(ctrl: FakeController): Promise<EppDeviceGroupsView> {
	const el = document.createElement(
		"epp-device-groups-view",
	) as EppDeviceGroupsView;
	el.hass = {};
	el.controller = ctrl as never;
	el.availableDevices = [];
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

function createBtn(el: EppDeviceGroupsView): HTMLElement {
	return el.shadowRoot!.querySelector(
		'[data-testid="create-group"]',
	) as HTMLElement;
}
function groupCards(el: EppDeviceGroupsView): HTMLElement[] {
	return [...el.shadowRoot!.querySelectorAll(".group-card")] as HTMLElement[];
}
// The view wires the kebab via its `item-select` event, so drive it directly.
function kebabSelect(el: EppDeviceGroupsView, id: string, idx = 0): void {
	const menus = [...el.shadowRoot!.querySelectorAll("epp-kebab-menu")];
	menus[idx].dispatchEvent(
		new CustomEvent("item-select", {
			detail: { id },
			bubbles: true,
			composed: true,
		}),
	);
}

describe("epp-device-groups-view", () => {
	let confirmSpy: ReturnType<typeof vi.fn>;
	let alertSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		confirmSpy = vi.fn().mockReturnValue(true);
		alertSpy = vi.fn();
		vi.stubGlobal("confirm", confirmSpy);
		vi.stubGlobal("alert", alertSpy);
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("subscribes on connect and unsubscribes on disconnect", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		expect(ctrl.onChange).toHaveBeenCalledTimes(1);
		expect(ctrl.subscribe).toHaveBeenCalledTimes(1);
		const unsub = ctrl.onChange.mock.results[0].value;
		el.remove();
		expect(unsub).toHaveBeenCalledTimes(1);
	});

	it("frames the list in an ha-card headed 'Device Groups'", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		const card = el.shadowRoot!.querySelector("ha-card");
		expect(card).not.toBeNull();
		expect(card!.textContent).toContain("Device Groups");
	});

	it("shows the empty state when there are no groups", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		expect(el.shadowRoot!.textContent).toContain("No device groups yet.");
	});

	it("seeds the list from the controller cache on connect (survives tab switches)", async () => {
		const ctrl = makeController();
		// Controller already has cached groups (it's panel-owned and stays
		// subscribed across tab switches) — the freshly-mounted view must show
		// them without waiting for a new event.
		ctrl.groups = [makeGroup()];
		const el = await fixture(ctrl);
		expect(el.shadowRoot!.querySelector(".group-card")).not.toBeNull();
		expect(el.shadowRoot!.querySelector(".group-name")!.textContent).toBe(
			"Bedroom",
		);
	});

	it("wraps both the list and the editor in a centred .content container", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		// list view
		expect(
			el.shadowRoot!.querySelector('.content [data-testid="create-group"]'),
		).not.toBeNull();
		// editor view
		createBtn(el).click();
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector(".content epp-device-group-editor"),
		).not.toBeNull();
	});

	function sensorChips(el: EppDeviceGroupsView): string[] {
		return [
			...el.shadowRoot!.querySelectorAll('[data-testid="sensor-chip"]'),
		].map((c) => c.textContent!.trim());
	}

	it("renders a card per group: device names + sensor lozenges (no labels)", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]);
		await el.updateComplete;
		expect(groupCards(el).length).toBe(1);
		expect(el.shadowRoot!.querySelector(".group-name")!.textContent).toBe(
			"Bedroom",
		);
		// device name shown, not the mac, and no "Devices:" label
		const devices = el.shadowRoot!.querySelector(".group-devices")!.textContent;
		expect(devices).toContain("Left");
		expect(devices).not.toContain("Devices:");
		// sensors rendered as lozenges (chips), with no "Sensors:" label
		expect(
			el.shadowRoot!.querySelector(".group-sensors")!.textContent,
		).not.toContain("Sensors:");
		expect(sensorChips(el)).toEqual(["Bed", "Occupancy"]);
	});

	it("sorts the device names and the sensor lozenges", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([
			makeGroup({
				sources: [
					{
						mac: "AA",
						name: "Zeta",
						available: true,
						enabled_presence: [],
						zones: [],
					},
					{
						mac: "BB",
						name: "Alpha",
						available: true,
						enabled_presence: [],
						zones: [],
					},
				],
				exposed_entities: {
					presence: ["occupancy"],
					zones: [
						{ kind: "group", id: "z1", name: "Window", available: true },
						{ kind: "group", id: "z2", name: "Bed", available: true },
					],
				},
			}),
		]);
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector(".group-devices")!.textContent,
		).toContain("Alpha, Zeta");
		expect(sensorChips(el)).toEqual(["Bed", "Occupancy", "Window"]);
	});

	it("renders Edit + a divider + a danger Delete (with icons) in the kebab", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]);
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

	it("renders only the name when a group has no devices or sensors", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([
			makeGroup({
				sources: [],
				exposed_entities: { presence: [], zones: [] },
			}),
		]);
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".group-name")!.textContent).toBe(
			"Bedroom",
		);
		expect(el.shadowRoot!.querySelector(".group-devices")).toBeNull();
		expect(el.shadowRoot!.querySelector(".group-sensors")).toBeNull();
	});

	it("opens a blank editor from the Create button", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		createBtn(el).click();
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector("epp-device-group-editor") as {
			existingGroup: DeviceGroup | null;
		} | null;
		expect(editor).not.toBeNull();
		expect(editor!.existingGroup).toBeNull();
	});

	it("opens the editor for an existing group from the kebab Edit item", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]);
		await el.updateComplete;
		kebabSelect(el, "edit");
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector("epp-device-group-editor") as {
			existingGroup: DeviceGroup | null;
		};
		expect(editor.existingGroup?.id).toBe("g1");
	});

	it("create path calls controller.create and returns to the list", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		createBtn(el).click();
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector(
			"epp-device-group-editor",
		) as HTMLElement;
		editor.dispatchEvent(
			new CustomEvent("save", {
				detail: { id: null, name: "New", sources: ["AA"], area_id: "a1" },
				bubbles: true,
				composed: true,
			}),
		);
		await el.updateComplete;
		await Promise.resolve();
		expect(ctrl.create).toHaveBeenCalledWith("New", ["AA"], "a1");
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector("epp-device-group-editor")).toBeNull();
	});

	it("update path calls controller.update", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]);
		await el.updateComplete;
		kebabSelect(el, "edit");
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector(
			"epp-device-group-editor",
		) as HTMLElement;
		const payload = {
			id: "g1",
			name: "Renamed",
			sources: ["AA"],
			area_id: null,
			zone_groups: [],
		};
		editor.dispatchEvent(
			new CustomEvent("save", {
				detail: payload,
				bubbles: true,
				composed: true,
			}),
		);
		await Promise.resolve();
		expect(ctrl.update).toHaveBeenCalledWith(payload);
	});

	it("surfaces a save failure with an alert and keeps the editor open", async () => {
		const ctrl = makeController();
		ctrl.create.mockRejectedValueOnce(new Error("boom"));
		const el = await fixture(ctrl);
		createBtn(el).click();
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector(
			"epp-device-group-editor",
		) as HTMLElement;
		editor.dispatchEvent(
			new CustomEvent("save", {
				detail: { id: null, name: "New", sources: ["AA"], area_id: null },
				bubbles: true,
				composed: true,
			}),
		);
		await Promise.resolve();
		await Promise.resolve();
		await el.updateComplete;
		expect(alertSpy).toHaveBeenCalledWith("Save failed: boom");
		expect(
			el.shadowRoot!.querySelector("epp-device-group-editor"),
		).not.toBeNull();
	});

	it("cancel returns to the list", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		createBtn(el).click();
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector(
			"epp-device-group-editor",
		) as HTMLElement;
		editor.dispatchEvent(
			new CustomEvent("cancel", { bubbles: true, composed: true }),
		);
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector("epp-device-group-editor")).toBeNull();
	});

	it("kebab Delete calls controller.delete after confirmation", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]);
		await el.updateComplete;
		kebabSelect(el, "delete");
		await Promise.resolve();
		expect(ctrl.delete).toHaveBeenCalledWith("g1");
	});

	it("kebab Delete is a no-op when the user cancels the confirm", async () => {
		confirmSpy.mockReturnValue(false);
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]);
		await el.updateComplete;
		kebabSelect(el, "delete");
		await Promise.resolve();
		expect(ctrl.delete).not.toHaveBeenCalled();
	});

	it("logs a delete failure without throwing", async () => {
		const ctrl = makeController();
		ctrl.delete.mockRejectedValueOnce(new Error("nope"));
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]);
		await el.updateComplete;
		kebabSelect(el, "delete");
		await Promise.resolve();
		await Promise.resolve();
		expect(ctrl.delete).toHaveBeenCalledWith("g1");
		expect(console.error).toHaveBeenCalled();
	});

	it("passes a sourcesByMac map (group sources + all candidate devices) to the editor", async () => {
		const ctrl = makeController();
		// A device not in any group is still a candidate source, so the editor
		// can show its zones the moment it is toggled.
		const candidate: DeviceGroupSource = {
			mac: "ZZ",
			name: "Spare",
			available: true,
			enabled_presence: [],
			zones: [{ index: 1, name: "Hall", enabled: true }],
		};
		ctrl.candidateSources = [candidate];
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]);
		await el.updateComplete;
		kebabSelect(el, "edit");
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector("epp-device-group-editor") as {
			sourcesByMac: Record<string, unknown>;
		};
		expect(Object.keys(editor.sourcesByMac).sort()).toEqual(["AA", "ZZ"]);
	});
});
