import { css, html, LitElement, nothing, svg } from "lit";
import { property, state } from "lit/decorators.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { FLOOR_PLAN_SVGS, FURNITURE_CATALOG } from "../constants.js";
import {
	clampTextSizeMm,
	DEFAULT_TEXT_FONT,
	DEFAULT_TEXT_SIZE_MM,
	type FurnitureItem,
	type FurnitureSticker,
	filterAndSortStickers,
	TEXT_FONTS,
	TEXT_MAX_LEN,
} from "../lib/furniture.js";
import { defaultLocalize, type LocalizeFn } from "../localize.js";
import { dialogStyles, sidebarRowStyles } from "../styles.js";
import "../ui/epp-button.js";
import "../ui/epp-dialog.js";
import "../ui/epp-icon-button.js";
import "./epp-zone-color-picker.js";

// Fixed label palettes (domain colours — not themed). Text presets favour
// high-contrast inks; background presets favour light fills.
const TEXT_COLOR_PRESETS = [
	"#212121",
	"#ffffff",
	"#f44336",
	"#2196f3",
	"#4caf50",
	"#ff9800",
	"#9c27b0",
	"#000000",
	"#ffeb3b",
	"#795548",
];
const TEXT_BG_PRESETS = [
	"#ffffff",
	"#000000",
	"#fff59d",
	"#c8e6c9",
	"#bbdefb",
	"#ffccbc",
	"#e1bee7",
	"#eeeeee",
	"#212121",
	"#b0bec5",
];
const TEXT_FONT_OPTIONS = TEXT_FONTS.map((f) => ({
	value: f.key,
	label: f.label,
}));

// Alignment choices with their literal a11y-label keys. Kept as explicit
// string literals (not a `text_label.align_${a}` template) so the translation
// checker can see them referenced — its dynamic-key detection only spans
// dot-separated prefixes, not the underscore-glued `align_left` shape.
const TEXT_ALIGN_OPTIONS = [
	{
		value: "left" as const,
		labelKey: "text_label.align_left",
		icon: "mdi:format-align-left",
	},
	{
		value: "center" as const,
		labelKey: "text_label.align_center",
		icon: "mdi:format-align-center",
	},
	{
		value: "right" as const,
		labelKey: "text_label.align_right",
		icon: "mdi:format-align-right",
	},
];

export class EppFurnitureSidebar extends LitElement {
	@property({ attribute: false }) furniture: FurnitureItem[] = [];
	@property({ attribute: false }) selectedFurnitureId: string | null = null;
	@property({ attribute: false }) hass: any = undefined;
	@property({ attribute: false }) localize: LocalizeFn = defaultLocalize;
	@property({ attribute: false }) showCustomIconPicker = false;
	@property({ attribute: false }) customIconValue = "";
	@state() private _searchQuery = "";

