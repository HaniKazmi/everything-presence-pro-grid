import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";

import type {
	DeviceGroup,
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
		:host { display: block; padding: 1rem; }
		.section { margin-bottom: 1.5rem; }
		.section h3 { margin: 0 0 .5rem 0; }
		.row { display: flex; gap: .5rem; margin-bottom: .25rem; }
		.actions {
			display: flex;
			gap: .5rem;
			justify-content: flex-end;
			margin-top: 1rem;
		}
		input[type="text"] {
			width: 100%;
			padding: .5rem;
			border: 1px solid var(--divider-color);
			background: var(--card-background-color);
			color: var(--primary-text-color);
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
			<div class="section">
				<h3>Basics</h3>
				<input
					type="text"
					.value=${this._draft.name}
					placeholder="Master Bedroom Presence"
					@input=${(e: Event) =>
						this._update({ name: (e.target as HTMLInputElement).value })}
				/>
			</div>

			<div class="section">
				<h3>Source devices</h3>
				${this.availableDevices.map(
					(d) => html`
					<div class="row">
						<label>
							<input
								type="checkbox"
								.checked=${this._draft.sourceMacs.includes(d.mac)}
								@change=${(e: Event) =>
									this._toggleSource(
										d.mac,
										(e.target as HTMLInputElement).checked,
									)}
							/>
							${d.name} (${d.mac})
						</label>
					</div>
				`,
				)}
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
