import { IntlMessageFormat } from "intl-messageformat";
import en from "./translations/en.json";
import es from "./translations/es.json";

const LANGUAGES: Record<string, Record<string, unknown>> = { en, es };

type Params = Record<string, string | number>;

export interface LocalizeFn {
	(key: string, params?: Params): string;
	formatNumber: (value: number, decimals?: number) => string;
	lang: string;
}

/**
 * Default LocalizeFn used as the property initializer in components — returns
 * the key itself and uses `toFixed` for formatting. Replaced by
 * `setupLocalize(hass)` once the panel has a real hass object.
 */
export const defaultLocalize: LocalizeFn = Object.assign(
	((k: string) => k) as LocalizeFn,
	{
		formatNumber: (v: number, d = 1) => v.toFixed(d),
		lang: "en",
	},
);

function resolve(
	obj: Record<string, unknown>,
	path: string,
): string | undefined {
	const parts = path.split(".");
	let current: unknown = obj;
	for (const part of parts) {
		if (current == null || typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[part];
	}
	return typeof current === "string" ? current : undefined;
}

export function setupLocalize(hass?: {
	locale?: { language?: string };
	language?: string;
}): LocalizeFn {
	const requested = hass?.locale?.language ?? hass?.language ?? "en";
	const base = requested.split("-")[0];
	const lang = LANGUAGES[requested] ? requested : LANGUAGES[base] ? base : "en";
	const strings = LANGUAGES[lang];
	const fallback = LANGUAGES.en;

	// Cap the cache so a stream of unique formats (e.g. user-supplied data
	// echoed into a translation key) can't grow unbounded. The translation
	// catalogue is well under this size, so normal use stays warm.
	const FORMAT_CACHE_CAP = 256;
	const formatCache = new Map<string, IntlMessageFormat>();
	const numberCache = new Map<number, Intl.NumberFormat>();

	const localize = ((key: string, params?: Params): string => {
		const raw =
			resolve(strings as Record<string, unknown>, key) ??
			resolve(fallback as Record<string, unknown>, key) ??
			key;

		if (!params) return raw;

		let fmt = formatCache.get(raw);
		if (!fmt) {
			fmt = new IntlMessageFormat(raw, lang);
			if (formatCache.size >= FORMAT_CACHE_CAP) {
				// Evict the oldest entry. Map iteration is in insertion order.
				const oldest = formatCache.keys().next().value;
				if (oldest !== undefined) formatCache.delete(oldest);
			}
			formatCache.set(raw, fmt);
		}
		return fmt.format(params) as string;
	}) as LocalizeFn;

	localize.formatNumber = (value: number, decimals = 1): string => {
		let fmt = numberCache.get(decimals);
		if (!fmt) {
			fmt = new Intl.NumberFormat(lang, {
				minimumFractionDigits: decimals,
				maximumFractionDigits: decimals,
			});
			numberCache.set(decimals, fmt);
		}
		return fmt.format(value);
	};

	localize.lang = lang;

	return localize;
}
