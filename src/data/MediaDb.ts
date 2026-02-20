import type { Song } from "@/models/Song";
import Dexie from "dexie";

class MediaDB extends Dexie {
  songs!: Dexie.Table<Song, string>;

  constructor() {
    super("media-db");
    this.version(1).stores({
      songs: "id, title, artist, album, duration, bitrate, albumart"
    });
  }
}

export const db = new MediaDB();
