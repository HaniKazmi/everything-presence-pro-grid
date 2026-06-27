import { css, html, LitElement, nothing } from "lit";
import { state } from "lit/decorators.js";
import "./components/epp-grid.js";
import "./components/epp-live-sidebar.js";
import {
	type OverviewState,
	subscribeOverview,
} from "./card/overview-store.js";
import type { SensorState } from "./components/epp-live-sidebar.js";
import { parseConfig } from "./lib/config-serialization.js";
import { MAX_RANGE } from "./lib/grid.js";
import { defaultLocalize, type LocalizeFn, setupLocalize } from "./localize.js";
import { tokens } from "./ui/tokens.js";

type EnvKey = "temperature" | "humidity" | "illuminance" | "co2";

export interface EppGridCardConfig {
	type: string;
	device_id: string;
	title?: string;
	show_map?: boolean;
	show_sensors?: boolean;
	layout?: "horizontal" | "vertical";
	sensors?: {
		presence?: boolean;
		zones?: boolean;
		environmental?: Partial<Record<EnvKey, boolean>>;
	};
	show_furniture?: boolean;
	show_overlays?: boolean;
}

type ResolvedCardConfig = Omit<EppGridCardConfig, "sensors"> & {
	show_map: boolean;
	show_sensors: boolean;
	layout: "horizontal" | "vertical";
	show_furniture: boolean;
	show_overlays: boolean;
	sensors: {
		presence: boolean;
		zones: boolean;
		environmental: Record<EnvKey, boolean>;
	};
};

export function applyCardDefaults(
	config: Partial<EppGridCardConfig>,
): ResolvedCardConfig {
	const sensors = config.sensors ?? {};
	const envSrc = sensors.environmental;
	return {
		type: config.type ?? "custom:eppgrid-card",
		device_id: config.device_id ?? "",
		title: config.title,
		show_map: config.show_map !== false,
		show_sensors: config.show_sensors !== false,
		layout: config.layout ?? "horizontal",
		show_furniture: config.show_furniture !== false,
		show_overlays: config.show_overlays !== false,
		sensors: {
			presence: sensors.presence !== false,
			zones: sensors.zones !== false,
			environmental: {
				// env absent entirely → all on; env present → only keys explicitly true
				temperature: envSrc ? envSrc.temperature === true : true,
				humidity: envSrc ? envSrc.humidity === true : true,
				illuminance: envSrc ? envSrc.illuminance === true : true,
				co2: envSrc ? envSrc.co2 === true : true,
			},
		},
	};
}

const EMPTY_SENSORS: SensorState = {
	occupancy: false,
	static_presence: false,
	motion_presence: false,
	target_presence: false,
	mmwave: false,
	illuminance: null,
	temperature: null,
	humidity: null,
	co2: null,
};
const EMPTY_ZONES = { occupancy: {}, target_counts: {}, frame_count: 0 };

export class EppGridCard extends LitElement {
	static styles = [
		tokens,
		css`
			:host {
				display: block;
				container-type: inline-size;
			}
			.overview {
				display: flex;
				gap: var(--epp-space-3);
			}
			.overview--vertical,
			.overview--single {
				flex-direction: column;
			}
			.overview--horizontal {
				flex-direction: row;
				align-items: flex-start;
			}
			.overview--horizontal .map {
				flex: 1 1 auto;
				min-width: 0;
			}
			.overview--horizontal .sensors {
				flex: 0 0 240px;
			}
			.content {
				padding: var(--epp-space-3);
			}
			.placeholder {
				padding: var(--epp-space-5);
				color: var(--epp-text-muted);
				text-align: center;
			}
			.offline {
				font-size: var(--epp-font-xs);
				color: var(--epp-warning);
				padding: 0 var(--epp-space-3) var(--epp-space-2);
			}
			@container (max-width: 500px) {
				.overview--horizontal {
					flex-direction: column;
				}
				.overview--horizontal .sensors {
					flex: 1 1 auto;
				}
			}
		`,
	];

	@state() private _config?: EppGridCardConfig;
	@state() private _data: OverviewState = {
		snapshot: null,
		data: null,
		available: true,
		connected: false,
	};

	private __hass?: { connection: unknown; locale?: { language?: string } };
	private _localize: LocalizeFn = defaultLocalize;
	private _unsub: (() => void) | null = null;
	private _subConn: unknown = null;
	private _subDevice: string | null = null;

	setConfig(config: EppGridCardConfig): void {
		this._config = config;
		this._maybeResubscribe();
	}

	set hass(hass: { connection: unknown; locale?: { language?: string } }) {
		this.__hass = hass;
		this._localize = setupLocalize(hass);
		this._maybeResubscribe();
		this.requestUpdate();
	}

	get hass():
		| { connection: unknown; locale?: { language?: string } }
		| undefined {
		return this.__hass;
	}

	connectedCallback(): void {
		super.connectedCallback();
		this._maybeResubscribe();
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		this._unsub?.();
		this._unsub = null;
		this._subConn = null;
		this._subDevice = null;
	}

	private _maybeResubscribe(): void {
		const hass = this.__hass;
		const deviceId = this._config?.device_id;
		if (!hass || !deviceId) return;
		if (
			this._unsub &&
			this._subConn === hass.connection &&
			this._subDevice === deviceId
		) {
			return;
		}
		this._unsub?.();
		this._subConn = hass.connection;
		this._subDevice = deviceId;
		this._unsub = subscribeOverview(hass, deviceId, (s) => {
			this._data = s;
			this.requestUpdate();
		});
	}

