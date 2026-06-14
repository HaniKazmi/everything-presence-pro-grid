import { html } from "lit";
import type { LocalizeFn } from "../localize.js";
import "../ui/epp-button.js";

/** Named options for {@link renderSaveCancelBar} — replaces the old five
 * positional params (two adjacent booleans were an easy transposition). */
export interface SaveCancelBarOptions {
	saving: boolean;
	dirty: boolean;
	localize: LocalizeFn;
	onSave: () => void;
	onCancel: () => void;
}

/**
 * Shared Save/Cancel button bar used by the editor sidebar (panel) and the
 * settings view — previously two byte-identical copies that had already
 * drifted once.
 *
 * Renders the token-styled `<epp-button>` primitive (always registered, no
 * guard needed). Cancel is the `text` variant, Save the `primary` variant.
 * Both keep the `.save-cancel-bar` / `.save-btn` / `.cancel-btn` hooks so
 * callers' CSS and tests don't care about the inner markup.
 */
export function renderSaveCancelBar(opts: SaveCancelBarOptions) {
	const { saving, dirty, localize, onSave, onCancel } = opts;
	const saveLabel = saving
		? localize("common.saving")
		: localize("common.save");
	const disabled = saving || !dirty;
	return html`
      <div class="save-cancel-bar">
        <epp-button class="cancel-btn" variant="text" @click=${onCancel}
          >${localize("common.cancel")}</epp-button
        >
        <epp-button
          class="save-btn"
          variant="primary"
          ?disabled=${disabled}
          @click=${onSave}
          >${saveLabel}</epp-button
        >
      </div>
    `;
}
