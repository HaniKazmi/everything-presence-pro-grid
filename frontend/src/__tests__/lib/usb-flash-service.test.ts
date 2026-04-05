import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UsbFlashState } from "../../types.js";

// Mock improv-serial before importing the service
vi.mock("../../lib/improv-serial.js", () => ({
	sendImprovPacket: vi.fn().mockResolvedValue(undefined),
	readImprovResponse: vi.fn().mockResolvedValue({
		packets: [{ type: 0x04, data: new Uint8Array([0x04]) }],
		buffer: [],
	}),
	parseScanResults: vi.fn().mockReturnValue(null),
	buildScanCommand: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
	buildGetStateCommand: vi.fn().mockReturnValue(new Uint8Array([2, 2, 0])),
	buildGetInfoCommand: vi.fn().mockReturnValue(new Uint8Array([3, 3, 0])),
	buildWifiCommand: vi.fn().mockReturnValue(new Uint8Array([4, 5, 6])),
	TYPE_CURRENT_STATE: 0x01,
	TYPE_ERROR_STATE: 0x02,
	TYPE_RPC_RESULT: 0x04,
	ERROR_UNABLE_TO_CONNECT: 0x03,
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
	vi.clearAllMocks();
});

import { ESPLoader, Transport } from "esptool-js";
import {
	buildScanCommand,
	buildWifiCommand,
	parseScanResults,
	readImprovResponse,
	sendImprovPacket,
	TYPE_CURRENT_STATE,
	TYPE_ERROR_STATE,
	TYPE_RPC_RESULT,
} from "../../lib/improv-serial.js";
import {
	detectIpAddress,
	flashFirmware,
	runWifiProvision,
	runWifiScan,
} from "../../lib/usb-flash-service.js";

const TEST_BASE_URL = "https://example.com/api/eppgrid/firmware";

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

		await flashFirmware(port, "wifi-ble-co2", onProgress, {
			baseUrl: TEST_BASE_URL,
		});

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
		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			baseUrl: TEST_BASE_URL,
		});

		const loaderInstance = vi.mocked(ESPLoader).mock.results[0].value;
		expect(loaderInstance.main).toHaveBeenCalledWith("default_reset");
	});

	it("fetches manifest and 3 binary files", async () => {
		const port = mockPort();
		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			baseUrl: TEST_BASE_URL,
		});

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
		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			baseUrl: TEST_BASE_URL,
		});

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
		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			baseUrl: TEST_BASE_URL,
		});

		const loaderInstance = vi.mocked(ESPLoader).mock.results[0].value;
		expect(loaderInstance.after).toHaveBeenCalledWith("hard_reset");
	});

	it("disconnects transport after flash", async () => {
		const port = mockPort();
		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			baseUrl: TEST_BASE_URL,
		});

		const transportInstance = vi.mocked(Transport).mock.results[0].value;
		expect(transportInstance.disconnect).toHaveBeenCalled();
	});

	it("throws on manifest fetch failure", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status: 404,
		} as Response);

		const port = mockPort();
		await expect(
			flashFirmware(port, "wifi-ble-co2", vi.fn(), { baseUrl: TEST_BASE_URL }),
		).rejects.toThrow("Failed to download firmware manifest");
	});

	it("throws on binary fetch failure", async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockManifest),
			} as Response)
			.mockResolvedValueOnce({ ok: false, status: 500 } as Response);

		const port = mockPort();
		await expect(
			flashFirmware(port, "wifi-ble-co2", vi.fn(), { baseUrl: TEST_BASE_URL }),
		).rejects.toThrow("Failed to download firmware file");
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

		await flashFirmware(port, "wifi-ble-co2", onProgress, {
			baseUrl: TEST_BASE_URL,
		});

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

		await expect(
			flashFirmware(port, "wifi-ble-co2", vi.fn(), { baseUrl: TEST_BASE_URL }),
		).rejects.toThrow("flash fail");

		const transportInstance = vi.mocked(Transport).mock.results[0].value;
		expect(transportInstance.disconnect).toHaveBeenCalled();
	});

	it("calls onMac callback with uppercased MAC from terminal output", async () => {
		const port = mockPort();
		const onMac = vi.fn();

		vi.mocked(ESPLoader).mockImplementationOnce(function (opts: any) {
			return {
				main: vi.fn().mockImplementation(async () => {
					opts.terminal?.writeLine("Chip is ESP32-D0WD-V3 (revision v3.1)");
					opts.terminal?.writeLine("MAC: e0:8c:fe:d3:fd:c8");
					opts.terminal?.writeLine("Uploading stub...");
				}),
				writeFlash: vi.fn().mockResolvedValue(undefined),
				after: vi.fn().mockResolvedValue(undefined),
			} as any;
		});

		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			onMac,
			baseUrl: TEST_BASE_URL,
		});

		expect(onMac).toHaveBeenCalledWith("E0:8C:FE:D3:FD:C8");
	});

	it("does not call onMac when no MAC line appears in terminal output", async () => {
		const port = mockPort();
		const onMac = vi.fn();

		vi.mocked(ESPLoader).mockImplementationOnce(function (opts: any) {
			return {
				main: vi.fn().mockImplementation(async () => {
					opts.terminal?.writeLine("Chip is ESP32-D0WD-V3");
					opts.terminal?.writeLine("Uploading stub...");
				}),
				writeFlash: vi.fn().mockResolvedValue(undefined),
				after: vi.fn().mockResolvedValue(undefined),
			} as any;
		});

		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			onMac,
			baseUrl: TEST_BASE_URL,
		});

		expect(onMac).not.toHaveBeenCalled();
	});

	it("throws when baseUrl is not provided", async () => {
		const port = mockPort();
		await expect(flashFirmware(port, "wifi-ble-co2", vi.fn())).rejects.toThrow(
			"baseUrl is required",
		);
	});

	it("calls beforeFlash after loader.main() and before writeFlash()", async () => {
		const port = mockPort();
		const callOrder: string[] = [];

		vi.mocked(ESPLoader).mockImplementationOnce(function (opts: any) {
			return {
				main: vi.fn().mockImplementation(async () => {
					callOrder.push("main");
					opts.terminal?.writeLine("MAC: aa:bb:cc:dd:ee:ff");
				}),
				writeFlash: vi.fn().mockImplementation(async () => {
					callOrder.push("writeFlash");
				}),
				after: vi.fn().mockResolvedValue(undefined),
			} as any;
		});

		const beforeFlash = vi.fn().mockImplementation(async () => {
			callOrder.push("beforeFlash");
		});

		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			beforeFlash,
			baseUrl: TEST_BASE_URL,
		});

		expect(callOrder).toEqual(["main", "beforeFlash", "writeFlash"]);
	});

	it("aborts flash when beforeFlash throws, but still disconnects transport", async () => {
		const port = mockPort();

		vi.mocked(ESPLoader).mockImplementationOnce(function (opts: any) {
			return {
				main: vi.fn().mockResolvedValue("ESP32"),
				writeFlash: vi.fn().mockResolvedValue(undefined),
				after: vi.fn().mockResolvedValue(undefined),
			} as any;
		});

		const beforeFlash = vi.fn().mockRejectedValue(new Error("User cancelled"));

		await expect(
			flashFirmware(port, "wifi-ble-co2", vi.fn(), {
				beforeFlash,
				baseUrl: TEST_BASE_URL,
			}),
		).rejects.toThrow("User cancelled");

		const transportInstance = vi.mocked(Transport).mock.results[0].value;
		expect(transportInstance.disconnect).toHaveBeenCalled();

		const loaderInstance = vi.mocked(ESPLoader).mock.results[0].value;
		expect(loaderInstance.writeFlash).not.toHaveBeenCalled();
	});

	it("passes detected MAC to beforeFlash callback", async () => {
		const port = mockPort();

		vi.mocked(ESPLoader).mockImplementationOnce(function (opts: any) {
			return {
				main: vi.fn().mockImplementation(async () => {
					opts.terminal?.writeLine("MAC: aa:bb:cc:dd:ee:ff");
				}),
				writeFlash: vi.fn().mockResolvedValue(undefined),
				after: vi.fn().mockResolvedValue(undefined),
			} as any;
		});

		const beforeFlash = vi.fn().mockResolvedValue(undefined);

		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			beforeFlash,
			baseUrl: TEST_BASE_URL,
		});

		expect(beforeFlash).toHaveBeenCalledWith("AA:BB:CC:DD:EE:FF");
	});

	it("passes undefined to beforeFlash when no MAC detected", async () => {
		const port = mockPort();
		const beforeFlash = vi.fn().mockResolvedValue(undefined);

		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			beforeFlash,
			baseUrl: TEST_BASE_URL,
		});

		expect(beforeFlash).toHaveBeenCalledWith(undefined);
	});

	it("uses baseUrl from options for manifest fetch", async () => {
		const port = mockPort();
		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			baseUrl: "https://example.com/fw",
		});

		const fetchMock = vi.mocked(fetch);
		expect(fetchMock.mock.calls[0][0]).toBe(
			"https://example.com/fw/everything-presence-pro-wifi-ble-co2-manifest.json",
		);
	});

	it("throws when baseUrl is not provided in options", async () => {
		const port = mockPort();
		await expect(
			flashFirmware(port, "wifi-ble-co2", vi.fn(), {}),
		).rejects.toThrow("baseUrl is required");
	});
});