	static styles = [
		dialogStyles,
		sidebarRowStyles,
		css`
			:host {
				display: block;
			}

			.furn-selected-info {
				display: flex;
				flex-direction: column;
				gap: var(--epp-space-2, 8px);
				padding: var(--epp-space-2, 8px);
				border: 2px solid var(--epp-accent, var(--primary-color, #03a9f4));
				border-radius: 8px;
				margin-bottom: var(--epp-space-2, 8px);
			}

			.furn-dims {
				display: flex;
				gap: 6px;
			}

			.furn-dims label {
				flex: 1;
				font-size: 11px;
				color: var(--epp-text-muted, var(--secondary-text-color, #757575));
				display: flex;
				flex-direction: column;
				gap: 2px;
			}

			.furn-dims input,
			.furn-dims select {
				width: 100%;
				padding: var(--epp-space-1, 4px);
				border: 1px solid var(--divider-color, #e0e0e0);
				border-radius: 4px;
				font-size: var(--epp-font-xs, 12px);
				box-sizing: border-box;
				background: var(--card-background-color, #fff);
				color: var(--primary-text-color, #212121);
			}

			.furn-text-editor {
				display: flex;
				flex-direction: column;
				gap: var(--epp-space-2, 8px);
				padding: var(--epp-space-2, 8px);
				border: 2px solid var(--epp-accent, var(--primary-color, #03a9f4));
				border-radius: 8px;
				margin-bottom: var(--epp-space-2, 8px);
			}
			.furn-text-input {
				width: 100%;
				min-height: 44px;
				resize: vertical;
				box-sizing: border-box;
				padding: var(--epp-space-1, 4px);
				border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
				border-radius: var(--epp-radius-sm, 6px);
				font: inherit;
				background: var(--epp-surface, var(--card-background-color, #fff));
				color: var(--epp-text, var(--primary-text-color, #212121));
			}
			.furn-row {
				display: flex;
				align-items: center;
				gap: var(--epp-space-2, 8px);
			}
			.furn-seg {
				display: inline-flex;
				border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
				border-radius: var(--epp-radius-sm, 6px);
				overflow: hidden;
			}
			.furn-seg > button {
				border: 0;
				background: var(--epp-surface, #fff);
				color: var(--epp-text-muted, var(--secondary-text-color, #757575));
				padding: 6px 10px;
				cursor: pointer;
				font: inherit;
				border-right: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
			}
			.furn-seg > button:last-child { border-right: 0; }
			.furn-seg > button[aria-pressed="true"] {
				background: var(--epp-accent, var(--primary-color, #03a9f4));
				color: var(--epp-accent-text, #fff);
			}
			.furn-seg-btn {
				border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
				border-radius: var(--epp-radius-sm, 6px);
				background: var(--epp-surface, #fff);
				color: var(--epp-text-muted, var(--secondary-text-color, #757575));
				padding: 6px 10px;
				cursor: pointer;
				font: inherit;
			}
			.furn-seg-btn[aria-pressed="true"] {
				background: var(--epp-accent, var(--primary-color, #03a9f4));
				color: var(--epp-accent-text, #fff);
				border-color: var(--epp-accent, var(--primary-color, #03a9f4));
			}
			.furn-add-text {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: var(--epp-space-1, 4px);
				width: 100%;
				margin-bottom: 6px;
				padding: var(--epp-space-2, 8px);
				border: 1px dashed var(--epp-accent, var(--primary-color, #03a9f4));
				border-radius: 8px;
				background: transparent;
				color: var(--epp-accent, var(--primary-color, #03a9f4));
				cursor: pointer;
				font: inherit;
			}
			.furn-color-label { flex: 1; font-size: var(--epp-font-xs, 12px); color: var(--epp-text-muted, #757575); }

			.furn-search {
				position: sticky;
				top: 0;
				z-index: 2;
				width: 100%;
				padding: 6px var(--epp-space-2, 8px);
				margin-bottom: 6px;
				border: 1px solid var(--divider-color, #e0e0e0);
				border-radius: 4px;
				font-size: var(--epp-font-xs, 12px);
				box-sizing: border-box;
				background: var(--card-background-color, #fff);
				color: var(--primary-text-color, #212121);
			}

			.furn-catalog {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: var(--epp-space-1, 4px);
				overflow-y: auto;
				flex: 1;
				min-height: 0;
			}

			.furn-sticker {
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: var(--epp-space-1, 4px);
				padding: var(--epp-space-2, 8px) var(--epp-space-1, 4px);
				border: 1px solid var(--divider-color, #e0e0e0);
				border-radius: 8px;
				background: var(--card-background-color, #fff);
				cursor: pointer;
				font-size: 11px;
				color: var(--primary-text-color, #212121);
				text-align: center;
				transition: background 0.15s;
			}

			.furn-sticker:hover {
				background: var(--secondary-background-color, #f5f5f5);
			}

			.furn-sticker span {
				line-height: 1.2;
			}

			.furn-sticker-svg {
				width: 28px;
				height: 28px;
			}
		`,
	];

	render() {
		return this._renderFurnitureSidebar();
	}

