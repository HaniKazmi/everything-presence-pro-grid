import { mdiDotsVertical } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";

export interface KebabItem {
	id: string;
	label: string;
	/** Optional leading icon (e.g. "mdi:cog"). */
	icon?: string;
	/** Render with the error colour (e.g. Delete). */
	danger?: boolean;
}

/** A non-selectable separator between groups of items. */
export interface KebabDivider {
	divider: true;
}

export type KebabEntry = KebabItem | KebabDivider;

function isDivider(e: KebabEntry): e is KebabDivider {
	return (e as KebabDivider).divider === true;
}

/**
 * Small kebab (⋮) overflow menu. Uses HA's native `ha-button-menu` +
 * `ha-list-item` when registered (the panel case), and falls back to a
 * self-contained popover on older HA / under happy-dom unit tests.
 *
 * Emits `item-select` CustomEvent<{ id: string }>.
 */
export class EppKebabMenu extends LitElement {
	static styles = css`
		:host { position: relative; display: inline-flex; }
		.trigger {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 36px;
			height: 36px;
			padding: 0;
			border: none;
			border-radius: 50%;
			background: none;
			cursor: pointer;
			color: var(--secondary-text-color, #757575);
		}
		.trigger:hover { background: var(--secondary-background-color, #f5f5f5); }
		.menu {
			position: absolute;
			top: 100%;
			right: 0;
			z-index: 20;
			min-width: 160px;
			padding: 4px 0;
			background: var(--card-background-color, #fff);
			border: 1px solid var(--divider-color, #e0e0e0);
			border-radius: 8px;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		}
		.item {
			display: flex;
			align-items: center;
			gap: 10px;
			width: 100%;
			padding: 8px 16px;
			border: none;
			background: none;
			text-align: left;
			font-size: 14px;
			cursor: pointer;
			color: var(--primary-text-color, #212121);
		}
		.item:hover { background: var(--secondary-background-color, #f5f5f5); }
		.item.danger { color: var(--error-color, #f44336); }
		.item ha-icon { --mdc-icon-size: 18px; }
		.kebab-divider {
			height: 0;
			margin: 4px 0;
			border: none;
			border-top: 1px solid var(--divider-color, #e0e0e0);
		}
		ha-list-item.danger { color: var(--error-color, #f44336); }
	`;

	@property({ attribute: false }) items: KebabEntry[] = [];

	@state() private _open = false;

	disconnectedCallback(): void {
		super.disconnectedCallback();
		this._detachOutside();
	}

	render() {
		if (customElements.get("ha-button-menu")) {
			return this._renderNative();
		}
		return this._renderFallback();
	}

	private _renderNative() {
		return html`
			<ha-button-menu
				fixed
				@action=${this._onNativeAction}
				@closed=${(e: Event) => e.stopPropagation()}
			>
				<ha-icon-button
					slot="trigger"
					data-testid="kebab-trigger"
					.path=${mdiDotsVertical}
				></ha-icon-button>
				${this.items.map((entry) =>
					isDivider(entry)
						? html`<li
								divider
								role="separator"
								data-testid="kebab-divider"
							></li>`
						: html`<ha-list-item
								data-testid="kebab-item"
								data-id=${entry.id}
								graphic=${entry.icon ? "icon" : nothing}
								class=${entry.danger ? "danger" : ""}
							>
								${
									entry.icon
										? html`<ha-icon
												slot="graphic"
												icon=${entry.icon}
											></ha-icon>`
										: nothing
								}
								${entry.label}
							</ha-list-item>`,
				)}
			</ha-button-menu>
		`;
	}

	// ha-button-menu's `action.index` counts only its focusable list items
	// (ha-list-item), so map it against the selectable entries — dividers,
	// which are plain <li>, are excluded.
	private _onNativeAction(e: CustomEvent<{ index: number }>) {
		e.stopPropagation();
		const selectable = this.items.filter((x): x is KebabItem => !isDivider(x));
		const item = selectable[e.detail.index];
		if (item) this._emit(item.id);
	}

	private _renderFallback() {
		return html`
			<button
				class="trigger"
				data-testid="kebab-trigger"
				aria-label="More"
				@click=${this._toggle}
			>
				<ha-icon icon="mdi:dots-vertical"></ha-icon>
			</button>
			${
				this._open
					? html`<div class="menu">
							${this.items.map((entry) =>
								isDivider(entry)
									? html`<hr class="kebab-divider" data-testid="kebab-divider" />`
									: html`<button
											class="item ${entry.danger ? "danger" : ""}"
											data-testid="kebab-item"
											data-id=${entry.id}
											@click=${() => this._emit(entry.id)}
										>
											${entry.icon ? html`<ha-icon icon=${entry.icon}></ha-icon>` : nothing}
											${entry.label}
										</button>`,
							)}
						</div>`
					: nothing
			}
		`;
	}

	private _toggle() {
		this._open = !this._open;
		if (this._open) this._attachOutside();
		else this._detachOutside();
	}

	private _emit(id: string) {
		this._open = false;
		this._detachOutside();
		this.dispatchEvent(
			new CustomEvent("item-select", {
				detail: { id },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _onOutside = (e: Event): void => {
		// Pointerdowns inside the menu/trigger are ours — ignore them so the
		// trigger's own click can toggle without this handler racing it closed.
		if (e.composedPath().includes(this)) return;
		this._open = false;
		this._detachOutside();
	};

	private _attachOutside() {
		document.addEventListener("pointerdown", this._onOutside, true);
	}

	private _detachOutside() {
		document.removeEventListener("pointerdown", this._onOutside, true);
	}
}

if (!customElements.get("epp-kebab-menu")) {
	customElements.define("epp-kebab-menu", EppKebabMenu);
}

declare global {
	interface HTMLElementTagNameMap {
		"epp-kebab-menu": EppKebabMenu;
	}
}
