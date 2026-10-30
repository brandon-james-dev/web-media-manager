import type { SortableColumn } from "@/lib/repository";

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
