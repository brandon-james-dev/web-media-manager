/**
 * The storage a crash guard records into, so a test can drive it without a
 * browser.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const storage: ThemeCrashStorage = {
 *   getItem: (key) => values.get(key) ?? null,
 *   setItem: (key, value) => values.set(key, value),
 *   removeItem: (key) => values.delete(key),
 * };
 * ```
 */
export interface ThemeCrashStorage {
  /** Reads one stored value. */
  getItem(key: string): string | null;
  /** Writes one stored value. */
  setItem(key: string, value: string): void;
  /** Drops one stored value. */
  removeItem(key: string): void;
}

/**
 * The storage key the crash record lives under.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * sessionStorage.removeItem(THEME_CRASH_STORAGE_KEY);
 * ```
 */
export const THEME_CRASH_STORAGE_KEY = "wmm.theme.crashes";

/**
 * How long a crash counts towards the same theme's crash count.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * `Two crashes within ${THEME_CRASH_WINDOW_MS} ms turn the theme off`;
 * ```
 */
export const THEME_CRASH_WINDOW_MS = 30_000;

/**
 * One theme's crash record: the theme id and the times it crashed.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const record: ThemeCrashRecord = { themeId: "classic-blue", times: [1, 2] };
 * ```
 */
interface ThemeCrashRecord {
  readonly themeId: string;
  readonly times: number[];
}

/**
 * Counts the crashes of the theme that is rendering, so a layout that throws
 * twice in a row is turned off instead of retried forever. The record is one
 * theme id and its crash times, kept in storage so a reload still counts.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const guard = new ThemeCrashGuard(storage, () => 1000);
 * guard.recordCrash("classic-blue"); // false
 * guard.recordCrash("classic-blue"); // true
 * ```
 */
export class ThemeCrashGuard {
  private readonly storage: ThemeCrashStorage;
  private readonly now: () => number;

  constructor(storage: ThemeCrashStorage, now: () => number) {
    this.storage = storage;
    this.now = now;
  }

  /**
   * Records one crash of `themeId` and reports whether it is the second crash
   * of that theme inside the window. A crash of a different theme starts a
   * fresh record.
   *
   * @example
   * ```xml
   * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
   * ```
   * @example
   * ```ts
   * if (guard.recordCrash(themeId)) revertToDefault();
   * ```
   */
  recordCrash(themeId: string): boolean {
    const time = this.now();
    const previous = this.read();
    const times =
      previous !== undefined && previous.themeId === themeId
        ? previous.times
        : [];
    const recent = [...times, time].filter(
      (entry) => time - entry <= THEME_CRASH_WINDOW_MS
    );
    this.write({ themeId, times: recent });
    return recent.length >= 2;
  }

  /**
   * Forgets the crash record, so the next crash counts as the first.
   *
   * @example
   * ```xml
   * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
   * ```
   * @example
   * ```ts
   * guard.clear();
   * ```
   */
  clear(): void {
    this.storage.removeItem(THEME_CRASH_STORAGE_KEY);
  }

  /** The stored record, or `undefined` when there is none or it is unreadable. */
  private read(): ThemeCrashRecord | undefined {
    const raw = this.storage.getItem(THEME_CRASH_STORAGE_KEY);
    if (raw === null) return undefined;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) return undefined;
      if (!("themeId" in parsed) || !("times" in parsed)) return undefined;
      const { themeId, times } = parsed;
      if (typeof themeId !== "string" || !Array.isArray(times)) {
        return undefined;
      }
      return {
        themeId,
        times: times.filter(
          (entry): entry is number => typeof entry === "number"
        ),
      };
    } catch {
      return undefined;
    }
  }

  /** Stores one record, ignoring a storage that refuses to write. */
  private write(record: ThemeCrashRecord): void {
    try {
      this.storage.setItem(THEME_CRASH_STORAGE_KEY, JSON.stringify(record));
    } catch {
      return;
    }
  }
}

/**
 * The session storage of the running page, when it can be written to.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const storage = availableSessionStorage();
 * ```
 */
function availableSessionStorage(): ThemeCrashStorage | undefined {
  try {
    if (typeof sessionStorage === "undefined") return undefined;
    const probe = `${THEME_CRASH_STORAGE_KEY}.probe`;
    sessionStorage.setItem(probe, "1");
    sessionStorage.removeItem(probe);
    return sessionStorage;
  } catch {
    return undefined;
  }
}

/**
 * A storage that keeps its values for the lifetime of the page only.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const storage = createMemoryStorage();
 * ```
 */
function createMemoryStorage(): ThemeCrashStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

/**
 * The app-wide crash guard, backed by session storage and by memory when the
 * page has no writable session storage.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * themeCrashGuard.recordCrash("classic-blue");
 * ```
 */
export const themeCrashGuard = new ThemeCrashGuard(
  availableSessionStorage() ?? createMemoryStorage(),
  () => Date.now()
);
