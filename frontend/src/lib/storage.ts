/**
 * localStorage keys and safe accessors for EPP Grid panel state.
 */

export const STORAGE_KEY_SELECTED_MAC = "epp_selected_mac";
export const STORAGE_KEY_VIEW = "epp_view";

export type ViewMode = "live" | "editor" | "settings";

export function readStoredView(): ViewMode {
	try {
		const v = localStorage.getItem(STORAGE_KEY_VIEW);
		if (v === "editor" || v === "settings") return v;
	} catch {
		/* localStorage unavailable (privacy mode, etc.) */
	}
	return "live";
}

export function persistView(view: ViewMode): void {
	try {
		if (view === "live") {
			localStorage.removeItem(STORAGE_KEY_VIEW);
		} else {
			localStorage.setItem(STORAGE_KEY_VIEW, view);
		}
	} catch {
		/* localStorage unavailable */
	}
}
