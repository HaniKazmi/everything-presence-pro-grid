/**
 * Improv Serial protocol implementation for WiFi scanning and provisioning.
 * Spec: https://www.improv-wifi.com/serial/
 */

// Header bytes: ASCII "IMPROV"
export const IMPROV_HEADER = [0x49, 0x4d, 0x50, 0x52, 0x4f, 0x56];

export const TYPE_RPC_COMMAND = 0x03;
export const TYPE_RPC_RESULT = 0x04;

export const CMD_WIFI_SETTINGS = 0x01;
export const CMD_WIFI_SCAN = 0x04;

export interface WifiNetwork {
	ssid: string;
	rssi: number;
	authRequired: boolean;
}

export interface ImprovPacket {
	type: number;
	data: Uint8Array;
}

/**
 * Builds an Improv Serial packet.
 * Format: [HEADER(6)] [VERSION=0x01(1)] [TYPE(1)] [LENGTH(1)] [DATA(N)] [CHECKSUM(1)]
 * Checksum = sum of all preceding bytes mod 256.
 */
export function buildImprovPacket(type: number, data: number[]): Uint8Array {
	const totalLength = IMPROV_HEADER.length + 1 + 1 + 1 + data.length + 1;
	const packet = new Uint8Array(totalLength);

	let offset = 0;
	// Header
	for (const byte of IMPROV_HEADER) {
		packet[offset++] = byte;
	}
	// Version
	packet[offset++] = 0x01;
	// Type
	packet[offset++] = type;
	// Length
	packet[offset++] = data.length;
	// Data
	for (const byte of data) {
		packet[offset++] = byte;
	}
	// Checksum
	let checksum = 0;
	for (let i = 0; i < offset; i++) {
		checksum = (checksum + packet[i]) & 0xff;
	}
	packet[offset] = checksum;

	return packet;
}

/**
 * Builds a WiFi scan RPC command packet.
 */
export function buildScanCommand(): Uint8Array {
	return buildImprovPacket(TYPE_RPC_COMMAND, [CMD_WIFI_SCAN, 0x00]);
}

/**
 * Builds a WiFi provisioning command packet.
 * Data: [CMD_WIFI_SETTINGS, total_len, ssid_len, ...ssid_bytes, pass_len, ...pass_bytes]
 */
export function buildWifiCommand(ssid: string, password: string): Uint8Array {
	const encoder = new TextEncoder();
	const ssidBytes = encoder.encode(ssid);
	const passBytes = encoder.encode(password);

	const totalLen = 1 + ssidBytes.length + 1 + passBytes.length;
	const data: number[] = [
		CMD_WIFI_SETTINGS,
		totalLen,
		ssidBytes.length,
		...ssidBytes,
		passBytes.length,
		...passBytes,
	];

	return buildImprovPacket(TYPE_RPC_COMMAND, data);
}

/**
 * Parses a byte stream for Improv Serial packets.
 * Scans for the IMPROV header, extracts complete packets, and verifies checksums.
 * Returns all valid packets found.
 */
export function parseImprovPackets(data: Uint8Array): ImprovPacket[] {
	const packets: ImprovPacket[] = [];
	const headerLen = IMPROV_HEADER.length;

	let i = 0;
	while (i <= data.length - headerLen) {
		// Look for the IMPROV header
		let headerFound = true;
		for (let h = 0; h < headerLen; h++) {
			if (data[i + h] !== IMPROV_HEADER[h]) {
				headerFound = false;
				break;
			}
		}

		if (!headerFound) {
			i++;
			continue;
		}

		// Header found at position i
		// Packet: header(6) + version(1) + type(1) + length(1) + data(length) + checksum(1)
		const baseOffset = i + headerLen;
		// Need at least version(1) + type(1) + length(1) + checksum(1) more bytes
		if (baseOffset + 3 >= data.length) {
			// Not enough bytes for a complete packet header
			i++;
			continue;
		}

		// version = data[baseOffset]
		const type = data[baseOffset + 1];
		const length = data[baseOffset + 2];
		const packetEnd = baseOffset + 3 + length + 1; // +1 for checksum

		if (packetEnd > data.length) {
			// Incomplete packet
			i++;
			continue;
		}

		// Verify checksum
		let checksum = 0;
		for (let j = i; j < packetEnd - 1; j++) {
			checksum = (checksum + data[j]) & 0xff;
		}

		if (checksum !== data[packetEnd - 1]) {
			// Invalid checksum — skip past this header byte and keep scanning
			i++;
			continue;
		}

		// Valid packet
		const packetData = data.slice(baseOffset + 3, baseOffset + 3 + length);
		packets.push({ type, data: packetData });

		i = packetEnd;
	}

	return packets;
}

/**
 * Parses a scan result from an RPC result data payload.
 * Format: 3 length-prefixed strings: SSID, RSSI string, auth ("YES"/"NO")
 * Returns null for empty data (termination packet).
 */
export function parseScanResults(data: Uint8Array): WifiNetwork | null {
	if (data.length === 0) {
		return null;
	}

	const decoder = new TextDecoder();
	let offset = 0;

	const readString = (): string | null => {
		if (offset >= data.length) return null;
		const len = data[offset++];
		if (offset + len > data.length) return null;
		const value = decoder.decode(data.slice(offset, offset + len));
		offset += len;
		return value;
	};

	const ssid = readString();
	if (ssid === null) return null;

	const rssiStr = readString();
	if (rssiStr === null) return null;

	const auth = readString();
	if (auth === null) return null;

	const rssi = Number.parseInt(rssiStr, 10);
	if (Number.isNaN(rssi)) return null;

	return {
		ssid,
		rssi,
		authRequired: auth === "YES",
	};
}
