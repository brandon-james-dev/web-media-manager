import { getWmmMusicDb } from "./WmmMusicDb";
import type { PlayHistoryStore } from "@/core/ports";
import type { PlayHistoryEntry } from "@/models";

/**
 * Dexie-backed play history store. One row per recorded play in the
 * `playHistory` table, keyed by the entry id.
 */
export class DexiePlayHistoryStore implements PlayHistoryStore {
  private readonly db = getWmmMusicDb();

  async record(entry: PlayHistoryEntry): Promise<void> {
    await this.db.playHistory.put(entry);
  }

  async getAll(): Promise<PlayHistoryEntry[]> {
    return this.db.playHistory.toArray();
  }

  async recent(limit: number): Promise<PlayHistoryEntry[]> {
    return this.db.playHistory
      .orderBy("playedAt")
      .reverse()
      .limit(limit)
      .toArray();
  }

  async clearStore(): Promise<void> {
    await this.db.playHistory.clear();
  }
}
