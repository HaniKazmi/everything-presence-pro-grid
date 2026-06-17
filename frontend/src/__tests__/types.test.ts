import { describe, expect, it } from "vitest";
import {
	type DeviceGroup,
	REST_OF_ROOM_ID,
	REST_OF_ROOM_NAME,
} from "../types.js";

describe("device-group reserved constants", () => {
	it("uses the shared reserved id/name (must match the Python contract)", () => {
		expect(REST_OF_ROOM_ID).toBe("rest_of_room");
		expect(REST_OF_ROOM_NAME).toBe("Zone Rest of Room");
	});

	it("DeviceGroup carries the three exclusion fields", () => {
		// Compile-time shape guard: this object is only valid if the fields exist.
		const group: DeviceGroup = {
			id: "g1",
			name: "X",
			area_id: null,
			sources: [],
			zone_groups: [],
			exposed_entities: { presence: [], zones: [] },
			excluded_presence: ["occupancy"],
			excluded_zones: [{ mac: "AA", zone_index: 2 }],
			excluded_zone_groups: [REST_OF_ROOM_ID],
		};
		expect(group.excluded_presence).toEqual(["occupancy"]);
		expect(group.excluded_zones).toEqual([{ mac: "AA", zone_index: 2 }]);
		expect(group.excluded_zone_groups).toEqual(["rest_of_room"]);
	});
});
