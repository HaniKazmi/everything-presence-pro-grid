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

	resetUsbState(): void {
		this.usbFlashState = null;
		this.wifiNetworks = [];
		// Release any known reader/writer locks
		try { (this as any)._serialReader?.releaseLock(); } catch {}
		try { (this as any)._serialWriter?.releaseLock(); } catch {}
		(this as any)._serialReader = null;
		(this as any)._serialWriter = null;
		// Cancel streams to force-release any locks held by in-flight operations,
		// then close the port
		if (this._serialPort) {
			const port = this._serialPort;
			this._serialPort = null;
			(async () => {
				try { await port.readable?.cancel(); } catch {}
				try { await port.writable?.abort(); } catch {}
				try { await port.close(); } catch {}
			})();
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
