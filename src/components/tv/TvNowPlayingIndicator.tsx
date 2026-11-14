import { AlbumArtImage } from "@/components/album-art-image";
import { ThumbnailSize } from "@/lib";
import { usePlayback } from "@/hooks";
import { wmmBus } from "@/events";
import { cn } from "cn";

/**
 * Now-playing readout for the television top bar.
 *
 * A TV has no persistent player bar, so the current track stays visible here:
 * artwork, title and artist, plus an indicator that shows whether it is
 * playing. The whole block is a focus stop that opens the now-playing view,
 * which is where the transport controls and scrubber live.
 */
export function TvNowPlayingIndicator() {
  const { nowPlaying, isPlaying } = usePlayback();

  if (!nowPlaying) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="Open now playing"
      onClick={() => wmmBus.invoke("wmm.ui.openNowPlaying")}
      className="flex w-md shrink-0 cursor-default items-center gap-3 rounded-full px-3 py-1 text-left outline-none hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="size-8 shrink-0 overflow-hidden rounded-md bg-muted">
        <AlbumArtImage
          songId={nowPlaying.id}
          thumbSize={ThumbnailSize.thumb64}
          className="size-full object-cover"
          fallback={<span className="block size-full bg-muted" />}
        />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          {nowPlaying.title}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {nowPlaying.artist}
        </span>
      </span>

      {/* Three bars that bounce only while playing, so the bar reads as
          "playing" or "paused" at a glance from across a room. */}
      <span
        aria-hidden="true"
        data-playing={isPlaying}
        className="flex h-4 shrink-0 items-end gap-0.5"
      >
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={cn(
              "w-1 rounded-sm bg-primary",
              isPlaying ? "tv-bar" : "opacity-40"
            )}
            style={{
              height: `${[60, 100, 45][index]}%`,
              animationDelay: `${index * 150}ms`,
              animationDuration: `${700 + index * 180}ms`,
            }}
          />
        ))}
      </span>
    </button>
  );
}
