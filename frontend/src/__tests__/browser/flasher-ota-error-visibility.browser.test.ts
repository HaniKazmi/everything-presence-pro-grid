// Real-layout regression test: an opened OTA-error message must be fully
// visible inside the scrolling device list — never clipped by its 40vh cap.
//
// History: the error text was first an absolute popover (clipped for a device
// at the TOP of the list), then moved in-flow by 6be65c9c whose test claimed it
// "can never be clipped". That was wrong: an in-flow bar inside a
// `max-height: 40vh; overflow-y: auto` list is still clipped when it opens past
// the fold (reproduced with 7 devices — the failed row at the bottom edge, its
// error bar sliced ~12px by the list's bottom). The fix scrolls the opened
// detail into the list viewport.
//
// Must run in a real browser: happy-dom has no layout engine, so every
// getBoundingClientRect() below is zero and the assertions pass vacuously on the
// bug as readily as on the fix. `npm run test:browser` runs it in Chromium.
import { page } from "@vitest/browser/context";
import { describe, expect, it } from "vitest";
import "../../components/epp-flasher-view.js";
import type { EppFlasherView } from "../../components/epp-flasher-view.js";
import { defaultLocalize } from "../../localize.js";
import type { FlashableDevice } from "../../types.js";
import { registerPanelCleanup } from "../helpers/panel-cleanup.js";

const mounted: HTMLElement[] = [];
registerPanelCleanup(mounted);

const LONG_ERR =
	"The update failed because the device rejected the firmware image over the air. Check the WiFi connection and try again.";

function mkDevices(n: number): FlashableDevice[] {
	return Array.from({ length: n }, (_, i) => ({
		mac: `AA:BB:CC:DD:EE:0${i}`,
		name: `Sensor ${i + 1}`,
		host: `192.168.1.${10 + i}`,
		available: true,
		firmware_type: "eppgrid" as const,
		firmware_version: "1.5.0",
		esphome_config_entry_id: `entry-${i}`,
		update_available: true,
		firmware_status: "firmware_behind" as const,
	}));
}

async function settle(el: EppFlasherView): Promise<void> {
	await el.updateComplete;
	await new Promise((r) =>
		requestAnimationFrame(() => requestAnimationFrame(() => r(null))),
	);
	await el.updateComplete;
}

/** Mount the flasher with `n` updatable devices; the LAST one is in OTA error. */
async function mountWithErrorOnLast(
	n: number,
): Promise<{ el: EppFlasherView; errMac: string }> {
	await page.viewport(760, 640); // 40vh = 256px → 7 devices overflow the list
	document.documentElement.style.height = "100%";
	document.body.style.height = "100%";
	document.body.style.margin = "0";

	const el = document.createElement("epp-flasher-view") as EppFlasherView;
	const devices = mkDevices(n);
	const errMac = devices[n - 1].mac;
	el.flashableDevices = devices;
	el.otaStates = {
		[errMac]: { state: "error", progress: null, errorKey: "ota.err" },
	};
	el.localize = Object.assign(
		(key: string) => (key === "ota.err" ? LONG_ERR : key),
		{ formatNumber: defaultLocalize.formatNumber, lang: defaultLocalize.lang },
	);
	document.body.appendChild(el);
	mounted.push(el);
	await settle(el);
	return { el, errMac };
}

describe("flasher OTA error message visibility", () => {
	it("keeps the opened error detail inside the scrolling device list", async () => {
		const { el, errMac } = await mountWithErrorOnLast(7);
		const root = el.shadowRoot as ShadowRoot;
		const list = root.querySelector(".device-list") as HTMLElement;

		// The failed device is at the bottom of a full, scrolling roster — scroll
		// there so its row (and the error bar it will open) is at the bottom edge.
		list.scrollTop = list.scrollHeight;
		await settle(el);

		// Open the error by clicking its red "!".
		(root.querySelector(".ota-error-icon") as HTMLElement).click();
		await settle(el);

		const detail = root.querySelector(".ota-error-detail") as HTMLElement;
		expect(detail, "error detail should be open").toBeTruthy();

		const listRect = list.getBoundingClientRect();
		const detailRect = detail.getBoundingClientRect();

		// The whole message sits within the list's visible viewport — not sliced
		// off below (the bug) nor above the 40vh scroll cap.
		expect(
			detailRect.bottom,
			`detail bottom ${detailRect.bottom} overshoots list bottom ${listRect.bottom}`,
		).toBeLessThanOrEqual(listRect.bottom + 1);
		expect(detailRect.top).toBeGreaterThanOrEqual(listRect.top - 1);

		// Revealing it (which scrolls the inner list) must not dismiss it.
		expect(
			(el as unknown as { _errorPopoverMac: string | null })._errorPopoverMac,
		).toBe(errMac);
	});
});
