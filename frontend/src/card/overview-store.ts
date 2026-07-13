import type { SensorState } from "../components/epp-live-sidebar.js";
import { createSubscriptionStore } from "./subscription-store.js";

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

const store = createSubscriptionStore<OverviewState>({
	wireType: "eppgrid/overview/subscribe",
	// available starts true so the card doesn't flash "offline" before the
	// first frame (or an available:false event) arrives.
	initialState: () => ({
		snapshot: null,
		data: null,
		available: true,
		connected: false,
	}),
	reduce: (state, m) => {
		if ("snapshot" in m) {
			return { ...state, snapshot: m.snapshot, connected: true };
		}
		if ("available" in m && !("targets" in m)) {
			return { ...state, available: m.available as boolean };
		}
		if ("targets" in m) {
			// Extract only the OverviewData fields so wire-only keys (id/type/etc.)
			// don't leak into the cached state.
			return {
				...state,
				data: {
					targets: m.targets as unknown[],
					sensors: m.sensors as OverviewData["sensors"],
					zones: m.zones as OverviewData["zones"],
				},
				available: true,
			};
		}
		return null;
	},
	onOpen: (s) => ({ ...s, connected: true }),
	// Flip connected to false first so listeners see the connection
	// re-establishing rather than a stale true from the dead connection.
	onReconnect: (s) => ({ ...s, connected: false }),
	// Idempotent — null when nothing would change. The open now rejects on EVERY
	// backoff tick, not just at mount, so a new object each time would re-emit and
	// re-render the whole card (SVG map included) every 30s, forever, for a backend
	// that never comes back.
	onError: (s) =>
		!s.connected && !s.available
			? null
			: { ...s, connected: false, available: false },
});

/**
 * Subscribe to a device's live overview. All callers for the same device_id
 * (from the single card bundle) share one websocket subscription. The listener
 * is invoked immediately with the current cached state, then on every update.
 * Returns an unsubscribe function; the last unsubscribe closes the stream.
 */
export function subscribeOverview(
	hass: { connection: unknown },
	deviceId: string,
	listener: (state: OverviewState) => void,
): () => void {
	return store.subscribe(hass, deviceId, listener);
}
