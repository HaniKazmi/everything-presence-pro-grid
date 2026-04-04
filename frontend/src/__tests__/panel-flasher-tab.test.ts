import { describe, expect, it, vi } from "vitest";
import { EPPGridPanel } from "../eppgrid-panel.js";

function createPanel(): EPPGridPanel {
	const el = new EPPGridPanel();
	(el as any).hass = {
		callWS: vi.fn().mockResolvedValue({ devices: [] }),
		connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
	};
	return el;
}

describe("EPPGridPanel tab routing", () => {
	it("has a _panelTab state defaulting to 'config'", () => {
		const el = createPanel();
		expect((el as any)._panelTab).toBe("config");
	});

	it("can switch to flasher tab", () => {
		const el = createPanel();
		(el as any)._panelTab = "flasher";
		expect((el as any)._panelTab).toBe("flasher");
	});

	it("has a _flasherCtrl controller", () => {
		const el = createPanel();
		expect((el as any)._flasherCtrl).toBeDefined();
	});
});
