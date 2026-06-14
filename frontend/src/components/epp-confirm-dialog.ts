import { css, html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";
import { dialogStyles } from "../styles.js";

/**
 * Themed modal confirm/alert dialog, reusing the panel's shared
 * `.template-dialog` styling so it matches every other dialog. The caller owns
 * the `open` property; the dialog emits `confirm` / `cancel` (it does not close
 * itself). Set `hideCancel` for a single-button alert, `danger` to render the
 * confirm action in the error colour.
 */
export class EppConfirmDialog extends LitElement {
	static styles = [
		dialogStyles,
		css`
			.message {
				margin: 0;
				font-size: 14px;
				color: var(--secondary-text-color, #757575);
			}
			ha-button.danger {
				color: var(--error-color, #f44336);
				--primary-color: var(--error-color, #f44336);
				--mdc-theme-primary: var(--error-color, #f44336);
				--ha-button-text-color: var(--error-color, #f44336);
			}
		`,
	];

	@property({ type: Boolean }) open = false;
	@property() heading = "";
	@property() message = "";
	@property() confirmLabel = "Confirm";
	@property() cancelLabel = "Cancel";
	@property({ type: Boolean }) danger = false;
	/** Alert mode: only the confirm/OK button is shown. */
	@property({ type: Boolean }) hideCancel = false;

	connectedCallback(): void {
		super.connectedCallback();
		document.addEventListener("keydown", this._onKeydown);
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		document.removeEventListener("keydown", this._onKeydown);
	}

	render() {
		if (!this.open) return nothing;
		return html`
			<div class="template-dialog">
				<div
					class="template-dialog-card"
					role="dialog"
					aria-modal="true"
					aria-label=${this.heading || this.confirmLabel}
				>
					${this.heading ? html`<h3>${this.heading}</h3>` : nothing}
					${this.message ? html`<p class="message">${this.message}</p>` : nothing}
					<div class="template-dialog-actions">
						${
							this.hideCancel
								? nothing
								: html`<ha-button
										data-testid="dialog-cancel"
										@click=${this._cancel}
										>${this.cancelLabel}</ha-button
									>`
						}
						<ha-button
							appearance="accent"
							class=${this.danger ? "danger" : ""}
							data-testid="dialog-confirm"
							@click=${this._confirm}
							>${this.confirmLabel}</ha-button
						>
					</div>
				</div>
			</div>
		`;
	}

	private _onKeydown = (e: KeyboardEvent): void => {
		if (this.open && e.key === "Escape") this._cancel();
	};

	private _confirm() {
		this.dispatchEvent(
			new CustomEvent("confirm", { bubbles: true, composed: true }),
		);
	}

	private _cancel() {
		this.dispatchEvent(
			new CustomEvent("cancel", { bubbles: true, composed: true }),
		);
	}
}

customElements.define("epp-confirm-dialog", EppConfirmDialog);

declare global {
	interface HTMLElementTagNameMap {
		"epp-confirm-dialog": EppConfirmDialog;
	}
}
