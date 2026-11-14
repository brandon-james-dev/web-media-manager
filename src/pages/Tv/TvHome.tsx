import { useNavigate } from "react-router";
import { TvCard } from "@/components/tv/TvCard";
import { TvMosaicCard } from "@/components/tv/TvMosaicCard";
import { TvNowPlaying } from "@/components/tv/TvNowPlaying";
import { TvSection } from "@/components/tv/TvSection";
import { useTvCollections } from "./useTvCollections";
import { FAVORITES_PLAYLIST_ID } from "@/models";

/**
 * Television home.
 *
 * There is no persistent navigation on a TV: the home screen is the map. Each
 * kind of collection gets one row of tiles and a More link into a browsing
 * view, so the remote never has to scroll through a long grid to reach a
 * section. Ordering is alphabetical until something has been played, then by
 * most recent play.
 */
export function TvHome() {
  const navigate = useNavigate();
  const { songs, albums, artists, playlists, mosaicSongIds } =
    useTvCollections();

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-6 pb-8">
        <h1 className="mb-4 text-2xl font-bold">Home</h1>

        <TvSection
          title="Library"
          moreLabel="All songs"
          onMore={() => navigate("/tv/songs")}
          showMore={false}
          items={[
            <TvMosaicCard
              key="all-songs"
              title="All songs"
              subtitle={`${songs.length} songs`}
              songIds={mosaicSongIds}
              onSelect={() => navigate("/tv/songs")}
            />,
          ]}
        />

        {playlists.length > 0 && (
          <TvSection
            title="Playlists"
            moreLabel="More"
            onMore={() => navigate("/tv/browse/playlists")}
            rows={2}
            tileSpan={2}
            items={playlists.map((playlist) => (
              <TvCard
                key={playlist.id}
                wide
                icon={
                  playlist.id === FAVORITES_PLAYLIST_ID
                    ? "favorites"
                    : "playlist"
                }
                title={playlist.name}
                subtitle={`${playlist.songs.length} songs`}
                onSelect={() =>
                  navigate(`/tv/playlist/${encodeURIComponent(playlist.id)}`)
                }
              />
            ))}
          />
        )}

        {albums.length > 0 && (
          <TvSection
            title="Albums"
            moreLabel="More"
            onMore={() => navigate("/tv/browse/albums")}
            items={albums.map((album) => (
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
          />
        )}

        {artists.length > 0 && (
          <TvSection
            title="Artists"
            moreLabel="More"
            onMore={() => navigate("/tv/browse/artists")}
            items={artists.map((artist) => (
              <TvCard
                key={artist.id}
                title={artist.name}
                subtitle={`${artist.songIds.length} songs`}
                songId={artist.songId}
                onSelect={() =>
                  navigate(`/tv/artist/${encodeURIComponent(artist.id)}`)
                }
              />
            ))}
          />
        )}
      </div>
      <div className="shrink-0 px-6 pb-4 empty:hidden">
        <TvNowPlaying />
      </div>
    </div>
  );
}
