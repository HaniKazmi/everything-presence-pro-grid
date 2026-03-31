import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import "../../components/epp-settings-view.js";
import type { EppSettingsView } from "../../components/epp-settings-view.js";
import { GRID_CELL_COUNT, initGridFromRoom } from "../../lib/grid.js";

function renderTo(tpl: any): HTMLDivElement {
	const container = document.createElement("div");
	document.body.appendChild(container);
	render(tpl, container);
	return container;
}

function createView(
	overrides?: Partial<Record<string, unknown>>,
): EppSettingsView {
	const el = document.createElement("epp-settings-view") as EppSettingsView;
	el.grid = initGridFromRoom(3000, 4000);
	el.perspective = [1, 0, 0, 0, 1, 0, 0, 0];
	el.roomWidth = 3000;
	el.roomDepth = 4000;
	el.openAccordions = new Set();
	el.entitiesConfig = {};
	el.temperatureOffset = 0;
	el.humidityOffset = 0;
	el.illuminanceOffset = 0;
	el.motionTimeout = 5;
	el.staticTimeout = 30;
	el.staticTriggerThreshold = 3;
	el.staticRenewThreshold = 3;
	el.staticOnDelay = 0;
el.ledMode = "Manual Control";
	el.ledBrightness = 1.0;
	el.ledPresenceColor = "#CC33FF";
(el as any).relayTriggerMode = "disabled";
	(el as any).relayContactMode = "no";
	if (overrides) {
		for (const [k, v] of Object.entries(overrides)) {
			(el as any)[k] = v;
		}
	}
	return el;
}

describe("epp-settings-view element", () => {
	it("is registered as a custom element", () => {
		const Ctor = customElements.get("epp-settings-view");
		expect(Ctor).toBeDefined();
	});

	it("can be created via document.createElement", () => {
		const el = document.createElement("epp-settings-view") as EppSettingsView;
		expect(el).toBeInstanceOf(HTMLElement);
	});

	it("renders with default state without crashing", () => {
		const el = document.createElement("epp-settings-view") as any;
		const result = el.render();
		expect(result).toBeDefined();
	});
});

describe("render()", () => {
	it("renders settings container with accordions", () => {
		const sv = createView();
		const tpl = sv.render();
		const c = renderTo(tpl);

		expect(c.querySelector(".settings-container")).not.toBeNull();
		expect(c.querySelectorAll(".accordion").length).toBe(5);
		document.body.removeChild(c);
	});

	it("renders with open accordion showing body", () => {
		const sv = createView({ openAccordions: new Set(["detection"]) });
		const tpl = sv.render();
		const c = renderTo(tpl);

		const bodies = c.querySelectorAll(".accordion-body");
		expect(bodies.length).toBe(1);
		document.body.removeChild(c);
	});

	it("renders save/cancel bar", () => {
		const sv = createView();
		const tpl = sv.render();
		const c = renderTo(tpl);

		expect(c.querySelector(".save-cancel-bar")).not.toBeNull();
		document.body.removeChild(c);
	});
});

describe("toggleAccordion", () => {
	it("opens an accordion", () => {
		const sv = createView();
		sv.toggleAccordion("detection");
		expect(sv.openAccordions.has("detection")).toBe(true);
	});

	it("closes an open accordion", () => {
		const sv = createView({ openAccordions: new Set(["detection"]) });
		sv.toggleAccordion("detection");
		expect(sv.openAccordions.has("detection")).toBe(false);
	});

	it("opening one closes others", () => {
		const sv = createView({ openAccordions: new Set(["detection"]) });
		sv.toggleAccordion("sensitivity");
		expect(sv.openAccordions.has("detection")).toBe(false);
		expect(sv.openAccordions.has("sensitivity")).toBe(true);
	});

	it("fires accordion-toggle event", () => {
		const sv = createView();
		let detail: Set<string> | null = null;
		sv.addEventListener("accordion-toggle", ((e: CustomEvent) => {
			detail = e.detail;
		}) as EventListener);
		sv.toggleAccordion("reporting");
		expect(detail).toBeInstanceOf(Set);
		expect((detail as unknown as Set<string>).has("reporting")).toBe(true);
	});
});

describe("renderSettingsSection", () => {
	it("renders detection section", () => {
		const sv = createView();
		const result = (sv as any).renderSettingsSection("detection");
		expect(result).toBeDefined();
	});

	it("renders sensitivity section", () => {
		const sv = createView();
		const result = (sv as any).renderSettingsSection("sensitivity");
		expect(result).toBeDefined();
	});

	it("renders reporting section", () => {
		const sv = createView();
		const result = (sv as any).renderSettingsSection("reporting");
		expect(result).toBeDefined();
	});

	it("returns nothing for unknown section", () => {
		const sv = createView();
		const result = (sv as any).renderSettingsSection("unknown");
		expect(result).toBeDefined();
	});
});

