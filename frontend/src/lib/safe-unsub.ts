export type Unsubscribe = () => void;

/**
 * Invoke an unsubscribe callback, swallowing any error it throws.
 *
 * HA's WebSocket connection commonly raises "Unknown subscription" /
 * connection-already-gone errors during teardown or reconnect — these are
 * benign and would otherwise propagate out of cleanup paths. Unexpected
 * errors are logged at debug level so they remain visible in DevTools
 * without breaking dispose flows.
 */
export function safeUnsub(unsub: Unsubscribe | undefined | null): void {
	if (!unsub) return;
	try {
		unsub();
	} catch (e) {
		console.debug("safeUnsub: callback threw (ignored):", e);
	}
}
