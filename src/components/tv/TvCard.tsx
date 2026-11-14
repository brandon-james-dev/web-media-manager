import { AlbumArtImage } from "@/components/album-art-image";
import { ThumbnailSize } from "@/lib";
import { cn } from "cn";
import { Heart, ListMusic } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

export interface TvCardProps {
  title: string;
  subtitle?: string;
  /** Song whose artwork represents the card. */
  songId?: string;
  /** Custom artwork instead of the song lookup. */
  artwork?: ReactNode;
  /**
   * Double-width tile with the title beside the art, so a long playlist name
   * has room to wrap instead of being clipped to a square.
   */
  wide?: boolean;
  /** Glyph shown when the card has no cover art of its own. */
  icon?: "playlist" | "favorites";
  onSelect: () => void;
}

/** Stable hue per title, so a playlist keeps its colour across reloads. */
function hueFor(title: string): number {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) % 360;
  }
  return hash;
}

/**
 * One tile in a television grid.
 *
 * A TV has no pointer, so the tile itself is the focus stop: the remote walks
 * the grid with the arrow keys and Enter opens the tile. The focus ring is the
 * only affordance, which is why it is drawn outside the artwork.
 */
export function TvCard({
  title,
  subtitle,
  songId,
  artwork,
  wide = false,
  icon = "playlist",
  onSelect,
}: TvCardProps) {
  const art =
    artwork ??
    (songId ? (
      <AlbumArtImage
        songId={songId}
        thumbSize={ThumbnailSize.thumb256}
        className="size-full object-cover"
        fallback={<div className="size-full bg-muted" />}
      />
    ) : (
      // A playlist has no cover of its own, so it carries a glyph instead.
      <div className="flex size-full items-center justify-center bg-black/25">
        {icon === "favorites" ? (
          <Heart className="size-7 fill-current text-white/85" />
        ) : (
          <ListMusic className="size-7 text-white/80" />
        )}
      </div>
    ));

  if (wide) {
    // Favorites is a fixed concept, not an arbitrary name, so it gets a fixed
    // red instead of whatever the name hashes to — "Favorites" hashed to 47,
    // which is yellow and read as a warning rather than a heart.
    const hue = icon === "favorites" ? 0 : hueFor(title);
    return (
      <button
        type="button"
        onClick={onSelect}
        style={{ "--tile-hue": hue } as CSSProperties}
        className={cn(
          "tv-tile group col-span-2 flex w-full cursor-default items-center gap-3 rounded-xl border border-white/10 p-2 text-left outline-none transition-colors",
          "hover:brightness-110 focus-visible:text-black"
        )}
      >
        <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted shadow-lg">
          {art}
        </div>
        <div className="min-w-0 flex-1 pr-1">
          <p className="line-clamp-2 text-sm font-semibold">{title}</p>
          {subtitle && (
            <p className="truncate text-xs text-white/70 group-focus-visible:text-black">
              {subtitle}
            </p>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "tv-focus-inset group flex w-full cursor-default flex-col gap-2 rounded-xl p-2 text-left outline-none transition-colors",
        "hover:bg-accent/10 focus-visible:bg-accent/15"
      )}
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted shadow-lg">
        {art}
      </div>
      <div className="min-w-0 px-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground group-focus-visible:text-foreground">
            {subtitle}
          </p>
        )}
      </div>
    </button>
  );
}
