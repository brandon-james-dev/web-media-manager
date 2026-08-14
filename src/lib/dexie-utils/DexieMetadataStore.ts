import type { IPicture } from "./../metadata-utils/IPicture";
import type { Song } from "@/models/Song";
import { ArtworkType, type IMetadataStore } from "../metadata-utils";
import type { SongCallback } from "../metadata-utils/IMetadataStore";
import type { MetadataDb } from "./MetadataDb";
import type { SongArtwork } from "@/models/SongArtwork";

export class DexieMetadataStore implements IMetadataStore {
  private db: MetadataDb;

  private songAddedListeners = new Set<SongCallback>();
  private songUpdatedListeners = new Set<SongCallback>();
  private songDeletedListeners = new Set<SongCallback>();
  private storeClearedListeners = new Set<() => void>();

  constructor(db: MetadataDb) {
    this.db = db;
  }

  async clearStore(): Promise<void> {
    for (const table of this.db.tables) {
      await table.clear();
    }
    this.emitStoreCleared();
    await this.db.songs.clear();
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

  async getSong(id: string): Promise<Song | null> {
    const song = await this.db.songs.get(id);
    if (!song) return null;

    const artwork = await this.db.songArtwork
      .where("songId")
      .equals(id)
      .toArray();

    const pictures: IPicture[] = [];

    for (const item of artwork) {
      const picture = await this.artworkToPicture(item);
      pictures.push(picture);
    }

    song.pictures = pictures;

    return song;
  }

  async getAllSongs(): Promise<Song[]> {
    return await this.db.songs.toArray();
  }

  async saveSong(id: string, updated: Song): Promise<Song> {
    const existing = await this.db.songs.get(id);

    // Strip artwork fields before saving
    updated.coverFront = undefined;
    updated.coverBack = undefined;
    updated.pictures = undefined;

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

  private async artworkToPicture(art: SongArtwork): Promise<IPicture> {
    return {
      type: art.artworkType ?? ArtworkType.Other,
      mimeType: "image/jpeg",
      description: "",
      data: new Uint8Array(await art.full!.arrayBuffer()),
    };
  }
}
