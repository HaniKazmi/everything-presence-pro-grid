export type Unsubscribe = () => void;

/**
 * Invoke an unsubscribe callback, swallowing the "stale subscription" error
 * that HA's WebSocket connection raises when the underlying connection has
 * already been torn down or reconnected.
 */
export function safeUnsub(unsub: Unsubscribe | undefined | null): void {
	if (!unsub) return;
	try {
		unsub();
	} catch {
		// stale subscription — connection already gone
	}
}
