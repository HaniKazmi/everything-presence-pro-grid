import { describe, expect, it } from "vitest";
import { EppInfoTip } from "../../components/epp-info-tip.js";

describe("epp-info-tip token retune", () => {
	it("uses design tokens for the tooltip surface", () => {
		const cssText = (EppInfoTip.styles as { cssText: string }[])
			.map((s) => s.cssText)
			.join("\n");
		expect(cssText).toContain("var(--epp-radius-md");
		expect(cssText).toContain("var(--epp-border");
	});
});
