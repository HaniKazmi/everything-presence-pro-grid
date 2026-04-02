import { css, html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";
import { CELL_INTERFERENCE_SUPPRESS } from "../lib/grid.js";

export class EppOverlaySidebar extends LitElement {
	@property({ attribute: false }) overlayMode: string | null = null;
	@property({ type: Number }) interferenceLevel: number = 1;
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

		.level-btn {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 28px;
			height: 28px;
			border-radius: 6px;
			border: 1px solid var(--divider-color, #e0e0e0);
			background: var(--card-background-color, #fff);
			color: var(--primary-text-color, #212121);
			font-size: 13px;
			cursor: pointer;
			transition: border-color 0.15s, background 0.15s;
		}

		.level-btn:hover {
			background: var(--secondary-background-color, #f5f5f5);
		}

		.level-btn.active {
			border-color: var(--primary-color, #03a9f4);
			background: var(--primary-color, #03a9f4);
			color: #fff;
		}

		.level-info {
			font-size: 10px;
			color: var(--secondary-text-color, #757575);
			margin-top: 4px;
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
					${
						this.overlayMode === "interference"
							? html`
								<div class="level-selector">
									<div class="level-label">
										${this.localize("overlays.level")}
									</div>
									<div class="level-buttons">
										${[1, 2, 3, CELL_INTERFERENCE_SUPPRESS].map(
											(lvl) => html`
												<div
													class="level-btn ${this.interferenceLevel === lvl ? "active" : ""}"
													@click=${(e: Event) => {
														e.stopPropagation();
														this.dispatchEvent(
															new CustomEvent("interference-level-change", {
																detail: { level: lvl },
																bubbles: true,
																composed: true,
															}),
														);
													}}
												>
													${lvl === CELL_INTERFERENCE_SUPPRESS ? "✕" : lvl}
												</div>
											`,
										)}
									</div>
									<div class="level-info">
										${this.localize("overlays.level_info")}
									</div>
								</div>
							`
							: nothing
					}
				</div>
			</div>
		`;
	}
}

if (!customElements.get("epp-overlay-sidebar")) {
	customElements.define("epp-overlay-sidebar", EppOverlaySidebar);
}
