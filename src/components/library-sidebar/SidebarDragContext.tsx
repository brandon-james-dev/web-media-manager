import { useCallback, useMemo, useRef, type ReactNode } from "react";
import {
  SidebarDragContext,
  type DragEndHandler,
  type SidebarDragValue,
} from "./sidebarDrag";

/**
 * Shares one drag context with the views inside the layout.
 *
 * A view that owns a `DndContext` of its own cannot see the sidebar's drop
 * targets: dnd-kit resolves droppables through the nearest context, so a drag
 * started inside a nested context never reports the sidebar row underneath the
 * pointer. The layout therefore owns the only context, and a nested view hands
 * its drag-end work here instead of wrapping itself in another one.
 *
 * Whether a drag may start is not part of this value: it is layout state, and
 * putting it here would re-render every draggable row — a song table of
 * thousands of rows — on each sidebar toggle. The layout gates dragging
 * through the sensors and the `data-drag-enabled` attribute instead.
 */
export function SidebarDragProvider({ children }: { children: ReactNode }) {
  const handlers = useRef(new Set<DragEndHandler>());

  const registerDragEnd = useCallback((handler: DragEndHandler) => {
    handlers.current.add(handler);
    return () => {
      handlers.current.delete(handler);
    };
  }, []);

  const runDragEnd = useCallback((event: Parameters<DragEndHandler>[0]) => {
    for (const handler of handlers.current) {
      handler(event);
    }
  }, []);

  const value = useMemo<SidebarDragValue>(
    () => ({ registerDragEnd, runDragEnd }),
    [registerDragEnd, runDragEnd]
  );

  return (
    <SidebarDragContext.Provider value={value}>
      {children}
    </SidebarDragContext.Provider>
  );
}
