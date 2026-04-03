import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UsbFlashState } from "../../types.js";

// Mock improv-serial before importing the service
vi.mock("../../lib/improv-serial.js", () => ({
	drainSerial: vi.fn().mockResolvedValue(undefined),
	sendImprovPacket: vi.fn().mockResolvedValue(undefined),
	readImprovResponse: vi.fn().mockResolvedValue([]),
	parseScanResults: vi.fn().mockReturnValue(null),
	buildScanCommand: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
	buildWifiCommand: vi.fn().mockReturnValue(new Uint8Array([4, 5, 6])),
	TYPE_RPC_RESULT: 0x04,
}));

// Mock esptool-js before importing the service
vi.mock("esptool-js", () => {
	const mockTransport = {
		connect: vi.fn().mockResolvedValue(undefined),
		disconnect: vi.fn().mockResolvedValue(undefined),
		device: {},
	};
	const mockLoader = {
		main: vi.fn().mockResolvedValue("ESP32"),
		writeFlash: vi.fn().mockResolvedValue(undefined),
		after: vi.fn().mockResolvedValue(undefined),
	};
	return {
		// Use function constructors so `new Transport(...)` and `new ESPLoader(...)` work
		Transport: vi.fn().mockImplementation(function () {
			return mockTransport;
		}),
		ESPLoader: vi.fn().mockImplementation(function () {
			return mockLoader;
		}),
	};
});

// Mock fetch for manifest + binary downloads
const mockManifest = {
	builds: [
		{
			chipFamily: "ESP32",
			parts: [
				{ path: "bootloader.bin", offset: 4096 },
				{ path: "partitions.bin", offset: 32768 },
				{ path: "firmware.bin", offset: 65536 },
			],
		},
	],
};

const mockBinary = new ArrayBuffer(1024);

beforeEach(() => {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockImplementation((url: string) => {
			if (url.endsWith("manifest.json")) {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve(mockManifest),
				});
			}
			// Binary file
			return Promise.resolve({
				ok: true,
				arrayBuffer: () => Promise.resolve(mockBinary),
			});
		}),
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

import { ESPLoader, Transport } from "esptool-js";
import {
	buildScanCommand,
	buildWifiCommand,
	drainSerial,
	parseScanResults,
	readImprovResponse,
	sendImprovPacket,
	TYPE_RPC_RESULT,
} from "../../lib/improv-serial.js";
import {
	detectIpAddress,
	flashFirmware,
	runWifiProvision,
	runWifiScan,
} from "../../lib/usb-flash-service.js";

