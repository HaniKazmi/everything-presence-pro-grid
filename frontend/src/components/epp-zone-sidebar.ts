import { css, html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";
import {
	resolveZoneParams,
	ZONE_TYPE_DEFAULTS,
	ZONE_TYPE_KEYS,
	type Zone0Config,
	type ZoneConfig,
} from "../lib/zone-defaults.js";
import { defaultLocalize, type LocalizeFn } from "../localize.js";
import { toggleStyles } from "../styles.js";

export interface LocalZoneInfo {
	occupied: boolean;
	pendingSince: number | null;
	confirmedTargets: Set<number>;
}

export class EppZoneSidebar extends LitElement {
	@property({ attribute: false }) grid!: Uint8Array;
	@property({ attribute: false }) zoneConfigs: (ZoneConfig | null)[] = [];
	@property({ attribute: false }) activeZone: number | null = null;
	@property({ attribute: false }) zone0: Zone0Config = { type: "default" };
	@property({ attribute: false }) localZoneState: Map<number, LocalZoneInfo> =
		new Map();
	@property({ attribute: false }) localize: LocalizeFn = defaultLocalize;

	// Debounce zone-name input so each keystroke doesn't trigger a full panel
	// re-render. The input keeps its DOM value as the user types; the parent
	// state catches up when typing pauses.
	private static NAME_DEBOUNCE_MS = 150;
	private _nameDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	private _pendingNameUpdate: { index: number; name: string } | null = null;

	private _flushPendingName = (): void => {
		this._nameDebounceTimer = null;
		const pending = this._pendingNameUpdate;
		if (!pending) return;
		this._pendingNameUpdate = null;
		this.dispatchEvent(
			new CustomEvent("zone-config-change", {
				detail: { index: pending.index, updates: { name: pending.name } },
				bubbles: true,
				composed: true,
			}),
		);
		this.dispatchEvent(
			new CustomEvent("dirty", { bubbles: true, composed: true }),
		);
	};

	private _onNameInput(index: number, name: string): void {
		this._pendingNameUpdate = { index, name };
		if (this._nameDebounceTimer !== null) clearTimeout(this._nameDebounceTimer);
		this._nameDebounceTimer = setTimeout(
			this._flushPendingName,
			EppZoneSidebar.NAME_DEBOUNCE_MS,
		);
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		if (this._nameDebounceTimer !== null) {
			clearTimeout(this._nameDebounceTimer);
			this._nameDebounceTimer = null;
		}
		this._pendingNameUpdate = null;
	}

	static styles = [
		toggleStyles,
		css`
			:host {
				display: block;
			}

			.zone-name-input {
				flex: 1;
				border: none;
				border-bottom: 1px solid var(--divider-color, #e0e0e0);
				background: transparent;
				font-size: 14px;
				color: var(--primary-text-color, #212121);
				padding: 2px 4px;
				min-width: 0;
			}

			.zone-name-input:focus {
				outline: none;
				border-bottom: 1px solid var(--primary-color, #03a9f4);
			}

			.sensitivity-select {
				padding: 2px 4px;
				border: 1px solid var(--divider-color, #e0e0e0);
				border-radius: 4px;
				font-size: 12px;
				background: var(--card-background-color, #fff);
				color: var(--primary-text-color, #212121);
				cursor: pointer;
				flex-shrink: 0;
			}

			.zone-color-picker {
				width: 24px;
				height: 24px;
				border: none;
				padding: 0;
				cursor: pointer;
				border-radius: 4px;
				flex-shrink: 0;
			}

			.zone-scroll-area {
				display: flex;
				flex-direction: column;
				gap: 6px;
				overflow-y: auto;
				flex: 1;
				min-height: 0;
			}

			.zone-item {
				display: flex;
				flex-direction: column;
				gap: 4px;
				padding: 6px 8px;
				border-radius: 8px;
				cursor: pointer;
				border: 2px solid var(--divider-color, #e0e0e0);
				transition: border-color 0.2s;
			}

			.zone-item:hover {
				background: var(--secondary-background-color, #f5f5f5);
			}

			.zone-item.active {
				border-color: var(--primary-color, #03a9f4);
			}

			.zone-item-row {
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.zone-settings-row {
				padding-left: 24px;
				gap: 6px;
			}

			.zone-separator {
				border: none;
				border-top: 1px solid var(--divider-color, #e0e0e0);
				margin: 4px 0;
				flex-shrink: 0;
			}

			.zone-color-dot {
				width: 16px;
				height: 16px;
				border-radius: 50%;
				flex-shrink: 0;
			}

			.zone-name {
				flex: 1;
				font-size: 14px;
			}

			.zone-remove-btn {
				background: none;
				border: none;
				color: var(--secondary-text-color, #757575);
				cursor: pointer;
				padding: 4px;
				border-radius: 4px;
			}

			.zone-remove-btn:hover {
				color: var(--error-color, #f44336);
			}

			.add-zone-btn {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 6px;
				padding: 10px;
				border: 2px dashed var(--divider-color, #e0e0e0);
				border-radius: 8px;
				background: none;
				color: var(--primary-color, #03a9f4);
				cursor: pointer;
				font-size: 14px;
				transition: background 0.2s;
			}

			.add-zone-btn:hover {
				background: var(--secondary-background-color, #f5f5f5);
			}
		`,
	];

	render() {
		return this._renderZoneSidebar();
	}

	private _renderZoneSidebar() {
		return html`
			<div class="zone-scroll-area">
				<!-- Room -->
				<div
					class="zone-item ${this.activeZone === 0 ? "active" : ""}"
					@click=${() => {
						this.dispatchEvent(
							new CustomEvent("zone-select", {
								detail: { zone: 0 },
								bubbles: true,
								composed: true,
							}),
						);
					}}
				>
					<div class="zone-item-row">
						<div
							class="zone-color-dot"
							style="background: #fff; border: 1px solid #ccc;${this.localZoneState.get(0)?.occupied ? " box-shadow: 0 0 6px 2px #999;" : ""}"
						></div>
						<span class="zone-name"
							>${this.localize("sidebar.room")}</span
						>
					</div>
					${
						this.activeZone === 0
							? html` ${this._renderBoundaryTypeControls()} `
							: nothing
					}
				</div>

				<hr class="zone-separator" />
				<!-- Named zones 1..N -->
				${this.zoneConfigs.map((zone, i) => {
					if (zone === null) return nothing;
					const slot = i + 1;
					return html`
						<div
							class="zone-item ${this.activeZone === slot ? "active" : ""}"
							@click=${() => {
								this.dispatchEvent(
									new CustomEvent("zone-select", {
										detail: { zone: slot },
										bubbles: true,
										composed: true,
									}),
								);
							}}
						>
							<div class="zone-item-row">
								${
									this.activeZone === slot
										? html`
											<input
												type="color"
												class="zone-color-picker"
												style="width: 16px; height: 16px; border-radius: 50%;${this.localZoneState.get(slot)?.occupied ? ` box-shadow: 0 0 6px 2px ${zone.color};` : ""}"
												.value=${zone.color}
												@input=${(e: Event) => {
													const val = (e.target as HTMLInputElement).value;
													this.dispatchEvent(
														new CustomEvent("zone-config-change", {
															detail: {
																index: i,
																updates: {
																	color: val,
																},
															},
															bubbles: true,
															composed: true,
														}),
													);
													this.dispatchEvent(
														new CustomEvent("dirty", {
															bubbles: true,
															composed: true,
														}),
													);
												}}
												@click=${(e: Event) => e.stopPropagation()}
											/>
										`
										: html`
											<div
												class="zone-color-dot"
												style="background: ${zone.color};${this.localZoneState.get(slot)?.occupied ? ` box-shadow: 0 0 6px 2px ${zone.color};` : ""}"
											></div>
										`
								}
								<input
									class="zone-name-input"
									type="text"
									.value=${zone.name}
									@input=${(e: Event) => {
										const val = (e.target as HTMLInputElement).value;
										this._onNameInput(i, val);
									}}
									@click=${(e: Event) => {
										e.stopPropagation();
										this.dispatchEvent(
											new CustomEvent("zone-select", {
												detail: { zone: slot },
												bubbles: true,
												composed: true,
											}),
										);
									}}
									@focus=${() => {
										this.dispatchEvent(
											new CustomEvent("zone-select", {
												detail: { zone: slot },
												bubbles: true,
												composed: true,
											}),
										);
									}}
								/>
								<button
									class="zone-remove-btn"
									@click=${(e: Event) => {
										e.stopPropagation();
										this.dispatchEvent(
											new CustomEvent("zone-remove", {
												detail: { slot },
												bubbles: true,
												composed: true,
											}),
										);
									}}
								>
									<ha-icon icon="mdi:close"></ha-icon>
								</button>
							</div>
							${
								this.activeZone === slot
									? html`
										${this._renderZoneTypeControls(zone, i)}
									`
									: nothing
							}
						</div>
					`;
				})}

				${
					this.zoneConfigs.some((z) => z === null)
						? html`
							<button
								class="add-zone-btn"
								@click=${() => {
									this.dispatchEvent(
										new CustomEvent("zone-add", {
											bubbles: true,
											composed: true,
										}),
									);
								}}
							>
								<ha-icon icon="mdi:plus"></ha-icon>
								${this.localize("sidebar.add_zone")}
							</button>
						`
						: nothing
				}

			</div>
		`;
	}

	private _emitZone0Change(updates: Partial<Zone0Config>) {
		this.dispatchEvent(
			new CustomEvent<Partial<Zone0Config>>("zone0-change", {
				detail: updates,
				bubbles: true,
				composed: true,
			}),
		);
		this.dispatchEvent(
			new CustomEvent("dirty", {
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _renderBoundaryTypeControls() {
		const z0 = this.zone0;
		const isCustom = z0.type === "custom";
		const resolved = resolveZoneParams(z0);
		const trigger = resolved.trigger;
		const renew = resolved.renew;
		const timeout = resolved.timeout;
		const handoffTimeout = resolved.handoff_timeout;
		const rowStyle = `width: 100%; display: flex; align-items: center; gap: 4px; font-size: 12px; opacity: ${isCustom ? 1 : 0.5};`;
		return html`
			<div
				class="zone-item-row zone-settings-row"
				style="flex-wrap: wrap; gap: 3px; padding: 4px 8px;"
			>
				<div
					style="width: 100%; display: flex; align-items: center; gap: 4px;"
				>
					<label
						style="width: 80px; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.type")}</label
					>
					<select
						class="sensitivity-select"
						style="flex: 1; min-width: 0;"
						.value=${z0.type}
						@change=${(e: Event) => {
							const val = (e.target as HTMLSelectElement)
								.value as Zone0Config["type"];
							// Non-custom types resolve timing from ZONE_TYPE_DEFAULTS on read;
							// emit only the type so we don't persist dead data. Switching
							// INTO custom seeds the sliders with the current type's defaults
							// so the user has a sane starting point.
							if (val === "custom") {
								const d = resolveZoneParams(this.zone0);
								this._emitZone0Change({
									type: val,
									trigger: d.trigger,
									renew: d.renew,
									timeout: d.timeout,
									handoff_timeout: d.handoff_timeout,
								});
							} else {
								this._emitZone0Change({
									type: val,
									trigger: undefined,
									renew: undefined,
									timeout: undefined,
									handoff_timeout: undefined,
								});
							}
						}}
						@click=${(e: Event) => e.stopPropagation()}
					>
						${ZONE_TYPE_KEYS.map(
							(k) =>
								html`<option value=${k}>${this.localize(`zones.${k}`)}</option>`,
						)}
					</select>
				</div>
				<div style="${rowStyle}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.trigger")}</label
					>
					<input
						type="range"
						min="1"
						max="9"
						style="flex: 1; min-width: 0;"
						.value=${String(trigger)}
						?disabled=${!isCustom}
						@input=${(e: Event) => {
							this._emitZone0Change({
								trigger: Number((e.target as HTMLInputElement).value),
							});
						}}
						@click=${(e: Event) => e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${trigger}</span
					>
				</div>
				<div style="${rowStyle}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.renew")}</label
					>
					<input
						type="range"
						min="1"
						max="9"
						style="flex: 1; min-width: 0;"
						.value=${String(renew)}
						?disabled=${!isCustom}
						@input=${(e: Event) => {
							this._emitZone0Change({
								renew: Number((e.target as HTMLInputElement).value),
							});
						}}
						@click=${(e: Event) => e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${renew}</span
					>
				</div>
				<div style="${rowStyle}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.presence_timeout")}</label
					>
					<span style="flex: 1;"></span>
					<input
						type="number"
						min="1"
						max="3600"
						style="width: 48px; text-align: right; font: inherit; font-size: 12px;"
						.value=${String(timeout)}
						?disabled=${!isCustom}
						@input=${(e: Event) => {
							const v = Number((e.target as HTMLInputElement).value);
							if (v > 0) {
								this._emitZone0Change({ timeout: v });
							}
						}}
						@click=${(e: Event) => e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
				<div style="${rowStyle}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.handoff_timeout")}</label
					>
					<span style="flex: 1;"></span>
					<input
						type="number"
						min="1"
						max="300"
						style="width: 48px; text-align: right; font: inherit; font-size: 12px;"
						.value=${String(handoffTimeout)}
						?disabled=${!isCustom}
						@input=${(e: Event) => {
							const v = Number((e.target as HTMLInputElement).value);
							if (v > 0) {
								this._emitZone0Change({ handoff_timeout: v });
							}
						}}
						@click=${(e: Event) => e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
			</div>
		`;
	}

	private _renderZoneTypeControls(zone: ZoneConfig, index: number) {
		const isCustom = zone.type === "custom";
		const defaults =
			ZONE_TYPE_DEFAULTS[zone.type] || ZONE_TYPE_DEFAULTS.default;
		const trigger = zone.trigger ?? defaults.trigger;
		const renew = zone.renew ?? defaults.renew;
		const timeout = zone.timeout ?? defaults.timeout;
		const handoffTimeout = zone.handoff_timeout ?? defaults.handoff_timeout;
		const rowStyle = `width: 100%; display: flex; align-items: center; gap: 4px; font-size: 12px; opacity: ${isCustom ? 1 : 0.5};`;
		return html`
			<div
				class="zone-item-row zone-settings-row"
				style="flex-wrap: wrap; gap: 3px; padding: 4px 8px;"
			>
				<div
					style="width: 100%; display: flex; align-items: center; gap: 4px;"
				>
					<label
						style="width: 80px; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.type")}</label
					>
					<select
						class="sensitivity-select"
						style="flex: 1; min-width: 0;"
						.value=${zone.type}
						@change=${(e: Event) => {
							const val = (e.target as HTMLSelectElement)
								.value as ZoneConfig["type"];
							// Mirror the zone-0 contract: only custom persists timing;
							// other types are resolved from ZONE_TYPE_DEFAULTS at read/push.
							const updates: Partial<ZoneConfig> =
								val === "custom"
									? { ...resolveZoneParams(zone), type: val }
									: {
											type: val,
											trigger: undefined,
											renew: undefined,
											timeout: undefined,
											handoff_timeout: undefined,
										};
							this.dispatchEvent(
								new CustomEvent("zone-config-change", {
									detail: { index, updates },
									bubbles: true,
									composed: true,
								}),
							);
							this.dispatchEvent(
								new CustomEvent("dirty", {
									bubbles: true,
									composed: true,
								}),
							);
						}}
						@click=${(e: Event) => e.stopPropagation()}
					>
						${ZONE_TYPE_KEYS.map(
							(k) =>
								html`<option value=${k}>${this.localize(`zones.${k}`)}</option>`,
						)}
					</select>
				</div>
				<div style="${rowStyle}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.trigger")}</label
					>
					<input
						type="range"
						min="1"
						max="9"
						style="flex: 1; min-width: 0;"
						.value=${String(trigger)}
						?disabled=${!isCustom}
						@input=${(e: Event) => {
							this.dispatchEvent(
								new CustomEvent("zone-config-change", {
									detail: {
										index,
										updates: {
											trigger: Number((e.target as HTMLInputElement).value),
										},
									},
									bubbles: true,
									composed: true,
								}),
							);
							this.dispatchEvent(
								new CustomEvent("dirty", {
									bubbles: true,
									composed: true,
								}),
							);
						}}
						@click=${(e: Event) => e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${trigger}</span
					>
				</div>
				<div style="${rowStyle}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.renew")}</label
					>
					<input
						type="range"
						min="1"
						max="9"
						style="flex: 1; min-width: 0;"
						.value=${String(renew)}
						?disabled=${!isCustom}
						@input=${(e: Event) => {
							this.dispatchEvent(
								new CustomEvent("zone-config-change", {
									detail: {
										index,
										updates: {
											renew: Number((e.target as HTMLInputElement).value),
										},
									},
									bubbles: true,
									composed: true,
								}),
							);
							this.dispatchEvent(
								new CustomEvent("dirty", {
									bubbles: true,
									composed: true,
								}),
							);
						}}
						@click=${(e: Event) => e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${renew}</span
					>
				</div>
				<div style="${rowStyle}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.presence_timeout")}</label
					>
					<span style="flex: 1;"></span>
					<input
						type="number"
						min="1"
						max="3600"
						style="width: 48px; text-align: right; font: inherit; font-size: 12px; margin-right: 0;"
						.value=${String(timeout)}
						?disabled=${!isCustom}
						@input=${(e: Event) => {
							const v = Number((e.target as HTMLInputElement).value);
							if (v > 0) {
								this.dispatchEvent(
									new CustomEvent("zone-config-change", {
										detail: {
											index,
											updates: { timeout: v },
										},
										bubbles: true,
										composed: true,
									}),
								);
								this.dispatchEvent(
									new CustomEvent("dirty", {
										bubbles: true,
										composed: true,
									}),
								);
							}
						}}
						@click=${(e: Event) => e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
				<div style="${rowStyle}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.handoff_timeout")}</label
					>
					<span style="flex: 1;"></span>
					<input
						type="number"
						min="1"
						max="300"
						style="width: 48px; text-align: right; font: inherit; font-size: 12px; margin-right: 0;"
						.value=${String(handoffTimeout)}
						?disabled=${!isCustom}
						@input=${(e: Event) => {
							const v = Number((e.target as HTMLInputElement).value);
							if (v > 0) {
								this.dispatchEvent(
									new CustomEvent("zone-config-change", {
										detail: {
											index,
											updates: { handoff_timeout: v },
										},
										bubbles: true,
										composed: true,
									}),
								);
								this.dispatchEvent(
									new CustomEvent("dirty", {
										bubbles: true,
										composed: true,
									}),
								);
							}
						}}
						@click=${(e: Event) => e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
			</div>
		`;
	}
}

if (!customElements.get("epp-zone-sidebar")) {
	customElements.define("epp-zone-sidebar", EppZoneSidebar);
}
