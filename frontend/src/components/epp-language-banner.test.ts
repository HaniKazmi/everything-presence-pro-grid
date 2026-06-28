import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "./epp-language-banner.js";
import { STORAGE_KEY_LANG_REQUEST_DISMISSED } from "../lib/storage.js";
import type { EppLanguageBanner } from "./epp-language-banner.js";
import { buildTranslationRequestUrl } from "./epp-language-banner.js";

// Minimal localize stub: echoes a readable string incl. the {language} param.
const localize = Object.assign(
	(key: string, params?: Record<string, string | number>) =>
		params?.language ? `${key}:${params.language}` : key,
	{ formatNumber: (v: number) => String(v), lang: "en" },
);

async function fixture(lang: string): Promise<EppLanguageBanner> {
	const el = document.createElement("epp-language-banner") as EppLanguageBanner;
	el.localize = localize;
	el.hass = { locale: { language: lang } };
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("buildTranslationRequestUrl", () => {
	it("builds a prefilled new-issue URL with template, label and region title", () => {
		const url = new URL(
			buildTranslationRequestUrl("pt-BR", "português (Brasil)"),
		);
		expect(url.origin + url.pathname).toBe(
			"https://github.com/clintongormley/everything-presence-pro-grid/issues/new",
		);
		expect(url.searchParams.get("template")).toBe("translation_request.md");
		expect(url.searchParams.get("labels")).toBe("translation");
		expect(url.searchParams.get("title")).toBe(
			"Translation request: português (Brasil) (pt-BR)",
		);
	});
});

describe("epp-language-banner", () => {
	beforeEach(() => localStorage.clear());
	afterEach(() => {
		localStorage.clear();
		document.body.innerHTML = "";
	});

	it("renders nothing for a shipped language", async () => {
		const el = await fixture("es");
		expect(el.shadowRoot!.querySelector(".banner")).toBeNull();
	});

	it("shows for an unshipped language with the native name and request link", async () => {
		const el = await fixture("fr");
		const banner = el.shadowRoot!.querySelector(".banner")!;
		expect(banner).not.toBeNull();
		expect(banner.textContent).toContain("français");
		const link = el.shadowRoot!.querySelector("a.action") as HTMLAnchorElement;
		expect(link.getAttribute("href")).toContain(
			"github.com/clintongormley/everything-presence-pro-grid/issues/new",
		);
		expect(link.getAttribute("target")).toBe("_blank");
	});

	it("stays hidden when already dismissed for that locale", async () => {
		localStorage.setItem(STORAGE_KEY_LANG_REQUEST_DISMISSED, "fr");
		const el = await fixture("fr");
		expect(el.shadowRoot!.querySelector(".banner")).toBeNull();
	});

	it("dismiss persists the locale and hides the banner", async () => {
		const el = await fixture("de");
		expect(el.shadowRoot!.querySelector(".banner")).not.toBeNull();
		(
			el.shadowRoot!.querySelector("epp-icon-button") as HTMLElement
		).dispatchEvent(new Event("click", { bubbles: true, composed: true }));
		await el.updateComplete;
		expect(localStorage.getItem(STORAGE_KEY_LANG_REQUEST_DISMISSED)).toBe("de");
		expect(el.shadowRoot!.querySelector(".banner")).toBeNull();
	});

	it("reappears for a different unshipped locale after dismissing another", async () => {
		localStorage.setItem(STORAGE_KEY_LANG_REQUEST_DISMISSED, "de");
		const el = await fixture("fr");
		expect(el.shadowRoot!.querySelector(".banner")).not.toBeNull();
	});
});
