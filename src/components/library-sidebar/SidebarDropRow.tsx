import { useDndContext, useDroppable } from "@dnd-kit/core";
import { cn } from "cn";
import type { ReactNode } from "react";

interface SidebarDropRowProps {
  /** Drop id from `sidebarPlaylistDropId` / `sidebarSyncDropId`. */
  id: string;
  /** Read-only targets stay visible but cannot receive a drop. */
  disabled?: boolean;
  children: ReactNode;
}

/**
 * A compact row that accepts a dragged track.
 *
 * The whole row is the drop target rather than a nested zone, so a drop
 * anywhere on the row lands, which matters at touch sizes. Requires a
 * `DndContext` ancestor.
 */
export function SidebarDropRow({
  id,
  disabled = false,
  children,
}: SidebarDropRowProps) {
  const { active } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({ id, disabled });

  return (
    <div
      ref={setNodeRef}
      data-sidebar-drop={id}
      data-drop-disabled={disabled ? "" : undefined}
      className={cn(
        "flex items-center gap-1 rounded-md py-1.5 pl-2 pr-0.5 text-sm transition-colors",
        // A read-only target greys out only while something is being dragged,
        // so it reads as unavailable at the moment it matters.
        disabled && active !== null && "opacity-40",
        // While a drag is in flight every row that can take it shows a dashed
        // outline, so the targets are visible before the pointer reaches them.
        // An outline rather than a ring: twMerge drops `ring-dashed` as a ring
        // conflict, and an outline does not change the row's box.
        !disabled &&
          active !== null &&
          !isOver &&
          "outline-1 outline-dashed outline-border",
        isOver
          ? "bg-primary/15 ring-2 ring-primary ring-inset"
          : "hover:bg-accent/40"
      )}
    >
      {children}
    </div>
  );
}
