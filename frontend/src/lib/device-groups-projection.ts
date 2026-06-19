import {
	type DeviceGroupExposedEntities,
	type DeviceGroupSourceZone,
	type DeviceGroupZoneGroup,
	type ExposedZoneEntity,
	PRESENCE_SLOTS,
	type PresenceSlot,
	REST_OF_ROOM_ID,
	REST_OF_ROOM_NAME,
} from "../types.js";

export type ZoneState = DeviceGroupSourceZone;

export interface DeviceGroupSourceState {
	mac: string;
	name: string;
	available: boolean;
	enabled_presence: string[];
	zones: ZoneState[];
}

/** Opt-out sets the editor passes through to the projection. All optional;
 *  an empty/omitted set means "expose everything" (the storage default). */
export interface ProjectionExclusions {
	presence?: string[];
	zones?: { mac: string; zone_index: number }[];
	zoneGroups?: string[];
}

/**
 * Mirror of the Python derive_exposed_entities. Identical semantics so the
 * panel can preview "what entities will be created" without a round trip.
 *
 * Zones order: [combined Rest of room (if applicable)] + [merged groups] +
 * [passthroughs index >= 1]. Zone index 0 is NEVER a passthrough — it only
 * ever feeds the combined Rest of room.
 */
export function deriveExposedEntities(
	sources: DeviceGroupSourceState[],
	zoneGroups: DeviceGroupZoneGroup[],
	excluded?: ProjectionExclusions,
): DeviceGroupExposedEntities {
	const excludedPresence = new Set(excluded?.presence ?? []);
	const excludedZoneKeys = new Set(
		(excluded?.zones ?? []).map((z) => `${z.mac}|${z.zone_index}`),
	);
	const excludedZoneGroups = new Set(excluded?.zoneGroups ?? []);

	const enabledUnion = new Set<string>();
	for (const src of sources) {
		for (const p of src.enabled_presence) enabledUnion.add(p);
	}
	const presence = PRESENCE_SLOTS.filter(
		(slot) => enabledUnion.has(slot) && !excludedPresence.has(slot),
	) as PresenceSlot[];

	// Combined Rest of room: an implicit zone group over every source's zone 0.
	const restOfRoomOut: ExposedZoneEntity[] = [];
	if (!excludedZoneGroups.has(REST_OF_ROOM_ID)) {
		let hasZoneZero = false;
		let anyZoneZeroEnabled = false;
		for (const src of sources) {
			const z0 = src.zones.find((z) => z.index === 0);
			if (!z0) continue;
			hasZoneZero = true;
			if (z0.enabled) anyZoneZeroEnabled = true;
		}
		if (hasZoneZero) {
			restOfRoomOut.push({
				kind: "group",
				id: REST_OF_ROOM_ID,
				name: REST_OF_ROOM_NAME,
				available: anyZoneZeroEnabled,
			});
		}
	}

	const groupedKeys = new Set<string>();
	for (const g of zoneGroups) {
		for (const m of g.members) groupedKeys.add(`${m.mac}|${m.zone_index}`);
	}

	type PassthroughWithSource = {
		kind: "passthrough";
		mac: string;
		zone_index: number;
		name: string;
		available: boolean;
		_sourceName: string;
	};

	const passthroughs: PassthroughWithSource[] = [];
	for (const src of sources) {
		const sorted = [...src.zones].sort((a, b) => a.index - b.index);
		for (const z of sorted) {
			// Zone 0 only ever feeds the combined Rest of room.
			if (z.index === 0) continue;
			if (!z.enabled) continue;
			if (groupedKeys.has(`${src.mac}|${z.index}`)) continue;
			if (excludedZoneKeys.has(`${src.mac}|${z.index}`)) continue;
			passthroughs.push({
				kind: "passthrough",
				mac: src.mac,
				zone_index: z.index,
				name: z.name,
				available: true,
				_sourceName: src.name,
			});
		}
	}

	const nameCounts = new Map<string, number>();
	for (const p of passthroughs) {
		nameCounts.set(p.name, (nameCounts.get(p.name) ?? 0) + 1);
	}
	for (const p of passthroughs) {
		if ((nameCounts.get(p.name) ?? 0) > 1) {
			p.name = `${p._sourceName} ${p.name}`;
		}
	}

	const passthroughsOut: ExposedZoneEntity[] = passthroughs.map((p) => ({
		kind: "passthrough",
		mac: p.mac,
		zone_index: p.zone_index,
		name: p.name,
		available: p.available,
	}));

	const groupedOut: ExposedZoneEntity[] = [];
	const sourceByMac = new Map(sources.map((s) => [s.mac, s]));
	for (const g of zoneGroups) {
		if (excludedZoneGroups.has(g.id)) continue;
		let anyEnabled = false;
		for (const m of g.members) {
			const src = sourceByMac.get(m.mac);
			if (!src) continue;
			const z = src.zones.find((z) => z.index === m.zone_index);
			if (z?.enabled) {
				anyEnabled = true;
				break;
			}
		}
		groupedOut.push({
			kind: "group",
			id: g.id,
			// Merged zones are zone sensors too — name them "Zone {name}".
			name: `Zone ${g.name}`,
			available: anyEnabled,
		});
	}

	return {
		presence,
		zones: [...restOfRoomOut, ...groupedOut, ...passthroughsOut],
	};
}
