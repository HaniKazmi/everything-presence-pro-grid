import { css, html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

/** Token-styled icon button. `label` is required (aria-label). */
export class EppIconButton extends LitElement {
	@property({ type: String }) icon = "";
	@property({ type: String }) label = "";
	@property({ type: Boolean }) disabled = false;
	@property({ type: String }) variant: "default" | "danger" = "default";

	static styles = css`
    :host { display: inline-flex; }
    button {
      cursor: pointer;
      border: none;
      background: transparent;
      color: var(--epp-icon-button-color, var(--epp-text-muted, var(--secondary-text-color, #757575)));
      width: var(--epp-control-height, 40px);
      height: var(--epp-control-height, 40px);
      border-radius: var(--epp-radius-md, 10px);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    button:hover { color: var(--epp-icon-button-color, var(--epp-text, var(--primary-text-color, #212121))); }
    .danger:hover { color: var(--epp-icon-button-color, var(--epp-danger, var(--error-color, #f44336))); }
    button:focus-visible {
      outline: var(--epp-focus-ring, 2px solid var(--primary-color, #03a9f4));
      outline-offset: 2px;
    }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
    ha-icon { --mdc-icon-size: 20px; }
  `;

	render() {
		return html`
      <button
        type="button"
        class=${this.variant}
        aria-label=${this.label || nothing}
        ?disabled=${this.disabled}
      >
        <ha-icon icon=${this.icon}></ha-icon>
      </button>
    `;
	}
}

/* v8 ignore start — the already-defined path only triggers on HA panel
   re-import (module re-eval), unreachable in a single test environment */
if (!customElements.get("epp-icon-button")) {
	customElements.define("epp-icon-button", EppIconButton);
}
/* v8 ignore stop */

declare global {
	interface HTMLElementTagNameMap {
		"epp-icon-button": EppIconButton;
	}
}
