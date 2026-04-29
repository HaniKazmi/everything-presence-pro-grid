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
	entities: {} as Record<string, boolean>,
	log_levels: {} as Record<string, string>,
} as const;

export type SettingsKey = keyof typeof SETTINGS_DEFAULTS;

/**
 * Returns true when `value` is semantically equal to `defaultValue`.
 *
 * - Scalars: strict equality (`===`).
 * - Objects (entities, log_levels): both must be empty objects — the
 *   current object defaults are all `{}`, so any non-empty object is
 *   non-default. This is kept as a function so callers don't need to
 *   know whether a key's default is a scalar or an object, and so the
 *   logic can be extended if a future default object has content.
 */
export function isSettingsValueDefault(value: any, defaultValue: any): boolean {
	if (typeof defaultValue === "object" && defaultValue !== null) {
		// entities, log_levels: default is empty {}; treat any empty object as default
		return (
			value !== null &&
			typeof value === "object" &&
			Object.keys(value).length === Object.keys(defaultValue).length &&
			Object.keys(defaultValue).length === 0
		);
	}
	return value === defaultValue;
}
