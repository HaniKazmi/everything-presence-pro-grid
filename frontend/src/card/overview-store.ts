import type { SensorState } from "../components/epp-live-sidebar.js";

export interface OverviewData {
	targets: unknown[];
	sensors: SensorState;
	zones: {
		occupancy: Record<number, boolean>;
		target_counts: Record<number, number>;
		frame_count: number;
	};
}

export interface OverviewState {
	snapshot: unknown | null;
	data: OverviewData | null;
	available: boolean;
	connected: boolean;
}

type Listener = (state: OverviewState) => void;

interface Entry {
	state: OverviewState;
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
	for (const listener of entry.listeners) listener(entry.state);
}

function handleMsg(entry: Entry, msg: unknown): void {
	if (!msg || typeof msg !== "object") return;
	const m = msg as Record<string, unknown>;
	if ("snapshot" in m) {
		entry.state = { ...entry.state, snapshot: m.snapshot, connected: true };
	} else if ("available" in m && !("targets" in m)) {
		entry.state = { ...entry.state, available: m.available as boolean };
	} else if ("targets" in m) {
		// Extract only the OverviewData fields so wire-only keys (id/type/etc.)
		// don't leak into the cached state.
		entry.state = {
			...entry.state,
			data: {
				targets: m.targets as unknown[],
				sensors: m.sensors as OverviewData["sensors"],
				zones: m.zones as OverviewData["zones"],
			},
			available: true,
		};
	} else {
		return;
	}
	emit(entry);
}

function openWs(
	hass: { connection: any },
	deviceId: string,
	entry: Entry,
): void {
	entry.connection = hass.connection;
	entry.closing = false;
	hass.connection
		.subscribeMessage((msg: unknown) => handleMsg(entry, msg), {
			type: "eppgrid/overview/subscribe",
			device_id: deviceId,
		})
		.then((unsub: () => void) => {
			// If the entry was torn down (last subscriber left, or it was
			// reopened on a fresh connection) while this open was in flight,
			// drop the resolved subscription immediately so it isn't leaked.
			if (entry.closing || registry.get(deviceId) !== entry) {
				unsub();
				return;
			}
			entry.unsubWs = unsub;
			entry.state = { ...entry.state, connected: true };
			emit(entry);
		})
		.catch(() => {
			entry.state = { ...entry.state, connected: false, available: false };
			emit(entry);
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
 * Subscribe to a device's live overview. All callers for the same device_id
 * (from the single card bundle) share one websocket subscription. The listener
 * is invoked immediately with the current cached state, then on every update.
 * Returns an unsubscribe function; the last unsubscribe closes the stream.
 */
export function subscribeOverview(
	hass: { connection: unknown },
	deviceId: string,
	listener: Listener,
): () => void {
	let entry = registry.get(deviceId);
	if (!entry) {
		entry = {
			// available starts true so the card doesn't flash "offline" before
			// the first frame (or an available:false event) arrives.
			state: { snapshot: null, data: null, available: true, connected: false },
			listeners: new Set(),
			unsubWs: null,
			connection: null,
			closing: false,
		};
		registry.set(deviceId, entry);
		openWs(hass as { connection: any }, deviceId, entry);
	} else if (entry.connection !== hass.connection) {
		// Reconnect: HA handed us a fresh connection — reopen for all listeners.
		// Flip connected to false first so listeners see the connection
		// re-establishing rather than a stale true from the dead connection.
		closeWs(entry);
		entry.state = { ...entry.state, connected: false };
		emit(entry);
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
