import { ESPLoader, Transport } from "esptool-js";
import {
	buildScanCommand,
	buildWifiCommand,
	drainSerial,
	parseScanResults,
	readImprovResponse,
	sendImprovPacket,
	TYPE_RPC_RESULT,
	type WifiNetwork,
} from "./improv-serial.js";

const MANIFEST_BASE_URL =
	"https://github.com/clintongormley/everything-presence-pro-grid/releases/download/v0.1.0-alpha.2";

/**
 * Flashes firmware to a device via USB serial using esptool.js.
 * After completion, the transport is disconnected and the port can be re-opened for Improv.
 */
export async function flashFirmware(
	port: SerialPort,
	variant: string,
	onProgress: (percent: number) => void,
): Promise<void> {
	const transport = new Transport(port);
	try {
		const loader = new ESPLoader({
			transport,
			baudrate: 115200,
		});

		await loader.main("default_reset");

		// Fetch manifest
		const manifestUrl = `${MANIFEST_BASE_URL}/everything-presence-pro-${variant}-manifest.json`;
		const manifestResp = await fetch(manifestUrl);
		if (!manifestResp.ok) {
			throw new Error("Failed to download firmware manifest");
		}
		const manifest = await manifestResp.json();

		// Download firmware binaries
		const baseUrl = manifestUrl.substring(0, manifestUrl.lastIndexOf("/") + 1);
		const parts = manifest.builds[0].parts as {
			path: string;
			offset: number;
		}[];

		const fileArray: { data: Uint8Array; address: number }[] = [];
		for (const part of parts) {
			const resp = await fetch(`${baseUrl}${part.path}`);
			if (!resp.ok) {
				throw new Error(`Failed to download firmware file: ${part.path}`);
			}
			const data = new Uint8Array(await resp.arrayBuffer());
			fileArray.push({ data, address: part.offset });
		}

		// Flash
		await loader.writeFlash({
			fileArray,
			flashSize: "keep",
			flashMode: "keep",
			flashFreq: "keep",
			eraseAll: false,
			compress: true,
			reportProgress: (_fileIndex: number, written: number, total: number) => {
				onProgress(Math.round((written / total) * 100));
			},
		});

		// Reset device
		await loader.after("hard_reset");
	} finally {
		await transport.disconnect();
	}
}

/**
 * Opens the serial port for Improv communication and runs a WiFi scan.
 * Returns the list of discovered networks.
 */
export async function runWifiScan(port: SerialPort): Promise<{
	writer: WritableStreamDefaultWriter<Uint8Array>;
	reader: ReadableStreamDefaultReader<Uint8Array>;
	networks: WifiNetwork[];
}> {
	if (!port.readable) {
		await port.open({ baudRate: 115200 });
	}
	const writer = port.writable!.getWriter();
	const reader = port.readable!.getReader();

	// Drain any buffered boot log data
	await drainSerial(reader, 2000);
	reader.releaseLock();

	// Get a fresh reader after drain
	const freshReader = port.readable!.getReader();

	// Send scan command
	await sendImprovPacket(writer, buildScanCommand());

	// Collect scan results (multiple RPC_RESULT packets, terminated by empty data)
	const networks: WifiNetwork[] = [];
	const deadline = Date.now() + 10000;

	while (Date.now() < deadline) {
		try {
			const packets = await readImprovResponse(
				freshReader,
				deadline - Date.now(),
			);
			for (const pkt of packets) {
				if (pkt.type === TYPE_RPC_RESULT) {
					const network = parseScanResults(pkt.data);
					if (network === null) {
						// Empty data = scan complete
						return { writer, reader: freshReader, networks };
					}
					networks.push(network);
				}
			}
		} catch {
			// Timeout — return whatever we have
			break;
		}
	}

	return { writer, reader: freshReader, networks };
}

/**
 * Sends WiFi credentials via Improv Serial.
 */
export async function runWifiProvision(
	writer: WritableStreamDefaultWriter<Uint8Array>,
	ssid: string,
	password: string,
): Promise<void> {
	await sendImprovPacket(writer, buildWifiCommand(ssid, password));
}

/**
 * Reads serial output looking for an IP address pattern.
 * Returns the IP address string or throws on timeout.
 */
export async function detectIpAddress(
	reader: ReadableStreamDefaultReader<Uint8Array>,
	timeoutMs: number,
): Promise<string> {
	const decoder = new TextDecoder();
	let buffer = "";
	const deadline = Date.now() + timeoutMs;
	const ipPattern = /IP Address:\s*(\d+\.\d+\.\d+\.\d+)/;

	while (Date.now() < deadline) {
		const remaining = deadline - Date.now();
		if (remaining <= 0) break;

		const result = await Promise.race([
			reader.read(),
			new Promise<{ value: undefined; done: true }>((resolve) =>
				setTimeout(() => resolve({ value: undefined, done: true }), remaining),
			),
		]);

		if (result.value) {
			buffer += decoder.decode(result.value, { stream: true });
			const match = ipPattern.exec(buffer);
			if (match) {
				return match[1];
			}
		}

		if (result.done) break;
	}

	throw new Error("timeout");
}
