import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { WifiNetwork } from "../lib/improv-serial.js";
import { safeUnsub } from "../lib/safe-unsub.js";
import type {
	FlashableDevice,
	HaAddResult,
	OtaDeviceState,
	UsbFlashState,
} from "../types.js";

/**
 * Backend supplies the firmware base URL — validate it's https before we
 * splice it into manifest URLs or hand it to the esp-web-flasher iframe.
 * Rejects javascript:, http:, file:, and other unsafe schemes.
 */
function sanitizeFirmwareBaseUrl(raw: unknown): string {
	if (typeof raw !== "string" || raw === "") return "";
	try {
		const u = new URL(raw);
		return u.protocol === "https:" ? raw : "";
	} catch {
		return "";
	}
}

export class FlasherController implements ReactiveController {
	flashableDevices: FlashableDevice[] = [];
	firmwareBaseUrl = "";
	firmwareVersion = "";
	integrationVersion = "";
	loading = true;
	usbConnected = false;
	usbDeviceMac: string | null = null;
	usbExistingDevice: FlashableDevice | null = null;
	usbFlashState: UsbFlashState | null = null;
	wifiNetworks: WifiNetwork[] = [];
	otaStates: Record<string, OtaDeviceState> = {};
	cancelledDeviceIpHint: string | null = null;
	private _cancelledIpTimeout: ReturnType<typeof setTimeout> | null = null;

	onDeviceListChanged?: () => void;

