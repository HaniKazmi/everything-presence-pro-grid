import { html, LitElement, nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import type { LocalizeFn } from "../localize.js";
import type { DeviceInfo } from "../types.js";
import "../ui/epp-dialog.js";
import "../ui/epp-field.js";
import "../ui/epp-button.js";

type SetupStep = "name" | "area";

export class EppDeviceSetup extends LitElement {
	@property({ type: Boolean }) open = false;
	@property({ attribute: false }) device: DeviceInfo | null = null;
	@property({ attribute: false }) hass: { [key: string]: unknown } | null =
		null;
	@property({ attribute: false }) localize: LocalizeFn = ((k: string) =>
		k) as LocalizeFn;

	@state() private _step: SetupStep = "name";
	@state() private _name = "";
	@state() private _areaId: string | null = null;
	private _initializedMac: string | null = null;

	willUpdate(_changed: PropertyValues): void {
		if (this.open && this.device && this.device.mac !== this._initializedMac) {
			this._initializedMac = this.device.mac;
			this._step = "name";
			this._name = this.device.name ?? "";
			this._areaId = null;
		}
		if (!this.open) {
			this._initializedMac = null;
		}
	}

	private _next = () => {
		this._step = "area";
	};

	private _back = () => {
		this._step = "name";
	};

	private _finish(calibrate: boolean): void {
		if (!this.device) return;
		this.dispatchEvent(
			new CustomEvent("setup-complete", {
				detail: {
					mac: this.device.mac,
					name: this._name,
					areaId: this._areaId,
					calibrate,
				},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _onSkip = () => {
		if (!this.device) return;
		this.dispatchEvent(
			new CustomEvent("setup-skip", {
				detail: { mac: this.device.mac },
				bubbles: true,
				composed: true,
			}),
		);
	};

	private _renderNameStep(L: LocalizeFn) {
		return html`
			<p>${L("device_setup.name_help")}</p>
			<epp-field
				.label=${L("device_setup.name_label")}
				.value=${this._name}
				@value-changed=${(e: CustomEvent) => {
					e.stopPropagation();
					this._name = e.detail.value;
				}}
			></epp-field>
		`;
	}

	private _renderAreaStep(L: LocalizeFn) {
		const onChange = (e: CustomEvent) => {
			e.stopPropagation();
			this._areaId = (e.detail.value as string) || null;
		};
		const picker = customElements.get("ha-area-picker")
			? html`<ha-area-picker .hass=${this.hass} .value=${this._areaId ?? ""} @value-changed=${onChange}></ha-area-picker>`
			: html`<epp-field .label=${L("device_setup.area_label")} .value=${this._areaId ?? ""} @value-changed=${onChange}></epp-field>`;
		return html`<p>${L("device_setup.area_help")}</p>${picker}`;
	}

	render() {
		if (!this.open || !this.device) return nothing;
		const L = this.localize;
		return html`
			<epp-dialog .open=${this.open} .heading=${L("device_setup.title")} @dialog-dismiss=${this._onSkip}>
				${this._step === "name" ? this._renderNameStep(L) : this._renderAreaStep(L)}
				<div slot="actions">
					<epp-button variant="text" @click=${this._onSkip}>${L("device_setup.skip")}</epp-button>
					${
						this._step === "area"
							? html`<epp-button variant="neutral" @click=${this._back}>${L("device_setup.back")}</epp-button>`
							: nothing
					}
					${
						this._step === "name"
							? html`<epp-button variant="primary" @click=${this._next}>${L("device_setup.next")}</epp-button>`
							: html`
								<epp-button variant="neutral" @click=${() => this._finish(false)}>${L("device_setup.later")}</epp-button>
								<epp-button variant="primary" @click=${() => this._finish(true)}>${L("device_setup.calibrate_now")}</epp-button>
							`
					}
				</div>
			</epp-dialog>
		`;
	}
}

if (!customElements.get("epp-device-setup")) {
	customElements.define("epp-device-setup", EppDeviceSetup);
}

declare global {
	interface HTMLElementTagNameMap {
		"epp-device-setup": EppDeviceSetup;
	}
}
