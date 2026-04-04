export class EPPGridStrategy {
	static async generate(): Promise<{
		views: Array<{ title: string; cards: Array<{ type: string }> }>;
	}> {
		return {
			views: [
				{
					title: "Device Configuration",
					cards: [{ type: "custom:epp-device-card" }],
				},
				{
					title: "Flash Firmware",
					cards: [{ type: "custom:epp-flasher-card" }],
				},
			],
		};
	}
}
