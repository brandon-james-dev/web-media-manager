import type { SortableColumn } from "@/lib/persistence";

export interface DraggableHeaderProps {
  header: any;

  sort?: {
    selector: unknown;

    desc: boolean;
  };

  selectors: Record<
    SortableColumn,
    unknown
  >;
}
