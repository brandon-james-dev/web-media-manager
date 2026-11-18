import type { Song } from "@/models";
import type { LibraryPageState, LibrarySelection } from "./librarySelection";

/**
 * The songs a page shows: the source filter, then the selection, then the
 * search text. A playlist selection keeps the playlist's own order, because
 * that order is the play order; every other selection keeps the library
 * order it was given in.
 *
 * @example
 * ```xml
 * <TrackList variant="table" columns="title artist album duration" />
 * ```
 * @example
 * ```ts
 * const visible = filterLibrarySongs(songs, state);
 * const inPlaylist = filterLibrarySongs(songs, state, playlistSongIds);
 * ```
 */
export function filterLibrarySongs(
  songs: readonly Song[],
  state: LibraryPageState,
  playlistSongIds?: readonly string[]
): Song[] {
  const bySource =
    state.sourceIds.length === 0
      ? [...songs]
      : songs.filter((song) => state.sourceIds.includes(song.sourceId));

  const selected = selectSongs(bySource, state.selection, playlistSongIds);
  const query = state.query.trim().toLowerCase();
  if (query === "") return selected;
  return selected.filter((song) => matchesQuery(song, query));
}

/**
 * The songs one selection holds, without the page's source filter or search
 * text, so a context menu can act on a whole artist, album or genre.
 *
 * @example
 * ```xml
 * <LibraryBrowser views="artists albums genres" display="tree" />
 * ```
 * @example
 * ```ts
 * const songs = songsForSelection(library, { kind: "artist", value: "Coldplay" });
 * ```
 */
export function songsForSelection(
  songs: readonly Song[],
  selection: LibrarySelection
): Song[] {
  return selectSongs(songs, selection);
}

/**
 * The song count and the total length of a list, for a summary line.
 *
 * @example
 * ```xml
 * <CollectionSummary fields="title count duration" />
 * ```
 * @example
 * ```ts
 * summarize(songs); // { count: 13, totalSeconds: 3738 }
 * ```
 */
export function summarize(songs: readonly Song[]): {
  count: number;
  totalSeconds: number;
} {
  let totalSeconds = 0;
  for (const song of songs) totalSeconds += song.duration ?? 0;
  return { count: songs.length, totalSeconds };
}

/** The songs one selection keeps, in the order that selection implies. */
function selectSongs(
  songs: readonly Song[],
  selection: LibrarySelection,
  playlistSongIds?: readonly string[]
): Song[] {
  switch (selection.kind) {
    case "artist":
      return songs.filter(
        (song) =>
          (song.albumArtist ?? song.artist) === selection.value ||
          song.artist === selection.value
      );
    case "album":
      return songs.filter((song) => song.album === selection.value);
    case "genre":
      return songs.filter((song) => song.genre === selection.value);
    case "year":
      return songs.filter(
        (song) =>
          song.year !== undefined && String(song.year) === selection.value
      );
    case "playlist": {
      if (playlistSongIds === undefined) return [];
      const byId = new Map(songs.map((song) => [song.id, song]));
      const ordered: Song[] = [];
      for (const id of playlistSongIds) {
        const song = byId.get(id);
        if (song !== undefined) ordered.push(song);
      }
      return ordered;
    }
    default:
      return [...songs];
  }
}

/** Whether a song matches the search text on any of its browsable fields. */
function matchesQuery(song: Song, query: string): boolean {
  return [
    song.title,
    song.album,
    song.artist,
    song.albumArtist,
    song.genre,
  ].some((field) => field !== undefined && field.toLowerCase().includes(query));
}
