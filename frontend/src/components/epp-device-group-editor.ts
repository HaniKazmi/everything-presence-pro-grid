import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { literal, html as staticHtml } from "lit/static-html.js";

import "./epp-zone-merge-list.js";
import { exposedSensorChips } from "../lib/device-groups-labels.js";
import { deriveExposedEntities } from "../lib/device-groups-projection.js";
import type {
	DeviceGroup,
	DeviceGroupSource,
	DeviceGroupZoneGroup,
	DeviceInfo,
} from "../types.js";

interface EditorDraft {
	id: string | null;
	name: string;
	area_id: string | null;
	sourceMacs: string[];
	zone_groups: DeviceGroupZoneGroup[];
}

/**
 * Editor for one device group. Fires `save` (full payload) or `cancel`.
 * Deletion is handled from the list view's per-group kebab, not here.
 */
export class EppDeviceGroupEditor extends LitElement {
	static styles = css`
		:host { display: block; }
		.card-content {
			padding: 16px;
			display: flex;
			flex-direction: column;
			gap: 16px;
		}
		.field { display: block; }
		ha-input,
		ha-textfield,
		ha-area-picker {
			display: block;
			width: 100%;
		}
		.section h3 {
			margin: 0 0 .5rem 0;
			font-size: 15px;
			font-weight: 600;
		}
		.source-box {
			border: 1px solid var(--divider-color, #e0e0e0);
			border-radius: 10px;
			padding: 2px 12px;
		}
		.source-row {
			display: flex;
			align-items: center;
			gap: 12px;
			padding: 6px 0;
			min-height: 36px;
		}
		.source-row + .source-row {
			border-top: 1px solid var(--divider-color, #e0e0e0);
		}
		.source-name {
			flex: 1;
			min-width: 0;
			font-size: 14px;
			color: var(--primary-text-color, #212121);
		}
		.chips { display: flex; flex-wrap: wrap; gap: .4rem; }
		.chip {
			padding: .2rem .6rem;
			border-radius: 999px;
			background: var(--primary-color);
			color: var(--text-primary-color);
			font-size: .85rem;
		}
		.chip.zone {
			background: var(--secondary-background-color);
			color: var(--primary-text-color);
			border: 1px solid var(--divider-color);
		}
		.actions {
			display: flex;
			gap: .5rem;
			justify-content: flex-end;
			align-items: center;
			margin-top: 4px;
		}
	`;

	@property({ attribute: false }) hass!: { [key: string]: unknown };
	@property({ attribute: false }) availableDevices: DeviceInfo[] = [];
	@property({ attribute: false }) existingGroup: DeviceGroup | null = null;
	// Map of every known source by MAC, used to render the zone merge UI for
	// any selected source. Populated by the parent view from the candidate
	// sources (every managed device) so a device's zones show as soon as it is
	// toggled — not only after the group is saved.
	@property({ attribute: false }) sourcesByMac: Record<
		string,
		DeviceGroupSource
	> = {};

	@state() private _draft: EditorDraft = {
		id: null,
		name: "",
		area_id: null,
		sourceMacs: [],
		zone_groups: [],
	};

	willUpdate(changed: Map<string, unknown>) {
		if (changed.has("existingGroup") && this.existingGroup) {
			this._draft = {
				id: this.existingGroup.id,
				name: this.existingGroup.name,
				area_id: this.existingGroup.area_id,
				sourceMacs: this.existingGroup.sources.map((s) => s.mac),
				zone_groups: this.existingGroup.zone_groups,
			};
		}
	}

	render() {
		return html`
			<ha-card>
				<div class="card-content">
					<div class="field">${this._renderNameField()}</div>
					<div class="field">
						<ha-area-picker
							.hass=${this.hass}
							.value=${this._draft.area_id ?? ""}
							@value-changed=${(e: CustomEvent) => {
								e.stopPropagation();
								this._update({ area_id: (e.detail.value as string) || null });
							}}
						></ha-area-picker>
					</div>

					<div class="section">
						<h3>Source devices</h3>
						<div class="source-box">
							${this.availableDevices.map((d) => this._renderSourceRow(d))}
						</div>
					</div>

					<div class="section">
						<epp-zone-merge-list
							.sources=${this._draftSources()}
							.zoneGroups=${this._draft.zone_groups}
							@zone-groups-changed=${(e: CustomEvent) => {
								e.stopPropagation();
								this._update({ zone_groups: e.detail.zone_groups });
							}}
						></epp-zone-merge-list>
					</div>

					${this._renderSensorsPreview()}

					<div class="actions">
						<ha-button @click=${this._cancel}>Cancel</ha-button>
						<ha-button
							appearance="accent"
							.disabled=${!this._canSave()}
							@click=${this._save}
							>Save</ha-button
						>
					</div>
				</div>
			</ha-card>
		`;
	}

