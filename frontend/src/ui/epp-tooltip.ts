import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";

/** Hover/focus hint for icon buttons & truncated text. Replaces raw `title=`. */
export class EppTooltip extends LitElement {
	@property({ type: String }) content = "";

	static styles = css`
    :host { display: inline-flex; position: relative; }
    .tip {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: var(--epp-text, #0c0d10);
      color: var(--epp-surface, #fff);
      border-radius: var(--epp-radius-sm, 6px);
      padding: var(--epp-space-1, 4px) var(--epp-space-2, 8px);
      font-size: var(--epp-font-xs, 12px);
      white-space: nowrap;
      box-shadow: var(--epp-elevation-1, 0 4px 14px rgba(0, 0, 0, 0.4));
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.12s;
      z-index: 9999;
    }
    :host(:hover) .tip,
    :host(:focus-within) .tip { opacity: 1; }
  `;

	render() {
		return html`
      <slot></slot>
      <span class="tip" role="tooltip">${this.content}</span>
    `;
	}
}

/* v8 ignore start — the already-defined path only triggers on HA panel
   re-import (module re-eval), unreachable in a single test environment */
if (!customElements.get("epp-tooltip")) {
	customElements.define("epp-tooltip", EppTooltip);
}
/* v8 ignore stop */

declare global {
	interface HTMLElementTagNameMap {
		"epp-tooltip": EppTooltip;
	}
}
