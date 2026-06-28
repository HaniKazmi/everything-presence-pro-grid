/**
 * localStorage keys and safe accessors for cross-tab panel state.
 *
 * View / sidebar-tab state is per-tab (URL fragment); only the
 * selected device mac is persisted across tabs.
 */

export const STORAGE_KEY_SELECTED_MAC = "epp_selected_mac";

export function readStoredMac(): string | null {
	try {
		return localStorage.getItem(STORAGE_KEY_SELECTED_MAC);
	} catch {
		return null;
	}
}

export function persistSelectedMac(mac: string): void {
	try {
		if (mac === "") {
			localStorage.removeItem(STORAGE_KEY_SELECTED_MAC);
		} else {
			localStorage.setItem(STORAGE_KEY_SELECTED_MAC, mac);
		}
	} catch {
		/* localStorage unavailable */
	}
}

/** Full locale code (e.g. "pt-BR") the user dismissed the translation nudge for. */
export const STORAGE_KEY_LANG_REQUEST_DISMISSED = "epp_lang_request_dismissed";

export function readDismissedLangRequest(): string | null {
	try {
		return localStorage.getItem(STORAGE_KEY_LANG_REQUEST_DISMISSED);
	} catch {
		return null;
	}
}

export function persistDismissedLangRequest(code: string): void {
	try {
		localStorage.setItem(STORAGE_KEY_LANG_REQUEST_DISMISSED, code);
	} catch {
		/* localStorage unavailable */
	}
}
