import type { DataChangedCallback, IRepository } from ".";

export class MemoryStore<T> implements IRepository<T> {
  private store = new Map<string, T>();

  private songAddedListeners = new Set<DataChangedCallback<T>>();
  private songUpdatedListeners = new Set<DataChangedCallback<T>>();
  private songDeletedListeners = new Set<DataChangedCallback<T>>();
  private storeClearedisteners = new Set<() => void>();

  onAdded(cb: DataChangedCallback<T>): () => void {
    this.songAddedListeners.add(cb);
    return () => this.songAddedListeners.delete(cb);
  }

  onUpdated(cb: DataChangedCallback<T>): () => void {
    this.songUpdatedListeners.add(cb);
    return () => this.songUpdatedListeners.delete(cb);
  }

  onDeleted(cb: DataChangedCallback<T>): () => void {
    this.songDeletedListeners.add(cb);
    return () => this.songDeletedListeners.delete(cb);
  }

  onStoreCleared(cb: () => void): () => void {
    this.storeClearedisteners.add(cb);
    return () => this.storeClearedisteners.delete(cb);
  }

  private emitAdded(data: T) {
    for (const cb of this.songAddedListeners) cb(data);
  }

  private emitUpdated(data: T) {
    for (const cb of this.songUpdatedListeners) cb(data);
  }

  private emitDeleted(data: T) {
    for (const cb of this.songDeletedListeners) cb(data);
  }

  async get(id: string): Promise<T | null> {
    return this.store.get(id) ?? null;
  }

  async getAll(): Promise<T[]> {
    return [...this.store.values()];
  }

  async save(id: string, updated: T): Promise<T> {
    const exists = this.store.has(id);

    this.store.set(id, updated);

    if (exists) {
      this.emitUpdated(updated);
    } else {
      this.emitAdded(updated);
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = this.store.get(id);
    if (!existing) return;

    this.store.delete(id);
    this.emitDeleted(existing);
  }

  clearStore(): Promise<void> {
    this.store.clear();
    return Promise.resolve();
  }
}
