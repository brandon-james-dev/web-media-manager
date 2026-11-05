import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlbumArtImage } from "@/components/album-art-image";
import { SongContextMenu } from "@/components/song-context-menu";
import { ThumbnailSize } from "@/lib";
import { MoreHorizontal, Pause, Play } from "lucide-react";
import { cn } from "cn";
import { formatLength } from "@/lib/formatLength";
import type { TrackItemProps } from "./TrackItemProps";

/**
 * TrackItem — one song as a compact row, built on the shadcn Item
 * primitives (Item / ItemMedia / ItemContent / ItemTitle /
 * ItemDescription / ItemActions).
 *
 * Presentational and context-free: callers pass the callbacks (play, edit,
 * shuffle, extra actions), so the row works anywhere tracks are browsed —
 * artist and album detail, playlists, search results, or the tight mobile
 * lists where the TanStack table doesn't fit.
 *
 * Activation is single-tap when the row is interactive (mobile-friendly) and
 * double-click otherwise, so the same component works on desktop and touch.
 */
export function TrackItem(props: TrackItemProps) {
  const {
    song,
    index,
    isPlaying = false,
    showArtwork = false,
    showMeta = true,
    onPlay,
    onDoubleClick,
    onClick,
    actions,
    size = "default",
    className,
  } = props;

  const trackNumber = song.track ?? index ?? undefined;
  const meta = [song.artist, song.album].filter(Boolean).join(" — ");

  // The ⋯ menu is opt-in via `actions` only. Play/shuffle/edit callbacks are
  // not mirrored into it automatically — they already have their own surfaces
  // (row double-click, the inline play button, the shared right-click song
  // context menu), so the menu would just duplicate them on hosts that don't
  // pass extra items (e.g. a plain list).
  const overflow = (actions ?? []).map((a, i) => ({
    key: `${a.label}-${i}`,
    label: a.label,
    onSelect: a.onSelect,
    destructive: a.destructive,
  })) as Array<{
    key: string;
    label: string;
    onSelect: (s: typeof song) => void;
    destructive?: boolean;
  }>;

  function activate() {
    if (onPlay) onPlay(song);
  }

  return (
    <SongContextMenu songs={[song]}>
      <Item
        size={size}
        className={cn(
          // Item is flex-wrap by default; a track row stays on one line and
          // lets ItemContent truncate instead.
          "group/track flex-nowrap cursor-default py-0 pr-0 transition-colors",
          // Touch devices: taller row so a finger can hit it comfortably.
          "pointer-coarse:py-0.5",
          "pointer-coarse:pr-3",
          // Hover styling follows interactivity, not just playback: in edit
          // mode the row activates via click/double-click, so it gets the
          // same hover affordance as in playback mode.
          (onPlay || onClick || onDoubleClick) && "hover:bg-accent/10",
          isPlaying && "bg-accent/10",
          className,
        )}
        onClick={onClick ? () => onClick(song) : undefined}
        // The row itself never takes the pointer cursor: activation is a
        // deliberate double-click (play in playback mode, editor in edit
        // mode). Right-click opens the shared song context menu.
        onDoubleClick={onDoubleClick ? () => onDoubleClick(song) : onPlay ? activate : undefined}
      >
        {/* Track number — or artwork when browsing without a table context */}
        {showArtwork ? (
          <ItemMedia variant="image" className="rounded-md">
            <AlbumArtImage
              songId={song.id}
              thumbSize={ThumbnailSize.thumb128}
              fallback={<div className="w-full h-full bg-muted" />}
            />
          </ItemMedia>
        ) : (
          trackNumber != null && (
            <span className="w-4 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
              {trackNumber}
            </span>
          )
        )}

        {/* min-w-0 is what lets the flex child shrink below content width;
            the primitives' own line-clamp is defeated by their `flex`/`w-fit`
            base classes, so each needs an explicit nowrap+ellipsis override. */}
        <ItemContent className="min-w-0 overflow-hidden gap-0">
          <ItemTitle className={cn("block! w-full min-w-0 truncate", isPlaying && "text-accent")}>
            {song.title ?? song.filename}
          </ItemTitle>
          {showMeta && meta && (
            <ItemDescription className="block! w-full min-w-0 truncate">{meta}</ItemDescription>
          )}
        </ItemContent>

        <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
          {formatLength(song.length)}
        </span>

        <ItemActions className="shrink-0">
          {/* Play/pause affordance: always visible for the active row and on
            touch (no hover to reveal it), hover-revealed otherwise. The row
            itself isn't clickable, so single-tap play on mobile uses this. */}
          {onPlay ? (
            <button
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-md transition-opacity",
                "hover:bg-accent/15 hover:text-foreground",
                "opacity-0 group-hover/track:opacity-100 [@media(hover:none)]:opacity-100",
                isPlaying && "opacity-100",
              )}
              onClick={(e) => {
                e.stopPropagation();
                activate();
              }}
              title={isPlaying ? "Now playing" : "Play"}
              aria-label={isPlaying ? "Now playing" : "Play"}
            >
              {isPlaying ? (
                <Pause size={14} className="fill-current" />
              ) : (
                <Play size={14} className="fill-current" />
              )}
            </button>
          ) : (
            // Reserve the action slot so the row's width and text layout stay
            // identical in edit mode (where the play affordance is dropped).
            // No hover affordance to align on touch, so it is dropped there.
            <span className="h-7 w-7 shrink-0 pointer-coarse:hidden" aria-hidden="true" />
          )}

          {overflow.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-md transition-opacity",
                  "hover:bg-accent/15 hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "opacity-0 group-hover/track:opacity-100 data-[state=open]:opacity-100",
                )}
                onClick={(e) => e.stopPropagation()}
                title="More actions"
                aria-label="More actions"
              >
                <MoreHorizontal size={16} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {overflow.map((item, i) => (
                  <div key={item.key}>
                    {i > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      className={cn(item.destructive && "text-destructive")}
                      onSelect={() => item.onSelect(song)}
                    >
                      {item.label}
                    </DropdownMenuItem>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </ItemActions>
      </Item>
    </SongContextMenu>
  );
}
