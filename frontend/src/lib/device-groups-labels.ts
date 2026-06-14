import type { KebabEntry } from "../components/epp-kebab-menu.js";

/** Edit / Delete kebab items, shared by the device-group list cards and the
 *  merged-zone boxes so both per-row menus render identically. */
export const EDIT_DELETE_KEBAB_ITEMS: KebabEntry[] = [
	{ id: "edit", label: "Edit", icon: "mdi:pencil" },
	{ divider: true },
	{ id: "delete", label: "Delete", icon: "mdi:delete", danger: true },
];

/** Human labels for the presence slots a device group can expose. Shared by
 *  the editor preview and the list view so the two never disagree. */
export const PRESENCE_LABELS: Record<string, string> = {
	occupancy: "Occupancy",
	static_presence: "Static presence",
	motion_presence: "Motion presence",
	target_presence: "Target presence",
	mmwave_presence: "mmWave presence",
};

export interface SensorChip {
	name: string;
	kind: "presence" | "zone";
}

/** Every sensor a group exposes as a chip ({name, kind}), in a stable order so
 *  the list view and the editor preview render the same lozenges: Occupancy
 *  first, then the remaining presence sensors alphabetically, then the zones
 *  alphabetically. Name comparison is i18n- and numeric-aware ("Zone 2" before
 *  "Zone 10"). */
export function exposedSensorChips(exposed: {
	presence: string[];
	zones: { name: string }[];
}): SensorChip[] {
	// Rank groups the chips into bands (Occupancy / other presence / zones);
	// names order the chips within a band.
	const ranked = [
		...exposed.presence.map((p) => ({
			name: PRESENCE_LABELS[p] ?? p,
			kind: "presence" as const,
			rank: p === "occupancy" ? 0 : 1,
		})),
		...exposed.zones.map((z) => ({
			name: z.name,
			kind: "zone" as const,
			rank: 2,
		})),
	];
	ranked.sort(
		(a, b) =>
			a.rank - b.rank ||
			a.name.localeCompare(b.name, undefined, { numeric: true }),
	);
	return ranked.map(({ name, kind }) => ({ name, kind }));
}
