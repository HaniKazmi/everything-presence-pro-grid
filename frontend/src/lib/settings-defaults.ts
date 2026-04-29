/**
 * Canonical per-entity default state. Entities not listed here default
 * to `false` (disabled).
 */
export const ENTITY_DEFAULTS: Record<string, boolean> = {
	// Enabled by default
	room_occupancy: true,
	zone_presence: true,
	env_temperature: true,
	env_humidity: true,
	env_illuminance: true,
	// Disabled by default
	room_target_presence: false,
	room_static_presence: false,
	room_motion_presence: false,
	target_active: false,
	target_xy: false,
	target_signal: false,
	target_zone: false,
	zone_target_count: false,
	target_count: false,
	env_co2: false,
};

/**
 * Canonical default values for every settings field that
 * `eppgrid/set_settings` accepts.
 *
 * These are the source of truth for:
 * - Sparse-save: configurations omit fields equal to their default
 * - Restore: when a saved configuration omits a field, the field is
 *   reset to the value here
 *
 * MUST stay in sync with the panel's `@state` initial values in
 * `eppgrid-panel.ts` and with the `_buildSettingsPayload()` helper.
 * Adding a new settings field requires updating all THREE places:
 * `_buildSettingsPayload()` in `eppgrid-panel.ts`, `_emitSave()` in
 * `components/epp-settings-view.ts`, AND this map.
 */
export const SETTINGS_DEFAULTS = {
	temperature_offset: 0,
	humidity_offset: 0,
	illuminance_offset: 0,
	motion_timeout: 5,
	target_auto_distance: true,
	target_max_distance: 6.0,
	static_auto_distance: true,
	static_min_distance: 0.3,
	static_max_distance: 16.0,
	static_trigger_threshold: 3,
	static_renew_threshold: 3,
	static_timeout: 30,
	static_on_delay: 0,
	led_mode: "Manual Control",
	led_brightness: 1.0,
	led_presence_color: "#CC33FF",
	relay_trigger_mode: "disabled",
	relay_contact_mode: "no",
	target_update_rate_ms: 1000,
	zone_update_rate_ms: 1000,
	entities: { ...ENTITY_DEFAULTS } as Record<string, boolean>,
	log_levels: {} as Record<string, string>,
} as const;

export type SettingsKey = keyof typeof SETTINGS_DEFAULTS;

/**
 * Returns true when `value` is semantically equal to `defaultValue`.
 *
 * - Scalars: strict equality (`===`).
 * - Objects (log_levels): default is empty {}; treat any empty object as
 *   default. This is kept as a function so callers don't need to know
 *   whether a key's default is a scalar or an object.
 * - Note: entities are NOT handled here — they use buildSparseEntities /
 *   expandEntities for per-entity-flag comparison.
 */
export function isSettingsValueDefault(value: any, defaultValue: any): boolean {
	if (typeof defaultValue === "object" && defaultValue !== null) {
		// log_levels: default is empty {}; treat any empty object as default.
		// entities is excluded from this path (handled by buildSparseEntities).
		return (
			value !== null &&
			typeof value === "object" &&
			Object.keys(value).length === Object.keys(defaultValue).length &&
			Object.keys(defaultValue).length === 0
		);
	}
	return value === defaultValue;
}

/**
 * Filter an entities dict to only flags that differ from their default.
 * Returns `{}` if every flag is at its default.
 */
export function buildSparseEntities(
	entities: Record<string, boolean> | undefined,
): Record<string, boolean> {
	if (!entities) return {};
	const sparse: Record<string, boolean> = {};
	for (const [key, value] of Object.entries(entities)) {
		const def = ENTITY_DEFAULTS[key] ?? false;
		if (value !== def) {
			sparse[key] = value;
		}
	}
	return sparse;
}

/**
 * Reconstruct a full entities dict from a sparse blob: start with the
 * canonical defaults for known entities, then layer the sparse overrides
 * on top. Used by restore.
 */
export function expandEntities(
	sparse: Record<string, boolean> | undefined,
): Record<string, boolean> {
	return { ...ENTITY_DEFAULTS, ...(sparse || {}) };
}
