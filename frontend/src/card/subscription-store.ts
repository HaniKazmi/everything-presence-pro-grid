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

type Listener<TState> = (state: TState) => void;

// A `closed: true` message means the manager tore this stream down (config entry
// reload/unload). The websocket subscription is still open but nothing behind it
// is alive, so the client must re-subscribe to register a stream with the NEW
// manager. That manager is not up yet — the entry is mid-reload and the WS
// command answers `not_ready` — so re-open on a bounded backoff:
// 0.5s, 1s, 2s, 4s, 8s (+jitter), i.e. give up after ~16s rather than hammer a
// backend that is never coming back (integration removed).
const REOPEN_MAX_ATTEMPTS = 5;
const REOPEN_BASE_DELAY_MS = 500;
const REOPEN_MAX_DELAY_MS = 8000;
// Spreads the re-opens of many cards/devices that all saw the same reload.
const REOPEN_JITTER_MS = 250;

interface Entry<TState> {
	state: TState;
	listeners: Set<Listener<TState>>;
	unsubWs: (() => void) | null;
	connection: unknown;
	// True while a websocket open is in flight whose entry has been torn down
	// (last subscriber left before subscribeMessage resolved). The pending
	// promise checks this on resolve and calls unsub immediately, so the
	// backend subscription is not leaked.
	closing: boolean;
	// Pending re-open after a `closed` message. One timer per entry, so a device
	// with two cards re-opens exactly once; cancelled by closeWs (last listener
	// left, or the connection was swapped and the reconnect path reopens).
	reopenTimer: ReturnType<typeof setTimeout> | null;
	reopenAttempts: number;
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

	function handleMsg(
		entry: Entry<TState>,
		deviceId: string,
		msg: unknown,
	): void {
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
		if (m.closed === true) reopen(entry, deviceId);
	}

	// Cached state and listeners are deliberately left intact: the card keeps
	// rendering its last frame plus the offline banner until frames resume, and
	// its listeners never notice the swap.
	function reopen(entry: Entry<TState>, deviceId: string): void {
		// A re-open is already pending. The closed subscription can still deliver a
		// queued message (the HA websocket client drops the local handler only once
		// its unsubscribe round-trips), so a second `closed` must not restart the
		// backoff or open a second subscription for this device.
		if (entry.reopenTimer !== null) return;
		closeWs(entry);
		entry.reopenAttempts = 0;
		scheduleReopen(entry, deviceId);
	}

	function scheduleReopen(entry: Entry<TState>, deviceId: string): void {
		// The entry can be torn down while a re-open is in flight (last listener
		// leaves, then the open rejects into the retry path). Never open a
		// subscription for a device nobody is watching — that leaks a backend
		// stream and its subscriber count.
		if (registry.get(deviceId) !== entry) return;
		if (entry.reopenAttempts >= REOPEN_MAX_ATTEMPTS) return;

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
				openWs({ connection: conn }, deviceId, entry, () =>
					scheduleReopen(entry, deviceId),
				);
			},
			backoff + Math.random() * REOPEN_JITTER_MS,
		);
	}

	function openWs(
		hass: { connection: any },
		deviceId: string,
		entry: Entry<TState>,
		onFailure?: () => void,
	): void {
		const conn = hass.connection;
		entry.connection = conn;
		entry.closing = false;
		conn
			.subscribeMessage((msg: unknown) => handleMsg(entry, deviceId, msg), {
				type: wireType,
				device_id: deviceId,
			})
			.then((unsub: () => void) => {
				// If the entry was torn down (last subscriber left, or it was
				// reopened on a fresh connection) while this open was in flight,
				// drop the resolved subscription immediately so it isn't leaked.
				// The connection check catches the reconnect-during-in-flight case:
				// when openWs is called again for a new connection, entry.connection
				// advances to conn2, so this stale conn1 resolve sees the mismatch
				// and calls unsub() instead of storing it.
				if (
					entry.closing ||
					entry.connection !== conn ||
					registry.get(deviceId) !== entry
				) {
					unsub();
					return;
				}
				entry.unsubWs = unsub;
				applyHook(entry, onOpen);
			})
			.catch(() => {
				applyHook(entry, onError);
				onFailure?.();
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
		if (entry.unsubWs) {
			entry.unsubWs();
			entry.unsubWs = null;
		} else {
			// No unsub yet — the open is still in flight. Flag it so the pending
			// promise calls unsub on resolve instead of storing it on a dead entry.
			entry.closing = true;
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
				state: initialState(),
				listeners: new Set(),
				unsubWs: null,
				connection: null,
				closing: false,
				reopenTimer: null,
				reopenAttempts: 0,
			};
			registry.set(deviceId, entry);
			openWs(hass as { connection: any }, deviceId, entry);
		} else if (entry.connection !== hass.connection) {
			// Reconnect: HA handed us a fresh connection — reopen for all listeners.
			closeWs(entry);
			applyHook(entry, onReconnect);
			openWs(hass as { connection: any }, deviceId, entry);
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
