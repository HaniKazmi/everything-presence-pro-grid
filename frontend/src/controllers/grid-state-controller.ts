import type { ReactiveController, ReactiveControllerHost } from "lit";
import {
	applyOverlayPaintToCell,
	applyPaintToCell,
	clearZoneFromGrid,
	determineOverlayPaintAction,
	determinePaintAction,
} from "../lib/cell-painting.js";
import {
	clampFurnitureMove,
	computeFurnitureResize,
	computeFurnitureRotation,
	createFurnitureItem,
	type FurnitureItem,
	type FurnitureSticker,
	isFurnitureOutsideGrid,
	removeFurnitureItem,
	updateFurnitureItem,
} from "../lib/furniture.js";
import {
	cellIsInside,
	cellZone,
	GRID_CELL_MM,
	GRID_COLS,
	getRoomBounds,
	initGridFromRoom,
	MAX_ZONES,
	NUM_ZONE_SLOTS,
	OVERLAY_MODE_TO_KIND,
	type OverlayMode,
} from "../lib/grid.js";
import { autoDetectionRange } from "../lib/room-geometry.js";
import { expandEntities, SETTINGS_DEFAULTS } from "../lib/settings-defaults.js";
import {
	ZONE_COLORS,
	type Zone0Config,
	type ZoneConfig,
} from "../lib/zone-defaults.js";

function overlayModeToKind(mode: OverlayMode): number | null {
	return mode === null ? null : OVERLAY_MODE_TO_KIND[mode];
}

/**
 * Host interface — the subset of the panel that this controller reads/writes.
 *
 * Using `any` for the host reference is intentional: the panel's `@state`
 * properties are private, and tests access them via `(el as any)._prop`.
 * A typed interface would force those properties to be public, which we
 * don't want yet.  The controller is a method-organizer — it groups related
 * logic while the reactive state stays on the panel.
 */
export type GridHost = ReactiveControllerHost & Record<string, any>;

/**
 * Serialize a zone slot for storage / wire. Non-custom types drop timing —
 * backend + frontend resolve it from ZONE_TYPE_DEFAULTS at push/render time.
 */
export function serializeSlot(
	z: Zone0Config | ZoneConfig | null,
	idx: number,
): Record<string, unknown> | null {
	if (z === null) return null;
	if (idx === 0) {
		const z0 = z as Zone0Config;
		const slot: Record<string, unknown> = { type: z0.type };
		if (z0.type === "custom") {
			slot.trigger = z0.trigger;
			slot.renew = z0.renew;
			slot.timeout = z0.timeout;
			slot.handoff_timeout = z0.handoff_timeout;
		}
		return slot;
	}
	const nz = z as ZoneConfig;
	const slot: Record<string, unknown> = {
		name: nz.name,
		color: nz.color,
		type: nz.type,
	};
	if (nz.type === "custom") {
		slot.trigger = nz.trigger;
		slot.renew = nz.renew;
		slot.timeout = nz.timeout;
		slot.handoff_timeout = nz.handoff_timeout;
	}
	return slot;
}

export class GridStateController implements ReactiveController {
	private host: GridHost;

	constructor(host: GridHost) {
		this.host = host;
		host.addController(this);
	}

	// --- ReactiveController lifecycle ---
	hostConnected(): void {}
	hostDisconnected(): void {}

	// =====================================================================
	// Grid / Zone mutation
	// =====================================================================

	onCellMouseDown(index: number): void {
		// Furniture tab: deselect furniture on grid click, no painting
		if (this.host._sidebarTab === "furniture") {
			this.host._selectedFurnitureId = null;
			return;
		}
		const overlayKind = overlayModeToKind(this.host._overlayMode);
		if (overlayKind !== null) {
			this.host._paintAction = determineOverlayPaintAction(
				this.host._grid[index],
				overlayKind,
			);
		} else if (
			this.host._sidebarTab === "zones" &&
			this.host._activeZone !== null
		) {
			this.host._paintAction = determinePaintAction(
				this.host._grid[index],
				this.host._activeZone,
			);
		} else {
			return;
		}
		this.host._isPainting = true;
		this.host._frozenBounds = this.host._getVisibleRoomBounds();
		this.applyPaintToCell(index);
		const onUp = () => {
			this.onCellMouseUp();
			window.removeEventListener("mouseup", onUp);
		};
		window.addEventListener("mouseup", onUp);
	}

