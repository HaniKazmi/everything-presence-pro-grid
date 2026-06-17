import { css, html, LitElement } from "lit";
import { property, state } from "lit/decorators.js";

import { chipStyles } from "../styles.js";
import "../ui/epp-toggle.js";
import "./epp-kebab-menu.js";
import {
	EDIT_DELETE_KEBAB_ITEMS,
	PRESENCE_LABELS,
	presenceCoverage,
	zoneRowLabel,
} from "../lib/device-groups-labels.js";
import {
	type DeviceGroupSource,
	type DeviceGroupZoneGroup,
	type DeviceGroupZoneMember,
	PRESENCE_SLOTS,
	type PresenceSlot,
	REST_OF_ROOM_ID,
	REST_OF_ROOM_NAME,
} from "../types.js";

/** One enabled zone, with its device and zone names resolved for display. */
interface ZoneEntry {
	mac: string;
	deviceName: string;
	index: number;
	zoneName: string;
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

function sameMember(
	a: DeviceGroupZoneMember,
	b: DeviceGroupZoneMember,
): boolean {
	return a.mac === b.mac && a.zone_index === b.zone_index;
}

/**
 * The "Sensors" section of the device-group editor. A single fixed-order list
 * of the sensors a group exposes — combined presence (with a per-slot coverage
 * line), the combined Rest of room, per-device passthrough zones — each with an
 * opt-out toggle (default ON), plus read-only merged-zone rows with a kebab.
 *
 * A "List ⇄ Merge zones" segmented control (Task D3) switches into a merge mode
 * where index-≥1 zones become checkboxes and 2+ can be merged into a zone group.
 *
 * Emits:
 *  - "exclusions-changed" CustomEvent<{excluded_presence; excluded_zones;
 *    excluded_zone_groups}> when a toggle flips.
 *  - "zone-groups-changed" CustomEvent<{zone_groups}> on merge/edit/delete.
 */
export class EppSensorList extends LitElement {
	static styles = [
		chipStyles,
		css`
			:host { display: block; }
			h4 {
				margin: 0 0 var(--epp-space-2, 8px) 0;
				font-size: var(--epp-font-md, 15px);
				font-weight: var(--epp-weight-semibold, 600);
			}
			/* Kept as an in-place tokenised container rather than <epp-card>: it's a
			   tight inset list of rows (4px 12px padding, internal row dividers, 10px
			   radius), not a card-padded surface — epp-card bakes in 16px padding +
			   16px radius on its shadow .card with no external override, which would
			   loosen the dense row list and change its look. */
			.sensor-box {
				border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
				border-radius: var(--epp-radius-md, 10px);
				padding: var(--epp-space-1, 4px) var(--epp-space-3, 12px);
			}
			.sensor-row {
				display: flex;
				align-items: center;
				gap: var(--epp-space-3, 12px);
				min-height: 36px;
				padding: 6px 0;
			}
			.sensor-row + .sensor-row {
				border-top: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
			}
			.sensor-row.disabled {
				opacity: 0.55;
				pointer-events: none;
			}
			.sensor-main {
				flex: 1;
				min-width: 0;
				display: flex;
				flex-direction: column;
				gap: 2px;
			}
			.sensor-label {
				display: flex;
				align-items: center;
				gap: var(--epp-space-2, 8px);
				font-size: var(--epp-font-base, 14px);
				color: var(--epp-text, var(--primary-text-color, #212121));
			}
			.sensor-name { min-width: 0; }
			.coverage {
				color: var(--epp-text-muted, var(--secondary-text-color, #757575));
				font-size: var(--epp-font-sm, 13px);
			}
			.sensor-row epp-toggle { flex-shrink: 0; }
			.sensor-row ha-checkbox,
			.sensor-row input[type="checkbox"] {
				flex-shrink: 0;
				margin: 0;
			}
			.empty { color: var(--epp-text-muted, var(--secondary-text-color, #757575)); }
			.header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: var(--epp-space-2, 8px);
				margin-bottom: var(--epp-space-2, 8px);
			}
			.segmented {
				display: inline-flex;
				border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
				border-radius: var(--epp-radius-pill, 9999px);
				overflow: hidden;
			}
			.segmented button {
				border: none;
				background: none;
				padding: 4px var(--epp-space-3, 12px);
				font-size: var(--epp-font-sm, 13px);
				cursor: pointer;
				color: var(--epp-text, var(--primary-text-color, #212121));
			}
			.segmented button.active {
				background: var(--epp-accent, var(--primary-color, #03a9f4));
				color: var(--epp-accent-text, var(--text-primary-color, #fff));
			}
			.merge-name {
				display: block;
				width: 100%;
				margin-top: var(--epp-space-3, 12px);
			}
			.actions {
				display: flex;
				justify-content: flex-end;
				gap: var(--epp-space-2, 8px);
				margin-top: var(--epp-space-3, 12px);
			}
			.merged-zone .sensor-name { font-weight: var(--epp-weight-medium, 500); }
			.merged-zone epp-kebab-menu { margin: -6px 0; }
		`,
	];

