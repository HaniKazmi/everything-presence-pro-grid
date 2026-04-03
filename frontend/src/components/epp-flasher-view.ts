import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { flasherStyles } from "../styles.js";
import type { FlashableDevice, OtaProgress, OtaStep } from "../types.js";
import type { WifiNetwork } from "../lib/improv-serial.js";

const OTA_STEPS: { step: OtaStep; label: string }[] = [
	{ step: "removing_old_device", label: "Removing old device" },
	{ step: "downloading_firmware", label: "Downloading firmware" },
	{ step: "flashing", label: "Flashing firmware" },
	{ step: "waiting_for_reboot", label: "Waiting for reboot" },
	{ step: "adding_to_esphome", label: "Adding to ESPHome" },
	{ step: "complete", label: "Complete" },
];

const STEP_ORDER = OTA_STEPS.map((s) => s.step);

const ESP_WEB_TOOLS_URL =
	"https://unpkg.com/esp-web-tools@10/dist/web/install-button.js";
let espWebToolsLoaded = false;

function loadEspWebTools(): Promise<void> {
	if (espWebToolsLoaded) return Promise.resolve();
	return new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.type = "module";
		script.src = ESP_WEB_TOOLS_URL;
		script.onload = () => {
			espWebToolsLoaded = true;
			resolve();
		};
		script.onerror = reject;
		document.head.appendChild(script);
	});
}

@customElement("epp-flasher-view")
export class EppFlasherView extends LitElement {
	static styles = [flasherStyles];

	@property({ attribute: false }) hass: any;
	@property({ attribute: false }) flashableDevices: FlashableDevice[] = [];
	@property({ type: Boolean }) loading = false;
	@property({ attribute: false }) otaProgress: OtaProgress | null = null;
	@property({ type: String }) flashingMac: string | null = null;

	@state() private _selectedVariant: "wifi" | "ethernet" = "wifi";
	@state() private _confirmDevice: FlashableDevice | null = null;
	@state() private _hasWebSerial: boolean =
		typeof navigator !== "undefined" && "serial" in navigator;

	// WiFi provisioning state
	@state() private _wifiNetworks: WifiNetwork[] = [];
	@state() private _wifiScanning = false;
	@state() private _selectedSsid = "";
	@state() private _manualSsid = false;
	@state() private _wifiPassword = "";
	@state() private _wifiConnected = false;
	@state() private _deviceIp: string | null = null;
	@state() private _showWifiProvisioning = false;

	private _dispatchFlashOta(): void {
		if (!this._confirmDevice) return;
		this.dispatchEvent(
			new CustomEvent("flash-ota", {
				detail: { mac: this._confirmDevice.mac, variant: this._selectedVariant },
				bubbles: true,
				composed: true,
			}),
		);
		this._confirmDevice = null;
	}

	private _dispatchUsbConnect(): void {
		this.dispatchEvent(
			new CustomEvent("usb-connect", { bubbles: true, composed: true }),
		);
	}

