/**
 * Tiny localStorage persistence layer for the MSW mock backend.
 *
 * Mock "database" arrays register themselves here so every mutation made via the
 * Super Admin / Vendor / Buyer UIs survives a page reload. `persistAll()` is
 * called automatically after every mocked non-GET request (see ./browser.ts).
 */

export const PERSIST_PREFIX = 'cf_db_';

const registry = new Map<string, () => unknown>();

export function loadPersisted<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PERSIST_PREFIX + key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // corrupted / unavailable storage — fall back to defaults
  }
  return fallback;
}

/** Register a getter so the current value is written on every persistAll(). */
export function registerPersisted(key: string, getter: () => unknown): void {
  registry.set(key, getter);
}

export function persistAll(): void {
  registry.forEach((getter, key) => {
    try {
      localStorage.setItem(PERSIST_PREFIX + key, JSON.stringify(getter()));
    } catch {
      // quota exceeded / unavailable — ignore
    }
  });
}

/** Removes every persisted mock-database key. */
export function clearPersisted(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PERSIST_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
