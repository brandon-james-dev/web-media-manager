import type { Song } from "@/models/Song";
import { FileSystemMetadataStore } from "./file-utils";
import type { IMetadataStore } from "./metadata-utils";
import type { SongCallback } from "./metadata-utils/IMetadataStore";
import type { DexieMetadataStore } from "./dexie-utils";

/**
 * This store uses both the file system and Dexie. It resolves retrieval and delete to Dexie, but
 * saves to both the file system and Dexie.
 */
export class CombinedMetadataStore implements IMetadataStore {
  private fsStore: FileSystemMetadataStore;
  private dexieStore: DexieMetadataStore;

  private songAddedListeners = new Set<SongCallback>();
  private songUpdatedListeners = new Set<SongCallback>();
  private songDeletedListeners = new Set<SongCallback>();
  private storeClearedListeners = new Set<() => void>();

  constructor(
    fsStore: FileSystemMetadataStore,
    dexieStore: DexieMetadataStore
  ) {
    this.fsStore = fsStore;
    this.dexieStore = dexieStore;

    this.dexieStore.onSongAdded((song) => this.emitSongAdded(song));
    this.dexieStore.onSongUpdated((song) => this.emitSongUpdated(song));
    this.dexieStore.onSongDeleted((song) => this.emitSongDeleted(song));
    this.dexieStore.onStoreCleared(() => this.emitStoreCleared());
  }

  private emitSongAdded(song: Song) {
    for (const cb of this.songAddedListeners) cb(song);
  }

  private emitSongUpdated(song: Song) {
    for (const cb of this.songUpdatedListeners) cb(song);
  }

  private emitSongDeleted(song: Song) {
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

  getSong(id: string): Promise<Song | null> {
    return this.dexieStore.getSong(id);
  }

  async saveSong(id: string, updated: Song): Promise<Song> {
    await this.fsStore.saveSong(id, updated);
    return await this.dexieStore.saveSong(id, updated);
  }

  deleteSong(id: string): Promise<void> {
    return this.dexieStore.deleteSong(id);
  }

  getAllSongs(): Promise<Song[]> {
    return this.dexieStore.getAllSongs();
  }

  onSongAdded(cb: SongCallback): () => void {
    return this.dexieStore.onSongAdded(cb);
  }

  onSongUpdated(cb: SongCallback): () => void {
    return this.dexieStore.onSongUpdated(cb);
  }

  onSongDeleted(cb: SongCallback): () => void {
    return this.dexieStore.onSongDeleted(cb);
  }

  onStoreCleared(cb: () => void): () => void {
    return this.dexieStore.onStoreCleared(cb);
  }

  clearStore(): Promise<void> {
    return this.dexieStore.clearStore();
  }
}
