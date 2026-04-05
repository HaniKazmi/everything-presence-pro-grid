export type TargetStatus = "active" | "pending" | "inactive";

export interface Target {
	x: number;
	y: number;
	speed: number;
	status: TargetStatus;
	signal: number;
}

export interface RawTarget {
	raw_x: number | null;
	raw_y: number | null;
}

export interface DeviceInfo {
	mac: string;
	name: string;
	host: string | null;
	available: boolean;
	configured: boolean;
	config_protocol_status:
		| "compatible"
		| "firmware_behind"
		| "firmware_ahead"
		| "unavailable";
	current_connection_count: number | null;
	bluetooth_enabled?: boolean;
	co2_enabled?: boolean;
	ethernet_enabled?: boolean;
}

export interface WizardCorner {
	raw_x: number;
	raw_y: number;
	offset_side: number;
	offset_fb: number;
}

export type SetupStep = "guide" | "corners" | "preview";

export interface FlashableDevice {
	mac: string;
	name: string;
	host: string | null;
	available: boolean;
	firmware_type: "original" | "eppgrid";
	firmware_version: string;
	esphome_config_entry_id: string | null;
	update_available: boolean;
}

export type UsbFlashStep =
	| "idle"
	| "connecting"
	| "flashing"
	| "wifi_scan"
	| "wifi_provision"
	| "wifi_connecting"
	| "reading_ip"
	| "adding_device"
	| "complete"
	| "error";

export interface UsbFlashState {
	step: UsbFlashStep;
	progress?: number;
	error?: string;
	ip?: string;
	variant?: string;
	fatal?: boolean;
}
