import type { MusicSource } from "@/models";
import type { DataChangedCallback, IRepository } from "..";
import type { QueryOptions } from "../QueryOptions";
import type { DataSourceResult } from "../DataSourceResult";

export class FileSystemSourceStore implements IRepository<MusicSource> {
  private sources: IRepository<MusicSource>;

  private addedListeners = new Set<DataChangedCallback<MusicSource>>();
  private updatedListeners = new Set<DataChangedCallback<MusicSource>>();
  private deletedListeners = new Set<DataChangedCallback<MusicSource>>();
  private clearedListeners = new Set<() => void>();

  constructor(backingStore: IRepository<MusicSource>) {
    this.sources = backingStore;
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

  private emitAdded(dir: MusicSource) {
    for (const cb of this.addedListeners) cb(dir);
  }

  private emitUpdated(dir: MusicSource) {
    for (const cb of this.updatedListeners) cb(dir);
  }

  private emitDeleted(dir: MusicSource) {
    for (const cb of this.deletedListeners) cb(dir);
  }

  private emitStoreCleared() {
    for (const cb of this.clearedListeners) cb();
  }

  async get(id: string): Promise<MusicSource | null> {
    return this.sources.get(id) ?? null;
  }

  filter(
    options: QueryOptions<MusicSource>
  ): Promise<DataSourceResult<MusicSource>> {
    return this.sources.filter(options);
  }

  async getAll(): Promise<MusicSource[]> {
    return this.sources.getAll();
  }

  async save(id: string, updated: MusicSource): Promise<MusicSource> {
    const exists = await this.sources.get(id);

    this.sources.save(id, updated);

    if (exists) {
      this.emitUpdated(updated);
    } else {
      this.emitAdded(updated);
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.sources.get(id);
    if (!existing) return;

    this.sources.delete(id);
    this.emitDeleted(existing);
  }

  async batchDelete(ids: string[]): Promise<void> {
    const existing = await this.sources.filter({
      filter: (d) => ids.includes(d.id),
    });

    await this.sources.batchDelete(ids);

    for (const dir of existing.data) {
      this.emitDeleted(dir);
    }
  }

  async batchUpdate(
    items: { id: string; updated: MusicSource }[]
  ): Promise<void> {
    await this.sources.batchUpdate(items);

    for (const { updated } of items) {
      this.emitUpdated(updated);
    }
  }

  async clearStore(): Promise<void> {
    this.sources.clearStore();
    this.emitStoreCleared();
  }
}
