import { expect, test } from "vitest";

/**
 * Regression guard for the Node/happy-dom localStorage conflict patched in
 * src/__tests__/setup.ts.
 *
 * Node 25 exposed a built-in `globalThis.localStorage` object with no
 * `setItem`; Node 26 exposes a getter that returns `undefined` unless
 * `--localstorage-file` is provided. Either shape shadows happy-dom's
 * Storage, so the setup file must leave the test environment with a working
 * localStorage regardless of host Node version.
 */
test("test environment provides a working localStorage", () => {
	localStorage.setItem("probe-key", "probe-value");
	expect(localStorage.getItem("probe-key")).toBe("probe-value");
	localStorage.removeItem("probe-key");
	expect(localStorage.getItem("probe-key")).toBeNull();
});
