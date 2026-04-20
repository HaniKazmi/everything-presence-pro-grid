import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { DeviceInfo, RawTarget, Target, TargetStatus } from "../types.js";

/**
 * Structured target/sensor/zone data delivered by the grid-targets subscription.
 */
export interface TargetData {
	targets: Target[];
	sensors: {
		occupancy: boolean;
		static_presence: boolean;
		motion_presence: boolean;
		target_presence: boolean;
		static_state?: string;
		motion_state?: string;
		occupancy_state?: boolean;
		illuminance: number | null;
		temperature: number | null;
		humidity: number | null;
		co2: number | null;
	};
	zones: {
		occupancy: Record<number, boolean>;
		target_counts: Record<number, number>;
		frame_count: number;
		debug_log?: string;
	} | null;
}

/**
 * DeviceController manages device discovery, selection, WebSocket session
 * lifecycle, and target/display subscriptions.
 *
 * It implements Lit's ReactiveController interface so the host element
 * re-renders when the controller's observable state changes.
 */
export class DeviceController implements ReactiveController {
	// --- Observable state ---
	devices: DeviceInfo[] = [];
	selectedMac = "";
	loading = true;

	// --- Callbacks set by the host ---
	onTargetData?: (data: TargetData) => void;
	onRawTargetData?: (targets: RawTarget[]) => void;
	onDeviceListChanged?: () => void;

	private _host: ReactiveControllerHost;
	private _hass: any = null;
	private _unsubDevice?: () => void;
	private _unsubDeviceList?: () => void;
	private _unsubTargets?: () => void;
	private _unsubDisplay?: () => void;
	private _targetRetryTimer?: ReturnType<typeof setTimeout>;
	private _reconnecting = false;
	private _connectionFailed = false;
	private _lastSelectedAvailable: boolean | null = null;

	constructor(host: ReactiveControllerHost) {
		this._host = host;
		host.addController(this);
	}

	// --- ReactiveController lifecycle ---
	hostConnected(): void {}
	hostDisconnected(): void {
		this.unsubscribeDeviceList();
		this.closeDeviceSession();
	}

	// --- Hass reference ---
	get hass(): any {
		return this._hass;
	}
	set hass(value: any) {
		const oldConn = this._hass?.connection;
		this._hass = value;
		if (value?.connection && value.connection !== oldConn && oldConn) {
			// Connection changed — stale subscriptions are dead
			this._unsubDevice = undefined;
			this._unsubTargets = undefined;
			this._unsubDisplay = undefined;
		}
	}

	// --- Public: whether a device session is currently open ---
	get hasDeviceSession(): boolean {
		return !!this._unsubDevice;
	}

	// --- Public: whether a loadDeviceConfig/openDeviceSession is in progress ---
	get reconnecting(): boolean {
		return this._reconnecting;
	}

	// --- Public: whether the last connection attempt failed ---
	get connectionFailed(): boolean {
		return this._connectionFailed;
	}

	// --- Device loading ---
	async loadDevices(): Promise<void> {
		if (!this._hass) return;
		try {
			const result = await this._hass.callWS({
				type: "eppgrid/list_devices",
			});
			this.devices = ((result as any).devices as DeviceInfo[]).sort((a, b) =>
				(a.name || "").localeCompare(b.name || ""),
			);
		} catch {
			this.devices = [];
			this._host.requestUpdate();
			return;
		}

		const stored = localStorage.getItem("epp_selected_mac");
		const match =
			stored && this.devices.find((d: DeviceInfo) => d.mac === stored);
		this.selectedMac = match ? stored! : (this.devices[0]?.mac ?? "");
		this._host.requestUpdate();
	}

