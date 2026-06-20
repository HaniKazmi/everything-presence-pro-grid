import { css, html, LitElement, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import type { LocalizeFn } from "../localize.js";
import "../ui/epp-field.js";
import "../ui/epp-button.js";

export class EppSetupForm extends LitElement {
	@property({ type: String }) name = "";
	@property({ attribute: false }) hass: { [key: string]: unknown } | null =
		null;
	@property({ attribute: false }) localize: LocalizeFn = ((k: string) =>
		k) as LocalizeFn;

	@state() private _name = "";
	@state() private _areaId: string | null = null;
	private _initialized = false;

	static styles = css`
		.setup-form-actions {
			display: flex;
			justify-content: flex-end;
			gap: var(--epp-space-3);
		}
	`;

	willUpdate(changed: PropertyValues): void {
		if (!this._initialized && changed.has("name")) {
			this._initialized = true;
			this._name = this.name ?? "";
		}
	}

	private _onNameChanged = (e: CustomEvent) => {
		e.stopPropagation();
		this._name = e.detail.value;
	};

	private _onAreaChanged = (e: CustomEvent) => {
		e.stopPropagation();
		this._areaId = (e.detail.value as string) || null;
	};

	private _submit(calibrate: boolean): void {
		this.dispatchEvent(
			new CustomEvent("setup-submit", {
				detail: { name: this._name, areaId: this._areaId, calibrate },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _onSkip = () => {
		this.dispatchEvent(
			new CustomEvent("setup-skip", { bubbles: true, composed: true }),
		);
	};

	private _renderArea(L: LocalizeFn) {
		return customElements.get("ha-area-picker")
			? html`<ha-area-picker .hass=${this.hass} .value=${this._areaId ?? ""} @value-changed=${this._onAreaChanged}></ha-area-picker>`
			: html`<epp-field .label=${L("device_setup.area_label")} .value=${this._areaId ?? ""} @value-changed=${this._onAreaChanged}></epp-field>`;
	}

	render() {
		const L = this.localize;
		return html`
			<p>${L("device_setup.name_help")}</p>
			<epp-field
				.label=${L("device_setup.name_label")}
				.value=${this._name}
				@value-changed=${this._onNameChanged}
			></epp-field>
			<p>${L("device_setup.area_help")}</p>
			${this._renderArea(L)}
			<div class="setup-form-actions">
				<epp-button variant="text" @click=${this._onSkip}>${L("device_setup.skip")}</epp-button>
				<epp-button variant="neutral" @click=${() => this._submit(false)}>${L("device_setup.later")}</epp-button>
				<epp-button variant="primary" @click=${() => this._submit(true)}>${L("device_setup.calibrate_now")}</epp-button>
			</div>
		`;
	}
}

if (!customElements.get("epp-setup-form")) {
	customElements.define("epp-setup-form", EppSetupForm);
}

declare global {
	interface HTMLElementTagNameMap {
		"epp-setup-form": EppSetupForm;
	}
}
