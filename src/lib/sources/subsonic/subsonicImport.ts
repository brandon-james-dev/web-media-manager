/**
 * Subsonic library reading: query an Open Subsonic server for its music
 * data and persist it into the app's catalog, plus byte-level streaming
 * for playback.
 *
 * The full-library walk is `getIndexes` → (root songs) + `getArtist` per
 * index entry → `getAlbum` per artist album → songs. Every fetched song is
 * persisted with a source-qualified id (`wmm://<uriDomain>/<sourceId>/<remoteId>`)
 * so the same remote id on two servers never collides, and re-importing a
 * source is a natural upsert (stable remote ids).
 *
 * Passwords never leave the secret store: the client is constructed from the
 * persisted source config plus username, and the credential is read from
 * localStorage at call time.
 */
import type { Playlist, Song, SubsonicMusicSource } from "@/models";
import { SubsonicClient, type SubsonicCredentials } from "./SubsonicClient";
import { getSubsonicSecret } from "./subsonicSecrets";
import { getStore } from "@/core/system";
import { getPlaylistStore } from "@/core/ports";
import { parseSourceUri, sourceUri } from "@/core/contracts/sources";
import { ArtworkType } from "@/lib/contracts";

/** The Open Subsonic `<song>`/`<child>` shape we read. */
interface SubsonicChild {
  id?: string;
  isDir?: boolean;
  title?: string;
  album?: string;
  artist?: string;
  genre?: string;
  coverArt?: string;
  size?: number;
  suffix?: string;
  duration?: number;
  bitRate?: number;
  year?: number;
  track?: number;
  discNumber?: number;
}

/** Dir context for a child (artist/album the walk is currently in). */
interface SubsonicDir {
  artist?: string;
  album?: string;
}

export function childToSong(
  source: SubsonicMusicSource,
  child: SubsonicChild,
  dir: SubsonicDir
): Song {
  const title = child.title ?? String(child.id ?? "Unknown");
  const artist = child.artist ?? dir.artist;
  const album = child.album ?? dir.album;
  const filename = `${title}${child.suffix ? "." + child.suffix : ""}`;
  const relativePath = `${artist ?? "Unknown"}/${album ?? "Unknown"}/${filename}`;

  // A server-provided coverArt id becomes a URL picture. runArtworkProcess
  // downloads the largest available image and resizes locally into the
  // thumbnail sizes (the Song.pictures contract).
  const pictures = child.coverArt
    ? [
        {
          type: ArtworkType.FrontCover,
          mimeType: "image/jpeg",
          url: `subsonic://coverart/${child.coverArt}`,
        },
      ]
    : undefined;

  return {
    id: sourceUri(source, child.id ?? title),
    sourceId: source.id,
    relativePath,
    filename,
    filesize: child.size ?? 0,
    title,
    artist,
    album,
    genre: child.genre,
    year: child.year,
    track: child.track,
    discNumber: child.discNumber,
    duration: child.duration,
    bitrate: child.bitRate,
    pictures,
  };
}

async function credentialsFor(
  source: SubsonicMusicSource
): Promise<SubsonicCredentials> {
  const password = await getSubsonicSecret(source.id);
  if (!password) {
    throw new Error(
      `No stored credentials for Subsonic source "${source.name}".`
    );
  }
  return { username: source.config.username ?? "", password };
}

/** Extract the Open Subsonic error code from a thrown client error, if any. */
function subsonicErrorCode(error: unknown): number | undefined {
  const message = error instanceof Error ? error.message : String(error);
  const match = /\((\d+)\)/.exec(message);
  return match ? Number(match[1]) : undefined;
}

/**
 * Normalize the two `getIndexes` shapes servers use: a flat artist list
 * (`index: [{id, name}]`) or letter buckets wrapping artist children
 * (`index: [{name: "A", artist: [{id, name}]}]`). Entries without an id
 * cannot resolve and are dropped.
 */
function normalizeIndexEntries(
  index: Array<{ id?: string; name?: string; artist?: unknown[] }>
): Array<{ id: string; name?: string }> {
  const entries: Array<{ id: string; name?: string }> = [];
  for (const entry of index) {
    if (Array.isArray(entry.artist)) {
      for (const raw of entry.artist) {
        const artist = raw as { id?: string; name?: string };
        if (artist.id) entries.push({ id: artist.id, name: artist.name });
      }
    } else if (entry.id) {
      entries.push({ id: entry.id, name: entry.name });
    }
  }
  return entries;
}

/**
 * Run `mapFn` over `items` with bounded concurrency, preserving order.
 */
