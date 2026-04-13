export function findEppPanelHost(): HTMLElement | null {
	const haRoot = document.querySelector("home-assistant");
	if (!haRoot) return null;
	const main = haRoot.shadowRoot?.querySelector("home-assistant-main");
	if (!main) return null;
	const resolver = main.shadowRoot?.querySelector("partial-panel-resolver");
	if (!resolver) return null;
	return resolver.querySelector("ha-panel-custom") as HTMLElement | null;
}
