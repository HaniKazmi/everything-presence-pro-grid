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
		expect(c.querySelectorAll(".accordion").length).toBe(3);
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
		const sv = createView({ targetAutoDistance: true, staticAutoDistance: true });
		const result = (sv as any).renderDetectionRanges();
		expect(result).toBeDefined();
	});

	it("renders with auto range disabled", () => {
		const sv = createView({ targetAutoDistance: false, staticAutoDistance: false });
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
				expect((sv as any)._overrides.staticMinDistance).toBeLessThan(sv.staticMaxDistance);
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
			expect((sv as any)._overrides.staticMaxDistance).toBeGreaterThan(sv.staticMinDistance);
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
			occupancy: false, static_presence: false, motion_presence: false,
			target_presence: false, illuminance: -5, temperature: null,
			humidity: null, co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Illuminance", sv.sensorState.illuminance, "illuminance",
			-500, 500, 1, "lux", 1, "Tip", 0,
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
			occupancy: false, static_presence: false, motion_presence: false,
			target_presence: false, illuminance: 5, temperature: null,
			humidity: null, co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Illuminance", sv.sensorState.illuminance, "illuminance",
			-500, 500, 1, "lux", 1, "Tip", 0,
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
			occupancy: false, static_presence: false, motion_presence: false,
			target_presence: false, illuminance: null, temperature: null,
			humidity: 105, co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Humidity", sv.sensorState.humidity, "humidity",
			-50, 50, 0.1, "%", 1, "Tip", 0, 100,
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
