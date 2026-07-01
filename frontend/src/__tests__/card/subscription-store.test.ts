import { describe, expect, it, vi } from "vitest";
import { createSubscriptionStore } from "../../card/subscription-store.js";

function makeHass() {
	let cb: ((msg: any) => void) | null = null;
	const unsub = vi.fn();
	const subscribeMessage = vi.fn(async (callback: any) => {
		cb = callback;
		return unsub;
	});
	const connection = { subscribeMessage };
	return {
		hass: { connection },
		emit: (msg: any) => cb?.(msg),
		subscribeMessage,
		unsub,
	};
}

describe("createSubscriptionStore", () => {
	it("opens one subscription for two subscribers to the same deviceId and replays cached state to a new subscriber", async () => {
		const store = createSubscriptionStore<{ value: number }>({
			wireType: "test/subscribe",
			initialState: () => ({ value: 0 }),
			reduce: (state, m) =>
				"value" in m ? { ...state, value: m.value as number } : null,
		});

		const h = makeHass();
		const a = vi.fn();
		const off1 = store.subscribe(h.hass, "dev1", a);
		await Promise.resolve();
		h.emit({ value: 42 });

		const b = vi.fn();
		const off2 = store.subscribe(h.hass, "dev1", b);
		// second subscriber immediately receives the cached state
		expect(b).toHaveBeenLastCalledWith({ value: 42 });
		// still only ONE websocket subscription for the shared device
		expect(h.subscribeMessage).toHaveBeenCalledTimes(1);
		expect(h.subscribeMessage).toHaveBeenCalledWith(expect.any(Function), {
			type: "test/subscribe",
			device_id: "dev1",
		});
		off1();
		off2();
	});

	it("replays the fresh initial state to a subscriber before any event arrives, and uses a NEW instance per entry", async () => {
		const store = createSubscriptionStore<number[]>({
			wireType: "test/subscribe",
			initialState: () => [],
			reduce: (_state, m) => (m.cells as number[] | undefined) ?? [],
		});

		const h1 = makeHass();
		const l1 = vi.fn();
		const off1 = store.subscribe(h1.hass, "devX", l1);
		expect(l1).toHaveBeenLastCalledWith([]);
		await Promise.resolve();
		h1.emit({ cells: [1, 2] });
		off1();

		// A second, independent device entry must get its OWN fresh array
		// (not a shared/mutated instance from devX).
		const h2 = makeHass();
		const l2 = vi.fn();
		const off2 = store.subscribe(h2.hass, "devY", l2);
		expect(l2).toHaveBeenLastCalledWith([]);
		off2();
	});

	it("tears down the subscription only when the last subscriber leaves", async () => {
		const store = createSubscriptionStore<{ value: number }>({
			wireType: "test/subscribe",
			initialState: () => ({ value: 0 }),
			reduce: (state, m) =>
				"value" in m ? { ...state, value: m.value as number } : null,
		});
		const h = makeHass();
		const off1 = store.subscribe(h.hass, "dev2", vi.fn());
		const off2 = store.subscribe(h.hass, "dev2", vi.fn());
		await Promise.resolve();
		off1();
		expect(h.unsub).not.toHaveBeenCalled();
		off2();
		expect(h.unsub).toHaveBeenCalledTimes(1);
	});

	it("keeps separate subscriptions for different devices (separate registry entries)", async () => {
		const store = createSubscriptionStore<{ value: number }>({
			wireType: "test/subscribe",
			initialState: () => ({ value: 0 }),
			reduce: (state, m) =>
				"value" in m ? { ...state, value: m.value as number } : null,
		});
		const h = makeHass();
		store.subscribe(h.hass, "devA", vi.fn());
		store.subscribe(h.hass, "devB", vi.fn());
		expect(h.subscribeMessage).toHaveBeenCalledTimes(2);
	});

	it("gives each createSubscriptionStore call its own registry (no cross-store sharing)", async () => {
		const config = {
			wireType: "test/subscribe",
			initialState: () => ({ value: 0 }),
			reduce: (state: { value: number }, m: Record<string, unknown>) =>
				"value" in m ? { ...state, value: m.value as number } : null,
		};
		const storeA = createSubscriptionStore<{ value: number }>(config);
		const storeB = createSubscriptionStore<{ value: number }>(config);

		const h = makeHass();
		storeA.subscribe(h.hass, "shared-id", vi.fn());
		storeB.subscribe(h.hass, "shared-id", vi.fn());
		// Same deviceId, but different store instances -> two independent opens.
		expect(h.subscribeMessage).toHaveBeenCalledTimes(2);
	});

	it("reopens on a fresh connection (reconnect path) and applies onReconnect before reopening", async () => {
		const store = createSubscriptionStore<{ connected: boolean }>({
			wireType: "test/subscribe",
			initialState: () => ({ connected: false }),
			reduce: () => null,
			onOpen: (s) => ({ ...s, connected: true }),
			onReconnect: (s) => ({ ...s, connected: false }),
		});
		const h = makeHass();
		const l = vi.fn();
		store.subscribe(h.hass, "devReconnect", l);
		await Promise.resolve();
		expect(l.mock.calls.at(-1)![0].connected).toBe(true);
		const callsBefore = l.mock.calls.length;

		const conn2 = { subscribeMessage: vi.fn(async () => vi.fn()) };
		const hass2 = { connection: conn2 };
		store.subscribe(hass2, "devReconnect", vi.fn());

		expect(h.unsub).toHaveBeenCalledTimes(1);
		expect(conn2.subscribeMessage).toHaveBeenCalledTimes(1);
		const reconnectCalls = l.mock.calls.slice(callsBefore);
		expect(reconnectCalls.some((c) => c[0].connected === false)).toBe(true);
	});

	it("calls unsub if the last subscriber leaves before subscribeMessage resolves", async () => {
		const unsub = vi.fn();
		let resolve!: (u: () => void) => void;
		const subscribeMessage = vi.fn(
			() =>
				new Promise<() => void>((r) => {
					resolve = r;
				}),
		);
		const hass = { connection: { subscribeMessage } };
		const store = createSubscriptionStore<{ value: number }>({
			wireType: "test/subscribe",
			initialState: () => ({ value: 0 }),
			reduce: () => null,
		});

		const off = store.subscribe(hass, "devRace", vi.fn());
		off();
		resolve(unsub);
		await Promise.resolve();
		expect(unsub).toHaveBeenCalledTimes(1);
	});

	it("does not change state or emit when reduce returns null", async () => {
		const store = createSubscriptionStore<{ value: number }>({
			wireType: "test/subscribe",
			initialState: () => ({ value: 0 }),
			reduce: (state, m) =>
				"value" in m ? { ...state, value: m.value as number } : null,
		});
		const h = makeHass();
		const l = vi.fn();
		store.subscribe(h.hass, "devIgnore", l);
		await Promise.resolve();
		const before = l.mock.calls.length;
		h.emit({ something: "unexpected" });
		h.emit(null);
		expect(l.mock.calls.length).toBe(before);
	});

	it("runs onError on subscribeMessage rejection, and does nothing when onError is absent", async () => {
		const subscribeMessage = vi.fn(() => Promise.reject(new Error("boom")));
		const hass = { connection: { subscribeMessage } };

		const storeWithHook = createSubscriptionStore<{ ok: boolean }>({
			wireType: "test/subscribe",
			initialState: () => ({ ok: true }),
			reduce: () => null,
			onError: () => ({ ok: false }),
		});
		const l1 = vi.fn();
		storeWithHook.subscribe(hass, "devReject1", l1);
		await Promise.resolve();
		await Promise.resolve();
		expect(l1.mock.calls.at(-1)![0]).toEqual({ ok: false });

		const storeNoHook = createSubscriptionStore<{ ok: boolean }>({
			wireType: "test/subscribe",
			initialState: () => ({ ok: true }),
			reduce: () => null,
		});
		const l2 = vi.fn();
		storeNoHook.subscribe(hass, "devReject2", l2);
		await Promise.resolve();
		await Promise.resolve();
		// No hook -> no additional emit beyond the initial replay.
		expect(l2).toHaveBeenCalledTimes(1);
	});

	it("calls stale unsub when connection changes before in-flight subscribeMessage resolves", async () => {
		const unsubA = vi.fn();
		let resolveA!: (u: () => void) => void;
		const connA = {
			subscribeMessage: vi.fn(
				() =>
					new Promise<() => void>((r) => {
						resolveA = r;
					}),
			),
		};
		const hassA = { connection: connA };
		const connB = {
			subscribeMessage: vi.fn(() => Promise.resolve(vi.fn())),
		};
		const hassB = { connection: connB };

		const store = createSubscriptionStore<{ value: number }>({
			wireType: "test/subscribe",
			initialState: () => ({ value: 0 }),
			reduce: () => null,
		});

		store.subscribe(hassA, "devInflight", vi.fn());
		store.subscribe(hassB, "devInflight", vi.fn());
		await Promise.resolve();

		resolveA(unsubA);
		await Promise.resolve();

		expect(unsubA).toHaveBeenCalledTimes(1);
	});

	it("does not change state or emit when onOpen returns null", async () => {
		const store = createSubscriptionStore<{ value: number }>({
			wireType: "test/subscribe",
			initialState: () => ({ value: 7 }),
			reduce: () => null,
			onOpen: () => null,
		});
		const h = makeHass();
		const l = vi.fn();
		store.subscribe(h.hass, "devOpenNoop", l);
		const callsBefore = l.mock.calls.length;
		await Promise.resolve();
		// onOpen returned null: no extra emit beyond the initial replay.
		expect(l.mock.calls.length).toBe(callsBefore);
	});

	it("is a no-op calling the unsubscribe function twice", async () => {
		const store = createSubscriptionStore<{ value: number }>({
			wireType: "test/subscribe",
			initialState: () => ({ value: 0 }),
			reduce: () => null,
		});
		const h = makeHass();
		const off = store.subscribe(h.hass, "devDoubleOff", vi.fn());
		await Promise.resolve();
		off();
		expect(h.unsub).toHaveBeenCalledTimes(1);
		// Calling the returned unsubscribe again must not throw or double-close.
		expect(() => off()).not.toThrow();
		expect(h.unsub).toHaveBeenCalledTimes(1);
	});

	it("ignores non-object messages via the top-level guard before reduce runs", async () => {
		const reduce = vi.fn(() => null);
		const store = createSubscriptionStore<{ value: number }>({
			wireType: "test/subscribe",
			initialState: () => ({ value: 0 }),
			reduce,
		});
		const h = makeHass();
		store.subscribe(h.hass, "devGuard", vi.fn());
		await Promise.resolve();
		h.emit(null);
		h.emit(undefined);
		h.emit("nope");
		expect(reduce).not.toHaveBeenCalled();
	});
});
