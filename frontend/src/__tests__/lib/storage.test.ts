import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	persistSelectedMac,
	persistView,
	readStoredMac,
	readStoredView,
	STORAGE_KEY_SELECTED_MAC,
	STORAGE_KEY_VIEW,
} from "../../lib/storage.js";

describe("lib/storage", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	describe("readStoredView", () => {
		it("returns 'live' when nothing is stored", () => {
			expect(readStoredView()).toBe("live");
		});

		it("returns 'editor' / 'settings' when those are stored", () => {
			localStorage.setItem(STORAGE_KEY_VIEW, "editor");
			expect(readStoredView()).toBe("editor");
			localStorage.setItem(STORAGE_KEY_VIEW, "settings");
			expect(readStoredView()).toBe("settings");
		});

		it("falls back to 'live' for an invalid stored value", () => {
			localStorage.setItem(STORAGE_KEY_VIEW, "bogus");
			expect(readStoredView()).toBe("live");
		});

		it("returns 'live' when localStorage throws", () => {
			const spy = vi
				.spyOn(Storage.prototype, "getItem")
				.mockImplementation(() => {
					throw new Error("blocked");
				});
			expect(readStoredView()).toBe("live");
			spy.mockRestore();
		});
	});

	describe("persistView", () => {
		it("writes non-default views to localStorage", () => {
			persistView("editor");
			expect(localStorage.getItem(STORAGE_KEY_VIEW)).toBe("editor");
		});

		it("removes the key when persisting 'live'", () => {
			localStorage.setItem(STORAGE_KEY_VIEW, "editor");
			persistView("live");
			expect(localStorage.getItem(STORAGE_KEY_VIEW)).toBeNull();
		});

		it("swallows errors when localStorage is unavailable", () => {
			const spy = vi
				.spyOn(Storage.prototype, "setItem")
				.mockImplementation(() => {
					throw new Error("blocked");
				});
			expect(() => persistView("editor")).not.toThrow();
			spy.mockRestore();
		});
	});

	describe("readStoredMac", () => {
		it("returns null when nothing is stored", () => {
			expect(readStoredMac()).toBeNull();
		});

		it("returns the stored mac", () => {
			localStorage.setItem(STORAGE_KEY_SELECTED_MAC, "aa:bb:cc");
			expect(readStoredMac()).toBe("aa:bb:cc");
		});

		it("returns null when localStorage throws", () => {
			const spy = vi
				.spyOn(Storage.prototype, "getItem")
				.mockImplementation(() => {
					throw new Error("blocked");
				});
			expect(readStoredMac()).toBeNull();
			spy.mockRestore();
		});
	});

	describe("persistSelectedMac", () => {
		it("writes the mac", () => {
			persistSelectedMac("aa:bb:cc");
			expect(localStorage.getItem(STORAGE_KEY_SELECTED_MAC)).toBe("aa:bb:cc");
		});

		it("removes the key when passed an empty string", () => {
			localStorage.setItem(STORAGE_KEY_SELECTED_MAC, "aa:bb:cc");
			persistSelectedMac("");
			expect(localStorage.getItem(STORAGE_KEY_SELECTED_MAC)).toBeNull();
		});

		it("swallows errors when localStorage is unavailable", () => {
			const spy = vi
				.spyOn(Storage.prototype, "setItem")
				.mockImplementation(() => {
					throw new Error("blocked");
				});
			expect(() => persistSelectedMac("aa:bb:cc")).not.toThrow();
			spy.mockRestore();
		});
	});

	afterEach(() => {
		localStorage.clear();
	});
});
