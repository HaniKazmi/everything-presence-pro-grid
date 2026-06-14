import { describe, expect, it } from "vitest";
import { tokens } from "../tokens.js";

describe("design tokens", () => {
	const text = tokens.cssText;

	it("defines accent + semantic colour tokens mapped to HA theme vars", () => {
		expect(text).toContain("--epp-accent: var(--primary-color");
		expect(text).toContain("--epp-success: var(--success-color");
		expect(text).toContain("--epp-warning: var(--warning-color");
		expect(text).toContain("--epp-danger: var(--error-color");
	});

	it("defines neutral/text/surface tokens mapped to HA theme vars", () => {
		expect(text).toContain("--epp-text: var(--primary-text-color");
		expect(text).toContain("--epp-text-muted: var(--secondary-text-color");
		expect(text).toContain("--epp-border: var(--divider-color");
		expect(text).toContain("--epp-surface: var(--card-background-color");
	});

	it("defines the spacing, radius and type scales", () => {
		expect(text).toContain("--epp-space-4: 16px");
		expect(text).toContain("--epp-radius-md: 10px");
		expect(text).toContain("--epp-font-base: 14px");
		expect(text).toContain("--epp-control-height: 40px");
	});

	// Inventory guard: every token the design system promises must be present,
	// so a future edit can't silently drop or rename one without a test failing.
	it("declares the full token inventory", () => {
		const expected = [
			"--epp-accent",
			"--epp-accent-text",
			"--epp-success",
			"--epp-warning",
			"--epp-danger",
			"--epp-text",
			"--epp-text-muted",
			"--epp-text-disabled",
			"--epp-border",
			"--epp-surface",
			"--epp-surface-2",
			"--epp-space-1",
			"--epp-space-2",
			"--epp-space-3",
			"--epp-space-4",
			"--epp-space-5",
			"--epp-space-6",
			"--epp-radius-sm",
			"--epp-radius-md",
			"--epp-radius-lg",
			"--epp-radius-pill",
			"--epp-elevation-1",
			"--epp-elevation-2",
			"--epp-font-xs",
			"--epp-font-sm",
			"--epp-font-base",
			"--epp-font-md",
			"--epp-font-lg",
			"--epp-font-xl",
			"--epp-font-2xl",
			"--epp-weight-regular",
			"--epp-weight-medium",
			"--epp-weight-semibold",
			"--epp-control-height",
			"--epp-control-height-sm",
			"--epp-focus-ring",
		];
		for (const name of expected) {
			expect(text).toContain(`${name}:`);
		}
	});
});
