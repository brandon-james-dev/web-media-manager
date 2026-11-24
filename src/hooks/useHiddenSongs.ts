import { useCallback, useSyncExternalStore } from "react";
import {
  getHiddenSongIdsSnapshot,
  onHiddenSongIdsChanged,
  reloadHiddenSongIds,
} from "@/lib/hidden";

/**
 * The ids of songs hidden from the library, kept current as the hidden set
 * changes. A Set so a row or menu can test membership per song.
 *
 * The snapshot itself lives in `lib/hidden` so the song provider can compose
 * it into its query filter; this hook only subscribes to it.
 */
export function useHiddenSongs(): {
  hiddenSongIds: ReadonlySet<string>;
  refresh: () => void;
} {
  const hiddenSongIds = useSyncExternalStore(
    onHiddenSongIdsChanged,
    getHiddenSongIdsSnapshot,
    getHiddenSongIdsSnapshot
  );

  const refresh = useCallback(() => void reloadHiddenSongIds(), []);

  return { hiddenSongIds, refresh };
}
