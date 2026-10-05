import type { SortableColumn } from "@/lib/store";

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
