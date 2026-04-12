export { EppDeviceCard } from "./components/epp-device-card";
export { EPPGridPanel } from "./eppgrid-panel";

import { EPPGridStrategy } from "./strategy";

export { EPPGridStrategy };

// Register custom cards
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
	type: "epp-device-card",
	name: "Everything Presence Pro Grid",
	description:
		"Device configuration, calibration, zone editor, and firmware flasher",
});

// Register strategy
(window as any).customStrategies = (window as any).customStrategies || {};
(window as any).customStrategies.eppgrid = {
	generateDashboard: () => EPPGridStrategy.generate(),
};
