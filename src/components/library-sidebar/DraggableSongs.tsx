import { useDraggable } from "@dnd-kit/core";
import { cn } from "cn";
import type { ReactNode } from "react";
import { useTrackDragEnabled } from "./SidebarDragContext";

interface DraggableSongsProps {
  /** Every song the drag carries: one album's or artist's tracks. */
  songIds: string[];
  /** Stable id for this drag source. */
  dragId: string;
  /** Shown on the drag ghost: the album or artist name. */
  label: string;
  /** Second ghost line, e.g. the album's artist. */
  sublabel?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Makes a whole card draggable — an album's artwork, an artist's row — so the
 * unit that gets dropped is the album or artist rather than a single track.
 *
 * The listeners sit on the wrapper itself: there is no grip, because the card
 * is the affordance. Clicks still reach the child, since a drag only starts
 * once the pointer moves past the sensor's activation distance.
 */
export function DraggableSongs({
  songIds,
  dragId,
  label,
  sublabel,
  children,
  className,
}: DraggableSongsProps) {
  const enabled = useTrackDragEnabled();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: { songIds, title: label, artist: sublabel ?? "" },
    disabled: !enabled,
  });

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-dnd-id={dragId}
      className={cn("cursor-grab", isDragging && "opacity-40", className)}
    >
      {children}
    </div>
  );
}
