import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    type SortingState,
    useReactTable,
} from "@tanstack/react-table";
import { useState, type MouseEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { mediaDb } from "@/data";
import type { Song } from "@/models";
import { resizePicture } from "@/lib/utils";

export function SongTable() {
    //
    // Sorting + selection state
    //
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<Record<number, boolean>>({});
    const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

    //
    // Dexie-powered sorting
    //
    const songs = useLiveQuery(async () => {
        if (sorting.length === 0) {
            return mediaDb.songs.toArray();
        }

        const { id, desc } = sorting[0];

        // Only allow sorting by indexed fields
        const sortable = [
            "title",
            "artist",
            "album",
            "duration",
            "bitrate",
            "mtime",
        ];

        if (!sortable.includes(id)) {
            return mediaDb.songs.toArray();
        }

        let query = mediaDb.songs.orderBy(id as keyof Song);
        if (desc) query = query.reverse();

        return query.toArray();
    }, [sorting]) ?? [];

    //
    // Formatting helpers inside component
    //
    const formatBitRate = (bitrate: number) => {
        return `${Math.floor(bitrate)} kbps`;
    };

    const formatDuration = (duration: number) => {
        const minutes = Math.floor(duration / 60);
        const seconds = `${Math.floor(duration % 60)}`.padStart(2, "0");
        return `${minutes}:${seconds}`;
    };

    //
    // Shift-click range selection
    //
    const applyRangeSelection = (currentIndex: number) => {
        if (lastClickedIndex === null) {
            setRowSelection({ [currentIndex]: true });
            return;
        }

        const start = Math.min(lastClickedIndex, currentIndex);
        const end = Math.max(lastClickedIndex, currentIndex);

        const newSelection: Record<number, boolean> = {};
        for (let i = start; i <= end; i++) {
            newSelection[i] = true;
        }

        setRowSelection(newSelection);
    };

    //
    // Table columns
    //
    const columns: ColumnDef<Song>[] = [
        {
            id: "select",
            header: ({ table }) => (
                <input
                    type="checkbox"
                    aria-label="Select all songs"
                    checked={table.getIsAllRowsSelected()}
                    ref={(el) => {
                        if (el) el.indeterminate = table.getIsSomeRowsSelected();
                    }}
                    onChange={table.getToggleAllRowsSelectedHandler()}
                    onClick={(e) => e.stopPropagation()}
                />
            ),
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    aria-label={`Select song: ${row.original.title}`}
                    checked={row.getIsSelected()}
                    ref={(el) => {
                        if (el) el.indeterminate = row.getIsSomeSelected();
                    }}
                    onChange={row.getToggleSelectedHandler()}
                    onClick={(e) => e.stopPropagation()}
                />
            ),
        },
        {
            accessorKey: "albumArt",
            header: "Art",
            cell: ({ getValue }) => {
                // const art = getValue<Blob | undefined>();
                // const artBinary = await art?.bytes();
                
                // const thumbnail = artBinary != null ? await resizePicture(artBinary, 'image/jpeg') : null;
                
                const thumbnail: string | null = null;

                return thumbnail ? (
                    <img
                        src={thumbnail}
                        alt="Album Art"
                        className="w-10 h-10 object-cover rounded"
                    />
                ) : (
                    <div className="w-10 h-10 rounded bg-zinc-300 dark:bg-zinc-700" />
                );
            },
        },
        {
            accessorKey: "title",
            header: "Title",
        },
        {
            accessorKey: "artist",
            header: "Artist",
        },
        {
            accessorKey: "album",
            header: "Album",
        },
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

    //
    // Table instance
    //
    const table = useReactTable({
        data: songs,
        columns,
        state: {
            sorting,
            rowSelection,
        },
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        enableRowSelection: true,
    });

    const selectedCount = table.getSelectedRowModel().rows.length;

    //
    // Row click handler with Ctrl + Shift support
    //
    const handleRowClick = (
        rowIndex: number,
        row: any,
        event: MouseEvent<HTMLTableRowElement>
    ) => {
        if (event.shiftKey) {
            applyRangeSelection(rowIndex);
        } else if (event.metaKey || event.ctrlKey) {
            row.toggleSelected();
        } else {
            setRowSelection({ [rowIndex]: true });
        }

        setLastClickedIndex(rowIndex);
    };

    return (
        <div className="space-y-4">
            <div className="rounded border border-zinc-300 dark:border-zinc-700">
                <table className="w-full select-none border-collapse text-sm">
                    <thead className="sticky top-0 z-20 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                        {table.getHeaderGroups().map((hg) => (
                            <tr key={hg.id} className="border-b border-zinc-300 dark:border-zinc-700">
                                {hg.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="p-2 text-left cursor-pointer select-none sticky top-0 bg-zinc-200 dark:bg-zinc-800 transition-colors"
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        {flexRender(header.column.columnDef.header, header.getContext())}
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
                            <tr
                                key={row.id}
                                className={`
                                    border-b border-zinc-300 dark:border-zinc-700
                                    cursor-pointer transition-colors
                                    hover:bg-zinc-100 dark:hover:bg-zinc-700
                                    ${row.getIsSelected() ? "bg-blue-100 dark:bg-blue-900/40" : ""}
                                `}
                                onClick={(e) => handleRowClick(index, row, e)}
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
