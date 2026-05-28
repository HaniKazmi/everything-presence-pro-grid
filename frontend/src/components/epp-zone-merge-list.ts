import { css, html, LitElement } from "lit";
import { property, state } from "lit/decorators.js";

import type {
	DeviceGroupSource,
	DeviceGroupZoneGroup,
	DeviceGroupZoneMember,
} from "../types.js";

/**
 * Two-pane zone merge editor. Left: available zones from selected sources.
 * Right: named merge groups.
 *
 * Emits "zone-groups-changed" CustomEvent<{zone_groups: DeviceGroupZoneGroup[]}>.
 */
export class EppZoneMergeList extends LitElement {
	static styles = css`
		:host { display: block; }
		.layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
		.pane {
			padding: .5rem;
			border: 1px solid var(--divider-color);
			border-radius: 6px;
		}
		button {
			background: none;
			border: 1px solid var(--divider-color);
			padding: .25rem .5rem;
			cursor: pointer;
		}
		.group {
			margin-bottom: .5rem;
			padding: .5rem;
			background: var(--secondary-background-color);
			border-radius: 4px;
		}
		.group-name { font-weight: 600; }
		.member { display: flex; justify-content: space-between; padding: .15rem 0; }
		.x { color: var(--error-color); cursor: pointer; background: none; border: none; }
		.zone-item { padding: .2rem 0; cursor: pointer; }
		.zone-item.selected {
			background: var(--primary-color);
			color: var(--text-primary-color);
		}
	`;

	@property({ attribute: false }) sources: DeviceGroupSource[] = [];
	@property({ attribute: false }) zoneGroups: DeviceGroupZoneGroup[] = [];

	@state() private _selectedZone: DeviceGroupZoneMember | null = null;

	render() {
		return html`
			<div class="layout">
				<div class="pane">
					<h4>Available zones</h4>
					${this._renderAvailable()}
				</div>
				<div class="pane">
					<h4>Merge groups</h4>
					<button data-testid="new-group" @click=${this._createGroup}>
						+ New group
					</button>
					${this.zoneGroups.map((g) => this._renderGroup(g))}
				</div>
			</div>
		`;
	}

	private _renderAvailable() {
		const groupedKeys = new Set<string>(
			this.zoneGroups.flatMap((g) =>
				g.members.map((m) => `${m.mac}|${m.zone_index}`),
			),
		);
		const items: { mac: string; index: number; label: string }[] = [];
		for (const src of this.sources) {
			for (const z of src.zones) {
				if (!z.enabled) continue;
				if (groupedKeys.has(`${src.mac}|${z.index}`)) continue;
				items.push({
					mac: src.mac,
					index: z.index,
					label: `${src.name} → ${z.name}`,
				});
			}
		}
		return html`${items.map(
			(it) => html`
			<div
				data-testid="available-zone"
				class="zone-item ${this._isSelected(it) ? "selected" : ""}"
				@click=${() => this._selectZone(it.mac, it.index)}
			>${it.label}</div>
		`,
		)}`;
	}

	private _renderGroup(g: DeviceGroupZoneGroup) {
		return html`
			<div class="group">
				<input
					class="group-name"
					.value=${g.name}
					@input=${(e: Event) =>
						this._renameGroup(g.id, (e.target as HTMLInputElement).value)}
				/>
				<button @click=${() => this._addSelectedTo(g.id)}>
					Add selected zone
				</button>
				<button class="x" @click=${() => this._deleteGroup(g.id)}>Delete</button>
				${g.members.map(
					(m) => html`
					<div class="member">
						<span>${this._memberLabel(m)}</span>
						<button class="x" @click=${() => this._removeMember(g.id, m)}>×</button>
					</div>
				`,
				)}
			</div>
		`;
	}

	private _isSelected(it: { mac: string; index: number }): boolean {
		return (
			this._selectedZone?.mac === it.mac &&
			this._selectedZone?.zone_index === it.index
		);
	}

	private _selectZone(mac: string, zone_index: number) {
		this._selectedZone = { mac, zone_index };
	}

	private _memberLabel(m: DeviceGroupZoneMember): string {
		const src = this.sources.find((s) => s.mac === m.mac);
		const zone = src?.zones.find((z) => z.index === m.zone_index);
		return `${src?.name ?? m.mac} → ${zone?.name ?? `Zone ${m.zone_index}`}`;
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

	private _createGroup() {
		const id = `zg_${crypto.randomUUID().slice(0, 8)}`;
		const next = [...this.zoneGroups, { id, name: "Group", members: [] }];
		this._emit(next);
	}

	private _renameGroup(id: string, name: string) {
		const next = this.zoneGroups.map((g) => (g.id === id ? { ...g, name } : g));
		this._emit(next);
	}

	private _addSelectedTo(id: string) {
		if (!this._selectedZone) return;
		const m = this._selectedZone;
		const next = this.zoneGroups.map((g) =>
			g.id === id ? { ...g, members: [...g.members, m] } : g,
		);
		this._selectedZone = null;
		this._emit(next);
	}

	private _removeMember(id: string, m: DeviceGroupZoneMember) {
		const next = this.zoneGroups.map((g) =>
			g.id === id
				? {
						...g,
						members: g.members.filter(
							(x) => !(x.mac === m.mac && x.zone_index === m.zone_index),
						),
					}
				: g,
		);
		this._emit(next);
	}

	private _deleteGroup(id: string) {
		this._emit(this.zoneGroups.filter((g) => g.id !== id));
	}
}

customElements.define("epp-zone-merge-list", EppZoneMergeList);

declare global {
	interface HTMLElementTagNameMap {
		"epp-zone-merge-list": EppZoneMergeList;
	}
}
