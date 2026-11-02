import type { Playlist } from "@/models";
import { getMetadataDb } from "./MetadataDb";
import type {
  DataChangedCallback,
  IRepository,
  QueryOptions,
} from "..";
import type { DataSourceResult } from "../DataSourceResult";

/** Reserved id for the pinned, non-deletable favorites playlist. */
export const FAVORITES_PLAYLIST_ID = "favorites";

/**
 * Dexie-backed playlist store. One playlist per row in the `playlists`
 * table; `songs` (ordered entries with addedAt) is the payload.
 */
export class DexiePlaylistStore implements IRepository<Playlist> {
  private readonly db = getMetadataDb();

  async get(id: string): Promise<Playlist | null> {
    return (await this.db.playlists.get(id)) ?? null;
  }

  async save(id: string, updated: Playlist): Promise<Playlist> {
    await this.db.playlists.put({
      ...updated,
      id,
    });

    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db.playlists.delete(id);
  }

  async getAll(): Promise<Playlist[]> {
    return this.db.playlists.toArray();
  }

  async filter(
    options: QueryOptions<Playlist>
  ): Promise<DataSourceResult<Playlist>> {
    let items = await this.db.playlists.toArray();
    const total = items.length;

    if (options.filter) {
      items = items.filter(options.filter);
    }

    const filteredCount = items.length;
    const skip = options.skip ?? 0;
    const take = options.take ?? filteredCount;

    return {
      data: items.slice(skip, skip + take),
      filteredCount,
      total,
    };
  }

  async batchDelete(ids: string[]): Promise<void> {
    await this.db.transaction("rw", this.db.playlists, async () => {
      await this.db.playlists.bulkDelete(ids);
    });
  }

  async batchUpdate(
    items: {
      id: string;
      updated: Playlist;
    }[]
  ): Promise<void> {
    await this.db.transaction("rw", this.db.playlists, async () => {
      await this.db.playlists.bulkPut(
        items.map(({ id, updated }) => ({
          ...updated,
          id,
        }))
      );
    });
  }

  async clearStore(): Promise<void> {
    await this.db.playlists.clear();
  }

  onAdded(_cb: DataChangedCallback<Playlist>): () => void {
    return () => {};
  }

  onUpdated(_cb: DataChangedCallback<Playlist>): () => void {
    return () => {};
  }

  onDeleted(_cb: DataChangedCallback<Playlist>): () => void {
    return () => {};
  }

  onStoreCleared(_cb: () => void): () => void {
    return () => {};
  }

  /** Seed the reserved favorites playlist the first time it is used. */
  async ensureFavorites(): Promise<void> {
    const existing = await this.db.playlists.get(FAVORITES_PLAYLIST_ID);
    if (existing) return;

    const now = Date.now();
    await this.db.playlists.put({
      id: FAVORITES_PLAYLIST_ID,
      name: "Favorites",
      songs: [],
      isFavorites: true,
      createdAt: now,
      updatedAt: now,
    });
  }
}
