import type { Song } from "@/models/Song";
import type { IMetadataStore } from "../metadata-utils";
import { TagLibMetadataWriter } from "../taglib-metadata-utils";
import type { DataChangedCallback } from "../store";

export class FileSystemMetadataStore implements IMetadataStore {
  private root: FileSystemDirectoryHandle | null = null;
  private fileHandles = new Map<string, FileSystemFileHandle>();
  private backingStore?: IMetadataStore;

  private songAddedListeners = new Set<DataChangedCallback<Song>>();
  private songUpdatedListeners = new Set<DataChangedCallback<Song>>();
  private songDeletedListeners = new Set<DataChangedCallback<Song>>();
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

    this.backingStore?.onAdded((song) => this.emitAdded(song));
    this.backingStore?.onUpdated((song) => this.emitUpdated(song));
    this.backingStore?.onDeleted((song) => this.emitDeleted(song));
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

  onAdded(cb: DataChangedCallback<Song>) {
    this.songAddedListeners.add(cb);
    return () => this.songAddedListeners.delete(cb);
  }

  onUpdated(cb: DataChangedCallback<Song>) {
    this.songUpdatedListeners.add(cb);
    return () => this.songUpdatedListeners.delete(cb);
  }

  onDeleted(cb: DataChangedCallback<Song>) {
    this.songDeletedListeners.add(cb);
    return () => this.songDeletedListeners.delete(cb);
  }

  onStoreCleared(cb: () => void): () => void {
    this.storeClearedListeners.add(cb);
    return () => this.storeClearedListeners.delete(cb);
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

  /**
   * Write the song to the file system only if it was loaded before
   * @param id The song id
   * @param song The song data
   * @returns The saved song
   */
  async save(id: string, song: Song): Promise<Song> {
    let existingFileHandle = this.getFileHandle(id);
    const existingSong = await this.backingStore?.get(id);

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
  async get(id: string): Promise<Song | null> {
    return (await this.backingStore?.get(id)) ?? null;
  }

  /**
   * Rather than read through every file in the directory, just return backing store's list
   * @param id The song's id
   * @returns A song list from the store
   */
  async getAll(): Promise<Song[]> {
    return (await this.backingStore?.getAll()) ?? [];
  }

  /**
   * Remove the file reference
   * @param id The file's id
   * @returns A promise
   */
  async delete(id: string): Promise<void> {
    const song = await this.backingStore?.get(id);
    if (!song) return;

    this.fileHandles.delete(id);
    await this.backingStore?.delete(id);
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
