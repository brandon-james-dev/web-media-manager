import { useNavigate, useParams } from "react-router";
import { TvCard } from "@/components/tv/TvCard";
import { TvNowPlaying } from "@/components/tv/TvNowPlaying";
import { useTvCollections } from "./useTvCollections";
import { FAVORITES_PLAYLIST_ID } from "@/models";

const KINDS = ["albums", "artists", "playlists"] as const;
type BrowseKind = (typeof KINDS)[number];

function isBrowseKind(value: string | undefined): value is BrowseKind {
  return KINDS.includes(value as BrowseKind);
}

const TITLES: Record<BrowseKind, string> = {
  albums: "Albums",
  artists: "Artists",
  playlists: "Playlists",
};

/**
 * The browsing view behind a home section's More link.
 *
 * The home screen shows one row per collection kind; this is the full grid,
 * scrollable and walked with the remote. Ordering matches the home row, so the
 * first tile here is the first tile there.
 */
export function TvBrowse() {
  const navigate = useNavigate();
  const { kind } = useParams();
  const { albums, artists, playlists } = useTvCollections();

  if (!isBrowseKind(kind)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-lg font-semibold">Nothing to browse here</p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="cursor-default rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-6 pb-8">
        <h1 className="mb-4 text-2xl font-bold">{TITLES[kind]}</h1>

        {kind === "playlists" ? (
          <div className="grid grid-cols-8 gap-4">
            {playlists.map((playlist) => (
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
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-4">
            {kind === "albums"
              ? albums.map((album) => (
                  <TvCard
                    key={album.id}
                    title={album.title}
                    subtitle={album.artist}
                    songId={album.songId}
                    onSelect={() =>
                      navigate(`/tv/album/${encodeURIComponent(album.id)}`)
                    }
                  />
                ))
              : artists.map((artist) => (
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
          </div>
        )}
      </div>
      <div className="shrink-0 px-6 pb-4 empty:hidden">
        <TvNowPlaying />
      </div>
    </div>
  );
}
