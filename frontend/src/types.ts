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
	area: string | null;
	firmware_status:
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
	firmware_status:
		| "compatible"
		| "firmware_behind"
		| "firmware_ahead"
		| "unknown"
		| "unavailable";
}

export type HaAddResult =
	| { type: "added" }
	| { type: "already_added" }
	| { type: "needs_auth" }
	| { type: "cannot_connect" }
	| { type: "failed"; reason?: string };

export type UsbFlashStep =
	| "idle"
	| "connecting"
	| "flashing"
	| "wifi_check"
	| "wifi_scan"
	| "wifi_provision"
	| "wifi_connecting"
	| "reading_ip"
	| "wifi_configured"
	| "complete"
	| "error";

export interface UsbFlashState {
	step: UsbFlashStep;
	progress?: number;
	errorKey?: string;
	errorParams?: Record<string, string | number>;
	ip?: string;
	variant?: string;
	fatal?: boolean;
	haAdd?: HaAddResult;
	autoSkipped?: boolean;
	lastStep?: UsbFlashStep;
	haAddAttempt?: number;
	haAddMaxAttempts?: number;
}

export type OtaState = "updating" | "success" | "error";

export interface OtaDeviceState {
	state: OtaState;
	progress: number | null;
	errorKey: string | null;
	errorParams?: Record<string, string | number>;
}
