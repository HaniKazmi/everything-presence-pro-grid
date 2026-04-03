import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";

export class EppOverlaySidebar extends LitElement {
	@property({ attribute: false }) overlayMode: string | null = null;
	@property({ attribute: false }) localize: (
		key: string,
		params?: Record<string, string | number>,
	) => string = (k) => k;

	static styles = css`
		:host {
			display: block;
		}

		.overlay-scroll-area {
			display: flex;
			flex-direction: column;
			gap: 6px;
		}

		.overlay-item {
			display: flex;
			flex-direction: column;
			gap: 4px;
			padding: 6px 8px;
			border-radius: 8px;
			cursor: pointer;
			border: 2px solid var(--divider-color, #e0e0e0);
			transition: border-color 0.2s;
		}

		.overlay-item:hover {
			background: var(--secondary-background-color, #f5f5f5);
		}

		.overlay-item.active {
			border-color: var(--primary-color, #03a9f4);
		}

		.overlay-item-row {
			display: flex;
			align-items: center;
			gap: 8px;
		}

		.overlay-dot {
			width: 16px;
			height: 16px;
			border-radius: 50%;
			flex-shrink: 0;
			border: 1px solid #ccc;
		}

		.overlay-name {
			flex: 1;
			font-size: 14px;
		}

		.overlay-hint {
			font-size: 11px;
			color: var(--secondary-text-color, #757575);
		}

		.level-selector {
			padding: 4px 0 2px 0;
		}

		.level-label {
			font-size: 11px;
			color: var(--secondary-text-color, #757575);
			margin-bottom: 4px;
		}

		.level-buttons {
			display: flex;
			gap: 4px;
		}

	`;

	render() {
		return html`
			<div class="overlay-scroll-area">
				<!-- Entry / Exit -->
				<div
					class="overlay-item ${this.overlayMode === "entry" ? "active" : ""}"
					@click=${() => {
						this.dispatchEvent(
							new CustomEvent("overlay-select", {
								detail: { mode: this.overlayMode === "entry" ? null : "entry" },
								bubbles: true,
								composed: true,
							}),
						);
					}}
				>
					<div class="overlay-item-row">
						<div
							class="overlay-dot"
							style="background: repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(60,60,60,0.6) 4px, rgba(60,60,60,0.6) 6px);"
						></div>
						<span class="overlay-name"
							>${this.localize("overlays.entry_exit")}</span
						>
						<span class="overlay-hint"
							>${this.localize("overlays.click_to_paint")}</span
						>
					</div>
				</div>

				<!-- Interference -->
				<div
					class="overlay-item ${this.overlayMode === "interference" ? "active" : ""}"
					@click=${() => {
						this.dispatchEvent(
							new CustomEvent("overlay-select", {
								detail: {
									mode:
										this.overlayMode === "interference" ? null : "interference",
								},
								bubbles: true,
								composed: true,
							}),
						);
					}}
				>
					<div class="overlay-item-row">
						<div
							class="overlay-dot"
							style="background: repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(200,0,0,0.6) 4px, rgba(200,0,0,0.6) 6px);"
						></div>
						<span class="overlay-name"
							>${this.localize("overlays.interference")}</span
						>
						<span class="overlay-hint"
							>${this.localize("overlays.click_to_paint")}</span
						>
					</div>
				</div>

				<!-- Suppress -->
				<div
					class="overlay-item ${this.overlayMode === "suppress" ? "active" : ""}"
					@click=${() => {
						this.dispatchEvent(
							new CustomEvent("overlay-select", {
								detail: {
									mode:
										this.overlayMode === "suppress" ? null : "suppress",
								},
								bubbles: true,
								composed: true,
							}),
						);
					}}
				>
					<div class="overlay-item-row">
						<div
							class="overlay-dot"
							style="background: repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(200,0,0,0.6) 4px, rgba(200,0,0,0.6) 6px), repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(200,0,0,0.6) 4px, rgba(200,0,0,0.6) 6px);"
						></div>
						<span class="overlay-name"
							>${this.localize("overlays.suppress")}</span
						>
						<span class="overlay-hint"
							>${this.localize("overlays.click_to_paint")}</span
						>
					</div>
				</div>
			</div>
		`;
	}
}

if (!customElements.get("epp-overlay-sidebar")) {
	customElements.define("epp-overlay-sidebar", EppOverlaySidebar);
}
