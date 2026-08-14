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

  constructor(
    fsStore: FileSystemMetadataStore,
    dexieStore: DexieMetadataStore
  ) {
    this.fsStore = fsStore;
    this.dexieStore = dexieStore;
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
}
