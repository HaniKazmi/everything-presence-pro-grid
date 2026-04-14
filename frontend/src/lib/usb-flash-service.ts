import { ESPLoader, Transport } from "esptool-js";
import {
	buildGetInfoCommand,
	buildGetStateCommand,
	buildScanCommand,
	buildWifiCommand,
	CMD_GET_CURRENT_STATE,
	CMD_WIFI_SETTINGS,
	parseScanResults,
	readImprovResponse,
	sendImprovPacket,
	TYPE_CURRENT_STATE,
	TYPE_ERROR_STATE,
	TYPE_RPC_RESULT,
	type WifiNetwork,
} from "./improv-serial.js";

const MAC_PATTERN = /MAC:\s*([0-9A-Fa-f:]{17})/;

/**
 * Flashes firmware to a device via USB serial using esptool.js.
 * After completion, the transport is disconnected and the port can be re-opened for Improv.
 */
export async function flashFirmware(
	port: SerialPort,
	variant: string,
	onProgress: (percent: number) => void,
	options?: {
		onMac?: (mac: string) => void;
		beforeFlash?: (mac: string | undefined) => Promise<void>;
		baseUrl?: string;
	},
): Promise<void> {
	// Prevent Transport.disconnect() from closing the port — reopening a
	// CH340 serial port after Transport closes it leaves the port in a
	// zombie state (opens but no data flows). Instead, we let Transport
	// release its reader lock via disconnect(), but block the port.close()
	// call. We close the port ourselves later when we're done with it.
	const originalClose = port.close.bind(port);
	port.close = async () => {};
	const transport = new Transport(port);
	try {
		let detectedMac: string | undefined;
		const terminal = {
			clean: () => {},
			writeLine: (data: string) => {
				const match = MAC_PATTERN.exec(data);
				if (match) {
					detectedMac = match[1].toUpperCase();
					options?.onMac?.(detectedMac);
				}
			},
			write: (_data: string) => {},
		};
		const loader = new ESPLoader({
			transport,
			baudrate: 115200,
			terminal,
		});

		await loader.main("default_reset");

		if (options?.beforeFlash) {
			await options.beforeFlash(detectedMac);
		}

		// Fetch manifest
		if (!options?.baseUrl) {
			throw Object.assign(
				new Error("baseUrl is required for firmware download"),
				{
					errorKey: "usb.errors.base_url_required",
				},
			);
		}
		const base = options.baseUrl;
		const manifestUrl = `${base}/everything-presence-pro-${variant}-manifest.json`;
		const manifestResp = await fetch(manifestUrl);
		if (!manifestResp.ok) {
			throw Object.assign(new Error("Failed to download firmware manifest"), {
				errorKey: "usb.errors.manifest_download_failed",
			});
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
				throw Object.assign(
					new Error(`Failed to download firmware file: ${part.path}`),
					{
						errorKey: "usb.errors.file_download_failed",
						errorParams: { file: part.path },
					},
				);
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
		// Restore the real close method
		port.close = originalClose;
	}
}

/**
 * Opens the serial port for Improv communication and runs a WiFi scan.
 * Returns the list of discovered networks.
 */
export async function runWifiScan(
	port: SerialPort,
	timings?: {
		retryDelay?: number;
		drainDelay?: number;
		handshakeDelay?: number;
		handshakeRetryDelay?: number;
	},
): Promise<{
	writer: WritableStreamDefaultWriter<Uint8Array>;
	reader: ReadableStreamDefaultReader<Uint8Array>;
	networks: WifiNetwork[];
}> {
	if (!port.readable) {
		try {
			await port.open({ baudRate: 115200 });
		} catch {
			throw Object.assign(
				new Error(
					"Could not open serial port. Unplug the device, plug it back in, and try again.",
				),
				{ errorKey: "usb.errors.port_open_failed" },
			);
		}
	}

	// Hard-reset the device via RTS toggle. Explicitly set DTR=false —
	// esptool's Transport leaves DTR in an undefined state which can
	// prevent CH340 USB-serial chips from forwarding received data.
	try {
		await port.setSignals({ dataTerminalReady: false, requestToSend: true });
		await new Promise((r) => setTimeout(r, 200));
		await port.setSignals({ dataTerminalReady: false, requestToSend: false });
	} catch {
		// Some boards don't support serial signal control — continue without reset
	}

	// Brief drain to clear stale serial data (boot output etc.)
	const drainMs = timings?.drainDelay ?? 200;
	const drainReader = port.readable!.getReader();
	while (true) {
		const r = await Promise.race([
			drainReader.read(),
			new Promise<{ value: undefined; done: true }>((resolve) =>
				setTimeout(() => resolve({ value: undefined, done: true }), drainMs),
			),
		]);
		if (r.done || !r.value) break;
	}
	drainReader.releaseLock();

	const writer = port.writable!.getWriter();

	// Handshake with retry — device may still be booting after flash
	const MAX_HANDSHAKE_ATTEMPTS = 5;
	const handshakeRetryDelay = timings?.handshakeRetryDelay ?? 2000;
	const handshakeTimeout = timings?.handshakeDelay ?? 3000;
	let handshakeOk = false;

	for (let attempt = 0; attempt < MAX_HANDSHAKE_ATTEMPTS; attempt++) {
		if (attempt > 0) {
			await new Promise((r) => setTimeout(r, handshakeRetryDelay));
		}
		try {
			await sendImprovPacket(writer, buildGetStateCommand());
			const handshakeReader = port.readable!.getReader();
			try {
				await readImprovResponse(handshakeReader, handshakeTimeout);
				handshakeOk = true;
			} finally {
				handshakeReader.releaseLock();
			}
		} catch {
			// Not ready yet — retry
		}
		if (handshakeOk) break;
	}

	if (!handshakeOk) {
		writer.releaseLock();
		throw Object.assign(
			new Error(
				"No response from device — it may be flashed with ethernet firmware which does not support WiFi configuration.",
			),
			{ errorKey: "usb.errors.no_device_response" },
		);
	}

	const infoCmd = buildGetInfoCommand();
	await sendImprovPacket(writer, infoCmd);
	await new Promise((r) => setTimeout(r, 500));

	// ESPHome's improv_serial returns CACHED WiFi scan results — it doesn't
	// trigger a new scan. If the WiFi component hasn't completed a background
	// scan yet (common right after boot), the first attempt returns empty.
	// Retry up to 3 times with a delay to allow the scan to complete.
	for (let attempt = 0; attempt < 3; attempt++) {
		if (attempt > 0) {
			await new Promise((r) => setTimeout(r, timings?.retryDelay ?? 3000));
		}

		// Send scan command
		const scanCmd = buildScanCommand();
		await sendImprovPacket(writer, scanCmd);

		// Get reader for scan results
		const reader = port.readable!.getReader();

		// Collect scan results (multiple RPC_RESULT packets, terminated by empty data)
		// Pass a persistent buffer through readImprovResponse calls so packets
		// split across serial reads are not lost.
		const networks: WifiNetwork[] = [];
		const deadline = Date.now() + 5000;
		let buffer: number[] = [];
		let scanComplete = false;

		while (Date.now() < deadline && !scanComplete) {
			try {
				const result = await readImprovResponse(
					reader,
					deadline - Date.now(),
					buffer,
				);
				buffer = result.buffer;
				for (const pkt of result.packets) {
					if (pkt.type === TYPE_RPC_RESULT && pkt.data[0] === 0x04) {
						// RPC result format: [command(1), data_length(1), ...strings, checksum(1)]
						// Skip command + data_length to get the string data
						const resultData = pkt.data.slice(2, 2 + pkt.data[1]);
						const network = parseScanResults(resultData);
						if (network === null) {
							// Empty data = scan complete
							scanComplete = true;
							if (networks.length > 0) {
								return { writer, reader, networks };
							}
							break;
						}
						networks.push(network);
					}
				}
			} catch {
				// Timeout — break inner loop
				break;
			}
		}

		if (networks.length > 0) {
			return { writer, reader, networks };
		}

		// No results — release reader and retry
		reader.releaseLock();
	}

	// All attempts exhausted — return empty with a fresh reader
	const reader = port.readable!.getReader();
	return { writer, reader, networks: [] };
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

export async function detectIpAddress(
	_reader: ReadableStreamDefaultReader<Uint8Array>,
	_writer: WritableStreamDefaultWriter<Uint8Array>,
	_timeoutMs: number,
): Promise<string> {
	throw new Error("detectIpAddress not yet implemented");
}
