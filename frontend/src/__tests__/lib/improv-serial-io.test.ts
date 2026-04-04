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

		const result = await readImprovResponse(reader, 1000);

		expect(result.packets.length).toBe(1);
		expect(result.packets[0].type).toBe(TYPE_RPC_RESULT);
		expect(Array.from(result.packets[0].data)).toEqual([0x01, 0x02, 0x03]);
	});

	it("accumulates data across multiple chunks", async () => {
		const responsePacket = buildPacket(TYPE_RPC_RESULT, [0xaa]);
		// Split the packet into two chunks
		const mid = Math.floor(responsePacket.length / 2);
		const chunk1 = responsePacket.slice(0, mid);
		const chunk2 = responsePacket.slice(mid);
		const reader = mockReader([chunk1, chunk2]);

		const result = await readImprovResponse(reader, 1000);

		expect(result.packets.length).toBe(1);
		expect(result.packets[0].type).toBe(TYPE_RPC_RESULT);
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

		const result = await readImprovResponse(reader, 1000);

		expect(result.packets.length).toBe(1);
		expect(result.packets[0].type).toBe(TYPE_RPC_RESULT);
	});

	it("preserves leftover buffer data for split packets", async () => {
		const pkt1 = buildPacket(TYPE_RPC_RESULT, [0x01]);
		const pkt2 = buildPacket(TYPE_RPC_RESULT, [0x02]);
		// Split: pkt1 complete + first byte of pkt2 in chunk1, rest of pkt2 in chunk2
		const chunk1 = new Uint8Array(pkt1.length + 1);
		chunk1.set(pkt1, 0);
		chunk1[pkt1.length] = pkt2[0]; // "I" of second IMPROV header
		const chunk2 = pkt2.slice(1);

		const reader = mockReader([chunk1, chunk2]);

		// First call gets pkt1, leftover buffer has the "I"
		const result1 = await readImprovResponse(reader, 1000);
		expect(result1.packets.length).toBe(1);
		expect(result1.packets[0].data).toEqual(new Uint8Array([0x01]));
		expect(result1.buffer.length).toBe(1); // leftover "I" byte

		// Second call with leftover buffer finds pkt2
		const result2 = await readImprovResponse(reader, 1000, result1.buffer);
		expect(result2.packets.length).toBe(1);
		expect(result2.packets[0].data).toEqual(new Uint8Array([0x02]));
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
