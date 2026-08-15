export type DataChangedCallback<T> = (data: T) => void;

export interface IRepository<T> {
  get(id: string): Promise<T | null>;
  save(id: string, updated: T): Promise<T>;
  delete(id: string): Promise<void>;
  getAll(): Promise<T[]>;
  filter(predicate: (item: T) => boolean): Promise<T[]>;
  batchDelete(ids: string[]): Promise<void>;
  batchUpdate(items: { id: string; updated: T }[]): Promise<void>;
  clearStore(): Promise<void>;
  onAdded(cb: DataChangedCallback<T>): () => void;
  onUpdated(cb: DataChangedCallback<T>): () => void;
  onDeleted(cb: DataChangedCallback<T>): () => void;
  onStoreCleared(cb: () => void): () => void;
}
