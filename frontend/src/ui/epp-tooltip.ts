import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";

/**
 * Hover / keyboard-focus hint for icon buttons & truncated text. Replaces raw
 * `title=`.
 */
export class EppTooltip extends LitElement {
	@property({ type: String }) content = "";

	static styles = css`
    :host { display: inline-flex; position: relative; }
    .tip {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: var(--epp-tooltip-bg, var(--primary-text-color, #212121));
      color: var(--epp-tooltip-text, var(--card-background-color, #fff));
      border-radius: var(--epp-radius-sm, 6px);
      padding: var(--epp-space-1, 4px) var(--epp-space-2, 8px);
      font-size: var(--epp-font-xs, 12px);
      white-space: nowrap;
      box-shadow: var(--epp-elevation-1, 0 2px 8px rgba(0, 0, 0, 0.12));
      opacity: 0;
      /* visibility:hidden (not just opacity) removes it from the a11y tree
         while inactive so screen readers don't announce hidden hint text. */
      visibility: hidden;
      pointer-events: none;
      transition: opacity 0.12s, visibility 0.12s;
      z-index: 9999;
    }
    /* Hover always shows the hint. Focus shows it only when the browser deems
       the focus worth a visible affordance — otherwise clicking the trigger
       would leave the hint on screen after the pointer moved away, since the
       click also focuses it. */
    :host(:hover) .tip,
    :host(:focus-within:not([pointer-focus])) .tip { opacity: 1; visibility: visible; }
  `;

	/**
	 * Marks focus the browser would not draw a focus ring for (i.e. a pointer
	 * press), so the CSS above can show the hint for keyboard focus only.
	 *
	 * Asking the UA via `:focus-visible` keeps no sticky state — a press that
	 * focuses nothing leaves nothing behind — and honours the OS "always show
	 * focus indicator" setting, which inferring intent from `pointerdown` would
	 * silently override.
	 *
	 * The probe must walk to the deep active element: `focusin` is composed, so
	 * its target retargets to the outermost light-DOM child (an `epp-toggle`),
	 * which never matches `:focus-visible` itself. Unlike `:focus`, that
	 * pseudo-class never propagates to a shadow host, so no CSS-only selector
	 * (`:host(:has(:focus-visible))` included) can see across the boundary.
	 */
	private _onFocusIn = () => {
		let el: Element | null = document.activeElement;
		while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
		this.toggleAttribute("pointer-focus", !el?.matches(":focus-visible"));
	};

	private _onFocusOut = () => this.removeAttribute("pointer-focus");

	// Bound on the host rather than as `<slot @focusin=…>` bindings: happy-dom
	// does not route a slotted child's events through the slot element, so the
	// declarative form would leave these handlers unreachable in unit tests.
	// The removal is hygiene, not a leak guard — these listeners are collected
	// with the element, and re-registering the same stable arrow on reconnect
	// (HA churns panels) is a no-op anyway, since addEventListener dedupes.
	connectedCallback(): void {
		super.connectedCallback();
		this.addEventListener("focusin", this._onFocusIn);
		this.addEventListener("focusout", this._onFocusOut);
	}

	disconnectedCallback(): void {
		this.removeEventListener("focusin", this._onFocusIn);
		this.removeEventListener("focusout", this._onFocusOut);
		super.disconnectedCallback();
	}

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
