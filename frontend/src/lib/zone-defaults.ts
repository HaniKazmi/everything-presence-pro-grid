export interface Zone0Config {
	type: "normal" | "thoroughfare" | "rest" | "custom";
	trigger?: number; // 0-9 threshold, 0=disabled, higher=harder
	renew?: number; // 0-9 threshold, 0=disabled, higher=harder
	timeout?: number; // seconds, if undefined use type default
	handoff_timeout?: number; // seconds, time for zone to clear after target leaves
}

export interface ZoneConfig extends Zone0Config {
	name: string;
	color: string;
}

export const ZONE_TYPE_DEFAULTS: Record<
	string,
	{ trigger: number; renew: number; timeout: number; handoff_timeout: number }
> = {
	normal: { trigger: 5, renew: 3, timeout: 10, handoff_timeout: 3 },
	thoroughfare: { trigger: 3, renew: 2, timeout: 3, handoff_timeout: 1 },
	rest: { trigger: 7, renew: 1, timeout: 30, handoff_timeout: 10 },
};

// Color-blind-friendly pale palette (Paul Tol's "light qualitative scheme",
// further softened ~30% toward white for a uniformly pale look while
// preserving distinguishability across protanopia, deuteranopia, and
// tritanopia).
export const ZONE_COLORS = [
	"#B8E7FF", // pale cyan
	"#CFDB70", // pale pear
	"#FFC4CF", // pale pink
	"#F3E7AC", // pale yellow
	"#7CCFB8", // pale mint
	"#A0C4E7", // pale blue
	"#F3AC94", // pale orange
];

export interface ZoneThresholds {
	trigger: number;
	renew: number;
	timeout: number;
	handoffTimeout: number;
}

/**
 * Non-custom types use the type's defaults exclusively (user-supplied
 * trigger/renew/... is ignored). Custom honours user values, falling back
 * to normal's defaults when a field is missing (there is no "custom" entry
 * in ZONE_TYPE_DEFAULTS). Works for zone 0 and named zones — both share
 * the Zone0Config structural base.
 */
export function resolveZoneParams(z: Zone0Config): {
	type: Zone0Config["type"];
	trigger: number;
	renew: number;
	timeout: number;
	handoff_timeout: number;
} {
	const d = ZONE_TYPE_DEFAULTS[z.type] ?? ZONE_TYPE_DEFAULTS.normal;
	const useCustom = z.type === "custom";
	return {
		type: z.type,
		trigger: useCustom ? (z.trigger ?? d.trigger) : d.trigger,
		renew: useCustom ? (z.renew ?? d.renew) : d.renew,
		timeout: useCustom ? (z.timeout ?? d.timeout) : d.timeout,
		handoff_timeout: useCustom
			? (z.handoff_timeout ?? d.handoff_timeout)
			: d.handoff_timeout,
	};
}

/**
 * Get trigger/renew/timeout for a zone from the current editor state.
 *
 * - zid === 0: room boundary (uses roomType/roomTrigger/roomRenew/roomTimeout/etc.)
 * - zid 1-7: named zone (uses zone config)
 */
export function getZoneThresholds(
	zid: number,
	zoneConfigs: (ZoneConfig | null)[],
	roomType: ZoneConfig["type"],
	roomTrigger: number,
	roomRenew: number,
	roomTimeout: number,
	roomHandoffTimeout: number,
): ZoneThresholds {
	if (zid === 0) {
		const d = ZONE_TYPE_DEFAULTS[roomType] || ZONE_TYPE_DEFAULTS.normal;
		const isCustom = roomType === "custom";
		return isCustom
			? {
					trigger: roomTrigger,
					renew: roomRenew,
					timeout: roomTimeout,
					handoffTimeout: roomHandoffTimeout,
				}
			: {
					trigger: d.trigger,
					renew: d.renew,
					timeout: d.timeout,
					handoffTimeout: d.handoff_timeout,
				};
	}
	if (zid > 0 && zid <= zoneConfigs.length) {
		const cfg = zoneConfigs[zid - 1];
		if (cfg) {
			const d = ZONE_TYPE_DEFAULTS[cfg.type] || ZONE_TYPE_DEFAULTS.normal;
			const isCustom = cfg.type === "custom";
			return isCustom
				? {
						trigger: cfg.trigger ?? d.trigger,
						renew: cfg.renew ?? d.renew,
						timeout: cfg.timeout ?? d.timeout,
						handoffTimeout: cfg.handoff_timeout ?? d.handoff_timeout,
					}
				: {
						trigger: d.trigger,
						renew: d.renew,
						timeout: d.timeout,
						handoffTimeout: d.handoff_timeout,
					};
		}
	}
	return {
		trigger: 5,
		renew: 3,
		timeout: 10,
		handoffTimeout: 3,
	};
}
