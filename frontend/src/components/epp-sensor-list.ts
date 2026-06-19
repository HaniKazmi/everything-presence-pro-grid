import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";

import { chipStyles } from "../styles.js";
import "../ui/epp-button.js";
import "../ui/epp-field.js";
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
			.coverage .off { text-decoration: line-through; }
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

	@state() private _mode: "list" | "merge" = "list";
	// In-flight merge selection/name; only meaningful while `_mode === "merge"`.
	@state() private _merge: MergeDraft | null = null;

	render() {
		const merging = this._mode === "merge";
		const presenceSlots = PRESENCE_SLOTS.filter((slot) =>
			this.sources.some((s) => s.enabled_presence.includes(slot)),
		);
		// Match the projection: the combined Rest of room is offered whenever a
		// source HAS a zone 0, even if its zone-0 entities are currently disabled
		// in HA — so the user can always see and opt out of it (and the editor
		// preview agrees with what the projection exposes).
		const showRoom = this.sources.some((s) =>
			s.zones.some((z) => z.index === 0),
		);
		// While merging, every checkable index-≥1 zone (ungrouped + the edited
		// group's own members) becomes a checkbox row; in list mode only the
		// ungrouped passthrough zones show, each with its opt-out toggle.
		const zones = merging ? this._checkableZones() : this._passthroughZones();
		const rows: unknown[] = [];
		for (const slot of presenceSlots)
			rows.push(this._renderPresence(slot, merging));
		if (showRoom) rows.push(this._renderRoom(merging));
		for (const z of zones)
			rows.push(merging ? this._renderZoneCheck(z) : this._renderZone(z));
		// Merged-zone rows stay visible (with their kebab) only in list mode.
		if (!merging)
			for (const g of this.zoneGroups) rows.push(this._renderMergedGroup(g));
		return html`
			${this._renderHeader()}
			${rows.length ? html`<div class="sensor-box">${rows}</div>` : html`<p class="empty">No sensors.</p>`}
			${merging ? this._renderMergeControls() : nothing}
		`;
	}

	private _renderHeader() {
		const merging = this._mode === "merge";
		return html`<div class="header">
			<h4>Sensors</h4>
			<div class="segmented" role="group" aria-label="Sensor list mode">
				<button
					type="button"
					data-testid="mode-list"
					class=${merging ? "" : "active"}
					aria-pressed=${!merging}
					@click=${this._toList}
				>
					List
				</button>
				<button
					type="button"
					data-testid="mode-merge"
					class=${merging ? "active" : ""}
					aria-pressed=${merging}
					@click=${this._toMerge}
				>
					Merge zones
				</button>
			</div>
		</div>`;
	}

	private _toList() {
		this._mode = "list";
		this._merge = null;
	}

	private _toMerge() {
		this._mode = "merge";
		this._merge = { editingId: null, name: "", checked: new Set() };
	}

	// Presence + Rest-of-room rows stay visible while merging but their toggles
	// are disabled and the row greyed — only zones are mergeable.
	private _renderPresence(slot: PresenceSlot, disabled: boolean) {
		const checked = !this.excludedPresence.includes(slot);
		const cov = presenceCoverage(slot, this.sources);
		return html`<div
			class="sensor-row ${disabled ? "disabled" : ""}"
			data-testid="presence-row"
			data-slot=${slot}
		>
			<div class="sensor-main">
				<div class="sensor-label">
					<span class="sensor-name">${PRESENCE_LABELS[slot] ?? slot}</span>
				</div>
				<div class="coverage" data-testid="coverage">
					${this._renderCoverage(cov.provided, cov.missing)}
				</div>
			</div>
			<epp-toggle
				data-testid="presence-toggle"
				.checked=${checked}
				.disabled=${disabled}
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

	// Provider names (plain) then off-in-HA names (struck), joined by " · ".
	private _renderCoverage(provided: string[], missing: string[]) {
		const parts = [
			...provided.map((n) => ({ name: n, off: false })),
			...missing.map((n) => ({ name: n, off: true })),
		];
		return parts.map(
			(p, i) =>
				html`${i > 0 ? " · " : nothing}<span
						class=${p.off ? "off" : ""}
						data-testid=${p.off ? "coverage-off" : "coverage-on"}
						>${p.name}</span
					>`,
		);
	}

	private _renderRoom(disabled: boolean) {
		const checked = !this.excludedZoneGroups.includes(REST_OF_ROOM_ID);
		return html`<div
			class="sensor-row ${disabled ? "disabled" : ""}"
			data-testid="rest-of-room-row"
		>
			<div class="sensor-main">
				<div class="sensor-label">
					<span class="sensor-name">${REST_OF_ROOM_NAME}</span>
				</div>
			</div>
			<epp-toggle
				data-testid="rest-of-room-toggle"
				.checked=${checked}
				.disabled=${disabled}
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

	// A zone row in merge mode: the same label, but a multi-select checkbox
	// instead of the opt-out toggle (epp-toggle is single on/off, not for
	// multi-select — those stay ha-checkbox per the design system).
	private _renderZoneCheck(z: ZoneEntry) {
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
		return html`<label
			class="sensor-row"
			data-testid="zone-row"
			data-key=${k}
		>
			<div class="sensor-main">
				<div class="sensor-label">
					<span class="sensor-name"
						>${zoneRowLabel(z.zoneName, z.deviceName)}</span
					>
				</div>
			</div>
			${box}
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
		const members = g.members
			.map((m) => {
				const e = this._resolveMember(m);
				return zoneRowLabel(e.zoneName, e.deviceName);
			})
			.join(", ");
		return html`<div class="sensor-row merged-zone" data-testid="merged-zone">
			<div class="sensor-main">
				<div class="sensor-label">
					<span class="sensor-name">${g.name}</span>
					<span class="chip zone">merged</span>
				</div>
				${members ? html`<div class="coverage" data-testid="merged-members">${members}</div>` : nothing}
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
	// plus — when editing — the group's own current members, all sorted together
	// so same-named zones remain adjacent (numeric-aware by zone name, then device).
	private _checkableZones(): ZoneEntry[] {
		const zones = this._passthroughZones();
		const g =
			this._merge?.editingId != null
				? this.zoneGroups.find((x) => x.id === this._merge?.editingId)
				: undefined;
		if (g) {
			for (const m of g.members) zones.push(this._resolveMember(m));
		}
		return zones.sort(
			(a, b) =>
				a.zoneName.localeCompare(b.zoneName, undefined, { numeric: true }) ||
				a.deviceName.localeCompare(b.deviceName, undefined, { numeric: true }),
		);
	}

	private _startEdit(g: DeviceGroupZoneGroup) {
		this._mode = "merge";
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
		this._mode = "list";
		this._merge = null;
	}

	private _confirmMerge() {
		if (!this._canMerge()) return;
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
		this._mode = "list";
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

if (!customElements.get("epp-sensor-list")) {
	customElements.define("epp-sensor-list", EppSensorList);
}

declare global {
	interface HTMLElementTagNameMap {
		"epp-sensor-list": EppSensorList;
	}
}