async function asyncPool<T, R>(
  items: T[],
  limit: number,
  mapFn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length }) as R[];
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await mapFn(items[i]);
    }
  }
  const workerCount = Math.min(limit, items.length);
  const workers: Promise<void>[] = [];
  for (let w = 0; w < workerCount; w++) workers.push(worker());
  await Promise.all(workers);
  return results;
}

/**
 * Walk the server's full library and map every song to the app's Song
 * model (source-qualified ids, no persistence yet).
 *
 * Some servers index entries that do not resolve as real artists (e.g.
 * Navidrome can return stale or bucket entries); `getArtist` then answers
 * error 70 ("data not found"). Those entries are skipped with a console
 * warning instead of aborting the whole walk.
 */
export async function collectSubsonicSongs(
  source: SubsonicMusicSource,
  credentials?: SubsonicCredentials,
  onProgress?: (resolved: number, total: number) => void
): Promise<Song[]> {
  const client = new SubsonicClient(source.config);
  // Credentials may be passed explicitly (main thread resolves the secret,
  // which web workers can't read from localStorage); otherwise fall back to
  // the stored secret when running on the main thread.
  const creds =
    credentials ?? (await credentialsFor(source).catch(() => undefined));
  if (!creds) return [];

  const songs: Song[] = [];
  const seen = new Set<string>();

  const push = (child: SubsonicChild, dir: SubsonicDir) => {
    if (child.isDir) return;
    const song = childToSong(source, child, dir);
    if (seen.has(song.id)) return;
    seen.add(song.id);
    songs.push(song);
  };

  const { index, child: rootChildren } = await client.getIndexes(creds);
  for (const rootChild of rootChildren) push(rootChild as SubsonicChild, {});

  // Fetch album songs in parallel (bounded concurrency) so a large library
  // is collected far faster than one album at a time close.
  const indexEntries = normalizeIndexEntries(index);
  const MAX_CONCURRENCY = 6;

  // Gather every album across all artists.
  const albumsByArtist = await asyncPool(
    indexEntries,
    MAX_CONCURRENCY,
    async (artist) => {
      try {
        const { album: albums } = await client.getArtist(creds, artist.id);
        return (albums ?? []) as Array<{ id?: string; name?: string }>;
      } catch (error) {
        if (subsonicErrorCode(error) !== 70) throw error;
        return [];
      }
    }
  );

  type AlbumDef = { id: string; name?: string; artist?: string };
  const albumsDefs: AlbumDef[] = [];
  for (let a = 0; a < albumsByArtist.length; a++) {
    for (const album of albumsByArtist[a] ?? []) {
      if (album.id)
        albumsDefs.push({
          id: album.id,
          name: album.name,
          artist: indexEntries[a]?.name,
        });
    }
  }

  // Fetch each album's songs in parallel, reporting progress by album page.
  const totalAlbums = albumsDefs.length;
  let resolved = 0;
  const results = await asyncPool(
    albumsDefs,
    MAX_CONCURRENCY,
    async (album) => {
      try {
        const { name: albumName, song: children } = await client.getAlbum(
          creds,
          album.id
        );
        return {
          albumName: albumName ?? album.name,
          artistName: album.artist,
          children: (children ?? []) as unknown[],
        };
      } catch (error) {
        if (subsonicErrorCode(error) !== 70) throw error;
        return {
          albumName: album.name,
          artistName: album.artist,
          children: [] as unknown[],
        };
      } finally {
        resolved++;
        onProgress?.(resolved, totalAlbums);
      }
    }
  );

  for (const result of results) {
    for (const rawChild of result.children) {
      push(rawChild as SubsonicChild, {
        artist: result.artistName ?? "Unknown",
        album: result.albumName ?? "",
      });
    }
  }

  return songs;
}

/**
 * Ask the server whether its library changed since `since`. Unchanged yields
 * no songs; otherwise the full library is read. Returns null when no
 * credentials are available.
 */
export async function collectSubsonicSongChanges(
  source: SubsonicMusicSource,
  since: number,
  credentials?: SubsonicCredentials,
  onProgress?: (resolved: number, total: number) => void
): Promise<{ songs: Song[]; unchanged: boolean; note: string } | null> {
  const creds =
    credentials ?? (await credentialsFor(source).catch(() => undefined));
  if (!creds) return null;

  const { unchanged, lastModified, index } = await new SubsonicClient(
    source.config
  ).getIndexes(creds, since);
  if (unchanged) {
    return {
      songs: [],
      unchanged,
      note: "Library unchanged since the last import",
    };
  }
  return {
    songs: await collectSubsonicSongs(source, creds, onProgress),
    unchanged,
    note: `Reading full library: server lastModified ${lastModified ?? "missing"}, last import ${since}, ${index.length} index groups returned`,
  };
}

