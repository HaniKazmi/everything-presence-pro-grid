import { describe, it, expect } from "vitest";
import en from "../translations/en.json";
import es from "../translations/es.json";

function flatten(obj: unknown, prefix = "", acc: string[] = []): string[] {
	if (obj && typeof obj === "object") {
		for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
			const path = prefix ? `${prefix}.${k}` : k;
			if (v && typeof v === "object") flatten(v, path, acc);
			else acc.push(path);
		}
	}
	return acc;
}

describe("Spanish translation coverage", () => {
	it("es.json has every key present in en.json", () => {
		const enKeys = new Set(flatten(en));
		const esKeys = new Set(flatten(es));
		const missing = [...enKeys].filter((k) => !esKeys.has(k));
		expect(missing).toEqual([]);
	});

	it("es.json has no extra keys not in en.json", () => {
		const enKeys = new Set(flatten(en));
		const esKeys = new Set(flatten(es));
		const extra = [...esKeys].filter((k) => !enKeys.has(k));
		expect(extra).toEqual([]);
	});
});
