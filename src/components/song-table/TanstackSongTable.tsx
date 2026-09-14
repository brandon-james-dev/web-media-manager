import { memo, useMemo } from "react";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
  type RowSelectionState,
} from "@tanstack/react-table";
import type { Song } from "@/models";
import { selectors, type SortableColumn } from "@/lib/store";
import { Button } from "../ui/button";
import type { SongTableProps } from "./SongTableProps";
import { ChevronDown, ChevronUp } from "lucide-react";

const features = tableFeatures({
  rowSelectionFeature,
  rowSortingFeature,
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
          cell: (info) => info.getValue(),
        }),
        columnHelper.accessor("artist", {
          id: "artist",
          header: "Artist",
          cell: (info) => info.getValue(),
        }),
        columnHelper.accessor("album", {
          id: "album",
          header: "Album",
          cell: (info) => info.getValue(),
        }),
        columnHelper.accessor("track", {
          id: "track",
          header: "Track",
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
          cell: (info) => info.getValue(),
        }),
      ]),
    []
  );

  const table = useTable(
    {
      key: "song-table",
      features,
      columns,
      data: songs,
      state: {
        rowSelection,
      },
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
    },
    (state) => state
  );

  const SongRow = memo(
    function SongRow({
      row,
    }: {
      row: ReturnType<typeof table.getRowModel>["rows"][number];
    }) {
      const song = row.original;
      const isSelected = row.getIsSelected();

      return (
        <tr
          key={song.id}
          onClick={() => {
            if (isEditMultiple) {
              const selectedSongIds = Object.keys(rowSelection);
              table.setRowSelection({
                ...rowSelection,
                [song.id]: true,
              });

              onSelect?.([...selectedSongIds, row.id]);
            } else {
              table.setRowSelection({ [row.id]: true });
              onSelect?.([row.id]);
            }
          }}
          className={
            isSelected
              ? "bg-accent/25 odd:bg-accent/35 hover:bg-accent/45"
              : "odd:bg-muted/15 hover:bg-accent/45"
          }
        >
          {row.getAllCells().map((cell) => (
            <td
              key={cell.id}
              className="px-4 py-1 whitespace-nowrap overflow-hidden text-ellipsis"
            >
              <table.FlexRender cell={cell} />
            </td>
          ))}
        </tr>
      );
    },

    (prev, next) =>
      prev.row.original === next.row.original &&
      prev.row.getIsSelected() === next.row.getIsSelected()
  );

  return (
    <table className="border-collapse text-sm select-none">
      <thead className="sticky top-0 bg-background">
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const key = header.id as SortableColumn;
              const isActive = sort?.selector === selectors[key];
              const Icon = isActive
                ? sort?.desc
                  ? ChevronDown
                  : ChevronUp
                : null;

              return (
                <th
                  key={header.id}
                  colSpan={header.colSpan}
                  className={[
                    "bg-accent/5 dark:hover:bg-accent/10 light:hover:bg-accent/10 font-medium select-none transition-colors rounded-none",
                    isActive ? "text-white" : "text-muted-foreground",
                  ].join(" ")}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {header.isPlaceholder ? null : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full justify-start text-left dark:hover:bg-transparent light:hover:bg-transparent"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <table.FlexRender header={header} />
                      {Icon && <Icon size=".75lh" className="text-primary" />}
                    </Button>
                  )}
                </th>
              );
            })}
          </tr>
        ))}
      </thead>

      <tbody>
        {table.getRowModel().rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="h-24 text-center">
              No results.
            </td>
          </tr>
        ) : (
          table
            .getRowModel()
            .rows.map((row) => <SongRow key={row.id} row={row} />)
        )}
      </tbody>
    </table>
  );
}
