import { describe, expect, it, vi } from "vitest";
import { subscribeHeatmap } from "../../card/heatmap-store.js";

function makeHass() {
	let cb: ((msg: any) => void) | null = null;
	const unsub = vi.fn();
	const subscribeMessage = vi.fn(async (callback: any) => {
		cb = callback;
		return unsub;
	});
	const connection = { subscribeMessage };
	return {
		hass: { connection },
		emit: (msg: any) => cb?.(msg),
		subscribeMessage,
		unsub,
	};
}

describe("HeatmapStore", () => {
	it("sends the overview/subscribe_heatmap message with the device_id", async () => {
		const h = makeHass();
		const off = subscribeHeatmap(h.hass, "dev1", vi.fn());
		await Promise.resolve();
		expect(h.subscribeMessage).toHaveBeenCalledWith(expect.any(Function), {
			type: "eppgrid/overview/subscribe_heatmap",
			device_id: "dev1",
		});
		off();
	});

	it("delivers cells from an event to the listener", async () => {
		const h = makeHass();
		const l = vi.fn();
		const off = subscribeHeatmap(h.hass, "dev1", l);
		await Promise.resolve();
		h.emit({ cells: [1, 2, 3] });
		expect(l).toHaveBeenLastCalledWith([1, 2, 3]);
		off();
	});

	it("shares one websocket and replays the last cells to a second subscriber", async () => {
		const h = makeHass();
		const a = vi.fn();
		const off1 = subscribeHeatmap(h.hass, "dev1", a);
		await Promise.resolve();
		h.emit({ cells: [1, 2, 3] });

		const b = vi.fn();
		const off2 = subscribeHeatmap(h.hass, "dev1", b);
		// second subscriber immediately receives the cached cells
		expect(b).toHaveBeenLastCalledWith([1, 2, 3]);
		// still only ONE websocket subscription for the shared device
		expect(h.subscribeMessage).toHaveBeenCalledTimes(1);
		off1();
		off2();
	});

	it("replays the default empty cells to a subscriber before any event arrives", async () => {
		const h = makeHass();
		const l = vi.fn();
		const off = subscribeHeatmap(h.hass, "devDefault", l);
		expect(l).toHaveBeenLastCalledWith([]);
		off();
	});

	it("tears down the subscription only when the last subscriber leaves", async () => {
		const h = makeHass();
		const off1 = subscribeHeatmap(h.hass, "dev2", vi.fn());
		const off2 = subscribeHeatmap(h.hass, "dev2", vi.fn());
		await Promise.resolve();
		off1();
		expect(h.unsub).not.toHaveBeenCalled();
		off2();
		expect(h.unsub).toHaveBeenCalledTimes(1);
	});

	it("keeps separate subscriptions for different devices", async () => {
		const h = makeHass();
		subscribeHeatmap(h.hass, "devA", vi.fn());
		subscribeHeatmap(h.hass, "devB", vi.fn());
		expect(h.subscribeMessage).toHaveBeenCalledTimes(2);
	});

	it("ignores events with no cells field, leaving the cached overlay untouched", async () => {
		const h = makeHass();
		const l = vi.fn();
		subscribeHeatmap(h.hass, "devUnknown", l);
		await Promise.resolve();
		h.emit({ cells: [4, 5] });
		const emits = l.mock.calls.length;

		// A cells-less message (e.g. the backend's {closed: true} teardown signal)
		// must not blank a live overlay: no state change, no emit.
		h.emit({});
		expect(l.mock.calls.length).toBe(emits);
		expect(l).toHaveBeenLastCalledWith([4, 5]);
	});

	it("ignores a cells key that is not an array, leaving the cached overlay untouched", async () => {
		const h = makeHass();
		const l = vi.fn();
		subscribeHeatmap(h.hass, "devNonArray", l);
		await Promise.resolve();
		h.emit({ cells: [4, 5] });
		const emits = l.mock.calls.length;

		// Presence of the key is not enough: caching a non-array would hand every
		// later consumer something that isn't an overlay.
		h.emit({ cells: undefined });
		h.emit({ cells: null });
		h.emit({ cells: "nope" });

		expect(l.mock.calls.length).toBe(emits);
		expect(l).toHaveBeenLastCalledWith([4, 5]);
	});

	it("calls unsub if the last subscriber leaves before subscribeMessage resolves", async () => {
		const unsub = vi.fn();
		let resolve!: (u: () => void) => void;
		const subscribeMessage = vi.fn(
			() =>
				new Promise<() => void>((r) => {
					resolve = r;
				}),
		);
		const hass = { connection: { subscribeMessage } };

		const off = subscribeHeatmap(hass, "devRace", vi.fn());
		off();
		resolve(unsub);
		await Promise.resolve();
		expect(unsub).toHaveBeenCalledTimes(1);
	});

	it("reopens on a fresh connection", async () => {
		const h = makeHass();
		const l = vi.fn();
		subscribeHeatmap(h.hass, "devReconnect", l);
		await Promise.resolve();
		h.emit({ cells: [9] });

		const conn2 = { subscribeMessage: vi.fn(async () => vi.fn()) };
		const hass2 = { connection: conn2 };
		subscribeHeatmap(hass2, "devReconnect", vi.fn());

		expect(h.unsub).toHaveBeenCalledTimes(1);
		expect(conn2.subscribeMessage).toHaveBeenCalledTimes(1);
	});

	it("does not throw when the subscribe rejects", async () => {
		const subscribeMessage = vi.fn(() => Promise.reject(new Error("boom")));
		const hass = { connection: { subscribeMessage } };
		const l = vi.fn();
		subscribeHeatmap(hass, "devReject", l);
		await Promise.resolve();
		await Promise.resolve();
		// No crash; listener still has its initial replay of the default cells.
		expect(l).toHaveBeenCalledWith([]);
	});
});
