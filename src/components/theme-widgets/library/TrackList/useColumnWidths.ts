import { useCallback, useMemo, useState } from "react";
import {
  useThemeLayoutSnapshot,
  useThemeRender,
} from "@/lib/themes/render/browser";
import { clampWidth, TRACK_COLUMN_DEFS } from "./trackColumns";
import type { TrackColumnId } from "./trackColumns";

/**
 * What a table gets from {@link useColumnWidths}: the width of every column,
 * the setter a drag calls, and the reset a double click calls.
 *
 * @example
 * ```xml
 * <TrackList variant="table" resizeColumns="true" />
 * ```
 * @example
 * ```ts
 * const { widths, setWidth, reset } = useColumnWidths("table", columns);
 * ```
 */
export interface ColumnWidthsHandle {
  /** The width of every column, in pixels. */
  readonly widths: Record<TrackColumnId, number>;
  /** Sets one column's width, clamped to the draggable range. */
  readonly setWidth: (column: TrackColumnId, width: number) => void;
  /** Returns one column to its default width. */
  readonly reset: (column: TrackColumnId) => void;
}

/**
 * The widths of a themed table's columns, kept per theme, page and variant so
 * two tables never share one set. A malformed stored record is ignored.
 *
 * @example
 * ```xml
 * <TrackList variant="albums" resizeColumns="true" />
 * ```
 * @example
 * ```ts
 * const { widths } = useColumnWidths("albums", ["track", "title"]);
 * widths.title; // 240
 * ```
 */
export function useColumnWidths(
  storageKey: string,
  columns: readonly TrackColumnId[]
): ColumnWidthsHandle {
  const { ir } = useThemeRender();
  const { currentPage } = useThemeLayoutSnapshot();
  const key = `wmm.themeTrackList.${ir.themeId ?? "theme"}.${currentPage}.${storageKey}`;

  const [overrides, setOverrides] = useState<Record<string, number>>(() =>
    readWidths(key)
  );
  const [loadedKey, setLoadedKey] = useState(key);
  if (loadedKey !== key) {
    setLoadedKey(key);
    setOverrides(readWidths(key));
  }

  const widths = useMemo(() => {
    const resolved = {} as Record<TrackColumnId, number>;
    for (const column of columns) {
      const stored = overrides[column];
      resolved[column] =
        typeof stored === "number"
          ? clampWidth(stored)
          : TRACK_COLUMN_DEFS[column].width;
    }
    return resolved;
  }, [columns, overrides]);

  const setWidth = useCallback(
    (column: TrackColumnId, width: number) => {
      setOverrides((current) => {
        const next = { ...current, [column]: clampWidth(width) };
        writeWidths(key, next);
        return next;
      });
    },
    [key]
  );

  const reset = useCallback(
    (column: TrackColumnId) => {
      setOverrides((current) => {
        const next = { ...current };
        delete next[column];
        writeWidths(key, next);
        return next;
      });
    },
    [key]
  );

  return { widths, setWidth, reset };
}

/** The stored widths under one key, or an empty record when unreadable. */
function readWidths(key: string): Record<string, number> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return {};
    const widths: Record<string, number> = {};
    for (const [column, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        widths[column] = value;
      }
    }
    return widths;
  } catch {
    return {};
  }
}

/** Stores one key's widths, ignoring a storage that refuses the write. */
function writeWidths(key: string, widths: Record<string, number>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(widths));
  } catch {
    return;
  }
}
