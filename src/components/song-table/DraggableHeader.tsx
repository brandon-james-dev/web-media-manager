import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";

import { Button } from "../ui/button";

import type { SortableColumn } from "@/lib/store";
import type { DraggableHeaderProps } from "./DraggableHeaderProps";

export function DraggableHeader({
  header,
  sort,
  selectors,
}: DraggableHeaderProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: header.column.id,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.8 : 1,
    width: `calc(var(--header-${header.id}-size) * 1px)`,
    transition: "transform 0.15s ease",
  };

  const key = header.id as SortableColumn;
  const isActive = sort?.selector === selectors[key];
  const Icon = isActive ? (sort?.desc ? ChevronDown : ChevronUp) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="
        relative flex items-center whitespace-nowrap
        group
      "
    >
      {!header.isPlaceholder && (
        <Button
          type="button"
          variant="ghost"
          className="flex-1 justify-start rounded-none"
          onClick={header.column.getToggleSortingHandler()}
        >
          <header.table.FlexRender header={header} />

          {Icon && <Icon size=".75lh" className="text-primary" />}
        </Button>
      )}

      <button
        {...attributes}
        {...listeners}
        className="
          absolute right-1 top-0 px-1 h-full cursor-grab
          opacity-0 group-hover:opacity-100 transition-opacity
        "
      >
        <GripVertical size=".75lh" className="text-muted-foreground" />
      </button>

      <div
        onMouseDown={header.getResizeHandler()}
        onTouchStart={header.getResizeHandler()}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize group-hover:bg-accent/70"
      />
    </div>
  );
}
