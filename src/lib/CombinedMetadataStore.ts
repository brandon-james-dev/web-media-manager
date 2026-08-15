import type { Song } from "@/models/Song";
import { FileSystemMetadataStore } from "./file-utils";
import type { IMetadataStore } from "./metadata-utils";
import type { DexieMetadataStore } from "./dexie-utils";
import type { DataChangedCallback } from "./store";

/**
 * This store uses both the file system and Dexie. It resolves retrieval and delete to Dexie, but
 * saves to both the file system and Dexie.
 */
export class CombinedMetadataStore implements IMetadataStore {
  private fsStore: FileSystemMetadataStore;
  private dexieStore: DexieMetadataStore;

  private songAddedListeners = new Set<DataChangedCallback<Song>>();
  private songUpdatedListeners = new Set<DataChangedCallback<Song>>();
  private songDeletedListeners = new Set<DataChangedCallback<Song>>();
  private storeClearedListeners = new Set<() => void>();

  constructor(
    fsStore: FileSystemMetadataStore,
    dexieStore: DexieMetadataStore
  ) {
    this.fsStore = fsStore;
    this.dexieStore = dexieStore;

    this.dexieStore.onAdded((song) => this.emitAdded(song));
    this.dexieStore.onUpdated((song) => this.emitUpdated(song));
    this.dexieStore.onDeleted((song) => this.emitDeleted(song));
    this.dexieStore.onStoreCleared(() => this.emitStoreCleared());
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

  getFileSystem(): FileSystemMetadataStore {
    return this.fsStore;
  }

  getDexieStore(): DexieMetadataStore {
    return this.dexieStore;
  }

  setRootDirectory(rootDirectory: FileSystemDirectoryHandle) {
    this.fsStore.setRootDirectory(rootDirectory);
  }

  get(id: string): Promise<Song | null> {
    return this.dexieStore.get(id);
  }

  async save(id: string, updated: Song): Promise<Song> {
    await this.fsStore.save(id, updated);
    return await this.dexieStore.save(id, updated);
  }

  delete(id: string): Promise<void> {
    return this.dexieStore.delete(id);
  }

  getAll(): Promise<Song[]> {
    return this.dexieStore.getAll();
  }

  onAdded(cb: DataChangedCallback<Song>): () => void {
    return this.dexieStore.onAdded(cb);
  }

  onUpdated(cb: DataChangedCallback<Song>): () => void {
    return this.dexieStore.onUpdated(cb);
  }

  onDeleted(cb: DataChangedCallback<Song>): () => void {
    return this.dexieStore.onDeleted(cb);
  }

  onStoreCleared(cb: () => void): () => void {
    return this.dexieStore.onStoreCleared(cb);
  }

  clearStore(): Promise<void> {
    return this.dexieStore.clearStore();
  }
}
