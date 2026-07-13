import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

/** Like makeHass, but keeps every open's callback and unsub so a re-open can be
 *  told apart from the original subscription. */
function makeReopenableHass() {
	const callbacks: ((msg: any) => void)[] = [];
	const unsubs: ReturnType<typeof vi.fn>[] = [];
	const subscribeMessage = vi.fn(async (callback: any) => {
		callbacks.push(callback);
		const unsub = vi.fn();
		unsubs.push(unsub);
		return unsub;
	});
	const connection = { subscribeMessage };
	return {
		hass: { connection },
		connection,
		subscribeMessage,
		unsubs,
		/** Emit on the nth open's callback (default: the most recent one). */
		emit: (msg: any, n = callbacks.length - 1) => callbacks[n]?.(msg),
		opens: () => subscribeMessage.mock.calls.length,
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

describe("createSubscriptionStore re-subscribe on closed", () => {
	// Longer than the whole bounded backoff window, so one advance drains every
	// scheduled re-open attempt.
	const PAST_ALL_BACKOFF_MS = 120_000;

	function makeStore() {
		return createSubscriptionStore<{ value: number; available: boolean }>({
			wireType: "test/subscribe",
			initialState: () => ({ value: 0, available: true }),
			reduce: (state, m) => {
				if ("value" in m) return { ...state, value: m.value as number };
				if ("available" in m)
					return { ...state, available: m.available as boolean };
				return null;
			},
		});
	}

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("closes the websocket subscription and opens a fresh one for the same device", async () => {
		const store = makeStore();
		const h = makeReopenableHass();
		const off = store.subscribe(h.hass, "devClosed", vi.fn());
		await vi.advanceTimersByTimeAsync(0);
		expect(h.opens()).toBe(1);

		h.emit({ available: false, closed: true });
		// The dead subscription is dropped immediately...
		expect(h.unsubs[0]).toHaveBeenCalledTimes(1);
		// ...and the re-open is delayed (the integration is still reloading).
		expect(h.opens()).toBe(1);

		await vi.advanceTimersByTimeAsync(PAST_ALL_BACKOFF_MS);
		expect(h.opens()).toBe(2);
		expect(h.subscribeMessage).toHaveBeenLastCalledWith(expect.any(Function), {
			type: "test/subscribe",
			device_id: "devClosed",
		});
		off();
	});

	it("keeps listeners and cached state across the re-subscribe and delivers frames from the new subscription", async () => {
		const store = makeStore();
		const h = makeReopenableHass();
		const l = vi.fn();
		const off = store.subscribe(h.hass, "devKeep", l);
		await vi.advanceTimersByTimeAsync(0);
		h.emit({ value: 7 });
		expect(l).toHaveBeenLastCalledWith({ value: 7, available: true });

		h.emit({ available: false, closed: true });
		// Cached state survives (the card keeps its last frame + offline banner).
		expect(l).toHaveBeenLastCalledWith({ value: 7, available: false });

		await vi.advanceTimersByTimeAsync(PAST_ALL_BACKOFF_MS);
		// The same listener receives frames from the NEW subscription.
		h.emit({ value: 9 }, 1);
		expect(l).toHaveBeenLastCalledWith({ value: 9, available: false });
		off();
	});

	it("re-opens exactly once when two cards share the device", async () => {
		const store = makeStore();
		const h = makeReopenableHass();
		const off1 = store.subscribe(h.hass, "devTwoCards", vi.fn());
		const off2 = store.subscribe(h.hass, "devTwoCards", vi.fn());
		await vi.advanceTimersByTimeAsync(0);
		expect(h.opens()).toBe(1);

		h.emit({ available: false, closed: true });
		await vi.advanceTimersByTimeAsync(PAST_ALL_BACKOFF_MS);

		expect(h.opens()).toBe(2);
		expect(h.unsubs[0]).toHaveBeenCalledTimes(1);
		off1();
		off2();
	});

	it("re-opens once when a second closed message arrives while a re-open is pending", async () => {
		const store = makeStore();
		const h = makeReopenableHass();
		const off = store.subscribe(h.hass, "devDoubleClosed", vi.fn());
		await vi.advanceTimersByTimeAsync(0);

		// The closed subscription can still deliver a queued message after its
		// unsub; that must not restart the backoff or open a second subscription.
		h.emit({ available: false, closed: true });
		h.emit({ available: false, closed: true });
		await vi.advanceTimersByTimeAsync(PAST_ALL_BACKOFF_MS);

		expect(h.opens()).toBe(2);
		expect(h.unsubs[0]).toHaveBeenCalledTimes(1);
		off();
	});

	it("retries a rejected re-open with backoff and gives up after a bounded number of attempts", async () => {
		const store = makeStore();
		let openCb!: (msg: any) => void;
		// First open succeeds; every re-open is rejected, as it would be while the
		// config entry is still reloading (`not_ready`).
		const subscribeMessage = vi
			.fn()
			.mockImplementationOnce((callback: any) => {
				openCb = callback;
				return Promise.resolve(vi.fn());
			})
			.mockImplementation(() => Promise.reject(new Error("not_ready")));
		const hass = { connection: { subscribeMessage } };

		store.subscribe(hass, "devRetry", vi.fn());
		await vi.advanceTimersByTimeAsync(0);
		expect(subscribeMessage).toHaveBeenCalledTimes(1);

		openCb({ available: false, closed: true });
		await vi.advanceTimersByTimeAsync(PAST_ALL_BACKOFF_MS);

		// 1 initial open + REOPEN_MAX_ATTEMPTS retried re-opens, then it gives up
		// rather than hammering a backend that may never come back.
		const attempts = subscribeMessage.mock.calls.length - 1;
		expect(attempts).toBe(5);

		await vi.advanceTimersByTimeAsync(PAST_ALL_BACKOFF_MS);
		expect(subscribeMessage.mock.calls.length - 1).toBe(attempts);
	});

	it("cancels a pending re-open when the last listener unsubscribes", async () => {
		const store = makeStore();
		const h = makeReopenableHass();
		const off = store.subscribe(h.hass, "devCancel", vi.fn());
		await vi.advanceTimersByTimeAsync(0);

		h.emit({ available: false, closed: true });
		off();

		await vi.advanceTimersByTimeAsync(PAST_ALL_BACKOFF_MS);
		// Nobody is watching this device: no subscription may be opened for it.
		expect(h.opens()).toBe(1);
	});

	it("does not schedule a retry when the last listener leaves while a re-open is in flight", async () => {
		const store = makeStore();
		let openCb!: (msg: any) => void;
		let rejectOpen!: (err: Error) => void;
		const subscribeMessage = vi
			.fn()
			.mockImplementationOnce((callback: any) => {
				openCb = callback;
				return Promise.resolve(vi.fn());
			})
			.mockImplementationOnce(
				() =>
					new Promise<() => void>((_res, rej) => {
						rejectOpen = rej;
					}),
			);
		const hass = { connection: { subscribeMessage } };

		const off = store.subscribe(hass, "devInflightReopen", vi.fn());
		await vi.advanceTimersByTimeAsync(0);
		openCb({ available: false, closed: true });
		await vi.advanceTimersByTimeAsync(PAST_ALL_BACKOFF_MS);
		expect(subscribeMessage).toHaveBeenCalledTimes(2);

		// Last listener leaves, THEN the in-flight re-open rejects: its retry must
		// not resurrect a stream for a device nobody is watching.
		off();
		rejectOpen(new Error("not_ready"));
		await vi.advanceTimersByTimeAsync(PAST_ALL_BACKOFF_MS);
		expect(subscribeMessage).toHaveBeenCalledTimes(2);
	});

	it("cancels a pending re-open when the connection is swapped (the reconnect path reopens)", async () => {
		const store = makeStore();
		const h = makeReopenableHass();
		store.subscribe(h.hass, "devSwap", vi.fn());
		await vi.advanceTimersByTimeAsync(0);
		h.emit({ available: false, closed: true });

		const conn2 = { subscribeMessage: vi.fn(async () => vi.fn()) };
		store.subscribe({ connection: conn2 }, "devSwap", vi.fn());
		await vi.advanceTimersByTimeAsync(PAST_ALL_BACKOFF_MS);

		// The reconnect already reopened on conn2; the stale re-open must not fire.
		expect(h.opens()).toBe(1);
		expect(conn2.subscribeMessage).toHaveBeenCalledTimes(1);
	});

	it("does not re-subscribe on an ordinary available:false (device flap — the backend re-arms that stream)", async () => {
		const store = makeStore();
		const h = makeReopenableHass();
		const l = vi.fn();
		const off = store.subscribe(h.hass, "devFlap", l);
		await vi.advanceTimersByTimeAsync(0);

		h.emit({ available: false });
		await vi.advanceTimersByTimeAsync(PAST_ALL_BACKOFF_MS);

		expect(h.opens()).toBe(1);
		expect(h.unsubs[0]).not.toHaveBeenCalled();
		expect(l).toHaveBeenLastCalledWith({ value: 0, available: false });
		off();
	});
});
