import type { SidebarTab, ViewMode } from "./view-hash.js";

export const DOCS_BASE_URL =
	"https://hanikazmi.github.io/everything-presence-pro-grid/";

// Browser-based firmware flasher hosted on the docs site. It runs over HTTPS
// (a secure context), so Web Serial works there even when Home Assistant is
// reached over plain HTTP — where the in-panel USB flasher is unavailable.
export const WEB_FLASHER_URL = `${DOCS_BASE_URL}user-guide/web-flasher/`;

export type PanelTab = "config" | "flasher" | "device-groups";

export interface HelpUrlState {
	panelTab: PanelTab;
	view: ViewMode;
	sidebarTab: SidebarTab;
}

type NonEditorView = Exclude<ViewMode, "editor">;

const VIEW_TO_SLUG: Readonly<Record<NonEditorView, string>> = {
	live: "user-guide/live-overview/",
	settings: "user-guide/settings/",
	tutorial: "user-guide/calibration/",
	calibrate: "user-guide/calibration/",
};

const EDITOR_TAB_TO_SLUG: Readonly<Record<SidebarTab, string>> = {
	zones: "user-guide/detection-zones/",
	overlays: "user-guide/overlays/",
	furniture: "user-guide/furniture/",
};

export function getHelpUrl(state: HelpUrlState): string {
	if (state.panelTab === "flasher") {
		return `${DOCS_BASE_URL}user-guide/flashing-firmware/`;
	}
	if (state.panelTab === "device-groups") {
		return `${DOCS_BASE_URL}user-guide/device-groups/`;
	}
	const slug =
		state.view === "editor"
			? EDITOR_TAB_TO_SLUG[state.sidebarTab]
			: VIEW_TO_SLUG[state.view];
	return `${DOCS_BASE_URL}${slug}`;
}
