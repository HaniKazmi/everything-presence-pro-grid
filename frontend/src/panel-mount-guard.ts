export function findEppPanelHost(): HTMLElement | null {
	const haRoot = document.querySelector("home-assistant");
	if (!haRoot) return null;
	const main = haRoot.shadowRoot?.querySelector("home-assistant-main");
	if (!main) return null;
	const resolver = main.shadowRoot?.querySelector("partial-panel-resolver");
	if (!resolver) return null;
	return resolver.querySelector("ha-panel-custom") as HTMLElement | null;
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
