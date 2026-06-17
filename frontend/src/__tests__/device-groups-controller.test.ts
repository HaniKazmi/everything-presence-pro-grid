import { describe, expect, it, vi } from "vitest";
import { DeviceGroupsController } from "../controllers/device-groups-controller.js";

interface FakeConnection {
	sendMessagePromise: ReturnType<typeof vi.fn>;
	subscribeMessage: ReturnType<typeof vi.fn>;
}

function makeConnection(): FakeConnection {
	return {
		sendMessagePromise: vi.fn().mockResolvedValue(undefined),
		subscribeMessage: vi.fn().mockImplementation(async (cb, _msg) => {
			cb({ device_groups: [] });
			return () => {};
		}),
	};
}

describe("DeviceGroupsController", () => {
	it("subscribes on subscribe()", async () => {
		const conn = makeConnection();
		const ctrl = new DeviceGroupsController(conn as unknown as never);
		const changes: unknown[] = [];
		ctrl.onChange((g) => changes.push(g));

		await ctrl.subscribe();
		expect(changes.length).toBe(1);
		expect(changes[0]).toEqual([]);
	});

	it("captures candidate_sources from the subscription event", async () => {
		const conn = makeConnection();
		const candidate = {
			mac: "AA:BB:CC:DD:EE:FF",
			name: "Spare",
			available: true,
			enabled_presence: [],
			zones: [{ index: 1, name: "Hall", enabled: true }],
		};
		conn.subscribeMessage.mockImplementationOnce(async (cb, _msg) => {
			cb({ device_groups: [], candidate_sources: [candidate] });
			return () => {};
		});
		const ctrl = new DeviceGroupsController(conn as unknown as never);
		expect(ctrl.candidateSources).toEqual([]);
		await ctrl.subscribe();
		expect(ctrl.candidateSources).toEqual([candidate]);
	});

	it("defaults candidate_sources to [] when the event omits it", async () => {
		const conn = makeConnection();
		const ctrl = new DeviceGroupsController(conn as unknown as never);
		await ctrl.subscribe();
		expect(ctrl.candidateSources).toEqual([]);
	});

	it("exposes the cached groups via the groups getter", async () => {
		const conn = makeConnection();
		const group = {
			id: "g1",
			name: "X",
			sources: [],
			zone_groups: [],
			area_id: null,
			exposed_entities: { presence: [], zones: [] },
		};
		conn.subscribeMessage.mockImplementationOnce(async (cb, _msg) => {
			cb({ device_groups: [group] });
			return () => {};
		});
		const ctrl = new DeviceGroupsController(conn as unknown as never);
		expect(ctrl.groups).toEqual([]);
		await ctrl.subscribe();
		expect(ctrl.groups).toEqual([group]);
	});

	it("subscribe() is idempotent — only subscribes once", async () => {
		const conn = makeConnection();
		const ctrl = new DeviceGroupsController(conn as unknown as never);
		await ctrl.subscribe();
		await ctrl.subscribe();
		expect(conn.subscribeMessage).toHaveBeenCalledTimes(1);
	});

	it("onChange returns an unsubscribe that stops further callbacks", async () => {
		const conn = makeConnection();
		const ctrl = new DeviceGroupsController(conn as unknown as never);
		const seen: unknown[] = [];
		const off = ctrl.onChange((g) => seen.push(g));
		off();
		await ctrl.subscribe();
		expect(seen).toEqual([]);
	});

	it("unsubscribe() releases the subscription and allows re-subscribing", async () => {
		const unsub = vi.fn();
		const conn = makeConnection();
		conn.subscribeMessage.mockImplementation(async (cb, _msg) => {
			cb({ device_groups: [] });
			return unsub;
		});
		const ctrl = new DeviceGroupsController(conn as unknown as never);
		await ctrl.subscribe();
		ctrl.unsubscribe();
		expect(unsub).toHaveBeenCalledTimes(1);
		await ctrl.subscribe();
		expect(conn.subscribeMessage).toHaveBeenCalledTimes(2);
	});

	it("create() sends the full payload including exclusions", async () => {
		const conn = makeConnection();
		conn.sendMessagePromise.mockResolvedValueOnce({
			device_group: {
				id: "abc",
				name: "X",
				sources: [],
				zone_groups: [],
				area_id: "living_room",
				exposed_entities: { presence: [], zones: [] },
				excluded_presence: [],
				excluded_zones: [],
				excluded_zone_groups: [],
			},
		});
		const ctrl = new DeviceGroupsController(conn as unknown as never);
		const result = await ctrl.create({
			name: "X",
			sources: ["AA:BB:CC:DD:EE:FF"],
			area_id: "living_room",
			zone_groups: [
				{ id: "g1", name: "Bed", members: [{ mac: "AA:BB:CC:DD:EE:FF", zone_index: 2 }] },
			],
			excluded_presence: ["mmwave_presence"],
			excluded_zones: [{ mac: "AA:BB:CC:DD:EE:FF", zone_index: 3 }],
			excluded_zone_groups: ["rest_of_room"],
		});
		expect(result.id).toBe("abc");
		expect(conn.sendMessagePromise).toHaveBeenCalledWith({
			type: "eppgrid/create_device_group",
			name: "X",
			sources: ["AA:BB:CC:DD:EE:FF"],
			area_id: "living_room",
			zone_groups: [
				{ id: "g1", name: "Bed", members: [{ mac: "AA:BB:CC:DD:EE:FF", zone_index: 2 }] },
			],
			excluded_presence: ["mmwave_presence"],
			excluded_zones: [{ mac: "AA:BB:CC:DD:EE:FF", zone_index: 3 }],
			excluded_zone_groups: ["rest_of_room"],
		});
	});

	it("create() sends area_id:null with empty zone_groups/exclusions", async () => {
		const conn = makeConnection();
		conn.sendMessagePromise.mockResolvedValueOnce({
			device_group: {
				id: "abc",
				name: "X",
				sources: [],
				zone_groups: [],
				area_id: null,
				exposed_entities: { presence: [], zones: [] },
				excluded_presence: [],
				excluded_zones: [],
				excluded_zone_groups: [],
			},
		});
		const ctrl = new DeviceGroupsController(conn as unknown as never);
		await ctrl.create({
			name: "X",
			sources: ["AA:BB:CC:DD:EE:FF"],
			area_id: null,
			zone_groups: [],
			excluded_presence: [],
			excluded_zones: [],
			excluded_zone_groups: [],
		});
		expect(conn.sendMessagePromise).toHaveBeenCalledWith({
			type: "eppgrid/create_device_group",
			name: "X",
			sources: ["AA:BB:CC:DD:EE:FF"],
			area_id: null,
			zone_groups: [],
			excluded_presence: [],
			excluded_zones: [],
			excluded_zone_groups: [],
		});
	});

	it("update() sends full payload with group_id (NOT id) including exclusions", async () => {
		const conn = makeConnection();
		conn.sendMessagePromise.mockResolvedValueOnce({
			device_group: {
				id: "abc",
				name: "Y",
				sources: [],
				zone_groups: [],
				area_id: null,
				exposed_entities: { presence: [], zones: [] },
				excluded_presence: [],
				excluded_zones: [],
				excluded_zone_groups: [],
			},
		});
		const ctrl = new DeviceGroupsController(conn as unknown as never);
		await ctrl.update({
			id: "abc",
			name: "Y",
			sources: ["AA:BB:CC:DD:EE:FF"],
			area_id: null,
			zone_groups: [],
			excluded_presence: ["occupancy"],
			excluded_zones: [{ mac: "AA:BB:CC:DD:EE:FF", zone_index: 4 }],
			excluded_zone_groups: ["rest_of_room"],
		});
		expect(conn.sendMessagePromise).toHaveBeenCalledWith({
			type: "eppgrid/update_device_group",
			group_id: "abc",
			name: "Y",
			sources: ["AA:BB:CC:DD:EE:FF"],
			area_id: null,
			zone_groups: [],
			excluded_presence: ["occupancy"],
			excluded_zones: [{ mac: "AA:BB:CC:DD:EE:FF", zone_index: 4 }],
			excluded_zone_groups: ["rest_of_room"],
		});
	});

	it("delete() sends group_id (NOT id)", async () => {
		const conn = makeConnection();
		const ctrl = new DeviceGroupsController(conn as unknown as never);
		await ctrl.delete("abc");
		expect(conn.sendMessagePromise).toHaveBeenCalledWith({
			type: "eppgrid/delete_device_group",
			group_id: "abc",
		});
	});
});
