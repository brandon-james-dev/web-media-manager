import { TRACK_COLUMN_VALUES } from "@/core/themes/widgetKit";
import type { TrackColumnId } from "./trackColumns";
import type { TrackTableSort } from "./ThemeTrackTable";

/**
 * The sort stored under one key: a sort, `null` when the reader cleared it,
 * or `undefined` when the key holds nothing readable.
 *
 * @example
 * ```xml
 * <TrackList variant="table" columns="title artist" sortBy="title" />
 * ```
 * @example
 * ```ts
 * readStoredSort("wmm.themeTrackList.glass-player.library.sort");
 * // { column: "title", desc: false }
 * ```
 */
export function readStoredSort(key: string): TrackTableSort | null | undefined {
  if (typeof localStorage === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null) return null;
    if (typeof parsed !== "object") return undefined;
    const { column, desc } = parsed as { column?: unknown; desc?: unknown };
    if (typeof column !== "string" || !isTrackColumnId(column)) {
      return undefined;
    }
    if (typeof desc !== "boolean") return undefined;
    return { column, desc };
  } catch {
    return undefined;
  }
}

/**
 * Stores one key's sort, or `null` when the page has no sort, ignoring a
 * storage that refuses the write.
 *
 * @example
 * ```xml
 * <TrackList variant="table" columns="title artist" sortBy="artist" />
 * ```
 * @example
 * ```ts
 * writeStoredSort("wmm.themeTrackList.glass-player.library.sort", {
 *   column: "artist",
 *   desc: true,
 * });
 * ```
 */
export function writeStoredSort(
  key: string,
  sort: TrackTableSort | undefined
): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(sort ?? null));
  } catch {
    return;
  }
}

/** Whether a name is one of the table's columns. */
function isTrackColumnId(name: string): name is TrackColumnId {
  return (TRACK_COLUMN_VALUES as readonly string[]).includes(name);
}
