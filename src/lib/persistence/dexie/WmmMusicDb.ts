import Dexie, { type Table } from "dexie";

import type { PersistedJob } from "@/core/jobs";
import type {
  InstalledVisualizerPlugin,
  PluginFileRecord,
  PluginSettingsRecord,
} from "@/core/visualizers/contracts";
import type {
  MusicSource,
  PlayHistoryEntry,
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
  playlists!: Table<Playlist, string>;
  jobs!: Table<PersistedJob, string>;
  playHistory!: Table<PlayHistoryEntry, string>;
  plugins!: Table<InstalledVisualizerPlugin, string>;
  pluginFiles!: Table<PluginFileRecord, number>;
  pluginSettings!: Table<PluginSettingsRecord, string>;

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

      playHistory: `
        id,
        songId,
        playedAt
      `,
    });

    // Version 2 adds the visualizer plugin tables. Version 1 is left untouched
    // so existing databases upgrade in place instead of being recreated; only
    // the new tables are declared here, the rest are inherited.
    this.version(2).stores({
      plugins: `
        id,
        name,
        runtime,
        kind,
        installedAt
      `,

      pluginFiles: `
        ++id,
        pluginId,
        [pluginId+path],
        path
      `,

      pluginSettings: `
        pluginId,
        updatedAt
      `,
    });

    // Version 3 folds sync devices into the sources table: a device is a
    // source with kind "sync" (capabilities.syncWrite), so the Sync page can
    // list it beside every other writable source. The old table is dropped
    // after its rows are migrated, so there is one record per device.
    this.version(3)
      .stores({ syncDevices: null })
      .upgrade(async (tx) => {
        const records = await tx.table("syncDevices").toArray();

        await tx.table("sources").bulkPut(
          records.map((record: SyncDeviceRecord) => ({
            id: record.id,
            kind: "sync" as const,
            uriDomain: "sync",
            name: record.name,
            enabled: true,
            createdAt: new Date(record.createdAt),
            priority: 50,
            capabilities: {
              streaming: false,
              browsing: false,
              searching: false,
              metadataWrite: false,
              libraryScanning: false,
              playlistWrite: false,
              syncWrite: true,
            },
            type: record.type,
            productId: record.productId,
            serialNumber: record.serialNumber,
            firewireGuid: record.firewireGuid,
            usb: record.usb,
            rootHandle: record.rootHandle,
          }))
        );
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
