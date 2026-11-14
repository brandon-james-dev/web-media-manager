import { AlbumArtImage } from "@/components/album-art-image";
import { TvTrackList } from "@/components/tv/TvTrackList";
import { ThumbnailSize } from "@/lib";
import { Play } from "lucide-react";
import { wmmBus } from "@/events";
import type { Song } from "@/models";

export interface TvPlaylistViewProps {
  title: string;
  subtitle?: string;
  songs: Song[];
  /** Song whose artwork heads the view. */
  songId?: string;
  nowPlayingSongId?: string;
}

/**
 * A television detail view: one large header and the tracks below it.
 *
 * Albums, artists, playlists and the whole library all render through this, so
 * every collection reads the same way — a cover, a title, a count, and a list
 * of rows the remote can walk.
 */
export function TvPlaylistView({
  title,
  subtitle,
  songs,
  songId,
  nowPlayingSongId,
}: TvPlaylistViewProps) {
  const total = songs.reduce((sum, song) => sum + (song.duration ?? 0), 0);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col">
      <header className="flex shrink-0 items-end gap-6 px-6 pt-6 pb-4">
        <div className="size-40 shrink-0 overflow-hidden rounded-xl bg-muted shadow-xl">
          <AlbumArtImage
            songId={songId ?? songs[0]?.id}
            thumbSize={ThumbnailSize.thumb256}
            className="size-full object-cover"
            fallback={<div className="size-full bg-muted" />}
          />
        </div>
        <div className="min-w-0 pb-1">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {subtitle}
          </p>
          <h1 className="truncate text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {songs.length} {songs.length === 1 ? "song" : "songs"}
            {total > 0 && ` · ${Math.round(total / 60)} min`}
          </p>
          <button
            type="button"
            onClick={() =>
              wmmBus.invoke("wmm.playback.playCollection", {
                songIds: songs.map((song) => song.id),
              })
            }
            className="mt-3 inline-flex cursor-default items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Play className="size-4 fill-current" />
            Play
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <TvTrackList
          songs={songs}
          nowPlayingSongId={nowPlayingSongId}
          onPlay={(song) =>
            wmmBus.invoke("wmm.playback.playSong", { songId: song.id })
          }
        />
      </div>
    </div>
  );
}
