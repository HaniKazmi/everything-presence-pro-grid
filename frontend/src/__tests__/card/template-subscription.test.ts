import { describe, expect, it, vi } from "vitest";
import {
	hasTemplate,
	subscribeRenderTemplate,
	TemplateField,
} from "../../card/template-subscription.js";

function makeHass() {
	let cb: ((msg: unknown) => void) | null = null;
	const unsub = vi.fn();
	const subscribeMessage = vi.fn(async (c: (msg: unknown) => void) => {
		cb = c;
		return unsub;
	});
	return {
		hass: { connection: { subscribeMessage } },
		emit: (m: unknown) => cb?.(m),
		subscribeMessage,
		unsub,
	};
}

describe("hasTemplate", () => {
	it("detects {{ }}, {% %}, {# #}", () => {
		expect(hasTemplate("{{ x }}")).toBe(true);
		expect(hasTemplate("{% if x %}a{% endif %}")).toBe(true);
		expect(hasTemplate("{# c #}")).toBe(true);
	});
	it("is false for plain or empty text", () => {
		expect(hasTemplate("Lounge")).toBe(false);
		expect(hasTemplate("")).toBe(false);
	});
});

describe("subscribeRenderTemplate", () => {
	it("requests render_template with template, variables, report_errors", () => {
		const h = makeHass();
		subscribeRenderTemplate(
			h.hass,
			{ template: "{{ 1 }}", variables: { config: { device_id: "d" } } },
			vi.fn(),
		);
		expect(h.subscribeMessage).toHaveBeenCalledWith(expect.any(Function), {
			type: "render_template",
			template: "{{ 1 }}",
			variables: { config: { device_id: "d" } },
			report_errors: true,
		});
	});

	it("delivers result as text and clears error", () => {
		const h = makeHass();
		const cb = vi.fn();
		subscribeRenderTemplate(h.hass, { template: "{{ 1 }}" }, cb);
		h.emit({ result: 42 });
		expect(cb).toHaveBeenLastCalledWith({ text: "42", error: null });
	});

	it("delivers error events", () => {
		const h = makeHass();
		const cb = vi.fn();
		subscribeRenderTemplate(h.hass, { template: "{{ x }}" }, cb);
		h.emit({ error: "bad" });
		expect(cb).toHaveBeenLastCalledWith({ text: "", error: "bad" });
	});

	it("unsubscribes", async () => {
		const h = makeHass();
		const off = subscribeRenderTemplate(
			h.hass,
			{ template: "{{ 1 }}" },
			vi.fn(),
		);
		await Promise.resolve();
		off();
		expect(h.unsub).toHaveBeenCalledTimes(1);
	});

	it("unsubscribes an in-flight open once it resolves", async () => {
		const unsub = vi.fn();
		let resolve!: (u: () => void) => void;
		const subscribeMessage = vi.fn(
			() =>
				new Promise<() => void>((r) => {
					resolve = r;
				}),
		);
		const hass = { connection: { subscribeMessage } };
		const off = subscribeRenderTemplate(hass, { template: "{{1}}" }, vi.fn());
		off();
		resolve(unsub);
		await Promise.resolve();
		expect(unsub).toHaveBeenCalledTimes(1);
	});

	it("reports an error when the open rejects", async () => {
		const subscribeMessage = vi.fn(() => Promise.reject(new Error("boom")));
		const cb = vi.fn();
		subscribeRenderTemplate(
			{ connection: { subscribeMessage } },
			{ template: "{{1}}" },
			cb,
		);
		await Promise.resolve();
		expect(cb).toHaveBeenLastCalledWith({ text: "", error: "boom" });
	});

	it("does not call cb when off() is called before rejection resolves", async () => {
		let reject!: (e: unknown) => void;
		const subscribeMessage = vi.fn(
			() =>
				new Promise<() => void>((_, r) => {
					reject = r;
				}),
		);
		const cb = vi.fn();
		const off = subscribeRenderTemplate(
			{ connection: { subscribeMessage } },
			{ template: "{{1}}" },
			cb,
		);
		off();
		reject(new Error("boom"));
		await Promise.resolve();
		expect(cb).not.toHaveBeenCalled();
	});

	it("reports a string error when the rejection is not an Error instance", async () => {
		const subscribeMessage = vi.fn(() => Promise.reject("string-error"));
		const cb = vi.fn();
		subscribeRenderTemplate(
			{ connection: { subscribeMessage } },
			{ template: "{{1}}" },
			cb,
		);
		await Promise.resolve();
		expect(cb).toHaveBeenLastCalledWith({ text: "", error: "string-error" });
	});

	it("delivers empty text when result is null", () => {
		const h = makeHass();
		const cb = vi.fn();
		subscribeRenderTemplate(h.hass, { template: "{{ x }}" }, cb);
		h.emit({ result: null });
		expect(cb).toHaveBeenLastCalledWith({ text: "", error: null });
	});

	it("delivers empty text when msg is null", () => {
		const h = makeHass();
		const cb = vi.fn();
		subscribeRenderTemplate(h.hass, { template: "{{ x }}" }, cb);
		h.emit(null);
		expect(cb).toHaveBeenLastCalledWith({ text: "", error: null });
	});
});

