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

export function checkAndRemount(): void {
	const host = findEppPanelHost();
	if (!host) return;
	if (isEppPanelMissing(host)) {
		remountEppPanel(host);
	}
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

export function installPanelMountGuard(): void {
	// Tear down any previous install first. The module-level flag survives
	// across module reloads / repeat-install calls, but the observers and
	// listener references in the previous module instance can't be cleaned
	// up from here — they belong to the old lexical scope. Always re-attach
	// from the current scope so we end up with exactly one listener bound to
	// the current module's references.
	if ((window as any).__eppGridMountGuardInstalled) {
		uninstallPanelMountGuard();
	}
	(window as any).__eppGridMountGuardInstalled = true;
	document.addEventListener("visibilitychange", handleVisibilityChange);
	ensureObserversAttached();
}

export function uninstallPanelMountGuard(): void {
	if (!(window as any).__eppGridMountGuardInstalled) return;
	document.removeEventListener("visibilitychange", handleVisibilityChange);
	observedHost?.observer.disconnect();
	observedResolver?.observer.disconnect();
	observedHost = null;
	observedResolver = null;
	delete (window as any).__eppGridMountGuardInstalled;
}
