import { useCallback, useMemo, useState } from "react";
import {
  useThemeLayoutSnapshot,
  useThemeRender,
} from "@/lib/themes/render/browser";
import { moveColumn, reconcileColumnOrder } from "./trackColumns";
import type { TrackColumnId } from "./trackColumns";

/**
 * What a table gets from {@link useColumnOrder}: the column order to render,
 * the move a drag or an arrow key calls, and the reset that returns to the
 * layout's order.
 *
 * @example
 * ```xml
 * <TrackList variant="table" reorderColumns="true" />
 * ```
 * @example
 * ```ts
 * const { order, move } = useColumnOrder("table", columns);
 * move("duration", "title");
 * ```
 */
export interface ColumnOrderHandle {
  /** The columns to render, in the order the reader arranged them. */
  readonly order: readonly TrackColumnId[];
  /** Moves one column into another column's slot. */
  readonly move: (from: TrackColumnId, to: TrackColumnId) => void;
  /** Returns the columns to the layout's order. */
  readonly reset: () => void;
}

/**
 * The order of a themed table's columns, kept per theme, page and variant
 * beside the widths so two tables never share one order. A stored order is
 * reconciled with the layout's list, so a theme that adds or drops a column
 * never leaves a stale one behind.
 *
 * @example
 * ```xml
 * <TrackList variant="albums" reorderColumns="true" />
 * ```
 * @example
 * ```ts
 * const { order } = useColumnOrder("albums", ["track", "title"]);
 * order; // ["track", "title"]
 * ```
 */
export function useColumnOrder(
  storageKey: string,
  columns: readonly TrackColumnId[]
): ColumnOrderHandle {
  const { ir } = useThemeRender();
  const { currentPage } = useThemeLayoutSnapshot();
  const key = `wmm.themeTrackList.${ir.themeId ?? "theme"}.${currentPage}.${storageKey}.order`;

  const [stored, setStored] = useState<readonly string[]>(() => readOrder(key));
  const [loadedKey, setLoadedKey] = useState(key);
  if (loadedKey !== key) {
    setLoadedKey(key);
    setStored(readOrder(key));
  }

  const order = useMemo(
    () => reconcileColumnOrder(stored, columns),
    [stored, columns]
  );

  const move = useCallback(
    (from: TrackColumnId, to: TrackColumnId) => {
      setStored((current) => {
        const next = moveColumn(
          reconcileColumnOrder(current, columns),
          from,
          to
        );
        writeOrder(key, next);
        return next;
      });
    },
    [key, columns]
  );

  const reset = useCallback(() => {
    setStored(() => {
      writeOrder(key, []);
      return [];
    });
  }, [key]);

  return { order, move, reset };
}

/** The stored order under one key, or an empty list when unreadable. */
function readOrder(key: string): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

/** Stores one key's order, ignoring a storage that refuses the write. */
function writeOrder(key: string, order: readonly string[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(order));
  } catch {
    return;
  }
}
