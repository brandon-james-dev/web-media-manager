import type { DataChangedCallback, IRepository } from ".";
import type { DataSourceResult } from "./DataSourceResult";
import type { QueryOptions } from "./QueryOptions";

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

  async filter(options: QueryOptions<T>): Promise<DataSourceResult<T>> {
    const { filter, sort, skip, take } = options;

    let items = [...this.store.values()];
    const total = items.length;

    if (sort) {
      const { selector, desc } = sort;

      items.sort((a, b) => {
        const av =
          typeof selector === "string" ? (a as any)[selector] : selector(a);
        const bv =
          typeof selector === "string" ? (b as any)[selector] : selector(b);

        if (av < bv) return desc ? 1 : -1;
        if (av > bv) return desc ? -1 : 1;
        return 0;
      });
    }

    if (filter) {
      items = items.filter(filter);
    }

    const filteredCount = items.length;

    const start = skip ?? 0;
    const end = take ? start + take : undefined;

    const data = items.slice(start, end);

    const page = take ? Math.floor(start / take) : undefined;

    return {
      data,
      total,
      filteredCount,
      page,
      skip,
    };
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

  batchUpdate(items: { id: string; updated: T }[]): Promise<void> {
    for (const { id, updated } of items) {
      this.store.set(id, updated);
    }
    return Promise.resolve();
  }

  async delete(id: string): Promise<void> {
    const existing = this.store.get(id);
    if (!existing) return;

    this.store.delete(id);
    this.emitDeleted(existing);
  }

  batchDelete(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.store.delete(id);
    }
    return Promise.resolve();
  }

  clearStore(): Promise<void> {
    this.store.clear();
    return Promise.resolve();
  }
}