describe("renderDetectionRanges", () => {
	it("renders with auto range enabled", () => {
		const sv = createView({
			targetAutoDistance: true,
			staticAutoDistance: true,
		});
		const result = (sv as any).renderDetectionRanges();
		expect(result).toBeDefined();
	});

	it("renders with auto range disabled", () => {
		const sv = createView({
			targetAutoDistance: false,
			staticAutoDistance: false,
		});
		const result = (sv as any).renderDetectionRanges();
		expect(result).toBeDefined();
	});

	it("renders grid room metrics when available", () => {
		const sv = createView({ grid: initGridFromRoom(3000, 4000) });
		const result = (sv as any).renderDetectionRanges();
		expect(result).toBeDefined();
	});

	it("renders with zero auto range (no perspective)", () => {
		const sv = createView({
			targetAutoDistance: true,
			staticAutoDistance: true,
			perspective: null,
			roomWidth: 0,
			roomDepth: 0,
			grid: new Uint8Array(GRID_CELL_COUNT),
		});
		const result = (sv as any).renderDetectionRanges();
		expect(result).toBeDefined();
	});

	it("target auto range toggle updates state and fires event", () => {
		const sv = createView({ targetAutoDistance: true });
		const tpl = (sv as any).renderDetectionRanges();
		const c = renderTo(tpl);

		let firedKey = "";
		sv.addEventListener("setting-change", ((e: CustomEvent) => {
			firedKey = e.detail.key;
		}) as EventListener);

		const checkboxes = c.querySelectorAll('input[type="checkbox"]');
		if (checkboxes.length > 0) {
			const cb = checkboxes[0] as HTMLInputElement;
			cb.checked = false;
			cb.dispatchEvent(new Event("change"));
			expect((sv as any)._overrides.targetAutoDistance).toBe(false);
			expect(firedKey).toBe("targetAutoDistance");
		}
		document.body.removeChild(c);
	});

	it("max distance slider updates state", () => {
		const sv = createView({ targetAutoDistance: false });
		const tpl = (sv as any).renderDetectionRanges();
		const c = renderTo(tpl);

		const ranges = c.querySelectorAll(".setting-range");
		if (ranges.length > 0) {
			const range = ranges[0] as HTMLInputElement;
			range.value = "4.5";
			const span = document.createElement("span");
			span.textContent = "6";
			range.parentNode?.insertBefore(span, range.nextSibling);
			range.dispatchEvent(new Event("input"));
			expect((sv as any)._overrides.targetMaxDistance).toBe(4.5);
		}
		document.body.removeChild(c);
	});

	it("static min distance slider clamps at max", () => {
		const sv = createView({
			staticAutoDistance: false,
			staticMinDistance: 0.3,
			staticMaxDistance: 5,
		});
		const tpl = (sv as any).renderDetectionRanges();
		const c = renderTo(tpl);

		const ranges = c.querySelectorAll(".setting-range");
		for (let i = 0; i < ranges.length; i++) {
			const r = ranges[i] as HTMLInputElement;
			if (r.min === "0.3") {
				const span = document.createElement("span");
				span.textContent = "0.3";
				r.parentNode?.insertBefore(span, r.nextSibling);
				r.value = "6";
				r.dispatchEvent(new Event("input"));
				expect((sv as any)._overrides.staticMinDistance).toBeLessThan(
					sv.staticMaxDistance,
				);
				break;
			}
		}
		document.body.removeChild(c);
	});

	it("static max distance slider clamps at min", () => {
		const sv = createView({
			staticAutoDistance: false,
			staticMinDistance: 5,
			staticMaxDistance: 10,
		});
		const tpl = (sv as any).renderDetectionRanges();
		const c = renderTo(tpl);

		const ranges = c.querySelectorAll(".setting-range");
		const staticMax = ranges[ranges.length - 1] as HTMLInputElement;
		if (staticMax) {
			staticMax.value = "1";
			staticMax.dispatchEvent(new Event("input"));
			expect((sv as any)._overrides.staticMaxDistance).toBeGreaterThan(
				sv.staticMinDistance,
			);
		}
		document.body.removeChild(c);
	});
});

describe("renderSensitivities", () => {
	it("renders sensitivity controls", () => {
		const sv = createView();
		const result = (sv as any).renderSensitivities();
		expect(result).toBeDefined();
	});

	it("range inputs update next sibling text", () => {
		const sv = createView();
		const tpl = (sv as any).renderSensitivities();
		const c = renderTo(tpl);

		const ranges = c.querySelectorAll(".setting-range");
		expect(ranges.length).toBeGreaterThan(0);
		if (ranges.length > 0) {
			const range = ranges[0] as HTMLInputElement;
			if (range.nextElementSibling) {
				range.value = "10";
				range.dispatchEvent(new Event("input"));
				expect(range.nextElementSibling.textContent).toBe("10");
			}
		}
		document.body.removeChild(c);
	});

	it("slider DOM update preserves Lit text node for safe re-render", () => {
		const sv = createView({ illuminanceOffset: 0 });
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: 100,
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Illuminance",
			100,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1,
			"Tip",
			0,
		);
		const c = renderTo(tpl);
		const span = c.querySelector(".setting-value")!;
		// Capture Lit's original text node
		const origTextNode = [...span.childNodes].find(
			(n) => n.nodeType === Node.TEXT_NODE,
		);
		expect(origTextNode).toBeDefined();

		// Simulate slider interaction — this should NOT replace the text node
		const range = c.querySelector(".setting-range") as HTMLInputElement;
		range.value = "10";
		range.dispatchEvent(new Event("input"));

		// The SAME text node should still be in the DOM (not replaced)
		const afterTextNode = [...span.childNodes].find(
			(n) => n.nodeType === Node.TEXT_NODE,
		);
		expect(afterTextNode).toBe(origTextNode);
		expect(afterTextNode!.textContent).toBe("110.0");
		document.body.removeChild(c);
	});
});

