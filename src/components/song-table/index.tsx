import {
  type OnChangeFn,
  type SortingState,
  type RowSelectionState,
  type Row,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import React, { useEffect, useRef, useState, useCallback } from "react";
import type { Song } from "@/models";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { ChevronDown, ChevronUp } from "lucide-react";
import { columns } from "./columns";

export type SongTableProps = {
  songs: Song[];
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  rowSelection?: Song[];
  onRowSelectionChange?: (songs: Song[]) => void;
  isBulkSelectEnabled: React.RefObject<boolean>;
  onEnterKey?: () => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  hidden?: boolean;
};

export function SongTable(props: SongTableProps) {
  const {
    songs,
    sorting,
    onSortingChange,
    rowSelection = [],
    onRowSelectionChange,
    isBulkSelectEnabled = useRef<boolean>(false),
    onEnterKey,
    containerRef,
    hidden,
  } = props;
  const tableRef = useRef<HTMLTableElement>(null);

  const [internalRowSelection, setInternalRowSelection] =
    useState<RowSelectionState>({});
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);

  const [columnSizing, setColumnSizing] = useState({});

  const anchorRef = useRef<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  function scrollRowIntoView(rowId: string) {
    const el = rowRefs.current[rowId];
    if (!el) return;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  useEffect(() => {
    const map: RowSelectionState = {};
    rowSelection.forEach((s) => {
      map[String(s.id)] = true;
    });

    if (rowSelection.length == 0) {
      setFocusedRowId(null);
    }
    setInternalRowSelection(map);
  }, [rowSelection]);

  const table = useReactTable({
    data: songs,
    columns,
    state: {
      sorting,
      rowSelection: internalRowSelection,
      columnSizing,
    },
    onColumnSizingChange: setColumnSizing,
    getRowId: (row) => String(row.id),
    enableRowSelection: true,
    enableMultiRowSelection: isBulkSelectEnabled.current,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    onSortingChange,
    onRowSelectionChange: (updater) => {
      setInternalRowSelection((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;

        if (onRowSelectionChange) {
          const selectedSongs = songs.filter((s) => next[String(s.id)]);
          onRowSelectionChange(selectedSongs);
        }

        return next;
      });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  //#region Keyboard Shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const rows = table.getRowModel().rows;
      if (!rows.length) return;

      const rowIds = rows.map((r) => r.id);

      const currentId = focusedRowId ?? anchorRef.current ?? rowIds[0];
      let index = rowIds.indexOf(currentId);
      if (index === -1) index = 0;

      if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();

        const all: RowSelectionState = {};
        for (const id of rowIds) all[id] = true;

        setInternalRowSelection(all);

        if (onRowSelectionChange) {
          const selectedSongs = songs.filter((s) => all[String(s.id)]);
          onRowSelectionChange(selectedSongs);
        }

        anchorRef.current = rowIds[0];
        setFocusedRowId(rowIds[0]);
        scrollRowIntoView(rowIds[0]);
        return;
      }

      if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();

        setInternalRowSelection({});
        onRowSelectionChange?.([]);
        anchorRef.current = null;
        setFocusedRowId(null);
        return;
      }

      if (e.key === "Home") {
        e.preventDefault();
        const firstId = rowIds[0];

        anchorRef.current = firstId;
        setFocusedRowId(firstId);

        const single: RowSelectionState = { [firstId]: true };
        setInternalRowSelection(single);

        onRowSelectionChange?.(songs.filter((s) => String(s.id) === firstId));
        scrollRowIntoView(firstId);
        return;
      }

      if (e.key === "End") {
        e.preventDefault();
        const lastId = rowIds[rowIds.length - 1];

        anchorRef.current = lastId;
        setFocusedRowId(lastId);

        const single: RowSelectionState = { [lastId]: true };
        setInternalRowSelection(single);

        onRowSelectionChange?.(songs.filter((s) => String(s.id) === lastId));
        scrollRowIntoView(lastId);
        return;
      }

      if (e.key === "PageDown" || e.key === "PageUp") {
        e.preventDefault();
        const rowHeight =
          rowRefs.current[currentId]?.getBoundingClientRect().height ?? 28;

        const container = containerRef?.current;
        if (!container) return;

        const viewportRows = Math.floor(container.clientHeight / rowHeight);
        const delta = e.key === "PageDown" ? viewportRows : -viewportRows;

        let nextIndex = Math.min(rows.length - 1, Math.max(0, index + delta));

        const nextId = rowIds[nextIndex];

        anchorRef.current = nextId;
        setFocusedRowId(nextId);

        const single: RowSelectionState = { [nextId]: true };
        setInternalRowSelection(single);

        onRowSelectionChange?.(songs.filter((s) => String(s.id) === nextId));
        scrollRowIntoView(nextId);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (onEnterKey) onEnterKey();
        return;
      }

      let nextIndex = index;

      if (e.key === "ArrowDown") {
        nextIndex = Math.min(rows.length - 1, index + 1);
      } else if (e.key === "ArrowUp") {
        nextIndex = Math.max(0, index - 1);
      } else {
        return;
      }

      e.preventDefault();

      const nextId = rowIds[nextIndex];

      if (e.shiftKey && isBulkSelectEnabled.current) {
        const anchor = anchorRef.current ?? currentId;
        const a = rowIds.indexOf(anchor);
        const [start, end] = [Math.min(a, nextIndex), Math.max(a, nextIndex)];

        const range: RowSelectionState = {};
        for (let i = start; i <= end; i++) {
          range[rowIds[i]] = true;
        }

        setInternalRowSelection(range);
        onRowSelectionChange?.(songs.filter((s) => range[String(s.id)]));

        setFocusedRowId(nextId);
        scrollRowIntoView(nextId);
        return;
      }

      anchorRef.current = nextId;
      setFocusedRowId(nextId);

      const single: RowSelectionState = { [nextId]: true };
      setInternalRowSelection(single);

      onRowSelectionChange?.(songs.filter((s) => String(s.id) === nextId));

      scrollRowIntoView(nextId);
    },
    [songs, focusedRowId, onRowSelectionChange, table],
  );
  //#endregion

  function handleRowClick(row: Row<Song>) {
    return (e: React.MouseEvent) => {
      const rowId = row.id;

      setFocusedRowId(rowId);

      if (e.shiftKey && anchorRef.current && isBulkSelectEnabled.current) {
        const allRows = table.getRowModel().rows;
        const rowIds = allRows.map((r) => r.id);

        const a = rowIds.indexOf(anchorRef.current);
        const b = rowIds.indexOf(rowId);

        if (a !== -1 && b !== -1) {
          const [start, end] = [Math.min(a, b), Math.max(a, b)];

          const range: RowSelectionState = {};
          for (let i = start; i <= end; i++) {
            range[rowIds[i]] = true;
          }

          setInternalRowSelection(range);
          if (onRowSelectionChange) {
            const selectedSongs = songs.filter((s) => range[String(s.id)]);
            onRowSelectionChange(selectedSongs);
          }

          anchorRef.current = rowId;
          scrollRowIntoView(rowId);
          return;
        }
      }

      anchorRef.current = rowId;
      row.getToggleSelectedHandler()(e);
      scrollRowIntoView(rowId);
    };
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="outline-none"
      hidden={hidden}
    >
      <div className="rounded border border-zinc-300 dark:border-zinc-700">
        <table
          ref={tableRef}
          className="min-w-max select-none border-collapse text-sm table-fixed"
          style={{
            width: "100%",
            minWidth: table.getTotalSize(),
          }}
        >
          <TableHeader className="bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-b border-zinc-300 dark:border-zinc-700 sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="after:content-['']">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="hover:bg-white/90 dark:hover:bg-white/10 p-2 min-w-0 text-left select-none sticky top-0 z-10"
                    style={{ width: header.getSize() }}
                  >
                    <div
                      className="flex items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {{
                        asc: (
                          <ChevronUp
                            className="inline-flex text-neutral-500"
                            size={16}
                          />
                        ),
                        desc: (
                          <ChevronDown
                            className="inline-flex text-neutral-500"
                            size={16}
                          />
                        ),
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>

                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className="
                        absolute inset-y-0 right-0 w-2
                        cursor-col-resize
                        select-none touch-none
                        z-20
                      "
                    />
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody className="text-xs dark:text-zinc-100">
            {rows.map((row) => (
              <SongRow
                key={row.id}
                row={row}
                isSelected={!!internalRowSelection[row.id]}
                isFocused={focusedRowId === row.id}
                onClick={handleRowClick(row)}
                rowRefs={rowRefs}
              />
            ))}
          </TableBody>
        </table>
      </div>
    </div>
  );
}

