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
		emit(groups: DeviceGroup[]) {
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

	it("shows the empty state when there are no groups", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		expect(el.shadowRoot!.textContent).toContain("No device groups yet.");
	});

	it("renders a row per group with source/entity counts", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]);
		await el.updateComplete;
		const row = el.shadowRoot!.querySelector(".group-row");
		expect(row).not.toBeNull();
		expect(el.shadowRoot!.querySelector(".group-name")!.textContent).toBe(
			"Bedroom",
		);
		// 1 source (singular), 1 presence + 1 zone = 2 entities
		expect(el.shadowRoot!.querySelector(".meta")!.textContent).toContain(
			"1 source",
		);
		expect(el.shadowRoot!.querySelector(".meta")!.textContent).toContain("2");
	});

	it("pluralises the source count", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([
			makeGroup({
				sources: [
					{
						mac: "AA",
						name: "L",
						available: true,
						enabled_presence: [],
						zones: [],
					},
					{
						mac: "BB",
						name: "R",
						available: true,
						enabled_presence: [],
						zones: [],
					},
				],
			}),
		]);
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".meta")!.textContent).toContain(
			"2 sources",
		);
	});

	it("opens a blank editor from the Add button", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		(el.shadowRoot!.querySelector(".add-btn") as HTMLButtonElement).click();
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector("epp-device-group-editor") as {
			existingGroup: DeviceGroup | null;
		} | null;
		expect(editor).not.toBeNull();
		expect(editor!.existingGroup).toBeNull();
	});

	it("opens the editor for an existing group when its row is clicked", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]);
		await el.updateComplete;
		(el.shadowRoot!.querySelector(".group-row") as HTMLElement).click();
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector("epp-device-group-editor") as {
			existingGroup: DeviceGroup | null;
		};
		expect(editor.existingGroup?.id).toBe("g1");
	});

	it("create path calls controller.create and returns to the list", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		(el.shadowRoot!.querySelector(".add-btn") as HTMLButtonElement).click();
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
		(el.shadowRoot!.querySelector(".group-row") as HTMLElement).click();
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
		(el.shadowRoot!.querySelector(".add-btn") as HTMLButtonElement).click();
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
		(el.shadowRoot!.querySelector(".add-btn") as HTMLButtonElement).click();
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

	it("delete path calls controller.delete after confirmation", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]);
		await el.updateComplete;
		(el.shadowRoot!.querySelector(".group-row") as HTMLElement).click();
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector(
			"epp-device-group-editor",
		) as HTMLElement;
		editor.dispatchEvent(
			new CustomEvent("delete", {
				detail: { id: "g1" },
				bubbles: true,
				composed: true,
			}),
		);
		await Promise.resolve();
		expect(ctrl.delete).toHaveBeenCalledWith("g1");
	});

	it("delete is a no-op when the user cancels the confirm", async () => {
		confirmSpy.mockReturnValue(false);
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]);
		await el.updateComplete;
		(el.shadowRoot!.querySelector(".group-row") as HTMLElement).click();
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector(
			"epp-device-group-editor",
		) as HTMLElement;
		editor.dispatchEvent(
			new CustomEvent("delete", {
				detail: { id: "g1" },
				bubbles: true,
				composed: true,
			}),
		);
		await Promise.resolve();
		expect(ctrl.delete).not.toHaveBeenCalled();
	});

	it("logs a delete failure without throwing", async () => {
		const ctrl = makeController();
		ctrl.delete.mockRejectedValueOnce(new Error("nope"));
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]);
		await el.updateComplete;
		(el.shadowRoot!.querySelector(".group-row") as HTMLElement).click();
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector(
			"epp-device-group-editor",
		) as HTMLElement;
		editor.dispatchEvent(
			new CustomEvent("delete", {
				detail: { id: "g1" },
				bubbles: true,
				composed: true,
			}),
		);
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
		(el.shadowRoot!.querySelector(".group-row") as HTMLElement).click();
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector("epp-device-group-editor") as {
			sourcesByMac: Record<string, unknown>;
		};
		expect(Object.keys(editor.sourcesByMac).sort()).toEqual(["AA", "ZZ"]);
	});
});
