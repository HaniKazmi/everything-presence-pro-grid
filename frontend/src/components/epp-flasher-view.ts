import {
	mdiWifiStrength1Lock,
	mdiWifiStrength1LockOpen,
	mdiWifiStrength2Lock,
	mdiWifiStrength2LockOpen,
	mdiWifiStrength3Lock,
	mdiWifiStrength3LockOpen,
	mdiWifiStrength4Lock,
	mdiWifiStrength4LockOpen,
} from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { WifiNetwork } from "../lib/improv-serial.js";
import { flasherStyles } from "../styles.js";
import type {
	FlashableDevice,
	UsbFlashState,
} from "../types.js";

const WIFI_ICONS_LOCK = [
	mdiWifiStrength1Lock,
	mdiWifiStrength2Lock,
	mdiWifiStrength3Lock,
	mdiWifiStrength4Lock,
];
const WIFI_ICONS_OPEN = [
	mdiWifiStrength1LockOpen,
	mdiWifiStrength2LockOpen,
	mdiWifiStrength3LockOpen,
	mdiWifiStrength4LockOpen,
];

function wifiIconPath(rssi: number, authRequired: boolean): string {
	const level = rssi >= -50 ? 3 : rssi >= -65 ? 2 : rssi >= -75 ? 1 : 0;
	return authRequired ? WIFI_ICONS_LOCK[level] : WIFI_ICONS_OPEN[level];
}

@customElement("epp-flasher-view")
export class EppFlasherView extends LitElement {
	static styles = [flasherStyles];

	@property({ attribute: false }) hass: any;
	@property({ attribute: false }) flashableDevices: FlashableDevice[] = [];
	@property({ type: Boolean }) loading = false;
	@property({ attribute: false }) localize: (
		key: string,
		params?: Record<string, string | number>,
	) => string = (k) => k;

	@state() private _selectedVariant: "wifi" | "ethernet" = "wifi";
	@property() firmwareBaseUrl = "";
	@property({ attribute: false }) usbFlashState: UsbFlashState | null = null;
	@property({ attribute: false }) wifiNetworks: WifiNetwork[] = [];

	@state() private _hasWebSerial: boolean =
		typeof navigator !== "undefined" && "serial" in navigator;
	@state() private _showUsbFlash = false;

	// WiFi provisioning state
	@state() private _wifiScanning = false;
	@state() private _selectedSsid = "";
	@state() private _manualSsid = false;
	@state() private _wifiPassword = "";
	@state() private _wifiConnected = false;
	@state() private _deviceIp: string | null = null;
	@state() private _showWifiProvisioning = false;