	_renderFurnitureSidebar() {
		const selected = this.furniture.find(
			(f) => f.id === this.selectedFurnitureId,
		);

		return html`
			<input
				type="search"
				class="furn-search"
				.value=${this._searchQuery}
				placeholder=${this.localize("furniture.search_placeholder")}
				aria-label=${this.localize("furniture.search_placeholder")}
				@input=${(e: Event) => {
					this._searchQuery = (e.target as HTMLInputElement).value;
				}}
			/>

			<button
				class="furn-add-text"
				type="button"
				@click=${() => this._fireAddText()}
			>
				<ha-icon icon="mdi:format-text" style="--mdc-icon-size: 20px;"></ha-icon>
				<span>${this.localize("text_label.add")}</span>
			</button>

			${
				selected && selected.type === "text"
					? this._renderTextEditor(selected)
					: selected
						? html`
							<div class="furn-selected-info">
								<div class="sidebar-item-row">
									<ha-icon icon="${selected.icon}" style="--mdc-icon-size: 20px;"></ha-icon>
									<strong>${this.localize(selected.label)}</strong>
									<epp-icon-button icon="mdi:close" label=${this.localize("furniture.remove")} variant="danger" class="sidebar-remove-btn" @click=${() => this._fireRemove(selected.id)}></epp-icon-button>
								</div>
								<div class="furn-dims">
									<label>
										${this.localize("dimensions.width_cm")}
										<input type="number" min="10" step="5" .value=${String(Math.round(selected.width / 10))}
											@change=${(e: Event) => this._fireDimensionUpdate(selected.id, "width", (e.target as HTMLInputElement).value)}
										/>
									</label>
									<label>
										${this.localize("dimensions.height_cm")}
										<input type="number" min="10" step="5" .value=${String(Math.round(selected.height / 10))}
											@change=${(e: Event) => this._fireDimensionUpdate(selected.id, "height", (e.target as HTMLInputElement).value)}
										/>
									</label>
									<label>
										${this.localize("dimensions.rotation")}
										<input type="number" step="5" .value=${String(
											// Render the stored value (trimmed to one decimal place
											// to avoid long floats from free-rotate drags) so what
											// the user sees matches what's saved and emitted.
											Math.round(selected.rotation * 10) / 10,
										)}
											@change=${(e: Event) => {
												const v = parseFloat(
													(e.target as HTMLInputElement).value,
												);
												if (!Number.isFinite(v)) return;
												const wrapped = ((v % 360) + 360) % 360;
												this._fireUpdate(selected.id, { rotation: wrapped });
											}}
										/>
									</label>
								</div>
							</div>
						`
						: nothing
			}

			<div class="furn-catalog">
				${filterAndSortStickers(
					FURNITURE_CATALOG,
					this._searchQuery,
					this.localize,
				).map(
					(s) => html`
						<button class="furn-sticker" @click=${() => this._fireAdd(s)}>
							${
								// Object.hasOwn: a plain-object catalog makes prototype
								// members ("constructor", …) truthy under bare indexing.
								s.type === "svg" && Object.hasOwn(FLOOR_PLAN_SVGS, s.icon)
									? svg`<svg viewBox="${FLOOR_PLAN_SVGS[s.icon].viewBox}" class="furn-sticker-svg">
										${unsafeSVG(FLOOR_PLAN_SVGS[s.icon].content)}
									</svg>`
									: html`<ha-icon icon="${s.icon}" style="--mdc-icon-size: 24px;"></ha-icon>`
							}
							<span>${this.localize(s.label)}</span>
						</button>
					`,
				)}
				<button class="furn-sticker furn-custom" @click=${() => {
					this.dispatchEvent(
						new CustomEvent("custom-icon-toggle", {
							bubbles: true,
							composed: true,
						}),
					);
				}}>
					<ha-icon icon="mdi:plus" style="--mdc-icon-size: 24px;"></ha-icon>
					<span>${this.localize("furniture.custom_icon")}</span>
				</button>
			</div>
			<epp-dialog
				?open=${this.showCustomIconPicker}
				heading=${this.localize("furniture.custom_icon")}
				@dialog-dismiss=${this._cancelCustomIcon}
			>
				<ha-icon-picker
					.hass=${this.hass}
					.value=${this.customIconValue}
					@value-changed=${(e: CustomEvent) => {
						// Coerce null/undefined to empty string — the panel
						// reflects this back into customIconValue and downstream
						// code (`.trim()`, `<ha-icon icon=...>`) assumes string.
						// Use `??` (not `||`) so an actual "" the user typed is
						// preserved verbatim.
						this.dispatchEvent(
							new CustomEvent("custom-icon-change", {
								detail: e.detail?.value ?? "",
								bubbles: true,
								composed: true,
							}),
						);
					}}
				></ha-icon-picker>
				${
					this.customIconValue.trim()
						? html`
							<div style="text-align: center;">
								<ha-icon icon="${this.customIconValue.trim()}" style="--mdc-icon-size: 48px;"></ha-icon>
							</div>
						`
						: nothing
				}
				<epp-button slot="actions" variant="text" class="wizard-btn wizard-btn-back"
						@click=${this._cancelCustomIcon}
					>${this.localize("common.cancel")}</epp-button>
					<epp-button slot="actions" variant="primary" class="wizard-btn wizard-btn-primary"
						?disabled=${!this.customIconValue.trim()}
						@click=${() => {
							this.dispatchEvent(
								new CustomEvent("furniture-add-custom", {
									detail: this.customIconValue.trim(),
									bubbles: true,
									composed: true,
								}),
							);
							this.dispatchEvent(
								new CustomEvent("custom-icon-change", {
									detail: "",
									bubbles: true,
									composed: true,
								}),
							);
							this.dispatchEvent(
								new CustomEvent("custom-icon-toggle", {
									bubbles: true,
									composed: true,
								}),
							);
						}}
					>${this.localize("common.add")}</epp-button>
			</epp-dialog>
		`;
	}

