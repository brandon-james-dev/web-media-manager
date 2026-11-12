import { FAVORITES_PLAYLIST_ID, type Playlist } from "@/models";
import { getWmmMusicDb, type WmmMusicDb } from "./WmmMusicDb";
import type { DataChangedCallback, IRepository, QueryOptions } from "..";
import type { DataSourceResult } from "../DataSourceResult";

/** One observed playlists-table write (Dexie hook payload). */
interface PlaylistChange {
  /** 1 = create, 2 = update, 3 = delete (Dexie hook convention). */
  type: 1 | 2 | 3;
  key: string;
  obj: Playlist;
}

/**
 * Dexie-backed playlist store. One playlist per row in the `playlists`
 * table; `songs` (ordered entries with addedAt) is the payload.
 */
export class DexiePlaylistStore implements IRepository<Playlist> {
  private readonly db = getWmmMusicDb();

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
    await this.ensureFavorites();
    for (const listener of DexiePlaylistStore.clearedListeners) {
      listener();
    }
  }

  onAdded(cb: DataChangedCallback<Playlist>): () => void {
    return this.onTableChanges("create", (obj) => cb(obj));
  }

  onUpdated(cb: DataChangedCallback<Playlist>): () => void {
    return this.onTableChanges("update", (obj) => cb(obj));
  }

  onDeleted(cb: DataChangedCallback<Playlist>): () => void {
    return this.onTableChanges("delete", (_obj, key) =>
      cb({ id: key } as Playlist)
    );
  }

  onStoreCleared(cb: () => void): () => void {
    DexiePlaylistStore.clearedListeners.add(cb);
    return () => {
      DexiePlaylistStore.clearedListeners.delete(cb);
    };
  }

  /**
   * Subscribe to the playlists table's write hooks — core Dexie's only
   * change channel. These callbacks used to be no-ops, so subscribers
   * never heard about writes and rendered stale lists until reload.
   */
  private onTableChanges(
    type: "create" | "update" | "delete",
    onData: (obj: Playlist, key: string) => void
  ): () => void {
    DexiePlaylistStore.bindHooks(this.db);

    const want = type === "create" ? 1 : type === "update" ? 2 : 3;
    const listener = (change: PlaylistChange) => {
      if (change.type === want) onData(change.obj, change.key);
    };

    DexiePlaylistStore.changeListeners.add(listener);
    return () => {
      DexiePlaylistStore.changeListeners.delete(listener);
    };
  }

  private static readonly clearedListeners = new Set<() => void>();
  private static readonly hooksBound = new WeakSet<object>();
  private static readonly changeListeners = new Set<
    (change: PlaylistChange) => void
  >();

  /** Register the table hooks once per database instance. */
  private static bindHooks(db: WmmMusicDb): void {
    if (DexiePlaylistStore.hooksBound.has(db)) return;
    DexiePlaylistStore.hooksBound.add(db);

    const emit = (change: PlaylistChange) => {
      for (const listener of DexiePlaylistStore.changeListeners) {
        listener(change);
      }
    };

    db.playlists.hook("creating", (primKey, obj) => {
      emit({ type: 1, key: String(primKey), obj });
    });
    db.playlists.hook("updating", (mods, primKey, obj) => {
      emit({
        type: 2,
        key: String(primKey),
        obj: { ...obj, ...mods },
      });
    });
    db.playlists.hook("deleting", (primKey) => {
      emit({
        type: 3,
        key: String(primKey),
        obj: undefined as unknown as Playlist,
      });
    });
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
