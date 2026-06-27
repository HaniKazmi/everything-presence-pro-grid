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

	it("hides the presence section when presenceKeys is empty array", async () => {
		const el = await mount({ presenceKeys: [] });
		// The presence section header is gone entirely.
		expect(headers(el)).not.toContain("live.presence");
		// All five presence sensor labels are gone (default localize returns
		// the raw translation key, so we assert against those keys).
		const labels = [
			...el.shadowRoot!.querySelectorAll(".live-sensor-label"),
		].map((n) => (n.textContent ?? "").trim());
		for (const presenceKey of [
			"live.occupancy",
			"live.static_presence",
			"live.motion_presence",
			"live.target_presence",
			"live.mmwave",
		]) {
			expect(labels).not.toContain(presenceKey);
		}
	});

	it("shows only the occupancy row when presenceKeys is ['occupancy']", async () => {
		const el = await mount({ presenceKeys: ["occupancy"] });
		// The presence section header must still show.
		expect(headers(el)).toContain("live.presence");
		const labels = [
			...el.shadowRoot!.querySelectorAll(".live-sensor-label"),
		].map((n) => (n.textContent ?? "").trim());
		// occupancy row must be present
		expect(labels).toContain("live.occupancy");
		// the other four presence rows must NOT be present
		for (const presenceKey of [
			"live.static_presence",
			"live.motion_presence",
			"live.target_presence",
			"live.mmwave",
		]) {
			expect(labels).not.toContain(presenceKey);
		}
	});

	it("shows all five presence rows when presenceKeys is null (default)", async () => {
		const el = await mount({ presenceKeys: null });
		expect(headers(el)).toContain("live.presence");
		const labels = [
			...el.shadowRoot!.querySelectorAll(".live-sensor-label"),
		].map((n) => (n.textContent ?? "").trim());
		for (const presenceKey of [
			"live.occupancy",
			"live.static_presence",
			"live.motion_presence",
			"live.target_presence",
			"live.mmwave",
		]) {
			expect(labels).toContain(presenceKey);
		}
	});

	it("hides the zones section when showZones is false", async () => {
		const el = await mount({ showZones: false });
		// With presence + environment still on, exactly two headers remain.
		expect(headers(el)).toEqual(["live.presence", "live.environment"]);
		expect(headers(el)).not.toContain("sidebar.detection_zones");
	});

	it("hides the zones section when hasPerspective is false even with showZones true", async () => {
		// showZones && hasPerspective gate: no perspective => no zone section.
		const el = await mount({ hasPerspective: false, showZones: true });
		expect(headers(el)).not.toContain("sidebar.detection_zones");
		// No zone-header link, and no rest-of-room / zone rows rendered.
		expect(el.shadowRoot!.querySelector("button.live-section-link")).toBeNull();
		const labels = [
			...el.shadowRoot!.querySelectorAll(".live-sensor-label"),
		].map((n) => (n.textContent ?? "").trim());
		expect(labels).not.toContain("sidebar.rest_of_room");
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
		// The zone section content must still render (non-interactive branch
		// must keep zoneDefs.map — dropping it would be a regression). The
		// rest-of-room row is the zone-specific row that proves it.
		expect(headers(el)).toContain("sidebar.detection_zones");
		const labels = [
			...el.shadowRoot!.querySelectorAll(".live-sensor-label"),
		].map((n) => (n.textContent ?? "").trim());
		expect(labels).toContain("sidebar.rest_of_room");
		expect(
			el.shadowRoot!.querySelectorAll(".live-sensor-row").length,
		).toBeGreaterThan(0);
	});
});
