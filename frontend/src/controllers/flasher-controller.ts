import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { WifiNetwork } from "../lib/improv-serial.js";
import type { FlashableDevice, OtaProgress, UsbFlashState } from "../types.js";

export class FlasherController implements ReactiveController {
	flashableDevices: FlashableDevice[] = [];
	firmwareBaseUrl = "";
	loading = true;
	otaProgress: OtaProgress | null = null;
	flashingMac: string | null = null;
	usbConnected = false;
	usbDeviceMac: string | null = null;
	usbExistingDevice: FlashableDevice | null = null;
	usbFlashState: UsbFlashState | null = null;
	wifiNetworks: WifiNetwork[] = [];

	private _host: ReactiveControllerHost;
	private _hass: any = null;
	private _unsubOta?: () => void;
	private _serialPort: SerialPort | null = null;

	constructor(host: ReactiveControllerHost) {
		this._host = host;
		host.addController(this);
	}

	hostConnected(): void {}
	hostDisconnected(): void {
		this._unsubOta?.();
		this._unsubOta = undefined;
		this._serialPort?.close().catch(() => {});
		this._serialPort = null;
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
		} catch {
			this.flashableDevices = [];
		}
		this.loading = false;
		this._host.requestUpdate();
	}

	async startOtaFlash(mac: string, variant: string): Promise<void> {
		if (!this._hass) return;
		this.flashingMac = mac;
		this.otaProgress = null;
		this._host.requestUpdate();

		return new Promise<void>((resolve) => {
			this._hass.connection
				.subscribeMessage(
					(msg: OtaProgress) => {
						this.otaProgress = msg;
						this._host.requestUpdate();
						if (
							msg.status === "success" ||
							msg.status === "failed" ||
							msg.status === "timeout"
						) {
							this._unsubOta?.();
							this._unsubOta = undefined;
							this.flashingMac = null;
							resolve();
						}
					},
					{ type: "eppgrid/flash_ota", mac, variant },
				)
				.then((unsub: () => void) => {
					this._unsubOta = unsub;
				})
				.catch(() => {
					this.otaProgress = {
						step: "error",
						status: "failed",
						error: "Failed to start OTA flash",
					};
					this.flashingMac = null;
					this._host.requestUpdate();
					resolve();
				});
		});
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

	resetUsbState(): void {
		this.usbFlashState = null;
		this.wifiNetworks = [];
		this._host.requestUpdate();
	}

	set serialPort(port: SerialPort | null) {
		this._serialPort = port;
	}

	get serialPort(): SerialPort | null {
		return this._serialPort;
	}
}
