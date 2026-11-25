import type { DragEndEvent } from "@dnd-kit/core";
import { createContext } from "react";

export type DragEndHandler = (event: DragEndEvent) => void;

export interface SidebarDragValue {
  /** Let a nested view handle its own drag end (e.g. column reordering). */
  registerDragEnd: (handler: DragEndHandler) => () => void;
  runDragEnd: (event: DragEndEvent) => void;
}

/**
 * The layout's drag context. Kept in a plain module, not beside the provider,
 * so the provider file exports a component and nothing else — a mixed file
 * opts out of fast refresh for every consumer.
 */
export const SidebarDragContext = createContext<SidebarDragValue | null>(null);
