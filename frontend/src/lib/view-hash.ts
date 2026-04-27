/**
 * URL-fragment encoding for per-tab panel view state.
 *
 * Empty hash → live overview. Each editor sub-tab and the other
 * top-level views get a flat fragment:
 *
 *   ""           live overview
 *   "#zones"     editor + detection zones
 *   "#overlays"  editor + overlays
 *   "#furniture" editor + furniture
 *   "#settings"  settings
 *   "#tutorial"  calibration tutorial (guide step)
 *   "#calibrate" corner-marking step
 */

export type ViewMode =
	| "live"
	| "editor"
	| "settings"
	| "tutorial"
	| "calibrate";
export type SidebarTab = "zones" | "overlays" | "furniture";

export interface ViewState {
	view: ViewMode;
	sidebarTab: SidebarTab;
}

const DEFAULT_SIDEBAR_TAB: SidebarTab = "zones";

// Single source of truth for the URL fragment ↔ ViewState mapping.
// Editor sub-tabs (`#zones`, `#overlays`, `#furniture`) live alongside
// the standalone views since each is its own top-level fragment.
const HASH_TO_STATE: Readonly<Record<string, ViewState>> = {
	"": { view: "live", sidebarTab: DEFAULT_SIDEBAR_TAB },
	settings: { view: "settings", sidebarTab: DEFAULT_SIDEBAR_TAB },
	tutorial: { view: "tutorial", sidebarTab: DEFAULT_SIDEBAR_TAB },
	calibrate: { view: "calibrate", sidebarTab: DEFAULT_SIDEBAR_TAB },
	zones: { view: "editor", sidebarTab: "zones" },
	overlays: { view: "editor", sidebarTab: "overlays" },
	furniture: { view: "editor", sidebarTab: "furniture" },
};

export function parseViewHash(raw: string): ViewState {
	const stripped = raw.startsWith("#") ? raw.slice(1) : raw;
	return HASH_TO_STATE[stripped] ?? HASH_TO_STATE[""];
}

export function viewHash(state: ViewState): string {
	if (state.view === "live") return "";
	if (state.view === "editor") return `#${state.sidebarTab}`;
	return `#${state.view}`;
}
