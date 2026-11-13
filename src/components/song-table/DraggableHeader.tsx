import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";

import { Button } from "../ui/button";

import type { SortableColumn } from "@/lib/persistence";
import type { DraggableHeaderProps } from "./DraggableHeaderProps";

export function DraggableHeader({
  header,
  sort,
  selectors,
  tableRef,
  onResizeEnd,
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

  // Live resize without React renders: the drag writes the column's width
  // variables straight into the table element, then commits the final width
  // to table state once, on release.
  const startResize = (event: React.PointerEvent) => {
    event.preventDefault();
    const el = tableRef?.current;
    const column = header.column;
    const startX = event.clientX;
    const startWidth = header.getSize();
    const minSize = column.columnDef.minSize ?? 50;
    const maxSize = column.columnDef.maxSize ?? 800;
    const totalWidth = header.getContext().table.getTotalSize();
    let width = startWidth;

    const move = (e: PointerEvent) => {
      width = Math.min(
        maxSize,
        Math.max(minSize, startWidth + e.clientX - startX)
      );
      if (!el) return;
      el.style.setProperty(`--header-${header.id}-size`, String(width));
      el.style.setProperty(`--col-${column.id}-size`, String(width));
      el.style.width = `${totalWidth - startWidth + width}px`;
    };

    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      const table = header.getContext().table;
      table.setColumnSizing((prev: Record<string, number>) => ({
        ...prev,
        [column.id]: width,
      }));
      onResizeEnd?.(table.atoms.columnSizing.get());
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
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
        onPointerDown={startResize}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize group-hover:bg-accent/70"
      />
    </div>
  );
}
