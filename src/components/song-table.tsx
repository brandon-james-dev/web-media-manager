import {
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { Song } from "@/models";

export function SongTable({
  songs,
  sorting,
  onSortingChange,
  rowSelection,
  onRowSelectionChange,
}: {
  songs: Song[];
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (updater: any) => void;
}) {
  function formatBitRate(bitrate: number) {
    return `${Math.floor(bitrate / 1000)} kbps`;
  }

  function formatDuration(duration: number) {
    const minutes = Math.floor(duration / 60);
    const seconds = `${Math.floor(duration % 60)}`.padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  const columns: ColumnDef<Song>[] = [
    { accessorKey: "tags.title", header: "Title" },
    { accessorKey: "tags.artist", header: "Artist" },
    { accessorKey: "tags.album", header: "Album" },
    { accessorKey: "tags.genre", header: "Genre" },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ getValue }) => formatDuration(getValue<number>()),
    },
    {
      accessorKey: "bitrate",
      header: "Bitrate",
      cell: ({ getValue }) => formatBitRate(getValue<number>()),
    },
  ];

  const table = useReactTable({
    data: songs,
    columns,
    state: { sorting },
    enableRowSelection: true,
    enableMultiRowSelection: false,
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
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
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`
                  border-b border-zinc-300 dark:border-zinc-700
                  cursor-pointer transition-colors
                  hover:bg-zinc-100 dark:hover:bg-zinc-700
                  ${row.getIsSelected() ? "bg-blue-100 dark:bg-blue-900/40" : ""}
                `}
                onClick={() => {
                  row.toggleSelected();
                  return onRowSelectionChange?.(row);
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-2 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
