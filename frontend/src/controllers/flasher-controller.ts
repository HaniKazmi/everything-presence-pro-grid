import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { WifiNetwork } from "../lib/improv-serial.js";
import type { FlashableDevice, UsbFlashState } from "../types.js";

export class FlasherController implements ReactiveController {
	flashableDevices: FlashableDevice[] = [];
	firmwareBaseUrl = "";
	firmwareVersion = "";
	loading = true;
	usbConnected = false;
	usbDeviceMac: string | null = null;
	usbExistingDevice: FlashableDevice | null = null;
	usbFlashState: UsbFlashState | null = null;
	wifiNetworks: WifiNetwork[] = [];

	private _host: ReactiveControllerHost;
	private _hass: any = null;
	private _serialPort: SerialPort | null = null;
	private _opId = 0;

	constructor(host: ReactiveControllerHost) {
		this._host = host;
		host.addController(this);
	}

	hostConnected(): void {}
	hostDisconnected(): void {
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
			this.firmwareVersion = resp.firmware_version ?? "";
		} catch {
			this.flashableDevices = [];
		}
		this.loading = false;
		this._host.requestUpdate();
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

	resetUsbState(): void {
		this.usbFlashState = null;
		this.wifiNetworks = [];
		this._opId++;
		// Release any known reader/writer locks
		try { (this as any)._serialReader?.releaseLock(); } catch {}
		try { (this as any)._serialWriter?.releaseLock(); } catch {}
		(this as any)._serialReader = null;
		(this as any)._serialWriter = null;
		if (this._serialPort) {
			const port = this._serialPort;
			this._serialPort = null;
			port.close().catch(() => {});
		}
		this._host.requestUpdate();
	}

	set serialPort(port: SerialPort | null) {
		this._serialPort = port;
	}

	get serialPort(): SerialPort | null {
		return this._serialPort;
	}
}
