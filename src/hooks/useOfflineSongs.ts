import { useCallback, useSyncExternalStore } from "react";
import {
  getOfflineSongIdsSnapshot,
  onOfflineSongIdsChanged,
  reloadOfflineSongIds,
} from "@/lib/offline";

/**
 * The ids of songs whose audio is cached for offline use, kept current as the
 * cache changes. A Set so a row or menu can test membership per song.
 *
 * The snapshot itself lives in `lib/offline` so the Offline column's sort
 * selector can read it synchronously; this hook only subscribes to it.
 */
export function useOfflineSongs(): {
  offlineSongIds: ReadonlySet<string>;
  refresh: () => void;
} {
  const offlineSongIds = useSyncExternalStore(
    onOfflineSongIdsChanged,
    getOfflineSongIdsSnapshot,
    getOfflineSongIdsSnapshot
  );

  const refresh = useCallback(() => void reloadOfflineSongIds(), []);

  return { offlineSongIds, refresh };
}