	private _host: ReactiveControllerHost;
	private _hass: any = null;
	private _unsubDeviceList?: () => void;
	private _serialPort: SerialPort | null = null;
	private _opId = 0;
	private _opRunning = false;
	private _otaUnsubs: Record<string, () => void> = {};
	private _otaTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};
	// Generation token for the flashable-devices subscription. Bumped on
	// (un)subscribe and connection swap so a late-resolving subscribeMessage
	// promise drops its unsub instead of stashing it on a torn-down controller.
	private _deviceListGen = 0;

	constructor(host: ReactiveControllerHost) {
		this._host = host;
		host.addController(this);
	}

	hostConnected(): void {}
	hostDisconnected(): void {
		this.unsubscribeDeviceList();
		this._tearDownSerialPort();
		for (const mac of Object.keys(this._otaUnsubs)) {
			this._unsubOta(mac);
		}
		for (const mac of Object.keys(this._otaTimeouts)) {
			this._resetOtaTimeout(mac);
		}
		this.otaStates = {};
		if (this._cancelledIpTimeout) {
			clearTimeout(this._cancelledIpTimeout);
			this._cancelledIpTimeout = null;
		}
	}

	// Releases any held reader/writer locks before closing the port.
	// close() rejects with "the port has a readable or writable stream"
	// while a lock is still held, leaving the port half-open and unusable
	// until the page reloads.
	private _tearDownSerialPort(): void {
		try {
			(this as any)._serialReader?.releaseLock();
		} catch {}
		try {
			(this as any)._serialWriter?.releaseLock();
		} catch {}
		(this as any)._serialReader = null;
		(this as any)._serialWriter = null;
		this._serialPort?.close().catch(() => {});
		this._serialPort = null;
	}

	async startOta(mac: string): Promise<void> {
		this.otaStates[mac] = { state: "updating", progress: 0, errorKey: null };
		this._host.requestUpdate();

		try {
			await this._hass!.callWS({
				type: "eppgrid/update_firmware",
				mac,
			});
		} catch {
			this.otaStates[mac] = {
				state: "error",
				progress: null,
				errorKey: "flasher.errors.start_failed",
			};
			this._host.requestUpdate();
			return;
		}

		try {
			const unsub = await this._hass!.connection.subscribeMessage(
				(event: any) => {
					this._handleOtaEvent(mac, event);
				},
				{ type: "eppgrid/subscribe_ota_progress", mac },
			);
			this._otaUnsubs[mac] = unsub;
			// Start initial timeout — if no progress events arrive at all,
			// the device rejected the update or something went wrong
			this._startOtaTimeout(mac, 15000);
		} catch {
			this.otaStates[mac] = {
				state: "error",
				progress: null,
				errorKey: "flasher.errors.connect_failed",
			};
			this._host.requestUpdate();
		}
	}

	private _handleOtaEvent(mac: string, event: any): void {
		switch (event.state) {
			case "updating": {
				const progress = event.progress ?? null;
				if (progress != null && progress >= 100) {
					this._otaSuccess(mac);
				} else {
					this.otaStates[mac] = { state: "updating", progress, errorKey: null };
					this._startOtaTimeout(
						mac,
						progress != null && progress > 0 ? 10000 : 15000,
					);
				}
				break;
			}
			case "success":
				this._otaSuccess(mac);
				break;
			case "error": {
				const errorKey: string =
					event.error_key ?? "flasher.errors.update_failed_generic";
				this.otaStates[mac] = {
					state: "error",
					progress: null,
					errorKey,
				};
				this._resetOtaTimeout(mac);
				this._unsubOta(mac);
				break;
			}
			default:
				// Unknown state — leave the watchdog armed so a stuck device
				// still trips the existing timeout instead of spinning forever.
				break;
		}
		this._host.requestUpdate();
	}

	private _otaSuccess(mac: string): void {
		this.otaStates[mac] = { state: "success", progress: null, errorKey: null };
		this._unsubOta(mac);
		this._resetOtaTimeout(mac);
		this._otaTimeouts[mac] = setTimeout(() => {
			delete this._otaTimeouts[mac];
			if (this.otaStates[mac]?.state === "success") {
				delete this.otaStates[mac];
				this._host.requestUpdate();
			}
		}, 5000);
	}

	private _startOtaTimeout(mac: string, ms: number): void {
		this._resetOtaTimeout(mac);
		this._otaTimeouts[mac] = setTimeout(() => {
			const ota = this.otaStates[mac];
			if (!ota || ota.state !== "updating") return;
			if (ota.progress != null && ota.progress > 0) {
				// Had progress then stopped — connection lost
				this.otaStates[mac] = {
					state: "error",
					progress: null,
					errorKey: "flasher.errors.connection_lost",
				};
			} else {
				// No progress ever received — update failed to start
				this.otaStates[mac] = {
					state: "error",
					progress: null,
					errorKey: "flasher.errors.update_timeout",
				};
			}
			this._unsubOta(mac);
			this._host.requestUpdate();
		}, ms);
	}

	private _resetOtaTimeout(mac: string): void {
		const t = this._otaTimeouts[mac];
		if (t) {
			clearTimeout(t);
			delete this._otaTimeouts[mac];
		}
	}

	dismissOtaError(mac: string): void {
		this._unsubOta(mac);
		this._resetOtaTimeout(mac);
		delete this.otaStates[mac];
		this._host.requestUpdate();
	}

	private _unsubOta(mac: string): void {
		const unsub = this._otaUnsubs[mac];
		if (unsub) {
			try {
				unsub();
			} catch {
				/* stale subscription — invoke can throw if the socket died */
			}
			delete this._otaUnsubs[mac];
		}
	}

	get hass(): any {
		return this._hass;
	}
	set hass(value: any) {
		const oldConn = this._hass?.connection;
		this._hass = value;
		if (value?.connection && value.connection !== oldConn && oldConn) {
			// Connection swap (HA reconnect / hass replacement): every unsub
			// we hold belongs to the dead socket. Drop them, clear OTA
			// watchdog timers, and forget any in-flight OTA state — the
			// device's actual update progress is unrecoverable from the new
			// connection, and leaving "updating" on screen would be a lie.
			this._unsubDeviceList = undefined;
			this._deviceListGen++;
			for (const mac of Object.keys(this._otaUnsubs)) {
				delete this._otaUnsubs[mac];
			}
			for (const mac of Object.keys(this._otaTimeouts)) {
				this._resetOtaTimeout(mac);
			}
			this.otaStates = {};
			this._host.requestUpdate();
		}
	}

	async loadDevices(): Promise<void> {
		if (!this._hass) {
			this.loading = false;
			this._host.requestUpdate();
			return;
		}
		try {
			const resp = await this._hass.callWS({
				type: "eppgrid/list_flashable_devices",
			});
			this.flashableDevices = resp.devices;
			this.firmwareBaseUrl = sanitizeFirmwareBaseUrl(resp.firmware_base_url);
			this.firmwareVersion = resp.latest_firmware_version ?? "";
		} catch {
			this.flashableDevices = [];
		}
		this.loading = false;
		this._host.requestUpdate();
	}

	async subscribeDeviceList(): Promise<void> {
		this.unsubscribeDeviceList();
		if (!this._hass) return;
		const token = ++this._deviceListGen;
		try {
			const unsub = await this._hass.connection.subscribeMessage(
				(msg: any) => {
					this._applyDeviceList(msg);
				},
				{ type: "eppgrid/subscribe_flashable_devices" },
			);
			if (this._deviceListGen !== token) {
				try {
					unsub();
				} catch {}
				return;
			}
			this._unsubDeviceList = unsub;
		} catch {
			await this.loadDevices();
		}
	}

	unsubscribeDeviceList(): void {
		this._deviceListGen++;
		safeUnsub(this._unsubDeviceList);
		this._unsubDeviceList = undefined;
	}

	private _applyDeviceList(resp: any): void {
		this.flashableDevices = resp.devices ?? [];
		this.firmwareBaseUrl = sanitizeFirmwareBaseUrl(resp.firmware_base_url);
		this.firmwareVersion = resp.latest_firmware_version ?? "";
		this.integrationVersion = resp.integration_version ?? "";
		this.loading = false;
		this.onDeviceListChanged?.();
		this._host.requestUpdate();
		this._checkOtaDevicesOffline();
	}

	private _checkOtaDevicesOffline(): void {
		for (const [mac, ota] of Object.entries(this.otaStates)) {
			if (ota.state !== "updating") continue;
			const device = this.flashableDevices.find((d) => d.mac === mac);
			if (device && !device.available) {
				this.otaStates[mac] = {
					state: "error",
					progress: null,
					errorKey: "flasher.errors.device_offline",
				};
				this._unsubOta(mac);
				this._resetOtaTimeout(mac);
				this._host.requestUpdate();
			}
		}
	}

	async deleteEsphomeDevice(configEntryId: string): Promise<void> {
		if (!this._hass) return;
		await this._hass.callWS({
			type: "eppgrid/delete_esphome_device",
			config_entry_id: configEntryId,
		});
	}

	async addEsphomeDevice(host: string): Promise<HaAddResult> {
		if (!this._hass) return { type: "failed", reason: "no_hass" };
		return (await this._hass.callWS({
			type: "eppgrid/add_esphome_device",
			host,
		})) as HaAddResult;
	}

	updateUsbState(state: UsbFlashState): void {
		this.usbFlashState = state;
		this._host.requestUpdate();
	}

	/** Increment to signal in-flight operations to bail out. */
	get opId(): number {
		return this._opId;
	}

	get opRunning(): boolean {
		return this._opRunning;
	}
	set opRunning(v: boolean) {
		this._opRunning = v;
	}

	resetUsbState(): void {
		this.usbFlashState = null;
		this.wifiNetworks = [];
		this._opId++;
		try {
			(this as any)._serialReader?.releaseLock();
		} catch {}
		try {
			(this as any)._serialWriter?.releaseLock();
		} catch {}
		(this as any)._serialReader = null;
		(this as any)._serialWriter = null;
		this._serialPort = null;
		this._host.requestUpdate();
	}

	setCancelledDeviceIpHint(ip: string | null): void {
		this.cancelledDeviceIpHint = ip;
		if (this._cancelledIpTimeout) {
			clearTimeout(this._cancelledIpTimeout);
			this._cancelledIpTimeout = null;
		}
		if (ip) {
			this._cancelledIpTimeout = setTimeout(() => {
				this.cancelledDeviceIpHint = null;
				this._cancelledIpTimeout = null;
				this._host.requestUpdate();
			}, 8000);
		}
		this._host.requestUpdate();
	}

	/** Invalidate any in-flight operation keyed off the current opId. */
	bumpOpId(): void {
		this._opId++;
	}

	set serialPort(port: SerialPort | null) {
		this._serialPort = port;
	}

	get serialPort(): SerialPort | null {
		return this._serialPort;
	}
}