describe("flashFirmware", () => {
	function mockPort(): SerialPort {
		return {
			open: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
			readable: { getReader: vi.fn() },
			writable: { getWriter: vi.fn() },
		} as unknown as SerialPort;
	}

	it("creates Transport and ESPLoader with correct params", async () => {
		const port = mockPort();
		const onProgress = vi.fn();

		await flashFirmware(port, "wifi-ble-co2", onProgress);

		expect(Transport).toHaveBeenCalledWith(port);
		expect(ESPLoader).toHaveBeenCalledWith(
			expect.objectContaining({
				transport: expect.any(Object),
				baudrate: 115200,
			}),
		);
	});

	it("calls loader.main() to detect chip", async () => {
		const port = mockPort();
		await flashFirmware(port, "wifi-ble-co2", vi.fn());

		const loaderInstance = vi.mocked(ESPLoader).mock.results[0].value;
		expect(loaderInstance.main).toHaveBeenCalledWith("default_reset");
	});

	it("fetches manifest and 3 binary files", async () => {
		const port = mockPort();
		await flashFirmware(port, "wifi-ble-co2", vi.fn());

		const fetchMock = vi.mocked(fetch);
		// 1 manifest + 3 binaries = 4 fetches
		expect(fetchMock).toHaveBeenCalledTimes(4);
		expect(fetchMock.mock.calls[0][0]).toContain("manifest.json");
		expect(fetchMock.mock.calls[1][0]).toContain("bootloader.bin");
		expect(fetchMock.mock.calls[2][0]).toContain("partitions.bin");
		expect(fetchMock.mock.calls[3][0]).toContain("firmware.bin");
	});

	it("calls writeFlash with correct file array and offsets", async () => {
		const port = mockPort();
		await flashFirmware(port, "wifi-ble-co2", vi.fn());

		const loaderInstance = vi.mocked(ESPLoader).mock.results[0].value;
		expect(loaderInstance.writeFlash).toHaveBeenCalledWith(
			expect.objectContaining({
				fileArray: [
					{ data: expect.any(Uint8Array), address: 4096 },
					{ data: expect.any(Uint8Array), address: 32768 },
					{ data: expect.any(Uint8Array), address: 65536 },
				],
				flashSize: "keep",
				flashMode: "keep",
				flashFreq: "keep",
				eraseAll: false,
				compress: true,
			}),
		);
	});

	it("calls loader.after('hard_reset') after flash", async () => {
		const port = mockPort();
		await flashFirmware(port, "wifi-ble-co2", vi.fn());

		const loaderInstance = vi.mocked(ESPLoader).mock.results[0].value;
		expect(loaderInstance.after).toHaveBeenCalledWith("hard_reset");
	});

	it("disconnects transport after flash", async () => {
		const port = mockPort();
		await flashFirmware(port, "wifi-ble-co2", vi.fn());

		const transportInstance = vi.mocked(Transport).mock.results[0].value;
		expect(transportInstance.disconnect).toHaveBeenCalled();
	});

	it("throws on manifest fetch failure", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status: 404,
		} as Response);

		const port = mockPort();
		await expect(flashFirmware(port, "wifi-ble-co2", vi.fn())).rejects.toThrow(
			"Failed to download firmware manifest",
		);
	});

	it("throws on binary fetch failure", async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockManifest),
			} as Response)
			.mockResolvedValueOnce({ ok: false, status: 500 } as Response);

		const port = mockPort();
		await expect(flashFirmware(port, "wifi-ble-co2", vi.fn())).rejects.toThrow(
			"Failed to download firmware file",
		);
	});

	it("calls onProgress with percentage via reportProgress callback", async () => {
		const port = mockPort();
		const onProgress = vi.fn();

		// Intercept writeFlash and invoke reportProgress synchronously
		const loaderInstance = {
			main: vi.fn().mockResolvedValue("ESP32"),
			writeFlash: vi.fn().mockImplementation(({ reportProgress }) => {
				reportProgress(0, 50, 100); // 50%
				reportProgress(0, 100, 100); // 100%
				return Promise.resolve(undefined);
			}),
			after: vi.fn().mockResolvedValue(undefined),
		};
		vi.mocked(ESPLoader).mockImplementationOnce(function () {
			return loaderInstance as any;
		});

		await flashFirmware(port, "wifi-ble-co2", onProgress);

		expect(onProgress).toHaveBeenCalledWith(50);
		expect(onProgress).toHaveBeenCalledWith(100);
	});

	it("disconnects transport on flash error", async () => {
		const port = mockPort();
		const loaderInstance = {
			main: vi.fn().mockResolvedValue("ESP32"),
			writeFlash: vi.fn().mockRejectedValue(new Error("flash fail")),
			after: vi.fn(),
		};
		vi.mocked(ESPLoader).mockImplementationOnce(function () {
			return loaderInstance as any;
		});

		await expect(flashFirmware(port, "wifi-ble-co2", vi.fn())).rejects.toThrow(
			"flash fail",
		);

		const transportInstance = vi.mocked(Transport).mock.results[0].value;
		expect(transportInstance.disconnect).toHaveBeenCalled();
	});
});

