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
	refcount: number;
	state: OverviewState;
	listeners: Set<Listener>;
	unsubWs: (() => void) | null;
	connection: unknown;
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
		entry.state = {
			...entry.state,
			data: m as unknown as OverviewData,
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
	hass.connection
		.subscribeMessage((msg: unknown) => handleMsg(entry, msg), {
			type: "eppgrid/overview/subscribe",
			device_id: deviceId,
		})
		.then((unsub: () => void) => {
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
			refcount: 0,
			state: { snapshot: null, data: null, available: true, connected: false },
			listeners: new Set(),
			unsubWs: null,
			connection: null,
		};
		registry.set(deviceId, entry);
		openWs(hass as { connection: any }, deviceId, entry);
	} else if (entry.connection !== hass.connection) {
		// Reconnect: HA handed us a fresh connection — reopen for all listeners.
		closeWs(entry);
		openWs(hass as { connection: any }, deviceId, entry);
	}

	entry.refcount += 1;
	entry.listeners.add(listener);
	listener(entry.state); // replay cached state to the new subscriber

	return () => {
		const e = registry.get(deviceId);
		if (!e) return;
		e.listeners.delete(listener);
		e.refcount -= 1;
		if (e.refcount <= 0) {
			closeWs(e);
			registry.delete(deviceId);
		}
	};
}