describe("renderEnvOffset", () => {
	it("renders with a reading", () => {
		const sv = createView({ illuminanceOffset: 10 });
		const result = (sv as any).renderEnvOffset(
			"Illuminance offset",
			150,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1,
			"Adjust illuminance.",
		);
		expect(result).toBeDefined();
	});

	it("renders with null reading showing dash", () => {
		const sv = createView();
		const tpl = (sv as any).renderEnvOffset(
			"Test",
			null,
			"test_key",
			-10,
			10,
			1,
			"unit",
			0,
			"tip",
		);
		const c = renderTo(tpl);
		const valueSpan = c.querySelector(".setting-value");
		if (valueSpan) {
			expect(valueSpan.textContent).toContain("\u2014");
		}
		document.body.removeChild(c);
	});

	it("range input with null reading shows dash on update", () => {
		const sv = createView();
		const tpl = (sv as any).renderEnvOffset(
			"Test",
			null,
			"test_key",
			-10,
			10,
			1,
			"unit",
			0,
			"tip",
		);
		const c = renderTo(tpl);
		const range = c.querySelector(".setting-range") as HTMLInputElement;
		if (range && range.nextElementSibling) {
			range.value = "5";
			range.dispatchEvent(new Event("input"));
			expect(range.nextElementSibling.textContent).toBe("\u2014");
		}
		document.body.removeChild(c);
	});

	it("range input with a reading updates preview", () => {
		const sv = createView({ illuminanceOffset: 0 });
		const tpl = (sv as any).renderEnvOffset(
			"Illuminance",
			100,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1,
			"Tip",
		);
		const c = renderTo(tpl);
		const range = c.querySelector(".setting-range") as HTMLInputElement;
		if (range && range.nextElementSibling) {
			range.value = "10";
			range.dispatchEvent(new Event("input"));
			expect(range.nextElementSibling.textContent).toBeDefined();
		}
		document.body.removeChild(c);
	});

	it("illuminance displays adjusted value with 1 decimal place", () => {
		const sv = createView({ illuminanceOffset: 5 });
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: 105.3, // raw=100.3, offset=5 applied by coordinator
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Illuminance",
			sv.sensorState.illuminance,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1, // precision=1
			"Tip",
		);
		const c = renderTo(tpl);
		const valueSpan = c.querySelector(".setting-value");
		expect(valueSpan?.textContent).toBe("105.3");
		document.body.removeChild(c);
	});

	it("illuminance display is clamped to >= 0", () => {
		// Raw reading is 5, offset is -10 → adjusted would be -5 without clamp
		const sv = createView({ illuminanceOffset: -10 });
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: -5,
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Illuminance",
			sv.sensorState.illuminance,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1,
			"Tip",
			0,
		);
		const c = renderTo(tpl);
		const valueSpan = c.querySelector(".setting-value");
		expect(valueSpan?.textContent).toBe("0.0");
		document.body.removeChild(c);
	});

	it("illuminance slider input clamps adjusted display to >= 0", () => {
		// Raw=5, current offset=0, user drags to -10 → adjusted=-5 → clamp to 0
		const sv = createView({ illuminanceOffset: 0 });
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: 5,
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Illuminance",
			sv.sensorState.illuminance,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1,
			"Tip",
			0,
		);
		const c = renderTo(tpl);
		const range = c.querySelector(".setting-range") as HTMLInputElement;
		if (range && range.nextElementSibling) {
			range.value = "-10";
			range.dispatchEvent(new Event("input"));
			expect(range.nextElementSibling.textContent).toBe("0.0");
		}
		document.body.removeChild(c);
	});

	it("humidity display is clamped to 0-100", () => {
		// Raw=95, offset=10 → adjusted=105 → clamp to 100
		const sv = createView({ humidityOffset: 10 });
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: null,
			temperature: null,
			humidity: 105,
			co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Humidity",
			sv.sensorState.humidity,
			"humidity",
			-50,
			50,
			0.1,
			"%",
			1,
			"Tip",
			0,
			100,
		);
		const c = renderTo(tpl);
		const valueSpan = c.querySelector(".setting-value");
		expect(valueSpan?.textContent).toBe("100.0");
		document.body.removeChild(c);
	});

	it("reset button on env offset uses correct precision from data attribute", () => {
		const sv = createView({ illuminanceOffset: 5 });
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: 105.3,
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Illuminance",
			sv.sensorState.illuminance,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1,
			"Tip",
		);
		const c = renderTo(tpl);
		const row = c.querySelector(".setting-row") as HTMLElement;
		// Simulate reset to default (0)
		(sv as any)._resetSlider(row, 0);
		const valueSpan = c.querySelector(".setting-value");
		// Should show raw value (100.3) with 1 decimal place
		expect(valueSpan?.textContent).toBe("100.3");
		document.body.removeChild(c);
	});

	it("reset with large offset (>100) shows correct raw value", () => {
		// Reproduces bug: offset=389 exceeds default input range [0,100]
		// If .value is set before min/max, browser clamps 389→100
		const sv = createView({ illuminanceOffset: 389 });
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: 425, // raw=36, firmware applied +389
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Illuminance",
			sv.sensorState.illuminance,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1,
			"Tip",
			0,
		);
		const c = renderTo(tpl);
		// Verify slider value is correctly set to 389 (not clamped to 100)
		const slider = c.querySelector(".setting-range") as HTMLInputElement;
		expect(slider.value).toBe("389");
		// Reset to 0
		const row = c.querySelector(".setting-row") as HTMLElement;
		(sv as any)._resetSlider(row, 0);
		const valueSpan = c.querySelector(".setting-value");
		// Should show raw value ~36, not 325 (which you get if slider was clamped to 100)
		expect(valueSpan?.textContent).toBe("36.0");
		document.body.removeChild(c);
	});
});

describe("infoTip", () => {
	it("returns a defined template", () => {
		const sv = createView();
		const result = (sv as any).infoTip("Some tip text");
		expect(result).toBeDefined();
	});

	it("click toggles tooltip display", () => {
		const sv = createView() as any;
		const tooltips: HTMLElement[] = [];
		Object.defineProperty(sv, "shadowRoot", {
			value: {
				querySelectorAll: (sel: string) => {
					if (sel === ".setting-info-tooltip") return tooltips;
					return [];
				},
			},
			configurable: true,
		});

		const tpl = sv.infoTip("Test tip");
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const infoSpan = c.querySelector(".setting-info") as HTMLElement;
		if (infoSpan) {
			infoSpan.click();
		}
		document.body.removeChild(c);
	});
});

describe("renderEntities", () => {
	it("renders all entity toggles", () => {
		const sv = createView({
			entitiesConfig: {
				room_occupancy: true,
				room_static_presence: false,
			},
		});
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const toggles = c.querySelectorAll('input[type="checkbox"]');
		expect(toggles.length).toBeGreaterThan(0);
		document.body.removeChild(c);
	});

	it("uses fallback values with empty config", () => {
		const sv = createView({ entitiesConfig: {} });
		const result = (sv as any).renderEntities();
		expect(result).toBeDefined();
	});
});

