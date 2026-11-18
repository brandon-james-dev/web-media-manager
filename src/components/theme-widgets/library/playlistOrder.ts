import type { TrackColumnId } from "./trackColumns";
import type { TrackTableSort } from "./ThemeTrackTable";

/**
 * The sort a header click produces. A playlist page cycles ascending,
 * descending and then back to the playlist's own order; every other page
 * toggles the direction of the clicked column and starts a new column
 * ascending.
 *
 * @example
 * ```xml
 * <TrackList variant="table" columns="title artist" sortBy="title" />
 * ```
 * @example
 * ```ts
 * cycleTrackSort(undefined, "title", true); // { column: "title", desc: false }
 * cycleTrackSort({ column: "title", desc: true }, "title", true); // undefined
 * ```
 */
export function cycleTrackSort(
  current: TrackTableSort | undefined,
  column: TrackColumnId,
  playlistOrder: boolean
): TrackTableSort | undefined {
  if (!playlistOrder) {
    return {
      column,
      desc: current?.column === column ? !current.desc : false,
    };
  }
  if (current === undefined || current.column !== column) {
    return { column, desc: false };
  }
  return current.desc ? undefined : { column, desc: true };
}

/**
 * An index moved by a number of slots and kept inside the list, so a move off
 * either end stays on the end row.
 *
 * @example
 * ```xml
 * <TrackList variant="table" columns="title artist" />
 * ```
 * @example
 * ```ts
 * moveIndexWithin(0, -1, 5); // 0
 * moveIndexWithin(3, 1, 5); // 4
 * ```
 */
export function moveIndexWithin(
  index: number,
  delta: number,
  length: number
): number {
  if (length <= 0) return 0;
  const next = index + delta;
  if (next < 0) return 0;
  if (next > length - 1) return length - 1;
  return next;
}

/**
 * The index a dragged row lands on, from the slot the insertion line marks.
 * Dropping below the row's own slot lands one slot earlier, because the row
 * leaves the list before it is inserted again.
 *
 * @example
 * ```xml
 * <TrackList variant="table" columns="title artist" />
 * ```
 * @example
 * ```ts
 * reorderTarget(1, 4); // 3
 * reorderTarget(3, 1); // 1
 * ```
 */
export function reorderTarget(from: number, insertion: number): number {
  const target = insertion > from ? insertion - 1 : insertion;
  return target < 0 ? 0 : target;
}
