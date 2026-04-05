import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./epp-flasher-view.js";
import { FlasherController } from "../controllers/flasher-controller.js";

@customElement("epp-flasher-card")
export class EppFlasherCard extends LitElement {
	@property({ attribute: false }) hass: any;
	private _flasherCtrl = new FlasherController(this);
	static styles = css`:host { display: block; }`;
	setConfig(_config: any) {}
	updated(changed: Map<string, any>) {
		if (changed.has("hass") && this.hass) {
			this._flasherCtrl.hass = this.hass;
			if (this._flasherCtrl.loading) {
				this._flasherCtrl.loadDevices();
			}
		}
	}
	render() {
		return html`
            <epp-flasher-view
                .hass=${this.hass}
                .flashableDevices=${this._flasherCtrl.flashableDevices}
                .loading=${this._flasherCtrl.loading}
            ></epp-flasher-view>
        `;
	}
}
