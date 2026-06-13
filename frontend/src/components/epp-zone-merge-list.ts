import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";

import type {
	DeviceGroupSource,
	DeviceGroupZoneGroup,
	DeviceGroupZoneMember,
} from "../types.js";

interface CheckableZone {
	mac: string;
	index: number;
	label: string;
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
 * Zone merge editor. Lists each selected device's zones; "Create merged zone"
 * reveals checkboxes + a name field, and merged zones appear under their own
 * section with edit/delete.
 *
 * Emits "zone-groups-changed" CustomEvent<{zone_groups: DeviceGroupZoneGroup[]}>.
 */
export class EppZoneMergeList extends LitElement {
	static styles = css`
		:host { display: block; }
		.head {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: .5rem;
		}
		h4 { margin: 0 0 .25rem 0; }
		.merged-section { margin-top: 1rem; }
		button {
			background: none;
			border: 1px solid var(--divider-color);
			border-radius: 4px;
			padding: .25rem .6rem;
			cursor: pointer;
			color: var(--primary-text-color);
		}
		button:disabled { opacity: .5; cursor: not-allowed; }
		.zone-item { display: block; padding: .2rem 0; }
		label.zone-item { cursor: pointer; }
		.name {
			width: 100%;
			padding: .4rem;
			margin-bottom: .5rem;
			border: 1px solid var(--divider-color);
			border-radius: 4px;
			background: var(--card-background-color);
			color: var(--primary-text-color);
		}
		.merge-actions { display: flex; gap: .5rem; margin-top: .5rem; }
		.empty { color: var(--secondary-text-color); }
		.group {
			margin-bottom: .5rem;
			padding: .5rem;
			background: var(--secondary-background-color);
			border-radius: 4px;
		}
		.group-head {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: .5rem;
		}
		.group-name { font-weight: 600; }
		.group-actions { display: flex; gap: .25rem; }
		.member { padding: .15rem 0; color: var(--secondary-text-color); }
		.x { color: var(--error-color); border-color: var(--error-color); }
	`;

	@property({ attribute: false }) sources: DeviceGroupSource[] = [];
	@property({ attribute: false }) zoneGroups: DeviceGroupZoneGroup[] = [];

	@state() private _merge: MergeDraft | null = null;

	render() {
		return html`
			<div class="head">
				<h4>Available zones</h4>
				${
					this._merge
						? nothing
						: html`<button data-testid="create-merge" @click=${this._startCreate}>
								Create merged zone
							</button>`
				}
			</div>
			${this._merge ? this._renderMergeForm() : this._renderAvailable()}
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

	// Enabled zones not currently in any merged group.
	private _ungroupedZones(): CheckableZone[] {
		const grouped = new Set(
			this.zoneGroups.flatMap((g) =>
				g.members.map((m) => zoneKey(m.mac, m.zone_index)),
			),
		);
		const out: CheckableZone[] = [];
		for (const src of this.sources) {
			for (const z of src.zones) {
				if (!z.enabled) continue;
				if (grouped.has(zoneKey(src.mac, z.index))) continue;
				out.push({
					mac: src.mac,
					index: z.index,
					label: `${src.name} → ${z.name}`,
				});
			}
		}
		return out;
	}

	private _renderAvailable() {
		const zones = this._ungroupedZones();
		if (!zones.length) {
			return html`<p class="empty">No available zones.</p>`;
		}
		return html`${zones.map(
			(z) =>
				html`<div class="zone-item" data-testid="available-zone">${z.label}</div>`,
		)}`;
	}

	// Zones offered with checkboxes while merging: the ungrouped zones, plus —
	// when editing — the group's own current members.
	private _checkableZones(): CheckableZone[] {
		const zones = this._ungroupedZones();
		const g =
			this._merge?.editingId != null
				? this.zoneGroups.find((x) => x.id === this._merge?.editingId)
				: undefined;
		if (g) {
			for (const m of g.members) {
				zones.push({
					mac: m.mac,
					index: m.zone_index,
					label: this._memberLabel(m),
				});
			}
		}
		return zones;
	}

	private _renderMergeForm() {
		const m = this._merge as MergeDraft;
		return html`
			<input
				class="name"
				data-testid="merge-name"
				.value=${m.name}
				placeholder="Merged zone name"
				@input=${(e: Event) => {
					this._merge = { ...m, name: (e.target as HTMLInputElement).value };
				}}
			/>
			${this._checkableZones().map((z) => {
				const k = zoneKey(z.mac, z.index);
				return html`<label class="zone-item">
					<input
						type="checkbox"
						data-testid="merge-checkbox"
						data-key=${k}
						.checked=${m.checked.has(k)}
						@change=${(e: Event) =>
							this._toggleCheck(k, (e.target as HTMLInputElement).checked)}
					/>
					${z.label}
				</label>`;
			})}
			<div class="merge-actions">
				<button
					data-testid="merge-confirm"
					?disabled=${!this._canMerge()}
					@click=${this._confirmMerge}
				>
					${m.editingId ? "Save" : "Merge"}
				</button>
				<button data-testid="merge-cancel" @click=${this._cancelMerge}>
					Cancel
				</button>
			</div>
		`;
	}

	private _renderMergedGroup(g: DeviceGroupZoneGroup) {
		return html`<div class="group" data-testid="merged-zone">
			<div class="group-head">
				<span class="group-name">${g.name}</span>
				<span class="group-actions">
					<button data-testid="edit-merge" @click=${() => this._startEdit(g)}>
						Edit
					</button>
					<button
						class="x"
						data-testid="delete-merge"
						@click=${() => this._deleteGroup(g.id)}
					>
						Delete
					</button>
				</span>
			</div>
			${g.members.map(
				(mem) => html`<div class="member">${this._memberLabel(mem)}</div>`,
			)}
		</div>`;
	}

	private _memberLabel(m: DeviceGroupZoneMember): string {
		const src = this.sources.find((s) => s.mac === m.mac);
		const zone = src?.zones.find((z) => z.index === m.zone_index);
		return `${src?.name ?? "Unknown device"} → ${zone?.name ?? `Zone ${m.zone_index}`}`;
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
			this._merge.checked.size >= 1
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
