import {
  type ColumnDef,
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

export type SongTableProps = {
  songs: Song[];
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  rowSelection?: Song[];
  onRowSelectionChange?: (songs: Song[]) => void;
  isBulkSelectEnabled: React.RefObject<boolean>;
};

export function SongTable({
  songs,
  sorting,
  onSortingChange,
  rowSelection = [],
  onRowSelectionChange,
  isBulkSelectEnabled = useRef<boolean>(false),
}: SongTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);

  // TanStack rowSelection state (keys = song.id)
  const [internalRowSelection, setInternalRowSelection] =
    useState<RowSelectionState>({});

  // Sync external Song[] selection into TanStack rowSelection
  useEffect(() => {
    const map: RowSelectionState = {};
    rowSelection.forEach((s) => {
      map[String(s.id)] = true;
    });
    setInternalRowSelection(map);
  }, [rowSelection]);

  // Anchor for shift-click and shift-arrow
  const anchorRef = useRef<string | null>(null);

  // Focus row for keyboard navigation
  const focusRef = useRef<string | null>(null);

  // Row refs for auto-scrolling
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  function scrollRowIntoView(rowId: string) {
    const el = rowRefs.current[rowId];
    if (!el) return;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  const columns: ColumnDef<Song>[] = [
    { accessorKey: "tags.title", header: "Title" },
    { accessorKey: "tags.artist", header: "Artist" },
    { accessorKey: "tags.album", header: "Album" },
    { accessorKey: "tags.genre", header: "Genre" },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ getValue }) => {
        const d = getValue<number>();
        const m = Math.floor(d / 60);
        const s = `${Math.floor(d % 60)}`.padStart(2, "0");
        return `${m}:${s}`;
      },
    },
    {
      accessorKey: "bitrate",
      header: "Bitrate",
      cell: ({ getValue }) => `${Math.floor(getValue<number>() / 1000)} kbps`,
    },
  ];

  const table = useReactTable({
    data: songs,
    columns,
    state: {
      sorting,
      rowSelection: internalRowSelection,
    },
    getRowId: (row) => String(row.id),
    enableRowSelection: true,
    enableMultiRowSelection: isBulkSelectEnabled.current,
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const rows = table.getRowModel().rows;
      if (!rows.length) return;

      const rowIds = rows.map((r) => r.id);

      const currentId = focusRef.current ?? anchorRef.current ?? rowIds[0];
      let index = rowIds.indexOf(currentId);
      if (index === -1) index = 0;

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

      // SHIFT + ARROW = RANGE SELECTION
      if (e.shiftKey && isBulkSelectEnabled.current) {
        const anchor = anchorRef.current ?? currentId;
        const a = rowIds.indexOf(anchor);
        const [start, end] = [Math.min(a, nextIndex), Math.max(a, nextIndex)];

        const range: RowSelectionState = {};
        for (let i = start; i <= end; i++) {
          range[rowIds[i]] = true;
        }

        setInternalRowSelection(range);
        if (onRowSelectionChange) {
          const selectedSongs = songs.filter((s) => range[String(s.id)]);
          onRowSelectionChange(selectedSongs);
        }

        focusRef.current = nextId;
        scrollRowIntoView(nextId);
        return;
      }

      // NORMAL ARROW = MOVE FOCUS + SELECT SINGLE
      anchorRef.current = nextId;
      focusRef.current = nextId;

      const single: RowSelectionState = { [nextId]: true };
      setInternalRowSelection(single);

      if (onRowSelectionChange) {
        const selectedSongs = songs.filter((s) => String(s.id) === nextId);
        onRowSelectionChange(selectedSongs);
      }

      scrollRowIntoView(nextId);
    },
    [songs, onRowSelectionChange, table],
  );

  // -----------------------------
  // ROW CLICK HANDLER
  // -----------------------------
  function handleRowClick(row: Row<Song>) {
    return (e: React.MouseEvent) => {
      const rowId = row.id;

      focusRef.current = rowId;

      // SHIFT-CLICK RANGE
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
      className="space-y-4 outline-none"
      ref={tableRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="rounded border border-zinc-300 dark:border-zinc-700">
        <table className="w-full select-none border-collapse text-sm">
          <thead className="sticky top-0 z-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
            {table.getHeaderGroups().map((hg) => (
              <tr
                key={hg.id}
                className="border-b border-zinc-300 dark:border-zinc-700"
              >
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="p-2 text-left cursor-pointer select-none sticky top-0 bg-zinc-200 dark:bg-zinc-800 transition-colors"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {{
                      asc: " ▲",
                      desc: " ▼",
                    }[header.column.getIsSorted() as string] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {rows.map((row) => (
              <SongRow
                key={row.id}
                row={row}
                isSelected={!!internalRowSelection[row.id]}
                onClick={handleRowClick(row)}
                rowRefs={rowRefs}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const SongRow = React.memo(
  function SongRow({
    row,
    isSelected,
    onClick,
    rowRefs,
  }: {
    row: any;
    isSelected: boolean;
    onClick: (e: React.MouseEvent) => void;
    rowRefs: React.MutableRefObject<Record<string, HTMLTableRowElement | null>>;
  }) {
    return (
      <tr
        ref={(el) => {
          rowRefs.current[row.id] = el;
        }}
        className={`
          border-b border-zinc-300 dark:border-zinc-700
          cursor-pointer transition-colors
          hover:bg-zinc-100 dark:hover:bg-zinc-700
          ${isSelected ? "bg-blue-100 dark:bg-blue-900/40" : ""}
        `}
        onClick={onClick}
      >
        {row.getVisibleCells().map((cell: any) => (
          <td key={cell.id} className="p-2 whitespace-nowrap">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
    );
  },
  (prev, next) =>
    prev.isSelected === next.isSelected &&
    prev.row.original === next.row.original,
);
