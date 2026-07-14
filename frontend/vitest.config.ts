import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: "unit",
					environment: "happy-dom",
					setupFiles: ["src/__tests__/setup.ts"],
					include: ["src/**/*.test.ts"],
					// The browser project owns these — happy-dom has no layout, so a
					// geometry assertion there is meaningless (and would pass on a bug).
					exclude: ["src/**/*.browser.test.ts"],
				},
			},
			{
				test: {
					name: "browser",
					include: ["src/**/*.browser.test.ts"],
					browser: {
						enabled: true,
						provider: playwright(),
						headless: true,
						screenshotFailures: false,
						instances: [{ browser: "chromium" }],
					},
				},
			},
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "json"],
			include: ["src/**/*.ts"],
			exclude: [
				"src/**/*.test.ts",
				"src/**/__tests__/**",
				"src/index.ts",
				"src/card/index.ts",
				"src/ui/index.ts",
			],
			thresholds: {
				perFile: true,
				lines: 90,
				branches: 85,
				functions: 90,
				statements: 90,
			},
		},
	},
});
