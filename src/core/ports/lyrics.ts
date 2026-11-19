/**
 * Lyrics settings port.
 *
 * The lyrics providers read their configuration (today: the registered
 * application id) through this port, so the settings screen and the lookup
 * never depend on a concrete storage backend. The browser binding is Dexie
 * (`appSettings`).
 *
 * @example
 * ```ts
 * const store = getLyricsSettingsStore();
 * await store.setApplicationId("my-app-id");
 * const { applicationId } = await store.getSettings();
 * ```
 */
export interface LyricsSettings {
  /**
   * Application id registered with the lyrics provider. Optional: providers
   * that rate-limit per application raise the limit when it is set, and work
   * without it otherwise.
   */
  applicationId?: string;
}

export interface LyricsSettingsStore {
  getSettings(): Promise<LyricsSettings>;
  /** Stores the id, or clears it when the value is empty. */
  setApplicationId(applicationId: string | undefined): Promise<void>;
}

let lyricsSettingsStoreProvider: (() => LyricsSettingsStore) | null = null;

/**
 * Registers the platform's lyrics settings store provider during bootstrap.
 *
 * @example
 * ```ts
 * setLyricsSettingsStoreProvider(() => new DexieLyricsSettingsStore());
 * ```
 */
export function setLyricsSettingsStoreProvider(
  provider: () => LyricsSettingsStore
): void {
  lyricsSettingsStoreProvider = provider;
}

/**
 * Returns the registered lyrics settings store.
 *
 * @example
 * ```ts
 * const { applicationId } = await getLyricsSettingsStore().getSettings();
 * ```
 */
export function getLyricsSettingsStore(): LyricsSettingsStore {
  if (!lyricsSettingsStoreProvider) {
    throw new Error(
      "[core/ports/lyrics] No lyrics settings store provider registered — call setLyricsSettingsStoreProvider() during bootstrap."
    );
  }
  return lyricsSettingsStoreProvider();
}
