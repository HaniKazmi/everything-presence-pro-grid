import { describe, expect, it } from "vitest";
import {
	buildGetInfoCommand,
	buildGetStateCommand,
	buildImprovPacket,
	buildScanCommand,
	buildWifiCommand,
	CMD_GET_CURRENT_STATE,
	CMD_GET_DEVICE_INFO,
	CMD_WIFI_SCAN,
	CMD_WIFI_SETTINGS,
	IMPROV_HEADER,
	parseImprovPackets,
	parseScanResults,
	TYPE_RPC_COMMAND,
	TYPE_RPC_RESULT,
} from "../../lib/improv-serial.js";

describe("IMPROV_HEADER", () => {
	it("equals the ASCII bytes for IMPROV", () => {
		expect(IMPROV_HEADER).toEqual([0x49, 0x4d, 0x50, 0x52, 0x4f, 0x56]);
	});
});

describe("buildImprovPacket", () => {
	it("creates a valid packet with correct structure and checksum", () => {
		// Simple test: type=0x03, data=[0x04, 0x00]
		const packet = buildImprovPacket(TYPE_RPC_COMMAND, [CMD_WIFI_SCAN, 0x00]);
		// Header (6) + version (1) + type (1) + length (1) + data (2) + checksum (1) + newline (1) = 13
		expect(packet.length).toBe(13);
		// Header
		expect(Array.from(packet.slice(0, 6))).toEqual(IMPROV_HEADER);
		// Version
		expect(packet[6]).toBe(0x01);
		// Type
		expect(packet[7]).toBe(TYPE_RPC_COMMAND);
		// Length
		expect(packet[8]).toBe(2);
		// Data
		expect(packet[9]).toBe(CMD_WIFI_SCAN);
		expect(packet[10]).toBe(0x00);
		// Checksum = sum of all preceding bytes mod 256
		const sum =
			Array.from(packet.slice(0, 11)).reduce((a, b) => a + b, 0) % 256;
		expect(packet[11]).toBe(sum);
		// Trailing newline
		expect(packet[12]).toBe(0x0a);
	});

	it("computes checksum as sum of all preceding bytes mod 256", () => {
		const data = [0x01, 0x02, 0x03];
		const packet = buildImprovPacket(0x05, data);
		// Checksum is second-to-last byte (last byte is newline)
		const checksumIdx = packet.length - 2;
		const allBytes = Array.from(packet.slice(0, checksumIdx));
		const expectedChecksum = allBytes.reduce((a, b) => a + b, 0) % 256;
		expect(packet[checksumIdx]).toBe(expectedChecksum);
		expect(packet[packet.length - 1]).toBe(0x0a);
	});
});

describe("buildScanCommand", () => {
	it("creates a scan RPC command packet", () => {
		const packet = buildScanCommand();
		// Should be buildImprovPacket(TYPE_RPC_COMMAND, [CMD_WIFI_SCAN, 0x00])
		const expected = buildImprovPacket(TYPE_RPC_COMMAND, [CMD_WIFI_SCAN, 0x00]);
		expect(packet).toEqual(expected);
	});

	it("has type TYPE_RPC_COMMAND and first data byte CMD_WIFI_SCAN", () => {
		const packet = buildScanCommand();
		expect(packet[7]).toBe(TYPE_RPC_COMMAND);
		expect(packet[9]).toBe(CMD_WIFI_SCAN);
	});
});

describe("buildGetStateCommand", () => {
	it("creates a GET_CURRENT_STATE RPC command packet", () => {
		const packet = buildGetStateCommand();
		const expected = buildImprovPacket(TYPE_RPC_COMMAND, [
			CMD_GET_CURRENT_STATE,
			0x00,
		]);
		expect(packet).toEqual(expected);
	});

	it("has type TYPE_RPC_COMMAND and first data byte CMD_GET_CURRENT_STATE", () => {
		const packet = buildGetStateCommand();
		expect(packet[7]).toBe(TYPE_RPC_COMMAND);
		expect(packet[9]).toBe(CMD_GET_CURRENT_STATE);
	});
});

describe("buildGetInfoCommand", () => {
	it("creates a GET_DEVICE_INFO RPC command packet", () => {
		const packet = buildGetInfoCommand();
		const expected = buildImprovPacket(TYPE_RPC_COMMAND, [
			CMD_GET_DEVICE_INFO,
			0x00,
		]);
		expect(packet).toEqual(expected);
	});

	it("has type TYPE_RPC_COMMAND and first data byte CMD_GET_DEVICE_INFO", () => {
		const packet = buildGetInfoCommand();
		expect(packet[7]).toBe(TYPE_RPC_COMMAND);
		expect(packet[9]).toBe(CMD_GET_DEVICE_INFO);
	});
});

