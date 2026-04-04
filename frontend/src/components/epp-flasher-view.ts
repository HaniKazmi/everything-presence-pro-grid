import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { WifiNetwork } from "../lib/improv-serial.js";
import { flasherStyles } from "../styles.js";
import type {
	FlashableDevice,
	OtaProgress,
	OtaStep,
	UsbFlashState,
} from "../types.js";

const OTA_STEP_KEYS: { step: OtaStep; key: string }[] = [
	{ step: "removing_old_device", key: "flasher.step_removing" },
	{ step: "downloading_firmware", key: "flasher.step_downloading" },
	{ step: "flashing", key: "flasher.step_flashing" },
	{ step: "waiting_for_reboot", key: "flasher.step_rebooting" },
	{ step: "adding_to_esphome", key: "flasher.step_adding" },
	{ step: "complete", key: "flasher.step_complete" },
];

const STEP_ORDER = OTA_STEP_KEYS.map((s) => s.step);

@customElement("epp-flasher-view")
export class EppFlasherView extends LitElement {
	static styles = [flasherStyles];

	@property({ attribute: false }) hass: any;
	@property({ attribute: false }) flashableDevices: FlashableDevice[] = [];
	@property({ type: Boolean }) loading = false;
	@property({ attribute: false }) otaProgress: OtaProgress | null = null;
	@property({ type: String }) flashingMac: string | null = null;
	@property({ attribute: false }) localize: (
		key: string,
		params?: Record<string, string | number>,
	) => string = (k) => k;

	@state() private _selectedVariant: "wifi" | "ethernet" = "wifi";
	@state() private _confirmDevice: FlashableDevice | null = null;
	@state() private _hasWebSerial: boolean =
		typeof navigator !== "undefined" && "serial" in navigator;
	@state() private _showUsbFlash = false;

	// WiFi provisioning state
	@state() private _wifiNetworks: WifiNetwork[] = [];
	@state() private _wifiScanning = false;
	@state() private _selectedSsid = "";
	@state() private _manualSsid = false;
	@state() private _wifiPassword = "";
	@state() private _wifiConnected = false;
	@state() private _deviceIp: string | null = null;
	@state() private _showWifiProvisioning = false;
	@state() private _usbFlashState: UsbFlashState | null = null;

