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

/** Every sensor a group exposes as a chip ({name, kind}), sorted by name, so
 *  the list view and the editor preview render the same sorted lozenges. */
export function exposedSensorChips(exposed: {
	presence: string[];
	zones: { name: string }[];
}): SensorChip[] {
	const chips: SensorChip[] = [
		...exposed.presence.map((p) => ({
			name: PRESENCE_LABELS[p] ?? p,
			kind: "presence" as const,
		})),
		...exposed.zones.map((z) => ({ name: z.name, kind: "zone" as const })),
	];
	return chips.sort((a, b) =>
		a.name.localeCompare(b.name, undefined, { numeric: true }),
	);
}
