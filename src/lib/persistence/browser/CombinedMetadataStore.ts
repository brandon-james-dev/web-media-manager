import type { Song } from "@/models/Song";
import type { IMetadataStore } from "../../contracts";
import type { DexieMetadataStore } from "../dexie";
import type { FileSystemMetadataStore } from "../file";
import type { DataChangedCallback } from "..";
import type { MusicSource } from "@/models";
import type { QueryOptions } from "../QueryOptions";
import type { DataSourceResult } from "../DataSourceResult";

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

  private sourceAddedListeners = new Set<DataChangedCallback<MusicSource>>();
  private sourceDeletedListeners = new Set<DataChangedCallback<MusicSource>>();
  private sourceClearedListeners = new Set<() => void>();

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

    this.fsStore.onSourceAdded((dir) => this.emitSourceAdded(dir));
    this.fsStore.onSourceDeleted((dir) => this.emitSourceDeleted(dir));
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

  onSourceAdded(cb: DataChangedCallback<MusicSource>) {
    this.sourceAddedListeners.add(cb);
    return () => this.sourceAddedListeners.delete(cb);
  }

  onSourceDeleted(cb: DataChangedCallback<MusicSource>) {
    this.sourceDeletedListeners.add(cb);
    return () => this.sourceDeletedListeners.delete(cb);
  }

  onSourcesCleared(cb: () => void) {
    this.sourceClearedListeners.add(cb);
    return () => this.sourceClearedListeners.delete(cb);
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

  private emitSourceAdded(dir: MusicSource) {
    for (const cb of this.sourceAddedListeners) cb(dir);
  }

  private emitSourceDeleted(dir: MusicSource) {
    for (const cb of this.sourceDeletedListeners) cb(dir);
  }

  getFileSystem(): FileSystemMetadataStore {
    return this.fsStore;
  }

  getDexieStore(): DexieMetadataStore {
    return this.dexieStore;
  }

  addSource(directory: MusicSource): Promise<MusicSource> {
    return this.fsStore.addSource(directory);
  }

  async deleteSource(id: string): Promise<void> {
    await this.fsStore.deleteSource(id);
  }

  getSources(): Promise<MusicSource[]> {
    return this.fsStore.getSources();
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
