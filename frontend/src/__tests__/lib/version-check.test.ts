import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkForNewBundle, parseBundleHash } from "../../lib/version-check.js";

describe("parseBundleHash", () => {
	it("extracts the hash from a hashed bundle URL", () => {
		expect(
			parseBundleHash(
				"https://ha.local:8123/eppgrid_static/abc123def/eppgrid-panel.js",
			),
		).toBe("abc123def");
	});

	it("extracts the hash from a relative bundle URL", () => {
		expect(parseBundleHash("/eppgrid_static/deadbeef/eppgrid-panel.js")).toBe(
			"deadbeef",
		);
	});

	it("returns null for a URL that is not the hashed bundle path", () => {
		expect(parseBundleHash("https://ha.local/local/some-other.js")).toBeNull();
	});

	it('returns null for the "0" read-error sentinel hash', () => {
		expect(parseBundleHash("/eppgrid_static/0/eppgrid-panel.js")).toBeNull();
	});

	it("matches the bundle even with a trailing query/fragment", () => {
		expect(parseBundleHash("/eppgrid_static/abc/eppgrid-panel.js?v=1")).toBe(
			"abc",
		);
		expect(parseBundleHash("/eppgrid_static/abc/eppgrid-panel.js#x")).toBe(
			"abc",
		);
	});

	it("returns null for a sourcemap-style URL (not the bundle itself)", () => {
		expect(
			parseBundleHash("/eppgrid_static/abc/eppgrid-panel.js.map"),
		).toBeNull();
	});

	it("returns null for empty / nullish input", () => {
		expect(parseBundleHash("")).toBeNull();
		expect(parseBundleHash(undefined)).toBeNull();
		expect(parseBundleHash(null)).toBeNull();
	});
});

describe("checkForNewBundle", () => {
	let storage: Storage;
	beforeEach(() => {
		const map = new Map<string, string>();
		storage = {
			getItem: (k: string) => map.get(k) ?? null,
			setItem: (k: string, v: string) => void map.set(k, v),
			removeItem: (k: string) => void map.delete(k),
			clear: () => map.clear(),
			key: () => null,
			length: 0,
		} as unknown as Storage;
	});

	it("reloads when the server reports a different hash, and resolves", async () => {
		const reload = vi.fn();
		const resolved = await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "new",
			reload,
			storage,
		});
		expect(reload).toHaveBeenCalledTimes(1);
		expect(resolved).toBe(true);
	});

	it("does not reload when the server hash matches", async () => {
		const reload = vi.fn();
		await checkForNewBundle({
			currentHash: "same",
			fetchServerHash: async () => "same",
			reload,
			storage,
		});
		expect(reload).not.toHaveBeenCalled();
	});

	it("does not reload when our own hash is unknown, and resolves (no retry)", async () => {
		const reload = vi.fn();
		const fetchServerHash = vi.fn(async () => "new");
		const resolved = await checkForNewBundle({
			currentHash: null,
			fetchServerHash,
			reload,
			storage,
		});
		expect(reload).not.toHaveBeenCalled();
		// Can never compare → don't keep retrying.
		expect(resolved).toBe(true);
	});

	it("does not reload when the server lookup fails, and stays unresolved (retry)", async () => {
		const reload = vi.fn();
		const resolved = await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => {
				throw new Error("ws boom");
			},
			reload,
			storage,
		});
		expect(reload).not.toHaveBeenCalled();
		// Command unreachable (integration not up yet) → caller should retry.
		expect(resolved).toBe(false);
	});

	it("does not reload when the server hash is null, and stays unresolved (retry)", async () => {
		const reload = vi.fn();
		const resolved = await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => null,
			reload,
			storage,
		});
		expect(reload).not.toHaveBeenCalled();
		// Hash not stored yet (setup in flight) → caller should retry.
		expect(resolved).toBe(false);
	});

	it('treats the "0" server sentinel as resolved without reloading', async () => {
		const reload = vi.fn();
		const resolved = await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "0",
			reload,
			storage,
		});
		// "0" means the server could not hash its own bundle — never reload to
		// that, and don't spin retrying.
		expect(reload).not.toHaveBeenCalled();
		expect(resolved).toBe(true);
	});

	it("does not reload a second time for the same server hash (loop guard)", async () => {
		const reload = vi.fn();
		const deps = {
			currentHash: "old",
			fetchServerHash: async () => "new",
			reload,
			storage,
		};
		await checkForNewBundle(deps);
		await checkForNewBundle(deps);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("reloads again when the server advances to yet another hash", async () => {
		const reload = vi.fn();
		await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "new1",
			reload,
			storage,
		});
		await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "new2",
			reload,
			storage,
		});
		expect(reload).toHaveBeenCalledTimes(2);
	});

	it("clears a stale loop guard once versions match again", async () => {
		const reload = vi.fn();
		// First, a mismatch arms the guard.
		await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "new",
			reload,
			storage,
		});
		// Then we are running the new bundle and the server agrees.
		await checkForNewBundle({
			currentHash: "new",
			fetchServerHash: async () => "new",
			reload,
			storage,
		});
		// A later genuine mismatch back-to "new" must reload again, proving the
		// guard was cleared.
		await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "new",
			reload,
			storage,
		});
		expect(reload).toHaveBeenCalledTimes(2);
	});

	it("still reloads when the guard store throws on read", async () => {
		const reload = vi.fn();
		const throwingStorage = {
			getItem: () => {
				throw new Error("blocked");
			},
			setItem: () => {},
			removeItem: () => {},
		} as unknown as Storage;
		const resolved = await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "new",
			reload,
			storage: throwingStorage,
		});
		expect(reload).toHaveBeenCalledTimes(1);
		expect(resolved).toBe(true);
	});

	it("still reloads when the guard store throws on write", async () => {
		const reload = vi.fn();
		const throwingStorage = {
			getItem: () => null,
			setItem: () => {
				throw new Error("QuotaExceededError");
			},
			removeItem: () => {},
		} as unknown as Storage;
		const resolved = await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "new",
			reload,
			storage: throwingStorage,
		});
		// A flaky/blocked sessionStorage must not swallow the reload — the loop
		// guard is best-effort.
		expect(reload).toHaveBeenCalledTimes(1);
		expect(resolved).toBe(true);
	});

	it("tolerates a missing storage (no loop guard, still reloads once)", async () => {
		const reload = vi.fn();
		await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "new",
			reload,
			storage: null,
		});
		expect(reload).toHaveBeenCalledTimes(1);
	});
});
