import type { Song } from "@/models/Song";
import { FileSystemMetadataStore } from "./file-utils";
import type { IMetadataStore } from "./metadata-utils";
import type { SongCallback } from "./metadata-utils/IMetadataStore";
import type { DexieMetadataStore } from "./dexie-utils";
import { MemoryMetadataStore } from "./metadata-utils/MemoryMetadataStore";

export class CombinedMetadataStore implements IMetadataStore {
  private backend: FileSystemMetadataStore;

  constructor(
    fsStore: FileSystemMetadataStore,
    dexieStore?: DexieMetadataStore
  ) {
    this.backend = fsStore;

    if (dexieStore) {
      fsStore.setBackingStore(dexieStore);
    } else {
      fsStore.setBackingStore(new MemoryMetadataStore());
    }
  }

  getFileSystem(): FileSystemMetadataStore {
    return this.backend;
  }

  setRootDirectory(rootDirectory: FileSystemDirectoryHandle) {
    this.backend.setRootDirectory(rootDirectory);
  }

  setBackingStore(backingStore: IMetadataStore) {
    this.backend.setBackingStore(backingStore);
  }

  getSong(id: string): Promise<Song | null> {
    return this.backend.getSong(id);
  }

  saveSong(id: string, updated: Song): Promise<Song> {
    return this.backend.saveSong(id, updated);
  }

  deleteSong(id: string): Promise<void> {
    return this.backend.deleteSong(id);
  }

  getAllSongs(): Promise<Song[]> {
    return this.backend.getAllSongs();
  }

  onSongAdded(cb: SongCallback): () => void {
    return this.backend.onSongAdded(cb);
  }

  onSongUpdated(cb: SongCallback): () => void {
    return this.backend.onSongUpdated(cb);
  }

  onSongDeleted(cb: SongCallback): () => void {
    return this.backend.onSongDeleted(cb);
  }
}