/**
 * Query the server's library and persist every song into the catalog.
 * New songs appear in the UI live (store `added` events); re-running is an
 * idempotent upsert. Returns the number of songs persisted.
 */
export async function importSubsonicLibrary(
  source: SubsonicMusicSource,
  onProgress?: (index: number, total: number) => void
): Promise<number> {
  const songs = await collectSubsonicSongs(source);
  const store = getStore();

  for (let i = 0; i < songs.length; i++) {
    await store.save(songs[i].id, songs[i]);
    onProgress?.(i + 1, songs.length);
  }

  return songs.length;
}

/** Stable app-side id for a server playlist (re-sync upserts the same row). */
export function subsonicPlaylistId(
  source: SubsonicMusicSource,
  remoteId: string
): string {
  return sourceUri(source, `playlist/${remoteId}`);
}

/**
 * Map a server playlist to the app's Playlist model. Entry song ids use the
 * same source-qualified scheme as imported songs, so they resolve against
 * the catalog without a lookup. Entries without an id are dropped.
 */
export function subsonicPlaylistToPlaylist(
  source: SubsonicMusicSource,
  remote: { id: string; name?: string; created?: string; changed?: string },
  entries: unknown[]
): Playlist {
  const created = remote.created ? Date.parse(remote.created) : NaN;
  const changed = remote.changed ? Date.parse(remote.changed) : NaN;
  const createdAt = Number.isNaN(created) ? Date.now() : created;

  return {
    id: subsonicPlaylistId(source, remote.id),
    name: remote.name ?? "Untitled playlist",
    sourceId: source.id,
    songs: (entries as SubsonicChild[])
      .filter((entry) => entry.id)
      .map((entry) => ({
        songId: sourceUri(source, entry.id as string),
        addedAt: createdAt,
      })),
    createdAt,
    updatedAt: Number.isNaN(changed) ? createdAt : changed,
  };
}

/**
 * Fetch the server's playlists and map them to the app's Playlist model
 * (no persistence — the bulk-import job stores them). Worker-safe: pass the
 * main-thread-resolved credentials, since workers can't read the secret
 * store. Returns null when no credentials are available, so the caller
 * leaves existing playlists untouched rather than pruning them.
 */
export async function collectSubsonicPlaylists(
  source: SubsonicMusicSource,
  credentials?: SubsonicCredentials,
  onProgress?: (resolved: number, total: number) => void
): Promise<Playlist[] | null> {
  const client = new SubsonicClient(source.config);
  const creds =
    credentials ?? (await credentialsFor(source).catch(() => undefined));
  if (!creds) return null;

  const remote = await client.getPlaylists(creds);
  let resolved = 0;

  return asyncPool(remote, 4, async (item) => {
    try {
      const { entry } = await client.getPlaylist(creds, item.id);
      return subsonicPlaylistToPlaylist(source, item, entry);
    } finally {
      onProgress?.(++resolved, remote.length);
    }
  });
}

/**
 * Fetch the songs the user has starred on the server as app song ids (same
 * source-qualified scheme as imported songs). Worker-safe like
 * collectSubsonicPlaylists. Returns null when no credentials are available.
 */
export async function collectSubsonicFavoriteIds(
  source: SubsonicMusicSource,
  credentials?: SubsonicCredentials
): Promise<string[] | null> {
  const client = new SubsonicClient(source.config);
  const creds =
    credentials ?? (await credentialsFor(source).catch(() => undefined));
  if (!creds) return null;

  const starred = await client.getStarredSongs(creds);
  return (starred as SubsonicChild[])
    .filter((song) => song.id)
    .map((song) => sourceUri(source, song.id as string));
}

/** Drop every playlist imported from a source (used when it is removed). */
export async function removeSubsonicPlaylists(
  source: Pick<SubsonicMusicSource, "id">
): Promise<void> {
  const store = getPlaylistStore();
  for (const existing of await store.getAll()) {
    if (existing.sourceId === source.id) await store.delete(existing.id);
  }
}

/**
 * Fetch the playable audio bytes of a subsonic song via the `stream`
 * endpoint (used by playback; the URL is authenticated, so the bytes come
 * straight from the server).
 */
export async function fetchSubsonicSongBytes(
  source: SubsonicMusicSource,
  song: Song
): Promise<ArrayBuffer> {
  const client = new SubsonicClient(source.config);
  const parsed = parseSourceUri(song.id);
  const remoteId = parsed?.itemId ?? song.id;

  const creds = await credentialsFor(source);
  const url = await client.streamUrl(creds, remoteId);
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Subsonic stream failed: HTTP ${res.status}`);
  }

  return await res.arrayBuffer();
}
