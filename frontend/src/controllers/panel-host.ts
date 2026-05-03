import type { ReactiveControllerHost } from "lit";
import type { SensorState, ZoneState } from "../components/epp-live-sidebar.js";
import type { PaintAction } from "../lib/cell-painting.js";
import type { FurnitureItem } from "../lib/furniture.js";
import type { OverlayMode } from "../lib/grid.js";
import type { SidebarTab, ViewMode } from "../lib/view-hash.js";
import type { ZoneSlots } from "../lib/zone-defaults.js";
import type { LocalizeFn } from "../localize.js";
import type { RawTarget, Target } from "../types.js";

/**
 * Structural shape of the panel as far as the controllers are concerned.
 *
 * The panel's `@state` properties are declared `private` for class-level
 * encapsulation, so the panel passes itself in via
 * `new GridStateController(this as unknown as PanelHost)`. From the
 * controllers' perspective, this is a typed bag of fields and methods —
 * tsc catches typos like `this.host._zoneCofig` that the previous
 * `Record<string, any>` shape silently allowed.
 *
 * Only fields actually read or written by the controllers belong here.
 * Adding a new field requires both adding it to the panel and listing
 * it here.
 */
export interface PanelHost extends ReactiveControllerHost {
	// Lit / HA glue
	hass: any;
	shadowRoot: ShadowRoot | null;

	// Grid / zones
	_grid: Uint8Array;
	_zoneConfigs: ZoneSlots;
	_activeZone: number | null;
	_overlayMode: OverlayMode;
	_paintAction: PaintAction;
	_isPainting: boolean;
	_justPainted: boolean;
	_frozenBounds: {
		minCol: number;
		maxCol: number;
		minRow: number;
		maxRow: number;
	} | null;
	_getVisibleRoomBounds: () => {
		minCol: number;
		maxCol: number;
		minRow: number;
		maxRow: number;
	};

	// Room dimensions / perspective
	_roomWidth: number;
	_roomDepth: number;
	_perspective: number[] | null;

	// Furniture
	_furniture: FurnitureItem[];
	_selectedFurnitureId: string | null;
	_dragState: {
		type: "move" | "resize" | "rotate";
		id: string;
		startX: number;
		startY: number;
		origX: number;
		origY: number;
		origW: number;
		origH: number;
		origRot: number;
		handle?: string;
		centerX?: number;
		centerY?: number;
		startAngle?: number;
	} | null;

	// View routing
	_view: ViewMode;
	_sidebarTab: SidebarTab;

	// Device / connection
	_selectedMac: string;

	// Settings (mirrors SETTINGS_FIELD_MAP)
	_temperatureOffset: number;
	_humidityOffset: number;
	_illuminanceOffset: number;
	_motionTimeout: number;
	_targetAutoDistance: boolean;
	_targetMaxDistance: number;
	_staticAutoDistance: boolean;
	_staticMinDistance: number;
	_staticMaxDistance: number;
	_staticTriggerThreshold: number;
	_staticRenewThreshold: number;
	_staticTimeout: number;
	_staticOnDelay: number;
	_ledMode: string;
	_ledBrightness: number;
	_ledPresenceColor: string;
	_relayTriggerMode: string;
	_relayContactMode: string;
	_targetUpdateRateMs: number;
	_zoneUpdateRateMs: number;
	_entitiesConfig: Record<string, boolean>;
	_logLevels: Record<string, string>;

	// Save state
	_saving: boolean;
	_dirty: boolean;
	_showConfigurationBackup: boolean;
	_showConfigurationRestore: boolean;
	_configurationName: string;

	// Settings payload helpers (declared on the panel)
	_buildSettingsPayload: () => Record<string, any>;
	_buildSparseSettings: () => Record<string, any>;

	// Targets / sensors / zones (TargetController-side)
	_targets: Target[];
	_rawTargets: RawTarget[];
	_sensorState: SensorState;
	_zoneState: ZoneState;
	_showDebugLog: boolean;
	_showBackendDebugLog: boolean;
	_debugLogLines: string[];
	_debugLogPrev: string | null;
	_backendDebugLogLines: string[];
	_backendDebugLogPrev: string | null;
	_localize: LocalizeFn;
}
