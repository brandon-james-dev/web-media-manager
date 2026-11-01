import { useMemo, useLayoutEffect, useRef, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  columnOrderingFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  rowSelectionFeature,
  rowSortingFeature,
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
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuSeparator,
  ContextMenuGroup,
} from "@/components/ui/context-menu";
import { selectors, type SortableColumn } from "@/lib/persistence";
import type { SongTableProps } from "./SongTableProps";
import { SongRow } from "./TanstackSongRow";
import { DraggableHeader } from "./DraggableHeader";
import { createSongColumns } from "./createSongColumns";

const features = tableFeatures({
  rowSelectionFeature,
  rowSortingFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  columnOrderingFeature,
});

const selectorIds = Object.fromEntries(
  Object.keys(selectors).map((key) => [key, key])
) as Record<SortableColumn, string>;

export function TanstackSongTable(props: SongTableProps) {
  const {
    songs,
    isEditMultiple,
    selectedSongIds,
    onSort,
    onSelect,
    onSongDoubleClicked,
  } = props;
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);

  useEffect(() => {
    if (selectedSongIds.length === 1) {
      const id = selectedSongIds[0];
      scrollRowIntoView(id);
    }
  }, [selectedSongIds]);

  const registerRowRef = (rowId: string, element: HTMLDivElement | null) => {
    rowRefs.current[rowId] = element;
  };

  const rowSelection: RowSelectionState = useMemo(
    () => Object.fromEntries(selectedSongIds.map((id) => [id, true])),
    [selectedSongIds]
  );

  const columns = useMemo(() => createSongColumns(features), []);

  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(
    columns.map((c) => c.id) as ColumnOrderState
  );

  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >(() => Object.fromEntries(columns.map((c) => [c.id!, true])));

  function scrollRowIntoView(rowId: string) {
    const el = rowRefs.current[rowId];
    if (!el) return;

    el.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }

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

        if (selectedIds.length === 1) {
          const id = selectedIds[0];

          scrollRowIntoView(id);
        }
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

        const next = arrayMove(old, oldIndex, newIndex);

        return next;
      });
    }
  }

  const tableRef = useRef<HTMLDivElement>(null);

  // Virtualization: the scroll element is the wrapping ScrollArea viewport.
  // Rows are mounted lazily by @tanstack/react-virtual; only the rows in the
  // viewport (plus overscan) are rendered at any time.
  const rows = table.getRowModel().rows;

  const orderedSongIds = useMemo(() => rows.map((r) => r.id), [rows]);

  /**
   * Render non-virtualized for small collections: crisp, fully-rendered rows
   * with zero virtualization/measurement overhead. Flip to virtualized mode
   * once the row count exceeds the memory/size breakdown, so huge libraries
   * stay smooth.
   */
  const VIRTUALIZE_THRESHOLD = 1000;
  const isVirtualizing = rows.length > VIRTUALIZE_THRESHOLD;

  const rowVirtualizer = useVirtualizer({
    count: isVirtualizing ? rows.length : 0,
    getScrollElement: () =>
      tableRef.current?.closest<HTMLElement>(
        '[data-slot="scroll-area-viewport"]'
      ) ?? null,
    estimateSize: () => 28,
    overscan: 20,
    getItemKey: (index) => rows[index]?.id ?? index,
    // Measure true row heights so virtual positions stay exact even for rows
    // that grow/multiline. measureElement is attached via each row's ref.
    measureElement: (el) => el.getBoundingClientRect().height,
    // skip virtualizer entirely when not virtualizing (count 0)
  });

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
                        <DraggableHeader
                          key={header.id}
                          header={header}
                          selectors={selectors}
                        />
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
              <ContextMenuItem
                onClick={() => table.toggleAllColumnsVisible(true)}
              >
                Reset
              </ContextMenuItem>
            </ContextMenuGroup>
          </ContextMenuContent>
        </ContextMenu>

        {rows.length === 0 ? (
          <div className="h-24 flex items-center justify-center">
            No results.
          </div>
        ) : isVirtualizing ? (
          <div
            style={{ height: rowVirtualizer.getTotalSize() }}
            className="relative"
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  className="absolute top-0 left-0 w-full odd:bg-accent/5"
                  style={{
                    // No fixed height here: measureElement reads the row's
                    // natural height. Fixing height plus measuring the same
                    // element creates a feedback loop that locks rows to the
                    // initial estimate (wrong spacing).
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  ref={rowVirtualizer.measureElement}
                >
                  <SongRow
                    key={row.id}
                    song={row.original}
                    row={row}
                    table={table}
                    rowSelection={rowSelection}
                    isEditMultiple={isEditMultiple}
                    onSongDoubleClicked={onSongDoubleClicked}
                    registerRowRef={registerRowRef}
                    orderedSongIds={orderedSongIds}
                    selectionAnchor={selectionAnchor}
                    setSelectionAnchor={setSelectionAnchor}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col">
            {rows.map((row) => (
              <SongRow
                key={row.id}
                song={row.original}
                row={row}
                table={table}
                rowSelection={rowSelection}
                isEditMultiple={isEditMultiple}
                onSongDoubleClicked={onSongDoubleClicked}
                registerRowRef={registerRowRef}
                orderedSongIds={orderedSongIds}
                selectionAnchor={selectionAnchor}
                setSelectionAnchor={setSelectionAnchor}
              />
            ))}
          </div>
        )}
      </div>
    </DndContext>
  );
}
