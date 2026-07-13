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
	// Long enough to drain the whole backoff schedule of a re-open that succeeds.
	const PAST_ALL_BACKOFF_MS = 120_000;
	// The delay the backoff must not exceed, however long the reload takes.
	const REOPEN_CAP_MS = 30_000;

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

	/** First open succeeds; every re-open rejects with `err`. Records the fake-clock
	 *  time of each open so the backoff schedule can be asserted exactly. */
	function makeFailingReopenHass(err: unknown) {
		let openCb!: (msg: any) => void;
		let calls = 0;
		const times: number[] = [];
		const subscribeMessage = vi.fn((callback: any) => {
			times.push(Date.now());
			calls += 1;
			if (calls === 1) {
				openCb = callback;
				return Promise.resolve(vi.fn());
			}
			return Promise.reject(err);
		});
		return {
			hass: { connection: { subscribeMessage } },
			subscribeMessage,
			/** Delay before each re-open attempt. */
			delays: () => times.slice(1).map((t, i) => t - times[i]),
			attempts: () => calls - 1,
			/** Deliver a `closed` on the FIRST open's handler (the manager tore the
			 *  stream down; that handler outlives its unsubscribe round-trip). */
			close: () => openCb({ available: false, closed: true }),
		};
	}

	beforeEach(() => {
		vi.useFakeTimers();
		// Deterministic jitter, so the backoff schedule is exactly assertable.
		vi.spyOn(Math, "random").mockReturnValue(0);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
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

	it("re-opens once, without restarting the backoff, when a second closed message arrives while a re-open is pending", async () => {
		const store = makeStore();
		const h = makeFailingReopenHass({ code: "not_ready" });
		const off = store.subscribe(h.hass, "devDoubleClosed", vi.fn());
		await vi.advanceTimersByTimeAsync(0);

		// Every re-open is rejected (the entry is still reloading), so the backoff
		// grows: attempts land at +0.5s, +1.5s and +3.5s, the next is due at +7.5s.
		h.close();
		await vi.advanceTimersByTimeAsync(4_000);
		expect(h.attempts()).toBe(3);

		// The closed subscription can still deliver a queued message (the HA client
		// drops the local handler only once its unsubscribe round-trips). That must
		// not restart the backoff — otherwise the delay collapses back to 0.5s and
		// the retry budget is spent hammering a backend that is still coming up.
		h.close();
		await vi.advanceTimersByTimeAsync(1_000);
		expect(h.attempts()).toBe(3);

		// ...and the already-pending re-open still fires, exactly once, on schedule.
		await vi.advanceTimersByTimeAsync(3_000);
		expect(h.attempts()).toBe(4);
		expect(h.delays()).toEqual([500, 1000, 2000, 4000]);
		off();
	});

	it("drops a late re-open resolve superseded by a second re-open on the same connection", async () => {
		const store = makeStore();
		let openCb!: (msg: any) => void;
		let resolveStale!: (u: () => void) => void;
		const unsubFirst = vi.fn();
		const unsubStale = vi.fn();
		const unsubLive = vi.fn();
		const subscribeMessage = vi
			.fn()
			.mockImplementationOnce((callback: any) => {
				openCb = callback;
				return Promise.resolve(unsubFirst);
			})
			.mockImplementationOnce(
				() =>
					new Promise<() => void>((r) => {
						resolveStale = r;
					}),
			)
			.mockImplementationOnce(() => Promise.resolve(unsubLive));
		const hass = { connection: { subscribeMessage } };

		const off = store.subscribe(hass, "devDoubleOpen", vi.fn());
		await vi.advanceTimersByTimeAsync(0);
		openCb({ available: false, closed: true });
		expect(unsubFirst).toHaveBeenCalledTimes(1);

		// Re-open #1 has fired and is still in flight...
		await vi.advanceTimersByTimeAsync(600);
		expect(subscribeMessage).toHaveBeenCalledTimes(2);

		// ...when a queued `closed` arrives on the old handler: it schedules re-open
		// #2, which opens and resolves FIRST, on the SAME connection object.
		openCb({ available: false, closed: true });
		await vi.advanceTimersByTimeAsync(600);
		expect(subscribeMessage).toHaveBeenCalledTimes(3);

		// Re-open #1 now resolves, superseded. Storing its unsub would overwrite the
		// live one, leaking a backend subscription (and its subscriber count, which
		// gates the device's emission pipeline) plus a duplicate message handler.
		resolveStale(unsubStale);
		await vi.advanceTimersByTimeAsync(0);
		expect(unsubStale).toHaveBeenCalledTimes(1);
		expect(unsubLive).not.toHaveBeenCalled();

		// The live subscription is the one the entry holds, and it is closed on exit.
		off();
		expect(unsubLive).toHaveBeenCalledTimes(1);
	});

	it("keeps retrying a rejected re-open for as long as a listener remains", async () => {
		const store = makeStore();
		const h = makeFailingReopenHass({ code: "not_ready" });
		const off = store.subscribe(h.hass, "devRetryForever", vi.fn());
		await vi.advanceTimersByTimeAsync(0);

		h.close();
		// Far past the old 5-attempt (~16s) budget: a reload slower than that must
		// still be recovered from, or the card is stranded on the offline banner.
		await vi.advanceTimersByTimeAsync(10 * 60_000);
		const attempts = h.attempts();
		expect(attempts).toBeGreaterThan(15);

		// Still trying.
		await vi.advanceTimersByTimeAsync(5 * 60_000);
		expect(h.attempts()).toBeGreaterThan(attempts);
		off();
	});

	it("caps the re-open backoff delay instead of growing it without bound", async () => {
		const store = makeStore();
		const h = makeFailingReopenHass({ code: "not_ready" });
		const off = store.subscribe(h.hass, "devBackoffCap", vi.fn());
		await vi.advanceTimersByTimeAsync(0);

		h.close();
		await vi.advanceTimersByTimeAsync(5 * 60_000);

		const delays = h.delays();
		expect(delays.slice(0, 6)).toEqual([500, 1000, 2000, 4000, 8000, 16_000]);
		// One websocket call per device per cap interval, only while a card is open.
		expect(delays.slice(6)).not.toHaveLength(0);
		expect(delays.slice(6).every((d) => d === REOPEN_CAP_MS)).toBe(true);
		off();
	});

	it("stops retrying on a terminal device_not_found rejection", async () => {
		const store = makeStore();
		const h = makeFailingReopenHass({
			code: "device_not_found",
			message: "Device not found",
		});
		const off = store.subscribe(h.hass, "devGone", vi.fn());
		await vi.advanceTimersByTimeAsync(0);

		h.close();
		await vi.advanceTimersByTimeAsync(10 * 60_000);

		// The card's configured device_id will never resolve again (the device was
		// removed): retrying it can only ever fail.
		expect(h.attempts()).toBe(1);
		off();
	});

	it("keeps retrying when the rejection has an unknown, absent or non-object error code", async () => {
		// An unrecognised failure shape must never be treated as terminal — that
		// would strand the card exactly as a spent budget does.
		const errors: unknown[] = [
			{ code: "kaboom", message: "unknown code" },
			{ message: "no code at all" },
			new Error("transport blew up"),
			"not even an object",
			null,
		];

		for (const [i, err] of errors.entries()) {
			const store = makeStore();
			const h = makeFailingReopenHass(err);
			const off = store.subscribe(h.hass, `devUnknownErr${i}`, vi.fn());
			await vi.advanceTimersByTimeAsync(0);

			h.close();
			await vi.advanceTimersByTimeAsync(PAST_ALL_BACKOFF_MS);

			expect(h.attempts()).toBeGreaterThan(5);
			off();
		}
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
