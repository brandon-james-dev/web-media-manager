import type { Song } from "@/models/Song";
import type { IMetadataStore } from "../metadata-utils";
import type { SongCallback } from "../metadata-utils/IMetadataStore";
import type { MetadataDb } from "./MetadataDb";

export class DexieMetadataStore implements IMetadataStore {
  private db: MetadataDb;

  private songAddedListeners = new Set<SongCallback>();
  private songUpdatedListeners = new Set<SongCallback>();
  private songDeletedListeners = new Set<SongCallback>();

  constructor(db: MetadataDb) {
    this.db = db;
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
    return (await this.db.songs.get(id)) ?? null;
  }

  async getAllSongs(): Promise<Song[]> {
    return await this.db.songs.toArray();
  }

  async saveSong(id: string, updated: Song): Promise<Song> {
    const existing = await this.db.songs.get(id);

    await this.db.songs.put(updated, id);

    if (existing) {
      this.emitSongUpdated(updated);
    } else {
      this.emitSongAdded(updated);
    }

    return updated;
  }

  async deleteSong(id: string): Promise<void> {
    const existing = await this.db.songs.get(id);
    if (!existing) return;

    await this.db.songs.delete(id);
    this.emitSongDeleted(existing);
  }

  async clearDb() {
    await this.db.songs.clear();
  }
}
