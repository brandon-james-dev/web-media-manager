import type { Song } from "@/models/Song";
import type { IMetadataStore } from "../metadata-utils";
import { TagLibMetadataWriter } from "../taglib-metadata-utils";
import type { SongCallback } from "../metadata-utils/IMetadataStore";

export class FileSystemMetadataStore implements IMetadataStore {
  private root: FileSystemDirectoryHandle | null = null;
  private fileHandles = new Map<string, FileSystemFileHandle>();
  private backingStore?: IMetadataStore;

  private songAddedListeners = new Set<SongCallback>();
  private songUpdatedListeners = new Set<SongCallback>();
  private songDeletedListeners = new Set<SongCallback>();
  private storeClearedListeners = new Set<() => void>();

  constructor(root?: FileSystemDirectoryHandle) {
    if (root) this.setRootDirectory(root);
  }

  /**
   * Sets a store that is used so that every file action is accompanied with an reference.
   * @param backingStore Optional backing store to use when not using persistence
   */
  setBackingStore(backingStore: IMetadataStore | undefined) {
    this.backingStore = backingStore;

    this.backingStore?.onSongAdded((song) => this.emitSongAdded(song));
    this.backingStore?.onSongUpdated((song) => this.emitSongUpdated(song));
    this.backingStore?.onSongDeleted((song) => this.emitSongDeleted(song));
    this.backingStore?.onStoreCleared(() => this.emitStoreCleared());
  }

  setRootDirectory(rootDirectory: FileSystemDirectoryHandle) {
    this.root = rootDirectory;
  }

  setFileHandle(id: string, handle: FileSystemFileHandle): void {
    this.fileHandles.set(id, handle);
  }

  getFileHandle(id: string): FileSystemFileHandle | undefined {
    return this.fileHandles.get(id);
  }

  onSongAdded(cb: SongCallback) {
    this.songAddedListeners.add(cb);
    return () => this.songAddedListeners.delete(cb);
  }

  onSongUpdated(cb: SongCallback) {
    this.songUpdatedListeners.add(cb);
    return () => this.songUpdatedListeners.delete(cb);
  }

  onSongDeleted(cb: SongCallback) {
    this.songDeletedListeners.add(cb);
    return () => this.songDeletedListeners.delete(cb);
  }

  onStoreCleared(cb: () => void): () => void {
    this.storeClearedListeners.add(cb);
    return () => this.storeClearedListeners.delete(cb);
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

  /**
   * Write the song to the file system only if it was loaded before
   * @param id The song id
   * @param song The song data
   * @returns The saved song
   */
  async saveSong(id: string, song: Song): Promise<Song> {
    let existingFileHandle = this.getFileHandle(id);
    const existingSong = await this.backingStore?.getSong(id);

    if (!existingFileHandle && existingSong && this.root) {
      try {
        const parts = existingSong.relativePath.split("/").filter(Boolean);
        let dir = this.root;

        for (let i = 0; i < parts.length - 1; i++) {
          dir = await dir.getDirectoryHandle(parts[i]);
        }

        const fileHandle = await dir.getFileHandle(parts.at(-1)!);

        this.setFileHandle(id, fileHandle);
        existingFileHandle = fileHandle;
      } catch (err) {
        console.error("Failed to reconstruct file handle:", err);
      }
    }

    const isNew = existingSong == undefined;

    if (!isNew && existingFileHandle) {
      const file = await existingFileHandle.getFile();

      const writer = new TagLibMetadataWriter();
      const updatedBytes = await writer.writeTags(file, song);

      const writable = await existingFileHandle.createWritable();
      await writable.write(updatedBytes.slice().buffer);
      await writable.close();
    }

    return song;
  }

  /**
   * Rather than read through every file in the directory, just return backing store's entry
   * @param id The song's id
   * @returns A song from the store
   */
  async getSong(id: string): Promise<Song | null> {
    return (await this.backingStore?.getSong(id)) ?? null;
  }

  /**
   * Rather than read through every file in the directory, just return backing store's list
   * @param id The song's id
   * @returns A song list from the store
   */
  async getAllSongs(): Promise<Song[]> {
    return (await this.backingStore?.getAllSongs()) ?? [];
  }

  /**
   * Remove the file reference
   * @param id The file's id
   * @returns A promise
   */
  async deleteSong(id: string): Promise<void> {
    const song = await this.backingStore?.getSong(id);
    if (!song) return;

    this.fileHandles.delete(id);
    await this.backingStore?.deleteSong(id);
  }

  /**
   * Delete all references
   * @returns A promise
   */
  clearStore(): Promise<void> {
    this.fileHandles.clear();
    return Promise.resolve();
  }
}