describe("runWifiScan", () => {
	beforeEach(() => {
		// Reset improv-serial mocks between each test to avoid call count bleed
		vi.mocked(drainSerial).mockReset().mockResolvedValue(undefined);
		vi.mocked(sendImprovPacket).mockReset().mockResolvedValue(undefined);
		vi.mocked(readImprovResponse).mockReset().mockResolvedValue([]);
		vi.mocked(parseScanResults).mockReset().mockReturnValue(null);
		vi.mocked(buildScanCommand).mockReset().mockReturnValue(new Uint8Array([1, 2, 3]));
		vi.mocked(buildWifiCommand).mockReset().mockReturnValue(new Uint8Array([4, 5, 6]));
	});

	function mockPort() {
		const mockWriter = {
			write: vi.fn().mockResolvedValue(undefined),
			releaseLock: vi.fn(),
			close: vi.fn().mockResolvedValue(undefined),
			closed: Promise.resolve(undefined),
			abort: vi.fn().mockResolvedValue(undefined),
			desiredSize: 1024,
			ready: Promise.resolve(undefined),
		} as unknown as WritableStreamDefaultWriter<Uint8Array>;

		const mockReader = {
			read: vi.fn().mockImplementation(() => new Promise(() => {})),
			cancel: vi.fn().mockResolvedValue(undefined),
			releaseLock: vi.fn(),
			closed: Promise.resolve(undefined),
		} as unknown as ReadableStreamDefaultReader<Uint8Array>;

		// Track how many readers have been created so we can return different ones
		let readerCount = 0;
		const port = {
			open: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
			writable: {
				getWriter: vi.fn().mockReturnValue(mockWriter),
			},
			readable: {
				getReader: vi.fn().mockImplementation(() => {
					readerCount++;
					return mockReader;
				}),
			},
		} as unknown as SerialPort;

		return { port, mockWriter, mockReader };
	}

	it("opens the port at 115200 baud", async () => {
		const { port } = mockPort();

		// readImprovResponse throws to break out of the while loop
		vi.mocked(readImprovResponse).mockRejectedValueOnce(new Error("timeout"));

		await runWifiScan(port);
		expect(port.open).toHaveBeenCalledWith({ baudRate: 115200 });
	});

	it("gets writer and reader from port streams", async () => {
		const { port } = mockPort();
		vi.mocked(readImprovResponse).mockRejectedValueOnce(new Error("timeout"));

		await runWifiScan(port);
		expect(port.writable!.getWriter).toHaveBeenCalled();
		expect(port.readable!.getReader).toHaveBeenCalled();
	});

	it("calls drainSerial to flush boot log data", async () => {
		const { port } = mockPort();
		vi.mocked(readImprovResponse).mockRejectedValueOnce(new Error("timeout"));

		await runWifiScan(port);
		expect(drainSerial).toHaveBeenCalledWith(expect.any(Object), 2000);
	});

	it("sends scan command via sendImprovPacket", async () => {
		const { port } = mockPort();
		vi.mocked(readImprovResponse).mockRejectedValueOnce(new Error("timeout"));

		await runWifiScan(port);
		expect(buildScanCommand).toHaveBeenCalled();
		expect(sendImprovPacket).toHaveBeenCalled();
	});

	it("returns empty networks list when readImprovResponse times out immediately", async () => {
		const { port } = mockPort();
		vi.mocked(readImprovResponse).mockRejectedValueOnce(new Error("timeout"));

		const result = await runWifiScan(port);
		expect(result.networks).toEqual([]);
	});

	it("returns writer and reader in result", async () => {
		const { port } = mockPort();
		vi.mocked(readImprovResponse).mockRejectedValueOnce(new Error("timeout"));

		const result = await runWifiScan(port);
		expect(result.writer).toBeDefined();
		expect(result.reader).toBeDefined();
	});

	it("collects networks from RPC_RESULT packets until empty data signals scan complete", async () => {
		const { port } = mockPort();

		const network1 = { ssid: "NetworkA", rssi: -50, authRequired: false };
		const network2 = { ssid: "NetworkB", rssi: -70, authRequired: true };

		// First call: returns a packet with network1
		vi.mocked(readImprovResponse).mockResolvedValueOnce([
			{ type: TYPE_RPC_RESULT, data: new Uint8Array([1]) },
		]);
		vi.mocked(parseScanResults).mockReturnValueOnce(network1);

		// Second call: returns a packet with network2
		vi.mocked(readImprovResponse).mockResolvedValueOnce([
			{ type: TYPE_RPC_RESULT, data: new Uint8Array([2]) },
		]);
		vi.mocked(parseScanResults).mockReturnValueOnce(network2);

		// Third call: returns empty data (scan complete signal)
		vi.mocked(readImprovResponse).mockResolvedValueOnce([
			{ type: TYPE_RPC_RESULT, data: new Uint8Array([]) },
		]);
		vi.mocked(parseScanResults).mockReturnValueOnce(null);

		const result = await runWifiScan(port);
		expect(result.networks).toEqual([network1, network2]);
	});

	it("ignores packets that are not TYPE_RPC_RESULT", async () => {
		const { port } = mockPort();

		// First call: non-RPC_RESULT packet
		vi.mocked(readImprovResponse).mockResolvedValueOnce([
			{ type: 0x01, data: new Uint8Array([99]) }, // some other type
		]);

		// Second call: timeout to break loop
		vi.mocked(readImprovResponse).mockRejectedValueOnce(new Error("timeout"));

		const result = await runWifiScan(port);
		expect(result.networks).toEqual([]);
		// parseScanResults should not have been called for the non-RPC_RESULT packet
		expect(parseScanResults).not.toHaveBeenCalled();
	});

	it("returns accumulated networks on timeout", async () => {
		const { port } = mockPort();

		const network1 = { ssid: "MyNet", rssi: -60, authRequired: false };

		vi.mocked(readImprovResponse).mockResolvedValueOnce([
			{ type: TYPE_RPC_RESULT, data: new Uint8Array([1]) },
		]);
		vi.mocked(parseScanResults).mockReturnValueOnce(network1);

		// Next call times out
		vi.mocked(readImprovResponse).mockRejectedValueOnce(new Error("timeout"));

		const result = await runWifiScan(port);
		expect(result.networks).toEqual([network1]);
	});
});

