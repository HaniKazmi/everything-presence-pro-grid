import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";

import "../components/epp-device-group-editor.js";
import "../components/epp-kebab-menu.js";
import type { DeviceGroupsController } from "../controllers/device-groups-controller.js";
import {
	EDIT_DELETE_KEBAB_ITEMS,
	exposedSensorChips,
} from "../lib/device-groups-labels.js";
import type { DeviceGroup, DeviceGroupSource, DeviceInfo } from "../types.js";

export class EppDeviceGroupsView extends LitElement {
	static styles = css`
		:host { display: block; padding: 16px; }
		.content {
			max-width: 600px;
			margin: 0 auto;
		}
		.card-header {
			font-size: 18px;
			font-weight: 400;
			line-height: 48px;
			padding: 8px 16px 0;
			color: var(--ha-card-header-color, var(--primary-text-color, #212121));
		}
		.card-content {
			padding: 16px;
			display: flex;
			flex-direction: column;
			gap: 12px;
		}
		.group-card {
			display: flex;
			align-items: flex-start;
			gap: 12px;
			padding: 12px 16px;
			background: var(--card-background-color, #fff);
			border: 1px solid var(--divider-color, #e0e0e0);
			border-radius: 10px;
		}
		.group-info { flex: 1; min-width: 0; }
		.group-name {
			font-size: 14px;
			font-weight: 600;
			color: var(--primary-text-color, #212121);
		}
		.group-devices {
			font-size: 13px;
			color: var(--secondary-text-color, #757575);
			margin-top: 4px;
		}
		.group-sensors {
			display: flex;
			align-items: baseline;
			flex-wrap: wrap;
			gap: 6px;
			font-size: 13px;
			color: var(--secondary-text-color, #757575);
			margin-top: 6px;
		}
		.chip {
			padding: 2px 10px;
			border-radius: 999px;
			background: var(--primary-color);
			color: var(--text-primary-color);
			font-size: 12px;
		}
		.chip.zone {
			background: var(--secondary-background-color);
			color: var(--primary-text-color);
			border: 1px solid var(--divider-color);
		}
		.empty {
			color: var(--secondary-text-color, #757575);
			text-align: center;
			padding: 8px 0;
		}
		.footer {
			display: flex;
			justify-content: flex-end;
			margin-top: 4px;
		}
		epp-kebab-menu { flex-shrink: 0; margin: -6px -8px -6px 0; }
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
		// Seed from the controller's cache. The controller is panel-owned and
		// subscribe() is idempotent — after switching tabs and back, the
		// remounted view re-subscribes but no fresh event fires, so without this
		// the list would render empty until the next change.
		this._groups = this.controller.groups;
		this.controller.subscribe();
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		this._unsub?.();
	}

	render() {
		if (this._editingGroup || this._creatingNew) {
			return html`
				<div class="content">
					<epp-device-group-editor
						.hass=${this.hass}
						.availableDevices=${this.availableDevices}
						.existingGroup=${this._editingGroup}
						.sourcesByMac=${this._sourcesByMac()}
						@save=${this._handleSave}
						@cancel=${this._handleCancel}
					></epp-device-group-editor>
				</div>
			`;
		}
		return html`
			<div class="content">
				<ha-card>
					<div class="card-header">Device Groups</div>
					<div class="card-content">
						${
							this._groups.length === 0
								? html`<p class="empty">No device groups yet.</p>`
								: this._groups.map((g) => this._renderGroupCard(g))
						}
						<div class="footer">
							<ha-button
								appearance="accent"
								data-testid="create-group"
								@click=${() => {
									this._creatingNew = true;
								}}
							>
								Add a device group
							</ha-button>
						</div>
					</div>
				</ha-card>
			</div>
		`;
	}

	private _renderGroupCard(g: DeviceGroup) {
		const devices = g.sources
			.map((s) => s.name)
			.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
			.join(", ");
		const sensors = exposedSensorChips(g.exposed_entities);
		return html`
			<div class="group-card">
				<div class="group-info">
					<div class="group-name">${g.name}</div>
					${
						devices
							? html`<div class="group-devices">${devices}</div>`
							: nothing
					}
					${
						sensors.length
							? html`<div class="group-sensors">
									${sensors.map(
										(s) =>
											html`<span
												class="chip ${s.kind === "zone" ? "zone" : ""}"
												data-testid="sensor-chip"
												>${s.name}</span
											>`,
									)}
								</div>`
							: nothing
					}
				</div>
				<epp-kebab-menu
					.items=${EDIT_DELETE_KEBAB_ITEMS}
					@item-select=${(e: CustomEvent<{ id: string }>) =>
						this._onKebab(g, e.detail.id)}
				></epp-kebab-menu>
			</div>
		`;
	}

	private _onKebab(g: DeviceGroup, id: string) {
		if (id === "edit") this._editingGroup = g;
		else if (id === "delete") this._deleteById(g.id);
	}

	private _sourcesByMac(): Record<string, DeviceGroupSource> {
		const map: Record<string, DeviceGroupSource> = {};
		// Saved-group sources first (cover a device no longer reported by the
		// manager), then every managed device's current source state so the
		// editor has zones for any device the moment it is toggled.
		for (const g of this._groups) {
			for (const s of g.sources) map[s.mac] = s;
		}
		for (const s of this.controller.candidateSources) map[s.mac] = s;
		return map;
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

	private async _deleteById(id: string) {
		if (!confirm("Delete this device group?")) return;
		try {
			await this.controller.delete(id);
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
