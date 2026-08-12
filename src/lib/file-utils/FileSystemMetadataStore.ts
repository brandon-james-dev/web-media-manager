import type { Song } from "@/models/Song";
import type { IMetadataStore } from "../metadata-utils";
import { TagLibMetadataWriter } from "../taglib-metadata-utils";
import type { SongCallback } from "../metadata-utils/IMetadataStore";

export class FileSystemMetadataStore implements IMetadataStore {
  root: FileSystemDirectoryHandle | null = null;
  private fileHandles = new Map<string, FileSystemFileHandle>();
  private songs = new Map<string, Song>();

  private songAddedListeners = new Set<SongCallback>();
  private songUpdatedListeners = new Set<SongCallback>();

  constructor(root?: FileSystemDirectoryHandle) {
    if (root) this.root = root;
  }

  setFileHandle(id: string, handle: FileSystemFileHandle): void {
    this.fileHandles.set(id, handle);
  }

  getFileHandle(id: string): FileSystemFileHandle | undefined {
    return this.fileHandles.get(id);
  }

  // --- Event subscription API ---
  onSongAdded(cb: SongCallback) {
    this.songAddedListeners.add(cb);
    return () => this.songAddedListeners.delete(cb);
  }

  onSongUpdated(cb: SongCallback) {
    this.songUpdatedListeners.add(cb);
    return () => this.songUpdatedListeners.delete(cb);
  }

  private emitSongAdded(song: Song) {
    for (const cb of this.songAddedListeners) cb(song);
  }

  private emitSongUpdated(song: Song) {
    for (const cb of this.songUpdatedListeners) cb(song);
  }

  async saveSong(id: string, song: Song): Promise<Song> {
    const existingFileHandle = this.fileHandles.get(id);
    const existingSong = this.songs.get(id);

    const isNew = !existingSong?.filesize;

    if (!isNew && existingFileHandle) {
      const file = await existingFileHandle.getFile();

      const writer = new TagLibMetadataWriter();
      const updatedBytes = await writer.writeTags(file, song);

      const writable = await existingFileHandle.createWritable();
      await writable.write(updatedBytes.slice().buffer);
      await writable.close();
    }

    this.songs.set(id, song);

    if (isNew) {
      this.emitSongAdded(song);
    } else {
      this.emitSongUpdated(song);
    }

    return song;
  }

  async getSong(id: string): Promise<Song> {
    return this.songs.get(id)!;
  }

  async getAllSongs(): Promise<Song[]> {
    return [...this.songs.values()];
  }

  async deleteSong(id: string): Promise<void> {
    this.fileHandles.delete(id);
    this.songs.delete(id);
  }
}
