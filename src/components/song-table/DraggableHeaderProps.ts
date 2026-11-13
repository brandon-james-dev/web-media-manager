import type { SortableColumn } from "@/lib/persistence";

export interface DraggableHeaderProps {
  header: any;

  sort?: {
    selector: unknown;

    desc: boolean;
  };

  selectors: Record<SortableColumn, unknown>;

  /** The table element whose width variables the drag writes. */
  tableRef?: React.RefObject<HTMLDivElement | null>;

  /** Called once with the final widths when a resize drag ends. */
  onResizeEnd?: (sizing: Record<string, number>) => void;
}
