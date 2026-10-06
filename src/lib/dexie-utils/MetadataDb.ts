import Dexie, { type Table } from "dexie";

import type { Directory, Song, SongArtwork, SyncDeviceRecord } from "@/models";

let db: MetadataDb | null = null;

export class MetadataDb extends Dexie {
  directories!: Table<Directory, string>;
  songs!: Table<Song, string>;
  songArtwork!: Table<SongArtwork, number>;
  syncDevices!: Table<SyncDeviceRecord, string>;

  constructor() {
    super("metadata");

    this.version(1).stores({
      directories: `
        id,
        directoryName,
        createdAt
      `,

      songs: `
        id,
        title,
        album,
        artist,
        genre,
        year,
        track
      `,

      songArtwork: `
        ++id,
        songId,
        artworkType
      `,

      syncDevices: `
        id,
        name,
        usb.manufacturerName,
        usb.productName,
        createdAt
      `,
    });
  }
}

export function getMetadataDb(): MetadataDb {
  if (db) {
    return db;
  }

  db = new MetadataDb();

  return db;
}
