import type { MusicSource } from "@/models";
import type { MetadataDb } from "./MetadataDb";
import type { IRepository, DataChangedCallback } from "..";
import type { Collection, UpdateSpec } from "dexie";
import type { QueryOptions } from "../QueryOptions";
import type { DataSourceResult } from "../DataSourceResult";

export class DexieSourceStore implements IRepository<MusicSource> {
  private db: MetadataDb;

  private addedListeners = new Set<DataChangedCallback<MusicSource>>();
  private updatedListeners = new Set<DataChangedCallback<MusicSource>>();
  private deletedListeners = new Set<DataChangedCallback<MusicSource>>();
  private clearedListeners = new Set<() => void>();

  constructor(db: MetadataDb) {
    this.db = db;

    this.db.sources.hook("creating", (_, obj) => {
      for (const cb of this.addedListeners) cb(obj);
    });

    this.db.sources.hook("updating", (mods, _, obj) => {
      const updated = { ...obj, ...mods };
      for (const cb of this.updatedListeners) cb(updated);
    });

    this.db.sources.hook("deleting", (_, obj) => {
      for (const cb of this.deletedListeners) cb(obj);
    });
  }

  onAdded(cb: DataChangedCallback<MusicSource>): () => void {
    this.addedListeners.add(cb);
    return () => this.addedListeners.delete(cb);
  }

  onUpdated(cb: DataChangedCallback<MusicSource>): () => void {
    this.updatedListeners.add(cb);
    return () => this.updatedListeners.delete(cb);
  }

  onDeleted(cb: DataChangedCallback<MusicSource>): () => void {
    this.deletedListeners.add(cb);
    return () => this.deletedListeners.delete(cb);
  }

  onStoreCleared(cb: () => void): () => void {
    this.clearedListeners.add(cb);
    return () => this.clearedListeners.delete(cb);
  }

  async get(id: string): Promise<MusicSource | null> {
    return (await this.db.sources.get(id)) ?? null;
  }

  async filter(
    options: QueryOptions<MusicSource>
  ): Promise<DataSourceResult<MusicSource>> {
    const { filter, sort, skip, page } = options;

    const table = this.db.sources;

    const total = await table.count();
    let collection: Collection<MusicSource>;

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

  async getAll(): Promise<MusicSource[]> {
    return await this.db.sources.toArray();
  }

  async save(id: string, updated: MusicSource): Promise<MusicSource> {
    const existing = await this.db.sources.get(id);

    if (existing) {
      await this.db.sources.put(updated, id);
    } else {
      await this.db.sources.add(updated, id);
    }

    return updated;
  }

  async batchUpdate(
    items: { id: string; updated: MusicSource }[]
  ): Promise<void> {
    const updates = items.map(({ id, updated }) => {
      const changes: UpdateSpec<MusicSource> = { ...updated };
      return { key: id, changes };
    });

    await this.db.sources.bulkUpdate(updates);

    for (const { updated } of items) {
      for (const cb of this.updatedListeners) cb(updated);
    }
  }

  async delete(id: string): Promise<void> {
    const existing = await this.db.sources.get(id);
    if (!existing) return;

    await this.db.sources.delete(id);

    for (const cb of this.deletedListeners) cb(existing);
  }

  async batchDelete(ids: string[]): Promise<void> {
    const existing = await this.db.sources.bulkGet(ids);

    await this.db.sources.bulkDelete(ids);

    for (const dir of existing) {
      if (dir) {
        for (const cb of this.deletedListeners) cb(dir);
      }
    }
  }

  async clearStore(): Promise<void> {
    await this.db.sources.clear();

    for (const cb of this.clearedListeners) cb();
  }
}
