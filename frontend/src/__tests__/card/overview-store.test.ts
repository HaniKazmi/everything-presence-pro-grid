import { describe, expect, it, vi } from "vitest";
import { subscribeOverview } from "../../card/overview-store.js";

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

describe("OverviewStore", () => {
	it("opens one subscription and replays cached state to a second subscriber", async () => {
		const h = makeHass();
		const a = vi.fn();
		const off1 = subscribeOverview(h.hass, "dev1", a);
		await Promise.resolve();
		h.emit({ snapshot: { calibration: { room_width: 3000 } } });
		h.emit({
			targets: [],
			sensors: {},
			zones: { occupancy: {}, target_counts: {}, frame_count: 1 },
		});

		const b = vi.fn();
		const off2 = subscribeOverview(h.hass, "dev1", b);
		// second subscriber immediately receives the cached snapshot + data
		const last = b.mock.calls.at(-1)![0];
		expect(last.snapshot).toEqual({ calibration: { room_width: 3000 } });
		expect(last.data.zones.frame_count).toBe(1);
		// still only ONE websocket subscription for the shared device
		expect(h.subscribeMessage).toHaveBeenCalledTimes(1);
		off1();
		off2();
	});

	it("tears down the subscription only when the last subscriber leaves", async () => {
		const h = makeHass();
		const off1 = subscribeOverview(h.hass, "dev2", vi.fn());
		const off2 = subscribeOverview(h.hass, "dev2", vi.fn());
		await Promise.resolve();
		off1();
		expect(h.unsub).not.toHaveBeenCalled();
		off2();
		expect(h.unsub).toHaveBeenCalledTimes(1);
	});

	it("keeps separate subscriptions for different devices", async () => {
		const h = makeHass();
		subscribeOverview(h.hass, "devA", vi.fn());
		subscribeOverview(h.hass, "devB", vi.fn());
		expect(h.subscribeMessage).toHaveBeenCalledTimes(2);
	});

	it("marks unavailable on an available:false event", async () => {
		const h = makeHass();
		const l = vi.fn();
		subscribeOverview(h.hass, "devC", l);
		await Promise.resolve();
		h.emit({ available: false });
		expect(l.mock.calls.at(-1)![0].available).toBe(false);
	});
});
