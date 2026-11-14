import { AlbumArtImage } from "@/components/album-art-image";
import { ThumbnailSize } from "@/lib";
import { cn } from "cn";
import { Music } from "lucide-react";

export interface TvMosaicCardProps {
  title: string;
  subtitle?: string;
  /** One song per album, in display order. */
  songIds: string[];
  onSelect: () => void;
}

/** 5 columns of 64 px tiles inside a 320 px card. */
const COLUMNS = 5;
const TILES = COLUMNS * 2;

/**
 * The "All songs" tile: a mosaic of album art.
 *
 * The smallest stored thumbnail is 64 px, so a 320 px card holds ten of them
 * at their native size — as much cover art as fits without upscaling.
 */
export function TvMosaicCard({
  title,
  subtitle,
  songIds,
  onSelect,
}: TvMosaicCardProps) {
  const tiles = songIds.slice(0, TILES);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "tv-focus-inset group col-span-2 flex w-full cursor-default flex-col gap-2 rounded-xl p-2 text-left outline-none transition-colors",
        "hover:bg-accent/10 focus-visible:bg-accent/15"
      )}
    >
      {tiles.length === 0 ? (
        // An empty library has no artwork to mosaic, so the tile carries the
        // same accent panel the desktop empty state uses instead of a grid of
        // grey placeholders.
        <div className="relative flex aspect-[5/2] items-center justify-center overflow-hidden rounded-lg bg-accent text-accent-foreground shadow-lg">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgb(255_255_255/0.28),transparent_55%),radial-gradient(circle_at_90%_100%,rgb(0_0_0/0.25),transparent_50%)]"
          />
          <Music className="size-10 opacity-70" />
        </div>
      ) : (
        <div
          className="grid overflow-hidden rounded-lg bg-muted shadow-lg"
          style={{ gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: TILES }, (_, index) => {
            const songId = tiles[index];
            return (
              <div key={songId ?? `empty-${index}`} className="aspect-square">
                {songId ? (
                  <AlbumArtImage
                    songId={songId}
                    thumbSize={ThumbnailSize.thumb64}
                    className="size-full object-cover"
                    fallback={<div className="size-full bg-muted" />}
                  />
                ) : (
                  <div className="size-full bg-muted" />
                )}
              </div>
            );
          })}
        </div>
      )}
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
