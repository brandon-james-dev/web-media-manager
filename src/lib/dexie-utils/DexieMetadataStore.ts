import type { Song } from "@/models/Song";
import { type IMetadataStore } from "../metadata-utils";
import type { MetadataDb } from "./MetadataDb";
import type { DataChangedCallback } from "../store";
import type { Collection, UpdateSpec } from "dexie";
import type { QueryOptions } from "../store/QueryOptions";
import type { DataSourceResult } from "../store/DataSourceResult";

export class DexieMetadataStore implements IMetadataStore {
  private db: MetadataDb;

  private songAddedListeners = new Set<DataChangedCallback<Song>>();
  private songUpdatedListeners = new Set<DataChangedCallback<Song>>();
  private songDeletedListeners = new Set<DataChangedCallback<Song>>();
  private storeClearedListeners = new Set<() => void>();

  constructor(db: MetadataDb) {
    this.db = db;
  }

  onAdded(cb: DataChangedCallback<Song>) {
    this.songAddedListeners.add(cb);
    return () => this.songAddedListeners.delete(cb);
  }

  onUpdated(cb: DataChangedCallback<Song>) {
    this.songUpdatedListeners.add(cb);
    return () => this.songUpdatedListeners.delete(cb);
  }

  onDeleted(cb: DataChangedCallback<Song>) {
    this.songDeletedListeners.add(cb);
    return () => this.songDeletedListeners.delete(cb);
  }

  onStoreCleared(cb: () => void): () => void {
    this.storeClearedListeners.add(cb);
    return () => this.storeClearedListeners.delete(cb);
  }

  private emitAdded(song: Song) {
    for (const cb of this.songAddedListeners) cb(song);
  }

  private emitUpdated(song: Song) {
    for (const cb of this.songUpdatedListeners) cb(song);
  }

  private emitDeleted(song: Song) {
    for (const cb of this.songDeletedListeners) cb(song);
  }

  private emitStoreCleared() {
    for (const cb of this.storeClearedListeners) cb();
  }

  async get(id: string): Promise<Song | null> {
    const song = await this.db.songs.get(id);

    return song || null;
  }

  async filter(options: QueryOptions<Song>): Promise<DataSourceResult<Song>> {
    const { filter, sort, skip, page } = options;

    const table = this.db.songs;

    const total = await table.count();
    let collection: Collection<Song>;

    if (sort && typeof sort.selector === "string") {
      collection = table.orderBy(sort.selector);
      if (sort.desc) collection = collection.reverse();
    } else {
      let array = await table.toArray();

      if (sort) {
        const { selector, desc } = sort;

        array.sort((a, b) => {
          const av = selector(a);
          const bv = selector(b);
          if (av < bv) return desc ? 1 : -1;
          if (av > bv) return desc ? -1 : 1;
          return 0;
        });
      }

      if (filter) {
        array = array.filter(filter);
      }

      const filteredCount = array.length;

      const start = skip ?? 0;
      const data = array.slice(start);

      return {
        data,
        total,
        filteredCount,
        page,
        skip,
      };
    }

    if (filter) {
      collection = collection.filter(filter);
    }

    const filteredCount = await collection.count();

    if (typeof skip === "number") {
      collection = collection.offset(skip);
    }

    const data = await collection.toArray();

    return {
      data,
      total,
      filteredCount,
      page,
      skip,
    };
  }

  async getAll(): Promise<Song[]> {
    return await this.db.songs.toArray();
  }

  async save(id: string, updated: Song): Promise<Song> {
    const existing = await this.db.songs.get(id);

    // Strip artwork fields before saving
    updated.coverFront = undefined;
    updated.coverBack = undefined;
    updated.pictures = undefined;

    await this.db.songs.put(updated, id);

    if (existing) {
      this.emitUpdated(updated);
    } else {
      this.emitAdded(updated);
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.db.songs.get(id);
    if (!existing) return;

    await this.db.songs.delete(id);
    this.emitDeleted(existing);
  }

  async batchDelete(ids: string[]): Promise<void> {
    const songs = await this.db.songs.bulkGet(ids);

    for (const song of songs.filter((s) => s != undefined)) {
      const artwork = await this.db.songArtwork
        .filter((art) => art.songId == song.id)
        .toArray();
      await this.db.songArtwork.bulkDelete(artwork.map((a) => a.id!));
    }

    await this.db.songs.bulkDelete(ids);

    for (const song of songs) {
      if (song) this.emitDeleted(song);
    }
  }

  async batchUpdate(items: { id: string; updated: Song }[]): Promise<void> {
    const updates = items.map(({ id, updated }) => {
      const changes: UpdateSpec<Song> = { ...updated };

      return {
        key: id,
        changes,
      };
    });

    await this.db.songs.bulkUpdate(updates);

    for (const { updated } of items) {
      this.emitUpdated(updated);
    }
  }

  async clearStore(): Promise<void> {
    for (const table of this.db.tables) {
      await table.clear();
    }
    this.emitStoreCleared();
  }
}
