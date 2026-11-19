import type { UseTranslationResult } from "@/i18n";
import { isSongOffline } from "@/lib/offline";
import { compareDiscThenTrack } from "@/lib/persistence";
import { TRACK_COLUMN_VALUES } from "@/core/themes/widgetKit";
import type { Song } from "@/models";

/**
 * The song columns a themed table can show, taken from the component model so
 * the widget and the validator agree on the allowed values.
 *
 * @example
 * ```xml
 * <TrackList variant="table" columns="track title duration" />
 * ```
 * @example
 * ```ts
 * const column: TrackColumnId = "duration";
 * ```
 */
export type TrackColumnId = (typeof TRACK_COLUMN_VALUES)[number];

/**
 * One column's label, width, alignment and the song field it reads.
 *
 * @example
 * ```xml
 * <TrackList variant="table" columns="title duration" />
 * ```
 * @example
 * ```ts
 * const def = TRACK_COLUMN_DEFS.duration;
 * def.width; // 72
 * def.numeric; // true
 * ```
 */
export interface TrackColumnDef {
  /** The resource key of the column's header label. */
  readonly labelKey: TrackColumnLabelKey;
  /** The width the column starts at, in pixels. */
  readonly width: number;
  /** Whether the cell aligns to the end edge, for numbers. */
  readonly numeric: boolean;
  /** The song field the column sorts by. */
  readonly value: (song: Song) => string | number | boolean | undefined;
  /** The text the cell shows. */
  readonly format: (song: Song, t: UseTranslationResult["t"]) => string;
}

/**
 * The resource keys the column headers use. Every one already exists in the
 * resource pack, so a table needs no new strings.
 *
 * @example
 * ```xml
 * <TrackList variant="table" columns="albumArtist disc source" />
 * ```
 * @example
 * ```ts
 * const key: TrackColumnLabelKey = "metadata.albumArtist";
 * ```
 */
export type TrackColumnLabelKey =
  | "metadata.title"
  | "metadata.album"
  | "metadata.artist"
  | "metadata.albumArtist"
  | "metadata.track"
  | "metadata.disc"
  | "metadata.genre"
  | "metadata.year"
  | "metadata.duration"
  | "metadata.bitrate"
  | "library.offline"
  | "metadata.source";

/**
 * The narrowest and widest a column may be dragged to, in pixels.
 *
 * @example
 * ```xml
 * <TrackList variant="table" resizeColumns="true" />
 * ```
 * @example
 * ```ts
 * clampWidth(10); // 40
 * clampWidth(2000); // 800
 * ```
 */
export const COLUMN_MIN_WIDTH = 40;

/** The widest a column may be dragged to, in pixels. */
export const COLUMN_MAX_WIDTH = 800;

/**
 * Every column's definition, keyed by its id.
 *
 * @example
 * ```xml
 * <TrackList variant="table" columns="title artist duration" />
 * ```
 * @example
 * ```ts
 * TRACK_COLUMN_DEFS.title.width; // 240
 * TRACK_COLUMN_DEFS.track.numeric; // true
 * ```
 */
