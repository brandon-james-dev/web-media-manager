import { AlbumArtImage } from "@/components/album-art-image";
import { ThumbnailSize } from "@/lib";
import { cn } from "cn";

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
        "col-span-2 flex w-full cursor-default flex-col gap-2 rounded-xl p-2 text-left outline-none transition-colors",
        "hover:bg-accent/10 focus-visible:bg-accent/15 focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
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
      <div className="min-w-0 px-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </button>
  );
}
