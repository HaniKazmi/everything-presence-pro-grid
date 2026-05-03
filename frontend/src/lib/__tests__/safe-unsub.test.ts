import { describe, expect, it, vi } from "vitest";
import { safeUnsub } from "../safe-unsub.js";

describe("safeUnsub", () => {
	it("calls the unsubscribe callback", () => {
		const unsub = vi.fn();
		safeUnsub(unsub);
		expect(unsub).toHaveBeenCalledOnce();
	});

	it("swallows errors thrown by the callback", () => {
		const unsub = () => {
			throw new Error("stale subscription");
		};
		expect(() => safeUnsub(unsub)).not.toThrow();
	});

	it("is a no-op when given undefined", () => {
		expect(() => safeUnsub(undefined)).not.toThrow();
	});

	it("is a no-op when given null", () => {
		expect(() => safeUnsub(null)).not.toThrow();
	});
});
