import { useCallback, useSyncExternalStore } from "react";
import { toggleFavorite } from "@/core/playlists";
import { getPlaylistStore } from "@/core/ports";
import { wmmBus } from "@/events";
import { FAVORITES_PLAYLIST_ID, type Playlist } from "@/models";

let favoriteIds: ReadonlySet<string> = new Set();
let started = false;
const listeners = new Set<() => void>();

function publish(playlist: Playlist | undefined) {
  favoriteIds = new Set(playlist?.songs.map((e) => e.songId));
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
  return favoriteIds;
}

/** Live set of favorited song ids, shared by every consumer. */
export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, getSnapshot);

  const isFavorite = useCallback((songId: string) => ids.has(songId), [ids]);

  return { favoriteIds: ids, isFavorite, toggleFavorite };
}
