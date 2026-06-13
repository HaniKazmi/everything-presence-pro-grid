/**
 * Shared-fixture parity tests for the projection.
 *
 * `frontend/src/lib/device-groups-projection.ts` (TS) and
 * `custom_components/eppgrid/device_groups/_projection.py` (Python) are
 * hand-maintained mirrors that MUST produce identical output. Both are driven
 * by the SAME fixture:
 *
 *   tests/fixtures/device_groups_projection_parity.json
 *
 *   - TS side:     this file (vitest)
 *   - Python side: tests/device_groups/test_projection_parity.py (pytest)
 *
 * Edit the fixture → run BOTH suites. If only one mirror is updated, its suite
 * fails, turning silent drift loud.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	type DeviceGroupSourceState,
	deriveExposedEntities,
} from "../lib/device-groups-projection.js";
import type {
	DeviceGroupExposedEntities,
	DeviceGroupZoneGroup,
} from "../types.js";

interface ParityScenario {
	name: string;
	sources: DeviceGroupSourceState[];
	zone_groups: DeviceGroupZoneGroup[];
	expected: DeviceGroupExposedEntities;
}

const FIXTURE_PATH = join(
	__dirname,
	"..",
	"..",
	"..",
	"tests",
	"fixtures",
	"device_groups_projection_parity.json",
);

const scenarios = (
	JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as {
		scenarios: ParityScenario[];
	}
).scenarios;

describe("device-groups projection parity (shared fixture drives Python + TS)", () => {
	for (const scenario of scenarios) {
		it(scenario.name, () => {
			const result = deriveExposedEntities(
				scenario.sources,
				scenario.zone_groups,
			);
			expect(result).toEqual(scenario.expected);
		});
	}
});
