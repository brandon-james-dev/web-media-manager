import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { TvCard } from "@/components/tv/TvCard";
import { getPlaylistStore } from "@/core/ports";
import { useSongs } from "@/hooks";
import type { Playlist, Song } from "@/models";

interface AlbumGroup {
  id: string;
  title: string;
  artist: string;
  songId: string;
}

interface ArtistGroup {
  id: string;
  name: string;
  songId: string;
  count: number;
}

function albumKey(song: Song): string {
  return `${song.album || "Unknown Album"}-${song.artist || "Unknown Artist"}`;
}

/**
 * Television home.
 *
 * There is no persistent navigation on a TV: the home screen is the map. Every
 * collection in the library — the whole song list, each album, each artist and
 * each playlist — is a tile here, and the remote walks the grid with the arrow
 * keys. Opening a tile replaces the grid with that collection's track list;
 * Back returns.
 */
export function TvHome() {
  const navigate = useNavigate();
  const { filteredSongs } = useSongs();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

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
    const sortByName = (list: Playlist[]) =>
      [...list].sort((a, b) => a.name.localeCompare(b.name));

    store.getAll().then((next) => {
      if (!cancelled) setPlaylists(sortByName(next));
    });
    const offAdded = store.onAdded((playlist) =>
      setPlaylists((prev) => sortByName([...prev, playlist]))
    );
    const offUpdated = store.onUpdated((playlist) =>
      setPlaylists((prev) =>
        sortByName(prev.map((p) => (p.id === playlist.id ? playlist : p)))
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

  const albums = useMemo(() => {
    const map = new Map<string, AlbumGroup>();
    for (const song of filteredSongs) {
      const key = albumKey(song);
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          title: song.album || "Unknown Album",
          artist: song.artist || "Unknown Artist",
          songId: song.id,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.title.localeCompare(b.title)
    );
  }, [filteredSongs]);

  const artists = useMemo(() => {
    const map = new Map<string, ArtistGroup>();
    for (const song of filteredSongs) {
      const name = song.artist || "Unknown Artist";
      const existing = map.get(name);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(name, { id: name, name, songId: song.id, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [filteredSongs]);

  return (
    <div className="h-full overflow-y-auto px-6 pt-6 pb-8">
      <h1 className="mb-4 text-2xl font-bold">Home</h1>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold tracking-widest text-muted-foreground uppercase">
          Library
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <TvCard
            wide
            title="All songs"
            subtitle={`${filteredSongs.length} songs`}
            songId={filteredSongs[0]?.id}
            onSelect={() => navigate("/tv/songs")}
          />
        </div>
      </section>

      {playlists.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-semibold tracking-widest text-muted-foreground uppercase">
            Playlists
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {playlists.map((playlist) => (
              <TvCard
                key={playlist.id}
                wide
                title={playlist.name}
                subtitle={`${playlist.songs.length} songs`}
                onSelect={() =>
                  navigate(`/tv/playlist/${encodeURIComponent(playlist.id)}`)
                }
              />
            ))}
          </div>
        </section>
      )}

      {albums.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-semibold tracking-widest text-muted-foreground uppercase">
            Albums
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {albums.map((album) => (
              <TvCard
                key={album.id}
                title={album.title}
                subtitle={album.artist}
                songId={album.songId}
                onSelect={() =>
                  navigate(`/tv/album/${encodeURIComponent(album.id)}`)
                }
              />
            ))}
          </div>
        </section>
      )}

      {artists.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold tracking-widest text-muted-foreground uppercase">
            Artists
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {artists.map((artist) => (
              <TvCard
                key={artist.id}
                title={artist.name}
                subtitle={`${artist.count} songs`}
                songId={artist.songId}
                onSelect={() =>
                  navigate(`/tv/artist/${encodeURIComponent(artist.id)}`)
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
