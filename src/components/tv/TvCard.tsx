import { AlbumArtImage } from "@/components/album-art-image";
import { ThumbnailSize } from "@/lib";
import { cn } from "cn";
import type { ReactNode } from "react";

export interface TvCardProps {
  title: string;
  subtitle?: string;
  /** Song whose artwork represents the card. */
  songId?: string;
  /** Custom artwork instead of the song lookup. */
  artwork?: ReactNode;
  /** Playlists use a double-width rectangle; albums and artists are square. */
  wide?: boolean;
  onSelect: () => void;
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
  onSelect,
}: TvCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group/card flex cursor-default flex-col gap-2 rounded-xl p-2 text-left outline-none transition-colors",
        "hover:bg-accent/10 focus-visible:bg-accent/15 focus-visible:ring-2 focus-visible:ring-ring",
        wide ? "col-span-2" : "col-span-1"
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-lg bg-muted shadow-lg",
          wide ? "aspect-2/1" : "aspect-square"
        )}
      >
        {artwork ?? (
          <AlbumArtImage
            songId={songId}
            thumbSize={ThumbnailSize.thumb256}
            className="size-full object-cover"
            fallback={<div className="size-full bg-muted" />}
          />
        )}
      </div>
      <div className="min-w-0 px-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </button>
  );
}
