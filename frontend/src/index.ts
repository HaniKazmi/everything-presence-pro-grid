export { EppDeviceCard } from "./components/epp-device-card";
export { EppFlasherCard } from "./components/epp-flasher-card";
export { EPPGridPanel } from "./eppgrid-panel";

import { EPPGridStrategy } from "./strategy";

export { EPPGridStrategy };

// Register custom cards
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push(
	{
		type: "epp-device-card",
		name: "EPP Grid Device Configuration",
		description: "EPP Grid device calibration and zone editor",
	},
	{
		type: "epp-flasher-card",
		name: "EPP Grid Firmware Flasher",
		description: "Flash EPP Grid firmware to devices",
	},
);

// Register strategy
(window as any).customStrategies = (window as any).customStrategies || {};
(window as any).customStrategies.eppgrid = {
	generateDashboard: () => EPPGridStrategy.generate(),
};
