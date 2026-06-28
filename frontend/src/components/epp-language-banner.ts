import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import "../ui/epp-icon-button.js";
import {
	isLangRequestDismissed,
	persistDismissedLangRequest,
} from "../lib/storage.js";
import {
	defaultLocalize,
	getLanguageSupport,
	type LocalizeFn,
	languageDisplayName,
} from "../localize.js";

const REPO = "clintongormley/everything-presence-pro-grid";

/** Prefilled new-issue URL for a translation request (region-qualified). */
export function buildTranslationRequestUrl(
	code: string,
	displayName: string,
): string {
	const params = new URLSearchParams({
		template: "translation_request.md",
		labels: "translation",
		title: `Translation request: ${displayName} (${code})`,
	});
	return `https://github.com/${REPO}/issues/new?${params.toString()}`;
}

/**
 * Dismissable nudge shown when the user's HA language isn't shipped. Renders
 * nothing for covered languages or once dismissed for the current locale.
 * Self-contained: composes epp-icon-button and the pure helpers.
 */
export class EppLanguageBanner extends LitElement {
	// Permissive: we only read hass.locale.language / hass.language.
	@property({ attribute: false }) hass: unknown;
	@property({ attribute: false }) localize: LocalizeFn = defaultLocalize;
	// In-memory dismissal keyed by locale so a live language switch re-prompts.
	@state() private _dismissedCode: string | null = null;
	// Resolved once per `hass` change (not per render): the nudge to show, or
	// null when the language is covered or already dismissed for this locale.
	// Keeps the localStorage read + Intl.DisplayNames + URL build off the
	// per-render path (HA pushes a fresh `hass` far less often than Lit renders).
	@state() private _nudge: { code: string; name: string; url: string } | null =
		null;

	static styles = css`
		:host {
			display: block;
		}
		.banner {
			display: flex;
			align-items: center;
			gap: var(--epp-space-2, 8px);
			margin: var(--epp-space-3, 12px) var(--epp-space-4, 16px) 0;
			padding: var(--epp-space-2, 8px) var(--epp-space-3, 12px);
			border: 1px solid var(--epp-border, #e0e0e0);
			border-radius: var(--epp-radius-md, 10px);
			background: var(--epp-surface-2, #f5f5f5);
			color: var(--epp-text, #212121);
			font-size: var(--epp-font-base, 14px);
		}
		.banner > ha-icon {
			flex: 0 0 auto;
			color: var(--epp-accent, #03a9f4);
		}
		.message {
			flex: 1;
		}
		.action {
			white-space: nowrap;
			color: var(--epp-accent, #03a9f4);
			font-weight: var(--epp-weight-medium, 500);
			text-decoration: none;
		}
		.action:hover {
			text-decoration: underline;
		}
	`;

	willUpdate(changed: PropertyValues) {
		if (!changed.has("hass")) return;
		const support = getLanguageSupport(
			this.hass as { locale?: { language?: string }; language?: string },
		);
		if (support.available || isLangRequestDismissed(support.code)) {
			this._nudge = null;
			return;
		}
		const name = languageDisplayName(support.code);
		this._nudge = {
			code: support.code,
			name,
			url: buildTranslationRequestUrl(support.code, name),
		};
	}

	render() {
		const nudge = this._nudge;
		if (!nudge || this._dismissedCode === nudge.code) return nothing;
		return html`
			<div class="banner" role="status">
				<ha-icon icon="mdi:translate"></ha-icon>
				<span class="message"
					>${this.localize("language_request.message", {
						language: nudge.name,
					})}</span
				>
				<a
					class="action"
					href=${nudge.url}
					target="_blank"
					rel="noopener noreferrer"
					>${this.localize("language_request.action")}</a
				>
				<epp-icon-button
					icon="mdi:close"
					.label=${this.localize("language_request.dismiss")}
					@click=${(e: Event) => this._dismiss(e, nudge.code)}
				></epp-icon-button>
			</div>
		`;
	}

	private _dismiss(e: Event, code: string) {
		e.stopPropagation();
		persistDismissedLangRequest(code);
		this._dismissedCode = code;
	}
}

/* v8 ignore start — the already-defined path only triggers on HA panel
   re-import (module re-eval), unreachable in a single test environment */
if (!customElements.get("epp-language-banner")) {
	customElements.define("epp-language-banner", EppLanguageBanner);
}
/* v8 ignore stop */

declare global {
	interface HTMLElementTagNameMap {
		"epp-language-banner": EppLanguageBanner;
	}
}
