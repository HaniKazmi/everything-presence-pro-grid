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

describe("setup wizard delegates header to parent panel", () => {
	it("does not render its own .panel-header in shadow DOM", async () => {
		const el = createWizard({ mode: "wizard" });
		(el as any)._setupStep = "guide";
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		expect(root.querySelector(".panel-header")).toBeNull();
	});

	it("does not wrap step content in a padded fullscreen container", async () => {
		const el = createWizard({ mode: "wizard" });
		(el as any)._setupStep = "guide";
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		// .wizard-container added 32px padding + flex centering for the old
		// fullscreen layout — inside .panel it just inflates the gap below
		// the header. It should be gone so spacing matches other views.
		expect(root.querySelector(".wizard-container")).toBeNull();
	});
});

describe("don't show tutorial again checkbox", () => {
	it("renders an ha-checkbox on the guide step", async () => {
		const el = createWizard({ mode: "wizard" });
		(el as any)._setupStep = "guide";
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const cb = root.querySelector(".dont-show-again ha-checkbox");
		expect(cb).not.toBeNull();
	});

	it("does not render the checkbox on the corners step", async () => {
		const el = createWizard({ mode: "wizard" });
		const a = el as any;
		a._setupStep = "corners";
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		expect(root.querySelector(".dont-show-again")).toBeNull();
	});

	it("dispatches dismiss-tutorial when 'Begin marking corners' is clicked with checkbox ticked", async () => {
		const el = createWizard({ mode: "wizard" });
		(el as any)._setupStep = "guide";
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("dismiss-tutorial", (e) =>
			events.push(e as CustomEvent),
		);

		const root = el.shadowRoot!;
		const cb = root.querySelector<HTMLInputElement>(
			".dont-show-again ha-checkbox",
		)!;
		cb.checked = true;
		cb.dispatchEvent(new Event("change"));

		const beginBtn = Array.from(
			root.querySelectorAll<HTMLButtonElement>("button"),
		).find((b) => b.textContent?.includes("wizard.begin_marking"))!;
		beginBtn.click();

		expect(events).toHaveLength(1);
	});

	it("does not dispatch dismiss-tutorial when checkbox is unchecked", async () => {
		const el = createWizard({ mode: "wizard" });
		(el as any)._setupStep = "guide";
		document.body.appendChild(el);
		await el.updateComplete;

		let fired = false;
		el.addEventListener("dismiss-tutorial", () => {
			fired = true;
		});

		const root = el.shadowRoot!;
		const beginBtn = Array.from(
			root.querySelectorAll<HTMLButtonElement>("button"),
		).find((b) => b.textContent?.includes("wizard.begin_marking"))!;
		beginBtn.click();

		expect(fired).toBe(false);
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

describe("disconnectedCallback cancels in-flight capture RAF", () => {
	it("cancels the pending RAF id and marks capture cancelled when detached", async () => {
		const el = createWizard({ mode: "wizard" });
		const a = el as any;
		a._setupStep = "corners";
		a.rawTargets = [{ raw_x: 500, raw_y: 1200 }];
		document.body.appendChild(el);
		await el.updateComplete;

		// Stub RAF so we can capture the id we hand back to the component
		const rafSpy = vi
			.spyOn(window, "requestAnimationFrame")
			.mockImplementation(() => 4242 as unknown as number);
		const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");

		try {
			a._wizardStartCapture();
			expect(a._wizardCapturing).toBe(true);
			expect(a._captureRafId).toBe(4242);
			expect(a._wizardCaptureCancelled).toBe(false);

			document.body.removeChild(el);

			expect(a._wizardCaptureCancelled).toBe(true);
			expect(cancelSpy).toHaveBeenCalledWith(4242);
			expect(a._captureRafId).toBeNull();
		} finally {
			rafSpy.mockRestore();
			cancelSpy.mockRestore();
		}
	});

	it("does not run another tick after disconnect even if RAF queue is flushed", async () => {
		const el = createWizard({ mode: "wizard" });
		const a = el as any;
		a._setupStep = "corners";
		a.rawTargets = [{ raw_x: 500, raw_y: 1200 }];
		document.body.appendChild(el);
		await el.updateComplete;

		// Capture every tick callback the component schedules so we can
		// invoke them manually after disconnect.
		const callbacks: FrameRequestCallback[] = [];
		const rafSpy = vi
			.spyOn(window, "requestAnimationFrame")
			.mockImplementation((cb) => {
				callbacks.push(cb);
				return callbacks.length as unknown as number;
			});

		try {
			a._wizardStartCapture();
			expect(callbacks).toHaveLength(1);

			// Detach the component mid-capture
			document.body.removeChild(el);
			expect(a._wizardCaptureCancelled).toBe(true);

			// Snapshot mutable state, then flush the leaked closure.
			const progressBefore = a._wizardCaptureProgress;
			const capturingBefore = a._wizardCapturing;
			const cornersBefore = a._wizardCorners;
			const rafCallsBefore = rafSpy.mock.calls.length;

			callbacks[0]?.(performance.now());

			// The leaked closure must early-return: no state mutations,
			// no further RAF scheduling.
			expect(a._wizardCaptureProgress).toBe(progressBefore);
			expect(a._wizardCapturing).toBe(capturingBefore);
			expect(a._wizardCorners).toBe(cornersBefore);
			expect(rafSpy.mock.calls.length).toBe(rafCallsBefore);
		} finally {
			rafSpy.mockRestore();
		}
	});
});
