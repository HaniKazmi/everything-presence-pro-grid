import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { toggleStyles } from "../styles.js";

/** Label + switch row. Uses ha-switch when registered, else a themed checkbox. */
export class EppToggle extends LitElement {
	@property({ type: String }) label = "";
	@property({ type: Boolean }) checked = false;
	@property({ type: Boolean }) disabled = false;

	// Whether ha-switch exists is fixed for the element's lifetime — resolve once
	// rather than querying the registry on every render.
	private readonly _useHaSwitch = !!customElements.get("ha-switch");

	static styles = [
		toggleStyles,
		css`
      :host { display: block; }
      .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--epp-space-3, 12px);
      }
      .label {
        font-size: var(--epp-font-base, 14px);
        color: var(--epp-text, var(--primary-text-color, #212121));
      }
    `,
	];

	private _onChange = (e: Event) => {
		e.stopPropagation();
		const value = (e.target as HTMLInputElement).checked;
		this.checked = value;
		this.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value },
				bubbles: true,
				composed: true,
			}),
		);
	};

	render() {
		const control = this._useHaSwitch
			? html`<ha-switch
          data-toggle-control
          .checked=${this.checked}
          .disabled=${this.disabled}
          @change=${this._onChange}
        ></ha-switch>`
			: html`<label class="toggle-switch">
          <input
            type="checkbox"
            data-toggle-control
            .checked=${this.checked}
            .disabled=${this.disabled}
            @change=${this._onChange}
          />
          <span class="toggle-slider"></span>
        </label>`;
		return html`<div class="row"><span class="label">${this.label}</span>${control}</div>`;
	}
}

/* v8 ignore start — the already-defined path only triggers on HA panel
   re-import (module re-eval), unreachable in a single test environment */
if (!customElements.get("epp-toggle")) {
	customElements.define("epp-toggle", EppToggle);
}
/* v8 ignore stop */

declare global {
	interface HTMLElementTagNameMap {
		"epp-toggle": EppToggle;
	}
}
