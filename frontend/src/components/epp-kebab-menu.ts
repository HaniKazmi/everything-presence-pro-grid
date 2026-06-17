import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { DocumentListenerGroup } from "../lib/document-listeners.js";
import "../ui/epp-icon-button.js";

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
 * Small kebab (⋮) overflow menu — a self-contained popover that depends on no
 * native HA menu element. HA removed `ha-button-menu` in 2026.02 (the
 * `mwc-*` → webawesome migration) and the modern replacements churn across
 * versions, so a self-contained widget stays stable across HA releases. The
 * only HA element it touches is the eagerly-registered `ha-icon`. The popover is
 * `position:fixed` and JS-anchored to the trigger (see `_positionFallbackMenu`)
 * so it stays reachable on short viewports.
 *
 * Emits `item-select` CustomEvent<{ id: string }>.
 */
export class EppKebabMenu extends LitElement {
	static styles = css`
		:host { position: relative; display: inline-flex; }
		.menu {
			/* position:fixed + JS anchoring (see _positionFallbackMenu): the popover
			   escapes any overflow/clip ancestor, flips above the trigger when there's
			   more room there, and caps its height to the viewport with its own scroll
			   — so the full menu is reachable on mobile / short viewports. top/left are
			   set inline by JS. */
			position: fixed;
			top: 0;
			left: 0;
			z-index: 20;
			min-width: 160px;
			/* So the JS max-height cap (which uses the available viewport space) bounds
			   the border box — padding + border included — and the popover never spills
			   a few px past the edge. */
			box-sizing: border-box;
			padding: var(--epp-space-1, 4px) 0;
			background: var(--epp-surface, var(--card-background-color, #fff));
			border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
			border-radius: var(--epp-radius-sm, 6px);
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		}
		.item {
			display: flex;
			align-items: center;
			gap: 10px;
			width: 100%;
			padding: var(--epp-space-2, 8px) var(--epp-space-4, 16px);
			border: none;
			background: none;
			text-align: left;
			font-size: var(--epp-font-base, 14px);
			cursor: pointer;
			color: var(--epp-text, var(--primary-text-color, #212121));
		}
		.item:hover { background: var(--epp-surface-2, var(--secondary-background-color, #f5f5f5)); }
		.item.danger { color: var(--epp-danger, var(--error-color, #f44336)); }
		.item ha-icon { --mdc-icon-size: 18px; }
		.kebab-divider {
			height: 0;
			margin: var(--epp-space-1, 4px) 0;
			border: none;
			border-top: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
		}
	`;

	@property({ attribute: false }) items: KebabEntry[] = [];

	@state() private _open = false;

	disconnectedCallback(): void {
		super.disconnectedCallback();
		this._dismiss.detach();
	}

	protected updated(): void {
		// Anchor the popover to the trigger after it renders. Runs synchronously
		// before paint, so there's no flicker.
		if (this._open) this._positionFallbackMenu();
	}

	private _onReposition = (): void => {
		if (this._open) this._positionFallbackMenu();
	};

	// Anchor the fixed popover to the trigger, flipping above it when there's more
	// room there, and cap its height to the available viewport space (it scrolls)
	// so every item is reachable on a phone or a short desktop window.
	/* v8 ignore start -- happy-dom has no layout; exercised visually */
	private _positionFallbackMenu(): void {
		const menu = this.renderRoot.querySelector(".menu") as HTMLElement | null;
		const trigger = this.renderRoot.querySelector(
			'[data-testid="kebab-trigger"]',
		) as HTMLElement | null;
		if (!menu || !trigger) return;
		const t = trigger.getBoundingClientRect();
		const margin = 8;
		const menuW = menu.offsetWidth || 160;
		const fullH = menu.scrollHeight;
		const below = window.innerHeight - t.bottom - margin;
		const above = t.top - margin;
		const openUp = fullH > below && above > below;
		const maxH = Math.max(96, openUp ? above : below);
		const left = Math.max(
			margin,
			Math.min(t.right - menuW, window.innerWidth - menuW - margin),
		);
		const top = openUp
			? Math.max(margin, t.top - Math.min(fullH, maxH))
			: t.bottom;
		menu.style.top = `${top}px`;
		menu.style.left = `${left}px`;
		menu.style.maxHeight = `${maxH}px`;
		menu.style.overflowY = "auto";
	}
	/* v8 ignore stop */

	render() {
		return html`
			<epp-icon-button
				data-testid="kebab-trigger"
				icon="mdi:dots-vertical"
				label="More"
				@click=${this._toggle}
			></epp-icon-button>
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
		if (this._open) this._dismiss.attach();
		else this._dismiss.detach();
	}

	private _emit(id: string) {
		this._open = false;
		this._dismiss.detach();
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
		this._dismiss.detach();
	};

	private _onKeydown = (e: Event): void => {
		if ((e as KeyboardEvent).key === "Escape") {
			this._open = false;
			this._dismiss.detach();
		}
	};

	// Global dismiss listeners, active only while the popover is open. Declared
	// after the handler fields it references (DocumentListenerGroup throws if a
	// listener is undefined at construction). Unlike sibling popovers, scroll/
	// resize REPOSITION the popover rather than close it — the kebab stays
	// anchored to its trigger. Capture phase so an inner scroll container still
	// reaches the handler.
	private _dismiss = new DocumentListenerGroup([
		{
			target: document,
			type: "pointerdown",
			listener: this._onOutside,
			options: true,
		},
		{
			target: document,
			type: "keydown",
			listener: this._onKeydown,
			options: true,
		},
		{
			target: window,
			type: "scroll",
			listener: this._onReposition,
			options: true,
		},
		{ target: window, type: "resize", listener: this._onReposition },
	]);
}

if (!customElements.get("epp-kebab-menu")) {
	customElements.define("epp-kebab-menu", EppKebabMenu);
}

declare global {
	interface HTMLElementTagNameMap {
		"epp-kebab-menu": EppKebabMenu;
	}
}
