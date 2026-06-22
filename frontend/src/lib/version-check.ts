// Self-reload on a new panel bundle.
//
// The integration serves the bundle from a content-hashed path
// (`/eppgrid_static/<hash>/eppgrid-panel.js`), so an upgrade produces a new
// URL. That guarantees a *fresh fetch* returns fresh bytes, but it does not
// make an already-open tab re-fetch — the running module keeps serving the
// version it was loaded with. This module closes that gap: the running bundle
// reads its own hash from `import.meta.url`, asks the server for the current
// hash, and reloads the page when they differ (triggered on websocket
// reconnect, which an upgrade+restart always causes).

// Anchor the `.js` to the path end (or a `?query`/`#fragment`) so a sourcemap
// (`…eppgrid-panel.js.map`) or other suffix can't be mistaken for the bundle.
const BUNDLE_PATH_RE = /\/eppgrid_static\/([^/]+)\/eppgrid-panel\.js(?:[?#]|$)/;

// sessionStorage key recording the server hash we last reloaded for, so a
// single mismatch cannot cause an endless reload loop if a reload somehow
// fails to land on the new bundle.
const RELOAD_GUARD_KEY = "eppgrid_reload_for_hash";

/**
 * Extract the bundle content hash from a module URL. Returns null when the URL
 * is not the hashed bundle path, or when the hash is the server's "0"
 * read-error sentinel (treated as "unknown" so we never reload on it).
 */
export function parseBundleHash(url: string | null | undefined): string | null {
	if (!url) return null;
	const match = BUNDLE_PATH_RE.exec(url);
	const hash = match?.[1];
	if (!hash || hash === "0") return null;
	return hash;
}

type GuardStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// The loop guard is best-effort: a blocked or quota-limited store (private mode,
// etc.) must never throw out of the version check and swallow the reload.
function readGuard(storage: GuardStorage | null | undefined): string | null {
	try {
		return storage?.getItem(RELOAD_GUARD_KEY) ?? null;
	} catch {
		return null;
	}
}

function writeGuard(
	storage: GuardStorage | null | undefined,
	value: string | null,
): void {
	try {
		if (value === null) storage?.removeItem(RELOAD_GUARD_KEY);
		else storage?.setItem(RELOAD_GUARD_KEY, value);
	} catch {
		// ignore — see readGuard.
	}
}

export interface VersionCheckDeps {
	/** Hash of the currently-running bundle (from `import.meta.url`). */
	currentHash: string | null;
	/** Fetches the server's current bundle hash (null on unknown). */
	fetchServerHash: () => Promise<string | null>;
	/** Reloads the page. Injected so it can be asserted in tests. */
	reload: () => void;
	/** sessionStorage-like store for the loop guard; optional. */
	storage?: GuardStorage | null;
}

/**
 * Compare the running bundle against the server's current bundle and reload the
 * page when a newer one is available. Only a confirmed mismatch triggers a
 * reload; the loop guard prevents reloading twice for the same server hash.
 *
 * Returns whether the check is *resolved* — i.e. whether there is any point in
 * the caller retrying. The integration's WS command is only registered once the
 * integration finishes setting up after an HA restart, and its hash is stored a
 * moment later still; until then the lookup throws or returns null. Those cases
 * return `false` ("not resolved — retry"), so the caller can poll until the
 * backend answers. A definitive answer (match, mismatch, the unhashable "0"
 * sentinel, or an unknown local hash) returns `true`.
 */
export async function checkForNewBundle(
	deps: VersionCheckDeps,
): Promise<boolean> {
	const { currentHash, fetchServerHash, reload, storage } = deps;
	// We can never compare without our own hash (e.g. served from a non-hashed
	// URL, or in tests) — resolved, nothing to retry.
	if (!currentHash) return true;

	let serverHash: string | null;
	try {
		serverHash = await fetchServerHash();
	} catch {
		// Command unreachable (integration still coming up) — retry.
		return false;
	}

	// Hash not stored yet (setup in flight) — retry.
	if (serverHash == null) return false;
	// "0" = the server could not hash its own bundle; a definitive (if useless)
	// answer. Never reload to it, and don't keep retrying.
	if (serverHash === "0") return true;

	// Both hashes are real, differing-or-not strings here (null/"0" handled
	// above), so a plain equality decides it.
	if (currentHash === serverHash) {
		// Versions match — clear any armed guard so a future genuine upgrade
		// isn't suppressed.
		writeGuard(storage, null);
		return true;
	}

	// serverHash is a real, differing hash here.
	if (readGuard(storage) === serverHash) return true;
	writeGuard(storage, serverHash);
	reload();
	return true;
}
