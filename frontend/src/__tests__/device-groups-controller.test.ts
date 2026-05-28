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
