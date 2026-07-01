import { describe, expect, it, vi } from "vitest";
import { DeviceSubscription } from "../../card/device-subscription.js";

interface FakeHass {
	connection: unknown;
}

function makeSubscribeFn() {
	const unsubs: Array<ReturnType<typeof vi.fn>> = [];
	const calls: Array<{ hass: FakeHass; deviceId: string }> = [];
	let onDataCb: ((d: unknown) => void) | undefined;
	const subscribeFn = vi.fn(
		(hass: FakeHass, deviceId: string, onData: (d: unknown) => void) => {
			calls.push({ hass, deviceId });
			onDataCb = onData;
			const unsub = vi.fn();
			unsubs.push(unsub);
			return unsub;
		},
	);
	return {
		subscribeFn,
		calls,
		unsubs,
		emit: (d: unknown) => onDataCb?.(d),
	};
}

describe("DeviceSubscription", () => {
	it("does not subscribe when hass is absent", () => {
		const { subscribeFn } = makeSubscribeFn();
		const sub = new DeviceSubscription<unknown>({
			getHass: () => undefined,
			getDeviceId: () => "dev-1",
			subscribeFn,
			onData: vi.fn(),
		});
		sub.ensure();
		expect(subscribeFn).not.toHaveBeenCalled();
	});

	it("does not subscribe when deviceId is absent", () => {
		const { subscribeFn } = makeSubscribeFn();
		const sub = new DeviceSubscription<unknown>({
			getHass: () => ({ connection: {} }),
			getDeviceId: () => undefined,
			subscribeFn,
			onData: vi.fn(),
		});
		sub.ensure();
		expect(subscribeFn).not.toHaveBeenCalled();
	});

	it("subscribes when hass and deviceId are present", () => {
		const { subscribeFn, calls } = makeSubscribeFn();
		const hass = { connection: {} };
		const sub = new DeviceSubscription<unknown>({
			getHass: () => hass,
			getDeviceId: () => "dev-1",
			subscribeFn,
			onData: vi.fn(),
		});
		sub.ensure();
		expect(subscribeFn).toHaveBeenCalledTimes(1);
		expect(calls[0]).toEqual({ hass, deviceId: "dev-1" });
	});

	it("is a no-op on an identical connection + device", () => {
		const { subscribeFn } = makeSubscribeFn();
		const hass = { connection: {} };
		const sub = new DeviceSubscription<unknown>({
			getHass: () => hass,
			getDeviceId: () => "dev-1",
			subscribeFn,
			onData: vi.fn(),
		});
		sub.ensure();
		sub.ensure();
		expect(subscribeFn).toHaveBeenCalledTimes(1);
	});

	it("re-subscribes (calling the old unsub) when the connection changes", () => {
		const { subscribeFn, unsubs } = makeSubscribeFn();
		const hassA = { connection: { id: "a" } };
		const hassB = { connection: { id: "b" } };
		let hass = hassA;
		const sub = new DeviceSubscription<unknown>({
			getHass: () => hass,
			getDeviceId: () => "dev-1",
			subscribeFn,
			onData: vi.fn(),
		});
		sub.ensure();
		hass = hassB;
		sub.ensure();
		expect(subscribeFn).toHaveBeenCalledTimes(2);
		expect(unsubs[0]).toHaveBeenCalledTimes(1);
	});

	it("re-subscribes (calling the old unsub) when the device changes", () => {
		const { subscribeFn, unsubs } = makeSubscribeFn();
		const hass = { connection: {} };
		let deviceId = "dev-1";
		const sub = new DeviceSubscription<unknown>({
			getHass: () => hass,
			getDeviceId: () => deviceId,
			subscribeFn,
			onData: vi.fn(),
		});
		sub.ensure();
		deviceId = "dev-2";
		sub.ensure();
		expect(subscribeFn).toHaveBeenCalledTimes(2);
		expect(unsubs[0]).toHaveBeenCalledTimes(1);
	});

	it("tears down the subscription when enabled() goes false", () => {
		const { subscribeFn, unsubs } = makeSubscribeFn();
		const hass = { connection: {} };
		let enabled = true;
		const sub = new DeviceSubscription<unknown>({
			getHass: () => hass,
			getDeviceId: () => "dev-1",
			enabled: () => enabled,
			subscribeFn,
			onData: vi.fn(),
		});
		sub.ensure();
		expect(subscribeFn).toHaveBeenCalledTimes(1);
		enabled = false;
		sub.ensure();
		expect(unsubs[0]).toHaveBeenCalledTimes(1);
	});

	it("does not subscribe at all when enabled() is false from the start", () => {
		const { subscribeFn } = makeSubscribeFn();
		const sub = new DeviceSubscription<unknown>({
			getHass: () => ({ connection: {} }),
			getDeviceId: () => "dev-1",
			enabled: () => false,
			subscribeFn,
			onData: vi.fn(),
		});
		sub.ensure();
		expect(subscribeFn).not.toHaveBeenCalled();
	});

	it("re-subscribes when enabled() flips back to true after being disabled", () => {
		const { subscribeFn } = makeSubscribeFn();
		const hass = { connection: {} };
		let enabled = false;
		const sub = new DeviceSubscription<unknown>({
			getHass: () => hass,
			getDeviceId: () => "dev-1",
			enabled: () => enabled,
			subscribeFn,
			onData: vi.fn(),
		});
		sub.ensure();
		expect(subscribeFn).not.toHaveBeenCalled();
		enabled = true;
		sub.ensure();
		expect(subscribeFn).toHaveBeenCalledTimes(1);
	});

	it("delivers data to onData", () => {
		const { subscribeFn, emit } = makeSubscribeFn();
		const onData = vi.fn();
		const sub = new DeviceSubscription<unknown>({
			getHass: () => ({ connection: {} }),
			getDeviceId: () => "dev-1",
			subscribeFn,
			onData,
		});
		sub.ensure();
		emit({ foo: "bar" });
		expect(onData).toHaveBeenCalledWith({ foo: "bar" });
	});

	it("calls onResubscribe before subscribeFn on a new subscription", () => {
		const order: string[] = [];
		const subscribeFn = vi.fn(() => {
			order.push("subscribeFn");
			return vi.fn();
		});
		const sub = new DeviceSubscription<unknown>({
			getHass: () => ({ connection: {} }),
			getDeviceId: () => "dev-1",
			subscribeFn,
			onData: vi.fn(),
			onResubscribe: () => order.push("onResubscribe"),
		});
		sub.ensure();
		expect(order).toEqual(["onResubscribe", "subscribeFn"]);
	});

	it("does not call onResubscribe on a no-op ensure()", () => {
		const onResubscribe = vi.fn();
		const hass = { connection: {} };
		const sub = new DeviceSubscription<unknown>({
			getHass: () => hass,
			getDeviceId: () => "dev-1",
			subscribeFn: makeSubscribeFn().subscribeFn,
			onData: vi.fn(),
			onResubscribe,
		});
		sub.ensure();
		onResubscribe.mockClear();
		sub.ensure();
		expect(onResubscribe).not.toHaveBeenCalled();
	});

	it("does not call onResubscribe on teardown (wanted -> not wanted)", () => {
		const onResubscribe = vi.fn();
		let deviceId: string | undefined = "dev-1";
		const sub = new DeviceSubscription<unknown>({
			getHass: () => ({ connection: {} }),
			getDeviceId: () => deviceId,
			subscribeFn: makeSubscribeFn().subscribeFn,
			onData: vi.fn(),
			onResubscribe,
		});
		sub.ensure();
		onResubscribe.mockClear();
		deviceId = undefined;
		sub.ensure();
		expect(onResubscribe).not.toHaveBeenCalled();
	});

	it("dispose() unsubscribes and nulls internal state so a later ensure() re-subscribes fresh", () => {
		const { subscribeFn, unsubs } = makeSubscribeFn();
		const hass = { connection: {} };
		const sub = new DeviceSubscription<unknown>({
			getHass: () => hass,
			getDeviceId: () => "dev-1",
			subscribeFn,
			onData: vi.fn(),
		});
		sub.ensure();
		sub.dispose();
		expect(unsubs[0]).toHaveBeenCalledTimes(1);
		sub.ensure();
		expect(subscribeFn).toHaveBeenCalledTimes(2);
	});

	it("dispose() is safe to call when never subscribed", () => {
		const sub = new DeviceSubscription<unknown>({
			getHass: () => undefined,
			getDeviceId: () => undefined,
			subscribeFn: makeSubscribeFn().subscribeFn,
			onData: vi.fn(),
		});
		expect(() => sub.dispose()).not.toThrow();
	});

	it("defaults enabled to true when not provided", () => {
		const { subscribeFn } = makeSubscribeFn();
		const sub = new DeviceSubscription<unknown>({
			getHass: () => ({ connection: {} }),
			getDeviceId: () => "dev-1",
			subscribeFn,
			onData: vi.fn(),
		});
		sub.ensure();
		expect(subscribeFn).toHaveBeenCalledTimes(1);
	});
});