	private _renderTextEditor(item: FurnitureItem) {
		return html`
			<div class="furn-text-editor">
				<div class="sidebar-item-row">
					<ha-icon icon="mdi:format-text" style="--mdc-icon-size: 20px;"></ha-icon>
					<strong>${this.localize("text_label.label")}</strong>
					<epp-icon-button icon="mdi:close" label=${this.localize("text_label.remove")} variant="danger" class="sidebar-remove-btn" @click=${() => this._fireRemove(item.id)}></epp-icon-button>
				</div>

				<textarea
					class="furn-text-input"
					aria-label=${this.localize("text_label.text")}
					maxlength=${TEXT_MAX_LEN}
					.value=${item.text ?? ""}
					@input=${(e: Event) =>
						this._fireUpdate(item.id, {
							text: (e.target as HTMLTextAreaElement).value,
						})}
				></textarea>

				<div class="furn-dims">
					<label>
						${this.localize("text_label.font")}
						<select
							class="furn-font"
							aria-label=${this.localize("text_label.font")}
							@change=${(e: Event) =>
								this._fireUpdate(item.id, {
									fontFamily: (e.target as HTMLSelectElement).value,
								})}
						>
							${TEXT_FONT_OPTIONS.map(
								(o) =>
									html`<option value=${o.value} ?selected=${o.value === (item.fontFamily ?? DEFAULT_TEXT_FONT)}>${o.label}</option>`,
							)}
						</select>
					</label>
					<label>
						${this.localize("text_label.size_cm")}
						<input
							class="furn-size"
							type="number"
							min="3"
							max="300"
							step="1"
							.value=${String(Math.round((item.fontSize ?? DEFAULT_TEXT_SIZE_MM) / 10))}
							@change=${(e: Event) => {
								const cm = parseFloat((e.target as HTMLInputElement).value);
								if (!Number.isFinite(cm)) return;
								this._fireUpdate(item.id, {
									fontSize: clampTextSizeMm(cm * 10),
								});
							}}
						/>
					</label>
				</div>

				<div class="furn-row">
					<button
						class="furn-seg-btn furn-bold"
						type="button"
						aria-pressed=${item.bold ? "true" : "false"}
						style="font-weight:700"
						@click=${() => this._fireUpdate(item.id, { bold: !item.bold })}
					>${this.localize("text_label.bold")}</button>
					<button
						class="furn-seg-btn furn-italic"
						type="button"
						aria-pressed=${item.italic ? "true" : "false"}
						style="font-style:italic"
						@click=${() => this._fireUpdate(item.id, { italic: !item.italic })}
					>${this.localize("text_label.italic")}</button>
					<span class="furn-seg" role="group" aria-label=${this.localize("text_label.align")}>
						${TEXT_ALIGN_OPTIONS.map(
							(a) => html`<button
								class="furn-align"
								type="button"
								data-align=${a.value}
								aria-pressed=${(item.align ?? "center") === a.value ? "true" : "false"}
								aria-label=${this.localize(a.labelKey)}
								@click=${() => this._fireUpdate(item.id, { align: a.value })}
							><ha-icon icon="${a.icon}" style="--mdc-icon-size:16px"></ha-icon></button>`,
						)}
					</span>
				</div>

				<div class="furn-row">
					<span class="furn-color-label">${this.localize("text_label.text_color")}</span>
					<epp-zone-color-picker
						class="furn-text-color"
						.value=${item.color ?? ""}
						.presets=${TEXT_COLOR_PRESETS}
						.localize=${this.localize}
						@value-changed=${(e: CustomEvent) => {
							e.stopPropagation();
							this._fireUpdate(item.id, { color: e.detail.value });
						}}
					></epp-zone-color-picker>
				</div>

				<div class="furn-row">
					<span class="furn-color-label">${this.localize("text_label.background")}</span>
					<button
						class="furn-seg-btn furn-bg-none"
						type="button"
						aria-pressed=${item.background ? "false" : "true"}
						@click=${() => this._fireUpdate(item.id, { background: undefined })}
					>${this.localize("text_label.no_background")}</button>
					<epp-zone-color-picker
						class="furn-bg-color"
						.value=${item.background ?? "#ffffff"}
						.presets=${TEXT_BG_PRESETS}
						.localize=${this.localize}
						@value-changed=${(e: CustomEvent) => {
							e.stopPropagation();
							this._fireUpdate(item.id, { background: e.detail.value });
						}}
					></epp-zone-color-picker>
				</div>
			</div>
		`;
	}

