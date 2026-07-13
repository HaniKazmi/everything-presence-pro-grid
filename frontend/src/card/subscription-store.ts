/**
 * Generic per-device subscription-store factory.
 *
 * Both overview-store.ts and heatmap-store.ts are per-device subscription
 * stores that share ONE websocket subscription across all callers of the
 * same device_id, cache the latest state, replay it to new subscribers, and
 * reopen on reconnect. This factory captures that shared machinery; each
 * store supplies its wire type, initial-state thunk, message reducer, and
 * optional lifecycle hooks.
 */

import { safeUnsub } from "../lib/safe-unsub.js";

type Listener<TState> = (state: TState) => void;

// A `closed: true` message means the manager tore this stream down (config entry
// reload/unload). The websocket subscription is still open but nothing behind it
// is alive, so the client must re-subscribe to register a stream with the NEW
// manager. That manager is not up yet — the entry is mid-reload and the WS
// command answers `not_ready` — so re-open on an exponential backoff with jitter:
// 0.5s, 1s, 2s, 4s, 8s, 16s, then every 30s.
//
// The retries are NOT capped in number. A card left on a dashboard has no other
// recovery trigger — short of a websocket reconnect or a remount, which is the
// #334 freeze itself — so it must keep trying for as long as anyone is watching
// the device, however slow the reload was on a busy host. The DELAY is capped
// instead: 30s bounds how stale a recovered card can be to one cap interval past
// the backend coming up (an offline banner for up to ~30s is acceptable), at a
// steady-state cost of two websocket calls per device per minute, and only while
// a card is actually on screen. A 60s cap would halve that chatter but double the
// worst-case staleness, which is the wrong trade for the symptom we are fixing.
const REOPEN_BASE_DELAY_MS = 500;
const REOPEN_MAX_DELAY_MS = 30_000;
// Spreads the re-opens of many cards/devices that all saw the same reload.
const REOPEN_JITTER_MS = 250;

// Wire codes on which retrying can never succeed. `device_not_found`: the card's
// configured device_id no longer resolves (the device was removed), so every
// re-open would be rejected forever — including the `_on_device_removed` teardown
// path, which puts `closed` on the wire precisely because the device is gone.
// Everything else is transient and must keep retrying: `not_ready` (the entry is
// still reloading) above all, but also an unrecognised code, a rejection with no
// code, or a non-object rejection — never strand the card on a shape we did not
// expect.
const TERMINAL_REOPEN_CODES = new Set(["device_not_found"]);

/** home-assistant-js-websocket rejects with the wire error object ({code, message}). */
function isTerminalError(err: unknown): boolean {
	if (!err || typeof err !== "object") return false;
	const code = (err as { code?: unknown }).code;
	return typeof code === "string" && TERMINAL_REOPEN_CODES.has(code);
}

interface Entry<TState> {
	// The registry key this entry is filed under. Held on the entry so every
	// re-open path (which only ever has the entry to hand) can reach it without
	// threading it through as a parameter.
	deviceId: string;
	state: TState;
	listeners: Set<Listener<TState>>;
	unsubWs: (() => void) | null;
	connection: unknown;
	// Monotonic open counter. openWs takes a token before it awaits and re-checks
	// it on resolve; BOTH openWs and closeWs advance it, so any later open or
	// teardown supersedes an in-flight one, which then drops its subscription
	// instead of storing it. A plain "is this the current connection?" check cannot
	// do that: two opens can race on the SAME connection object (a re-open still in
	// flight when a second `closed` schedules another), and both would store their
	// unsub — leaking a backend subscription, its subscriber count (which gates the
	// device's emission pipeline) and a duplicate message handler.
	openGen: number;
	// Pending re-open after a `closed` message. One timer per entry, so a device
	// with two cards re-opens exactly once; cancelled by closeWs (last listener
	// left, or the connection was swapped and the reconnect path reopens).
	reopenTimer: ReturnType<typeof setTimeout> | null;
	reopenAttempts: number;
	// Parked on a terminal rejection (device_not_found): no subscription, no
	// timer, nothing retries it on its own. A LATER mount revives it — a
	// re-added device keeps its device_id (the registry keys on the mac
	// identifier), so a fresh `subscribe()` is the one signal that a retry
	// might now succeed. Cleared in openWs, so every open path resets it.
	dead: boolean;
}

