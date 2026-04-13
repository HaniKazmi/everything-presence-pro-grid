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
