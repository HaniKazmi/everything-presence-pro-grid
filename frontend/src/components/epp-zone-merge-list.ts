import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";

import "../ui/epp-button.js";
import "../ui/epp-field.js";
import "./epp-kebab-menu.js";
import { EDIT_DELETE_KEBAB_ITEMS } from "../lib/device-groups-labels.js";
import type {
	DeviceGroupSource,
	DeviceGroupZoneGroup,
	DeviceGroupZoneMember,
} from "../types.js";

/** One enabled zone, with its device and zone names resolved for display. */
interface ZoneEntry {
	mac: string;
	deviceName: string;
	index: number;
	zoneName: string;
}

/** A device row in a device → zones grid. */
interface DeviceZones {
	mac: string;
	name: string;
	zones: ZoneEntry[];
}

interface MergeDraft {
	/** Group being edited, or null when creating a new merged zone. */
	editingId: string | null;
	name: string;
	/** Selected zone keys (`${mac}|${index}`). */
	checked: Set<string>;
}

function zoneKey(mac: string, index: number): string {
	return `${mac}|${index}`;
}

function parseKey(key: string): DeviceGroupZoneMember {
	const i = key.lastIndexOf("|");
	return { mac: key.slice(0, i), zone_index: Number(key.slice(i + 1)) };
}

/**
 * Zone merge editor. Available zones render as a device → zones grid in a
 * single box. "Create merged zone" turns each zone into a checkbox (on the
 * right) and reveals a name field; merging emits a zone group. Merged zones
 * list in their own boxes, each showing its members as the same grid, with a
 * kebab (Edit/Delete).
 *
 * Emits "zone-groups-changed" CustomEvent<{zone_groups: DeviceGroupZoneGroup[]}>.
 */
export class EppZoneMergeList extends LitElement {
	static styles = css`
		:host { display: block; }
		h4 {
			margin: 0 0 var(--epp-space-2, 8px) 0;
			font-size: var(--epp-font-md, 15px);
			font-weight: var(--epp-weight-semibold, 600);
		}
		/* Kept as an in-place tokenised container rather than <epp-card>: it's a
		   tight inset grid of zone rows (4px 12px padding, 10px radius), not a
		   card-padded surface — epp-card bakes in 16px padding + 16px radius on
		   its shadow .card with no external override, which would loosen the dense
		   row grid and change its look (same judgment as the editor's .source-box). */
		.zone-box {
			border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
			border-radius: var(--epp-radius-md, 10px);
			padding: var(--epp-space-1, 4px) var(--epp-space-3, 12px);
		}
		.zone-grid {
			display: grid;
			grid-template-columns: max-content 1fr;
			gap: 0 var(--epp-space-4, 16px);
			align-items: start;
		}
		.zt-device {
			display: flex;
			align-items: center;
			min-height: 36px;
			font-size: var(--epp-font-base, 14px);
			font-weight: var(--epp-weight-medium, 500);
			color: var(--epp-text, var(--primary-text-color, #212121));
		}
		.zt-device::after { content: ":"; }
		.zt-zones { display: flex; flex-direction: column; }
		.zt-zone {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--epp-space-2, 8px);
			/* Reserve the checkbox's height up front so rows don't jump when
			   "Create merged zone" reveals the checkboxes. */
			min-height: 36px;
			font-size: var(--epp-font-base, 14px);
			color: var(--epp-text, var(--primary-text-color, #212121));
		}
		label.zt-zone { cursor: pointer; }
		.zt-zone-name { min-width: 0; }
		.zt-zone ha-checkbox,
		.zt-zone input { flex-shrink: 0; margin: 0; }
		.empty { color: var(--epp-text-muted, var(--secondary-text-color, #757575)); }
		.merge-name { display: block; width: 100%; margin-top: var(--epp-space-3, 12px); }
		.actions {
			display: flex;
			justify-content: flex-end;
			gap: var(--epp-space-2, 8px);
			margin-top: var(--epp-space-3, 12px);
		}
		.merged-section { margin-top: var(--epp-space-5, 24px); }
		/* Also a tight inset list (head row + dense member grid, 6px/8px/12px
		   padding, 10px radius), not a card surface — kept as a tokenised <div>
		   for the same reason as .zone-box. */
		.merged-zone {
			margin-bottom: var(--epp-space-2, 8px);
			padding: 6px 6px 8px var(--epp-space-3, 12px);
			background: var(--epp-surface, var(--card-background-color, #fff));
			border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
			border-radius: var(--epp-radius-md, 10px);
		}
		.mz-head {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--epp-space-2, 8px);
		}
		.group-name { font-weight: var(--epp-weight-semibold, 600); }
		.mz-head epp-kebab-menu { margin: -6px 0; }
		.member-grid .zt-device,
		.member-grid .zt-zone {
			min-height: 28px;
			font-weight: 400;
			color: var(--epp-text-muted, var(--secondary-text-color, #757575));
		}
	`;

