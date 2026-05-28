import { css, html, LitElement } from "lit";
import { property, state } from "lit/decorators.js";

import "../components/epp-device-group-editor.js";
import type { DeviceGroupsController } from "../controllers/device-groups-controller.js";
import type { DeviceGroup, DeviceInfo } from "../types.js";

export class EppDeviceGroupsView extends LitElement {
	static styles = css`
		:host { display: block; padding: 1rem; }
		.group-row {
			display: flex;
			align-items: center;
			padding: .75rem;
			border-bottom: 1px solid var(--divider-color);
			cursor: pointer;
		}
		.group-row:hover { background: var(--secondary-background-color); }
		.group-name { font-weight: 600; }
		.meta { color: var(--secondary-text-color); font-size: .85rem; }
		.add-btn {
			margin-bottom: 1rem;
			padding: .5rem 1rem;
			cursor: pointer;
			background: var(--primary-color);
			color: var(--text-primary-color);
			border: none;
			border-radius: 4px;
		}
	`;

	@property({ attribute: false }) hass!: { [key: string]: unknown };
	@property({ attribute: false }) controller!: DeviceGroupsController;
	@property({ attribute: false }) availableDevices: DeviceInfo[] = [];

	@state() private _groups: DeviceGroup[] = [];
	@state() private _editingGroup: DeviceGroup | null = null;
	@state() private _creatingNew = false;

	private _unsub: (() => void) | null = null;

	connectedCallback() {
		super.connectedCallback();
		this._unsub = this.controller.onChange((groups) => {
			this._groups = groups;
		});
		this.controller.subscribe();
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		this._unsub?.();
	}

	render() {
		if (this._editingGroup || this._creatingNew) {
			return html`
				<epp-device-group-editor
					.hass=${this.hass}
					.availableDevices=${this.availableDevices}
					.existingGroup=${this._editingGroup}
					.liveSources=${this._editingGroup?.sources ?? []}
					@save=${this._handleSave}
					@cancel=${this._handleCancel}
					@delete=${this._handleDelete}
				></epp-device-group-editor>
			`;
		}
		return html`
			<button class="add-btn" @click=${() => (this._creatingNew = true)}>
				+ Add device group
			</button>
			${
				this._groups.length === 0
					? html`<p>No device groups yet.</p>`
					: this._groups.map(
							(g) => html`
					<div class="group-row" @click=${() => (this._editingGroup = g)}>
						<div>
							<div class="group-name">${g.name}</div>
							<div class="meta">
								${g.sources.length} source${g.sources.length === 1 ? "" : "s"} ·
								${
									g.exposed_entities.presence.length +
									g.exposed_entities.zones.length
								}
								entities
							</div>
						</div>
					</div>
				`,
						)
			}
		`;
	}

	private async _handleSave(e: CustomEvent) {
		e.stopPropagation();
		const d = e.detail;
		try {
			if (d.id) {
				await this.controller.update(d);
			} else {
				await this.controller.create(d.name, d.sources, d.area_id);
			}
			this._editingGroup = null;
			this._creatingNew = false;
		} catch (err) {
			console.error("Failed to save device group", err);
			alert(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	private _handleCancel(e: CustomEvent) {
		e.stopPropagation();
		this._editingGroup = null;
		this._creatingNew = false;
	}

	private async _handleDelete(e: CustomEvent) {
		e.stopPropagation();
		if (!confirm("Delete this device group?")) return;
		try {
			await this.controller.delete(e.detail.id);
			this._editingGroup = null;
		} catch (err) {
			console.error("Failed to delete device group", err);
		}
	}
}

customElements.define("epp-device-groups-view", EppDeviceGroupsView);

declare global {
	interface HTMLElementTagNameMap {
		"epp-device-groups-view": EppDeviceGroupsView;
	}
}