describe("TemplateField", () => {
	it("sets static text without subscribing", () => {
		const h = makeHass();
		const f = new TemplateField(vi.fn());
		f.update(h.hass, "Lounge", {});
		expect(f.text).toBe("Lounge");
		expect(h.subscribeMessage).not.toHaveBeenCalled();
	});

	it("clears text for an empty string, no subscription", () => {
		const h = makeHass();
		const f = new TemplateField(vi.fn());
		f.update(h.hass, "", {});
		expect(f.text).toBe("");
		expect(h.subscribeMessage).not.toHaveBeenCalled();
	});

	it("clears text when template is undefined, no subscription", () => {
		const h = makeHass();
		const f = new TemplateField(vi.fn());
		f.update(h.hass, undefined as unknown as string, {});
		expect(f.text).toBe("");
		expect(h.subscribeMessage).not.toHaveBeenCalled();
	});

	it("subscribes for a template and stores rendered text, firing onChange", () => {
		const h = makeHass();
		const onChange = vi.fn();
		const f = new TemplateField(onChange);
		f.update(h.hass, "{{ states('x') }}", { config: {} });
		expect(h.subscribeMessage).toHaveBeenCalledTimes(1);
		h.emit({ result: "hi" });
		expect(f.text).toBe("hi");
		expect(onChange).toHaveBeenCalled();
	});

	it("renders error text on a template error", () => {
		const h = makeHass();
		const f = new TemplateField(vi.fn());
		f.update(h.hass, "{{ bad }}", {});
		h.emit({ error: "oops" });
		expect(f.text).toBe("oops");
	});

	it("does not re-subscribe when template and connection are unchanged", () => {
		const h = makeHass();
		const f = new TemplateField(vi.fn());
		f.update(h.hass, "{{ a }}", {});
		f.update(h.hass, "{{ a }}", {});
		expect(h.subscribeMessage).toHaveBeenCalledTimes(1);
	});

	it("re-subscribes when the template changes", async () => {
		const h = makeHass();
		const f = new TemplateField(vi.fn());
		f.update(h.hass, "{{ a }}", {});
		await Promise.resolve();
		f.update(h.hass, "{{ b }}", {});
		expect(h.subscribeMessage).toHaveBeenCalledTimes(2);
		expect(h.unsub).toHaveBeenCalledTimes(1);
	});

	it("tears down the subscription when switching to static text", async () => {
		const h = makeHass();
		const f = new TemplateField(vi.fn());
		f.update(h.hass, "{{ a }}", {});
		await Promise.resolve();
		f.update(h.hass, "Lounge", {});
		expect(h.unsub).toHaveBeenCalledTimes(1);
		expect(f.text).toBe("Lounge");
	});

	it("dispose tears down the subscription", async () => {
		const h = makeHass();
		const f = new TemplateField(vi.fn());
		f.update(h.hass, "{{ a }}", {});
		await Promise.resolve();
		f.dispose();
		expect(h.unsub).toHaveBeenCalledTimes(1);
	});
});