	getCardSize(): number {
		const cfg = applyCardDefaults(this._config ?? {});
		const showMap = cfg.show_map;
		const showSensors = cfg.show_sensors;
		let size = 1;
		if (showMap) size += 6;
		if (showSensors && !showMap) size += 4;
		return size;
	}

	getGridOptions(): { columns: number; rows: string; min_columns: number } {
		const cfg = applyCardDefaults(this._config ?? {});
		const showMap = cfg.show_map;
		const showSensors = cfg.show_sensors;
		if (showMap && showSensors)
			return { columns: 12, rows: "auto", min_columns: 6 };
		if (showMap) return { columns: 8, rows: "auto", min_columns: 6 };
		return { columns: 6, rows: "auto", min_columns: 4 };
	}

	static getConfigElement(): HTMLElement {
		return document.createElement("eppgrid-card-editor");
	}

	static getStubConfig(): Partial<EppGridCardConfig> {
		return { device_id: "" };
	}

	render() {
		if (!this._config) return nothing;
		const cfg = applyCardDefaults(this._config);
		if (!cfg.device_id) {
			return html`<ha-card .header=${cfg.title}><div class="placeholder">${this._localize("card.no_device")}</div></ha-card>`;
		}
		if (!cfg.show_map && !cfg.show_sensors) {
			return html`<ha-card .header=${cfg.title}><div class="placeholder">${this._localize("card.nothing_to_show")}</div></ha-card>`;
		}
		const both = cfg.show_map && cfg.show_sensors;
		const layout = both ? cfg.layout : "single";
		const parsed = this._data.snapshot
			? parseConfig(this._data.snapshot)
			: null;

		return html`
			<ha-card .header=${cfg.title}>
				${
					this._data.available === false
						? html`<div class="offline">${this._localize("card.offline")}</div>`
						: nothing
				}
				<div class="content">
					<div class="overview overview--${layout}">
						${cfg.show_map ? html`<div class="map">${this._renderMap(cfg, parsed)}</div>` : nothing}
						${cfg.show_sensors ? html`<div class="sensors">${this._renderSensors(cfg, parsed)}</div>` : nothing}
					</div>
				</div>
			</ha-card>
		`;
	}

	private _renderMap(
		cfg: ResolvedCardConfig,
		parsed: ReturnType<typeof parseConfig> | null,
	) {
		if (!parsed || parsed.calibration.perspective == null) {
			return html`<div class="placeholder">${this._localize("card.uncalibrated")}</div>`;
		}
		const data = this._data.data;
		const maxRange = parsed.settings.targetAutoDistance
			? MAX_RANGE
			: Math.round(parsed.settings.targetMaxDistance * 1000);
		// maxGridPx=480: map is aspect-locked and width-fit; a height:100% fill chain caused scroll-driven resize oscillation
		return html`
			<epp-grid
				.grid=${parsed.grid}
				.zoneConfigs=${parsed.zoneConfigs}
				.targets=${(data?.targets ?? []) as never}
				.roomWidth=${parsed.calibration.roomWidth}
				.roomDepth=${parsed.calibration.roomDepth}
				.perspective=${parsed.calibration.perspective}
				.furniture=${cfg.show_furniture ? parsed.furniture : []}
				.occupancy=${data?.zones?.occupancy ?? {}}
				.localize=${this._localize}
				.maxRangeMm=${maxRange}
				.maxGridPx=${480}
				.showOverlays=${cfg.show_overlays}
			></epp-grid>
		`;
	}

	private _renderSensors(
		cfg: ResolvedCardConfig,
		parsed: ReturnType<typeof parseConfig> | null,
	) {
		const data = this._data.data;
		const s = cfg.sensors;
		// If the raw config had environmental absent, pass null (show all).
		// If present, derive envKeys from the defaulted env keys that are true.
		const rawEnv = this._config?.sensors?.environmental;
		const envKeys = rawEnv
			? (Object.keys(s.environmental).filter(
					(k) => s.environmental[k as EnvKey],
				) as EnvKey[])
			: null;
		return html`
			<epp-live-sidebar
				.sensorState=${data?.sensors ?? EMPTY_SENSORS}
				.zoneState=${data?.zones ?? EMPTY_ZONES}
				.zoneConfigs=${parsed?.zoneConfigs ?? []}
				.hasPerspective=${parsed?.calibration.perspective != null}
				.localize=${this._localize}
				.showPresence=${s.presence}
				.showZones=${s.zones}
				.envKeys=${envKeys}
				.interactive=${false}
			></epp-live-sidebar>
		`;
	}
}

if (!customElements.get("eppgrid-card")) {
	customElements.define("eppgrid-card", EppGridCard);
}

interface CustomCardEntry {
	type: string;
	name: string;
	description: string;
	preview: boolean;
}
const w = window as unknown as { customCards?: CustomCardEntry[] };
w.customCards = w.customCards || [];
if (!w.customCards.some((c) => c.type === "eppgrid-card")) {
	w.customCards.push({
		type: "eppgrid-card",
		name: "Everything Presence Pro Grid",
		description:
			"Live overview map and sensors for an Everything Presence Pro Grid device.",
		preview: true,
	});
}