	private _dispatchUpdateFirmware(device: FlashableDevice): void {
		this.dispatchEvent(
			new CustomEvent("update-firmware", {
				detail: { mac: device.mac },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _onUsbConnect(): void {
		this._showUsbFlash = true;
	}

	private _dispatchFlashComplete(): void {
		this.dispatchEvent(
			new CustomEvent("flash-complete", { bubbles: true, composed: true }),
		);
	}

	private _dispatchUsbFlash(): void {
		this.dispatchEvent(
			new CustomEvent("usb-flash", {
				detail: { variant: this._getFirmwareVariant() },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _dispatchUsbRetry(): void {
		this.dispatchEvent(
			new CustomEvent("usb-retry", { bubbles: true, composed: true }),
		);
	}

	private _onUsbBack(): void {
		this._showUsbFlash = false;
		this._showWifiProvisioning = false;
		this.dispatchEvent(
			new CustomEvent("usb-retry", { bubbles: true, composed: true }),
		);
	}

	private _dispatchWifiScan(): void {
		this.dispatchEvent(
			new CustomEvent("wifi-scan", { bubbles: true, composed: true }),
		);
	}

	private _dispatchWifiProvision(): void {
		this.dispatchEvent(
			new CustomEvent("wifi-provision", {
				detail: { ssid: this._selectedSsid, password: this._wifiPassword },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _dispatchWifiComplete(): void {
		this.dispatchEvent(
			new CustomEvent("wifi-complete", { bubbles: true, composed: true }),
		);
	}

	private _renderLoading() {
		return html`<div class="flasher-loading">${this.localize("flasher.loading")}</div>`;
	}

	private _renderWifiProvisioning() {
		if (this._wifiConnected) {
			return html`
        <div class="flasher-content">
          <ha-card>
            <div class="card-header">${this.localize("flasher.configure_wifi")}</div>
            <div class="card-content">
              <div class="usb-complete">
                <ha-icon icon="mdi:wifi-check"></ha-icon>
                <p>${this.localize("flasher.connected_to", { ssid: this._selectedSsid })}</p>
                ${this._deviceIp ? html`<p class="usb-ip">${this.localize("flasher.ip_address", { ip: this._deviceIp })}</p>` : nothing}
              </div>
              <div class="confirm-actions">
                <ha-button raised @click=${this._dispatchWifiComplete}>
                  ${this.localize("flasher.continue")}
                </ha-button>
              </div>
            </div>
          </ha-card>
        </div>
      `;
		}

		const sortedNetworks = [...this.wifiNetworks].sort(
			(a, b) => b.rssi - a.rssi,
		);
		const showManual = this._manualSsid || sortedNetworks.length === 0;

		return html`
      <div class="flasher-content">
        <ha-card>
          <div class="card-header">${this.localize("flasher.configure_wifi")}</div>
          <div class="card-content wifi-form">

            ${
							sortedNetworks.length > 0
								? html`
                <ha-select
                  .label=${this.localize("flasher.select_a_network")}
                  .value=${this._selectedSsid}
                  .options=${sortedNetworks.map((n) => ({
										value: n.ssid,
										label: n.ssid,
										iconPath: wifiIconPath(n.rssi, n.authRequired),
									}))}
                  @selected=${(e: CustomEvent<{ value: string }>) => {
										this._selectedSsid = e.detail.value;
										this._manualSsid = false;
									}}
                  @closed=${(e: Event) => e.stopPropagation()}
                ></ha-select>
              `
								: nothing
						}

            <ha-formfield .label=${this.localize("flasher.manual_ssid")}>
              <ha-checkbox
                .checked=${showManual}
                @change=${(e: Event) => {
									this._manualSsid = (e.target as any).checked;
									if (!this._manualSsid) this._selectedSsid = "";
								}}
              ></ha-checkbox>
            </ha-formfield>

            ${
							showManual
								? html`
                <ha-textfield
                  .label=${this.localize("flasher.enter_ssid")}
                  autocomplete="off"
                  .value=${this._selectedSsid}
                  @input=${(e: Event) => {
										this._selectedSsid = (e.target as any).value;
									}}
                ></ha-textfield>
              `
								: nothing
						}

            <ha-textfield
              .label=${this.localize("flasher.wifi_password")}
              type="password"
              autocomplete="new-password"
              .value=${this._wifiPassword}
              @input=${(e: Event) => {
								this._wifiPassword = (e.target as any).value;
							}}
            ></ha-textfield>

            <div class="confirm-actions">
              <ha-button @click=${this._onUsbBack}>
                ${this.localize("flasher.usb_back")}
              </ha-button>
              <ha-button @click=${this._dispatchWifiScan}>
                ${this._wifiScanning ? this.localize("flasher.scanning") : this.localize("flasher.scan")}
              </ha-button>
              <ha-button
                raised
                .disabled=${!this._selectedSsid}
                @click=${this._dispatchWifiProvision}
              >
                ${this.localize("flasher.connect")}
              </ha-button>
            </div>
          </div>
        </ha-card>
      </div>
    `;
	}

	private _renderDeviceList() {
		const { flashableDevices } = this;

		return html`
      <div class="flasher-content">
        <ha-card>
          <div class="card-header">${this.localize("flasher.devices_on_network")}</div>
          <div class="card-content">
            ${
							flashableDevices.length === 0
								? html`<div class="flasher-empty">
                  <ha-icon icon="mdi:access-point-off"></ha-icon>
                  <p>${this.localize("flasher.no_devices")}</p>
                </div>`
								: html`
                <div class="device-list">
                  ${flashableDevices.map(
										(device) => html`
                      <div class="device-row">
                        <div class="device-info">
                          <div class="device-name">${device.name}</div>
                          <div class="device-host">
                            ${device.host ?? this.localize("flasher.offline")}
                          </div>
                        </div>
                        <span
                          class="firmware-badge firmware-badge-${device.firmware_type}"
                        >
                          ${
														device.firmware_type === "original"
															? this.localize("flasher.original")
															: this.localize("flasher.eppgrid")
													}
                        </span>
                        ${
													!device.available
														? html`<span class="firmware-badge firmware-badge-offline">${this.localize("flasher.offline")}</span>`
														: nothing
												}
                        ${
													device.firmware_type === "eppgrid" && device.update_available
														? html`<ha-button
																raised
																@click=${() => this._dispatchUpdateFirmware(device)}
															>${this.localize("flasher.update")}</ha-button>`
														: nothing
												}
                      </div>
                    `,
									)}
                </div>
              `
						}
          </div>
        </ha-card>
        ${this._renderUsbSection()}
      </div>
    `;
	}

	private _dispatchUsbWifiConfig(): void {
		this.dispatchEvent(
			new CustomEvent("usb-wifi-config", { bubbles: true, composed: true }),
		);
	}

	private _renderUsbSection() {
		return html`
      <ha-card>
        <div class="card-header">${this.localize("flasher.usb_title")}</div>
        <div class="card-content">
          ${
						!this._hasWebSerial
							? html`<div class="browser-warning">
                ${this.localize("flasher.usb_browser_warning")}
              </div>`
							: nothing
					}
          <div class="usb-actions">
            <div class="usb-action" @click=${this._onUsbConnect}>
              <ha-icon icon="mdi:chip"></ha-icon>
              <div class="usb-action-text">
                <div class="usb-action-title">${this.localize("flasher.usb_flash_title")}</div>
                <div class="usb-action-desc">${this.localize("flasher.usb_flash_desc")}</div>
              </div>
            </div>
            <div class="usb-action" @click=${this._dispatchUsbWifiConfig}>
              <ha-icon icon="mdi:wifi-cog"></ha-icon>
              <div class="usb-action-text">
                <div class="usb-action-title">${this.localize("flasher.usb_wifi_title")}</div>
                <div class="usb-action-desc">${this.localize("flasher.usb_wifi_desc")}</div>
              </div>
            </div>
          </div>
        </div>
      </ha-card>
    `;
	}

	render() {
		if (this.loading) {
			return this._renderLoading();
		}

		if (this._showWifiProvisioning) {
			return this._renderWifiProvisioning();
		}

		if (this._showUsbFlash || this.usbFlashState) {
			return this._renderUsbFlash();
		}

		return this._renderDeviceList();
	}

	private _getFirmwareVariant(): string {
		return this._selectedVariant === "wifi"
			? "wifi-ble-co2"
			: "ethernet-ble-co2";
	}

	private _getManifestUrl(): string {
		const variant = this._getFirmwareVariant();
		return `${this.firmwareBaseUrl}/everything-presence-pro-${variant}-manifest.json`;
	}

	private _renderUsbFlash() {
		const state = this.usbFlashState;

		// WiFi provisioning
		if (state?.step === "wifi_provision") {
			return this._renderWifiProvisioning();
		}

		// Error state
		if (state?.step === "error") {
			return html`
				<div class="flasher-content">
					<ha-card>
						<div class="card-content">
							<div class="usb-error">
								<ha-icon icon="mdi:alert-circle-outline"></ha-icon>
								<p>${state.error}</p>
							</div>
							<div class="confirm-actions">
								<ha-button @click=${this._onUsbBack}>
									${this.localize("flasher.usb_back")}
								</ha-button>
								<ha-button raised @click=${this._dispatchUsbRetry}>
									${this.localize("flasher.usb_retry")}
								</ha-button>
							</div>
						</div>
					</ha-card>
				</div>
			`;
		}

		// Complete state
		if (state?.step === "complete") {
			const isEthernet = state.variant?.startsWith("ethernet");
			return html`
				<div class="flasher-content">
					<ha-card>
						<div class="card-content">
							<div class="usb-complete">
								<ha-icon icon="mdi:check-circle-outline"></ha-icon>
								${
									isEthernet
										? html`<p>${this.localize("flasher.usb_ethernet_complete")}</p>
											<p>${this.localize("flasher.usb_ethernet_hint")}</p>`
										: state.ip
											? html`
											<p>${this.localize("flasher.usb_step_complete")}</p>
											<p class="usb-ip">${this.localize("flasher.ip_address")}: ${state.ip}</p>
										`
											: html`
											<p>${this.localize("flasher.wifi_connected")}</p>
										`
								}
							</div>
							<div class="confirm-actions">
								${
									isEthernet
										? html`<a href="/config/devices/dashboard">
										<ha-button raised>${this.localize("flasher.go_to_devices")}</ha-button>
									</a>`
										: state.ip
											? html`<ha-button raised @click=${this._dispatchFlashComplete}>
											${this.localize("flasher.go_to_config")}
										</ha-button>`
											: html`<ha-button raised @click=${this._dispatchFlashComplete}>
											${this.localize("flasher.done")}
										</ha-button>`
								}
							</div>
						</div>
					</ha-card>
				</div>
			`;
		}

		// In-progress states (connecting, flashing, wifi_scan, reading_ip, adding_device)
		if (state && state.step !== "idle") {
			const stepKeyMap: Record<string, string> = {
				connecting: "flasher.usb_step_connecting",
				flashing: "flasher.usb_step_flashing",
				wifi_scan: "flasher.usb_step_scanning",
				wifi_provision: "flasher.usb_step_provisioning",
				wifi_connecting: "flasher.usb_step_wifi_connecting",
				reading_ip: "flasher.usb_step_reading_ip",
				adding_device: "flasher.usb_step_adding",
			};
			const stepKey = stepKeyMap[state.step] ?? state.step;
			return html`
				<div class="flasher-content">
					<ha-card>
						<div class="card-content">
							<div class="usb-status">
								<p>${this.localize(stepKey)}</p>
								${
									state.step === "flashing" && state.progress != null
										? html`<div class="usb-progress">
											<div class="usb-progress-bar" style="width: ${state.progress}%"></div>
											<span>${state.progress}%</span>
										</div>`
										: nothing
								}
								${
									state.step === "wifi_scan"
										? html`<p class="usb-hint">${this.localize("flasher.wifi_scan_hint")}</p>`
										: nothing
								}
							</div>
						</div>
					</ha-card>
				</div>
			`;
		}

		// Idle state — variant selector + flash button
		return html`
			<div class="flasher-content">
				<ha-card>
					<div class="card-header">${this.localize("flasher.title")}</div>
					<div class="card-content">
						<p class="usb-select-label">${this.localize("flasher.select_variant")}</p>
						<div class="variant-selector">
							<ha-button
								class="${this._selectedVariant === "wifi" ? "selected" : "unselected"}"
								appearance="${this._selectedVariant === "wifi" ? "accent" : "outlined"}"
								@click=${() => {
									this._selectedVariant = "wifi";
								}}
							>${this.localize("flasher.wifi")}</ha-button>
							<ha-button
								class="${this._selectedVariant === "ethernet" ? "selected" : "unselected"}"
								appearance="${this._selectedVariant === "ethernet" ? "accent" : "outlined"}"
								@click=${() => {
									this._selectedVariant = "ethernet";
								}}
							>${this.localize("flasher.ethernet")}</ha-button>
						</div>
						<div class="confirm-actions">
							<ha-button @click=${this._onUsbBack}>
								${this.localize("flasher.usb_back")}
							</ha-button>
							<ha-button raised @click=${this._dispatchUsbFlash}>
								${this.localize("flasher.usb_flash")}
							</ha-button>
						</div>
					</div>
				</ha-card>
			</div>
		`;
	}
}
