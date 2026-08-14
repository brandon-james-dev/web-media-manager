import Dexie, { type Table } from "dexie";
import type { Directory, Song, SongArtwork } from "@/models/";

let db: MetadataDb | null = null;

export class MetadataDb extends Dexie {
  directories!: Table<Directory, number>;
  songs!: Table<Song, string>;
  songArtwork!: Table<SongArtwork, string>;

  constructor() {
    super("metadata");

    this.version(1).stores({
      directories: `
        ++id,
        directoryName,
        createdAt
      `,
      songs: `
        id,
        title,
        album,
        artist,
        genre,
        year
      `,
      songArtwork: `
        ++id,
        songId,
        artworkType
      `,
    });
  }
}

export function getMetadataDb(): MetadataDb {
  if (db) return db;

  db = new MetadataDb();
  return db;
}
