import { safeUnsub } from "../lib/safe-unsub.js";
import type {
	DeviceGroup,
	DeviceGroupSource,
	DeviceGroupZoneGroup,
	DeviceGroupZoneMember,
} from "../types.js";

/**
 * Minimal slice of the HA Connection API the controller needs. Matches
 * what the rest of the panel uses (see device-controller.ts).
 */
export interface WsConnection {
	// NOTE: must be sendMessagePromise (resolves with the result / rejects on
	// error), NOT connection.sendMessage which is fire-and-forget and returns
	// void — awaiting that yields undefined and swallows backend errors.
	sendMessagePromise<T>(msg: object): Promise<T>;
	subscribeMessage<T>(
		callback: (msg: T) => void,
		msg: object,
	): Promise<() => void>;
}

interface SubscribeEvent {
	device_groups: DeviceGroup[];
	/** Source state (zones + presence) for every managed device, so the editor
	 * can show a device's zones as soon as it is selected. */
	candidate_sources?: DeviceGroupSource[];
}

interface CreateUpdateResult {
	device_group: DeviceGroup;
}

export class DeviceGroupsController {
	private _conn: WsConnection;
	private _unsub: (() => void) | null = null;
	private _listeners: Array<(groups: DeviceGroup[]) => void> = [];
	private _cache: DeviceGroup[] = [];
	private _candidateSources: DeviceGroupSource[] = [];

	constructor(connection: WsConnection) {
		this._conn = connection;
	}

	get groups(): DeviceGroup[] {
		return this._cache;
	}

	/** Every managed device as a candidate source (with its zones), refreshed on
	 * each subscription event. */
	get candidateSources(): DeviceGroupSource[] {
		return this._candidateSources;
	}

	onChange(callback: (groups: DeviceGroup[]) => void): () => void {
		this._listeners.push(callback);
		return () => {
			this._listeners = this._listeners.filter((l) => l !== callback);
		};
	}

	async subscribe(): Promise<void> {
		if (this._unsub) return;
		this._unsub = await this._conn.subscribeMessage<SubscribeEvent>(
			(event) => {
				this._cache = event.device_groups;
				this._candidateSources = event.candidate_sources ?? [];
				for (const cb of this._listeners) cb(this._cache);
			},
			{ type: "eppgrid/subscribe_device_groups" },
		);
	}

	unsubscribe(): void {
		safeUnsub(this._unsub);
		this._unsub = null;
	}

	async create(args: {
		name: string;
		sources: string[];
		area_id: string | null;
		zone_groups: DeviceGroupZoneGroup[];
		excluded_presence: string[];
		excluded_zones: DeviceGroupZoneMember[];
		excluded_zone_groups: string[];
	}): Promise<DeviceGroup> {
		const result = await this._conn.sendMessagePromise<CreateUpdateResult>({
			type: "eppgrid/create_device_group",
			name: args.name,
			sources: args.sources,
			area_id: args.area_id,
			zone_groups: args.zone_groups,
			excluded_presence: args.excluded_presence,
			excluded_zones: args.excluded_zones,
			excluded_zone_groups: args.excluded_zone_groups,
		});
		return result.device_group;
	}

	async update(args: {
		id: string;
		name: string;
		sources: string[];
		area_id: string | null;
		zone_groups: DeviceGroupZoneGroup[];
		excluded_presence: string[];
		excluded_zones: DeviceGroupZoneMember[];
		excluded_zone_groups: string[];
	}): Promise<DeviceGroup> {
		// NOTE: HA WS framework reserves top-level `id` for message envelope,
		// so the backend schema uses `group_id`. The controller's API takes
		// `id` (natural for callers) and translates to `group_id` on the wire.
		const result = await this._conn.sendMessagePromise<CreateUpdateResult>({
			type: "eppgrid/update_device_group",
			group_id: args.id,
			name: args.name,
			sources: args.sources,
			area_id: args.area_id,
			zone_groups: args.zone_groups,
			excluded_presence: args.excluded_presence,
			excluded_zones: args.excluded_zones,
			excluded_zone_groups: args.excluded_zone_groups,
		});
		return result.device_group;
	}

	async delete(id: string): Promise<void> {
		await this._conn.sendMessagePromise({
			type: "eppgrid/delete_device_group",
			group_id: id,
		});
	}
}