	/**
	 * Custom-icon-picker dismiss/cancel: closes the picker and clears any
	 * pending icon value. Shared by the Cancel button and Escape
	 * (`dialog-dismiss`) so both paths behave identically.
	 */
	private _cancelCustomIcon = (): void => {
		this.dispatchEvent(
			new CustomEvent("custom-icon-toggle", {
				bubbles: true,
				composed: true,
			}),
		);
		this.dispatchEvent(
			new CustomEvent("custom-icon-change", {
				detail: "",
				bubbles: true,
				composed: true,
			}),
		);
	};

	private _fireAddText(): void {
		this.dispatchEvent(
			new CustomEvent("furniture-add-text", { bubbles: true, composed: true }),
		);
	}

	private _fireAdd(sticker: FurnitureSticker): void {
		this.dispatchEvent(
			new CustomEvent("furniture-add", {
				detail: sticker,
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _fireRemove(id: string): void {
		this.dispatchEvent(
			new CustomEvent("furniture-remove", {
				detail: id,
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _fireUpdate(id: string, updates: Partial<FurnitureItem>): void {
		this.dispatchEvent(
			new CustomEvent("furniture-update", {
				detail: { id, updates },
				bubbles: true,
				composed: true,
			}),
		);
	}

	/**
	 * Width/height mirror the rotation handler's Number.isFinite guard —
	 * a cleared field parses to NaN, which previously flowed straight into
	 * state and rendered as `width: NaNpx`. Values clamp to ≥ 100mm so the
	 * item can't collapse below a grabbable size.
	 */
	private _fireDimensionUpdate(
		id: string,
		field: "width" | "height",
		rawCm: string,
	): void {
		const v = parseInt(rawCm, 10);
		if (!Number.isFinite(v)) return;
		this._fireUpdate(id, { [field]: Math.max(100, v * 10) });
	}
}

if (!customElements.get("epp-furniture-sidebar")) {
	customElements.define("epp-furniture-sidebar", EppFurnitureSidebar);
}
