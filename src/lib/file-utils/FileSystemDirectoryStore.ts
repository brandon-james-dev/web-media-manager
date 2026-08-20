import type { Directory } from "@/models";
import type { DataChangedCallback, IRepository } from "../store";
import type { QueryOptions } from "../store/QueryOptions";
import type { DataSourceResult } from "../store/DataSourceResult";

export class FileSystemDirectoryStore implements IRepository<Directory> {
  private directories: IRepository<Directory>;

  private addedListeners = new Set<DataChangedCallback<Directory>>();
  private updatedListeners = new Set<DataChangedCallback<Directory>>();
  private deletedListeners = new Set<DataChangedCallback<Directory>>();
  private clearedListeners = new Set<() => void>();

  constructor(backingStore: IRepository<Directory>) {
    this.directories = backingStore;
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

  private emitAdded(dir: Directory) {
    for (const cb of this.addedListeners) cb(dir);
  }

  private emitUpdated(dir: Directory) {
    for (const cb of this.updatedListeners) cb(dir);
  }

  private emitDeleted(dir: Directory) {
    for (const cb of this.deletedListeners) cb(dir);
  }

  private emitStoreCleared() {
    for (const cb of this.clearedListeners) cb();
  }

  async get(id: string): Promise<Directory | null> {
    return this.directories.get(id) ?? null;
  }

  filter(
    options: QueryOptions<Directory>
  ): Promise<DataSourceResult<Directory>> {
    return this.directories.filter(options);
  }

  async getAll(): Promise<Directory[]> {
    return this.directories.getAll();
  }

  async save(id: string, updated: Directory): Promise<Directory> {
    const exists = await this.directories.get(id);

    this.directories.save(id, updated);

    if (exists) {
      this.emitUpdated(updated);
    } else {
      this.emitAdded(updated);
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.directories.get(id);
    if (!existing) return;

    this.directories.delete(id);
    this.emitDeleted(existing);
  }

  async batchDelete(ids: string[]): Promise<void> {
    const existing = await this.directories.filter({
      filter: (d) => ids.includes(d.id),
    });

    await this.directories.batchDelete(ids);

    for (const dir of existing.data) {
      this.emitDeleted(dir);
    }
  }

  async batchUpdate(
    items: { id: string; updated: Directory }[]
  ): Promise<void> {
    await this.directories.batchUpdate(items);

    for (const { updated } of items) {
      this.emitUpdated(updated);
    }
  }

  async clearStore(): Promise<void> {
    this.directories.clearStore();
    this.emitStoreCleared();
  }
}
