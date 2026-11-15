import type { DragEndEvent } from "@dnd-kit/core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

type DragEndHandler = (event: DragEndEvent) => void;

interface SidebarDragValue {
  /** True while the sidebar is open, i.e. while there is anywhere to drop. */
  enabled: boolean;
  /** Let a nested view handle its own drag end (e.g. column reordering). */
  registerDragEnd: (handler: DragEndHandler) => () => void;
  runDragEnd: (event: DragEndEvent) => void;
}

const SidebarDragContext = createContext<SidebarDragValue | null>(null);

/**
 * Shares one drag context with the views inside the layout.
 *
 * A view that owns a `DndContext` of its own cannot see the sidebar's drop
 * targets: dnd-kit resolves droppables through the nearest context, so a drag
 * started inside a nested context never reports the sidebar row underneath the
 * pointer. The layout therefore owns the only context, and a nested view hands
 * its drag-end work here instead of wrapping itself in another one.
 */
export function SidebarDragProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const handlers = useRef(new Set<DragEndHandler>());

  const registerDragEnd = useCallback((handler: DragEndHandler) => {
    handlers.current.add(handler);
    return () => {
      handlers.current.delete(handler);
    };
  }, []);

  const runDragEnd = useCallback((event: DragEndEvent) => {
    for (const handler of handlers.current) {
      handler(event);
    }
  }, []);

  const value = useMemo(
    () => ({ enabled, registerDragEnd, runDragEnd }),
    [enabled, registerDragEnd, runDragEnd]
  );

  return (
    <SidebarDragContext.Provider value={value}>
      {children}
    </SidebarDragContext.Provider>
  );
}

/** The drag context, or null outside a layout that provides one. */
export function useSidebarDrag(): SidebarDragValue | null {
  return useContext(SidebarDragContext);
}

/** Whether tracks can be dragged right now. False outside such a layout. */
export function useTrackDragEnabled(): boolean {
  return useContext(SidebarDragContext)?.enabled ?? false;
}

/**
 * Route this view's drag-end work through the layout's context, so a view
 * that used to own a `DndContext` keeps its behaviour without hiding the
 * sidebar's drop targets. A no-op outside such a layout.
 */
export function useRegisterDragEnd(handler: DragEndHandler): void {
  const register = useContext(SidebarDragContext)?.registerDragEnd;
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => {
    if (!register) {
      return;
    }
    return register((event) => latest.current(event));
  }, [register]);
}
