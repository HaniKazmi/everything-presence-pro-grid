import { css, html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";
import "../components/epp-info-tip.js";

/** Label/control row used by settings and sidebars. */
export class EppSectionRow extends LitElement {
	@property({ type: String }) label = "";
	@property({ type: String }) helper = "";

	static styles = css`
    :host { display: block; }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--epp-space-2, 8px);
      padding: var(--epp-space-3, 12px) 0;
      border-bottom: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
    }
    :host(:last-of-type) .row { border-bottom: none; }
    .label {
      display: inline-flex;
      align-items: center;
      gap: var(--epp-space-1, 4px);
      font-size: var(--epp-font-base, 14px);
      color: var(--epp-text, var(--primary-text-color, #212121));
      flex: 1;
      min-width: 120px;
    }
    .control {
      display: inline-flex;
      align-items: center;
      gap: var(--epp-space-2, 8px);
      justify-content: flex-end;
    }
  `;

	render() {
		return html`
      <div class="row">
        <span class="label">
          ${this.label}
          ${
						this.helper
							? html`<epp-info-tip .text=${this.helper}></epp-info-tip>`
							: nothing
					}
        </span>
        <span class="control"><slot></slot></span>
      </div>
    `;
	}
}

/* v8 ignore start — the already-defined path only triggers on HA panel
   re-import (module re-eval), unreachable in a single test environment */
if (!customElements.get("epp-section-row")) {
	customElements.define("epp-section-row", EppSectionRow);
}
/* v8 ignore stop */

declare global {
	interface HTMLElementTagNameMap {
		"epp-section-row": EppSectionRow;
	}
}
