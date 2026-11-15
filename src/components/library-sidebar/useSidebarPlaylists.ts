import { useEffect, useState } from "react";
import { getPlaylistStore } from "@/core/ports";
import { wmmBus } from "@/events";
import type { Playlist } from "@/models";

/** Favorites first, then alphabetical — the order the playlists page uses. */
function sortByName(list: Playlist[]): Playlist[] {
  return [...list].sort(
    (a, b) =>
      Number(Boolean(b.isFavorites)) - Number(Boolean(a.isFavorites)) ||
      a.name.localeCompare(b.name)
  );
}

/**
 * The playlist list for the sidebar.
 *
 * The playlists page reads the store directly in an effect; this is the same
 * subscription, kept local so the sidebar stays in step with edits made
 * anywhere else without the page having to publish them.
 */
export function useSidebarPlaylists(): Playlist[] {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    let cancelled = false;

    const store = (() => {
      try {
        return getPlaylistStore();
      } catch {
        // No playlist store registered for this binding.
        return null;
      }
    })();
    if (!store) return;

    store.getAll().then((next) => {
      if (!cancelled) setPlaylists(sortByName(next));
    });

    const offAdded = store.onAdded((playlist) =>
      setPlaylists((prev) =>
        prev.some((p) => p.id === playlist.id)
          ? prev
          : sortByName([...prev, playlist])
      )
    );
    const offUpdated = store.onUpdated((playlist) =>
      setPlaylists((prev) =>
        sortByName(prev.map((p) => (p.id === playlist.id ? playlist : p)))
      )
    );
    const offDeleted = store.onDeleted((playlist) =>
      setPlaylists((prev) => prev.filter((p) => p.id !== playlist.id))
    );
    const offCleared = store.onStoreCleared(() => setPlaylists([]));
    // A bulk import writes playlists from a worker, which store listeners on
    // this thread never see; the import event says to reload.
    const offImported = wmmBus.on("wmm.playlists.imported", () => {
      store.getAll().then((next) => {
        if (!cancelled) setPlaylists(sortByName(next));
      });
    });

    return () => {
      cancelled = true;
      offAdded();
      offUpdated();
      offDeleted();
      offCleared();
      offImported();
    };
  }, []);

  return playlists;
}