describe("buildWifiCommand", () => {
	it("encodes SSID and password in the correct format", () => {
		const ssid = "MyWifi";
		const password = "secret";
		const packet = buildWifiCommand(ssid, password);

		// Data layout: [CMD_WIFI_SETTINGS, total_len, ssid_len, ...ssid_bytes, pass_len, ...pass_bytes]
		const ssidBytes = new TextEncoder().encode(ssid);
		const passBytes = new TextEncoder().encode(password);
		const totalLen = 1 + ssidBytes.length + 1 + passBytes.length; // ssid_len + ssid + pass_len + pass

		// Packet structure: header(6) + version(1) + type(1) + length(1) + data(N) + checksum(1) + newline(1)
		// data = [CMD_WIFI_SETTINGS, total_len, ssid_len, ...ssid, pass_len, ...pass]
		const dataLength = 2 + 1 + ssidBytes.length + 1 + passBytes.length;
		expect(packet.length).toBe(6 + 1 + 1 + 1 + dataLength + 1 + 1);

		// Type should be TYPE_RPC_COMMAND
		expect(packet[7]).toBe(TYPE_RPC_COMMAND);

		// First data byte is CMD_WIFI_SETTINGS
		expect(packet[9]).toBe(CMD_WIFI_SETTINGS);

		// Second data byte is total_len
		expect(packet[10]).toBe(totalLen);

		// Third data byte is ssid_len
		expect(packet[11]).toBe(ssidBytes.length);

		// SSID bytes
		for (let i = 0; i < ssidBytes.length; i++) {
			expect(packet[12 + i]).toBe(ssidBytes[i]);
		}

		// pass_len
		expect(packet[12 + ssidBytes.length]).toBe(passBytes.length);

		// password bytes
		for (let i = 0; i < passBytes.length; i++) {
			expect(packet[13 + ssidBytes.length + i]).toBe(passBytes[i]);
		}
	});

	it("handles empty password", () => {
		const packet = buildWifiCommand("OpenNet", "");
		const ssidBytes = new TextEncoder().encode("OpenNet");
		// data = [CMD_WIFI_SETTINGS, total_len, ssid_len, ...ssid, pass_len(0)]
		const totalLen = 1 + ssidBytes.length + 1 + 0;
		expect(packet[10]).toBe(totalLen);
		expect(packet[11]).toBe(ssidBytes.length);
		// pass_len = 0
		expect(packet[12 + ssidBytes.length]).toBe(0);
	});
});

describe("parseImprovPackets", () => {
	it("extracts valid packets from mixed data (log text + Improv packets)", () => {
		// Build a real scan command packet
		const realPacket = buildScanCommand();

		// Mix it with some log text bytes before and after
		const prefix = new TextEncoder().encode("LOG: some debug text\r\n");
		const suffix = new TextEncoder().encode("another log line\r\n");

		const mixed = new Uint8Array(
			prefix.length + realPacket.length + suffix.length,
		);
		mixed.set(prefix, 0);
		mixed.set(realPacket, prefix.length);
		mixed.set(suffix, prefix.length + realPacket.length);

		const { packets } = parseImprovPackets(mixed);
		expect(packets.length).toBe(1);
		expect(packets[0].type).toBe(TYPE_RPC_COMMAND);
		expect(Array.from(packets[0].data)).toEqual([CMD_WIFI_SCAN, 0x00]);
	});

	it("returns empty array when no packets present", () => {
		const data = new TextEncoder().encode(
			"just some log text with no improv packets",
		);
		const { packets } = parseImprovPackets(data);
		expect(packets.length).toBe(0);
	});

	it("extracts multiple packets from a stream", () => {
		const packet1 = buildScanCommand();
		const packet2 = buildImprovPacket(TYPE_RPC_RESULT, [0x01, 0x02]);

		const combined = new Uint8Array(packet1.length + packet2.length);
		combined.set(packet1, 0);
		combined.set(packet2, packet1.length);

		const { packets } = parseImprovPackets(combined);
		expect(packets.length).toBe(2);
		expect(packets[0].type).toBe(TYPE_RPC_COMMAND);
		expect(packets[1].type).toBe(TYPE_RPC_RESULT);
	});

	it("rejects packets with invalid checksum", () => {
		const packet = buildScanCommand();
		// Corrupt the checksum (second-to-last byte, before newline)
		const corrupted = new Uint8Array(packet);
		const checksumIdx = corrupted.length - 2;
		corrupted[checksumIdx] = (corrupted[checksumIdx] + 1) % 256;

		const { packets } = parseImprovPackets(corrupted);
		expect(packets.length).toBe(0);
	});

	it("returns empty array when header is found but not enough bytes for packet header", () => {
		// Construct a truncated Improv stream: header(6) only, no version/type/length
		const header = new Uint8Array(IMPROV_HEADER);
		// Only provide the 6 header bytes — not enough to form a complete packet (needs 3 more)
		const { packets } = parseImprovPackets(header);
		expect(packets.length).toBe(0);
	});

	it("returns empty array when packet data is incomplete (length > available bytes)", () => {
		// Build a real packet then truncate the data section
		const real = buildScanCommand();
		// Drop the last 2 bytes so the data + checksum bytes are missing
		const truncated = real.slice(0, real.length - 2);
		const { packets } = parseImprovPackets(truncated);
		expect(packets.length).toBe(0);
	});

	it("reports consumed bytes so callers can preserve leftover data", () => {
		const pkt = buildImprovPacket(TYPE_RPC_RESULT, [0x01]);
		// Add a partial second packet header at the end
		const partial = new Uint8Array([0x49, 0x4d]); // "IM" — start of IMPROV
		const combined = new Uint8Array(pkt.length + partial.length);
		combined.set(pkt, 0);
		combined.set(partial, pkt.length);

		const result = parseImprovPackets(combined);
		expect(result.packets.length).toBe(1);
		expect(result.consumed).toBe(pkt.length);
	});

	it("consumed covers all parsed packets plus any trailing non-header bytes", () => {
		const pkt1 = buildImprovPacket(TYPE_RPC_RESULT, [0x01]);
		const pkt2 = buildImprovPacket(TYPE_RPC_RESULT, [0x02]);
		const combined = new Uint8Array(pkt1.length + pkt2.length);
		combined.set(pkt1, 0);
		combined.set(pkt2, pkt1.length);

		const result = parseImprovPackets(combined);
		expect(result.packets.length).toBe(2);
		expect(result.consumed).toBe(pkt1.length + pkt2.length);
	});
});

