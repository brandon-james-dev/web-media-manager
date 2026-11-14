import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { TvPlaylistView } from "@/components/tv/TvPlaylistView";
import { getPlaylistStore } from "@/core/ports";
import { getStore } from "@/core/system";
import { wmmBus } from "@/events";
import { useSongs } from "@/hooks";
import type { Song } from "@/models";

function albumKey(song: Song): string {
  return `${song.album || "Unknown Album"}-${song.artist || "Unknown Artist"}`;
}

/**
 * One television collection: the whole library, an album, an artist or a
 * playlist, all rendered as a track list with a header.
 *
 * The route decides which collection is shown, so a single view covers every
 * case and Back always returns to the home grid.
 */
export function TvDetail() {
  const { albumId, artistId, playlistId } = useParams();
  const { filteredSongs } = useSongs();
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);
  const [playlistName, setPlaylistName] = useState<string>();
  const [nowPlayingSongId, setNowPlayingSongId] = useState<string>();

  useEffect(
    () =>
      wmmBus.on("wmm.playback.started", (payload) =>
        setNowPlayingSongId(payload?.songId)
      ),
    []
  );

  // A playlist stores ids, so its rows are resolved through the song store.
  useEffect(() => {
    if (!playlistId) return;
    let cancelled = false;

    const load = async () => {
      const store = (() => {
        try {
          return getPlaylistStore();
        } catch {
          return null;
        }
      })();
      if (!store) return;
      const playlist = await store.get(playlistId);
      if (!playlist || cancelled) return;
      setPlaylistName(playlist.name);
      const songs = await Promise.all(
        playlist.songs.map((entry) => getStore().get(entry.songId))
      );
      if (!cancelled) {
        setPlaylistSongs(songs.filter((song): song is Song => Boolean(song)));
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [playlistId]);

  const view = useMemo(() => {
    if (playlistId) {
      return {
        title: playlistName ?? "Playlist",
        subtitle: "Playlist",
        songs: playlistSongs,
      };
    }
    if (albumId) {
      const songs = filteredSongs.filter((song) => albumKey(song) === albumId);
      return {
        title: songs[0]?.album || "Unknown Album",
        subtitle: songs[0]?.artist || "Album",
        songs,
      };
    }
    if (artistId) {
      const songs = filteredSongs.filter(
        (song) => (song.artist || "Unknown Artist") === artistId
      );
      return { title: artistId, subtitle: "Artist", songs };
    }
    return { title: "All songs", subtitle: "Library", songs: filteredSongs };
  }, [albumId, artistId, playlistId, filteredSongs, playlistName, playlistSongs]);

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        <TvPlaylistView
          title={view.title}
          subtitle={view.subtitle}
          songs={view.songs}
          nowPlayingSongId={nowPlayingSongId}
        />
      </div>
    </div>
  );
}