export const TRACK_COLUMN_DEFS: Record<TrackColumnId, TrackColumnDef> = {
  title: {
    labelKey: "metadata.title",
    width: 240,
    numeric: false,
    value: (song) => song.title,
    format: (song) => song.title ?? "",
  },
  album: {
    labelKey: "metadata.album",
    width: 200,
    numeric: false,
    value: (song) => song.album,
    format: (song) => song.album ?? "",
  },
  artist: {
    labelKey: "metadata.artist",
    width: 180,
    numeric: false,
    value: (song) => song.artist,
    format: (song) => song.artist ?? "",
  },
  albumArtist: {
    labelKey: "metadata.albumArtist",
    width: 180,
    numeric: false,
    value: (song) => song.albumArtist,
    format: (song) => song.albumArtist ?? "",
  },
  track: {
    labelKey: "metadata.track",
    width: 56,
    numeric: true,
    value: (song) => song.track,
    format: (song) => (song.track === undefined ? "" : String(song.track)),
  },
  disc: {
    labelKey: "metadata.disc",
    width: 48,
    numeric: true,
    value: (song) => song.discNumber,
    format: (song) =>
      song.discNumber === undefined ? "" : String(song.discNumber),
  },
  genre: {
    labelKey: "metadata.genre",
    width: 120,
    numeric: false,
    value: (song) => song.genre,
    format: (song) => song.genre ?? "",
  },
  year: {
    labelKey: "metadata.year",
    width: 64,
    numeric: true,
    value: (song) => song.year,
    format: (song) => (song.year === undefined ? "" : String(song.year)),
  },
  duration: {
    labelKey: "metadata.duration",
    width: 72,
    numeric: true,
    value: (song) => song.duration,
    format: (song) => formatDuration(song.duration),
  },
  bitrate: {
    labelKey: "metadata.bitrate",
    width: 80,
    numeric: true,
    value: (song) => song.bitrate,
    format: (song) =>
      song.bitrate === undefined ? "" : `${Math.round(song.bitrate)} kbps`,
  },
  offline: {
    labelKey: "library.offline",
    width: 64,
    numeric: false,
    value: (song) => isSongOffline(song.id),
    format: (song) => (isSongOffline(song.id) ? "\u2713" : ""),
  },
  source: {
    labelKey: "metadata.source",
    width: 120,
    numeric: false,
    value: (song) => song.sourceId,
    format: (song) => song.sourceId,
  },
};

/**
 * The columns an attribute names, in order: unknown names are dropped, a
 * repeated column keeps its first place, and `album` is dropped for the
 * album-grouped variant because the album cell already shows it.
 *
 * @example
 * ```xml
 * <TrackList variant="albums" columns="track title album duration" />
 * ```
 * @example
 * ```ts
 * parseColumns("track title title album", "albums"); // ["track", "title"]
 * ```
 */
export function parseColumns(
  attribute: string,
  variant: "table" | "albums"
): TrackColumnId[] {
  const seen = new Set<TrackColumnId>();
  const columns: TrackColumnId[] = [];
  for (const name of attribute.split(/\s+/).filter(Boolean)) {
    if (!isTrackColumnId(name)) continue;
    if (variant === "albums" && name === "album") continue;
    if (seen.has(name)) continue;
    seen.add(name);
    columns.push(name);
  }
  return columns;
}

/**
 * How the album-grouped variant lays its table out: grouped by album while the
 * sort column is `album`, and a flat table carrying an `album` column
 * otherwise.
 *
 * @example
 * ```xml
 * <TrackList variant="albums" columns="track title duration" sortBy="title" />
 * ```
 * @example
 * ```ts
 * resolveAlbumsLayout("albums", "title", ["track", "title"]);
 * // { grouped: false, columns: ["album", "track", "title"] }
 * ```
 */
export function resolveAlbumsLayout(
  variant: "table" | "albums",
  sortColumn: TrackColumnId,
  columns: readonly TrackColumnId[]
): { grouped: boolean; columns: TrackColumnId[] } {
  if (variant !== "albums") return { grouped: false, columns: [...columns] };
  if (sortColumn === "album") {
    return {
      grouped: true,
      columns: columns.filter((column) => column !== "album"),
    };
  }
  if (columns.includes("album")) {
    return { grouped: false, columns: [...columns] };
  }
  return { grouped: false, columns: ["album", ...columns] };
}

/**
 * A width kept inside the range a column may be dragged to.
 *
 * @example
 * ```xml
 * <TrackList variant="table" resizeColumns="true" />
 * ```
 * @example
 * ```ts
 * clampWidth(120); // 120
 * ```
 */
export function clampWidth(width: number): number {
  if (!Number.isFinite(width)) return COLUMN_MIN_WIDTH;
  return Math.min(COLUMN_MAX_WIDTH, Math.max(COLUMN_MIN_WIDTH, width));
}