	onCellMouseEnter(index: number): void {
		if (this.host._isPainting) {
			this.applyPaintToCell(index);
		}
	}

	onCellMouseUp(): void {
		if (this.host._isPainting) {
			// Flag to prevent the panel click handler from deselecting the zone
			this.host._justPainted = true;
			requestAnimationFrame(() => {
				this.host._justPainted = false;
			});
		}
		this.host._isPainting = false;
		this.host._frozenBounds = null;
	}

	applyPaintToCell(index: number): void {
		let newValue: number | null;
		const overlayKind = overlayModeToKind(this.host._overlayMode);
		if (overlayKind !== null) {
			newValue = applyOverlayPaintToCell(
				this.host._grid[index],
				overlayKind,
				this.host._paintAction,
			);
		} else {
			if (this.host._activeZone === null) return;
			newValue = applyPaintToCell(
				this.host._grid[index],
				this.host._activeZone,
				this.host._paintAction,
			);
		}
		if (newValue === null || newValue === this.host._grid[index]) return;

		this.host._grid = new Uint8Array(this.host._grid);
		this.host._grid[index] = newValue;
		this.host._dirty = true;
		this.host.requestUpdate();
	}

	initGridFromRoom(): void {
		this.host._grid = initGridFromRoom(
			this.host._roomWidth,
			this.host._roomDepth,
		);
	}

	// =====================================================================
	// Zone management
	// =====================================================================

	addZone(): void {
		// Slot 0 is the always-present Zone0Config; named zones live in 1..7.
		// findIndex returns the first slot that's null — for a length-8 tuple
		// that's guaranteed to be >=1, so the index is directly the slot number.
		const configs: (ZoneConfig | Zone0Config | null)[] = [
			...this.host._zoneConfigs,
		];
		const firstEmpty = configs.findIndex((z, idx) => idx > 0 && z === null);
		if (firstEmpty === -1) return; // All 7 named slots full

		// Pick first unused color
		const usedColors = new Set(
			configs
				.filter((z, idx): z is ZoneConfig => idx > 0 && z !== null)
				.map((z) => (z as ZoneConfig).color),
		);
		const color =
			ZONE_COLORS.find((c) => !usedColors.has(c)) ??
			ZONE_COLORS[(firstEmpty - 1) % ZONE_COLORS.length];
		configs[firstEmpty] = {
			name: `Zone ${firstEmpty}`,
			color,
			type: "default",
		};
		this.host._zoneConfigs = configs;
		this.host._activeZone = firstEmpty; // slot index = 1-based zone number
		this.host._dirty = true;
	}

	removeZone(slot: number): void {
		if (slot < 1 || slot > MAX_ZONES || this.host._zoneConfigs[slot] === null)
			return;
		// Clear all grid cells with this zone back to zone 0
		const cleared = clearZoneFromGrid(this.host._grid, slot);
		if (cleared) this.host._grid = cleared;
		// No renumbering — just null out the slot
		const configs: (ZoneConfig | Zone0Config | null)[] = [
			...this.host._zoneConfigs,
		];
		configs[slot] = null;
		this.host._zoneConfigs = configs;
		if (this.host._activeZone === slot) {
			this.host._activeZone = null;
		}
		this.host._dirty = true;
		this.host.requestUpdate();
	}

	// =====================================================================
	// Furniture management
	// =====================================================================

