import type {
  LyricsSettings,
  LyricsSettingsStore,
} from "@/core/ports/lyrics";
import { getWmmMusicDb } from "./WmmMusicDb";

const APPLICATION_ID_KEY = "lyrics.applicationId";

/**
 * Dexie-backed {@link LyricsSettingsStore}: one `appSettings` row per setting.
 *
 * @example
 * ```ts
 * const store = new DexieLyricsSettingsStore();
 * await store.setApplicationId("my-app-id");
 * ```
 */
export class DexieLyricsSettingsStore implements LyricsSettingsStore {
  private readonly db = getWmmMusicDb();

  async getSettings(): Promise<LyricsSettings> {
    const applicationId = (await this.db.appSettings.get(APPLICATION_ID_KEY))
      ?.value;
    return { applicationId: applicationId || undefined };
  }

  async setApplicationId(applicationId: string | undefined): Promise<void> {
    const value = applicationId?.trim();
    if (!value) {
      await this.db.appSettings.delete(APPLICATION_ID_KEY);
      return;
    }
    await this.db.appSettings.put({ key: APPLICATION_ID_KEY, value });
  }
}
