import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import "../eppgrid-panel.js";

@customElement("epp-device-card")
export class EppDeviceCard extends LitElement {
	@property({ attribute: false }) hass: any;
	static styles = css`:host { display: block; height: 100%; }`;
	setConfig(_config: any) {}
	render() {
		return html`<eppgrid-panel .hass=${this.hass}></eppgrid-panel>`;
	}
}