/**
 * A stored column order brought in line with the layout's list: names the
 * layout no longer lists are dropped, and layout columns the order is missing
 * are appended in layout order.
 *
 * @example
 * ```xml
 * <TrackList variant="table" columns="track title duration" reorderColumns="true" />
 * ```
 * @example
 * ```ts
 * reconcileColumnOrder(["duration", "gone"], ["track", "title", "duration"]);
 * // ["duration", "track", "title"]
 * ```
 */
export function reconcileColumnOrder(
  stored: readonly string[],
  columns: readonly TrackColumnId[]
): TrackColumnId[] {
  const allowed = new Set<TrackColumnId>(columns);
  const seen = new Set<TrackColumnId>();
  const order: TrackColumnId[] = [];
  for (const name of stored) {
    if (!isTrackColumnId(name)) continue;
    if (!allowed.has(name) || seen.has(name)) continue;
    seen.add(name);
    order.push(name);
  }
  for (const column of columns) {
    if (seen.has(column)) continue;
    seen.add(column);
    order.push(column);
  }
  return order;
}

/**
 * One column moved into another column's slot: the moved column takes the
 * place the target held, so a drag to the end edge lands after the target and
 * a drag to the start edge lands before it.
 *
 * @example
 * ```xml
 * <TrackList variant="table" columns="track title duration" reorderColumns="true" />
 * ```
 * @example
 * ```ts
 * moveColumn(["track", "title", "duration"], "track", "duration");
 * // ["title", "track", "duration"]
 * ```
 */
export function moveColumn(
  order: readonly TrackColumnId[],
  from: TrackColumnId,
  to: TrackColumnId
): TrackColumnId[] {
  if (from === to) return [...order];
  const without = order.filter((column) => column !== from);
  const index = without.indexOf(to);
  if (index < 0) return [...order];
  return [...without.slice(0, index), from, ...without.slice(index)];
}

/**
 * One album's songs, with the values the album cell shows.
 *
 * @example
 * ```xml
 * <TrackList variant="albums" columns="track title duration" />
 * ```
 * @example
 * ```ts
 * const group: AlbumGroup = {
 *   key: "Coldplay\u0000X&Y",
 *   album: "X&Y",
 *   albumArtist: "Coldplay",
 *   genre: "Rock",
 *   year: 2005,
 *   pictureSongId: "song-1",
 *   songs: [],
 * };
 * ```
 */
export interface AlbumGroup {
  /** Stable key of the group, built from its artist and album. */
  readonly key: string;
  /** The album's name, or the unknown-album label. */
  readonly album: string;
  /** The album's artist, or the unknown-artist label. */
  readonly albumArtist: string;
  /** The genre the album's songs share, when they do. */
  readonly genre?: string;
  /** The year the album's songs share, when they do. */
  readonly year?: number;
  /** The song whose artwork the album shows: the first with embedded pictures, else the first song. */
  readonly pictureSongId?: string;
  /** The album's songs, in disc and track order unless a sort is given. */
  readonly songs: Song[];
}

/**
 * The stand-in labels an album group shows for a missing artist or album.
 *
 * @example
 * ```xml
 * <TrackList variant="albums" columns="track title" />
 * ```
 * @example
 * ```ts
 * const labels: AlbumGroupLabels = {
 *   unknownArtist: "Unknown Artist",
 *   unknownAlbum: "Unknown Album",
 * };
 * ```
 */
export interface AlbumGroupLabels {
  /** The label for a song with no album artist. */
  readonly unknownArtist: string;
  /** The label for a song with no album. */
  readonly unknownAlbum: string;
}

/**
 * Groups songs by album, ordered by album then album artist with the unknowns
 * last, and orders each album's songs by disc then track unless a sort column
 * is given.
 *
 * @example
 * ```xml
 * <TrackList variant="albums" columns="track title duration" sortBy="title" />
 * ```
 * @example
 * ```ts
 * const groups = groupByAlbum(songs, undefined, false, labels);
 * groups[0]?.album; // "Power, Corruption & Lies"
 * ```
 */
