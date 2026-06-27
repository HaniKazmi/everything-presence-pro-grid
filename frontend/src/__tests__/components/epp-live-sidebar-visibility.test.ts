import { describe, expect, it } from "vitest";
import "../../components/epp-live-sidebar.js";
import type { EppLiveSidebar } from "../../components/epp-live-sidebar.js";

function sensors() {
	return {
		occupancy: true,
		static_presence: false,
		motion_presence: false,
		target_presence: false,
		mmwave: false,
		illuminance: 100,
		temperature: 22,
		humidity: 50,
		co2: 400,
	};
}

async function mount(props: Partial<EppLiveSidebar>): Promise<EppLiveSidebar> {
	const el = document.createElement("epp-live-sidebar") as EppLiveSidebar;
	el.sensorState = sensors() as any;
	el.zoneState = { occupancy: {}, target_counts: {}, frame_count: 0 } as any;
	el.hasPerspective = true;
	Object.assign(el, props);
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

function headers(el: EppLiveSidebar): string[] {
	return [...el.shadowRoot!.querySelectorAll(".live-section-header")].map((n) =>
		(n.textContent ?? "").trim(),
	);
}

describe("epp-live-sidebar visibility props", () => {
	it("shows presence, zones, environment by default", async () => {
		const el = await mount({});
		expect(headers(el).length).toBeGreaterThanOrEqual(3);
	});

	it("hides the presence section when showPresence is false", async () => {
		const el = await mount({ showPresence: false });
		const rows = el.shadowRoot!.querySelectorAll(".live-sensor-row");
		// occupancy/static/motion/target/mmwave rows are gone; env rows remain
		expect([...rows].some((r) => r.textContent?.includes("Occupancy"))).toBe(
			false,
		);
	});

	it("hides the zones section when showZones is false", async () => {
		const elBefore = await mount({});
		const withZones = headers(elBefore).length;
		const el = await mount({ showZones: false });
		expect(headers(el).length).toBeLessThan(withZones);
	});

	it("filters environment to envKeys", async () => {
		const el = await mount({ envKeys: ["temperature"] });
		const values = [
			...el.shadowRoot!.querySelectorAll(".live-sensor-value"),
		].map((n) => n.textContent ?? "");
		expect(values.length).toBe(1);
	});

	it("renders the zone header as a plain label (no button) when interactive is false", async () => {
		const el = await mount({ interactive: false });
		expect(el.shadowRoot!.querySelector("button.live-section-link")).toBeNull();
	});
});
