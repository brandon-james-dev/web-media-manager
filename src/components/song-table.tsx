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
import React, { useEffect, useRef, useState } from "react";
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

  const [internalRowSelection, setInternalRowSelection] =
    useState<RowSelectionState>({});

  // Sync external Song[] selection into TanStack's rowSelection (by song.id)
  useEffect(() => {
    const map: RowSelectionState = {};
    rowSelection.forEach((s) => {
      map[String(s.id)] = true;
    });
    setInternalRowSelection(map);
  }, [rowSelection]);

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

  // Anchor for shift-click range (row.id)
  const anchorRef = useRef<string | null>(null);

  function handleRowClick(row: Row<Song>) {
    return (e: React.MouseEvent) => {
      const rowId = row.id;

      // Shift-click range
      if (e.shiftKey && anchorRef.current && isBulkSelectEnabled.current) {
        const allRows = table.getRowModel().rows;
        const a = allRows.findIndex((r) => r.id === anchorRef.current);
        const b = allRows.findIndex((r) => r.id === rowId);
        if (a === -1 || b === -1) {
          anchorRef.current = rowId;
          row.getToggleSelectedHandler()(e);
          return;
        }

        const [start, end] = [Math.min(a, b), Math.max(a, b)];
        const range: RowSelectionState = {};
        for (let i = start; i <= end; i++) {
          range[allRows[i].id] = true;
        }

        setInternalRowSelection(range);
        if (onRowSelectionChange) {
          const selectedSongs = songs.filter((s) => range[String(s.id)]);
          onRowSelectionChange(selectedSongs);
        }

        // Anchor becomes the last clicked row in the range
        anchorRef.current = rowId;
        return;
      }

      // Normal / ctrl / meta click: let TanStack handle it
      anchorRef.current = rowId;
      row.getToggleSelectedHandler()(e);
    };
  }

  return (
    <div
      className="space-y-4 outline-none"
      ref={tableRef}
      tabIndex={0}
      onKeyDown={(e) => {
        // You can wire keyboard selection here later if you want
      }}
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
  }: {
    row: any;
    isSelected: boolean;
    onClick: (e: React.MouseEvent) => void;
  }) {
    return (
      <tr
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
