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
		if (next === null) return;
		entry.state = next;
		emit(entry);
	}

	function openWs(
		hass: { connection: any },
		deviceId: string,
		entry: Entry<TState>,
	): void {
		const conn = hass.connection;
		entry.connection = conn;
		entry.closing = false;
		conn
			.subscribeMessage((msg: unknown) => handleMsg(entry, msg), {
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
			});
	}

	function closeWs(entry: Entry<TState>): void {
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
