type Listener = (cells: number[]) => void;

interface Entry {
	cells: number[];
	listeners: Set<Listener>;
	unsubWs: (() => void) | null;
	connection: unknown;
	// True while a websocket open is in flight whose entry has been torn down
	// (last subscriber left before subscribeMessage resolved). The pending
	// promise checks this on resolve and calls unsub immediately, so the
	// backend subscription is not leaked.
	closing: boolean;
}

const registry = new Map<string, Entry>();

function emit(entry: Entry): void {
	for (const listener of entry.listeners) listener(entry.cells);
}

function handleMsg(entry: Entry, msg: unknown): void {
	if (!msg || typeof msg !== "object") return;
	const m = msg as Record<string, unknown>;
	entry.cells = (m.cells as number[] | undefined) ?? [];
	emit(entry);
}

function openWs(
	hass: { connection: any },
	deviceId: string,
	entry: Entry,
): void {
	const conn = hass.connection;
	entry.connection = conn;
	entry.closing = false;
	conn
		.subscribeMessage((msg: unknown) => handleMsg(entry, msg), {
			type: "eppgrid/overview/subscribe_heatmap",
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
		})
		.catch(() => {
			// Heatmap is an optional overlay stream — a failed subscribe just
			// means no cells arrive; nothing to surface here.
		});
}

function closeWs(entry: Entry): void {
	if (entry.unsubWs) {
		entry.unsubWs();
		entry.unsubWs = null;
	} else {
		// No unsub yet — the open is still in flight. Flag it so the pending
		// promise calls unsub on resolve instead of storing it on a dead entry.
		entry.closing = true;
	}
}

/**
 * Subscribe to a device's live activity-heatmap cells. All callers for the
 * same device_id (from the single card bundle) share one websocket
 * subscription. The listener is invoked immediately with the current cached
 * cells, then on every update. Returns an unsubscribe function; the last
 * unsubscribe closes the stream.
 */
export function subscribeHeatmap(
	hass: { connection: unknown },
	deviceId: string,
	listener: Listener,
): () => void {
	let entry = registry.get(deviceId);
	if (!entry) {
		entry = {
			cells: [],
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
		openWs(hass as { connection: any }, deviceId, entry);
	}

	entry.listeners.add(listener);
	listener(entry.cells); // replay cached cells to the new subscriber

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
