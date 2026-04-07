import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import "../eppgrid-panel.js";

export class EppDeviceCard extends LitElement {
	@property({ attribute: false }) hass: any;
	static styles = css`:host { display: block; height: 100%; }`;
	setConfig(_config: any) {}
	render() {
		return html`<eppgrid-panel .hass=${this.hass}></eppgrid-panel>`;
	}
}

if (!customElements.get("epp-device-card")) {
	customElements.define("epp-device-card", EppDeviceCard);
}
