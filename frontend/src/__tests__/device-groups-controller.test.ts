import { describe, expect, it, vi } from "vitest";
import { DeviceGroupsController } from "../controllers/device-groups-controller.js";

interface FakeConnection {
	sendMessage: ReturnType<typeof vi.fn>;
	subscribeMessage: ReturnType<typeof vi.fn>;
}

function makeConnection(): FakeConnection {
	return {
		sendMessage: vi.fn().mockResolvedValue(undefined),
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

	it("create() includes area_id when an area is provided", async () => {
		const conn = makeConnection();
		conn.sendMessage.mockResolvedValueOnce({
			device_group: {
				id: "abc",
				name: "X",
				sources: [],
				zone_groups: [],
				area_id: "living_room",
				exposed_entities: { presence: [], zones: [] },
			},
		});
		const ctrl = new DeviceGroupsController(conn as unknown as never);
		await ctrl.create("X", ["AA:BB:CC:DD:EE:FF"], "living_room");
		expect(conn.sendMessage).toHaveBeenCalledWith({
			type: "eppgrid/create_device_group",
			name: "X",
			sources: ["AA:BB:CC:DD:EE:FF"],
			area_id: "living_room",
		});
	});

	it("create() sends area_id:null when explicitly cleared", async () => {
		const conn = makeConnection();
		conn.sendMessage.mockResolvedValueOnce({
			device_group: {
				id: "abc",
				name: "X",
				sources: [],
				zone_groups: [],
				area_id: null,
				exposed_entities: { presence: [], zones: [] },
			},
		});
		const ctrl = new DeviceGroupsController(conn as unknown as never);
		await ctrl.create("X", ["AA:BB:CC:DD:EE:FF"], null);
		expect(conn.sendMessage).toHaveBeenCalledWith({
			type: "eppgrid/create_device_group",
			name: "X",
			sources: ["AA:BB:CC:DD:EE:FF"],
			area_id: null,
		});
	});

	it("create() sends correct WS payload", async () => {
		const conn = makeConnection();
		conn.sendMessage.mockResolvedValueOnce({
			device_group: {
				id: "abc",
				name: "X",
				sources: [],
				zone_groups: [],
				area_id: null,
				exposed_entities: { presence: [], zones: [] },
			},
		});
		const ctrl = new DeviceGroupsController(conn as unknown as never);
		const result = await ctrl.create("X", ["AA:BB:CC:DD:EE:FF"]);
		expect(result.id).toBe("abc");
		expect(conn.sendMessage).toHaveBeenCalledWith({
			type: "eppgrid/create_device_group",
			name: "X",
			sources: ["AA:BB:CC:DD:EE:FF"],
		});
	});

	it("update() sends full payload with group_id (NOT id)", async () => {
		const conn = makeConnection();
		conn.sendMessage.mockResolvedValueOnce({
			device_group: {
				id: "abc",
				name: "Y",
				sources: [],
				zone_groups: [],
				area_id: null,
				exposed_entities: { presence: [], zones: [] },
			},
		});
		const ctrl = new DeviceGroupsController(conn as unknown as never);
		await ctrl.update({
			id: "abc",
			name: "Y",
			sources: ["AA:BB:CC:DD:EE:FF"],
			area_id: null,
			zone_groups: [],
		});
		expect(conn.sendMessage).toHaveBeenCalledWith({
			type: "eppgrid/update_device_group",
			group_id: "abc",
			name: "Y",
			sources: ["AA:BB:CC:DD:EE:FF"],
			area_id: null,
			zone_groups: [],
		});
	});

	it("delete() sends group_id (NOT id)", async () => {
		const conn = makeConnection();
		const ctrl = new DeviceGroupsController(conn as unknown as never);
		await ctrl.delete("abc");
		expect(conn.sendMessage).toHaveBeenCalledWith({
			type: "eppgrid/delete_device_group",
			group_id: "abc",
		});
	});
});
