import type { Song } from "@/models/Song";
import type { IMetadataStore, SongCallback } from "./IMetadataStore";

export class MemoryMetadataStore implements IMetadataStore {
  private songs = new Map<string, Song>();

  private songAddedListeners = new Set<SongCallback>();
  private songUpdatedListeners = new Set<SongCallback>();
  private songDeletedListeners = new Set<SongCallback>();

  onSongAdded(cb: SongCallback): () => void {
    this.songAddedListeners.add(cb);
    return () => this.songAddedListeners.delete(cb);
  }

  onSongUpdated(cb: SongCallback): () => void {
    this.songUpdatedListeners.add(cb);
    return () => this.songUpdatedListeners.delete(cb);
  }

  onSongDeleted(cb: SongCallback): () => void {
    this.songDeletedListeners.add(cb);
    return () => this.songDeletedListeners.delete(cb);
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

  async getSong(id: string): Promise<Song | null> {
    return this.songs.get(id) ?? null;
  }

  async getAllSongs(): Promise<Song[]> {
    return [...this.songs.values()];
  }

  async saveSong(id: string, updated: Song): Promise<Song> {
    const exists = this.songs.has(id);

    this.songs.set(id, updated);

    if (exists) {
      this.emitSongUpdated(updated);
    } else {
      this.emitSongAdded(updated);
    }

    return updated;
  }

  async deleteSong(id: string): Promise<void> {
    const existing = this.songs.get(id);
    if (!existing) return;

    this.songs.delete(id);
    this.emitSongDeleted(existing);
  }
}