	addFurniture(sticker: FurnitureSticker): void {
		const id = `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
		const item = createFurnitureItem(
			sticker,
			this.host._roomWidth,
			this.host._roomDepth,
			id,
		);
		this.host._furniture = [...this.host._furniture, item];
		this.host._selectedFurnitureId = item.id;
		this.host._dirty = true;
	}

	addCustomFurniture(icon: string): void {
		this.addFurniture({
			type: "icon",
			icon,
			label: "furniture.custom",
			defaultWidth: 600,
			defaultHeight: 600,
			lockAspect: false,
		});
	}

	removeFurniture(id: string): void {
		this.host._furniture = removeFurnitureItem(this.host._furniture, id);
		if (this.host._selectedFurnitureId === id)
			this.host._selectedFurnitureId = null;
		this.host._dirty = true;
	}

	updateFurniture(id: string, updates: Partial<FurnitureItem>): void {
		this.host._furniture = updateFurnitureItem(
			this.host._furniture,
			id,
			updates,
		);
		this.host._dirty = true;
	}

	onFurniturePointerDown(
		e: PointerEvent,
		id: string,
		type: "move" | "resize" | "rotate",
		handle?: string,
	): void {
		e.preventDefault();
		e.stopPropagation();
		this.host._selectedFurnitureId = id;
		const item = (this.host._furniture as FurnitureItem[]).find(
			(f) => f.id === id,
		);
		if (!item) return;

		// For rotate, find the item's center on screen
		let centerX = 0,
			centerY = 0,
			startAngle = 0;
		if (type === "rotate") {
			// Pierce through epp-grid -> epp-furniture-overlay shadow DOMs
			const el = this.host.shadowRoot
				?.querySelector("epp-grid")
				?.shadowRoot?.querySelector("epp-furniture-overlay")
				?.shadowRoot?.querySelector(
					`.furniture-item[data-id="${id}"]`,
				) as HTMLElement | null;
			if (el) {
				const rect = el.getBoundingClientRect();
				centerX = rect.left + rect.width / 2;
				centerY = rect.top + rect.height / 2;
				startAngle =
					Math.atan2(e.clientY - centerY, e.clientX - centerX) *
					(180 / Math.PI);
			}
		}

		this.host._dragState = {
			type,
			id,
			startX: e.clientX,
			startY: e.clientY,
			origX: item.x,
			origY: item.y,
			origW: item.width,
			origH: item.height,
			origRot: item.rotation,
			handle,
			centerX,
			centerY,
			startAngle,
		};

		const onMove = (ev: PointerEvent) => this.onFurnitureDrag(ev);
		const onUp = () => {
			this.host._dragState = null;
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
		};
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	}

	onFurnitureDrag(e: PointerEvent): void {
		if (!this.host._dragState) return;
		const ds = this.host._dragState;

		// Get cellPx from the grid container (pierce epp-grid's shadow DOM)
		const gridEl = this.host.shadowRoot
			?.querySelector("epp-grid")
			?.shadowRoot?.querySelector(".grid") as HTMLElement | null;
		if (!gridEl) return;
		const cellPx = gridEl.firstElementChild
			? (gridEl.firstElementChild as HTMLElement).offsetWidth
			: 28;

		const dx = e.clientX - ds.startX;
		const dy = e.clientY - ds.startY;

		if (ds.type === "move") {
			const item = (this.host._furniture as FurnitureItem[]).find(
				(f) => f.id === ds.id,
			);
			// Compute visible grid bounds in room-relative mm
			const bounds = this.host._getVisibleRoomBounds();
			const roomCols = Math.ceil(this.host._roomWidth / GRID_CELL_MM);
			const startCol = Math.floor((GRID_COLS - roomCols) / 2);
			const visMinX = (bounds.minCol - startCol) * GRID_CELL_MM;
			const visMaxX = (bounds.maxCol + 1 - startCol) * GRID_CELL_MM;
			const visMinY = bounds.minRow * GRID_CELL_MM; // startRow = 0
			const visMaxY = (bounds.maxRow + 1) * GRID_CELL_MM;
			const pos = clampFurnitureMove(
				ds.origX,
				ds.origY,
				dx,
				dy,
				cellPx,
				item?.width ?? 0,
				item?.height ?? 0,
				visMinX,
				visMaxX,
				visMinY,
				visMaxY,
				ds.origRot,
			);
			this.updateFurniture(ds.id, pos);
		} else if (ds.type === "resize" && ds.handle) {
			const item = (this.host._furniture as FurnitureItem[]).find(
				(f) => f.id === ds.id,
			);
			const resized = computeFurnitureResize(
				ds.handle,
				dx,
				dy,
				cellPx,
				ds.origX,
				ds.origY,
				ds.origW,
				ds.origH,
				item?.lockAspect ?? false,
				ds.origRot,
			);
			this.updateFurniture(ds.id, resized);
		} else if (ds.type === "rotate") {
			const currentAngle =
				Math.atan2(
					e.clientY - (ds.centerY ?? 0),
					e.clientX - (ds.centerX ?? 0),
				) *
				(180 / Math.PI);
			this.updateFurniture(ds.id, {
				rotation: computeFurnitureRotation(
					ds.origRot,
					ds.startAngle ?? 0,
					currentAngle,
				),
			});
		}
	}

	// =====================================================================
	// Saved configurations (backend WS API)
	// =====================================================================

	configurations: {
		name: string;
		grid: number[];
		// Length-8 zone slots: slot 0 = Zone0Config (room boundary),
		// slots 1-7 = named ZoneConfig | null.
		zones: (Zone0Config | ZoneConfig | null)[];
		roomWidth: number;
		roomDepth: number;
		furniture?: FurnitureItem[];
		settings?: { [key: string]: any };
	}[] = [];

	async fetchConfigurations(): Promise<void> {
		try {
			const resp = await (this.host as any).hass.callWS({
				type: "eppgrid/list_configurations",
			});
			const dict = resp.configurations || {};
			this.configurations = Object.entries(dict).map(
				([name, data]: [string, any]) => ({
					...data,
					name,
				}),
			);
		} catch {
			this.configurations = [];
		}
	}

	async saveConfiguration(): Promise<void> {
		const name = (this.host._configurationName as string).trim();
		if (!name) return;
		const zones = (
			this.host._zoneConfigs as (ZoneConfig | Zone0Config | null)[]
		).map((z, i) => serializeSlot(z, i));
		const configuration = {
			grid: Array.from(this.host._grid as Uint8Array),
			zones,
			roomWidth: this.host._roomWidth as number,
			roomDepth: this.host._roomDepth as number,
			furniture: (this.host._furniture as FurnitureItem[]).map((f) => ({
				...f,
			})),
			settings: (this.host as any)._buildSparseSettings(),
		};
		await (this.host as any).hass.callWS({
			type: "eppgrid/save_configuration",
			name,
			configuration,
		});
		this.host._showConfigurationBackup = false;
		this.host._configurationName = "";
		await this.fetchConfigurations();
	}

	async loadConfiguration(name: string): Promise<void> {
		const cfg = this.configurations.find((t) => t.name === name);
		if (!cfg) return;
		const zones = cfg.zones || [];
		// Length-8 with a populated, well-shaped zone 0 and correctly-shaped
		// named slots is required (per no-BWC policy). Old- or corrupt-format
		// configurations throw so the user re-saves them. Leave the restore dialog
		// open so the failure is visible and the user can try another configuration.
		const isZone0Shape = (s: any): boolean =>
			s != null && typeof s === "object" && typeof s.type === "string";
		const isNamedZoneShape = (s: any): boolean =>
			s === null ||
			(s != null &&
				typeof s === "object" &&
				typeof s.name === "string" &&
				typeof s.color === "string" &&
				typeof s.type === "string");
		const oldFormatError = new Error(
			`Configuration "${name}" is in an old format — please re-save it`,
		);
		if (zones.length !== NUM_ZONE_SLOTS) {
			throw oldFormatError;
		}
		if (!isZone0Shape(zones[0])) {
			throw oldFormatError;
		}
		for (let i = 1; i < NUM_ZONE_SLOTS; i++) {
			if (!isNamedZoneShape(zones[i])) {
				throw oldFormatError;
			}
		}

		// Apply layout
		this.host._grid = new Uint8Array(cfg.grid);
		this.host._zoneConfigs = Array.from(
			{ length: NUM_ZONE_SLOTS },
			(_, i) => zones[i] ?? null,
		);
		this.host._roomWidth = cfg.roomWidth;
		this.host._roomDepth = cfg.roomDepth;
		this.host._furniture = (cfg.furniture || []).map((f: any) => ({
			...f,
		}));

		// Apply settings (skip only when missing — undefined/null means "no settings
		// in blob, leave device as-is"). An empty object {} means "all defaults",
		// which restores every field to its canonical default value.
		const s = cfg.settings;
		const hasSettings = s != null && typeof s === "object";
		if (hasSettings) {
			const get = <K extends keyof typeof SETTINGS_DEFAULTS>(key: K) =>
				key in s ? (s as any)[key] : SETTINGS_DEFAULTS[key];
			this.host._temperatureOffset = get("temperature_offset");
			this.host._humidityOffset = get("humidity_offset");
			this.host._illuminanceOffset = get("illuminance_offset");
			this.host._motionTimeout = get("motion_timeout");
			this.host._targetAutoDistance = get("target_auto_distance");
			this.host._targetMaxDistance = get("target_max_distance");
			this.host._staticAutoDistance = get("static_auto_distance");
			this.host._staticMinDistance = get("static_min_distance");
			this.host._staticMaxDistance = get("static_max_distance");
			this.host._staticTriggerThreshold = get("static_trigger_threshold");
			this.host._staticRenewThreshold = get("static_renew_threshold");
			this.host._staticTimeout = get("static_timeout");
			this.host._staticOnDelay = get("static_on_delay");
			this.host._ledMode = get("led_mode");
			this.host._ledBrightness = get("led_brightness");
			this.host._ledPresenceColor = get("led_presence_color");
			this.host._relayTriggerMode = get("relay_trigger_mode");
			this.host._relayContactMode = get("relay_contact_mode");
			this.host._targetUpdateRateMs = get("target_update_rate_ms");
			this.host._zoneUpdateRateMs = get("zone_update_rate_ms");
			this.host._entitiesConfig = expandEntities(
				"entities" in s ? (s as Record<string, any>).entities : undefined,
			);
			this.host._logLevels = get("log_levels");
		}

		this.host._showConfigurationRestore = false;
		// Mark dirty before auto-apply: if applyLayout throws (e.g. websocket
		// failure), the UI state has changed but the backend hasn't, so the
		// user needs an Apply button to retry. On success, applyLayout clears
		// _dirty = false itself.
		this.host._dirty = true;

		// Push settings BEFORE applyLayout. If auto-distance is enabled in the
		// restored settings, applyLayout will fire its own set_settings with
		// current-room auto-computed distances — and we want those values to win
		// on the device, not the (possibly stale) max_distance from the saved
		// blob. Reversing the order would clobber applyLayout's auto-correction.
		// Use _buildSettingsPayload() (not ...s) so sparse blobs get all fields
		// filled in from panel state (which was just populated above with
		// defaults+blob values), satisfying the WS schema.
		if (hasSettings) {
			await (this.host as any).hass.callWS({
				type: "eppgrid/set_settings",
				mac: this.host._selectedMac,
				...(this.host as any)._buildSettingsPayload(),
			});
		}

		await this.applyLayout();
	}

	async deleteConfiguration(name: string): Promise<void> {
		await (this.host as any).hass.callWS({
			type: "eppgrid/delete_configuration",
			name,
		});
		await this.fetchConfigurations();
		this.host.requestUpdate();
	}

	// =====================================================================
	// Save operations
	// =====================================================================

	async applyLayout(): Promise<void> {
		// Remove zones with zero painted cells
		const zoneCellCounts = new Map<number, number>();
		for (let i = 0; i < this.host._grid.length; i++) {
			if (cellIsInside(this.host._grid[i])) {
				const zid = cellZone(this.host._grid[i]);
				if (zid > 0) {
					zoneCellCounts.set(zid, (zoneCellCounts.get(zid) ?? 0) + 1);
				}
			}
		}
		const prunedSlots = this.host._zoneConfigs.map(
			(z: ZoneConfig | Zone0Config | null, idx: number) => {
				// Slot 0 is the Zone0Config (room boundary) and is always kept.
				if (idx === 0) return z;
				if (z !== null && (zoneCellCounts.get(idx) ?? 0) === 0) return null;
				return z;
			},
		);
		this.host._zoneConfigs = prunedSlots;

		// Filter furniture completely outside the room (use physical room
		// bounds, not FOV-aware bounds, so furniture in out-of-FOV areas
		// isn't silently dropped on save)
		const bounds = getRoomBounds(this.host._grid);
		let filteredFurniture = this.host._furniture as FurnitureItem[];
		if (bounds.minCol <= bounds.maxCol && bounds.minRow <= bounds.maxRow) {
			const roomCols = Math.ceil(this.host._roomWidth / GRID_CELL_MM);
			const startCol = Math.floor((GRID_COLS - roomCols) / 2);
			const visMinX = (bounds.minCol - startCol) * GRID_CELL_MM;
			const visMaxX = (bounds.maxCol + 1 - startCol) * GRID_CELL_MM;
			const visMinY = bounds.minRow * GRID_CELL_MM;
			const visMaxY = (bounds.maxRow + 1) * GRID_CELL_MM;
			filteredFurniture = filteredFurniture.filter(
				(f) => !isFurnitureOutsideGrid(f, visMinX, visMaxX, visMinY, visMaxY),
			);
		}

		this.host._saving = true;
		try {
			await this.host.hass.callWS({
				type: "eppgrid/set_room_layout",
				mac: this.host._selectedMac,
				grid_bytes: Array.from(this.host._grid),
				zone_slots: (
					this.host._zoneConfigs as (ZoneConfig | Zone0Config | null)[]
				).map((z, idx) => serializeSlot(z, idx)),
				furniture: filteredFurniture.map((f) => ({
					type: f.type,
					icon: f.icon,
					label: f.label,
					x: f.x,
					y: f.y,
					width: f.width,
					height: f.height,
					rotation: f.rotation,
					lockAspect: f.lockAspect,
				})),
			});
			// Commit filtered furniture to panel state after successful save
			this.host._furniture = filteredFurniture;
			// Save settings after layout — only needed when auto distances
			// may have changed; manual distances don't change with layout.
			if (this.host._targetAutoDistance || this.host._staticAutoDistance) {
				const autoRange = autoDetectionRange(
					this.host._roomWidth,
					this.host._roomDepth,
					this.host._perspective,
					this.host._grid,
				);
				const targetMaxDist = this.host._targetAutoDistance
					? autoRange > 0
						? Math.min(autoRange, 6)
						: 6
					: this.host._targetMaxDistance;
				const staticMinDist = this.host._staticAutoDistance
					? 0.3
					: this.host._staticMinDistance;
				const staticMaxDist = this.host._staticAutoDistance
					? autoRange > 0
						? Math.min(autoRange, 16)
						: 16
					: this.host._staticMaxDistance;

				await this.host.hass.callWS({
					type: "eppgrid/set_settings",
					mac: this.host._selectedMac,
					temperature_offset: this.host._temperatureOffset,
					humidity_offset: this.host._humidityOffset,
					illuminance_offset: this.host._illuminanceOffset,
					motion_timeout: this.host._motionTimeout,
					target_auto_distance: this.host._targetAutoDistance,
					target_max_distance: targetMaxDist,
					static_auto_distance: this.host._staticAutoDistance,
					static_min_distance: staticMinDist,
					static_max_distance: staticMaxDist,
					static_trigger_threshold: this.host._staticTriggerThreshold,
					static_renew_threshold: this.host._staticRenewThreshold,
					static_timeout: this.host._staticTimeout,
					static_on_delay: this.host._staticOnDelay,
					led_mode: this.host._ledMode,
					led_brightness: this.host._ledBrightness,
					led_presence_color: this.host._ledPresenceColor,
					relay_trigger_mode: this.host._relayTriggerMode,
					relay_contact_mode: this.host._relayContactMode,
					entities: this.host._entitiesConfig || {},
				});
			}
			this.host._dirty = false;
			this.host._selectedFurnitureId = null;
			this.host._overlayMode = null;
			this.host._view = "live";
		} finally {
			this.host._saving = false;
		}
	}

	async saveSettings(payload: Record<string, any>): Promise<void> {
		this.host._saving = true;
		try {
			await this.host.hass.callWS({
				type: "eppgrid/set_settings",
				mac: this.host._selectedMac,
				...payload,
			});
			// Update panel state with saved values so settings page shows
			// correct state if reopened before a full config reload
			if (payload.entities) {
				this.host._entitiesConfig = payload.entities;
			}
			this.host._temperatureOffset =
				payload.temperature_offset ?? this.host._temperatureOffset;
			this.host._humidityOffset =
				payload.humidity_offset ?? this.host._humidityOffset;
			this.host._illuminanceOffset =
				payload.illuminance_offset ?? this.host._illuminanceOffset;
			this.host._motionTimeout =
				payload.motion_timeout ?? this.host._motionTimeout;
			this.host._staticTimeout =
				payload.static_timeout ?? this.host._staticTimeout;
			this.host._staticTriggerThreshold =
				payload.static_trigger_threshold ?? this.host._staticTriggerThreshold;
			this.host._staticRenewThreshold =
				payload.static_renew_threshold ?? this.host._staticRenewThreshold;
			this.host._staticOnDelay =
				payload.static_on_delay ?? this.host._staticOnDelay;
			this.host._logLevels = payload.log_levels ?? this.host._logLevels;
			this.host._targetAutoDistance =
				payload.target_auto_distance ?? this.host._targetAutoDistance;
			this.host._targetMaxDistance =
				payload.target_max_distance ?? this.host._targetMaxDistance;
			this.host._staticAutoDistance =
				payload.static_auto_distance ?? this.host._staticAutoDistance;
			this.host._staticMinDistance =
				payload.static_min_distance ?? this.host._staticMinDistance;
			this.host._staticMaxDistance =
				payload.static_max_distance ?? this.host._staticMaxDistance;
			this.host._ledMode = payload.led_mode ?? this.host._ledMode;
			this.host._ledBrightness =
				payload.led_brightness ?? this.host._ledBrightness;
			this.host._ledPresenceColor =
				payload.led_presence_color ?? this.host._ledPresenceColor;
			this.host._relayTriggerMode =
				payload.relay_trigger_mode ?? this.host._relayTriggerMode;
			this.host._relayContactMode =
				payload.relay_contact_mode ?? this.host._relayContactMode;
			this.host._targetUpdateRateMs =
				payload.target_update_rate_ms ?? this.host._targetUpdateRateMs;
			this.host._zoneUpdateRateMs =
				payload.zone_update_rate_ms ?? this.host._zoneUpdateRateMs;
			this.host._dirty = false;
			this.host._view = "live";
		} catch (e) {
			console.error("Failed to save settings:", e);
			// Stay on settings page, keep dirty
		} finally {
			this.host._saving = false;
		}
	}
}
