import { safeUnsub } from "../lib/safe-unsub.js";
import type { DeviceGroup, DeviceGroupZoneGroup } from "../types.js";

/**
 * Minimal slice of the HA Connection API the controller needs. Matches
 * what the rest of the panel uses (see device-controller.ts).
 */
export interface WsConnection {
	sendMessage(msg: object): Promise<unknown>;
	subscribeMessage<T>(
		callback: (msg: T) => void,
		msg: object,
	): Promise<() => void>;
}

interface SubscribeEvent {
	device_groups: DeviceGroup[];
}

interface CreateUpdateResult {
	device_group: DeviceGroup;
}

export class DeviceGroupsController {
	private _conn: WsConnection;
	private _unsub: (() => void) | null = null;
	private _listeners: Array<(groups: DeviceGroup[]) => void> = [];
	private _cache: DeviceGroup[] = [];

	constructor(connection: WsConnection) {
		this._conn = connection;
	}

	get groups(): DeviceGroup[] {
		return this._cache;
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
				for (const cb of this._listeners) cb(this._cache);
			},
			{ type: "eppgrid/subscribe_device_groups" },
		);
	}

	unsubscribe(): void {
		safeUnsub(this._unsub);
		this._unsub = null;
	}

	async create(
		name: string,
		sources: string[],
		areaId?: string | null,
	): Promise<DeviceGroup> {
		const payload: Record<string, unknown> = {
			type: "eppgrid/create_device_group",
			name,
			sources,
		};
		if (areaId !== undefined) payload.area_id = areaId;
		const result = (await this._conn.sendMessage(
			payload,
		)) as CreateUpdateResult;
		return result.device_group;
	}

	async update(args: {
		id: string;
		name: string;
		sources: string[];
		area_id: string | null;
		zone_groups: DeviceGroupZoneGroup[];
	}): Promise<DeviceGroup> {
		// NOTE: HA WS framework reserves top-level `id` for message envelope,
		// so the backend schema uses `group_id`. The controller's API takes
		// `id` (natural for callers) and translates to `group_id` on the wire.
		const result = (await this._conn.sendMessage({
			type: "eppgrid/update_device_group",
			group_id: args.id,
			name: args.name,
			sources: args.sources,
			area_id: args.area_id,
			zone_groups: args.zone_groups,
		})) as CreateUpdateResult;
		return result.device_group;
	}

	async delete(id: string): Promise<void> {
		await this._conn.sendMessage({
			type: "eppgrid/delete_device_group",
			group_id: id,
		});
	}
}
