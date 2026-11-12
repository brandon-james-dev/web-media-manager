import { useCallback, useSyncExternalStore } from "react";
import { toggleFavorite } from "@/core/playlists";
import { getPlaylistStore } from "@/core/ports";
import { wmmBus } from "@/events";
import {
  FAVORITES_PLAYLIST_ID,
  type FavoriteOrigin,
  type Playlist,
} from "@/models";
import { hasLocalFavorite } from "@/core/playlists/favoriteOrigin";

let favoriteOrigins: ReadonlyMap<string, FavoriteOrigin> = new Map();
let started = false;
const listeners = new Set<() => void>();

function publish(playlist: Playlist | undefined) {
  favoriteOrigins = new Map(
    playlist?.songs.map((e) => [e.songId, e.origin ?? "local"])
  );
  for (const listener of listeners) listener();
}

function start() {
  if (started) return;
  started = true;

  const store = getPlaylistStore();
  const reload = () => {
    void store.get(FAVORITES_PLAYLIST_ID).then((p) => publish(p ?? undefined));
  };

  reload();
  store.onAdded((playlist) => {
    if (playlist.id === FAVORITES_PLAYLIST_ID) publish(playlist);
  });
  store.onUpdated((playlist) => {
    if (playlist.id === FAVORITES_PLAYLIST_ID) publish(playlist);
  });
  store.onDeleted((playlist) => {
    if (playlist.id === FAVORITES_PLAYLIST_ID) publish(undefined);
  });
  store.onStoreCleared(() => publish(undefined));
  wmmBus.on("wmm.playlists.imported", reload);
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return favoriteOrigins;
}

/**
 * Live favorites shared by every consumer. `isFavorite` is true for a local
 * favorite (what toggling removes); `originOf` also reports server-only ones.
 */
export function useFavorites() {
  const origins = useSyncExternalStore(subscribe, getSnapshot);

  const isFavorite = useCallback(
    (songId: string) => {
      const origin = origins.get(songId);
      return origin !== undefined && hasLocalFavorite(origin);
    },
    [origins]
  );
  const originOf = useCallback(
    (songId: string) => origins.get(songId),
    [origins]
  );

  return { isFavorite, originOf, toggleFavorite };
}