	@property({ attribute: false }) sources: DeviceGroupSource[] = [];
	@property({ attribute: false }) zoneGroups: DeviceGroupZoneGroup[] = [];

	@state() private _merge: MergeDraft | null = null;

	render() {
		const merging = this._merge !== null;
		const devices = this._tableDevices(
			merging ? this._checkableZones() : this._ungroupedZones(),
		);
		return html`
			<h4>Available zones</h4>
			${this._renderAvailable(devices, merging)}
			${
				merging
					? this._renderMergeControls()
					: html`<div class="actions">
							<epp-button
								variant="primary"
								data-testid="create-merge"
								@click=${this._startCreate}
								>Add a merged zone</epp-button
							>
						</div>`
			}
			${
				this.zoneGroups.length
					? html`<div class="merged-section">
							<h4>Merged zones</h4>
							${this.zoneGroups.map((g) => this._renderMergedGroup(g))}
						</div>`
					: nothing
			}
		`;
	}

	private _renderAvailable(devices: DeviceZones[], merging: boolean) {
		if (!devices.length) {
			return html`<p class="empty">No available zones.</p>`;
		}
		return html`<div class="zone-box">
			<div class="zone-grid">
				${devices.map(
					(dev) => html`
						<div class="zt-device" data-testid="zone-table-device">
							${dev.name}
						</div>
						<div class="zt-zones">
							${dev.zones.map((z) => this._renderZoneCell(z, merging))}
						</div>
					`,
				)}
			</div>
		</div>`;
	}

	private _renderZoneCell(z: ZoneEntry, merging: boolean) {
		if (!merging) {
			return html`<div class="zt-zone" data-testid="available-zone">
				<span class="zt-zone-name">${z.zoneName}</span>
			</div>`;
		}
		const k = zoneKey(z.mac, z.index);
		const checked = this._merge?.checked.has(k) ?? false;
		const onChange = (e: Event) =>
			this._toggleCheck(k, (e.target as HTMLInputElement).checked);
		const box = customElements.get("ha-checkbox")
			? html`<ha-checkbox
					data-testid="merge-checkbox"
					data-key=${k}
					.checked=${checked}
					@change=${onChange}
				></ha-checkbox>`
			: html`<input
					type="checkbox"
					data-testid="merge-checkbox"
					data-key=${k}
					.checked=${checked}
					@change=${onChange}
				/>`;
		return html`<label class="zt-zone" data-testid="available-zone">
			<span class="zt-zone-name">${z.zoneName}</span>${box}
		</label>`;
	}

	private _renderMergeControls() {
		const m = this._merge as MergeDraft;
		return html`
			${this._renderNameField(m.name)}
			<div class="actions">
				<epp-button
					variant="text"
					data-testid="merge-cancel"
					@click=${this._cancelMerge}
					>Cancel</epp-button
				>
				<epp-button
					variant="primary"
					data-testid="merge-confirm"
					.disabled=${!this._canMerge()}
					@click=${this._confirmMerge}
					>${m.editingId ? "Save" : "Merge"}</epp-button
				>
			</div>
		`;
	}

	// Merged-zone name. epp-field picks ha-input / ha-textfield / native input
	// internally and emits one normalized `value-changed`.
	private _renderNameField(value: string) {
		return html`
			<epp-field
				class="merge-name"
				data-testid="merge-name"
				type="text"
				.label=${"Merged zone name"}
				.value=${value}
				@value-changed=${(e: CustomEvent) => {
					e.stopPropagation();
					this._merge = {
						...(this._merge as MergeDraft),
						name: e.detail.value as string,
					};
				}}
			></epp-field>
		`;
	}

	private _renderMergedGroup(g: DeviceGroupZoneGroup) {
		const devices = this._tableDevices(
			g.members.map((m) => this._resolveMember(m)),
		);
		return html`<div class="merged-zone" data-testid="merged-zone">
			<div class="mz-head">
				<span class="group-name">Zone ${g.name}</span>
				<epp-kebab-menu
					.items=${EDIT_DELETE_KEBAB_ITEMS}
					@item-select=${(e: CustomEvent<{ id: string }>) =>
						this._onKebab(g, e.detail.id)}
				></epp-kebab-menu>
			</div>
			<div class="zone-grid member-grid">
				${devices.map(
					(dev) => html`
						<div class="zt-device" data-testid="merged-member-device">
							${dev.name}
						</div>
						<div class="zt-zones">
							${dev.zones.map(
								(z) => html`<div
									class="zt-zone"
									data-testid="merged-member-zone"
								>
									<span class="zt-zone-name">${z.zoneName}</span>
								</div>`,
							)}
						</div>
					`,
				)}
			</div>
		</div>`;
	}

