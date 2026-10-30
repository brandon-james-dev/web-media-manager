import Dexie, { type Table } from "dexie";

import type { MusicSource, Song, SongArtwork, SyncDeviceRecord } from "@/models";

let db: MetadataDb | null = null;

/**
 * The app's on-device metadata store (Dexie): one table per repository.
 * The `sources` table holds music sources ("on device" today; subsonic /
 * server kinds are added as discriminated `kind` members later).
 *
 * Dev note: this app has no persisted data to preserve in dev, so a schema
 * change simply drops and rebuilds the store rather than adding migration
 * hot-fills.
 */
export class MetadataDb extends Dexie {
  sources!: Table<MusicSource, string>;
  songs!: Table<Song, string>;
  songArtwork!: Table<SongArtwork, number>;
  syncDevices!: Table<SyncDeviceRecord, string>;

  constructor() {
    super("metadata");

    this.version(1).stores({
      sources: `
        id,
        kind,
        name,
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
