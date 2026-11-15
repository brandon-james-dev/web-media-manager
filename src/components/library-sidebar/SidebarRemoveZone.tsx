import { useDndContext, useDroppable } from "@dnd-kit/core";
import { cn } from "cn";
import { Trash2 } from "lucide-react";
import { sidebarRemoveDropId } from "./sidebarDrop";

interface SidebarRemoveZoneProps {
  /** The playlist whose tracks are on screen. */
  playlistId: string;
}

/**
 * The strip that takes a track out of the playlist it was dragged from.
 *
 * It stays mounted while nothing is being dragged, only hidden, because
 * dnd-kit measures droppables when a drag starts: a zone that mounted on drag
 * start would never be measured and could not be dropped on.
 */
export function SidebarRemoveZone({ playlistId }: SidebarRemoveZoneProps) {
  const { active } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({
    id: sidebarRemoveDropId(playlistId),
  });
  // Only a track that already lives in this playlist can be taken out of it,
  // so the strip stays hidden while a track is dragged in from the library.
  const fromThisPlaylist =
    active?.data.current?.fromPlaylistId === playlistId;
  const dragging = active !== null && fromThisPlaylist;

  return (
    <div
      ref={setNodeRef}
      data-sidebar-drop={sidebarRemoveDropId(playlistId)}
      className={cn(
        "flex shrink-0 items-center justify-center gap-1.5 border-t px-2 py-1.5 text-xs transition-colors",
        dragging ? "text-muted-foreground" : "invisible",
        isOver && "bg-destructive/15 text-destructive ring-2 ring-destructive ring-inset"
      )}
    >
      <Trash2 className="size-3 shrink-0" aria-hidden="true" />
      Drop here to remove
    </div>
  );
}
