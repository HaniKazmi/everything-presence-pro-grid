import { css, html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";
import { toggleStyles } from "../styles.js";

/** Label + switch row. Uses ha-switch when registered, else a themed checkbox. */
export class EppToggle extends LitElement {
	@property({ type: String }) label = "";
	@property({ type: Boolean }) checked = false;
	@property({ type: Boolean }) disabled = false;
	/**
	 * Accessible name applied as `aria-label` on the underlying control. Use for a
	 * bare switch (no visible `label`) so screen readers still announce it — a
	 * visible label is not programmatically associated with the control. Omitted
	 * from the DOM when empty.
	 */
	@property({ attribute: "control-label" }) controlLabel = "";

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
		// Re-check per render rather than caching: customElements is monotonic, so
		// an ha-switch registered after this element was constructed must still be
		// picked up (a cached miss would lock us into the checkbox fallback).
		const control = customElements.get("ha-switch")
			? html`<ha-switch
          data-toggle-control
          aria-label=${this.controlLabel || nothing}
          .checked=${this.checked}
          .disabled=${this.disabled}
          @change=${this._onChange}
        ></ha-switch>`
			: html`<label class="toggle-switch">
          <input
            type="checkbox"
            data-toggle-control
            aria-label=${this.controlLabel || nothing}
            .checked=${this.checked}
            .disabled=${this.disabled}
            @change=${this._onChange}
          />
          <span class="toggle-slider"></span>
        </label>`;
		// Omit the label span entirely when empty (e.g. when an enclosing row
		// supplies the label) so it doesn't leave an empty flex item + gap.
		return html`<div class="row">${this.label ? html`<span class="label">${this.label}</span>` : nothing}${control}</div>`;
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
