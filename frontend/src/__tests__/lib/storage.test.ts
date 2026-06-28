import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	persistDismissedLangRequest,
	persistSelectedMac,
	readDismissedLangRequest,
	readStoredMac,
	STORAGE_KEY_LANG_REQUEST_DISMISSED,
	STORAGE_KEY_SELECTED_MAC,
} from "../../lib/storage.js";

describe("lib/storage", () => {
	beforeEach(() => {
		localStorage.clear();
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
			const spy = vi.spyOn(localStorage, "getItem").mockImplementation(() => {
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
			const spy = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
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

describe("lib/storage — language-request dismissal", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("returns null when nothing is stored", () => {
		expect(readDismissedLangRequest()).toBeNull();
	});

	it("round-trips the dismissed locale code", () => {
		persistDismissedLangRequest("pt-BR");
		expect(localStorage.getItem(STORAGE_KEY_LANG_REQUEST_DISMISSED)).toBe(
			"pt-BR",
		);
		expect(readDismissedLangRequest()).toBe("pt-BR");
	});

	it("returns null when localStorage throws on read", () => {
		const spy = vi.spyOn(localStorage, "getItem").mockImplementation(() => {
			throw new Error("blocked");
		});
		expect(readDismissedLangRequest()).toBeNull();
		spy.mockRestore();
	});

	it("swallows errors when localStorage throws on write", () => {
		const spy = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
			throw new Error("blocked");
		});
		expect(() => persistDismissedLangRequest("fr")).not.toThrow();
		spy.mockRestore();
	});

	afterEach(() => {
		localStorage.clear();
	});
});
