import { uuidv7 } from "uuidv7";
import type { Song, Directory } from "@/models";
import type { IMetadataStore } from "../metadata-utils";
import { TagLibMetadataWriter } from "../taglib-metadata-utils";
import type { DataChangedCallback, IRepository } from "../store";

export class FileSystemMetadataStore implements IMetadataStore {
  private backingStore?: IMetadataStore;
  private directories: IRepository<Directory>;
  private fileHandles = new Map<string, FileSystemFileHandle>();

  private songAddedListeners = new Set<DataChangedCallback<Song>>();
  private songUpdatedListeners = new Set<DataChangedCallback<Song>>();
  private songDeletedListeners = new Set<DataChangedCallback<Song>>();
  private storeClearedListeners = new Set<() => void>();

  private directoryAddedListeners = new Set<DataChangedCallback<Directory>>();
  private directoryDeletedListeners = new Set<DataChangedCallback<Directory>>();

  constructor(directories: IRepository<Directory>) {
    this.directories = directories;
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

    this.directories.onAdded((dir) => this.emitDirectoryAdded(dir));
    this.directories.onDeleted((dir) => this.emitDirectoryDeleted(dir));
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

  onDirectoryAdded(cb: DataChangedCallback<Directory>) {
    this.directoryAddedListeners.add(cb);
    return () => this.directoryAddedListeners.delete(cb);
  }

  onDirectoryDeleted(cb: DataChangedCallback<Directory>) {
    this.directoryDeletedListeners.add(cb);
    return () => this.directoryDeletedListeners.delete(cb);
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

  private emitDirectoryAdded(directory: Directory) {
    for (const cb of this.directoryAddedListeners) cb(directory);
  }

  private emitDirectoryDeleted(directory: Directory) {
    for (const cb of this.directoryDeletedListeners) cb(directory);
  }

  async addDirectory(directory: Directory) {
    await this.directories.save(uuidv7(), directory);
  }

  async deleteDirectory(id: string): Promise<void> {
    const songsInDirectory =
      (await this.backingStore?.filter((s) => s.directoryId == id)) ?? [];
    await this.backingStore?.batchDelete(songsInDirectory.map((s) => s.id));
    await this.directories.delete(id);
  }

  async getDirectories(): Promise<Directory[]> {
    const directories = await this.directories.getAll();

    return directories;
  }

  setFileHandle(id: string, handle: FileSystemFileHandle): void {
    this.fileHandles.set(id, handle);
  }

  getFileHandle(id: string): FileSystemFileHandle | undefined {
    return this.fileHandles.get(id);
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

    if (!existingFileHandle && existingSong) {
      try {
        const parts = existingSong.relativePath.split("/").filter(Boolean);
        const dir = await this.directories?.get(
          existingSong.directoryId.toString()
        );
        let directoryHandle = dir?.directoryHandle;

        if (!directoryHandle) {
          throw new Error("The directory the song is from was not found");
        }

        for (let i = 0; i < parts.length - 1; i++) {
          directoryHandle = await directoryHandle?.getDirectoryHandle(parts[i]);
        }

        const fileHandle = await directoryHandle?.getFileHandle(parts.at(-1)!);

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

  async batchUpdate(items: { id: string; updated: Song }[]): Promise<void> {
    if (!this.backingStore) return;

    await this.backingStore.batchUpdate(items);

    for (const { updated } of items) {
      this.emitUpdated(updated);
    }
  }

  /**
   * Rather than read through every file in the directory, just return backing store's entry
   * @param id The song's id
   * @returns A song from the store
   */
  async get(id: string): Promise<Song | null> {
    return (await this.backingStore?.get(id)) ?? null;
  }

  filter(predicate: (item: Song) => boolean): Promise<Song[]> {
    if (!this.backingStore) return Promise.resolve([]);
    return this.backingStore.filter(predicate);
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

  async batchDelete(ids: string[]): Promise<void> {
    if (!this.backingStore) return;

    const existing = await this.backingStore.filter((s) => ids.includes(s.id));

    await this.backingStore.batchDelete(ids);

    for (const id of ids) {
      this.fileHandles.delete(id);
    }

    // Emit events
    for (const song of existing) {
      this.emitDeleted(song);
    }
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
