import type { Song, PendingWrite } from "@/models";
import Dexie, { type Table } from "dexie";

class MediaDB extends Dexie {
  songs!: Dexie.Table<Song, string>;
  pendingWrites!: Table<PendingWrite, number>;

  constructor() {
    super("media-db");
    this.version(1).stores({
      songs: "id, tags.title, tags.artist, tags.album, tags.genre, duration, bitrate, albumart",
      pendingWrites: "++id, songId, createdAt"
    });
  }
}

export const db = new MediaDB();
