import { useEffect, useMemo, useState } from "react";
import { getPlayHistoryStore, getPlaylistStore } from "@/core/ports";
import { wmmBus } from "@/events";
import { useSongs } from "@/hooks";
import { buildRecencyMap, orderCollections, type RecencyMap } from "@/lib/tv";
import type { Playlist, Song } from "@/models";

export interface AlbumGroup {
  id: string;
  title: string;
  artist: string;
  songId: string;
  songIds: string[];
}

export interface ArtistGroup {
  id: string;
  name: string;
  songId: string;
  songIds: string[];
}

export interface TvCollections {
  songs: Song[];
  albums: AlbumGroup[];
  artists: ArtistGroup[];
  playlists: Playlist[];
  /** One song per album, for the "All songs" mosaic. */
  mosaicSongIds: string[];
}

function albumKey(song: Song): string {
  return `${song.album || "Unknown Album"}-${song.artist || "Unknown Artist"}`;
}

/** How many history rows to read; enough to cover a large library. */
const HISTORY_LIMIT = 500;

/**
 * The television library, grouped and ordered.
 *
 * Ordering is alphabetical until something has been played, then by most
 * recent play — the home screen should surface what the household actually
 * listens to without any explicit "recent" section.
 */
export function useTvCollections(): TvCollections {
  const { filteredSongs } = useSongs();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [recency, setRecency] = useState<RecencyMap>(() => new Map());

  useEffect(() => {
    const store = (() => {
      try {
        return getPlaylistStore();
      } catch {
        return null;
      }
    })();
    if (!store) return;

    let cancelled = false;
    store.getAll().then((next) => {
      if (!cancelled) setPlaylists(next);
    });
    const offAdded = store.onAdded((playlist) =>
      setPlaylists((prev) => [...prev, playlist])
    );
    const offUpdated = store.onUpdated((playlist) =>
      setPlaylists((prev) =>
        prev.map((p) => (p.id === playlist.id ? playlist : p))
      )
    );
    const offDeleted = store.onDeleted((playlist) =>
      setPlaylists((prev) => prev.filter((p) => p.id !== playlist.id))
    );

    return () => {
      cancelled = true;
      offAdded();
      offUpdated();
      offDeleted();
    };
  }, []);

  // History is written when a track passes the scrobble threshold, so reload
  // it whenever a track starts rather than only on mount.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const store = (() => {
        try {
          return getPlayHistoryStore();
        } catch {
          return null;
        }
      })();
      if (!store) return;
      const entries = await store.recent(HISTORY_LIMIT);
      if (!cancelled) setRecency(buildRecencyMap(entries));
    };

    void load();
    const off = wmmBus.on("wmm.playback.started", () => void load());
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  const albums = useMemo(() => {
    const map = new Map<string, AlbumGroup>();
    for (const song of filteredSongs) {
      const key = albumKey(song);
      const existing = map.get(key);
      if (existing) {
        existing.songIds.push(song.id);
      } else {
        map.set(key, {
          id: key,
          title: song.album || "Unknown Album",
          artist: song.artist || "Unknown Artist",
          songId: song.id,
          songIds: [song.id],
        });
      }
    }
    return orderCollections(
      Array.from(map.values()),
      (album) => album.songIds,
      (album) => album.title,
      recency
    );
  }, [filteredSongs, recency]);

  const artists = useMemo(() => {
    const map = new Map<string, ArtistGroup>();
    for (const song of filteredSongs) {
      const name = song.artist || "Unknown Artist";
      const existing = map.get(name);
      if (existing) {
        existing.songIds.push(song.id);
      } else {
        map.set(name, { id: name, name, songId: song.id, songIds: [song.id] });
      }
    }
    return orderCollections(
      Array.from(map.values()),
      (artist) => artist.songIds,
      (artist) => artist.name,
      recency
    );
  }, [filteredSongs, recency]);

  const orderedPlaylists = useMemo(
    () =>
      orderCollections(
        playlists,
        (playlist) => playlist.songs.map((entry) => entry.songId),
        (playlist) => playlist.name,
        recency
      ),
    [playlists, recency]
  );

  const mosaicSongIds = useMemo(
    () => albums.map((album) => album.songId),
    [albums]
  );

  return {
    songs: filteredSongs,
    albums,
    artists,
    playlists: orderedPlaylists,
    mosaicSongIds,
  };
}
