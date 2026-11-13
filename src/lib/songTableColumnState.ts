import { safeStorageGet, safeStorageSet } from "@/lib/safeStorage";

const STORAGE_KEY = "wmm.songTable.columns";

/** Column layout the song table restores on startup. */
export interface SongTableColumnState {
  order?: string[];
  visibility?: Record<string, boolean>;
  sizing?: Record<string, number>;
}

/** Read the saved column layout, or an empty state when none is stored. */
export function loadSongTableColumns(): SongTableColumnState {
  const raw = safeStorageGet(STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as SongTableColumnState;
    return {
      order: Array.isArray(parsed.order) ? parsed.order : undefined,
      visibility:
        parsed.visibility && typeof parsed.visibility === "object"
          ? parsed.visibility
          : undefined,
      sizing:
        parsed.sizing && typeof parsed.sizing === "object"
          ? parsed.sizing
          : undefined,
    };
  } catch {
    return {};
  }
}

/** Persist the column layout so the next startup restores it. */
export function saveSongTableColumns(state: SongTableColumnState): void {
  safeStorageSet(STORAGE_KEY, JSON.stringify(state));
}
