import { useContext, useEffect, useRef } from "react";
import {
  SidebarDragContext,
  type DragEndHandler,
  type SidebarDragValue,
} from "./sidebarDrag";

/** The drag context, or null outside a layout that provides one. */
export function useSidebarDrag(): SidebarDragValue | null {
  return useContext(SidebarDragContext);
}

/**
 * Route this view's drag-end work through the layout's context, so a view
 * that used to own a `DndContext` keeps its behaviour without hiding the
 * sidebar's drop targets. A no-op outside such a layout.
 */
export function useRegisterDragEnd(handler: DragEndHandler): void {
  const register = useContext(SidebarDragContext)?.registerDragEnd;
  const latest = useRef(handler);

  // Written after render rather than during it: a drag end is a user event, so
  // it always runs after this effect and reads the current handler.
  useEffect(() => {
    latest.current = handler;
  });

  useEffect(() => {
    if (!register) {
      return;
    }
    return register((event) => latest.current(event));
  }, [register]);
}
