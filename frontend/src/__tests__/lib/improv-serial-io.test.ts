import { describe, expect, it, vi } from "vitest";
import {
	buildImprovPacket as buildPacket,
	buildScanCommand,
	drainSerial,
	readImprovResponse,
	sendImprovPacket,
	TYPE_RPC_RESULT,
} from "../../lib/improv-serial.js";

function mockWriter(): WritableStreamDefaultWriter<Uint8Array> {
	return {
		write: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
		abort: vi.fn().mockResolvedValue(undefined),
		closed: Promise.resolve(undefined),
		desiredSize: 1,
		ready: Promise.resolve(undefined),
		releaseLock: vi.fn(),
	} as unknown as WritableStreamDefaultWriter<Uint8Array>;
}

function mockReader(
	chunks: Uint8Array[],
): ReadableStreamDefaultReader<Uint8Array> {
	let idx = 0;
	return {
		read: vi.fn().mockImplementation(() => {
			if (idx < chunks.length) {
				return Promise.resolve({ value: chunks[idx++], done: false });
			}
			// Hang forever (simulates waiting for data)
			return new Promise(() => {});
		}),
		cancel: vi.fn().mockResolvedValue(undefined),
		closed: Promise.resolve(undefined),
		releaseLock: vi.fn(),
	} as unknown as ReadableStreamDefaultReader<Uint8Array>;
}

describe("sendImprovPacket", () => {
	it("writes packet bytes to the writer", async () => {
		const writer = mockWriter();
		const packet = buildScanCommand();

		await sendImprovPacket(writer, packet);

		expect(writer.write).toHaveBeenCalledWith(packet);
	});

	it("calls write exactly once", async () => {
		const writer = mockWriter();
		const packet = buildScanCommand();

		await sendImprovPacket(writer, packet);

		expect(writer.write).toHaveBeenCalledTimes(1);
	});
});

describe("readImprovResponse", () => {
	it("reads chunks and returns parsed Improv packets", async () => {
		// Build a valid RPC result packet
		const responsePacket = buildPacket(TYPE_RPC_RESULT, [0x01, 0x02, 0x03]);
		const reader = mockReader([responsePacket]);

		const packets = await readImprovResponse(reader, 1000);

		expect(packets.length).toBe(1);
		expect(packets[0].type).toBe(TYPE_RPC_RESULT);
		expect(Array.from(packets[0].data)).toEqual([0x01, 0x02, 0x03]);
	});

	it("accumulates data across multiple chunks", async () => {
		const responsePacket = buildPacket(TYPE_RPC_RESULT, [0xaa]);
		// Split the packet into two chunks
		const mid = Math.floor(responsePacket.length / 2);
		const chunk1 = responsePacket.slice(0, mid);
		const chunk2 = responsePacket.slice(mid);
		const reader = mockReader([chunk1, chunk2]);

		const packets = await readImprovResponse(reader, 1000);

		expect(packets.length).toBe(1);
		expect(packets[0].type).toBe(TYPE_RPC_RESULT);
	});

	it("rejects on timeout when no valid packets arrive", async () => {
		// Reader that never returns data
		const reader = mockReader([]);

		await expect(readImprovResponse(reader, 50)).rejects.toThrow("timeout");
	});

	it("skips non-Improv data (log text) and finds the packet", async () => {
		const logBytes = new TextEncoder().encode("LOG: booting up\r\n");
		const responsePacket = buildPacket(TYPE_RPC_RESULT, [0x42]);
		// Combine log text and packet into one chunk
		const combined = new Uint8Array(logBytes.length + responsePacket.length);
		combined.set(logBytes, 0);
		combined.set(responsePacket, logBytes.length);
		const reader = mockReader([combined]);

		const packets = await readImprovResponse(reader, 1000);

		expect(packets.length).toBe(1);
		expect(packets[0].type).toBe(TYPE_RPC_RESULT);
	});
});

describe("drainSerial", () => {
	it("reads and discards buffered data", async () => {
		const reader = mockReader([
			new Uint8Array([1, 2, 3]),
			new Uint8Array([4, 5, 6]),
		]);

		await drainSerial(reader, 50);

		expect(reader.read).toHaveBeenCalled();
	});

	it("resolves after timeout even with no data", async () => {
		const reader = mockReader([]);

		await expect(drainSerial(reader, 50)).resolves.toBeUndefined();
	});
});