	@property({ attribute: false }) sources: DeviceGroupSource[] = [];
	@property({ attribute: false }) zoneGroups: DeviceGroupZoneGroup[] = [];
	@property({ attribute: false }) excludedPresence: string[] = [];
	@property({ attribute: false }) excludedZones: DeviceGroupZoneMember[] = [];
	@property({ attribute: false }) excludedZoneGroups: string[] = [];

	@state() private _merge: MergeDraft | null = null;

	render() {
		const presenceSlots = PRESENCE_SLOTS.filter((slot) =>
			this.sources.some((s) => s.enabled_presence.includes(slot)),
		);
		const showRoom = this.sources.some((s) =>
			s.zones.some((z) => z.index === 0 && z.enabled),
		);
		const zones = this._passthroughZones();
		const rows: unknown[] = [];
		for (const slot of presenceSlots) rows.push(this._renderPresence(slot));
		if (showRoom) rows.push(this._renderRoom());
		for (const z of zones) rows.push(this._renderZone(z));
		for (const g of this.zoneGroups) rows.push(this._renderMergedGroup(g));
		return html`
			${this._renderHeader()}
			${rows.length ? html`<div class="sensor-box">${rows}</div>` : html`<p class="empty">No sensors.</p>`}
		`;
	}

	private _renderHeader() {
		// Segmented control (List ⇄ Merge zones) is added in Task D3.
		return html`<div class="header">
			<h4>Sensors</h4>
		</div>`;
	}

	private _renderPresence(slot: PresenceSlot) {
		const checked = !this.excludedPresence.includes(slot);
		const cov = presenceCoverage(slot, this.sources);
		const coverage = [
			...cov.provided.map((n) => `${n} ✓`),
			...cov.missing.map((n) => `${n} ✗ off in HA`),
		].join(" · ");
		return html`<div
			class="sensor-row"
			data-testid="presence-row"
			data-slot=${slot}
		>
			<div class="sensor-main">
				<div class="sensor-label">
					<span class="sensor-name">${PRESENCE_LABELS[slot] ?? slot}</span>
				</div>
				<div class="coverage" data-testid="coverage">${coverage}</div>
			</div>
			<epp-toggle
				data-testid="presence-toggle"
				.checked=${checked}
				@value-changed=${(e: CustomEvent<{ value: boolean }>) => {
					e.stopPropagation();
					this.excludedPresence = toggleInList(
						this.excludedPresence,
						slot,
						!e.detail.value,
						(a, b) => a === b,
					);
					this._emitExclusions();
				}}
			></epp-toggle>
		</div>`;
	}

	private _renderRoom() {
		const checked = !this.excludedZoneGroups.includes(REST_OF_ROOM_ID);
		return html`<div class="sensor-row" data-testid="rest-of-room-row">
			<div class="sensor-main">
				<div class="sensor-label">
					<span class="sensor-name">${REST_OF_ROOM_NAME}</span>
					<span class="chip">combined</span>
				</div>
			</div>
			<epp-toggle
				data-testid="rest-of-room-toggle"
				.checked=${checked}
				@value-changed=${(e: CustomEvent<{ value: boolean }>) => {
					e.stopPropagation();
					this.excludedZoneGroups = toggleInList(
						this.excludedZoneGroups,
						REST_OF_ROOM_ID,
						!e.detail.value,
						(a, b) => a === b,
					);
					this._emitExclusions();
				}}
			></epp-toggle>
		</div>`;
	}