	private _dispatchFlashComplete(): void {
		this.dispatchEvent(
			new CustomEvent("flash-complete", { bubbles: true, composed: true }),
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
		return html`<div class="flasher-loading">Loading devices...</div>`;
	}

	private _renderOtaProgress(progress: OtaProgress) {
		const currentIdx = STEP_ORDER.indexOf(progress.step);
		const isError =
			progress.status === "failed" || progress.status === "timeout";
		const isSuccess = progress.status === "success";

		return html`
      <div class="progress-steps">
        ${OTA_STEPS.map((s, idx) => {
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
              <span>${s.label}</span>
              ${isActive && progress.progress != null
								? html`<span>(${progress.progress}%)</span>`
								: nothing}
              ${hasError && progress.error
								? html`<span class="step-error"> — ${progress.error}</span>`
								: nothing}
            </div>
          `;
				})}
      </div>
      ${isSuccess
				? html`
          <div class="confirm-actions" style="margin-top:16px">
            <button class="go-device-btn" @click=${this._dispatchFlashComplete}>
              Go to Device Configuration
            </button>
          </div>
        `
				: nothing}
    `;
	}

	private _renderConfirmDialog(device: FlashableDevice) {
		return html`
      <div class="confirm-dialog">
        <div class="confirm-card">
          <h3>Flash Firmware</h3>
          <p>
            Flash EPP Grid firmware to <strong>${device.name}</strong>?
            This will replace the existing firmware.
          </p>
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
              WiFi
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
              Ethernet
            </label>
          </div>
          <div class="confirm-actions">
            <button
              class="cancel-btn"
              @click=${() => {
								this._confirmDevice = null;
							}}
            >
              Cancel
            </button>
            <button class="flash-btn" @click=${this._dispatchFlashOta}>
              Flash
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
          <h3>WiFi Connected</h3>
          <p>
            Connected to <strong>${this._selectedSsid}</strong>
            ${this._deviceIp ? html` — IP: <strong>${this._deviceIp}</strong>` : nothing}
          </p>
          <div class="confirm-actions">
            <button
              class="wifi-continue-btn"
              @click=${this._dispatchWifiComplete}
            >
              Continue
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
        <h3>WiFi Setup</h3>

        <div class="wifi-scan-row">
          <button class="wifi-scan-btn" @click=${this._dispatchWifiScan}>
            Scan
          </button>
          ${this._wifiScanning
						? html`<span class="wifi-scanning">Scanning...</span>`
						: nothing}
        </div>

        ${sortedNetworks.length > 0
					? html`
              <select
                class="wifi-network-select"
                .value=${this._selectedSsid}
                @change=${(e: Event) => {
									this._selectedSsid = (e.target as HTMLSelectElement).value;
								}}
              >
                <option value="">Select a network...</option>
                ${sortedNetworks.map(
									(n) => html`
                    <option value="${n.ssid}">
                      ${n.authRequired ? "🔒 " : ""}${n.ssid} (${n.rssi} dBm)
                    </option>
                  `,
								)}
              </select>
            `
					: nothing}

        <label class="wifi-manual-toggle">
          <input
            type="checkbox"
            .checked=${this._manualSsid}
            @change=${(e: Event) => {
							this._manualSsid = (e.target as HTMLInputElement).checked;
							if (!this._manualSsid) this._selectedSsid = "";
						}}
          />
          Enter network name manually (hidden network)
        </label>

        ${this._manualSsid
					? html`
              <input
                class="wifi-ssid-input"
                type="text"
                placeholder="Network name (SSID)"
                .value=${this._selectedSsid}
                @input=${(e: Event) => {
									this._selectedSsid = (e.target as HTMLInputElement).value;
								}}
              />
            `
					: nothing}

        <input
          class="wifi-password-input"
          type="password"
          placeholder="Password"
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
            Configure WiFi
          </button>
        </div>
      </div>
    `;
	}

	private _renderDeviceList() {
		const { flashableDevices } = this;

		return html`
      <div class="flasher-section">
        <h3>Devices</h3>
        ${flashableDevices.length === 0
					? html`<div class="flasher-empty">
              No flashable devices found.
            </div>`
					: html`
              <div class="device-list">
                ${flashableDevices.map(
									(device) => html`
                    <div class="device-row">
                      <div class="device-info">
                        <div class="device-name">${device.name}</div>
                        <div class="device-host">
                          ${device.host ?? "Offline"}
                        </div>
                      </div>
                      <span
                        class="firmware-badge firmware-badge-${device.firmware_type}"
                      >
                        ${device.firmware_type === "original"
									? "Original"
									: "EPP Grid"}
                      </span>
                      <button
                        class="flash-btn"
                        .disabled=${!device.available}
                        @click=${() => {
									this._confirmDevice = device;
								}}
                      >
                        Flash
                      </button>
                    </div>
                  `,
								)}
              </div>
            `}
      </div>
      ${this._renderUsbSection()}
    `;
	}

	private _renderUsbSection() {
		return html`
      <div class="usb-section">
        <div class="usb-section-text">
          Connect a device via USB to flash firmware directly.
          ${!this._hasWebSerial
					? html`<div class="browser-warning">
                Web Serial is not supported in this browser. Use Chrome or Edge.
              </div>`
					: nothing}
        </div>
        <button class="usb-connect-btn" @click=${this._dispatchUsbConnect}>
          Connect
        </button>
      </div>
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

		return html`
      ${this._confirmDevice
				? this._renderConfirmDialog(this._confirmDevice)
				: nothing}
      ${this._renderDeviceList()}
    `;
	}
}

// Exported for external use if needed
export { loadEspWebTools };