const SongRow = React.memo(
  function SongRow({
    row,
    isSelected,
    isFocused,
    onClick,
    rowRefs,
  }: {
    row: any;
    isSelected: boolean;
    isFocused: boolean;
    onClick: (e: React.MouseEvent) => void;
    rowRefs: React.RefObject<Record<string, HTMLTableRowElement | null>>;
  }) {
    return (
      <TableRow
        ref={(el) => {
          rowRefs.current[row.id] = el;
        }}
        className={`
          border-b border-zinc-300 dark:border-zinc-700
          transition-colors relative after:content-['']
          hover:bg-zinc-300 dark:hover:bg-zinc-700
          ${isSelected ? "bg-blue-300 dark:bg-blue-900/40" : "dark:odd:bg-neutral-800/40 odd:bg-zinc-200/40"}
          ${
            isFocused
              ? `
                after:absolute
                after:inset-0
                after:pointer-events-none
                after:border-2
                after:border-blue-500
                after:rounded-sm
                after:box-border
              `
              : ""
          }
        `}
        onClick={onClick}
      >
        {row.getVisibleCells().map((cell: any) => (
          <TableCell
            key={cell.id}
            className="p-1.5 whitespace-nowrap overflow-hidden text-ellipsis min-w-0"
            style={{ width: cell.column.getSize() }}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    );
  },
  (prev, next) =>
    prev.isSelected === next.isSelected &&
    prev.isFocused === next.isFocused &&
    prev.row.original === next.row.original,
);
