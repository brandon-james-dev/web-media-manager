import { uuidv7 } from "uuidv7";
import type { Song } from "@/models/Song";
import {
  FAVORITES_PLAYLIST_ID,
  type FavoriteOrigin,
  type Playlist,
  type PlaylistEntry,
} from "@/models";
import { mergeOrigin } from "@/core/playlists/favoriteOrigin";
import { getPlaylistStore } from "@/core/ports";
import { SOURCE_URI_PREFIX } from "@/core/contracts/sources";
import type { WorkerProgress } from "../WorkerJob";
import { initMetadataStore } from "@/lib";
import type { BackgroundJob } from "@/events/background-job-events";
import type { CombinedMetadataStore } from "@/lib/persistence/browser/CombinedMetadataStore";
import type { MusicSource } from "@/models";
import { getStrategy } from "@/lib/sources";
import { getSongArtworkStore } from "@/lib/persistence/songArtworkStore";
import { stampSong } from "./songChange";
import type { MusicSourceImportConfig } from "@/lib/sources/config";

/**
 * Worker bulk import job — collects a MusicSource's songs via its
 * worker-safe collector (`collectSongs`: local file walk, or Open Subsonic
 * library walk), enqueues thumbnail generation, then imports the source's
 * playlists (when its strategy provides them) and returns what was imported. The collector layer is deliberately UI-free so the worker never
 * pulls React/toast/lucide into its bundle.
 */
export async function runBulkImport(
  payload: {
    musicSource: MusicSource;
    /** Generic source config (incl. any main-thread-resolved secret);
     *  resolved by the enqueueing strategy via getMusicSourceImportConfig. */
    musicSourceConfig?: MusicSourceImportConfig;
    /** Epoch ms of this source's last successful import, when there was one. */
    since?: number;
  },
  isCancelled: () => boolean,
  reportProgress: (progress: WorkerProgress) => void,
  id?: string
): Promise<
  { ok: true; songs: Song[]; playlists: Playlist[] } | { cancelled: true }
> {
  const { musicSource: source } = payload;
  if (!id) return { cancelled: true };

  const collector = getStrategy(source.kind);
  if (!collector) return { cancelled: true };

  const store = initMetadataStore() as CombinedMetadataStore;
  const allSongs = await store.getAll();

  const changes =
    payload.since !== undefined && collector.collectSongChanges
      ? await collector.collectSongChanges({
          source,
          since: payload.since,
          knownPaths: new Set(
            allSongs
              .filter((s) => s.sourceId === source.id && s.relativePath)
              .map((s) => s.relativePath as string)
          ),
          isCancelled,
          musicSourceConfig: payload.musicSourceConfig,
          reportProgress,
        })
      : null;

  const note =
    changes?.note ??
    (payload.since === undefined
      ? "Reading full library: no earlier successful import recorded"
      : "Reading full library: source cannot report changes");
  reportProgress({ index: 0, total: 0, percent: 0, label: note });

  const songCollection =
    changes?.songs ??
    (await collector.collectSongs({
      source,
      isCancelled,
      musicSourceConfig: payload.musicSourceConfig,
      reportProgress,
    }));
  if (isCancelled()) return { cancelled: true };

  // Set logic: diff this source's currently-stored songs against what the
  // collector just found. Songs that exist in the store for this source but
  // are NOT in the freshly-collected set have been removed from the source
  // (deleted from the folder / removed from the server) — drop them.
  const existingIdByPath = new Map<string, string>();
  for (const s of allSongs) {
    if (s.sourceId === source.id && s.relativePath) {
      existingIdByPath.set(s.relativePath, s.id);
    }
  }
  for (const song of songCollection) {
    const existingId =
      song.relativePath && !song.id.startsWith(SOURCE_URI_PREFIX)
        ? existingIdByPath.get(song.relativePath)
        : undefined;
    if (existingId) song.id = existingId;
  }
  const existingById = new Map(allSongs.map((s) => [s.id, s]));
  const songsWithArtwork = await getSongArtworkStore().listSongIdsWithArtwork();
  const collectedIds = new Set(songCollection.map((s) => s.id));
  const presentPaths = changes?.presentPaths
    ? new Set(changes.presentPaths)
    : null;
  const removedIds = allSongs
    .filter((s) => {
      if (s.sourceId !== source.id) return false;
      if (presentPaths)
        return !(s.relativePath && presentPaths.has(s.relativePath));
      if (changes?.unchanged) return false;
      return !collectedIds.has(s.id);
    })
    .map((s) => s.id);
  if (removedIds.length > 0) {
    await store.batchDelete(removedIds);
    reportProgress({
      percent: 0.5,
      label: `Removed ${removedIds.length} song(s) no longer on "${source.name}"`,
    });
  }

  const total = songCollection.length;

  // Emit progress immediately so the "Bulk Import started" notification
  // shows as soon as the job begins — not after the first save.
  reportProgress({
    index: 0,
    total,
    percent: 0,
    label: `Importing from "${source.name}"`,
  });

  for (let index = 0; index < total; index++) {
    if (isCancelled()) return { cancelled: true };

    const song = songCollection[index];
    const changed = stampSong(song, existingById.get(song.id), Date.now());

    // Enqueue thumbnail generation for cover art, unless the song is
    // unchanged since the last import and its artwork is already generated.
    const needsArtwork = changed || !songsWithArtwork.has(song.id);
    if (needsArtwork && song.pictures?.some((p) => p.data || p.url)) {
      self.postMessage({
        type: "enqueueJob",
        job: {
          id: uuidv7(),
          parentJobId: id,
          state: "pending",
          type: "Thumbnail Generation",
          payload: { song, musicSourceConfig: payload.musicSourceConfig },
        } as BackgroundJob,
      });
    }

    // Persist, then report progress AFTER the save so the UI's
    // progress-triggered refresh (SongProvider.onJobProgress) sees the
    // song already in the store — no missed refresh.
    if (changed) await store.save(song.id, song);

    reportProgress({
      index,
      total,
      percent: (index + 1) / total,
      label: `Imported ${song.filename || song.title}`,
      checkpoint: { phase: "songs", index: index + 1, total },
      data: {
        phase: "songs",
        song,
        totalPictureCount: song.pictures?.length ?? 0,
      },
    });
  }

  const playlists = await importPlaylists(
    source,
    collector,
    payload.musicSourceConfig,
    isCancelled,
    reportProgress,
    changes
      ? [
          ...allSongs.filter(
            (s) =>
              s.sourceId === source.id &&
              !collectedIds.has(s.id) &&
              !removedIds.includes(s.id)
          ),
          ...songCollection,
        ]
      : songCollection
  );
  if (!playlists) return { cancelled: true };

  return { ok: true, songs: songCollection, playlists };
}