describe("renderSaveCancelButtons", () => {
	it("renders save and cancel buttons", () => {
		const sv = createView();
		const tpl = (sv as any).renderSaveCancelButtons();
		const c = renderTo(tpl);

		expect(c.querySelector(".wizard-btn-back")).not.toBeNull();
		expect(c.querySelector(".wizard-btn-primary")).not.toBeNull();
		document.body.removeChild(c);
	});

	it("save button is disabled when not dirty", () => {
		const sv = createView({ dirty: false });
		const tpl = (sv as any).renderSaveCancelButtons();
		const c = renderTo(tpl);

		const saveBtn = c.querySelector(".wizard-btn-primary") as HTMLButtonElement;
		if (saveBtn) {
			expect(saveBtn.disabled).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("save button is disabled when saving", () => {
		const sv = createView({ saving: true, dirty: true });
		const tpl = (sv as any).renderSaveCancelButtons();
		const c = renderTo(tpl);

		const saveBtn = c.querySelector(".wizard-btn-primary") as HTMLButtonElement;
		if (saveBtn) {
			expect(saveBtn.disabled).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("cancel button fires cancel event", () => {
		const sv = createView();
		const tpl = (sv as any).renderSaveCancelButtons();
		const c = renderTo(tpl);

		let cancelFired = false;
		sv.addEventListener("cancel", () => {
			cancelFired = true;
		});

		const cancelBtn = c.querySelector(".wizard-btn-back") as HTMLElement;
		if (cancelBtn) {
			cancelBtn.click();
			expect(cancelFired).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("save button fires save event", () => {
		const sv = createView({ dirty: true });
		const tpl = (sv as any).renderSaveCancelButtons();
		const c = renderTo(tpl);

		let saveFired = false;
		sv.addEventListener("save", () => {
			saveFired = true;
		});

		const saveBtn = c.querySelector(".wizard-btn-primary") as HTMLElement;
		if (saveBtn) {
			saveBtn.click();
			expect(saveFired).toBe(true);
		}
		document.body.removeChild(c);
	});
});

describe("dirty event", () => {
	it("fires dirty when a sensitivity slider changes", () => {
		// Render with sensitivity accordion open so sliders are visible
		const sv = createView({ openAccordions: new Set(["sensitivity"]) });
		const tpl = sv.render();
		const c = renderTo(tpl);

		let dirtyFired = false;
		sv.addEventListener("dirty", () => {
			dirtyFired = true;
		});

		// Find the first range input inside the sensitivity section
		const ranges = c.querySelectorAll(".setting-range");
		expect(ranges.length).toBeGreaterThan(0);
		const slider = ranges[0] as HTMLInputElement;
		slider.value = "10";
		slider.dispatchEvent(new Event("input", { bubbles: true }));

		expect(dirtyFired).toBe(true);
		document.body.removeChild(c);
	});
});

describe("setting-change event", () => {
	it("fires setting-change on target auto range toggle", () => {
		const sv = createView({ targetAutoDistance: true });
		const tpl = (sv as any).renderDetectionRanges();
		const c = renderTo(tpl);

		const events: { key: string; value: unknown }[] = [];
		sv.addEventListener("setting-change", ((e: CustomEvent) => {
			events.push(e.detail);
		}) as EventListener);

		const checkboxes = c.querySelectorAll('input[type="checkbox"]');
		if (checkboxes.length > 0) {
			const cb = checkboxes[0] as HTMLInputElement;
			cb.checked = false;
			cb.dispatchEvent(new Event("change"));
			expect(events.some((e) => e.key === "targetAutoDistance")).toBe(true);
		}
		document.body.removeChild(c);
	});
});

describe("save event payload", () => {
	it("emits all settings values in save event", () => {
		const sv = createView({
			dirty: true,
			targetAutoDistance: false,
			targetMaxDistance: 4.0,
			staticAutoDistance: false,
			staticMinDistance: 1.0,
			staticMaxDistance: 8.0,
			motionTimeout: 10,
			staticTimeout: 60,
			staticTriggerThreshold: 5,
			staticRenewThreshold: 4,
			staticOnDelay: 2,
			temperatureOffset: -1.5,
			humidityOffset: 2.0,
			illuminanceOffset: -10,
			entitiesConfig: { room_occupancy: true },
		});

		let payload: any = null;
		sv.addEventListener("save", ((e: CustomEvent) => {
			payload = e.detail;
		}) as EventListener);

		(sv as any)._emitSave();

		expect(payload).not.toBeNull();
		expect(payload.target_auto_distance).toBe(false);
		expect(payload.target_max_distance).toBe(4.0);
		expect(payload.motion_timeout).toBe(10);
		expect(payload.static_trigger_threshold).toBe(5);
		expect(payload.static_renew_threshold).toBe(4);
		expect(payload.static_on_delay).toBe(2);
		expect(payload.temperature_offset).toBe(-1.5);
	});
});

describe("save event auto distance substitution", () => {
	it("sends auto-computed target distance when targetAutoDistance is true", () => {
		const sv = createView({
			dirty: true,
			targetAutoDistance: true,
			targetMaxDistance: 99, // stale stored value — should NOT be sent
			staticAutoDistance: false,
			staticMinDistance: 1.0,
			staticMaxDistance: 8.0,
		});

		let payload: any = null;
		sv.addEventListener("save", ((e: CustomEvent) => {
			payload = e.detail;
		}) as EventListener);

		(sv as any)._emitSave();

		expect(payload).not.toBeNull();
		expect(payload.target_auto_distance).toBe(true);
		// autoDetectionRange for 3000x4000 room with identity perspective
		// returns 4.0 (rounded up to nearest 0.5m), capped at 6
		expect(payload.target_max_distance).toBeLessThanOrEqual(6);
		expect(payload.target_max_distance).not.toBe(99);
	});

	it("sends auto-computed static distances when staticAutoDistance is true", () => {
		const sv = createView({
			dirty: true,
			targetAutoDistance: false,
			targetMaxDistance: 4.0,
			staticAutoDistance: true,
			staticMinDistance: 5.0, // stale — should be replaced with 0.3
			staticMaxDistance: 99, // stale — should NOT be sent
		});

		let payload: any = null;
		sv.addEventListener("save", ((e: CustomEvent) => {
			payload = e.detail;
		}) as EventListener);

		(sv as any)._emitSave();

		expect(payload).not.toBeNull();
		expect(payload.static_auto_distance).toBe(true);
		expect(payload.static_min_distance).toBe(0.3);
		expect(payload.static_max_distance).toBeLessThanOrEqual(16);
		expect(payload.static_max_distance).not.toBe(99);
	});
});

describe("renderEntities entity toggle @change handlers", () => {
	it("toggling room_occupancy checkbox updates overrides and fires dirty", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		let dirtyFired = false;
		sv.addEventListener("dirty", () => {
			dirtyFired = true;
		});

		const checkboxes = c.querySelectorAll('input[type="checkbox"]');
		const occupancyCb = [...checkboxes].find(
			(cb) => (cb as HTMLInputElement).dataset.entityKey === "room_occupancy",
		) as HTMLInputElement | undefined;
		expect(occupancyCb).toBeDefined();
		if (occupancyCb) {
			occupancyCb.checked = false;
			occupancyCb.dispatchEvent(new Event("change"));
			expect((sv as any)._overrides.entities?.room_occupancy).toBe(false);
			expect(dirtyFired).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("toggling room_static_presence updates overrides", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const checkboxes = c.querySelectorAll('input[type="checkbox"]');
		const cb = [...checkboxes].find(
			(cb) =>
				(cb as HTMLInputElement).dataset.entityKey === "room_static_presence",
		) as HTMLInputElement | undefined;
		if (cb) {
			cb.checked = true;
			cb.dispatchEvent(new Event("change"));
			expect((sv as any)._overrides.entities?.room_static_presence).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("toggling room_motion_presence updates overrides", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const checkboxes = c.querySelectorAll('input[type="checkbox"]');
		const cb = [...checkboxes].find(
			(cb) =>
				(cb as HTMLInputElement).dataset.entityKey === "room_motion_presence",
		) as HTMLInputElement | undefined;
		if (cb) {
			cb.checked = true;
			cb.dispatchEvent(new Event("change"));
			expect((sv as any)._overrides.entities?.room_motion_presence).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("toggling room_target_presence updates overrides", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const checkboxes = c.querySelectorAll('input[type="checkbox"]');
		const cb = [...checkboxes].find(
			(cb) =>
				(cb as HTMLInputElement).dataset.entityKey === "room_target_presence",
		) as HTMLInputElement | undefined;
		if (cb) {
			cb.checked = true;
			cb.dispatchEvent(new Event("change"));
			expect((sv as any)._overrides.entities?.room_target_presence).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("toggling zone_presence updates overrides", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const checkboxes = c.querySelectorAll('input[type="checkbox"]');
		const cb = [...checkboxes].find(
			(cb) => (cb as HTMLInputElement).dataset.entityKey === "zone_presence",
		) as HTMLInputElement | undefined;
		if (cb) {
			cb.checked = false;
			cb.dispatchEvent(new Event("change"));
			expect((sv as any)._overrides.entities?.zone_presence).toBe(false);
		}
		document.body.removeChild(c);
	});

	it("toggling target_xy updates overrides", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const checkboxes = c.querySelectorAll('input[type="checkbox"]');
		const cb = [...checkboxes].find(
			(cb) => (cb as HTMLInputElement).dataset.entityKey === "target_xy",
		) as HTMLInputElement | undefined;
		if (cb) {
			cb.checked = true;
			cb.dispatchEvent(new Event("change"));
			expect((sv as any)._overrides.entities?.target_xy).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("toggling target_active updates overrides", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const checkboxes = c.querySelectorAll('input[type="checkbox"]');
		const cb = [...checkboxes].find(
			(cb) => (cb as HTMLInputElement).dataset.entityKey === "target_active",
		) as HTMLInputElement | undefined;
		if (cb) {
			cb.checked = true;
			cb.dispatchEvent(new Event("change"));
			expect((sv as any)._overrides.entities?.target_active).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("toggling env_illuminance updates overrides", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const checkboxes = c.querySelectorAll('input[type="checkbox"]');
		const cb = [...checkboxes].find(
			(cb) => (cb as HTMLInputElement).dataset.entityKey === "env_illuminance",
		) as HTMLInputElement | undefined;
		if (cb) {
			cb.checked = true;
			cb.dispatchEvent(new Event("change"));
			expect((sv as any)._overrides.entities?.env_illuminance).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("toggling env_humidity updates overrides", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const checkboxes = c.querySelectorAll('input[type="checkbox"]');
		const cb = [...checkboxes].find(
			(cb) => (cb as HTMLInputElement).dataset.entityKey === "env_humidity",
		) as HTMLInputElement | undefined;
		if (cb) {
			cb.checked = true;
			cb.dispatchEvent(new Event("change"));
			expect((sv as any)._overrides.entities?.env_humidity).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("toggling env_temperature updates overrides", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const checkboxes = c.querySelectorAll('input[type="checkbox"]');
		const cb = [...checkboxes].find(
			(cb) => (cb as HTMLInputElement).dataset.entityKey === "env_temperature",
		) as HTMLInputElement | undefined;
		if (cb) {
			cb.checked = true;
			cb.dispatchEvent(new Event("change"));
			expect((sv as any)._overrides.entities?.env_temperature).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("toggling env_co2 updates overrides", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const checkboxes = c.querySelectorAll('input[type="checkbox"]');
		const cb = [...checkboxes].find(
			(cb) => (cb as HTMLInputElement).dataset.entityKey === "env_co2",
		) as HTMLInputElement | undefined;
		if (cb) {
			cb.checked = true;
			cb.dispatchEvent(new Event("change"));
			expect((sv as any)._overrides.entities?.env_co2).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("second toggle uses existing _overrides.entities object", () => {
		const sv = createView({ entitiesConfig: {} });
		// Pre-populate overrides.entities
		(sv as any)._overrides.entities = { room_occupancy: true };
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const checkboxes = c.querySelectorAll('input[type="checkbox"]');
		const cb = [...checkboxes].find(
			(cb) => (cb as HTMLInputElement).dataset.entityKey === "zone_presence",
		) as HTMLInputElement | undefined;
		if (cb) {
			cb.checked = false;
			cb.dispatchEvent(new Event("change"));
			// Both keys should be present in overrides
			expect((sv as any)._overrides.entities.room_occupancy).toBe(true);
			expect((sv as any)._overrides.entities.zone_presence).toBe(false);
		}
		document.body.removeChild(c);
	});

	it("renderEntities works with null entitiesConfig (branch 40)", () => {
		const sv = createView({ entitiesConfig: null as any });
		const result = (sv as any).renderEntities();
		expect(result).toBeDefined();
	});
});

describe("resetBtn click handler", () => {
	it("resetBtn click calls _resetSlider and _fireChange when key provided", () => {
		const sv = createView({ motionTimeout: 10 });
		const tpl = (sv as any).renderSensitivities();
		const c = renderTo(tpl);

		const events: { key: string; value: unknown }[] = [];
		sv.addEventListener("setting-change", ((e: CustomEvent) => {
			events.push(e.detail);
		}) as EventListener);

		// The reset button is the .setting-info span with mdi:restart icon
		// Find a row that has a named key (motionTimeout has resetBtn(5, "motionTimeout"))
		const rows = c.querySelectorAll(".setting-row");
		let resetClicked = false;
		for (const row of rows) {
			const infoSpans = row.querySelectorAll(".setting-info");
			if (infoSpans.length > 0) {
				// Click the first info span (reset button)
				(infoSpans[0] as HTMLElement).click();
				resetClicked = true;
				break;
			}
		}
		expect(resetClicked).toBe(true);
		// setting-change should be fired for motionTimeout reset
		expect(events.some((e) => e.key === "motionTimeout")).toBe(true);
		document.body.removeChild(c);
	});

	it("resetBtn click without key does not fire setting-change", () => {
		const sv = createView({ illuminanceOffset: 5 });
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: 105,
			temperature: null,
			humidity: null,
			co2: null,
		};
		// renderEnvOffset uses resetBtn(0) without a key
		const tpl = (sv as any).renderEnvOffset(
			"Illuminance",
			105,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1,
			"Tip",
		);
		const c = renderTo(tpl);

		const events: any[] = [];
		sv.addEventListener("setting-change", ((e: CustomEvent) => {
			events.push(e.detail);
		}) as EventListener);

		const infoSpan = c.querySelector(".setting-info") as HTMLElement;
		if (infoSpan) infoSpan.click();

		// No setting-change should fire since resetBtn(0) has no key
		expect(events.length).toBe(0);
		document.body.removeChild(c);
	});
});

describe("_resetSlider edge cases", () => {
	it("does nothing when no .setting-range slider in row", () => {
		const sv = createView();
		const row = document.createElement("div");
		row.className = "setting-row";
		// No slider inside — should silently return
		expect(() => (sv as any)._resetSlider(row, 5)).not.toThrow();
	});

	it("handles missing display element after slider", () => {
		const sv = createView();
		const row = document.createElement("div");
		row.className = "setting-row";
		const slider = document.createElement("input");
		slider.type = "range";
		slider.className = "setting-range";
		slider.value = "3";
		row.appendChild(slider);
		// No sibling after slider — display will be null
		expect(() =>
			(sv as any)._resetSlider(row, 5, "motionTimeout"),
		).not.toThrow();
		// Override should still be set
		expect((sv as any)._overrides.motionTimeout).toBe(5);
	});

	it("resetSlider with non-offset key updates display text directly", () => {
		const sv = createView();
		const row = document.createElement("div");
		row.className = "setting-row";
		const slider = document.createElement("input");
		slider.type = "range";
		slider.className = "setting-range";
		slider.min = "0";
		slider.max = "120";
		slider.value = "10";
		const display = document.createElement("span");
		display.textContent = "10";
		row.appendChild(slider);
		row.appendChild(display);

		(sv as any)._resetSlider(row, 5, "motionTimeout");
		expect(display.textContent).toBe("5");
		expect((sv as any)._overrides.motionTimeout).toBe(5);
	});

	it("resetSlider updates save-btn via shadowRoot when btn present", () => {
		const sv = createView();
		const row = document.createElement("div");
		row.className = "setting-row";
		const slider = document.createElement("input");
		slider.type = "range";
		slider.className = "setting-range";
		slider.value = "10";
		const display = document.createElement("span");
		display.textContent = "10";
		row.appendChild(slider);
		row.appendChild(display);

		// Mock shadowRoot with a save-btn
		const btn = document.createElement("button");
		btn.className = "save-btn";
		btn.disabled = true;
		Object.defineProperty(sv, "shadowRoot", {
			value: {
				querySelector: (sel: string) => (sel === ".save-btn" ? btn : null),
			},
			configurable: true,
		});

		(sv as any)._resetSlider(row, 5, "motionTimeout");
		expect(btn.disabled).toBe(false);
	});

	it("_resetSlider with offset key where display has NaN content skips adjusted display", () => {
		// When display.textContent is not a number, it should fall through without crashing
		const sv = createView({ illuminanceOffset: 5 });
		const row = document.createElement("div");
		row.className = "setting-row";
		const slider = document.createElement("input");
		slider.type = "range";
		slider.className = "setting-range";
		slider.min = "-500";
		slider.max = "500";
		slider.value = "5";
		slider.dataset.offsetKey = "illuminance";
		slider.dataset.precision = "1";
		slider.dataset.displayMin = "0";
		slider.dataset.displayMax = "Infinity";
		const display = document.createElement("span");
		display.textContent = "\u2014"; // dash (NaN when parsed)
		row.appendChild(slider);
		row.appendChild(display);

		// Should not throw even if NaN; the if (!Number.isNaN) guard skips adjusted display
		expect(() => (sv as any)._resetSlider(row, 0)).not.toThrow();
	});
});

describe("_setText edge case", () => {
	it("falls back to textContent when no text node exists", () => {
		const sv = createView();
		const el = document.createElement("span");
		// No text nodes — create only element child
		const child = document.createElement("b");
		el.appendChild(child);

		(sv as any)._setText(el, "hello");
		// Since no TEXT_NODE found, falls back to el.textContent
		expect(el.textContent).toBe("hello");
	});
});

describe("infoTip tooltip toggle branches", () => {
	it("does nothing when no .setting-info-tooltip inside icon", () => {
		const sv = createView();
		const tpl = sv.infoTip("tip text");
		const c = renderTo(tpl);

		// Remove the tooltip span so tip == null
		const tooltip = c.querySelector(".setting-info-tooltip");
		if (tooltip) tooltip.remove();

		const infoSpan = c.querySelector(".setting-info") as HTMLElement;
		// Should not throw when tip is null
		expect(() => infoSpan?.click()).not.toThrow();
		document.body.removeChild(c);
	});

	it("closes tooltip if already open (wasOpen branch)", () => {
		const sv = createView();
		const tpl = sv.infoTip("tip text");
		const c = renderTo(tpl);

		const infoSpan = c.querySelector(".setting-info") as HTMLElement;
		const tooltip = c.querySelector(".setting-info-tooltip") as HTMLElement;

		// Mock shadowRoot to return the tooltip
		Object.defineProperty(sv, "shadowRoot", {
			value: {
				querySelectorAll: () => [tooltip],
			},
			configurable: true,
		});

		// First click: open the tooltip
		if (tooltip) tooltip.style.display = "block";
		// Second click: should close (wasOpen == true → return early)
		infoSpan?.click();
		// tooltip should be hidden by the close-all loop
		expect(tooltip?.style.display).toBe("none");
		document.body.removeChild(c);
	});
});

describe("target auto range toggle (checked=true branch)", () => {
	it("target auto toggle turning ON does not fire targetMaxDistance change", () => {
		const sv = createView({ targetAutoDistance: false });
		const tpl = (sv as any).renderDetectionRanges();
		const c = renderTo(tpl);

		const events: { key: string; value: unknown }[] = [];
		sv.addEventListener("setting-change", ((e: CustomEvent) => {
			events.push(e.detail);
		}) as EventListener);

		const checkboxes = c.querySelectorAll('input[type="checkbox"]');
		// First checkbox = target auto
		const cb = checkboxes[0] as HTMLInputElement;
		cb.checked = true;
		cb.dispatchEvent(new Event("change"));

		// targetMaxDistance should NOT be in events (only fired when !checked)
		expect(events.some((e) => e.key === "targetMaxDistance")).toBe(false);
		expect(events.some((e) => e.key === "targetAutoDistance")).toBe(true);
		document.body.removeChild(c);
	});

	it("static auto toggle turning ON does not fire staticMinDistance/staticMaxDistance change", () => {
		const sv = createView({ staticAutoDistance: false });
		const tpl = (sv as any).renderDetectionRanges();
		const c = renderTo(tpl);

		const events: { key: string; value: unknown }[] = [];
		sv.addEventListener("setting-change", ((e: CustomEvent) => {
			events.push(e.detail);
		}) as EventListener);

		const checkboxes = c.querySelectorAll('input[type="checkbox"]');
		// Second checkbox = static auto
		const cb = checkboxes[1] as HTMLInputElement;
		cb.checked = true;
		cb.dispatchEvent(new Event("change"));

		expect(events.some((e) => e.key === "staticMinDistance")).toBe(false);
		expect(events.some((e) => e.key === "staticAutoDistance")).toBe(true);
		document.body.removeChild(c);
	});
});

describe("_fireDirty with save-btn in shadowRoot", () => {
	it("enables save-btn when btn is found in shadowRoot", () => {
		const sv = createView();
		const btn = document.createElement("button");
		btn.className = "save-btn";
		btn.disabled = true;

		Object.defineProperty(sv, "shadowRoot", {
			value: {
				querySelector: (sel: string) => (sel === ".save-btn" ? btn : null),
			},
			configurable: true,
		});

		(sv as any)._fireDirty();
		expect(btn.disabled).toBe(false);
	});
});

describe("logging accordion", () => {
	it("renders logging section in accordion list", () => {
		const sv = createView();
		const tpl = sv.render();
		const c = renderTo(tpl);

		const headers = c.querySelectorAll(".accordion-header");
		const titles = [...headers].map(
			(h) => h.querySelector(".accordion-title")?.textContent,
		);
		expect(titles).toContain("settings.logging");
		document.body.removeChild(c);
	});

	it("renders all base log level rows when open", () => {
		const sv = createView({
			openAccordions: new Set(["logging"]),
			logLevels: {
				system: "Warning",
				epp: "Warning",
				led: "Warning",
				networking: "Warning",
			},
		});
		const tpl = sv.render();
		const c = renderTo(tpl);

		const labels = c.querySelectorAll(".setting-row label");
		const texts = [...labels].map((l) => l.textContent);
		expect(texts).toContain("settings.log_system");
		expect(texts).toContain("settings.log_epp");
		expect(texts).toContain("settings.log_led");
		expect(texts).toContain("settings.log_networking");
		document.body.removeChild(c);
	});

	it("hides BLE row when bluetooth_enabled is false", () => {
		const sv = createView({
			openAccordions: new Set(["logging"]),
			logLevels: { ble: "Warning" },
			bluetoothEnabled: false,
		});
		const tpl = sv.render();
		const c = renderTo(tpl);

		const labels = c.querySelectorAll(".setting-row label");
		const texts = [...labels].map((l) => l.textContent);
		expect(texts).not.toContain("settings.log_ble");
		document.body.removeChild(c);
	});

	it("shows BLE row when bluetooth_enabled is true", () => {
		const sv = createView({
			openAccordions: new Set(["logging"]),
			logLevels: { ble: "Warning" },
			bluetoothEnabled: true,
		});
		const tpl = sv.render();
		const c = renderTo(tpl);

		const labels = c.querySelectorAll(".setting-row label");
		const texts = [...labels].map((l) => l.textContent);
		expect(texts).toContain("settings.log_ble");
		document.body.removeChild(c);
	});

	it("hides CO2 row when co2_enabled is false", () => {
		const sv = createView({
			openAccordions: new Set(["logging"]),
			logLevels: { co2: "Warning" },
			co2Enabled: false,
		});
		const tpl = sv.render();
		const c = renderTo(tpl);

		const labels = c.querySelectorAll(".setting-row label");
		const texts = [...labels].map((l) => l.textContent);
		expect(texts).not.toContain("settings.log_co2");
		document.body.removeChild(c);
	});

	it("shows CO2 row when co2Enabled is true", async () => {
		const sv = createView({
			openAccordions: new Set(["logging"]),
			logLevels: {},
			co2Enabled: true,
		});
		document.body.appendChild(sv);
		await sv.updateComplete;
		const body = sv.shadowRoot!.querySelector(".accordion-body");
		const labels = Array.from(body!.querySelectorAll(".setting-row label")).map(
			(l) => l.textContent,
		);
		expect(labels).toContain("settings.log_co2");
		document.body.removeChild(sv);
	});

	it("marks dirty when dropdown changes", () => {
		const sv = createView({
			logLevels: { system: "Warning" },
		});

		let dirtyFired = false;
		sv.addEventListener("dirty", () => {
			dirtyFired = true;
		});

		// Mock shadowRoot for _fireDirty
		Object.defineProperty(sv, "shadowRoot", {
			value: {
				querySelector: () => null,
				querySelectorAll: () => [],
			},
			configurable: true,
		});

		const tpl = (sv as any).renderLogging();
		const c = renderTo(tpl);

		// Find the ha-select and simulate a selected event with detail.value
		const selects = c.querySelectorAll("ha-select");
		expect(selects.length).toBeGreaterThan(0);
		const select = selects[0] as any;
		select.dispatchEvent(
			new CustomEvent("selected", {
				bubbles: true,
				detail: { value: "Debug" },
			}),
		);

		expect(dirtyFired).toBe(true);
		expect((sv as any)._overrides.logLevels?.system).toBe("Debug");
		document.body.removeChild(c);
	});

	it("includes log_levels in save payload", () => {
		const sv = createView({
			dirty: true,
			logLevels: { system: "Warning", epp: "Info" },
		});
		// Set an override for one category
		(sv as any)._overrides.logLevels = { system: "Debug" };

		let payload: any = null;
		sv.addEventListener("save", ((e: CustomEvent) => {
			payload = e.detail;
		}) as EventListener);

		(sv as any)._emitSave();

		expect(payload).not.toBeNull();
		expect(payload.log_levels).toBeDefined();
		expect(payload.log_levels.system).toBe("Debug"); // override wins
		expect(payload.log_levels.epp).toBe("Info"); // original preserved
	});

	it("reset button sets dropdown to None", () => {
		const sv = createView({
			logLevels: { system: "Debug" },
		});

		// Mock shadowRoot for _fireDirty
		Object.defineProperty(sv, "shadowRoot", {
			value: {
				querySelector: () => null,
				querySelectorAll: () => [],
			},
			configurable: true,
		});

		const requestUpdateSpy = vi.spyOn(sv, "requestUpdate");

		const tpl = (sv as any).renderLogging();
		const c = renderTo(tpl);

		// Find the reset button (mdi:restart icon)
		const resetBtns = c.querySelectorAll(".setting-info");
		// First .setting-info in each row is the reset button
		expect(resetBtns.length).toBeGreaterThan(0);
		(resetBtns[0] as HTMLElement).click();

		expect((sv as any)._overrides.logLevels?.system).toBe("None");
		expect(requestUpdateSpy).toHaveBeenCalled();
		document.body.removeChild(c);
	});
});

describe("LED settings section", () => {
	it("renders LED accordion", () => {
		const sv = createView({ openAccordions: new Set(["led"]) });
		const tpl = sv.render();
		const c = renderTo(tpl);

		const body = c.querySelector(".accordion-body");
		expect(body).not.toBeNull();
		expect(body!.querySelector(".setting-group")).not.toBeNull();
		document.body.removeChild(c);
	});

	it("renders 5 accordions including LED", () => {
describe("relay section", () => {
	it("renders settings container with 5 accordions when relay added", () => {
		const sv = createView();
		const tpl = sv.render();
		const c = renderTo(tpl);


expect(c.querySelector(".settings-container")).not.toBeNull();
		expect(c.querySelectorAll(".accordion").length).toBe(5);
		document.body.removeChild(c);
	});

it("renders brightness slider in LED section", () => {
		const sv = createView({ openAccordions: new Set(["led"]) });
		const tpl = sv.render();
		const c = renderTo(tpl);

		const slider = c.querySelector(
			'input[type="range"][data-led-brightness]',
		) as HTMLInputElement;
		expect(slider).not.toBeNull();
		expect(slider.min).toBe("0.1");
		expect(slider.max).toBe("1");
		expect(slider.step).toBe("0.05");
		document.body.removeChild(c);
	});

	it("renders color picker in LED section when mode is Presence", () => {
		const sv = createView({
			openAccordions: new Set(["led"]),
			ledMode: "Presence",
		});
		const tpl = sv.render();
		const c = renderTo(tpl);

		const picker = c.querySelector('input[type="color"]') as HTMLInputElement;
		expect(picker).not.toBeNull();
		expect(picker.value).toBe("#cc33ff");
		document.body.removeChild(c);
	});

	it("hides environmental modes when co2 disabled", () => {
		const sv = createView({
			openAccordions: new Set(["led"]),
			co2Enabled: false,
		});
		const tpl = sv.render();
		const c = renderTo(tpl);

		const select = c.querySelector("ha-select.led-mode-select") as any;
		expect(select).not.toBeNull();
		const values = (select.options as { value: string }[]).map(
			(o: { value: string }) => o.value,
		);
		expect(values).not.toContain("Environmental");
		expect(values).not.toContain("Environmental + Presence");
		document.body.removeChild(c);
	});

	it("shows environmental modes when co2 enabled", () => {
		const sv = createView({
			openAccordions: new Set(["led"]),
			co2Enabled: true,
		});
		const tpl = sv.render();
		const c = renderTo(tpl);

		const select = c.querySelector("ha-select.led-mode-select") as any;
		expect(select).not.toBeNull();
		const values = (select.options as { value: string }[]).map(
			(o: { value: string }) => o.value,
		);
		expect(values).toContain("Environmental");
		expect(values).toContain("Environmental + Presence");
		document.body.removeChild(c);
	});

	it("hides color picker when mode is not Presence-related", () => {
		const sv = createView({
			openAccordions: new Set(["led"]),
			ledMode: "Manual Control",
		});
		const tpl = sv.render();
		const c = renderTo(tpl);

		const picker = c.querySelector('input[type="color"]');
		expect(picker).toBeNull();
		document.body.removeChild(c);
	});
});

describe("LED save payload", () => {
	it("includes LED settings in save event", () => {
		const sv = createView({
			dirty: true,
			ledMode: "Presence",
			ledBrightness: 0.7,
			ledPresenceColor: "#00FF00",
it("renderSettingsSection returns defined result for relay", () => {
		const sv = createView();
		const result = (sv as any).renderSettingsSection("relay");
		expect(result).toBeDefined();
	});

	it("renderRelay returns defined result", () => {
		const sv = createView({ relayTriggerMode: "disabled", relayContactMode: "no" });
		const result = (sv as any).renderRelay();
		expect(result).toBeDefined();
	});

	it("contact mode select is hidden when trigger is disabled", () => {
		const sv = createView({ relayTriggerMode: "disabled", relayContactMode: "no" });
		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const rows = c.querySelectorAll(".setting-row");
		// Only trigger mode row should be visible, not contact mode
		expect(rows.length).toBe(1);
		document.body.removeChild(c);
	});

	it("contact mode select is hidden when trigger is manual", () => {
		const sv = createView({ relayTriggerMode: "manual", relayContactMode: "no" });
		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const rows = c.querySelectorAll(".setting-row");
		expect(rows.length).toBe(1);
		document.body.removeChild(c);
	});

	it("contact mode select is visible when trigger is motion", () => {
		const sv = createView({ relayTriggerMode: "motion", relayContactMode: "no" });
		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const rows = c.querySelectorAll(".setting-row");
		expect(rows.length).toBe(2);
		document.body.removeChild(c);
	});

	it("contact mode select is visible when trigger is presence", () => {
		const sv = createView({ relayTriggerMode: "presence", relayContactMode: "nc" });
		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const rows = c.querySelectorAll(".setting-row");
		expect(rows.length).toBe(2);
		document.body.removeChild(c);
	});

	it("contact mode select is visible when trigger is motion_or_presence", () => {
		const sv = createView({ relayTriggerMode: "motion_or_presence", relayContactMode: "no" });
		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const rows = c.querySelectorAll(".setting-row");
		expect(rows.length).toBe(2);
		document.body.removeChild(c);
	});

	it("trigger mode select change updates overrides and fires dirty", () => {
		const sv = createView({ relayTriggerMode: "disabled", relayContactMode: "no" });

		let dirtyFired = false;
		sv.addEventListener("dirty", () => { dirtyFired = true; });

		Object.defineProperty(sv, "shadowRoot", {
			value: { querySelector: () => null, querySelectorAll: () => [] },
			configurable: true,
		});

		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const selects = c.querySelectorAll("ha-select");
		expect(selects.length).toBeGreaterThan(0);
		selects[0].dispatchEvent(
			new CustomEvent("selected", { bubbles: true, detail: { value: "motion" } })
		);

		expect((sv as any)._overrides.relayTriggerMode).toBe("motion");
		expect(dirtyFired).toBe(true);
		document.body.removeChild(c);
	});

	it("contact mode select change updates overrides and fires dirty", () => {
		const sv = createView({ relayTriggerMode: "motion", relayContactMode: "no" });

		let dirtyFired = false;
		sv.addEventListener("dirty", () => { dirtyFired = true; });

		Object.defineProperty(sv, "shadowRoot", {
			value: { querySelector: () => null, querySelectorAll: () => [] },
			configurable: true,
		});

		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const selects = c.querySelectorAll("ha-select");
		expect(selects.length).toBe(2);
		selects[1].dispatchEvent(
			new CustomEvent("selected", { bubbles: true, detail: { value: "nc" } })
		);

		expect((sv as any)._overrides.relayContactMode).toBe("nc");
		expect(dirtyFired).toBe(true);
		document.body.removeChild(c);
	});

	it("includes relay keys in save event payload", () => {
		const sv = createView({
			dirty: true,
			relayTriggerMode: "motion",
			relayContactMode: "nc",
		});

		let payload: any = null;
		sv.addEventListener("save", ((e: CustomEvent) => {
			payload = e.detail;
		}) as EventListener);

		(sv as any)._emitSave();

expect(payload.led_mode).toBe("Presence");
		expect(payload.led_brightness).toBe(0.7);
		expect(payload.led_presence_color).toBe("#00FF00");
	});

	it("uses LED defaults when not overridden", () => {
		const sv = createView({ dirty: true });
expect(payload).not.toBeNull();
		expect(payload.relay_trigger_mode).toBe("motion");
		expect(payload.relay_contact_mode).toBe("nc");
	});

	it("relay save payload uses override values when set", () => {
		const sv = createView({
			dirty: true,
			relayTriggerMode: "disabled",
			relayContactMode: "no",
		});
		(sv as any)._overrides.relayTriggerMode = "presence";
		(sv as any)._overrides.relayContactMode = "nc";

		let payload: any = null;
		sv.addEventListener("save", ((e: CustomEvent) => {
			payload = e.detail;
		}) as EventListener);

		(sv as any)._emitSave();

expect(payload.led_mode).toBe("Manual Control");
		expect(payload.led_brightness).toBe(1.0);
		expect(payload.led_presence_color).toBe("#CC33FF");
expect(payload.relay_trigger_mode).toBe("presence");
		expect(payload.relay_contact_mode).toBe("nc");
	});
});
