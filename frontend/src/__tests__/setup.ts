/**
 * Vitest setup file: fix the Node.js built-in localStorage conflict.
 *
 * Node ships a built-in `globalThis.localStorage` that shadows happy-dom's
 * Storage but isn't usable without `--localstorage-file`. The exact broken
 * shape varies by Node version:
 *   - Node 25 exposes a plain object with no setItem/getItem/removeItem.
 *   - Node 26 exposes a getter that returns `undefined`.
 * In both cases the test environment is left without a working Storage, so
 * we detect either shape and install a Map-backed Storage.
 */

/**
 * Stop happy-dom's MutationObserver from losing its callback to the GC.
 *
 * happy-dom stores each observer listener's callback in a `WeakRef`
 * (mutation-observer/MutationObserverListener) and, on the next mutation,
 * `deref()`s it — if the GC already collected the callback the listener is
 * silently spliced out and the mutation never fires. Real browsers hold
 * observer callbacks strongly, so this only bites in the test env, and only
 * under memory pressure (full-suite runs cross job boundaries while the GC
 * runs), producing load-dependent flakes like panel-mount-guard's
 * "re-attaches the inner observer" test. Holding WeakRef targets strongly in
 * tests matches browser semantics. happy-dom's other WeakRef uses are caches
 * cleared explicitly on mutation, so retaining them for a short-lived test
 * run is harmless, and our own code uses no WeakRef.
 */
class StrongRef<T extends object> {
	#target: T;
	constructor(target: T) {
		this.#target = target;
	}
	deref(): T | undefined {
		return this.#target;
	}
}
globalThis.WeakRef = StrongRef as unknown as typeof WeakRef;

const existingStorage = globalThis.localStorage as Storage | undefined;
if (!existingStorage || typeof existingStorage.setItem !== "function") {
	const store = new Map<string, string>();

	const storage: Storage = {
		get length() {
			return store.size;
		},
		clear() {
			store.clear();
		},
		getItem(key: string) {
			return store.get(key) ?? null;
		},
		key(index: number) {
			return [...store.keys()][index] ?? null;
		},
		removeItem(key: string) {
			store.delete(key);
		},
		setItem(key: string, value: string) {
			store.set(key, String(value));
		},
	};

	Object.defineProperty(globalThis, "localStorage", {
		value: storage,
		configurable: true,
		writable: true,
	});
}