/**
 * Merge the songs the source marks as favorites into the app's Favorites
 * playlist. Additive only: songs favorited in the app are never removed, and a
 * failed or unsupported fetch leaves favorites untouched.
 */
async function importFavorites(
  source: MusicSource,
  collector: NonNullable<ReturnType<typeof getStrategy>>,
  musicSourceConfig: MusicSourceImportConfig | undefined,
  songs: Song[]
): Promise<void> {
  if (!collector.collectFavorites) return;
  const importedSongIds = new Set(songs.map((s) => s.id));

  let favoriteIds: string[] | null;
  try {
    favoriteIds = await collector.collectFavorites({
      source,
      songs,
      musicSourceConfig,
    });
  } catch {
    return;
  }
  if (!favoriteIds) return;

  const store = getPlaylistStore();
  await store.ensureFavorites?.();
  const favorites = await store.get(FAVORITES_PLAYLIST_ID);
  if (!favorites) return;

  const found: "local" | "server" =
    source.kind === "local" ? "local" : "server";
  const incoming = new Set(favoriteIds.filter((id) => importedSongIds.has(id)));
  const now = Date.now();
  let changed = false;

  const songsOut: PlaylistEntry[] = [];
  for (const entry of favorites.songs) {
    const current = entry.origin ?? "local";
    let origin: FavoriteOrigin | null = current;
    if (incoming.has(entry.songId)) {
      origin = mergeOrigin(entry.origin, found);
      incoming.delete(entry.songId);
    } else if (found === "server" && importedSongIds.has(entry.songId)) {
      origin =
        current === "both" ? "local" : current === "server" ? null : current;
    }
    if (origin === null) {
      changed = true;
      continue;
    }
    if (origin !== current) changed = true;
    songsOut.push(origin === current ? entry : { ...entry, origin });
  }
  for (const songId of incoming) {
    songsOut.push({ songId, addedAt: now, origin: found });
    changed = true;
  }
  if (!changed) return;

  await store.save(FAVORITES_PLAYLIST_ID, {
    ...favorites,
    songs: songsOut,
    updatedAt: now,
  });
}

/**
 * Playlist phase of a bulk import: collect the source's playlists, upsert
 * them, and drop ones the source no longer has (same set logic as songs).
 * Skipped when the strategy has no playlists or could not read them — the
 * existing playlists stay as they are. Returns the imported playlists, or
 * null when cancelled.
 *
 * The final progress report (`data.done`) names what changed so the main
 * thread can refresh and publish `wmm.playlists.imported` — the worker's
 * own store writes don't reach main-thread listeners.
 */
async function importPlaylists(
  source: MusicSource,
  collector: NonNullable<ReturnType<typeof getStrategy>>,
  musicSourceConfig: MusicSourceImportConfig | undefined,
  isCancelled: () => boolean,
  reportProgress: (progress: WorkerProgress) => void,
  songs: Song[]
): Promise<Playlist[] | null> {
  await importFavorites(source, collector, musicSourceConfig, songs);
  if (!collector.collectPlaylists) return [];

  reportProgress({
    index: 0,
    total: 0,
    percent: 0,
    label: `Fetching playlists from "${source.name}"`,
    data: { phase: "playlists", sourceId: source.id },
  });

  const collected = await collector.collectPlaylists({
    source,
    isCancelled,
    musicSourceConfig,
    reportProgress: (progress) =>
      reportProgress({
        ...progress,
        data: { phase: "playlists", sourceId: source.id },
      }),
  });
  if (!collected) return [];
  if (isCancelled()) return null;

  const store = getPlaylistStore();
  const keep = new Set(collected.map((p) => p.id));

  for (let index = 0; index < collected.length; index++) {
    if (isCancelled()) return null;
    await store.save(collected[index].id, collected[index]);
  }

  const removedIds: string[] = [];
  for (const existing of await store.getAll()) {
    if (existing.sourceId === source.id && !keep.has(existing.id)) {
      await store.delete(existing.id);
      removedIds.push(existing.id);
    }
  }

  reportProgress({
    index: collected.length,
    total: collected.length,
    percent: 1,
    label: `Imported ${collected.length} playlist(s) from "${source.name}"`,
    data: {
      phase: "playlists",
      done: true,
      sourceId: source.id,
      playlistIds: collected.map((p) => p.id),
      removedIds,
    },
  });

  return collected;
}
