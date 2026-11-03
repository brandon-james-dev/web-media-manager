/**
 * Safari-safe storage access.
 *
 * Safari (desktop private mode, iOS with cookies/site-data blocked, and some
 * ITP states) THROWS on any `localStorage` read/write. An unguarded access
 * inside a useState initializer crashes the first render — the app would not
 * show at all. These helpers swallow the error and behave as "nothing
 * stored", so the app renders and features degrade to their system-state
 * defaults instead of white-screening.
 */

export function safeStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable — settings simply won't persist this session.
  }
}
