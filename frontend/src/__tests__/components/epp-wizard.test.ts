import { afterEach, describe, expect, it, vi } from "vitest";
import "../../components/epp-wizard.js";
import type { EppWizard } from "../../components/epp-wizard.js";

function createWizard(overrides: Record<string, any> = {}): EppWizard {
	const el = document.createElement("epp-wizard") as any;
	el.hass = { callWS: vi.fn().mockResolvedValue({}) };
	el.selectedMac = "AA:BB:CC:DD:EE:01";
	el.rawTargets = [
		{ raw_x: null, raw_y: null },
		{ raw_x: null, raw_y: null },
		{ raw_x: null, raw_y: null },
	];
	el.sensorState = { occupancy: false };
	el.devices = [{ mac: "AA:BB:CC:DD:EE:01", name: "Test" }];
	el.localize = (k: string) => k;
	el.initialRoomWidth = 0;
	el.initialRoomDepth = 0;
	el.mode = "wizard";
	Object.assign(el, overrides);
	return el as EppWizard;
}

afterEach(() => {
	// Clean up any elements attached to body during tests
	for (const child of [...document.body.children]) {
		document.body.removeChild(child);
	}
});

describe("render mode branches", () => {
	it("mode = 'uncalibrated-fov' renders content", async () => {
		const el = createWizard({ mode: "uncalibrated-fov" });
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		// Should render SVG FOV view and a calibrate button
		expect(root.querySelector("svg")).not.toBeNull();
		expect(root.innerHTML.length).toBeGreaterThan(0);
	});

	it("mode = 'needs-calibration' renders content", async () => {
		const el = createWizard({ mode: "needs-calibration" });
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		// Should render the positioning guide with SVG diagrams
		expect(root.querySelector("svg")).not.toBeNull();
		expect(root.innerHTML.length).toBeGreaterThan(0);
	});

	it("mode = 'wizard' with _setupStep = null renders nothing", async () => {
		const el = createWizard();
		(el as any)._setupStep = null;
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		// When _setupStep is null, render() returns `nothing` so shadowRoot should have no meaningful DOM
		const children = root.querySelectorAll("*");
		// Lit renders a comment node for `nothing`, so no real elements should appear
		expect(children.length).toBe(0);
	});
});

describe("connectedCallback", () => {
	it("copies initialRoomWidth and initialRoomDepth to internal state", async () => {
		const el = createWizard({
			initialRoomWidth: 5000,
			initialRoomDepth: 6000,
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const a = el as any;
		expect(a._wizardRoomWidth).toBe(5000);
		expect(a._wizardRoomDepth).toBe(6000);
	});
});

describe("capture cancel click", () => {
	it("resets capturing state when cancel button is clicked", async () => {
		const el = createWizard({ mode: "wizard" });
		const a = el as any;
		a._setupStep = "corners";
		a._wizardCapturing = true;
		a._wizardCaptureProgress = 0.5;
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const overlay = root.querySelector(".capture-overlay");
		expect(overlay).not.toBeNull();

		const cancelBtn = overlay!.querySelector(
			".wizard-btn-back",
		) as HTMLButtonElement;
		expect(cancelBtn).not.toBeNull();
		cancelBtn.click();

		expect(a._wizardCapturing).toBe(false);
		expect(a._wizardCapturePaused).toBe(false);
	});
});
