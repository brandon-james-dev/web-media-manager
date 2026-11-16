import { useDraggable } from "@dnd-kit/core";
import { cn } from "cn";
import type { ReactNode } from "react";
import { useSongs } from "@/hooks";
import { useTranslation } from "@/i18n";
import { useTrackDragEnabled } from "./SidebarDragContext";
import { trackDragId } from "./sidebarDrop";

interface DraggableTrackProps {
  songId: string;
  /** Every song the drag carries. Defaults to just this row. */
  songIds?: string[];
  /** Set when the row lives inside a playlist, so it can be dropped out. */
  fromPlaylistId?: string;
  children: ReactNode;
}

/**
 * Wraps a track row so the whole row can be dragged onto a sidebar target.
 *
 * The listeners sit on the row itself rather than a grip, so any part of it
 * starts a drag. Clicks still reach the row: a drag only begins once the
 * pointer passes the sensor's activation distance, so a tap or double-click
 * plays the track as before. Requires a `DndContext` ancestor.
 */
export function DraggableTrack({
  songId,
  songIds,
  fromPlaylistId,
  children,
}: DraggableTrackProps) {
  const enabled = useTrackDragEnabled();
  const { songs } = useSongs();
  const { t } = useTranslation();
  const song = songs.find((candidate) => candidate.id === songId);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: trackDragId(songId),
    data: {
      songId,
      // A row inside a multi-selection drags the whole selection, so the ghost
      // can show the stack and the count.
      songIds: songIds ?? [songId],
      title: song?.title ?? t("metadata.track"),
      artist: song?.artist ?? "",
      fromPlaylistId,
    },
    disabled: !enabled,
  });

  // Nothing to drop onto while the sidebar is closed, so the row renders
  // exactly as it would without a drag wrapper.
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-dnd-id={trackDragId(songId)}
      className={cn(
        "min-w-0 cursor-grab rounded-md",
        // The wrapper is the list child, so it owns the stripe: the row inside
        // is always its first child and would otherwise stripe every row.
        "odd:bg-muted/15",
        isDragging && "opacity-40"
      )}
    >
      {children}
    </div>
  );
}
