import { createSubscriptionStore } from "./subscription-store.js";

const store = createSubscriptionStore<number[]>({
	wireType: "eppgrid/overview/subscribe_heatmap",
	initialState: () => [],
	// A message without `cells` (the backend's `{closed: true}` teardown signal,
	// or anything added later) must be ignored, not blank a live overlay.
	reduce: (_state, m) => ("cells" in m ? (m.cells as number[]) : null),
	// No onOpen/onReconnect/onError: the heatmap resolve just stores the
	// unsub (no emit), its reconnect is a bare closeWs+openWs (no emit), and
	// its catch is a silent no-op — heatmap is an optional overlay stream, a
	// failed subscribe just means no cells arrive.
});

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
	listener: (cells: number[]) => void,
): () => void {
	return store.subscribe(hass, deviceId, listener);
}
