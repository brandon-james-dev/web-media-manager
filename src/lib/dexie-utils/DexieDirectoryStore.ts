import type { Directory } from "@/models/Directory";
import type { MetadataDb } from "./MetadataDb";
import type { IRepository, DataChangedCallback } from "../store";
import type { UpdateSpec } from "dexie";

export class DexieDirectoryStore implements IRepository<Directory> {
  private db: MetadataDb;

  private addedListeners = new Set<DataChangedCallback<Directory>>();
  private updatedListeners = new Set<DataChangedCallback<Directory>>();
  private deletedListeners = new Set<DataChangedCallback<Directory>>();
  private clearedListeners = new Set<() => void>();

  constructor(db: MetadataDb) {
    this.db = db;

    this.db.directories.hook("creating", (_, obj) => {
      for (const cb of this.addedListeners) cb(obj);
    });

    this.db.directories.hook("updating", (mods, _, obj) => {
      const updated = { ...obj, ...mods };
      for (const cb of this.updatedListeners) cb(updated);
    });

    this.db.directories.hook("deleting", (_, obj) => {
      for (const cb of this.deletedListeners) cb(obj);
    });
  }

  onAdded(cb: DataChangedCallback<Directory>): () => void {
    this.addedListeners.add(cb);
    return () => this.addedListeners.delete(cb);
  }

  onUpdated(cb: DataChangedCallback<Directory>): () => void {
    this.updatedListeners.add(cb);
    return () => this.updatedListeners.delete(cb);
  }

  onDeleted(cb: DataChangedCallback<Directory>): () => void {
    this.deletedListeners.add(cb);
    return () => this.deletedListeners.delete(cb);
  }

  onStoreCleared(cb: () => void): () => void {
    this.clearedListeners.add(cb);
    return () => this.clearedListeners.delete(cb);
  }

  async get(id: string): Promise<Directory | null> {
    return (await this.db.directories.get(id)) ?? null;
  }

  async filter(predicate: (item: Directory) => boolean): Promise<Directory[]> {
    const all = await this.db.directories.toArray();
    return all.filter(predicate);
  }

  async getAll(): Promise<Directory[]> {
    return await this.db.directories.toArray();
  }

  async save(id: string, updated: Directory): Promise<Directory> {
    const existing = await this.db.directories.get(id);

    await this.db.directories.put(updated, id);

    if (existing) {
      for (const cb of this.updatedListeners) cb(updated);
    } else {
      for (const cb of this.addedListeners) cb(updated);
    }

    return updated;
  }

  async batchUpdate(
    items: { id: string; updated: Directory }[]
  ): Promise<void> {
    const updates = items.map(({ id, updated }) => {
      const changes: UpdateSpec<Directory> = { ...updated };
      return { key: id, changes };
    });

    await this.db.directories.bulkUpdate(updates);

    for (const { updated } of items) {
      for (const cb of this.updatedListeners) cb(updated);
    }
  }

  async delete(id: string): Promise<void> {
    const existing = await this.db.directories.get(id);
    if (!existing) return;

    await this.db.directories.delete(id);

    for (const cb of this.deletedListeners) cb(existing);
  }

  async batchDelete(ids: string[]): Promise<void> {
    const existing = await this.db.directories.bulkGet(ids);

    await this.db.directories.bulkDelete(ids);

    for (const dir of existing) {
      if (dir) {
        for (const cb of this.deletedListeners) cb(dir);
      }
    }
  }

  async clearStore(): Promise<void> {
    await this.db.directories.clear();

    for (const cb of this.clearedListeners) cb();
  }
}
