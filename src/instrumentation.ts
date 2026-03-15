export async function register() {
  // Node.js 22+ has a built-in localStorage that requires --localstorage-file
  // to function properly. Without it, localStorage.getItem throws.
  // Polyfill it for SSR compatibility with libraries like next-themes.
  if (typeof globalThis.localStorage !== "undefined") {
    const storage = globalThis.localStorage;
    if (typeof storage.getItem !== "function") {
      const store = new Map<string, string>();
      globalThis.localStorage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
        get length() { return store.size; },
        key: (index: number) => [...store.keys()][index] ?? null,
      } as Storage;
    }
  }
}
