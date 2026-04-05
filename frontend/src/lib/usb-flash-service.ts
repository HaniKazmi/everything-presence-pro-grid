import { ESPLoader, Transport } from "esptool-js";
import {
	buildGetInfoCommand,
	buildGetStateCommand,
	buildScanCommand,
	buildWifiCommand,
	ERROR_UNABLE_TO_CONNECT,
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
				console.log(data);
				const match = MAC_PATTERN.exec(data);
				if (match) {
					detectedMac = match[1].toUpperCase();
					options?.onMac?.(detectedMac);
				}
			},
			write: (data: string) => {
				console.log(data);
			},
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
			throw new Error("baseUrl is required for firmware download");
		}
		const base = options.baseUrl;
		const manifestUrl = `${base}/everything-presence-pro-${variant}-manifest.json`;
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
			throw new Error(
				"Could not open serial port. Unplug the device, plug it back in, and try again.",
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
		throw new Error(
			"No response from device — it may be flashed with ethernet firmware which does not support WiFi configuration.",
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

/**
 * Reads Improv RPC result after WiFi provisioning to extract the IP address.
 * ESPHome sends an RPC result containing a URL like "http://192.168.1.42".
 * Returns the IP address string or throws on timeout.
 */
export async function detectIpAddress(
	reader: ReadableStreamDefaultReader<Uint8Array>,
	timeoutMs: number,
): Promise<string | null> {
	const decoder = new TextDecoder();
	const ipPattern = /(\d+\.\d+\.\d+\.\d+)/;
	let buffer: number[] = [];
	// Track state machine: our command must trigger PROVISIONING first.
	// Anything before that is stale from a previous attempt.
	let sawProvisioning = false;
	let provisioned = false;
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		try {
			const result = await readImprovResponse(
				reader,
				deadline - Date.now(),
				buffer,
			);
			buffer = result.buffer;
			for (const pkt of result.packets) {
				// STATE_PROVISIONING — our command was accepted
				if (pkt.type === TYPE_CURRENT_STATE && pkt.data[0] === 0x03) {
					sawProvisioning = true;
				}

				// Ignore everything before we see our PROVISIONING
				if (!sawProvisioning) continue;

				// Error state — WiFi connection failed
				if (pkt.type === TYPE_ERROR_STATE) {
					const code = pkt.data[0];
					const messages: Record<number, string> = {
						1: "Invalid command — device may need to be power-cycled",
						2: "Unknown command",
						3: "WiFi connection failed — check SSID/password and try again",
						4: "Not authorized",
					};
					throw new Error(messages[code] ?? `WiFi error (code ${code})`);
				}

				// STATE_PROVISIONED — device connected to WiFi
				if (pkt.type === TYPE_CURRENT_STATE && pkt.data[0] === 0x04) {
					provisioned = true;
				}

				// RPC result — only trust after PROVISIONING → PROVISIONED
				if (pkt.type === TYPE_RPC_RESULT && provisioned) {
					if (pkt.data.length >= 3 && pkt.data[1] > 0) {
						const resultData = pkt.data.slice(2, 2 + pkt.data[1]);
						const urlLen = resultData[0];
						const url = decoder.decode(resultData.slice(1, 1 + urlLen));
						const match = ipPattern.exec(url);
						if (match && match[1] !== "0.0.0.0") return match[1];
					}
					// Provisioned but IP not yet assigned (0.0.0.0) or no URL —
					// creds are saved to NVS; caller should reboot and re-read
					return null;
				}
			}
		} catch (err) {
			if (err instanceof Error && !err.message.includes("timeout")) {
				throw err;
			}
			break;
		}
	}

	throw new Error("WiFi connection failed — check SSID/password and try again");
}
