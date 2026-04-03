import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { FlashableDevice, OtaProgress } from "../types.js";

export class FlasherController implements ReactiveController {
	flashableDevices: FlashableDevice[] = [];
	loading = true;
	otaProgress: OtaProgress | null = null;
	flashingMac: string | null = null;
	usbConnected = false;
	usbDeviceMac: string | null = null;
	usbExistingDevice: FlashableDevice | null = null;

	private _host: ReactiveControllerHost;
	private _hass: any = null;
	private _unsubOta?: () => void;

	constructor(host: ReactiveControllerHost) {
		this._host = host;
		host.addController(this);
	}

	hostConnected(): void {}
	hostDisconnected(): void {
		this._unsubOta?.();
		this._unsubOta = undefined;
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
}