	/**
	 * Subscribe to real-time device list updates from the backend.
	 * Receives the initial list immediately, then pushes updates on add/remove.
	 */
	async subscribeDeviceList(): Promise<void> {
		this.unsubscribeDeviceList();
		if (!this._hass) return;
		try {
			this._unsubDeviceList = await this._hass.connection.subscribeMessage(
				(msg: any) => {
					this._applyDeviceList(msg.devices as DeviceInfo[]);
				},
				{ type: "eppgrid/subscribe_device_list" },
			);
		} catch {
			// Fallback to one-shot load if subscription not supported
			await this.loadDevices();
		}
	}

	unsubscribeDeviceList(): void {
		if (this._unsubDeviceList) {
			try {
				this._unsubDeviceList();
			} catch {
				/* stale subscription */
			}
			this._unsubDeviceList = undefined;
		}
	}

	private _applyDeviceList(devices: DeviceInfo[]): void {
		this.devices = devices.sort((a, b) =>
			(a.name || "").localeCompare(b.name || ""),
		);
		const stored = localStorage.getItem("epp_selected_mac");
		const match =
			stored && this.devices.find((d: DeviceInfo) => d.mac === stored);
		this.selectedMac = match ? stored! : (this.devices[0]?.mac ?? "");

		const selected = this.devices.find((d) => d.mac === this.selectedMac);
		const nowAvailable = selected?.available ?? false;
		const prev = this._lastSelectedAvailable;
		this._lastSelectedAvailable = nowAvailable;

		// Rising edge: selected device came back online → rebuild the session.
		// The initial device_list push has prev === null and is skipped; the
		// host drives the first connect via loadDeviceConfig itself.
		if (prev === false && nowAvailable && this.selectedMac) {
			this.loadDeviceConfig(this.selectedMac).catch(() => {
				/* reconnect failure surfaced via connectionFailed */
			});
		}

		this.onDeviceListChanged?.();
		this._host.requestUpdate();
	}

	/**
	 * Fetch the device config from the backend.
	 * Returns the raw config object for the host to apply.
	 * Also opens the device session and subscribes to data streams.
	 */
	async loadDeviceConfig(mac: string): Promise<any> {
		if (this._reconnecting) return null;
		this._reconnecting = true;
		this._host.requestUpdate();
		try {
			let config: any = null;
			try {
				const result = await this._hass.callWS({
					type: "eppgrid/get_config",
					mac,
				});
				config = (result as any).config;
			} catch {
				// Device may not be ready yet
			}
			// Open device session, then subscribe to data streams
			await this.openDeviceSession(mac);
			if (this._unsubDevice) {
				this.subscribeTargets(mac);
			}
			return config;
		} finally {
			this._reconnecting = false;
			this._host.requestUpdate();
		}
	}

	// --- Session management ---
	async openDeviceSession(mac: string): Promise<void> {
		this.closeDeviceSession();
		if (!this._hass || !mac) return;
		try {
			this._unsubDevice = await this._hass.connection.subscribeMessage(
				() => {}, // session has no events, just lifecycle
				{ type: "eppgrid/subscribe_device", mac },
			);
			this._connectionFailed = false;
			this._host.requestUpdate();
		} catch (e) {
			console.warn("Failed to open device session:", e);
			const err = e as Record<string, unknown>;
			this._connectionFailed =
				err?.code === "connection_failed" || err?.code === "not_found";
			this._host.requestUpdate();
		}
	}

	closeDeviceSession(): void {
		this.unsubscribeTargets();
		if (this._unsubDevice) {
			try {
				this._unsubDevice();
			} catch {
				/* stale subscription */
			}
			this._unsubDevice = undefined;
		}
	}

	// --- Target subscription ---
	subscribeTargets(mac: string): void {
		this.unsubscribeDisplay();
		if (this._targetRetryTimer) {
			clearTimeout(this._targetRetryTimer);
			this._targetRetryTimer = undefined;
		}
		if (this._unsubTargets) {
			this._unsubTargets();
			this._unsubTargets = undefined;
		}
		if (!this._hass || !mac) return;

		const conn = this._hass.connection;

		this._subscribeGridTargets(conn, mac);
		this.subscribeDisplay(mac);
	}

