import { memo, useMemo, useLayoutEffect, useRef, useState } from "react";
import {
  columnOrderingFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createSortedRowModel,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnOrderState,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuSeparator,
  ContextMenuGroup,
} from "@/components/ui/context-menu";
import type { Song } from "@/models";
import { selectors, type SortableColumn } from "@/lib/store";
import { Button } from "../ui/button";
import type { SongTableProps } from "./SongTableProps";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";

const features = tableFeatures({
  rowSelectionFeature,
  rowSortingFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  columnOrderingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    text: sortFn_text,
  },
});

const selectorIds = Object.fromEntries(
  Object.keys(selectors).map((key) => [key, key])
) as Record<SortableColumn, string>;

const columnHelper = createColumnHelper<typeof features, Song>();

export function TanstackSongTable(props: SongTableProps) {
  const { songs, sort, isEditMultiple, selectedSongIds, onSort, onSelect } =
    props;

  const rowSelection: RowSelectionState = useMemo(
    () => Object.fromEntries(selectedSongIds.map((id) => [id, true])),
    [selectedSongIds]
  );

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("title", {
          id: "title",
          header: "Title",
          size: 240,
          cell: (info) => info.getValue(),
        }),
        columnHelper.accessor("artist", {
          id: "artist",
          header: "Artist",
          size: 240,
          cell: (info) => info.getValue(),
        }),
        columnHelper.accessor("album", {
          id: "album",
          header: "Album",
          size: 240,
          cell: (info) => info.getValue(),
        }),
        columnHelper.accessor("track", {
          id: "track",
          header: "Track",
          maxSize: 50,
          cell: (info) => info.getValue(),
        }),
        columnHelper.accessor("genre", {
          id: "genre",
          header: "Genre",
          cell: (info) => info.getValue(),
        }),
        columnHelper.accessor("year", {
          id: "year",
          header: "Year",
          maxSize: 70,
          cell: (info) => info.getValue(),
        }),
        columnHelper.accessor("length", {
          id: "duration",
          header: "Duration",
          minSize: 90,
          maxSize: 90,
          cell: ({ getValue }) => {
            const d = getValue<number>();
            const m = Math.floor(d / 60);
            const s = `${Math.floor(d % 60)}`.padStart(2, "0");
            return `${m}:${s}`;
          },
        }),
        columnHelper.accessor("bitrate", {
          id: "bitrate",
          header: "Bitrate",
          size: 100,
          minSize: 80,
          cell: (info) => `${info.getValue()} kbps`,
        }),
      ]),
    []
  );

  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(
    columns.map((c) => c.id) as ColumnOrderState
  );

  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >(() => Object.fromEntries(columns.map((c) => [c.id!, true])));

  const table = useTable(
    {
      key: "song-table",
      features,
      columns,
      data: songs,
      state: {
        rowSelection,
        columnOrder,
        columnVisibility,
      },

      defaultColumn: {
        minSize: 50,
        maxSize: 800,
      },
      columnResizeMode: "onChange",
      getRowId: (row) => row.id,
      enableRowSelection: true,
      onRowSelectionChange: (next) => {
        const selectedIds = Object.keys(next);
        onSelect?.(selectedIds);
      },
      onSortingChange: (updater) => {
        const next =
          typeof updater === "function"
            ? updater(table.state.sorting)
            : updater;

        const s = next[0];
        if (!s) return;

        const col = (Object.keys(selectorIds) as SortableColumn[]).find(
          (key) => selectorIds[key] === s.id
        );

        if (col) onSort?.(col);
      },
      onColumnOrderChange: setColumnOrder,
      onColumnVisibilityChange: setColumnVisibility,
    },
    (state) => ({
      sorting: state.sorting,
      rowSelection: state.rowSelection,
      columnVisibility: state.columnVisibility,
      columnOrder: state.columnOrder,
    })
  );

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumnOrder((old) => {
        const oldIndex = old.indexOf(active.id);
        const newIndex = old.indexOf(over.id);
        return arrayMove(old, oldIndex, newIndex);
      });
    }
  }
  const tableRef = useRef<HTMLTableElement>(null);

  useLayoutEffect(() => {
    const writeVars = () => {
      const el = tableRef.current;
      if (!el) return;

      for (const header of table.getFlatHeaders()) {
        el.style.setProperty(
          `--header-${header.id}-size`,
          String(header.getSize())
        );
        el.style.setProperty(
          `--col-${header.column.id}-size`,
          String(header.column.getSize())
        );
      }

      el.style.width = `${table.getTotalSize()}px`;
    };

    writeVars();

    const { unsubscribe } = table.atoms.columnSizing.subscribe(writeVars);
    return () => unsubscribe();
  }, [table]);

  function DraggableHeader({ header }: any) {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
      useSortable({ id: header.column.id });

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
            <table.FlexRender header={header} />
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

  const SongRow = memo(
    function SongRow({
      row,
    }: {
      row: ReturnType<typeof table.getRowModel>["rows"][number];
    }) {
      const song = row.original;
      const isSelected = row.getIsSelected();

      return (
        <div
          key={song.id}
          onClick={() => {
            const selection: RowSelectionState = isEditMultiple
              ? { ...rowSelection, [song.id]: true }
              : { [row.id]: true };
            table.setRowSelection(selection);
          }}
          className={
            isSelected
              ? "flex bg-accent/25 odd:bg-accent/35 hover:bg-accent/45"
              : "flex odd:bg-muted/15 hover:bg-accent/45"
          }
        >
          {row.getVisibleCells().map((cell) => (
            <div
              key={cell.id}
              style={{
                width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
              }}
              className="px-4 py-1 whitespace-nowrap overflow-hidden text-ellipsis"
            >
              <table.FlexRender cell={cell} />
            </div>
          ))}
        </div>
      );
    },
    (prev, next) =>
      prev.row.original === next.row.original &&
      prev.row.getIsSelected() === next.row.getIsSelected()
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div ref={tableRef} className="text-sm select-none min-w-full">
        <ContextMenu>
          <ContextMenuTrigger
            render={
              <div className="sticky top-0 bg-background">
                {table.getHeaderGroups().map((headerGroup) => (
                  <div key={headerGroup.id} className="flex bg-accent/30">
                    <SortableContext
                      items={columnOrder}
                      strategy={horizontalListSortingStrategy}
                    >
                      {headerGroup.headers.map((header) => (
                        <DraggableHeader key={header.id} header={header} />
                      ))}
                    </SortableContext>
                  </div>
                ))}
              </div>
            }
          ></ContextMenuTrigger>

          <ContextMenuContent className="w-48">
            <ContextMenuGroup>
              {table.getAllLeafColumns().map((col) => (
                <ContextMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onCheckedChange={(checked) => col.toggleVisibility(!!checked)}
                  className="capitalize"
                >
                  {col.columnDef.header as string}
                </ContextMenuCheckboxItem>
              ))}
            </ContextMenuGroup>

            <ContextMenuSeparator />

            <ContextMenuGroup>
              <ContextMenuItem onClick={() => table.toggleAllColumnsVisible()}>
                Reset
              </ContextMenuItem>
            </ContextMenuGroup>
          </ContextMenuContent>
        </ContextMenu>

        <div>
          {table.getRowModel().rows.length === 0 ? (
            <div className="h-24 flex items-center justify-center">
              No results.
            </div>
          ) : (
            table
              .getRowModel()
              .rows.map((row) => <SongRow key={row.id} row={row} />)
          )}
        </div>
      </div>
    </DndContext>
  );
}
