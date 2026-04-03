import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UsbFlashState } from "../../types.js";

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

import { flashFirmware, runWifiScan, runWifiProvision, detectIpAddress } from "../../lib/usb-flash-service.js";
import { ESPLoader, Transport } from "esptool-js";

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
  it("is exported as a function", () => {
    expect(typeof runWifiScan).toBe("function");
  });
});

describe("runWifiProvision", () => {
  it("is exported as a function", () => {
    expect(typeof runWifiProvision).toBe("function");
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
      read: vi.fn().mockImplementation(
        () => new Promise(() => {}),
      ),
      cancel: vi.fn().mockResolvedValue(undefined),
      closed: Promise.resolve(undefined),
      releaseLock: vi.fn(),
    } as unknown as ReadableStreamDefaultReader<Uint8Array>;

    await expect(detectIpAddress(reader, 50)).rejects.toThrow("timeout");
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
