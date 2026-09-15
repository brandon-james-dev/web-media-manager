import type { Song } from "@/models/Song";
import type { IMetadataStore } from "./metadata-utils";
import type { DexieMetadataStore } from "./dexie-utils";
import type { FileSystemMetadataStore } from "./file-utils";
import type { DataChangedCallback } from "./store";
import type { Directory } from "@/models";
import type { QueryOptions } from "./store/QueryOptions";
import type { DataSourceResult } from "./store/DataSourceResult";

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

  private dirAddedListeners = new Set<DataChangedCallback<Directory>>();
  private dirDeletedListeners = new Set<DataChangedCallback<Directory>>();
  private dirClearedListeners = new Set<() => void>();

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

    this.fsStore.onDirectoryAdded((dir) => this.emitDirectoryAdded(dir));
    this.fsStore.onDirectoryDeleted((dir) => this.emitDirectoryDeleted(dir));
  }

  onAdded(cb: DataChangedCallback<Song>) {
    this.songAddedListeners.add(cb);
    return () => this.songAddedListeners.delete(cb);
  }

  onUpdated(cb: DataChangedCallback<Song>): () => void {
    this.songUpdatedListeners.add(cb);
    return this.dexieStore.onUpdated(cb);
  }

  onDeleted(cb: DataChangedCallback<Song>): () => void {
    this.songDeletedListeners.add(cb);
    return this.dexieStore.onDeleted(cb);
  }

  onStoreCleared(cb: () => void): () => void {
    this.storeClearedListeners.add(cb);
    return this.dexieStore.onStoreCleared(cb);
  }

  onDirectoryAdded(cb: DataChangedCallback<Directory>) {
    this.dirAddedListeners.add(cb);
    return () => this.dirAddedListeners.delete(cb);
  }

  onDirectoryDeleted(cb: DataChangedCallback<Directory>) {
    this.dirDeletedListeners.add(cb);
    return () => this.dirDeletedListeners.delete(cb);
  }

  onDirectoriesCleared(cb: () => void) {
    this.dirClearedListeners.add(cb);
    return () => this.dirClearedListeners.delete(cb);
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

  private emitDirectoryAdded(dir: Directory) {
    for (const cb of this.dirAddedListeners) cb(dir);
  }

  private emitDirectoryDeleted(dir: Directory) {
    for (const cb of this.dirDeletedListeners) cb(dir);
  }

  getFileSystem(): FileSystemMetadataStore {
    return this.fsStore;
  }

  getDexieStore(): DexieMetadataStore {
    return this.dexieStore;
  }

  async addDirectory(directory: Directory) {
    await this.fsStore.addDirectory(directory);
  }

  async deleteDirectory(id: string) {
    await this.fsStore.deleteDirectory(id);
  }

  getDirectories(): Promise<Directory[]> {
    return this.fsStore.getDirectories();
  }

  get(id: string): Promise<Song | null> {
    return this.dexieStore.get(id);
  }

  filter(options: QueryOptions<Song>): Promise<DataSourceResult<Song>> {
    return this.dexieStore.filter(options);
  }

  getAll(): Promise<Song[]> {
    return this.dexieStore.getAll();
  }

  async save(id: string, updated: Song): Promise<Song> {
    await this.fsStore.save(id, updated);
    const updatedSong = await this.dexieStore.save(id, updated);
    this.emitUpdated(updated);
    return updatedSong;
  }

  async batchUpdate(items: { id: string; updated: Song }[]): Promise<void> {
    await this.fsStore.batchUpdate(items);
    await this.dexieStore.batchUpdate(items);

    for (const { updated } of items) {
      this.emitUpdated(updated);
    }
  }

  async delete(id: string): Promise<void> {
    const songToDelete = await this.dexieStore.get(id);
    if (!songToDelete) return;
    await this.fsStore.delete(id);
    await this.dexieStore.delete(id);
    this.emitDeleted(songToDelete);
  }

  async batchDelete(ids: string[]): Promise<void> {
    for (const id of ids) {
      const songToDelete = await this.dexieStore.get(id);
      if (!songToDelete) continue;
      this.emitDeleted(songToDelete);
    }
    await this.fsStore.batchDelete(ids);
    await this.dexieStore.batchDelete(ids);
  }

  async clearStore(): Promise<void> {
    await this.fsStore.clearStore();
    return await this.dexieStore.clearStore();
  }
}
