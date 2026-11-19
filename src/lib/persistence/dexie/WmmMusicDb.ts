import Dexie, { type Table } from "dexie";

import type { PersistedJob } from "@/core/jobs";
import type { PackageFileRecord } from "@/core/ports/packageFiles";
import type { InstalledTheme } from "@/core/ports/themes";
import type {
  InstalledVisualizerPlugin,
  PluginSettingsRecord,
} from "@/core/visualizers/contracts";
import type { OfflineAudioRecord } from "@/lib/offline/offlineAudioStore";
import type {
  MusicSource,
  PlayHistoryEntry,
  Playlist,
  Song,
  SongArtwork,
} from "@/models";

let db: WmmMusicDb | null = null;

/**
 * The app's on-device music database (Dexie): one table per repository.
 * The `sources` table holds music sources ("on device" today; subsonic /
 * server kinds are added as discriminated `kind` members later).
 *
 * Dev note: the app is unreleased, so the schema stays at version 1 and is
 * edited in place; delete the `wmm.music` database to pick up a change. Start
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
  pluginFiles!: Table<PackageFileRecord, number>;
  pluginSettings!: Table<PluginSettingsRecord, string>;
  offlineAudio!: Table<OfflineAudioRecord, string>;
  themes!: Table<InstalledTheme, string>;
  themeFiles!: Table<PackageFileRecord, number>;
  themeSettings!: Table<{ key: string; value: string }, string>;
  appSettings!: Table<{ key: string; value: string }, string>;

  constructor() {
    super("wmm.music");

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

      plugins: `
        id,
        name,
        runtime,
        kind,
        installedAt
      `,

      pluginFiles: `
        ++id,
        ownerId,
        [ownerId+path],
        path
      `,

      pluginSettings: `
        pluginId,
        updatedAt
      `,

      offlineAudio: `
        songId,
        sourceId,
        cachedAt
      `,

      themes: `
        id,
        name,
        installedAt
      `,

      themeFiles: `
        ++id,
        ownerId,
        [ownerId+path],
        path
      `,

      themeSettings: `
        key
      `,

      appSettings: `
        key
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