	unsubscribeTargets(): void {
		this.unsubscribeDisplay();
		if (this._targetRetryTimer) {
			clearTimeout(this._targetRetryTimer);
			this._targetRetryTimer = undefined;
		}
		if (this._unsubTargets) {
			try {
				this._unsubTargets();
			} catch {
				/* stale subscription */
			}
			this._unsubTargets = undefined;
		}
	}

	private _subscribeGridTargets(conn: any, mac: string): void {
		conn
			.subscribeMessage(
				(event: any) => {
					const targets: Target[] = (event.targets || []).map((t: any) => ({
						x: t.x,
						y: t.y,
						speed: 0,
						status: (t.status as TargetStatus) ?? "inactive",
						signal: t.signal ?? 0,
					}));
					const sensors = event.sensors
						? {
								occupancy: event.sensors.occupancy ?? false,
								static_presence: event.sensors.static_presence ?? false,
								motion_presence: event.sensors.motion_presence ?? false,
								target_presence: event.sensors.target_presence ?? false,
								static_state: event.sensors.static_state,
								motion_state: event.sensors.motion_state,
								occupancy_state: event.sensors.occupancy_state,
								illuminance: event.sensors.illuminance ?? null,
								temperature: event.sensors.temperature ?? null,
								humidity: event.sensors.humidity ?? null,
								co2: event.sensors.co2 ?? null,
							}
						: {
								occupancy: false,
								static_presence: false,
								motion_presence: false,
								target_presence: false,
								static_state: undefined,
								motion_state: undefined,
								occupancy_state: undefined,
								illuminance: null,
								temperature: null,
								humidity: null,
								co2: null,
							};
					const zones = event.zones
						? {
								occupancy: event.zones.occupancy ?? {},
								target_counts: event.zones.target_counts ?? {},
								frame_count: event.zones.frame_count ?? 0,
								debug_log: event.zones.debug_log,
							}
						: null;
					this.onTargetData?.({ targets, sensors, zones });
				},
				{
					type: "eppgrid/subscribe_grid_targets",
					mac,
				},
			)
			.then((unsub: () => void) => {
				this._unsubTargets = unsub;
			})
			.catch(() => {
				if (this._targetRetryTimer) {
					clearTimeout(this._targetRetryTimer);
				}
				this._targetRetryTimer = setTimeout(() => {
					this._targetRetryTimer = undefined;
					if (this._hass?.connection !== conn) return;
					this._subscribeGridTargets(conn, mac);
				}, 2000);
			});
	}

	// --- Raw display subscription ---
	subscribeDisplay(mac: string): void {
		this.unsubscribeDisplay();
		if (!this._hass || !mac) return;

		this._hass.connection
			.subscribeMessage(
				(event: any) => {
					const rawTargets: RawTarget[] = (event.targets || []).map(
						(t: any) => ({
							raw_x: t.raw_x,
							raw_y: t.raw_y,
						}),
					);
					this.onRawTargetData?.(rawTargets);
				},
				{
					type: "eppgrid/subscribe_raw_targets",
					mac,
				},
			)
			.then((unsub: () => void) => {
				this._unsubDisplay = unsub;
			})
			.catch(() => {
				// Swallow — the WS lib auto-resubscribes on reconnect, so a
				// transient failure here shouldn't bubble up as an unhandled
				// rejection.
			});
	}

	unsubscribeDisplay(): void {
		if (this._unsubDisplay) {
			try {
				this._unsubDisplay();
			} catch {
				/* stale subscription */
			}
			this._unsubDisplay = undefined;
		}
	}

	// --- Device selection ---
	selectDevice(mac: string): void {
		this.selectedMac = mac;
		this._lastSelectedAvailable = null;
		this._connectionFailed = false;
		localStorage.setItem("epp_selected_mac", mac);
		this._host.requestUpdate();
	}
}