	private _dispatchFlashOta(): void {
		if (!this._confirmDevice) return;
		this.dispatchEvent(
			new CustomEvent("flash-ota", {
				detail: {
					mac: this._confirmDevice.mac,
					variant: this._selectedVariant,
				},
				bubbles: true,
				composed: true,
			}),
		);
		this._confirmDevice = null;
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
		this._usbFlashState = null;
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

	private _renderOtaProgress(progress: OtaProgress) {
		const currentIdx = STEP_ORDER.indexOf(progress.step);
		const isError =
			progress.status === "failed" || progress.status === "timeout";
		const isSuccess = progress.status === "success";

		return html`
      <div class="progress-steps">
        ${OTA_STEP_KEYS.map((s, idx) => {
					const isActive = s.step === progress.step;
					const isDone = idx < currentIdx;
					const hasError = isActive && isError;

					let stepClass = "progress-step";
					let icon = "○";
					if (hasError) {
						stepClass += " step-error";
						icon = "✗";
					} else if (isDone || (isActive && isSuccess)) {
						stepClass += " step-done";
						icon = "✓";
					} else if (isActive) {
						stepClass += " step-active";
						icon = "⟳";
					}

					return html`
            <div class="${stepClass}">
              <span class="step-icon">${icon}</span>
              <span>${this.localize(s.key)}</span>
              ${
								isActive && progress.progress != null
									? html`<span>(${progress.progress}%)</span>`
									: nothing
							}
              ${
								hasError && progress.error
									? html`<span class="step-error"> — ${progress.error}</span>`
									: nothing
							}
            </div>
          `;
				})}
      </div>
      ${
				isSuccess
					? html`
          <div class="confirm-actions" style="margin-top:16px">
            <button class="go-device-btn" @click=${this._dispatchFlashComplete}>
              ${this.localize("flasher.go_to_config")}
            </button>
          </div>
        `
					: nothing
			}
    `;
	}

	private _renderConfirmDialog(device: FlashableDevice) {
		return html`
      <div class="confirm-dialog">
        <div class="confirm-card">
          <h3>${this.localize("flasher.flash_device", { name: device.name })}</h3>
          <p>${this.localize("flasher.confirm_flash", { name: device.name, host: device.host ?? "" })}</p>
          <div class="variant-selector">
            <label class="variant-option">
              <input
                type="radio"
                name="variant"
                value="wifi"
                .checked=${this._selectedVariant === "wifi"}
                @change=${() => {
									this._selectedVariant = "wifi";
								}}
              />
              ${this.localize("flasher.wifi")}
            </label>
            <label class="variant-option">
              <input
                type="radio"
                name="variant"
                value="ethernet"
                .checked=${this._selectedVariant === "ethernet"}
                @change=${() => {
									this._selectedVariant = "ethernet";
								}}
              />
              ${this.localize("flasher.ethernet")}
            </label>
          </div>
          <div class="confirm-actions">
            <button
              class="cancel-btn"
              @click=${() => {
								this._confirmDevice = null;
							}}
            >
              ${this.localize("common.cancel")}
            </button>
            <button class="flash-btn" @click=${this._dispatchFlashOta}>
              ${this.localize("flasher.flash")}
            </button>
          </div>
        </div>
      </div>
    `;
	}

	private _renderWifiProvisioning() {
		if (this._wifiConnected) {
			return html`
        <div class="wifi-provisioning">
          <h3>${this.localize("flasher.configure_wifi")}</h3>
          <p>
            ${this.localize("flasher.connected_to", { ssid: this._selectedSsid })}
            ${this._deviceIp ? html` — ${this.localize("flasher.ip_address", { ip: this._deviceIp })}` : nothing}
          </p>
          <div class="confirm-actions">
            <button
              class="wifi-continue-btn"
              @click=${this._dispatchWifiComplete}
            >
              ${this.localize("flasher.continue")}
            </button>
          </div>
        </div>
      `;
		}

		const sortedNetworks = [...this._wifiNetworks].sort(
			(a, b) => b.rssi - a.rssi,
		);

		return html`
      <div class="wifi-provisioning">
        <h3>${this.localize("flasher.configure_wifi")}</h3>

        <div class="wifi-scan-row">
          <button class="wifi-scan-btn" @click=${this._dispatchWifiScan}>
            ${this.localize("flasher.scan")}
          </button>
          ${
						this._wifiScanning
							? html`<span class="wifi-scanning">${this.localize("flasher.scanning")}</span>`
							: nothing
					}
        </div>

        ${
					sortedNetworks.length > 0
						? html`
              <select
                class="wifi-network-select"
                .value=${this._selectedSsid}
                @change=${(e: Event) => {
									this._selectedSsid = (e.target as HTMLSelectElement).value;
								}}
              >
                <option value="">${this.localize("flasher.select_a_network")}</option>
                ${sortedNetworks.map(
									(n) => html`
                    <option value="${n.ssid}">
                      ${n.authRequired ? "🔒 " : ""}${n.ssid} (${n.rssi} dBm)
                    </option>
                  `,
								)}
              </select>
            `
						: nothing
				}

        <label class="wifi-manual-toggle">
          <input
            type="checkbox"
            .checked=${this._manualSsid}
            @change=${(e: Event) => {
							this._manualSsid = (e.target as HTMLInputElement).checked;
							if (!this._manualSsid) this._selectedSsid = "";
						}}
          />
          ${this.localize("flasher.manual_ssid")}
        </label>

        ${
					this._manualSsid
						? html`
              <input
                class="wifi-ssid-input"
                type="text"
                placeholder="${this.localize("flasher.enter_ssid")}"
                .value=${this._selectedSsid}
                @input=${(e: Event) => {
									this._selectedSsid = (e.target as HTMLInputElement).value;
								}}
              />
            `
						: nothing
				}

        <input
          class="wifi-password-input"
          type="password"
          placeholder="${this.localize("flasher.wifi_password")}"
          .value=${this._wifiPassword}
          @input=${(e: Event) => {
						this._wifiPassword = (e.target as HTMLInputElement).value;
					}}
        />

        <div class="confirm-actions">
          <button
            class="wifi-configure-btn"
            .disabled=${!this._selectedSsid}
            @click=${this._dispatchWifiProvision}
          >
            ${this.localize("flasher.configure_wifi")}
          </button>
        </div>
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
                        <button
                          class="flash-btn"
                          .disabled=${!device.available}
                          @click=${() => {
														this._confirmDevice = device;
													}}
                        >
                          ${this.localize("flasher.flash")}
                        </button>
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

		if (this.otaProgress) {
			return this._renderOtaProgress(this.otaProgress);
		}

		if (this._showUsbFlash) {
			return this._renderUsbFlash();
		}

		return html`
      ${
				this._confirmDevice
					? this._renderConfirmDialog(this._confirmDevice)
					: nothing
			}
      ${this._renderDeviceList()}
    `;
	}

	private _getFirmwareVariant(): string {
		return this._selectedVariant === "wifi"
			? "wifi-ble-co2"
			: "ethernet-ble-co2";
	}

	private _getManifestUrl(): string {
		const variant = this._getFirmwareVariant();
		return `https://clintongormley.github.io/everything-presence-pro-grid/firmware/everything-presence-pro-${variant}-manifest.json`;
	}

	private _renderUsbFlash() {
		const state = this._usbFlashState;

		// WiFi provisioning (full-screen takeover)
		if (state?.step === "wifi_provision" && this._showWifiProvisioning) {
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
								<button class="cancel-btn" @click=${this._onUsbBack}>
									${this.localize("flasher.usb_back")}
								</button>
								<button class="usb-retry-btn flash-btn" @click=${this._dispatchUsbRetry}>
									${this.localize("flasher.usb_retry")}
								</button>
							</div>
						</div>
					</ha-card>
				</div>
			`;
		}

		// Complete state
		if (state?.step === "complete") {
			return html`
				<div class="flasher-content">
					<ha-card>
						<div class="card-content">
							<div class="usb-complete">
								<ha-icon icon="mdi:check-circle-outline"></ha-icon>
								<p>${this.localize("flasher.usb_step_complete")}</p>
								${state.ip ? html`<p class="usb-ip">${this.localize("flasher.ip_address")}: ${state.ip}</p>` : nothing}
							</div>
							<div class="confirm-actions">
								<button class="go-device-btn" @click=${this._dispatchFlashComplete}>
									${this.localize("flasher.go_to_config")}
								</button>
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
							<button
								class="variant-option ${this._selectedVariant === "wifi" ? "selected" : ""}"
								@click=${() => {
									this._selectedVariant = "wifi";
								}}
							>${this.localize("flasher.wifi")}</button>
							<button
								class="variant-option ${this._selectedVariant === "ethernet" ? "selected" : ""}"
								@click=${() => {
									this._selectedVariant = "ethernet";
								}}
							>${this.localize("flasher.ethernet")}</button>
						</div>
						<div class="confirm-actions">
							<button class="cancel-btn" @click=${this._onUsbBack}>
								${this.localize("flasher.usb_back")}
							</button>
							<button class="flash-btn" @click=${this._dispatchUsbFlash}>
								${this.localize("flasher.usb_flash")}
							</button>
						</div>
					</div>
				</ha-card>
			</div>
		`;
	}
}
