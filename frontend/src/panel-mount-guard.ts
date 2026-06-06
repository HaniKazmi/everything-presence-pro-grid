function findPanelResolver(): Element | null {
	return (
		document
			.querySelector("home-assistant")
			?.shadowRoot?.querySelector("home-assistant-main")
			?.shadowRoot?.querySelector("partial-panel-resolver") ?? null
	);
}

export function findEppPanelHost(): HTMLElement | null {
	return (
		(findPanelResolver()?.querySelector("ha-panel-custom") as HTMLElement) ??
		null
	);
}

export function isEppPanelMissing(host: HTMLElement): boolean {
	const name = (host as any).panel?.config?._panel_custom?.name;
	if (name !== "eppgrid-panel") return false;
	return host.children.length === 0;
}

export function remountEppPanel(host: HTMLElement): void {
	const haRoot = document.querySelector("home-assistant");
	const hass = (haRoot as any)?.hass;
	if (!hass) return;
	const el = document.createElement("eppgrid-panel");
	(el as any).hass = hass;
	(el as any).panel = (host as any).panel;
	host.appendChild(el);
}

// HA's ha-panel-custom appends its OWN eppgrid-panel when its `panel` property
// is first set on a fresh host (after a disconnect/rebuild, oldPanel is
// undefined so HA skips _cleanupPanel and appends unconditionally). If our
// mount guard wins the race and has already mounted a panel into that empty
// host, both survive — the frontend renders twice. Collapse any such duplicates
// back to one, keeping the first (already-established) panel; the extras are
// torn down via their own disconnectedCallback. Live data flows through the
// stable hass.connection subscriptions, so the survivor stays fully live.
function removeDuplicateEppPanels(host: HTMLElement): void {
	const panels = Array.from(host.children).filter(
		(c) => c.tagName.toLowerCase() === "eppgrid-panel",
	);
	for (let i = 1; i < panels.length; i++) {
		panels[i].remove();
	}
}

export function checkAndRemount(): void {
	const host = findEppPanelHost();
	if (!host) return;
	if ((host as any).panel?.config?._panel_custom?.name !== "eppgrid-panel") {
		return;
	}
	if (isEppPanelMissing(host)) {
		remountEppPanel(host);
		return;
	}
	removeDuplicateEppPanels(host);
}

const handleVisibilityChange = (): void => {
	if (document.visibilityState === "visible") {
		checkAndRemount();
	}
};

type Observed = { node: Element; observer: MutationObserver };

let observedHost: Observed | null = null;
let observedResolver: Observed | null = null;

function replaceObserver(
	current: Observed | null,
	node: Element,
	callback: MutationCallback,
): Observed {
	if (current?.node === node) return current;
	current?.observer.disconnect();
	const observer = new MutationObserver(callback);
	observer.observe(node, { childList: true });
	return { node, observer };
}

function attachHostObserver(node: Element): void {
	observedHost = replaceObserver(observedHost, node, () => checkAndRemount());
}

// Observes partial-panel-resolver so a fresh ha-panel-custom (e.g. after HA
// frontend rebuild) gets a new inner observer attached. Without this, a
// resolver-level swap would orphan our previous host observer and leave the
// new empty host invisible to us until the next visibilitychange.
function attachResolverObserver(node: Element): void {
	observedResolver = replaceObserver(observedResolver, node, () => {
		const host = node.querySelector("ha-panel-custom") as HTMLElement | null;
		if (host) attachHostObserver(host);
		checkAndRemount();
	});
}

// Reattaches the observers if HA has replaced the resolver or host since we
// last looked. Idempotent — safe to call from connectedCallback on every
// remount.
export function ensureObserversAttached(): void {
	const resolver = findPanelResolver();
	if (!resolver) return;
	attachResolverObserver(resolver);
	const host = resolver.querySelector("ha-panel-custom") as HTMLElement | null;
	if (host) attachHostObserver(host);
}

// Per-module teardown closure — captures THIS module's listener function
// identity and observer references, so a future install (potentially from a
// freshly loaded module instance) can tear it down via the window-stashed
// reference even though our module-level state is unreachable from there.
function makeTeardown(): () => void {
	return () => {
		document.removeEventListener("visibilitychange", handleVisibilityChange);
		observedHost?.observer.disconnect();
		observedResolver?.observer.disconnect();
		observedHost = null;
		observedResolver = null;
	};
}

export function installPanelMountGuard(): void {
	// Tear down any previous install first. The module-level flag survives
	// across module reloads, but the listener identity and observer
	// references from the previous module instance aren't reachable from
	// this module's lexical scope — calling removeEventListener with the
	// new module's `handleVisibilityChange` reference would be a no-op,
	// stacking listeners. The previous install stashed its teardown
	// closure on `window`, so invoke that to release the old refs.
	const w = window as any;
	if (w.__eppGridMountGuardTeardown) {
		try {
			w.__eppGridMountGuardTeardown();
		} catch {}
	}
	w.__eppGridMountGuardInstalled = true;
	document.addEventListener("visibilitychange", handleVisibilityChange);
	ensureObserversAttached();
	w.__eppGridMountGuardTeardown = makeTeardown();
}

export function uninstallPanelMountGuard(): void {
	const w = window as any;
	if (!w.__eppGridMountGuardInstalled) return;
	// A corrupt or externally-replaced teardown shouldn't be able to leave
	// the guard wedged with the install flag set — type-check and try/catch
	// around the call so the globals are always cleared.
	if (typeof w.__eppGridMountGuardTeardown === "function") {
		try {
			w.__eppGridMountGuardTeardown();
		} catch {}
	}
	delete w.__eppGridMountGuardInstalled;
	delete w.__eppGridMountGuardTeardown;
}
