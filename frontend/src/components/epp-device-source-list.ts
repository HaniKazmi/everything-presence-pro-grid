import { css, html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

import "../ui/epp-toggle.js";
import type { DeviceInfo } from "../types.js";

interface MissingSource {
	mac: string;
	name: string;
}

/**
 * Renders the Devices list section for the Device Groups editor.
 * One row per candidate device (availableDevices) plus stale rows for
 * sources whose device has been removed (missingSources). Emits
 * `source-toggled` CustomEvent<{ mac: string; on: boolean }> when any
 * toggle changes.
 */
export class EppDeviceSourceList extends LitElement {
	static styles = css`
		:host { display: block; }
		/* source-box / source-row / source-name / missing-* — token styles
		   ported verbatim from epp-device-group-editor */
		.source-box {
			border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
			border-radius: var(--epp-radius-md, 10px);
			padding: 2px var(--epp-space-3, 12px);
		}
		.source-row {
			display: flex;
			align-items: center;
			gap: var(--epp-space-3, 12px);
			padding: 6px 0;
			min-height: 36px;
		}
		.source-row + .source-row {
			border-top: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
		}
		.source-name {
			flex: 1;
			min-width: 0;
			font-size: var(--epp-font-base, 14px);
			color: var(--epp-text, var(--primary-text-color, #212121));
		}
		.source-row.missing .source-name {
			color: var(--epp-warning, var(--warning-color, #ff9800));
		}
		.missing-warning {
			display: flex;
			align-items: center;
			gap: 6px;
			margin-top: 6px;
			font-size: var(--epp-font-sm, 13px);
			color: var(--epp-warning, var(--warning-color, #ff9800));
		}
		.missing-warning ha-icon { --mdc-icon-size: 18px; }
		/* Availability badges */
		.badge {
			font-size: var(--epp-font-sm, 13px);
			white-space: nowrap;
		}
		.badge.online {
			color: var(--epp-success, var(--success-color, #43a047));
		}
		.badge.offline {
			color: var(--epp-text-muted, var(--secondary-text-color, #757575));
		}
		.badge.missing {
			color: var(--epp-warning, var(--warning-color, #ff9800));
		}
	`;

	@property({ attribute: false }) availableDevices: DeviceInfo[] = [];
	@property({ attribute: false }) selectedMacs: string[] = [];
	@property({ attribute: false }) missingSources: MissingSource[] = [];

	render() {
		return html`
			<div class="source-box">
				${this.availableDevices.map((d) => this._renderDeviceRow(d))}
				${this.missingSources.map((s) => this._renderMissingRow(s))}
			</div>
			${
				this.missingSources.length
					? html`<div class="missing-warning" data-testid="missing-warning">
							<ha-icon icon="mdi:alert"></ha-icon>
							Some source devices no longer exist. Turn them off and save
							to remove them.
						</div>`
					: nothing
			}
		`;
	}

	private _renderDeviceRow(d: DeviceInfo) {
		const label = d.area ? `${d.name} (${d.area})` : d.name;
		const badge = d.available
			? html`<span class="badge online" data-testid="device-badge">● Online</span>`
			: html`<span class="badge offline" data-testid="device-badge">● Offline</span>`;
		return html`<div class="source-row" data-testid="device-row">
			<span class="source-name">${label}</span>
			${badge}
			<epp-toggle
				data-testid="device-toggle"
				data-mac=${d.mac}
				.checked=${this.selectedMacs.includes(d.mac)}
				@value-changed=${(e: CustomEvent) => {
					e.stopPropagation();
					this._emitSourceToggled(d.mac, e.detail.value as boolean);
				}}
			></epp-toggle>
		</div>`;
	}

	private _renderMissingRow(s: MissingSource) {
		return html`<div class="source-row missing" data-testid="device-row">
			<span class="source-name">${s.name}</span>
			<span class="badge missing" data-testid="device-badge">⚠ no longer exists</span>
			<epp-toggle
				data-testid="device-toggle"
				data-mac=${s.mac}
				.checked=${true}
				@value-changed=${(e: CustomEvent) => {
					e.stopPropagation();
					this._emitSourceToggled(s.mac, e.detail.value as boolean);
				}}
			></epp-toggle>
		</div>`;
	}

	private _emitSourceToggled(mac: string, on: boolean) {
		this.dispatchEvent(
			new CustomEvent("source-toggled", {
				detail: { mac, on },
				bubbles: true,
				composed: true,
			}),
		);
	}
}

/* v8 ignore start — the already-defined path only triggers on HA panel
   re-import (module re-eval), unreachable in a single test environment */
if (!customElements.get("epp-device-source-list")) {
	customElements.define("epp-device-source-list", EppDeviceSourceList);
}
/* v8 ignore stop */

declare global {
	interface HTMLElementTagNameMap {
		"epp-device-source-list": EppDeviceSourceList;
	}
}