	// Live preview of the entities this group will create — presence sensors
	// (the union of enabled slots across sources) plus zone entities — computed
	// with the same projection the backend uses.
	private _renderSensorsPreview() {
		const exposed = deriveExposedEntities(
			this._draftSources(),
			this._draft.zone_groups,
		);
		if (exposed.presence.length === 0 && exposed.zones.length === 0) {
			return nothing;
		}
		return html`
			<div class="section">
				<h3>Sensors that will be created</h3>
				<div class="chips" data-testid="sensors-preview">
					${exposedSensorChips(exposed).map(
						(s) =>
							html`<span
								class="chip ${s.kind === "zone" ? "zone" : ""}"
								data-testid="sensor-chip"
								>${s.name}</span
							>`,
					)}
				</div>
			</div>
		`;
	}

	// HA-native text field. ha-input shipped in 2026.4 (replaces ha-textfield,
	// removed in 2026.5); fall back to ha-textfield on older HA.
	private _renderNameField() {
		const tag = customElements.get("ha-input")
			? literal`ha-input`
			: literal`ha-textfield`;
		return staticHtml`
			<${tag}
				data-testid="name-field"
				.label=${"Device name"}
				.value=${this._draft.name}
				@input=${(e: Event) =>
					this._update({ name: (e.target as HTMLInputElement).value })}
			></${tag}>
		`;
	}

	// One row per device: name on the left, an HA toggle on the right. Falls
	// back to a plain checkbox where ha-switch isn't registered.
	private _renderSourceRow(d: DeviceInfo) {
		const checked = this._draft.sourceMacs.includes(d.mac);
		const onChange = (e: Event) =>
			this._toggleSource(d.mac, (e.target as HTMLInputElement).checked);
		const control = customElements.get("ha-switch")
			? html`<ha-switch
					data-testid="device-toggle"
					data-mac=${d.mac}
					.checked=${checked}
					@change=${onChange}
				></ha-switch>`
			: html`<input
					type="checkbox"
					data-testid="device-toggle"
					data-mac=${d.mac}
					.checked=${checked}
					@change=${onChange}
				/>`;
		const label = d.area ? `${d.name} (${d.area})` : d.name;
		return html`<div class="source-row">
			<span class="source-name">${label}</span>
			${control}
		</div>`;
	}

	private _draftSources(): DeviceGroupSource[] {
		// Resolve currently-selected MACs against known sources (every managed
		// device is present in sourcesByMac), so toggling a device immediately
		// surfaces its zones in the merge UI.
		return this._draft.sourceMacs
			.map((mac) => this.sourcesByMac[mac])
			.filter((s): s is DeviceGroupSource => Boolean(s));
	}

	private _canSave(): boolean {
		return this._draft.name.trim() !== "" && this._draft.sourceMacs.length >= 1;
	}

	private _update(patch: Partial<EditorDraft>) {
		this._draft = { ...this._draft, ...patch };
	}

	private _toggleSource(mac: string, on: boolean) {
		const next = on
			? [...this._draft.sourceMacs, mac]
			: this._draft.sourceMacs.filter((m) => m !== mac);
		this._update({ sourceMacs: next });
	}

	private _save() {
		this.dispatchEvent(
			new CustomEvent("save", {
				detail: {
					id: this._draft.id,
					name: this._draft.name.trim(),
					sources: this._draft.sourceMacs,
					area_id: this._draft.area_id,
					zone_groups: this._draft.zone_groups,
				},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _cancel() {
		this.dispatchEvent(
			new CustomEvent("cancel", { bubbles: true, composed: true }),
		);
	}
}

customElements.define("epp-device-group-editor", EppDeviceGroupEditor);

declare global {
	interface HTMLElementTagNameMap {
		"epp-device-group-editor": EppDeviceGroupEditor;
	}
}
