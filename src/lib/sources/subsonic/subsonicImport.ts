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
import type { Song, SubsonicMusicSource } from "@/models";
import { SubsonicClient, type SubsonicCredentials } from "./SubsonicClient";
import { getSubsonicSecret } from "./subsonicSecrets";
import { getStore } from "@/core/system";
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
    length: child.duration,
    bitrate: child.bitRate,
    pictures,
  };
}

function credentialsFor(source: SubsonicMusicSource): SubsonicCredentials {
  const password = getSubsonicSecret(source.id);
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
    credentials ?? (() => {
      try {
        return credentialsFor(source);
      } catch {
        return undefined;
      }
    })();
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
  const results = await asyncPool(albumsDefs, MAX_CONCURRENCY, async (album) => {
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
  });

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

  const creds = credentialsFor(source);
  const url = await client.streamUrl(creds, remoteId);
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Subsonic stream failed: HTTP ${res.status}`);
  }

  return await res.arrayBuffer();
}