	private _renderZone(z: ZoneEntry) {
		const member: DeviceGroupZoneMember = { mac: z.mac, zone_index: z.index };
		const checked = !this.excludedZones.some((m) => sameMember(m, member));
		return html`<div
			class="sensor-row"
			data-testid="zone-row"
			data-key=${zoneKey(z.mac, z.index)}
		>
			<div class="sensor-main">
				<div class="sensor-label">
					<span class="sensor-name"
						>${zoneRowLabel(z.zoneName, z.deviceName)}</span
					>
				</div>
			</div>
			<epp-toggle
				data-testid="zone-toggle"
				.checked=${checked}
				@value-changed=${(e: CustomEvent<{ value: boolean }>) => {
					e.stopPropagation();
					this.excludedZones = toggleInList(
						this.excludedZones,
						member,
						!e.detail.value,
						sameMember,
					);
					this._emitExclusions();
				}}
			></epp-toggle>
		</div>`;
	}

	private _renderMergedGroup(g: DeviceGroupZoneGroup) {
		const members = g.members
			.map((m) => this._resolveMember(m).deviceName)
			.join(", ");
		const label = members ? `${g.name} · ${members}` : g.name;
		return html`<div class="sensor-row merged-zone" data-testid="merged-zone">
			<div class="sensor-main">
				<div class="sensor-label">
					<span class="sensor-name">${label}</span>
					<span class="chip zone">merged</span>
				</div>
			</div>
			<epp-kebab-menu
				.items=${EDIT_DELETE_KEBAB_ITEMS}
				@item-select=${(e: CustomEvent<{ id: string }>) =>
					this._onKebab(g, e.detail.id)}
			></epp-kebab-menu>
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

	// Enabled index-≥1 zones not in any merged group, sorted by zone name
	// (numeric-aware) then device name so same-named zones sit adjacent.
	private _passthroughZones(): ZoneEntry[] {
		return this._ungroupedZones()
			.filter((z) => z.index >= 1)
			.sort(
				(a, b) =>
					a.zoneName.localeCompare(b.zoneName, undefined, { numeric: true }) ||
					a.deviceName.localeCompare(b.deviceName, undefined, {
						numeric: true,
					}),
			);
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

	// Zones offered with checkboxes while merging: the ungrouped index-≥1 zones,
	// plus — when editing — the group's own current members.
	private _checkableZones(): ZoneEntry[] {
		const zones = this._passthroughZones();
		const g =
			this._merge?.editingId != null
				? this.zoneGroups.find((x) => x.id === this._merge?.editingId)
				: undefined;
		if (g) {
			for (const m of g.members) zones.push(this._resolveMember(m));
		}
		return zones;
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

	private _emitExclusions() {
		this.dispatchEvent(
			new CustomEvent("exclusions-changed", {
				detail: {
					excluded_presence: this.excludedPresence,
					excluded_zones: this.excludedZones,
					excluded_zone_groups: this.excludedZoneGroups,
				},
				bubbles: true,
				composed: true,
			}),
		);
	}
}

// Immutable add/remove of `value` in `list` (by `eq`): `want` true ensures it
// is present, false ensures it is absent. Returns a new array either way.
function toggleInList<T>(
	list: T[],
	value: T,
	want: boolean,
	eq: (a: T, b: T) => boolean,
): T[] {
	const has = list.some((x) => eq(x, value));
	if (want && !has) return [...list, value];
	if (!want && has) return list.filter((x) => !eq(x, value));
	return list;
}

customElements.define("epp-sensor-list", EppSensorList);

declare global {
	interface HTMLElementTagNameMap {
		"epp-sensor-list": EppSensorList;
	}
}
