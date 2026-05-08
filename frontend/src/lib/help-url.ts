import type { SidebarTab, ViewMode } from "./view-hash.js";

export const DOCS_BASE_URL =
	"https://clintongormley.github.io/everything-presence-pro-grid/";

export type PanelTab = "config" | "flasher";

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
	const slug =
		state.view === "editor"
			? EDITOR_TAB_TO_SLUG[state.sidebarTab]
			: VIEW_TO_SLUG[state.view];
	return `${DOCS_BASE_URL}${slug}`;
}