export interface SubscriptionStoreConfig<TState> {
	/** eppgrid websocket command string. */
	wireType: string;
	/** Fresh initial state per entry (thunk — callers needing a new array/object each time). */
	initialState: () => TState;
	/** Reduce an incoming message into a new state, or null to ignore (no emit). */
	reduce: (state: TState, msg: Record<string, unknown>) => TState | null;
	/** subscribeMessage resolved. null/absent = no state change, no emit. */
	onOpen?: (state: TState) => TState | null;
	/** Fresh connection, applied BEFORE reopen. null/absent = no emit. */
	onReconnect?: (state: TState) => TState | null;
	/** subscribeMessage rejected. null/absent = no state change, no emit. */
	onError?: (state: TState) => TState | null;
}

export interface SubscriptionStore<TState> {
	/**
	 * Subscribe to a device's live stream. All callers for the same device_id
	 * (from the single card bundle) share one websocket subscription. The
	 * listener is invoked immediately with the current cached state, then on
	 * every update. Returns an unsubscribe function; the last unsubscribe
	 * closes the stream.
	 */
	subscribe(
		hass: { connection: unknown },
		deviceId: string,
		listener: Listener<TState>,
	): () => void;
}

export function createSubscriptionStore<TState>(
	config: SubscriptionStoreConfig<TState>,
): SubscriptionStore<TState> {
	const { wireType, initialState, reduce, onOpen, onReconnect, onError } =
		config;
	const registry = new Map<string, Entry<TState>>();

	function emit(entry: Entry<TState>): void {
		for (const listener of entry.listeners) listener(entry.state);
	}

	function applyHook(
		entry: Entry<TState>,
		hook: ((state: TState) => TState | null) | undefined,
	): void {
		if (!hook) return;
		const next = hook(entry.state);
		if (next === null) return;
		entry.state = next;
		emit(entry);
	}

	function handleMsg(entry: Entry<TState>, msg: unknown): void {
		if (!msg || typeof msg !== "object") return;
		const m = msg as Record<string, unknown>;
		const next = reduce(entry.state, m);
		if (next !== null) {
			entry.state = next;
			emit(entry);
		}
		// Only a manager teardown is recoverable by re-subscribing. An ordinary
		// `available: false` is a device flap: the backend still owns that stream
		// and re-arms it itself, so re-subscribing there would churn the wire and
		// defeat the durable-stream design.
		if (m.closed === true) reopen(entry);
	}

	// Cached state and listeners are deliberately left intact: the card keeps
	// rendering its last frame plus the offline banner until frames resume, and
	// its listeners never notice the swap.
	function reopen(entry: Entry<TState>): void {
		// A re-open is already pending. The closed subscription can still deliver a
		// queued message (the HA websocket client drops the local handler only once
		// its unsubscribe round-trips), so a second `closed` must not restart the
		// backoff: that would collapse the delay back to 0.5s and hammer a backend
		// that is still coming up.
		if (entry.reopenTimer !== null) return;
		closeWs(entry);
		entry.reopenAttempts = 0;
		scheduleReopen(entry);
	}

	function scheduleReopen(entry: Entry<TState>): void {
		// The entry can be torn down while a re-open is in flight (last listener
		// leaves, then the open rejects into the retry path). Never open a
		// subscription for a device nobody is watching — that leaks a backend
		// stream and its subscriber count. This is the ONLY thing that ends the
		// retry loop, apart from a terminal error.
		if (registry.get(entry.deviceId) !== entry) return;
		// One timer per entry, always. Overwriting a live `reopenTimer` would leave
		// the previous `setTimeout` armed but unreferenced, and `closeWs` can only
		// cancel the one the entry still points at: the orphan would fire after
		// teardown and open a subscription nobody owns. Callers that mean to
		// re-schedule cancel the pending timer first.
		if (entry.reopenTimer !== null) return;

		const attempt = entry.reopenAttempts++;
		const backoff = Math.min(
			REOPEN_BASE_DELAY_MS * 2 ** attempt,
			REOPEN_MAX_DELAY_MS,
		);
		// The websocket connection itself is fine (it is the config entry that
		// reloaded), so re-open on the same connection this entry is bound to.
		const conn = entry.connection;
		entry.reopenTimer = setTimeout(
			() => {
				entry.reopenTimer = null;
				openWs(conn, entry);
			},
			backoff + Math.random() * REOPEN_JITTER_MS,
		);
	}

	// EVERY open retries on failure — the first one at mount included. An HA restart
	// with a dashboard open has the card subscribing before the config entry has
	// finished setting up, so the command answers `not_ready` and the open rejects;
	// nothing else would ever retry, and the card would wear its offline banner until
	// the element remounts. That is #334 by another trigger. The retry loop is bounded
	// by the same two guards as any re-open: `isTerminalError` and `scheduleReopen`'s
	// registry-identity check.
	function openWs(conn: any, entry: Entry<TState>): void {
		entry.connection = conn;
		entry.dead = false;
		const gen = ++entry.openGen;
		conn
			.subscribeMessage((msg: unknown) => handleMsg(entry, msg), {
				type: wireType,
				device_id: entry.deviceId,
			})
			.then((unsub: () => void) => {
				// Superseded while in flight — the entry was torn down (last subscriber
				// left), the connection was swapped, or another re-open overtook this
				// one. Drop the resolved subscription instead of storing it on a dead or
				// superseded entry, or it is leaked.
				if (entry.openGen !== gen) {
					safeUnsub(unsub);
					return;
				}
				entry.unsubWs = unsub;
				applyHook(entry, onOpen);
			})
			.catch((err: unknown) => {
				// Superseded, as above: a stale open must change NOTHING — checked
				// before the onError hook, because the entry may hold a LIVE
				// subscription by now (a swap's open succeeded while this one was in
				// flight), and applying the error state would flip a healthy card to
				// its offline banner. Its retry would likewise arm a second timer
				// behind the live one's back — orphaning whichever `entry.reopenTimer`
				// no longer points at, to fire past a teardown `closeWs` cannot reach.
				if (entry.openGen !== gen) return;
				applyHook(entry, onError);
				if (isTerminalError(err)) {
					entry.dead = true;
					return;
				}
				scheduleReopen(entry);
			});
	}

	function closeWs(entry: Entry<TState>): void {
		// Single cancellation point for a pending re-open: both teardown paths (last
		// listener leaves, connection swapped) route through here, and the swap path
		// reopens on the fresh connection itself.
		if (entry.reopenTimer !== null) {
			clearTimeout(entry.reopenTimer);
			entry.reopenTimer = null;
		}
		// Supersede any open still in flight: with no unsub to call yet, this is what
		// makes its resolve drop the subscription rather than store it.
		entry.openGen++;
		if (entry.unsubWs) {
			// `safeUnsub`, because this is reachable from INSIDE a message handler
			// (handleMsg -> reopen -> closeWs) at the moment the integration is
			// unloading — precisely when HA's websocket client throws "Unknown
			// subscription". A synchronous throw here would abort `reopen()` before it
			// scheduled the retry and strand the card on its offline banner: #334 again.
			// (It guards the sync throw only; a promise-returning unsub that REJECTS is
			// no worse off than before.)
			safeUnsub(entry.unsubWs);
			entry.unsubWs = null;
		}
	}

	function subscribe(
		hass: { connection: unknown },
		deviceId: string,
		listener: Listener<TState>,
	): () => void {
		let entry = registry.get(deviceId);
		if (!entry) {
			entry = {
				deviceId,
				state: initialState(),
				listeners: new Set(),
				unsubWs: null,
				connection: null,
				openGen: 0,
				reopenTimer: null,
				reopenAttempts: 0,
				dead: false,
			};
			registry.set(deviceId, entry);
			openWs(hass.connection, entry);
		} else if (entry.connection !== hass.connection) {
			// Reconnect: HA handed us a fresh connection — reopen for all listeners.
			closeWs(entry);
			applyHook(entry, onReconnect);
			openWs(hass.connection, entry);
		} else if (entry.unsubWs === null && entry.reopenTimer !== null) {
			// Joining an entry that has no live subscription and is asleep on its
			// backoff (up to the 30s cap). A fresh mount is a natural moment to retry,
			// and this card would otherwise wear the offline banner for the rest of that
			// interval. Cancel-then-schedule, never schedule-on-top: a storm of cards
			// mounting on one device must still leave exactly ONE pending re-open.
			clearTimeout(entry.reopenTimer);
			entry.reopenTimer = null;
			entry.reopenAttempts = 0;
			scheduleReopen(entry);
		} else if (entry.dead) {
			// Joining an entry a terminal rejection parked. Revive it like a fresh
			// entry — immediately, not on the backoff: the join IS the retry signal
			// (the device may have been re-added under the same device_id), and the
			// cards already on this entry resume streaming with it. openWs clears
			// `dead`, so a storm of mounts revives exactly once; if the retry
			// terminal-fails again, the entry parks again.
			entry.reopenAttempts = 0;
			openWs(hass.connection, entry);
		}

		entry.listeners.add(listener);
		listener(entry.state); // replay cached state to the new subscriber

		return () => {
			const e = registry.get(deviceId);
			if (!e) return;
			e.listeners.delete(listener);
			if (e.listeners.size === 0) {
				closeWs(e);
				registry.delete(deviceId);
			}
		};
	}

	return { subscribe };
}
