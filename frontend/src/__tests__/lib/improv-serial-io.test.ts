import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
	opts?: { delayMs?: number },
): ReadableStreamDefaultReader<Uint8Array> {
	let idx = 0;
	return {
		read: vi.fn().mockImplementation(() => {
			if (idx >= chunks.length) return new Promise(() => {});
			const chunk = chunks[idx++];
			if (opts?.delayMs) {
				return new Promise((resolve) =>
					setTimeout(
						() => resolve({ value: chunk, done: false }),
						opts.delayMs,
					),
				);
			}
			return Promise.resolve({ value: chunk, done: false });
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

	describe("timeout behaviour (fake timers)", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});
		afterEach(() => {
			vi.useRealTimers();
		});

		it("does not lose a chunk when reader.read() is in-flight during timeout", async () => {
			// Chunk resolves 150ms after the first call's 50ms budget — the
			// second call must re-await the same pending read rather than
			// issuing a fresh read() (which would swallow the chunk).
			const pkt = buildPacket(TYPE_RPC_RESULT, [0x42]);
			const reader = mockReader([pkt], { delayMs: 150 });
			const buffer: number[] = [];

			const firstCall = readImprovResponse(reader, 50, buffer);
			const firstAssertion = expect(firstCall).rejects.toThrow("timeout");
			await vi.advanceTimersByTimeAsync(50);
			await firstAssertion;

			const secondCall = readImprovResponse(reader, 500, buffer);
			await vi.advanceTimersByTimeAsync(150);
			const result = await secondCall;

			expect(result.packets.length).toBe(1);
			expect(result.packets[0].data[0]).toBe(0x42);
			expect(reader.read).toHaveBeenCalledTimes(1);
		});

		it("preserves bytes read during a timed-out call via in-place buffer mutation", async () => {
			const pkt = buildPacket(TYPE_RPC_RESULT, [0x01, 0x02, 0x03, 0x04]);
			const chunk1 = pkt.slice(0, 9); // header + version + type + length — not enough to checksum
			const chunk2 = pkt.slice(9);

			const buffer: number[] = [];
			const firstCall = readImprovResponse(mockReader([chunk1]), 50, buffer);
			const firstAssertion = expect(firstCall).rejects.toThrow("timeout");
			await vi.advanceTimersByTimeAsync(50);
			await firstAssertion;
			expect(Array.from(buffer)).toEqual(Array.from(chunk1));

			const result = await readImprovResponse(
				mockReader([chunk2]),
				1000,
				buffer,
			);
			expect(result.packets.length).toBe(1);
			expect(Array.from(result.packets[0].data)).toEqual([
				0x01, 0x02, 0x03, 0x04,
			]);
		});

		it("clears pending read and timer when the read rejects", async () => {
			// pending's rejection must not leave a stale entry in the
			// WeakMap — otherwise the next call would rethrow the same
			// stale error forever.
			const err = new Error("stream error");
			const reader = {
				read: vi
					.fn()
					.mockRejectedValueOnce(err)
					.mockResolvedValueOnce({
						value: buildPacket(TYPE_RPC_RESULT, [0x99]),
						done: false,
					}),
				cancel: vi.fn().mockResolvedValue(undefined),
				closed: Promise.resolve(undefined),
				releaseLock: vi.fn(),
			} as unknown as ReadableStreamDefaultReader<Uint8Array>;
			const buffer: number[] = [];

			await expect(readImprovResponse(reader, 500, buffer)).rejects.toThrow(
				"stream error",
			);

			const result = await readImprovResponse(reader, 500, buffer);
			expect(result.packets[0].data[0]).toBe(0x99);
			expect(reader.read).toHaveBeenCalledTimes(2);
		});
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
