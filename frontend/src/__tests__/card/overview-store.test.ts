import { describe, expect, it, vi } from "vitest";
import { subscribeOverview } from "../../card/overview-store.js";

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

describe("OverviewStore", () => {
	it("opens one subscription and replays cached state to a second subscriber", async () => {
		const h = makeHass();
		const a = vi.fn();
		const off1 = subscribeOverview(h.hass, "dev1", a);
		await Promise.resolve();
		h.emit({ snapshot: { calibration: { room_width: 3000 } } });
		h.emit({
			targets: [],
			sensors: {},
			zones: { occupancy: {}, target_counts: {}, frame_count: 1 },
		});

		const b = vi.fn();
		const off2 = subscribeOverview(h.hass, "dev1", b);
		// second subscriber immediately receives the cached snapshot + data
		const last = b.mock.calls.at(-1)![0];
		expect(last.snapshot).toEqual({ calibration: { room_width: 3000 } });
		expect(last.data.zones.frame_count).toBe(1);
		// still only ONE websocket subscription for the shared device
		expect(h.subscribeMessage).toHaveBeenCalledTimes(1);
		off1();
		off2();
	});

	it("tears down the subscription only when the last subscriber leaves", async () => {
		const h = makeHass();
		const off1 = subscribeOverview(h.hass, "dev2", vi.fn());
		const off2 = subscribeOverview(h.hass, "dev2", vi.fn());
		await Promise.resolve();
		off1();
		expect(h.unsub).not.toHaveBeenCalled();
		off2();
		expect(h.unsub).toHaveBeenCalledTimes(1);
	});

	it("keeps separate subscriptions for different devices", async () => {
		const h = makeHass();
		subscribeOverview(h.hass, "devA", vi.fn());
		subscribeOverview(h.hass, "devB", vi.fn());
		expect(h.subscribeMessage).toHaveBeenCalledTimes(2);
	});

	it("marks unavailable on an available:false event", async () => {
		const h = makeHass();
		const l = vi.fn();
		subscribeOverview(h.hass, "devC", l);
		await Promise.resolve();
		h.emit({ available: false });
		expect(l.mock.calls.at(-1)![0].available).toBe(false);
	});

	it("calls unsub if the last subscriber leaves before subscribeMessage resolves", async () => {
		// Deferred mock: control exactly when the subscribeMessage promise resolves.
		const unsub = vi.fn();
		let resolve!: (u: () => void) => void;
		const subscribeMessage = vi.fn(
			() =>
				new Promise<() => void>((r) => {
					resolve = r;
				}),
		);
		const hass = { connection: { subscribeMessage } };

		const off = subscribeOverview(hass, "devRace", vi.fn());
		// Unsubscribe synchronously, BEFORE the promise resolves.
		off();
		// Now the in-flight subscription resolves with its unsub.
		resolve(unsub);
		await Promise.resolve();
		// The resolved unsub must be called so the backend session is not leaked.
		expect(unsub).toHaveBeenCalledTimes(1);
	});

	it("ignores message shapes it does not recognise", async () => {
		const h = makeHass();
		const l = vi.fn();
		subscribeOverview(h.hass, "devUnknown", l);
		await Promise.resolve();
		const before = l.mock.calls.length;
		h.emit({ something: "unexpected" }); // matches no known shape
		h.emit(null); // non-object guard
		// No further state emissions for unrecognised frames.
		expect(l.mock.calls.length).toBe(before);
	});

	it("marks disconnected and unavailable when the open rejects", async () => {
		const subscribeMessage = vi.fn(() => Promise.reject(new Error("boom")));
		const hass = { connection: { subscribeMessage } };
		const l = vi.fn();
		subscribeOverview(hass, "devReject", l);
		await Promise.resolve();
		await Promise.resolve();
		const last = l.mock.calls.at(-1)![0];
		expect(last.connected).toBe(false);
		expect(last.available).toBe(false);
	});

	it("reopens on a fresh connection and resets connected during reconnect", async () => {
		const h = makeHass();
		const l = vi.fn();
		subscribeOverview(h.hass, "devReconnect", l);
		await Promise.resolve();
		h.emit({ snapshot: { calibration: {} } }); // connected: true via snapshot
		// Sanity: the snapshot has driven connected to true.
		expect(l.mock.calls.at(-1)![0].connected).toBe(true);
		const callsBeforeReconnect = l.mock.calls.length;

		// HA hands us a fresh connection object (reconnect).
		const conn2 = { subscribeMessage: vi.fn(async () => vi.fn()) };
		const hass2 = { connection: conn2 };
		subscribeOverview(hass2, "devReconnect", vi.fn());

		// The old connection's subscription was torn down.
		expect(h.unsub).toHaveBeenCalledTimes(1);
		// The new connection was used to reopen.
		expect(conn2.subscribeMessage).toHaveBeenCalledTimes(1);
		// During the reconnect window (after the true snapshot) listeners saw
		// connected flip back to false rather than a stale true.
		const reconnectCalls = l.mock.calls.slice(callsBeforeReconnect);
		expect(reconnectCalls.some((c) => c[0].connected === false)).toBe(true);
	});

	it("calls stale unsub when connection changes before in-flight subscribeMessage resolves", async () => {
		// Reproduces the reconnect-during-in-flight-open leak:
		// conn A's subscribeMessage promise is held; before it resolves, conn B
		// opens a second subscription.  When conn A's promise DOES resolve its
		// unsub must be called immediately — not stored on the entry — because
		// entry.connection has already advanced to conn B.

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

		// conn B resolves immediately so openWs for B completes synchronously.
		const unsubB = vi.fn();
		const connB = {
			subscribeMessage: vi.fn(() => Promise.resolve(unsubB)),
		};
		const hassB = { connection: connB };

		// Subscribe with conn A — promise is in-flight, NOT resolved yet.
		subscribeOverview(hassA, "devInflight", vi.fn());

		// Before conn A resolves, a new hass with conn B triggers the reconnect branch.
		// closeWs sees entry.unsubWs===null (A hasn't resolved) → sets entry.closing=true.
		// openWs for B immediately resets entry.closing=false and sets entry.connection=connB.
		subscribeOverview(hassB, "devInflight", vi.fn());

		// Let conn B's promise resolve.
		await Promise.resolve();

		// Now resolve conn A's deferred promise.
		resolveA(unsubA);
		await Promise.resolve();

		// The stale conn A unsub MUST have been called to avoid a backend leak.
		expect(unsubA).toHaveBeenCalledTimes(1);
	});
});