export function groupByAlbum(
  songs: readonly Song[],
  sortSelector?: (song: Song) => unknown,
  desc = false,
  labels: AlbumGroupLabels = { unknownArtist: "", unknownAlbum: "" }
): AlbumGroup[] {
  const groups = new Map<
    string,
    {
      album: string;
      albumArtist: string;
      genre?: string;
      year?: number;
      pictureSongId: string;
      artworkSongId?: string;
      songs: Song[];
      unknownArtist: boolean;
      unknownAlbum: boolean;
    }
  >();

  for (const song of songs) {
    const albumArtist = song.albumArtist || song.artist;
    const album = song.album;
    const key = `${albumArtist ?? ""}\u0000${album ?? ""}`;
    const existing = groups.get(key);
    if (existing === undefined) {
      groups.set(key, {
        album: album ?? labels.unknownAlbum,
        albumArtist: albumArtist ?? labels.unknownArtist,
        ...(song.genre === undefined ? {} : { genre: song.genre }),
        ...(song.year === undefined ? {} : { year: song.year }),
        pictureSongId: song.id,
        ...(song.pictures?.length ? { artworkSongId: song.id } : {}),
        songs: [song],
        unknownArtist: albumArtist === undefined,
        unknownAlbum: album === undefined,
      });
      continue;
    }
    existing.songs.push(song);
    if (existing.artworkSongId === undefined && song.pictures?.length) {
      existing.artworkSongId = song.id;
    }
  }

  const ordered = [...groups.entries()].sort((a, b) => {
    const left = a[1];
    const right = b[1];
    if (left.unknownAlbum !== right.unknownAlbum) {
      return left.unknownAlbum ? 1 : -1;
    }
    const byAlbum = left.album.localeCompare(right.album);
    if (byAlbum !== 0) return byAlbum;
    if (left.unknownArtist !== right.unknownArtist) {
      return left.unknownArtist ? 1 : -1;
    }
    return left.albumArtist.localeCompare(right.albumArtist);
  });

  return ordered.map(([key, group]) => ({
    key,
    album: group.album,
    albumArtist: group.albumArtist,
    ...(group.genre === undefined ? {} : { genre: group.genre }),
    ...(group.year === undefined ? {} : { year: group.year }),
    pictureSongId: group.artworkSongId ?? group.pictureSongId,
    songs:
      sortSelector === undefined
        ? [...group.songs].sort(compareDiscThenTrack)
        : [...group.songs].sort((a, b) => {
            const result = compareUnknownLast(sortSelector(a), sortSelector(b));
            return desc ? -result : result;
          }),
  }));
}

/**
 * The song ids of every group in display order, which is the order selection
 * ranges and playback follow.
 *
 * @example
 * ```xml
 * <TrackList variant="albums" columns="track title" />
 * ```
 * @example
 * ```ts
 * flattenGroups(groups); // ["song-1", "song-2", "song-3"]
 * ```
 */
export function flattenGroups(groups: readonly AlbumGroup[]): string[] {
  const ids: string[] = [];
  for (const group of groups) {
    for (const song of group.songs) ids.push(song.id);
  }
  return ids;
}

/** Whether a name is one of the table's columns. */
function isTrackColumnId(name: string): name is TrackColumnId {
  return (TRACK_COLUMN_VALUES as readonly string[]).includes(name);
}

/** A length in seconds as m:ss, or blank when the song has none. */
function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return "";
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/** Orders two column values, with a missing value last. */
function compareUnknownLast(left: unknown, right: unknown): number {
  if (left === right) return 0;
  if (left === undefined || left === null) return 1;
  if (right === undefined || right === null) return -1;
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }
  return String(left).localeCompare(String(right));
}
