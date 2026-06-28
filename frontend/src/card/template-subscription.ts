/**
 * Helpers for rendering Jinja templates in the overview card via Home
 * Assistant's `render_template` WebSocket subscription. Mirrors the
 * subscribe/teardown shape of card/overview-store.ts.
 */

export interface RenderResult {
	text: string;
	error: string | null;
}

/** True if the string contains Jinja markers and must be rendered server-side. */
export function hasTemplate(value: string): boolean {
	return value.includes("{{") || value.includes("{%") || value.includes("{#");
}

interface SubscribableConnection {
	subscribeMessage: (
		cb: (msg: unknown) => void,
		params: unknown,
	) => Promise<() => void>;
}

/**
 * Subscribe to a rendered template. The callback fires with the rendered text
 * (or an error string) on every update. Returns an unsubscribe function; an
 * in-flight open is closed as soon as it resolves if unsubscribed early.
 */
export function subscribeRenderTemplate(
	hass: { connection: SubscribableConnection },
	params: { template: string; variables?: Record<string, unknown> },
	cb: (r: RenderResult) => void,
): () => void {
	let unsub: (() => void) | null = null;
	let closed = false;
	hass.connection
		.subscribeMessage(
			(msg: unknown) => {
				const m = (msg ?? {}) as Record<string, unknown>;
				if ("error" in m) {
					cb({ text: "", error: String(m.error) });
				} else {
					cb({ text: m.result == null ? "" : String(m.result), error: null });
				}
			},
			{
				type: "render_template",
				template: params.template,
				variables: params.variables,
				report_errors: true,
			},
		)
		.then(
			(u: () => void) => {
				if (closed) {
					u();
					return;
				}
				unsub = u;
			},
			(e: unknown) => {
				if (closed) return;
				const message = e instanceof Error ? e.message : String(e);
				cb({ text: "", error: message });
			},
		);
	return () => {
		closed = true;
		if (unsub) {
			unsub();
			unsub = null;
		}
	};
}

/**
 * Controller for one templated text field. `update()` is idempotent: it only
 * re-subscribes when the template string or connection changes, renders static
 * strings directly (no WebSocket), and reports rendered text via `text` +
 * the `onChange` callback. `dispose()` releases the subscription.
 */
export class TemplateField {
	text = "";
	private _onChange: () => void;
	private _unsub: (() => void) | null = null;
	private _tpl: string | null = null;
	private _conn: unknown = null;

	constructor(onChange: () => void) {
		this._onChange = onChange;
	}

	update(
		hass: { connection: unknown } | undefined,
		template: string,
		variables: Record<string, unknown>,
	): void {
		const tpl = template ?? "";
		if (!tpl) {
			this._teardown();
			this._set("");
			return;
		}
		if (!hasTemplate(tpl)) {
			this._teardown();
			this._set(tpl);
			return;
		}
		if (!hass) {
			this._teardown();
			return;
		}
		if (this._unsub && this._tpl === tpl && this._conn === hass.connection) {
			return;
		}
		this._teardown();
		this._tpl = tpl;
		this._conn = hass.connection;
		this._unsub = subscribeRenderTemplate(
			hass as { connection: SubscribableConnection },
			{ template: tpl, variables },
			(r) => this._set(r.error != null ? r.error : r.text),
		);
	}

	dispose(): void {
		this._teardown();
	}

	private _teardown(): void {
		this._unsub?.();
		this._unsub = null;
		this._tpl = null;
		this._conn = null;
	}

	private _set(text: string): void {
		if (text !== this.text) {
			this.text = text;
			this._onChange();
		}
	}
}