	private _onKebab(g: DeviceGroupZoneGroup, id: string) {
		if (id === "edit") this._startEdit(g);
		else if (id === "delete") this._deleteGroup(g.id);
	}

	// Resolve a zone member's device + zone names (graceful when unknown).
	private _resolveMember(m: DeviceGroupZoneMember): ZoneEntry {
		const src = this.sources.find((s) => s.mac === m.mac);
		const zone = src?.zones.find((z) => z.index === m.zone_index);
		return {
			mac: m.mac,
			deviceName: src?.name ?? "Unknown device",
			index: m.zone_index,
			zoneName: zone?.name ?? `Zone ${m.zone_index}`,
		};
	}

	// Enabled zones not currently in any merged group.
	private _ungroupedZones(): ZoneEntry[] {
		const grouped = new Set(
			this.zoneGroups.flatMap((g) =>
				g.members.map((m) => zoneKey(m.mac, m.zone_index)),
			),
		);
		const out: ZoneEntry[] = [];
		for (const src of this.sources) {
			for (const z of src.zones) {
				if (!z.enabled) continue;
				if (grouped.has(zoneKey(src.mac, z.index))) continue;
				out.push({
					mac: src.mac,
					deviceName: src.name,
					index: z.index,
					zoneName: z.name,
				});
			}
		}
		return out;
	}

	// Zones offered with checkboxes while merging: the ungrouped zones, plus —
	// when editing — the group's own current members.
	private _checkableZones(): ZoneEntry[] {
		const zones = this._ungroupedZones();
		const g =
			this._merge?.editingId != null
				? this.zoneGroups.find((x) => x.id === this._merge?.editingId)
				: undefined;
		if (g) {
			for (const m of g.members) zones.push(this._resolveMember(m));
		}
		return zones;
	}

	// Group zone entries by device, preserving first-seen order, so each device
	// appears once with all of its zones beside it.
	private _tableDevices(entries: ZoneEntry[]): DeviceZones[] {
		const byMac = new Map<string, DeviceZones>();
		for (const e of entries) {
			let dev = byMac.get(e.mac);
			if (!dev) {
				dev = { mac: e.mac, name: e.deviceName, zones: [] };
				byMac.set(e.mac, dev);
			}
			dev.zones.push(e);
		}
		return [...byMac.values()];
	}

	private _startCreate() {
		this._merge = { editingId: null, name: "", checked: new Set() };
	}

	private _startEdit(g: DeviceGroupZoneGroup) {
		this._merge = {
			editingId: g.id,
			name: g.name,
			checked: new Set(g.members.map((m) => zoneKey(m.mac, m.zone_index))),
		};
	}

	private _toggleCheck(key: string, on: boolean) {
		if (!this._merge) return;
		const checked = new Set(this._merge.checked);
		if (on) checked.add(key);
		else checked.delete(key);
		this._merge = { ...this._merge, checked };
	}

	private _canMerge(): boolean {
		return (
			!!this._merge &&
			this._merge.name.trim() !== "" &&
			this._merge.checked.size >= 2
		);
	}

	private _cancelMerge() {
		this._merge = null;
	}

	private _confirmMerge() {
		const m = this._merge;
		if (!m) return;
		const members = [...m.checked].map(parseKey);
		const name = m.name.trim();
		let next: DeviceGroupZoneGroup[];
		if (m.editingId) {
			next = this.zoneGroups.map((g) =>
				g.id === m.editingId ? { ...g, name, members } : g,
			);
		} else {
			const id = `zg_${crypto.randomUUID().slice(0, 8)}`;
			next = [...this.zoneGroups, { id, name, members }];
		}
		this._merge = null;
		this._emit(next);
	}

	private _deleteGroup(id: string) {
		this._emit(this.zoneGroups.filter((g) => g.id !== id));
	}

	private _emit(zoneGroups: DeviceGroupZoneGroup[]) {
		this.dispatchEvent(
			new CustomEvent("zone-groups-changed", {
				detail: { zone_groups: zoneGroups },
				bubbles: true,
				composed: true,
			}),
		);
	}
}

customElements.define("epp-zone-merge-list", EppZoneMergeList);

declare global {
	interface HTMLElementTagNameMap {
		"epp-zone-merge-list": EppZoneMergeList;
	}
}
