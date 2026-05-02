export { EppDeviceCard } from "./components/epp-device-card";
export { EPPGridPanel } from "./eppgrid-panel";

import { setupLocalize } from "./localize";
import { EPPGridStrategy } from "./strategy";

export { EPPGridStrategy };

// Register custom cards. Runs at module load before any hass is available, so
// fall back to the browser's language for the picker description.
const _bootLocalize = setupLocalize({ language: navigator.language });
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
	type: "epp-device-card",
	name: "Everything Presence Pro Grid",
	description: _bootLocalize("common.card_description"),
});

// Register strategy
(window as any).customStrategies = (window as any).customStrategies || {};
(window as any).customStrategies.eppgrid = {
	generateDashboard: () => EPPGridStrategy.generate(),
};
