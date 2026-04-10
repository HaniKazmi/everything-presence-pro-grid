import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { WifiNetwork } from "../lib/improv-serial.js";
import type {
	FlashableDevice,
	OtaDeviceState,
	UsbFlashState,
} from "../types.js";

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

	onDeviceListChanged?: () => void;

	private _host: ReactiveControllerHost;
	private _hass: any = null;
	private _unsubDeviceList?: () => void;
	private _serialPort: SerialPort | null = null;
	private _opId = 0;
	private _opRunning = false;
	private _otaUnsubs: Record<string, () => void> = {};
	private _otaTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

	constructor(host: ReactiveControllerHost) {
		this._host = host;
		host.addController(this);
	}

	hostConnected(): void {}
	hostDisconnected(): void {
		this.unsubscribeDeviceList();
		this._serialPort?.close().catch(() => {});
		this._serialPort = null;
		for (const mac of Object.keys(this._otaUnsubs)) {
			this._unsubOta(mac);
		}
		for (const mac of Object.keys(this._otaTimeouts)) {
			this._resetOtaTimeout(mac);
		}
		this.otaStates = {};
	}

	async startOta(mac: string): Promise<void> {
		this.otaStates[mac] = { state: "updating", progress: 0, error: null };
		this._host.requestUpdate();

		try {
			await this._hass!.callWS({
				type: "eppgrid/update_firmware",
				mac,
			});
		} catch (err: any) {
			this.otaStates[mac] = {
				state: "error",
				progress: null,
				error: "Failed to start update. Is the device online?",
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
		} catch (err: any) {
			this.otaStates[mac] = {
				state: "error",
				progress: null,
				error: "Failed to connect to device",
			};
			this._host.requestUpdate();
		}
	}

	private _handleOtaEvent(mac: string, event: any): void {
		this._resetOtaTimeout(mac);

		switch (event.state) {
			case "updating": {
				const progress = event.progress ?? null;
				if (progress != null && progress >= 100) {
					this._otaSuccess(mac);
				} else {
					this.otaStates[mac] = { state: "updating", progress, error: null };
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
			case "error":
				this.otaStates[mac] = {
					state: "error",
					progress: null,
					error: event.message || "Update failed",
				};
				this._unsubOta(mac);
				break;
		}
		this._host.requestUpdate();
	}

	private _otaSuccess(mac: string): void {
		this.otaStates[mac] = { state: "success", progress: null, error: null };
		this._unsubOta(mac);
		this._resetOtaTimeout(mac);
		setTimeout(() => {
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
					error: "Connection lost during update",
				};
			} else {
				// No progress ever received — update failed to start
				this.otaStates[mac] = {
					state: "error",
					progress: null,
					error: "Update timed out",
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
			unsub();
			delete this._otaUnsubs[mac];
		}
	}

	get hass(): any {
		return this._hass;
	}
	set hass(value: any) {
		this._hass = value;
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
			this.firmwareBaseUrl = resp.firmware_base_url ?? "";
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
		try {
			this._unsubDeviceList = await this._hass.connection.subscribeMessage(
				(msg: any) => {
					this._applyDeviceList(msg);
				},
				{ type: "eppgrid/subscribe_flashable_devices" },
			);
		} catch {
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

	private _applyDeviceList(resp: any): void {
		this.flashableDevices = resp.devices ?? [];
		this.firmwareBaseUrl = resp.firmware_base_url ?? "";
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
					error: "Device went offline during update",
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

	async addEsphomeDevice(host: string): Promise<void> {
		if (!this._hass) return;
		await this._hass.callWS({ type: "eppgrid/add_esphome_device", host });
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
		// Release any known reader/writer locks
		try {
			(this as any)._serialReader?.releaseLock();
		} catch {}
		try {
			(this as any)._serialWriter?.releaseLock();
		} catch {}
		(this as any)._serialReader = null;
		(this as any)._serialWriter = null;
		// Clear port reference — don't force-close (crashes Chrome if streams locked)
		this._serialPort = null;
		this._host.requestUpdate();
	}

	set serialPort(port: SerialPort | null) {
		this._serialPort = port;
	}

	get serialPort(): SerialPort | null {
		return this._serialPort;
	}
}