describe("runWifiProvision", () => {
	it("calls sendImprovPacket with the wifi command", async () => {
		const mockWriter = {
			write: vi.fn().mockResolvedValue(undefined),
			releaseLock: vi.fn(),
		} as unknown as WritableStreamDefaultWriter<Uint8Array>;

		await runWifiProvision(mockWriter, "MySSID", "mypassword");

		expect(buildWifiCommand).toHaveBeenCalledWith("MySSID", "mypassword");
		expect(sendImprovPacket).toHaveBeenCalledWith(
			mockWriter,
			expect.any(Uint8Array),
		);
	});

	it("resolves without error on success", async () => {
		const mockWriter = {
			write: vi.fn().mockResolvedValue(undefined),
			releaseLock: vi.fn(),
		} as unknown as WritableStreamDefaultWriter<Uint8Array>;

		await expect(
			runWifiProvision(mockWriter, "SSID", "pass"),
		).resolves.toBeUndefined();
	});
});

describe("detectIpAddress", () => {
	it("extracts IP from serial log output", async () => {
		const logLine = new TextEncoder().encode(
			"[12:00:00][C][wifi:000]: IP Address: 192.168.1.42\r\n",
		);
		let readCount = 0;
		const reader = {
			read: vi.fn().mockImplementation(() => {
				if (readCount++ === 0) {
					return Promise.resolve({ value: logLine, done: false });
				}
				return new Promise(() => {});
			}),
			cancel: vi.fn().mockResolvedValue(undefined),
			closed: Promise.resolve(undefined),
			releaseLock: vi.fn(),
		} as unknown as ReadableStreamDefaultReader<Uint8Array>;

		const ip = await detectIpAddress(reader, 1000);
		expect(ip).toBe("192.168.1.42");
	});

	it("throws on timeout when no IP found", async () => {
		const reader = {
			read: vi.fn().mockImplementation(() => new Promise(() => {})),
			cancel: vi.fn().mockResolvedValue(undefined),
			closed: Promise.resolve(undefined),
			releaseLock: vi.fn(),
		} as unknown as ReadableStreamDefaultReader<Uint8Array>;

		await expect(detectIpAddress(reader, 50)).rejects.toThrow("timeout");
	});

	it("breaks out of loop when result.done is true (stream closed)", async () => {
		// Reader returns done=true immediately, no value
		const reader = {
			read: vi.fn().mockResolvedValue({ value: undefined, done: true }),
			cancel: vi.fn().mockResolvedValue(undefined),
			closed: Promise.resolve(undefined),
			releaseLock: vi.fn(),
		} as unknown as ReadableStreamDefaultReader<Uint8Array>;

		await expect(detectIpAddress(reader, 1000)).rejects.toThrow("timeout");
		// Should have called read once and then broken out
		expect(reader.read).toHaveBeenCalledTimes(1);
	});

	it("handles IP appearing across multiple chunks", async () => {
		const chunk1 = new TextEncoder().encode("[C][wifi:000]: IP Add");
		const chunk2 = new TextEncoder().encode("ress: 10.0.0.5\r\n");
		let readCount = 0;
		const reader = {
			read: vi.fn().mockImplementation(() => {
				if (readCount === 0) {
					readCount++;
					return Promise.resolve({ value: chunk1, done: false });
				}
				if (readCount === 1) {
					readCount++;
					return Promise.resolve({ value: chunk2, done: false });
				}
				return new Promise(() => {});
			}),
			cancel: vi.fn().mockResolvedValue(undefined),
			closed: Promise.resolve(undefined),
			releaseLock: vi.fn(),
		} as unknown as ReadableStreamDefaultReader<Uint8Array>;

		const ip = await detectIpAddress(reader, 1000);
		expect(ip).toBe("10.0.0.5");
	});
});
