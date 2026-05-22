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
