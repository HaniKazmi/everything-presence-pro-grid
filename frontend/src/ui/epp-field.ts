import { css, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { literal, html as staticHtml } from "lit/static-html.js";

/**
 * Single text/number field. Uses ha-input (HA 2026.4+) or ha-textfield (older),
 * matching the repo's existing tag switch; falls back to a native input where
 * neither is registered. Emits one `value-changed` ({ detail: { value } }).
 */
export class EppField extends LitElement {
	@property({ type: String }) label = "";
	@property({ type: String }) value = "";
	@property({ type: String }) type: "text" | "number" = "text";
	@property({ type: String }) unit = "";
	@property({ type: Boolean }) disabled = false;

	// Resolve the control tag once: which ha-* element exists is fixed for the
	// element's lifetime, and `literal` parts must be static within a template —
	// re-resolving in render() would risk a full DOM teardown if it ever changed.
	private readonly _tag = customElements.get("ha-input")
		? literal`ha-input`
		: customElements.get("ha-textfield")
			? literal`ha-textfield`
			: literal`input`;

	static styles = css`
    :host { display: block; }
    .field { display: flex; align-items: center; gap: var(--epp-space-2, 8px); }
    .field > [data-field-control] { flex: 1; min-width: 0; }
    .unit {
      color: var(--epp-text-muted, var(--secondary-text-color, #757575));
      font-size: var(--epp-font-sm, 13px);
      flex-shrink: 0;
    }
  `;

	private _onInput = (e: Event) => {
		// Read the value from the inner control's `input` event and re-emit a
		// single normalized `value-changed`. Stop the inner `input` here.
		e.stopPropagation();
		const value = (e.target as HTMLInputElement).value;
		this.value = value;
		this.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value },
				bubbles: true,
				composed: true,
			}),
		);
	};

	// Some HA controls (e.g. ha-input) also fire their OWN composed
	// `value-changed`. Swallow it so consumers of <epp-field> receive exactly
	// one `value-changed` — the normalized one from `_onInput` above — and not
	// the inner element's event leaking across the shadow boundary.
	private _onInnerValueChanged = (e: Event) => {
		e.stopPropagation();
	};

	render() {
		const tag = this._tag;
		return staticHtml`
      <div class="field">
        <${tag}
          data-field-control
          type=${this.type}
          .label=${this.label}
          .value=${this.value}
          ?disabled=${this.disabled}
          @input=${this._onInput}
          @value-changed=${this._onInnerValueChanged}
        ></${tag}>
        ${this.unit ? staticHtml`<span class="unit">${this.unit}</span>` : ""}
      </div>
    `;
	}
}

/* v8 ignore start — the already-defined path only triggers on HA panel
   re-import (module re-eval), unreachable in a single test environment */
if (!customElements.get("epp-field")) {
	customElements.define("epp-field", EppField);
}
/* v8 ignore stop */

declare global {
	interface HTMLElementTagNameMap {
		"epp-field": EppField;
	}
}
