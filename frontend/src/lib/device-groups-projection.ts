import {
	type DeviceGroupExposedEntities,
	type DeviceGroupSourceZone,
	type DeviceGroupZoneGroup,
	type ExposedZoneEntity,
	PRESENCE_SLOTS,
	type PresenceSlot,
} from "../types.js";

export type ZoneState = DeviceGroupSourceZone;

export interface DeviceGroupSourceState {
	mac: string;
	name: string;
	available: boolean;
	enabled_presence: string[];
	zones: ZoneState[];
}

/**
 * Mirror of the Python derive_exposed_entities. Identical semantics so the
 * panel can preview "what entities will be created" without a round trip.
 */
export function deriveExposedEntities(
	sources: DeviceGroupSourceState[],
	zoneGroups: DeviceGroupZoneGroup[],
): DeviceGroupExposedEntities {
	const enabledUnion = new Set<string>();
	for (const src of sources) {
		for (const p of src.enabled_presence) enabledUnion.add(p);
	}
	const presence = PRESENCE_SLOTS.filter((slot) =>
		enabledUnion.has(slot),
	) as PresenceSlot[];

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
			if (!z.enabled) continue;
			if (groupedKeys.has(`${src.mac}|${z.index}`)) continue;
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

	return { presence, zones: [...groupedOut, ...passthroughsOut] };
}
