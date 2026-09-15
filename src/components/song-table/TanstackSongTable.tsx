import { memo, useMemo, useLayoutEffect, useRef } from "react";
import {
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
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
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

  const table = useTable(
    {
      key: "song-table",
      features,
      columns,
      data: songs,
      state: {
        rowSelection,
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
    },
    (state) => ({
      sorting: state.sorting,
      rowSelection: state.rowSelection,
      columnVisibility: state.columnVisibility,
    })
  );

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
            const selection: RowSelectionState = isEditMultiple
              ? {
                  ...rowSelection,
                  [song.id]: true,
                }
              : { [row.id]: true };
            table.setRowSelection(selection);
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
              style={{
                width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
              }}
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
    <table
      ref={tableRef}
      className="border-collapse text-sm select-none table-fixed"
    >
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
                  style={{
                    width: `calc(var(--header-${header.id}-size) * 1px)`,
                  }}
                  className={[
                    "bg-accent/5 font-medium relative select-none transition-colors rounded-none",
                    isActive ? "text-white" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {header.isPlaceholder || header.id == "filler" ? null : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full justify-start rounded-none dark:hover:bg-accent/10 light:hover:bg-accent/10"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <table.FlexRender header={header} />
                      {Icon && <Icon size=".75lh" className="text-primary" />}
                    </Button>
                  )}

                  <div
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                    className="
                      absolute right-0 top-0 h-full w-1
                      cursor-col-resize
                      hover:bg-accent
                    "
                  />
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
