import { css, html, LitElement, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import type { LocalizeFn } from "../localize.js";
import "../ui/epp-field.js";
import "../ui/epp-button.js";
import "../ui/epp-toggle.js";

export class EppSetupForm extends LitElement {
	@property({ type: String }) name = "";
	@property({ attribute: false }) hass: { [key: string]: unknown } | null =
		null;
	@property({ attribute: false }) localize: LocalizeFn = ((k: string) =>
		k) as LocalizeFn;

	@state() private _name = "";
	@state() private _areaId: string | null = null;
	@state() private _recreate = true;
	private _initialName = "";
	private _initialAreaId: string | null = null;
	private _initialized = false;

	static styles = css`
		.recreate-toggle {
			margin-top: var(--epp-space-3);
		}
		.setup-form-actions {
			display: flex;
			justify-content: flex-end;
			gap: var(--epp-space-3);
			margin-top: var(--epp-space-4);
		}
	`;

	willUpdate(changed: PropertyValues): void {
		if (!this._initialized && changed.has("name")) {
			this._initialized = true;
			this._name = this.name ?? "";
			this._initialName = this.name ?? "";
		}
	}

	private get _nameChanged(): boolean {
		return this._name !== this._initialName;
	}

	/**
	 * A *meaningful* rename: changed AND not blank. Entity-ID regeneration
	 * (and its toggle) only make sense for a real new name — clearing the
	 * field to empty is not a rename, so it must not arm regen.
	 */
	private get _hasNewName(): boolean {
		return this._nameChanged && this._name.trim() !== "";
	}

	private get _dirty(): boolean {
		return this._nameChanged || this._areaId !== this._initialAreaId;
	}

	private _onNameChanged = (e: CustomEvent) => {
		e.stopPropagation();
		this._name = e.detail.value;
	};

	private _onAreaChanged = (e: CustomEvent) => {
		e.stopPropagation();
		this._areaId = (e.detail.value as string) || null;
	};

	private _onRecreateChanged = (e: CustomEvent) => {
		e.stopPropagation();
		this._recreate = e.detail.value as boolean;
	};

	private _submit = (): void => {
		this.dispatchEvent(
			new CustomEvent("setup-submit", {
				detail: {
					name: this._name,
					areaId: this._areaId,
					recreateEntityIds: this._hasNewName && this._recreate,
				},
				bubbles: true,
				composed: true,
			}),
		);
	};

	private _renderArea(L: LocalizeFn) {
		return customElements.get("ha-area-picker")
			? html`<ha-area-picker .hass=${this.hass} .value=${this._areaId ?? ""} @value-changed=${this._onAreaChanged}></ha-area-picker>`
			: html`<epp-field .label=${L("device_setup.area_label")} .value=${this._areaId ?? ""} @value-changed=${this._onAreaChanged}></epp-field>`;
	}

	render() {
		const L = this.localize;
		const btnLabel = this._dirty
			? L("device_setup.finish")
			: L("device_setup.skip_and_finish");
		return html`
			<p>${L("device_setup.name_help")}</p>
			<epp-field
				.label=${L("device_setup.name_label")}
				.value=${this._name}
				@value-changed=${this._onNameChanged}
			></epp-field>
			<p>${L("device_setup.area_help")}</p>
			${this._renderArea(L)}
			${
				this._hasNewName
					? html`<epp-toggle
						class="recreate-toggle"
						data-test="recreate"
						.label=${L("device_setup.recreate_entity_ids")}
						.checked=${this._recreate}
						@value-changed=${this._onRecreateChanged}
					></epp-toggle>`
					: ""
			}
			<div class="setup-form-actions">
				<epp-button variant="primary" @click=${this._submit}>${btnLabel}</epp-button>
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