describe("parseScanResults", () => {
	it("parses network info with auth=YES", () => {
		// Format: [ssid_len, ...ssid, rssi_len, ...rssi_str, auth_len, ...auth_str]
		const encoder = new TextEncoder();
		const ssid = "MyNetwork";
		const rssi = "-65";
		const auth = "YES";

		const ssidBytes = encoder.encode(ssid);
		const rssiBytes = encoder.encode(rssi);
		const authBytes = encoder.encode(auth);

		const data = new Uint8Array(
			1 + ssidBytes.length + 1 + rssiBytes.length + 1 + authBytes.length,
		);
		let offset = 0;
		data[offset++] = ssidBytes.length;
		data.set(ssidBytes, offset);
		offset += ssidBytes.length;
		data[offset++] = rssiBytes.length;
		data.set(rssiBytes, offset);
		offset += rssiBytes.length;
		data[offset++] = authBytes.length;
		data.set(authBytes, offset);

		const result = parseScanResults(data);
		expect(result).not.toBeNull();
		expect(result?.ssid).toBe("MyNetwork");
		expect(result?.rssi).toBe(-65);
		expect(result?.authRequired).toBe(true);
	});

	it("returns null for empty data (termination packet)", () => {
		const result = parseScanResults(new Uint8Array(0));
		expect(result).toBeNull();
	});

	it("returns null when SSID is truncated", () => {
		// Length byte says 10 but only 3 bytes follow
		const data = new Uint8Array([10, 0x41, 0x42, 0x43]);
		expect(parseScanResults(data)).toBeNull();
	});

	it("returns null when RSSI field is missing", () => {
		// Valid SSID but nothing after
		const encoder = new TextEncoder();
		const ssid = encoder.encode("Net");
		const data = new Uint8Array(1 + ssid.length);
		data[0] = ssid.length;
		data.set(ssid, 1);
		expect(parseScanResults(data)).toBeNull();
	});

	it("returns null when auth field is missing", () => {
		const encoder = new TextEncoder();
		const ssid = encoder.encode("Net");
		const rssi = encoder.encode("-50");
		const data = new Uint8Array(1 + ssid.length + 1 + rssi.length);
		let offset = 0;
		data[offset++] = ssid.length;
		data.set(ssid, offset);
		offset += ssid.length;
		data[offset++] = rssi.length;
		data.set(rssi, offset);
		expect(parseScanResults(data)).toBeNull();
	});

	it("returns null when RSSI is not a number", () => {
		const encoder = new TextEncoder();
		const ssid = encoder.encode("Net");
		const rssi = encoder.encode("abc");
		const auth = encoder.encode("YES");
		const data = new Uint8Array(
			1 + ssid.length + 1 + rssi.length + 1 + auth.length,
		);
		let offset = 0;
		data[offset++] = ssid.length;
		data.set(ssid, offset);
		offset += ssid.length;
		data[offset++] = rssi.length;
		data.set(rssi, offset);
		offset += rssi.length;
		data[offset++] = auth.length;
		data.set(auth, offset);
		expect(parseScanResults(data)).toBeNull();
	});

	it("parses open network with auth=NO", () => {
		const encoder = new TextEncoder();
		const ssid = "OpenNetwork";
		const rssi = "-80";
		const auth = "NO";

		const ssidBytes = encoder.encode(ssid);
		const rssiBytes = encoder.encode(rssi);
		const authBytes = encoder.encode(auth);

		const data = new Uint8Array(
			1 + ssidBytes.length + 1 + rssiBytes.length + 1 + authBytes.length,
		);
		let offset = 0;
		data[offset++] = ssidBytes.length;
		data.set(ssidBytes, offset);
		offset += ssidBytes.length;
		data[offset++] = rssiBytes.length;
		data.set(rssiBytes, offset);
		offset += rssiBytes.length;
		data[offset++] = authBytes.length;
		data.set(authBytes, offset);

		const result = parseScanResults(data);
		expect(result).not.toBeNull();
		expect(result?.ssid).toBe("OpenNetwork");
		expect(result?.rssi).toBe(-80);
		expect(result?.authRequired).toBe(false);
	});
});
