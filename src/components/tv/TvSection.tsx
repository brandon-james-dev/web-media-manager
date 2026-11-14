import { ChevronRight } from "lucide-react";
import { cn } from "cn";
import type { ReactNode } from "react";

export interface TvSectionProps {
  title: string;
  /** Label for the link or tile that opens the full browsing view. */
  moreLabel: string;
  onMore: () => void;
  items: ReactNode[];
  /** Grid columns; the row is laid out on a fixed track so tiles align. */
  columns?: number;
  /** Rows shown before the section overflows into a More tile. */
  rows?: number;
  /** Columns each tile occupies (playlists are double width). */
  tileSpan?: number;
  /** Hide the More affordance entirely (a section with a single tile). */
  showMore?: boolean;
}

const DEFAULT_COLUMNS = 8;

/**
 * One section of the television home.
 *
 * Tiles sit on a fixed grid so rows line up across sections. A section shows
 * at most `rows` rows of tiles; past that the last cell becomes a More tile
 * carrying the number of hidden items. A section that fits entirely shows no
 * More affordance at all, so the tile only ever appears where there is
 * something behind it.
 */
export function TvSection({
  title,
  moreLabel,
  onMore,
  items,
  columns = DEFAULT_COLUMNS,
  rows = 1,
  tileSpan = 1,
  showMore = true,
}: TvSectionProps) {
  const perRow = Math.max(1, Math.floor(columns / tileSpan));
  const limit = perRow * rows;
  const overflows = showMore && items.length > limit;
  // The More tile takes the last cell of the last row, so it never wraps onto
  // a line of its own.
  const shown = overflows ? items.slice(0, limit - 1) : items;
  const remaining = items.length - shown.length;

  return (
    <section className="mb-8">
      <div className="mb-2 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
          {title}
        </h2>
      </div>
      <div
        className="grid gap-4 overflow-hidden"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {shown}
        {overflows && (
          <button
            type="button"
            onClick={onMore}
            style={{ gridColumn: `span ${tileSpan}` }}
            className={cn(
              "flex cursor-default items-center justify-center gap-2 rounded-xl bg-accent/10 text-sm font-semibold outline-none transition-colors",
              "hover:bg-accent/20 focus-visible:bg-accent/20 focus-visible:ring-2 focus-visible:ring-ring",
              // A double-width tile matches the height of the cards beside it
              // instead of stretching to a 2:1 box.
              tileSpan > 1
                ? "h-full min-h-16 flex-row px-4"
                : "aspect-square flex-col p-2"
            )}
          >
            <span className="tabular-nums text-muted-foreground">
              {remaining}
            </span>
            <span>{moreLabel}</span>
            <ChevronRight className="size-5" />
          </button>
        )}
      </div>
    </section>
  );
}