describe("runWifiScan", () => {
	beforeEach(() => {
		// Reset improv-serial mocks between each test to avoid call count bleed
		vi.mocked(sendImprovPacket).mockReset().mockResolvedValue(undefined);
		vi.mocked(readImprovResponse)
			.mockReset()
			.mockResolvedValue({
				packets: [{ type: TYPE_RPC_RESULT, data: new Uint8Array([0x04]) }],
				buffer: [],
			});
		vi.mocked(parseScanResults).mockReset().mockReturnValue(null);
		vi.mocked(buildScanCommand)
			.mockReset()
			.mockReturnValue(new Uint8Array([1, 2, 3]));
		vi.mocked(buildWifiCommand)
			.mockReset()
			.mockReturnValue(new Uint8Array([4, 5, 6]));
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
			setSignals: vi.fn().mockResolvedValue(undefined),
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

	it("opens the port at 115200 baud when not already open", async () => {
		const { port } = mockPort();
		// Simulate port not yet open (readable is null)
		(port as any).readable = null;

		// Handshake succeeds, then scan times out
		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
				buffer: [],
			})
			.mockRejectedValueOnce(new Error("timeout"));

		// open() should set readable so getWriter/getReader work after
		(port.open as any).mockImplementation(() => {
			(port as any).readable = {
				getReader: vi.fn().mockReturnValue({
					read: vi.fn().mockImplementation(() => new Promise(() => {})),
					cancel: vi.fn(),
					releaseLock: vi.fn(),
					closed: Promise.resolve(undefined),
				}),
			};
			(port as any).writable = {
				getWriter: vi.fn().mockReturnValue({
					write: vi.fn().mockResolvedValue(undefined),
					close: vi.fn(),
					abort: vi.fn(),
					closed: Promise.resolve(undefined),
					desiredSize: 1,
					ready: Promise.resolve(undefined),
					releaseLock: vi.fn(),
				}),
			};
			return Promise.resolve();
		});

		await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
		expect(port.open).toHaveBeenCalledWith({ baudRate: 115200 });
	});

	it("skips open when port is already open", async () => {
		const { port } = mockPort();

		// Handshake succeeds, then scan times out
		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
				buffer: [],
			})
			.mockRejectedValueOnce(new Error("timeout"));

		await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
		expect(port.open).not.toHaveBeenCalled();
	});

	it("gets writer and reader from port streams", async () => {
		const { port } = mockPort();
		// Handshake succeeds, then scan times out
		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
				buffer: [],
			})
			.mockRejectedValueOnce(new Error("timeout"));

		await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
		expect(port.writable!.getWriter).toHaveBeenCalled();
		expect(port.readable!.getReader).toHaveBeenCalled();
	});

	it("tries RTS reset before scanning", async () => {
		const { port } = mockPort();
		// Handshake succeeds, then scan times out
		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
				buffer: [],
			})
			.mockRejectedValueOnce(new Error("timeout"));

		await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});

		const setSignals = port.setSignals as ReturnType<typeof vi.fn>;
		expect(setSignals).toHaveBeenCalledTimes(2);
		expect(setSignals).toHaveBeenNthCalledWith(1, { requestToSend: true });
		expect(setSignals).toHaveBeenNthCalledWith(2, { requestToSend: false });
	});

	it("continues without reset if setSignals is not supported", async () => {
		const { port } = mockPort();
		(port.setSignals as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("setSignals not supported"),
		);
		// Handshake succeeds, then scan times out
		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
				buffer: [],
			})
			.mockRejectedValueOnce(new Error("timeout"));

		await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});

		expect(sendImprovPacket).toHaveBeenCalled();
	});

	it("sends scan command via sendImprovPacket", async () => {
		const { port } = mockPort();
		// Handshake succeeds, then scan times out
		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
				buffer: [],
			})
			.mockRejectedValueOnce(new Error("timeout"));

		await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
		expect(buildScanCommand).toHaveBeenCalled();
		expect(sendImprovPacket).toHaveBeenCalled();
	});

	it("returns empty networks list when readImprovResponse times out immediately", async () => {
		const { port } = mockPort();
		// Handshake succeeds, then scan times out
		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
				buffer: [],
			})
			.mockRejectedValueOnce(new Error("timeout"));

		const result = await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
		expect(result.networks).toEqual([]);
	});

	it("returns writer and reader in result", async () => {
		const { port } = mockPort();
		// Handshake succeeds, then scan times out
		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
				buffer: [],
			})
			.mockRejectedValueOnce(new Error("timeout"));

		const result = await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
		expect(result.writer).toBeDefined();
		expect(result.reader).toBeDefined();
	});

	it("collects networks from RPC_RESULT packets until empty data signals scan complete", async () => {
		const { port } = mockPort();

		const network1 = { ssid: "NetworkA", rssi: -50, authRequired: false };
		const network2 = { ssid: "NetworkB", rssi: -70, authRequired: true };

		// Handshake succeeds
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
			buffer: [],
		});

		// First call: returns a packet with network1
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{ type: TYPE_RPC_RESULT, data: new Uint8Array([0x04, 0x01, 0x01]) },
			],
			buffer: [],
		});
		vi.mocked(parseScanResults).mockReturnValueOnce(network1);

		// Second call: returns a packet with network2
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{ type: TYPE_RPC_RESULT, data: new Uint8Array([0x04, 0x01, 0x02]) },
			],
			buffer: [],
		});
		vi.mocked(parseScanResults).mockReturnValueOnce(network2);

		// Third call: returns empty data (scan complete signal)
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [{ type: TYPE_RPC_RESULT, data: new Uint8Array([0x04, 0x00]) }],
			buffer: [],
		});
		vi.mocked(parseScanResults).mockReturnValueOnce(null);

		const result = await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
		expect(result.networks).toEqual([network1, network2]);
	});

	it("ignores packets that are not TYPE_RPC_RESULT", async () => {
		const { port } = mockPort();

		// Handshake succeeds
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
			buffer: [],
		});

		// Return a non-RPC_RESULT packet followed by a scan-complete on all attempts
		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [
					{ type: 0x01, data: new Uint8Array([99]) }, // some other type
				],
				buffer: [],
			})
			.mockResolvedValue({
				packets: [
					{ type: TYPE_RPC_RESULT, data: new Uint8Array([0x04, 0x00]) },
				],
				buffer: [],
			});

		const result = await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
		// The non-RPC_RESULT packet should not trigger parseScanResults
		// but the scan-complete packet (0x04 with empty slice) does
		expect(result.networks).toEqual([]);
	});

	it("throws when handshake gets no response (ethernet firmware)", async () => {
		const { port } = mockPort();

		// Handshake fails on all attempts (no response from device)
		vi.mocked(readImprovResponse).mockRejectedValue(new Error("timeout"));

		await expect(
			runWifiScan(port, {
				retryDelay: 0,
				drainDelay: 0,
				handshakeDelay: 0,
				handshakeRetryDelay: 0,
			}),
		).rejects.toThrow("No response from device");
	});

	it("retries handshake when first attempt fails and succeeds on later attempt", async () => {
		const { port } = mockPort();

		// First handshake attempt fails, second succeeds, then scan times out
		vi.mocked(readImprovResponse)
			.mockRejectedValueOnce(new Error("timeout")) // handshake attempt 1
			.mockRejectedValueOnce(new Error("timeout")) // handshake attempt 2
			.mockResolvedValueOnce({
				// handshake attempt 3 succeeds
				packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
				buffer: [],
			})
			.mockRejectedValue(new Error("timeout")); // scan times out

		const result = await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
		expect(result.networks).toEqual([]);
		// sendImprovPacket should have been called at least 3 times for handshake attempts
		expect(
			vi.mocked(sendImprovPacket).mock.calls.length,
		).toBeGreaterThanOrEqual(3);
	});

	it("retries scan when first attempt returns no networks", async () => {
		const { port } = mockPort();

		// Handshake succeeds
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
			buffer: [],
		});

		// First scan attempt: scan-complete with no networks
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [{ type: TYPE_RPC_RESULT, data: new Uint8Array([0x04, 0x00]) }],
			buffer: [],
		});
		vi.mocked(parseScanResults).mockReturnValueOnce(null);

		// Second scan attempt: returns a network then scan-complete
		const network = { ssid: "DelayedNet", rssi: -55, authRequired: false };
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{ type: TYPE_RPC_RESULT, data: new Uint8Array([0x04, 0x01, 0x01]) },
			],
			buffer: [],
		});
		vi.mocked(parseScanResults).mockReturnValueOnce(network);

		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [{ type: TYPE_RPC_RESULT, data: new Uint8Array([0x04, 0x00]) }],
			buffer: [],
		});
		vi.mocked(parseScanResults).mockReturnValueOnce(null);

		const result = await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
		expect(result.networks).toEqual([network]);
	});

	it("returns accumulated networks on timeout", async () => {
		const { port } = mockPort();

		const network1 = { ssid: "MyNet", rssi: -60, authRequired: false };

		// Handshake succeeds
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
			buffer: [],
		});

		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{ type: TYPE_RPC_RESULT, data: new Uint8Array([0x04, 0x01, 0x01]) },
			],
			buffer: [],
		});
		vi.mocked(parseScanResults).mockReturnValueOnce(network1);

		// Next call times out
		vi.mocked(readImprovResponse).mockRejectedValueOnce(new Error("timeout"));

		const result = await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
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
	const mockReader = {
		read: vi.fn().mockImplementation(() => new Promise(() => {})),
		cancel: vi.fn().mockResolvedValue(undefined),
		closed: Promise.resolve(undefined),
		releaseLock: vi.fn(),
	} as unknown as ReadableStreamDefaultReader<Uint8Array>;

	it("extracts IP from Improv RPC result containing URL", async () => {
		const encoder = new TextEncoder();
		const url = "http://192.168.1.42";
		const urlBytes = encoder.encode(url);
		const data = new Uint8Array(2 + 1 + urlBytes.length);
		data[0] = 0x01;
		data[1] = 1 + urlBytes.length;
		data[2] = urlBytes.length;
		data.set(urlBytes, 3);

		// PROVISIONING → PROVISIONED → RPC result with URL
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{ type: 0x01, data: new Uint8Array([0x03]) },
				{ type: 0x01, data: new Uint8Array([0x04]) },
				{ type: TYPE_RPC_RESULT, data },
			],
			buffer: [],
		});

		const ip = await detectIpAddress(mockReader, 1000);
		expect(ip).toBe("192.168.1.42");
	});

	it("throws on timeout when no RPC result arrives", async () => {
		vi.mocked(readImprovResponse).mockRejectedValueOnce(new Error("timeout"));

		await expect(detectIpAddress(mockReader, 50)).rejects.toThrow(
			"WiFi connection failed",
		);
	});

	it("throws on error state (wrong password)", async () => {
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [{ type: 0x02, data: new Uint8Array([0x03]) }],
			buffer: [],
		});

		await expect(detectIpAddress(mockReader, 1000)).rejects.toThrow(
			"WiFi connection failed",
		);
	});

	it("returns null when provisioned but no URL (no next_url configured)", async () => {
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{ type: 0x01, data: new Uint8Array([0x03]) },
				{ type: 0x01, data: new Uint8Array([0x04]) },
				{ type: TYPE_RPC_RESULT, data: new Uint8Array([0x01, 0x00, 0x00]) },
			],
			buffer: [],
		});

		const ip = await detectIpAddress(mockReader, 1000);
		expect(ip).toBeNull();
	});

	it("throws error state message after seeing PROVISIONING", async () => {
		// Send PROVISIONING first so sawProvisioning=true, then ERROR_STATE
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{ type: TYPE_CURRENT_STATE, data: new Uint8Array([0x03]) }, // PROVISIONING
				{ type: TYPE_ERROR_STATE, data: new Uint8Array([0x03]) }, // Unable to connect
			],
			buffer: [],
		});

		await expect(detectIpAddress(mockReader, 1000)).rejects.toThrow(
			"WiFi connection failed",
		);
	});

	it("throws with fallback message for unknown error codes", async () => {
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{ type: TYPE_CURRENT_STATE, data: new Uint8Array([0x03]) },
				{ type: TYPE_ERROR_STATE, data: new Uint8Array([0xff]) }, // Unknown code
			],
			buffer: [],
		});

		await expect(detectIpAddress(mockReader, 1000)).rejects.toThrow(
			"WiFi error (code 255)",
		);
	});

	it("throws when IP is 0.0.0.0", async () => {
		const encoder = new TextEncoder();
		const url = "http://0.0.0.0";
		const urlBytes = encoder.encode(url);
		const data = new Uint8Array(2 + 1 + urlBytes.length);
		data[0] = 0x01;
		data[1] = 1 + urlBytes.length;
		data[2] = urlBytes.length;
		data.set(urlBytes, 3);

		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{ type: TYPE_CURRENT_STATE, data: new Uint8Array([0x03]) },
				{ type: TYPE_CURRENT_STATE, data: new Uint8Array([0x04]) },
				{ type: TYPE_RPC_RESULT, data },
			],
			buffer: [],
		});

		await expect(detectIpAddress(mockReader, 1000)).rejects.toThrow(
			"WiFi connection failed",
		);
	});

	it("re-throws non-timeout errors from readImprovResponse", async () => {
		vi.mocked(readImprovResponse).mockRejectedValueOnce(
			new Error("serial port disconnected"),
		);

		await expect(detectIpAddress(mockReader, 1000)).rejects.toThrow(
			"serial port disconnected",
		);
	});

	it("ignores packets before PROVISIONING state is seen", async () => {
		// RPC result before PROVISIONING should be ignored
		const encoder = new TextEncoder();
		const url = "http://192.168.1.99";
		const urlBytes = encoder.encode(url);
		const staleData = new Uint8Array(2 + 1 + urlBytes.length);
		staleData[0] = 0x01;
		staleData[1] = 1 + urlBytes.length;
		staleData[2] = urlBytes.length;
		staleData.set(urlBytes, 3);

		// First response: stale RPC result (no PROVISIONING yet)
		// Second response: timeout
		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [
					{ type: TYPE_CURRENT_STATE, data: new Uint8Array([0x04]) }, // PROVISIONED but no prior PROVISIONING
					{ type: TYPE_RPC_RESULT, data: staleData },
				],
				buffer: [],
			})
			.mockRejectedValueOnce(new Error("timeout"));

		await expect(detectIpAddress(mockReader, 1000)).rejects.toThrow(
			"WiFi connection failed",
		);
	});
});
