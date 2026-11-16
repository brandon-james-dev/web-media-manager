import { Disc3, MicVocal, Plus, Search, Tag, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrackItem } from "@/components/track-item";
import { useTranslation } from "@/i18n";
import { cn } from "cn";
import type { Song } from "@/models";

export interface SongSearchArtist {
  name: string;
  trackCount: number;
}

export interface SongSearchAlbum {
  key: string;
  album: string;
  artist?: string;
  trackCount: number;
}

export interface SongSearchGenre {
  name: string;
  trackCount: number;
}

interface SongSearchPanelProps {
  /** Current query text. */
  query: string;
  onQueryChange: (query: string) => void;
  /** Heading of the results panel, e.g. "Add to playlist". */
  title: string;
  /** Accessible name of the input. */
  ariaLabel: string;
  placeholder?: string;
  /** Songs matching the query, already filtered and capped by the caller. */
  songs: Song[];
  /** Artists matching the query, as group actions. */
  artists: SongSearchArtist[];
  /** Albums matching the query, as group actions. */
  albums: SongSearchAlbum[];
  /** Genres matching the query, as group actions. */
  genres?: SongSearchGenre[];
  onAddSong: (song: Song) => void;
  onAddArtist: (artist: SongSearchArtist) => void;
  onAddAlbum: (album: SongSearchAlbum) => void;
  onAddGenre?: (genre: SongSearchGenre) => void;
  /** Badges shown before a song's add button, e.g. "On device". */
  renderSongBadges?: (song: Song) => ReactNode;
  /** Extra controls shown before a song's add button, e.g. a download toggle. */
  renderSongActions?: (song: Song) => ReactNode;
  /** Whether a song's add button is disabled. */
  isSongAddDisabled?: (song: Song) => boolean;
  /** Title for a song's add button, e.g. why it is disabled. */
  songAddTitle?: (song: Song) => string;
  /** Whether a group's add button is disabled. */
  isGroupAddDisabled?: (group: { name: string }) => boolean;
  className?: string;
}

/**
 * The "search songs to add" field and its results panel.
 *
 * Shared by the playlist editor and the sync queue so both offer the same
 * affordances: a clear button, artist and album group actions, and one row
 * per matching song. Callers own the filtering and the add behaviour; this
 * only renders, so a surface can decorate rows (a download toggle, an
 * "On device" badge) without forking the markup.
 */
export function SongSearchPanel({
  query,
  onQueryChange,
  title,
  ariaLabel,
  placeholder,
  songs,
  artists,
  albums,
  genres = [],
  onAddSong,
  onAddArtist,
  onAddAlbum,
  onAddGenre,
  renderSongBadges,
  renderSongActions,
  isSongAddDisabled,
  songAddTitle,
  isGroupAddDisabled,
  className,
}: SongSearchPanelProps) {
  const { t } = useTranslation();
  const empty =
    songs.length === 0 &&
    artists.length === 0 &&
    albums.length === 0 &&
    genres.length === 0;

  return (
    <div className={cn("shrink-0", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder ?? t("search.songsToAdd")}
          aria-label={ariaLabel}
          className="pr-8 pl-8"
        />

        {query && (
          <button
            type="button"
            className="absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent/15 hover:text-foreground"
            onClick={() => onQueryChange("")}
            title={t("search.clear")}
            aria-label={t("search.clear")}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {query.trim() && (
        <section className="mt-2 rounded-lg border border-primary/30 bg-primary/5 px-2 pb-1 pt-1.5">
          <div className="flex items-center justify-between pb-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <span>{title}</span>

            <span>
              {songs.length === 50
                ? t("search.matchCountCapped", [50])
                : t("search.matchCount", [songs.length])}
            </span>
          </div>

          <div className="max-h-40 divide-y overflow-y-auto">
            {genres.map((genre) => (
              <div
                key={`genre-${genre.name}`}
                className="flex items-center gap-1 px-1 py-1"
              >
                <Tag className="size-3.5 shrink-0 text-muted-foreground" />

                <span className="min-w-0 flex-1 truncate text-sm">
                  {genre.name}
                </span>

                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {genre.trackCount}
                </span>

                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0"
                  disabled={isGroupAddDisabled?.({ name: genre.name })}
                  title={t("search.addAllGenreTracks", [genre.name])}
                  aria-label={t("search.addAllGenreTracks", [genre.name])}
                  onClick={() => onAddGenre?.(genre)}
                >
                  <Plus />
                </Button>
              </div>
            ))}

            {artists.map((artist) => (
              <div
                key={`artist-${artist.name}`}
                className="flex items-center gap-1 px-1 py-1"
              >
                <MicVocal className="size-3.5 shrink-0 text-muted-foreground" />

                <span className="min-w-0 flex-1 truncate text-sm">
                  {artist.name}
                </span>

                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {artist.trackCount}
                </span>

                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0"
                  disabled={isGroupAddDisabled?.({ name: artist.name })}
                  title={t("search.addAllArtistTracks", [artist.name])}
                  aria-label={t("search.addAllArtistTracks", [artist.name])}
                  onClick={() => onAddArtist(artist)}
                >
                  <Plus />
                </Button>
              </div>
            ))}

            {albums.map((album) => (
              <div
                key={`album-${album.key}`}
                className="flex items-center gap-1 px-1 py-1"
              >
                <Disc3 className="size-3.5 shrink-0 text-muted-foreground" />

                <span className="min-w-0 flex-1 truncate text-sm">
                  {album.album}
                  {album.artist && (
                    <span className="text-muted-foreground">
                      {" "}
                      — {album.artist}
                    </span>
                  )}
                </span>

                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {album.trackCount}
                </span>

                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0"
                  disabled={isGroupAddDisabled?.({ name: album.album })}
                  title={t("search.addAllAlbumTracks", [album.album])}
                  aria-label={t("search.addAllAlbumTracks", [album.album])}
                  onClick={() => onAddAlbum(album)}
                >
                  <Plus />
                </Button>
              </div>
            ))}

            {songs.map((song) => (
              <div key={song.id} className="flex items-center">
                <TrackItem
                  song={song}
                  size="sm"
                  hideNumber
                  availableActions={[]}
                  trailing=""
                  className="min-w-0 flex-1"
                />

                {renderSongBadges?.(song)}

                {renderSongActions?.(song)}

                <Button
                  size="icon"
                  variant="ghost"
                  className="mr-1 shrink-0"
                  disabled={isSongAddDisabled?.(song)}
                  title={songAddTitle?.(song) ?? t("common.add")}
                  aria-label={t("search.addSong", [
                    song.title ?? song.filename,
                  ])}
                  onClick={() => onAddSong(song)}
                >
                  <Plus />
                </Button>
              </div>
            ))}

            {empty && (
              <div className="px-1 py-2 text-xs text-muted-foreground">
                {t("search.noSongs")}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
