import Dexie, { type Table } from "dexie";

import type { PersistedJob } from "@/core/jobs";
import type {
  MusicSource,
  Playlist,
  Song,
  SongArtwork,
  SyncDeviceRecord,
} from "@/models";

let db: WmmMusicDb | null = null;

/**
 * The app's on-device music database (Dexie): one table per repository.
 * The `sources` table holds music sources ("on device" today; subsonic /
 * server kinds are added as discriminated `kind` members later).
 *
 * Dev note: the app is unreleased, so the schema stays at version 1 and is
 * edited in place; delete the `wmmMusic` database to pick up a change. Start
 * adding versions and upgrades once the app ships.
 */
export class WmmMusicDb extends Dexie {
  sources!: Table<MusicSource, string>;
  songs!: Table<Song, string>;
  songArtwork!: Table<SongArtwork, number>;
  syncDevices!: Table<SyncDeviceRecord, string>;
  playlists!: Table<Playlist, string>;
  jobs!: Table<PersistedJob, string>;

  constructor() {
    super("wmmMusic");

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

      playlists: `
        id,
        name,
        createdAt,
        updatedAt
      `,

      jobs: `
        id,
        type,
        ownerId,
        updatedAt
      `,
    });
  }
}

export function getWmmMusicDb(): WmmMusicDb {
  if (db) {
    return db;
  }

  db = new WmmMusicDb();

  return db;
}
