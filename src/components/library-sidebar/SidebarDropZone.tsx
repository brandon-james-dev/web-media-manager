import { useDndContext, useDroppable } from "@dnd-kit/core";
import { cn } from "cn";
import type { ReactNode } from "react";

interface SidebarDropZoneProps {
  /** Drop id from `sidebarSyncDropId`. */
  id: string;
  /** Read-only targets stay visible but cannot receive a drop. */
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * A region that accepts a dragged track, for targets that are a whole panel
 * rather than a single row (the sync queue).
 *
 * Same affordances as `SidebarDropRow`: a dashed outline while a drag is in
 * flight, and a ring once the pointer is over it. Requires a `DndContext`
 * ancestor.
 */
export function SidebarDropZone({
  id,
  disabled = false,
  className,
  children,
}: SidebarDropZoneProps) {
  const { active } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({ id, disabled });

  return (
    <div
      ref={setNodeRef}
      data-sidebar-drop={id}
      data-drop-disabled={disabled ? "" : undefined}
      className={cn(
        "min-h-0 overflow-hidden rounded-md border transition-colors",
        disabled && active !== null && "opacity-40",
        !disabled &&
          active !== null &&
          !isOver &&
          "outline-1 outline-dashed outline-border",
        isOver && "bg-primary/15 ring-2 ring-primary ring-inset",
        className
      )}
    >
      {children}
    </div>
  );
}
