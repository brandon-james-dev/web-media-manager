import type { UseTranslationResult } from "@/i18n";
import type { Song } from "@/models";
import type { LibrarySelection } from "./librarySelection";

/**
 * One row of the browser: a value, how many songs it holds, and its pick.
 *
 * @example
 * ```xml
 * <LibraryBrowser views="artists albums" display="list" />
 * ```
 * @example
 * ```ts
 * const entry: BrowserEntry = {
 *   key: "Coldplay",
 *   label: "Coldplay",
 *   count: 13,
 *   selection: { kind: "artist", value: "Coldplay" },
 * };
 * ```
 */
export interface BrowserEntry {
  /** Stable key of the entry within its view. */
  readonly key: string;
  /** The text the row shows. */
  readonly label: string;
  /** How many songs the value holds. */
  readonly count: number;
  /** The song whose artwork represents the value, when one has artwork. */
  readonly pictureSongId?: string;
  /** The selection picking this entry sets. */
  readonly selection: LibrarySelection;
}

/**
 * The entries one view lists, in the order the built-in pages use.
 *
 * @example
 * ```xml
 * <LibraryBrowser views="artists albums genres songs" />
 * ```
 * @example
 * ```ts
 * const entries = buildEntries("artists", songs, playlists, t);
 * entries[0]?.selection; // { kind: "artist", value: "Coldplay" }
 * ```
 */
export function buildEntries(
  view: string,
  songs: readonly Song[],
  playlists: readonly {
    id: string;
    name: string;
    songs: { songId: string }[];
  }[],
  t: UseTranslationResult["t"]
): BrowserEntry[] {
  if (view === "playlists") {
    return playlists.map((playlist) => ({
      key: playlist.id,
      label: playlist.name,
      count: playlist.songs.length,
      selection: { kind: "playlist", id: playlist.id },
    }));
  }

  if (view === "songs") {
    return [
      {
        key: "all",
        label: t("library.songs"),
        count: songs.length,
        selection: { kind: "all" },
      },
    ];
  }

  const groups = new Map<string, { count: number; pictureSongId?: string }>();

  for (const song of songs) {
    const value = groupValue(view, song, t);
    if (value === undefined) continue;
    const existing = groups.get(value);
    if (existing === undefined) {
      groups.set(value, { count: 1, pictureSongId: song.id });
      continue;
    }
    existing.count += 1;
    if (view === "albums" && song.pictures?.length) {
      existing.pictureSongId = song.id;
    }
  }

  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([value, group]) => ({
      key: value,
      label: value,
      count: group.count,
      ...(group.pictureSongId === undefined
        ? {}
        : { pictureSongId: group.pictureSongId }),
      selection: { kind: selectionKind(view), value },
    }));
}

/** The selection kind one grouped view picks. */
function selectionKind(view: string): "artist" | "album" | "genre" {
  switch (view) {
    case "artists":
      return "artist";
    case "albums":
      return "album";
    default:
      return "genre";
  }
}

/**
 * The resource key of a view's label.
 *
 * @example
 * ```xml
 * <LibraryBrowser views="artists albums genres songs playlists" />
 * ```
 * @example
 * ```ts
 * t(viewLabelKey("albums")); // "Albums"
 * ```
 */
export function viewLabelKey(
  view: string
):
  | "library.artists"
  | "library.albums"
  | "library.songs"
  | "library.genres"
  | "navigation.playlists"
  | "navigation.library" {
  switch (view) {
    case "artists":
      return "library.artists";
    case "albums":
      return "library.albums";
    case "genres":
      return "library.genres";
    case "playlists":
      return "navigation.playlists";
    case "library":
      return "navigation.library";
    default:
      return "library.songs";
  }
}

/** The value a song contributes to one view's grouping. */
function groupValue(
  view: string,
  song: Song,
  t: UseTranslationResult["t"]
): string | undefined {
  switch (view) {
    case "artists":
      return song.albumArtist || song.artist || t("common.unknownArtist");
    case "albums":
      return song.album || t("library.unknownAlbum");
    case "genres":
      return song.genre;
    default:
      return undefined;
  }
}
