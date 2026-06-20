import { html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";
import type { LocalizeFn } from "../localize.js";
import type { DeviceInfo } from "../types.js";
import "../ui/epp-dialog.js";
import "./epp-setup-form.js";

export class EppDeviceSetup extends LitElement {
	@property({ type: Boolean }) open = false;
	@property({ attribute: false }) device: DeviceInfo | null = null;
	@property({ attribute: false }) hass: { [key: string]: unknown } | null =
		null;
	@property({ attribute: false }) localize: LocalizeFn = ((k: string) =>
		k) as LocalizeFn;

	private _onSubmit = (e: CustomEvent) => {
		e.stopPropagation();
		if (!this.device) return;
		const { name, areaId, recreateEntityIds } = e.detail as {
			name: string;
			areaId: string | null;
			recreateEntityIds: boolean;
		};
		this.dispatchEvent(
			new CustomEvent("setup-complete", {
				detail: { mac: this.device.mac, name, areaId, recreateEntityIds },
				bubbles: true,
				composed: true,
			}),
		);
	};

	private _onSkip = (e?: Event) => {
		e?.stopPropagation();
		if (!this.device) return;
		this.dispatchEvent(
			new CustomEvent("setup-skip", {
				detail: { mac: this.device.mac },
				bubbles: true,
				composed: true,
			}),
		);
	};

	render() {
		if (!this.open || !this.device) return nothing;
		const L = this.localize;
		return html`
			<epp-dialog .open=${this.open} .heading=${L("device_setup.title")} @dialog-dismiss=${this._onSkip}>
				<epp-setup-form
					.name=${this.device.name ?? ""}
					.hass=${this.hass}
					.localize=${this.localize}
					@setup-submit=${this._onSubmit}
				></epp-setup-form>
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
