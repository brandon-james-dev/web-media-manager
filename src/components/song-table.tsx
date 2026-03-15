import {
  type ColumnDef,
  type Row,
  type SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { memo, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { mediaDb } from "@/data";
import type { Song } from "@/models";

export function SongTable({
  onSelectSong,
  selectedSong,
}: {
  onSelectSong: (song: Song) => void;
  selectedSong: Song | null;
}) {
  //
  // Sorting state only
  //
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  //
  // Dexie-powered sorting
  //
  const songs =
    useLiveQuery(async () => {
      if (sorting.length === 0) {
        return mediaDb.songs.toArray();
      }

      const { id, desc } = sorting[0];

      const sortable = [
        "tags.title",
        "tags.artist",
        "tags.album",
        "tags.genre",
        "duration",
        "bitrate",
        "mtime",
      ];

      const idDotAccessor = id.replaceAll("_", ".");

      if (!sortable.includes(idDotAccessor)) {
        return mediaDb.songs.toArray();
      }

      let query = mediaDb.songs.orderBy(idDotAccessor as keyof Song);
      if (desc) query = query.reverse();

      return query.toArray();
    }, [sorting]) ?? [];

  useEffect(() => {
    if (!selectedSong) {
      setSelectedIndex(null);
    }
  }, [selectedSong]);

  //
  // Row component (single-select highlight)
  //
  const SongRow = memo(({ row, index }: { row: Row<Song>; index: number }) => {
    const isSelected = selectedIndex === index;

    return (
      <tr
        key={row.id}
        className={`
                    border-b border-zinc-300 dark:border-zinc-700
                    cursor-pointer transition-colors
                    hover:bg-zinc-100 dark:hover:bg-zinc-700
                    ${isSelected ? "bg-blue-100 dark:bg-blue-900/40" : ""}
                `}
        onClick={() => handleRowClick(index, row)}
      >
        {row.getVisibleCells().map((cell) => (
          <td key={cell.id} className="p-2 whitespace-nowrap">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
    );
  });

  const formatBitRate = (bitrate: number) =>
    `${Math.floor(bitrate / 1000)} kbps`;

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const seconds = `${Math.floor(duration % 60)}`.padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

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
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleRowClick = (rowIndex: number, row: Row<Song>) => {
    setSelectedIndex(rowIndex);
    onSelectSong?.(row.original);
  };

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
            {table.getRowModel().rows.map((row, index) => (
              <SongRow key={row.id} row={row} index={index} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
