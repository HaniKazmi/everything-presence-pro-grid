import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { literal, html as staticHtml } from "lit/static-html.js";

import "./epp-zone-merge-list.js";
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
 * Editor for one device group. Fires `save` (full payload), `cancel`, or `delete`.
 */
export class EppDeviceGroupEditor extends LitElement {
	static styles = css`
		:host {
			display: block;
			max-width: 600px;
			padding: 1rem;
		}
		.section { margin-bottom: 1.5rem; }
		.section h3 { margin: 0 0 .5rem 0; }
		.field { margin-bottom: 1rem; }
		ha-input,
		ha-textfield,
		ha-area-picker {
			display: block;
			width: 100%;
		}
		.device-row { display: block; padding: .15rem 0; }
		.actions {
			display: flex;
			gap: .5rem;
			justify-content: flex-end;
			margin-top: 1rem;
		}
		button {
			padding: .5rem 1rem;
			cursor: pointer;
			background: var(--primary-color);
			color: var(--text-primary-color);
			border: none;
			border-radius: 4px;
		}
		button:disabled {
			opacity: .5;
			cursor: not-allowed;
		}
		button.secondary {
			background: none;
			color: var(--primary-text-color);
			border: 1px solid var(--divider-color);
		}
		button.danger {
			background: var(--error-color);
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
				${this.availableDevices.map(
					(d) =>
						html`<div class="device-row">${this._renderDeviceToggle(d)}</div>`,
				)}
			</div>

			<div class="section">
				<h3>Zones</h3>
				<epp-zone-merge-list
					.sources=${this._draftSources()}
					.zoneGroups=${this._draft.zone_groups}
					@zone-groups-changed=${(e: CustomEvent) => {
						e.stopPropagation();
						this._update({ zone_groups: e.detail.zone_groups });
					}}
				></epp-zone-merge-list>
			</div>

			<div class="actions">
				${
					this._draft.id !== null
						? html`<button class="danger" @click=${this._delete}>Delete</button>`
						: nothing
				}
				<button class="secondary" @click=${this._cancel}>Cancel</button>
				<button @click=${this._save} ?disabled=${!this._canSave()}>Save</button>
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

	// HA-native toggle per device, labelled with the device name. Falls back to
	// a plain checkbox where ha-switch isn't registered in this HA version.
	private _renderDeviceToggle(d: DeviceInfo) {
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
		return html`<ha-formfield .label=${`${d.name} (${d.mac})`}
			>${control}</ha-formfield
		>`;
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

	private _delete() {
		if (!this._draft.id) return;
		this.dispatchEvent(
			new CustomEvent("delete", {
				detail: { id: this._draft.id },
				bubbles: true,
				composed: true,
			}),
		);
	}
}

customElements.define("epp-device-group-editor", EppDeviceGroupEditor);

declare global {
	interface HTMLElementTagNameMap {
		"epp-device-group-editor": EppDeviceGroupEditor;
	}
}
