/**
 * Pure mapper from a firmware detection-log wire code to a friendly, localized
 * line. The firmware ships each event as a compact colon-delimited code (see the
 * contract table below); this turns one such code into a translated string by
 * looking up a `live.events.*` key and interpolating resolved zone names,
 * target labels, and numeric params.
 *
 * Wire-code contract (head token → rendered intent):
 *   sa/sp/sc        Static presence detected / fading… / cleared
 *   ma/mp/mc        Motion presence detected / fading… / cleared
 *   zo:Z/zp:Z       {Zone} occupied / clearing…
 *   zc:Z:r          {Zone} cleared — r = t(timeout, or absent) / h(handoff) /
 *                   o(overlay exit) / f(force, sensor-assisted)
 *   oo / of         Room occupied / empty
 *   wo / wf         mmWave on / off
 *   fc:Z            {Zone} force-cleared (both sensors idle)
 *   td:T:secs       {Target} auto-dismissed (stuck {secs}s)
 *   te:T:Z          {Target} entered {Zone}
 *   tl:T            {Target} left the room
 *   tm:T:Za:Zb      {Target} moved {ZoneA} → {ZoneB}
 *   xd:n            {n} events dropped
 * An unrecognised head token returns the raw code verbatim (forward-compat with
 * codes a newer firmware emits that this build doesn't know yet).
 */

/**
 * Localize signature matching the panel host's `_localize` (see localize.ts
 * `LocalizeFn`): a key plus optional ICU MessageFormat params.
 */
export type Localize = (
	key: string,
	params?: Record<string, string | number>,
) => string;

/** Resolve a zone id to a display name (0 = the room). */
export type ZoneNameResolver = (zone: number) => string;

/** Resolve a 0-based target index to a display label. */
export type TargetLabelResolver = (target: number) => string;

/**
 * Format a single detection-log wire code into a localized line.
 *
 * @param code        the raw wire code, e.g. "zo:0", "te:0:3", "xd:4"
 * @param zoneName    resolves a zone id to its display name
 * @param targetLabel resolves a 0-based target index to its display label
 * @param t           localize function (key + ICU params)
 * @returns the localized line, or the raw `code` for an unknown head token
 */
export function formatEvent(
	code: string,
	zoneName: ZoneNameResolver,
	targetLabel: TargetLabelResolver,
	t: Localize,
): string {
	const parts = code.split(":");
	const head = parts[0];
	const zone = (i: number) => zoneName(Number(parts[i] ?? "") || 0);
	const target = (i: number) => targetLabel(Number(parts[i] ?? "") || 0);

	switch (head) {
		// --- sensor presence ---
		case "sa":
			return t("live.events.static_active");
		case "sp":
			return t("live.events.static_fading");
		case "sc":
			return t("live.events.static_cleared");
		case "ma":
			return t("live.events.motion_active");
		case "mp":
			return t("live.events.motion_fading");
		case "mc":
			return t("live.events.motion_cleared");

		// --- room occupancy / mmWave ---
		case "oo":
			return t("live.events.room_occupied");
		case "of":
			return t("live.events.room_empty");
		case "wo":
			return t("live.events.mmwave_on");
		case "wf":
			return t("live.events.mmwave_off");

		// --- zone occupancy (zo:Z / zp:Z / zc:Z:r) ---
		case "zo":
			return t("live.events.zone_occupied", { zone: zone(1) });
		case "zp":
			return t("live.events.zone_clearing", { zone: zone(1) });
		case "zc": {
			// zc:Z:r — r is the clear reason (t/h/o/f). Absent r (legacy or
			// forward-compat) renders as the plain timeout/default cleared line.
			const reason = parts[2];
			const key =
				reason === "h"
					? "live.events.zone_cleared_handoff"
					: reason === "o"
						? "live.events.zone_cleared_overlay"
						: reason === "f"
							? "live.events.zone_cleared_force"
							: "live.events.zone_cleared";
			return t(key, { zone: zone(1) });
		}

		// --- force-clear (fc:Z) ---
		case "fc":
			return t("live.events.force_clear", { zone: zone(1) });

		// --- target events ---
		case "td": // td:T:secs
			return t("live.events.stuck_dismiss", {
				target: target(1),
				secs: Number(parts[2] ?? "") || 0,
			});
		case "te": // te:T:Z
			return t("live.events.target_entered", {
				target: target(1),
				zone: zone(2),
			});
		case "tl": // tl:T
			return t("live.events.target_left", { target: target(1) });
		case "tm": // tm:T:Za:Zb
			return t("live.events.target_moved", {
				target: target(1),
				from: zone(2),
				to: zone(3),
			});

		// --- overflow (xd:n) ---
		case "xd":
			return t("live.events.dropped", { n: Number(parts[1] ?? "") || 0 });

		default:
			return code;
	}
}
