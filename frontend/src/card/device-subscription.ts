/**
 * Generic per-device subscription controller. Wraps ONE stream's
 * unsub/connection/device triple plus the identity-guarded (re)subscribe and
 * teardown logic shared by the overview and heatmap subscriptions on the
 * card: re-evaluating on every `hass`/config update must not reopen a live
 * subscription unless the connection, device, or `enabled()` gate actually
 * changed.
 */

export interface DeviceSubscriptionOptions<TData> {
	getHass: () => { connection: unknown } | undefined;
	getDeviceId: () => string | undefined;
	/** Extra gate beyond hass+deviceId. Defaults to always-enabled. */
	enabled?: () => boolean;
	subscribeFn: (
		hass: { connection: unknown },
		deviceId: string,
		onData: (data: TData) => void,
	) => () => void;
	onData: (data: TData) => void;
	/**
	 * Runs ONCE per NEW subscription, before `subscribeFn` is called. Does NOT
	 * run on a no-op `ensure()` or on teardown.
	 */
	onResubscribe?: () => void;
}

export class DeviceSubscription<TData> {
	private _unsub: (() => void) | null = null;
	private _conn: unknown = null;
	private _device: string | null = null;

	constructor(private _opts: DeviceSubscriptionOptions<TData>) {}

	/** Re-evaluate hass/deviceId/enabled() and (re)subscribe or tear down as needed. */
	ensure(): void {
		const hass = this._opts.getHass();
		const deviceId = this._opts.getDeviceId();
		const wanted =
			!!hass &&
			!!deviceId &&
			(this._opts.enabled ? this._opts.enabled() : true);
		if (!wanted) {
			this._teardown();
			return;
		}
		if (
			this._unsub &&
			this._conn === hass.connection &&
			this._device === deviceId
		) {
			return;
		}
		this._unsub?.();
		this._conn = hass.connection;
		this._device = deviceId;
		this._opts.onResubscribe?.();
		this._unsub = this._opts.subscribeFn(
			hass as { connection: unknown },
			deviceId,
			this._opts.onData,
		);
	}

	/** Unsubscribe and reset internal state. */
	dispose(): void {
		this._teardown();
	}

	private _teardown(): void {
		this._unsub?.();
		this._unsub = null;
		this._conn = null;
		this._device = null;
	}
}
