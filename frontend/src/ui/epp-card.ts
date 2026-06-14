import { css, html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

/** Surface container with optional heading + actions slot. */
export class EppCard extends LitElement {
	@property({ type: String }) heading = "";
	@property({ type: Boolean }) elevated = false;

	// Whether the consumer placed anything in the `actions` slot — drives whether
	// the footer (and its top spacing) renders at all, so cards without actions
	// don't carry an empty gap. Read from light DOM so it's correct on first
	// render without relying on slot APIs; the slotchange handler re-renders if
	// actions are added or removed dynamically.
	private get _hasActions(): boolean {
		return this.querySelector('[slot="actions"]') !== null;
	}

	private _onActionsSlotChange = () => this.requestUpdate();

	static styles = css`
    :host { display: block; }
    .card {
      background: var(--epp-surface, var(--card-background-color, #fff));
      border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
      border-radius: var(--epp-radius-lg, 16px);
      padding: var(--epp-space-4, 16px);
    }
    .card.elevated { box-shadow: var(--epp-elevation-1, 0 2px 8px rgba(0, 0, 0, 0.12)); }
    .card-heading {
      font-size: var(--epp-font-lg, 16px);
      font-weight: var(--epp-weight-semibold, 600);
      color: var(--epp-text, var(--primary-text-color, #212121));
      margin-bottom: var(--epp-space-3, 12px);
    }
    .card-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--epp-space-3, 12px);
      margin-top: var(--epp-space-4, 16px);
    }
    .card-actions[hidden] { display: none; }
  `;

	render() {
		return html`
      <div class="card ${this.elevated ? "elevated" : ""}">
        ${this.heading ? html`<div class="card-heading">${this.heading}</div>` : nothing}
        <slot></slot>
        <div class="card-actions" ?hidden=${!this._hasActions}>
          <slot name="actions" @slotchange=${this._onActionsSlotChange}></slot>
        </div>
      </div>
    `;
	}
}

if (!customElements.get("epp-card")) {
	customElements.define("epp-card", EppCard);
}

declare global {
	interface HTMLElementTagNameMap {
		"epp-card": EppCard;
	}
}
