import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import en from "../translations/en.json";

const SRC_DIR = resolve(__dirname, "..");

function walk(dir: string, acc: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const p = join(dir, entry);
		const s = statSync(p);
		if (s.isDirectory()) {
			if (entry === "__tests__" || entry === "translations") continue;
			walk(p, acc);
		} else if (p.endsWith(".ts") && !p.endsWith(".d.ts")) {
			acc.push(p);
		}
	}
	return acc;
}

function resolveKey(obj: unknown, key: string): boolean {
	const parts = key.split(".");
	let cur: unknown = obj;
	for (const p of parts) {
		if (
			cur &&
			typeof cur === "object" &&
			p in (cur as Record<string, unknown>)
		) {
			cur = (cur as Record<string, unknown>)[p];
		} else {
			return false;
		}
	}
	return typeof cur === "string";
}

describe("frontend translation keys", () => {
	it("every localize() and errorKey reference resolves in en.json", () => {
		const files = walk(SRC_DIR);
		const patterns = [
			/localize\(\s*["'`]([a-z0-9_.]+)["'`]/gi,
			/errorKey:\s*["']([a-z0-9_.]+)["']/gi,
		];
		const missing: string[] = [];
		for (const file of files) {
			const src = readFileSync(file, "utf8");
			for (const pat of patterns) {
				for (const m of src.matchAll(pat)) {
					const key = m[1];
					if (!resolveKey(en, key)) {
						missing.push(`${key} (${file.substring(SRC_DIR.length + 1)})`);
					}
				}
			}
		}
		expect(missing).toEqual([]);
	});
});
