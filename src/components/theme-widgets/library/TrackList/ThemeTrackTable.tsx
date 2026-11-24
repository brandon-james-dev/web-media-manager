import { useMemo, useRef, useState } from "react";
import type {
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  ReactElement,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "cn";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { AlbumArtImage } from "@/components/album-art-image";
import { SongContextMenu } from "@/components/song-context-menu";
import { useTranslation } from "@/i18n";
import { ThumbnailSize } from "@/lib";
import type { Song } from "@/models";
import { moveIndexWithin, reorderTarget } from "./playlistOrder";
import {
  COLUMN_MAX_WIDTH,
  COLUMN_MIN_WIDTH,
  clampWidth,
  flattenGroups,
  TRACK_COLUMN_DEFS,
} from "./trackColumns";
import type { AlbumGroup, TrackColumnId } from "./trackColumns";
import type { LibrarySelection } from "../shared/librarySelection";
import { useColumnOrder } from "./useColumnOrder";
import { useColumnWidths } from "./useColumnWidths";

/** How far a header must move sideways before it counts as a drag. */
const DRAG_THRESHOLD = 4;

/**
 * The sort a themed table shows and reports.
 *
 * @example
 * ```xml
 * <TrackList variant="table" sortBy="artist" sortDirection="descending" />
 * ```
 * @example
 * ```ts
 * const sort: TrackTableSort = { column: "artist", desc: true };
 * ```
 */
export interface TrackTableSort {
  /** The column the rows are ordered by. */
  readonly column: TrackColumnId;
  /** Whether the order runs from high to low. */
  readonly desc: boolean;
}

/**
 * Everything the themed table needs: the songs, the columns, the styling and
 * the selection and sort callbacks.
 *
 * @example
 * ```xml
 * <TrackList variant="table" columns="track title duration" resizeColumns="true" />
 * ```
 * @example
 * ```tsx
 * <ThemeTrackTable songs={songs} variant="table" columns={columns} onSelect={select} />
 * ```
 */
export interface ThemeTrackTableProps {
  /** The songs to show, already filtered by the page. */
  readonly songs: readonly Song[];
  /** Which layout the table uses. */
  readonly variant: "table" | "albums";
  /** The columns to show, in order. */
  readonly columns: readonly TrackColumnId[];
  /** Whether the header row renders. */
  readonly showHeader: boolean;
  /** Whether the header cells carry a resize handle. */
  readonly resizeColumns: boolean;
  /** Whether the header cells can be dragged into a new order. */
  readonly reorderColumns: boolean;
  /** Whether odd rows take a striped background. */
  readonly alternateRows: boolean;
  /** The row height preset: `compact` or anything else for comfortable. */
  readonly density: string;
  /** The class of the row text style. */
  readonly rowClass: string;
  /** The class of the header text style. */
  readonly headerClass: string;
  /** The class of the now-playing row. */
  readonly playingClass: string;
  /** The songs the page has picked. */
  readonly selectedSongIds: readonly string[];
  /** The song that is playing, when one is. */
  readonly nowPlayingId?: string;
  /** The current sort, when the page has one. */
  readonly sort?: TrackTableSort;
  /** Called with the column a header click sorts by. */
  readonly onSort: (column: TrackColumnId) => void;
  /** Called with the songs a click picks. */
  readonly onSelect: (songIds: string[]) => void;
  /** Called with the song a double click or Enter plays. */
  readonly onActivate: (song: Song) => void;
  /** Called with the selection an album cell value filters the page by. */
  readonly onFilter: (selection: LibrarySelection) => void;
  /** The suffix of the stored column widths, normally the variant. */
  readonly storageKey: string;
  /** The album groups, when the page already built them. */
  readonly groups?: readonly AlbumGroup[];
  /** The playlist the rows belong to, so the menu can take songs back out. */
  readonly playlistId?: string;
  /** Whether rows carry a drag handle and can be dragged into a new order. */
  readonly reorderable?: boolean;
  /** Called with the row index and the index it lands on after a move. */
  readonly onReorder?: (from: number, to: number) => void;
  /** Called when Delete is pressed on a row, to remove the picked songs. */
  readonly onRemoveSelected?: () => void;
}

/**
 * The themed song table: a sticky sortable header, drag-resizable columns and
 * rows that select, activate and open the song menu. The `albums` variant
 * groups the rows by album with a cover cell beside each album's tracks.
 *
 * @example
 * ```xml
 * <TrackList variant="albums" columns="track title duration" resizeColumns="true" />
 * ```
 * @example
 * ```tsx
 * <ThemeTrackTable songs={songs} variant="albums" columns={columns} groups={groups} />
 * ```
 */
export function ThemeTrackTable({
  songs,
  variant,
  columns,
  showHeader,
  resizeColumns,
  reorderColumns,
  alternateRows,
  density,
  rowClass,
  headerClass,
  playingClass,
  selectedSongIds,
  nowPlayingId,
  sort,
  onSort,
  onSelect,
  onActivate,
  onFilter,
  storageKey,
  groups,
  playlistId,
  reorderable = false,
  onReorder,
  onRemoveSelected,
}: ThemeTrackTableProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<string | undefined>(undefined);
  const dragRef = useRef<
    { column: TrackColumnId; startX: number; dragging: boolean } | undefined
  >(undefined);
  const suppressClickRef = useRef(false);
  const [draggingColumn, setDraggingColumn] = useState<
    TrackColumnId | undefined
  >(undefined);
  const [dropTarget, setDropTarget] = useState<
    { column: TrackColumnId; edge: "start" | "end" } | undefined
  >(undefined);
  const [dragRow, setDragRow] = useState<
    { from: number; insertion: number } | undefined
  >(undefined);

  const { order: columnOrder, move } = useColumnOrder(storageKey, columns);
  const visibleColumns = reorderColumns ? columnOrder : columns;

  const { widths, setWidth, reset } = useColumnWidths(
    storageKey,
    visibleColumns
  );
  const rowHeight = density === "compact" ? 28 : 36;

  const albumGroups = useMemo(
    () => (variant === "albums" ? (groups ?? []) : []),
    [variant, groups]
  );

  const order = useMemo(
    () =>
      variant === "albums"
        ? flattenGroups(albumGroups)
        : songs.map((song) => song.id),
    [variant, albumGroups, songs]
  );

  const trackTemplate = visibleColumns
    .map((column) => `${widths[column]}px`)
    .join(" ");
  const trackWidth = visibleColumns.reduce(
    (total, column) => total + widths[column],
    0
  );
  const baseTemplate =
    variant === "albums" ? `260px ${trackTemplate}` : trackTemplate;
  const template = reorderable ? `24px ${baseTemplate}` : baseTemplate;
  const totalWidth =
    (variant === "albums" ? 260 + trackWidth : trackWidth) +
    (reorderable ? 24 : 0);

  const rowsVirtualizer = useVirtualizer({
    count: variant === "table" ? songs.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 20,
    getItemKey: (index) => songs[index]?.id ?? index,
  });

  const groupVirtualizer = useVirtualizer({
    count: variant === "albums" ? albumGroups.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const group = albumGroups[index];
      const rows = group?.songs.length ?? 0;
      return Math.max(112, rows * rowHeight) + 24 + 16;
    },
    overscan: 4,
    getItemKey: (index) => albumGroups[index]?.key ?? index,
    measureElement: (element) => element.getBoundingClientRect().height,
  });

  function selectRow(event: MouseEvent<HTMLDivElement>, song: Song): void {
    if (event.shiftKey && anchorRef.current !== undefined) {
      const from = order.indexOf(anchorRef.current);
      const to = order.indexOf(song.id);
      if (from >= 0 && to >= 0) {
        const [start, end] = from <= to ? [from, to] : [to, from];
        onSelect(order.slice(start, end + 1));
        return;
      }
    }
    if (event.metaKey || event.ctrlKey) {
      anchorRef.current = song.id;
      onSelect(
        selectedSongIds.includes(song.id)
          ? selectedSongIds.filter((id) => id !== song.id)
          : [...selectedSongIds, song.id]
      );
      return;
    }
    anchorRef.current = song.id;
    onSelect([song.id]);
  }

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    song: Song
  ): void {
    if (
      event.altKey &&
      (event.key === "ArrowUp" || event.key === "ArrowDown")
    ) {
      if (!reorderable || onReorder === undefined) return;
      event.preventDefault();
      const from = songs.findIndex((entry) => entry.id === song.id);
      if (from < 0) return;
      const to = moveIndexWithin(
        from,
        event.key === "ArrowUp" ? -1 : 1,
        songs.length
      );
      if (to !== from) onReorder(from, to);
      return;
    }
    if (event.key === "Delete") {
      if (onRemoveSelected === undefined) return;
      event.preventDefault();
      onRemoveSelected();
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    onActivate(song);
  }

  function insertionAt(x: number, y: number): number | undefined {
    const element = document.elementFromPoint(x, y);
    const row = element?.closest("[data-song-id]");
    if (!(row instanceof HTMLElement)) return undefined;
    const id = row.dataset.songId;
    const index = songs.findIndex((song) => song.id === id);
    if (index < 0) return undefined;
    const rect = row.getBoundingClientRect();
    return y < rect.top + rect.height / 2 ? index : index + 1;
  }

  function handleRowPointerDown(
    event: PointerEvent<HTMLSpanElement>,
    index: number
  ): void {
    if (!reorderable) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragRow({ from: index, insertion: index });
  }

  function handleRowPointerMove(event: PointerEvent<HTMLSpanElement>): void {
    if (dragRow === undefined) return;
    const insertion = insertionAt(event.clientX, event.clientY);
    if (insertion === undefined) return;
    setDragRow({ from: dragRow.from, insertion });
  }

  function handleRowPointerUp(event: PointerEvent<HTMLSpanElement>): void {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const drag = dragRow;
    setDragRow(undefined);
    if (drag === undefined || onReorder === undefined) return;
    const to = reorderTarget(drag.from, drag.insertion);
    if (to !== drag.from) onReorder(drag.from, to);
  }

  function handleHeaderPointerDown(
    event: PointerEvent<HTMLButtonElement>,
    column: TrackColumnId
  ): void {
    if (!reorderColumns || event.button !== 0) return;
    dragRef.current = { column, startX: event.clientX, dragging: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleHeaderPointerMove(
    event: PointerEvent<HTMLButtonElement>
  ): void {
    const drag = dragRef.current;
    if (drag === undefined) return;
    if (!drag.dragging) {
      if (Math.abs(event.clientX - drag.startX) <= DRAG_THRESHOLD) return;
      drag.dragging = true;
      setDraggingColumn(drag.column);
    }
    const target = headerAt(event.clientX, event.clientY);
    if (target === undefined || target.column === drag.column) {
      setDropTarget(undefined);
      return;
    }
    setDropTarget((current) =>
      current?.column === target.column && current.edge === target.edge
        ? current
        : target
    );
  }

  function handleHeaderPointerUp(event: PointerEvent<HTMLButtonElement>): void {
    const drag = dragRef.current;
    dragRef.current = undefined;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingColumn(undefined);
    if (drag?.dragging) {
      suppressClickRef.current = true;
      if (dropTarget !== undefined) move(drag.column, dropTarget.column);
    }
    setDropTarget(undefined);
  }

  function handleHeaderClick(column: TrackColumnId): void {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onSort(column);
  }

  function handleHeaderKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    column: TrackColumnId
  ): void {
    if (!reorderColumns || !event.altKey) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const index = visibleColumns.indexOf(column);
    if (index < 0) return;
    const target =
      visibleColumns[event.key === "ArrowLeft" ? index - 1 : index + 1];
    if (target === undefined) return;
    event.preventDefault();
    move(column, target);
  }

  function renderRow(
    song: Song,
    index: number,
    rowTemplate: string
  ): ReactElement {
    const selected = selectedSongIds.includes(song.id);
    const playing = nowPlayingId === song.id;
    return (
      <SongContextMenu songs={[song]} playlistId={playlistId}>
        <div
          role="row"
          aria-selected={selected}
          tabIndex={0}
          data-context-menu="true"
          data-song-id={song.id}
          onClick={(event) => selectRow(event, song)}
          onDoubleClick={() => onActivate(song)}
          onKeyDown={(event) => handleRowKeyDown(event, song)}
          className={cn(
            "grid w-full min-w-0 cursor-default select-none items-center outline-none",
            rowClass,
            alternateRows && index % 2 === 1 && "bg-muted/70",
            selected && "bg-primary/15",
            playing && playingClass
          )}
          style={{ gridTemplateColumns: rowTemplate, height: `${rowHeight}px` }}
        >
          {reorderable ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label={t("playlist.dragToReorder")}
              title={t("playlist.dragToReorder")}
              className="flex h-full cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => handleRowPointerDown(event, index)}
              onPointerMove={handleRowPointerMove}
              onPointerUp={handleRowPointerUp}
              onPointerCancel={handleRowPointerUp}
            >
              <GripVertical aria-hidden="true" className="size-4" />
            </span>
          ) : null}
          {visibleColumns.map((column) => {
            const def = TRACK_COLUMN_DEFS[column];
            return (
              <div
                key={column}
                role="gridcell"
                className={cn(
                  "min-w-0 truncate px-2",
                  def.numeric && "text-right tabular-nums"
                )}
              >
                {def.format(song, t)}
              </div>
            );
          })}
        </div>
      </SongContextMenu>
    );
  }

  const header = showHeader ? (
    <div
      role="row"
      className={cn(
        "sticky top-0 z-sticky grid w-full min-w-0 cursor-default select-none items-center",
        headerClass
      )}
      style={{
        gridTemplateColumns: template,
        width: `${totalWidth}px`,
        background: "var(--wmm-list-header-bg, var(--background))",
      }}
    >
      {reorderable ? (
        <div role="columnheader" aria-hidden="true" className="h-full" />
      ) : null}
      {variant === "albums" ? (
        <div
          role="columnheader"
          aria-sort={
            sort?.column === "album"
              ? sort?.desc
                ? "descending"
                : "ascending"
              : "none"
          }
          className="relative flex min-w-0 cursor-default items-stretch"
        >
          <button
            type="button"
            className="flex h-full min-w-0 flex-1 cursor-default items-center gap-1 px-2 text-left"
            onClick={() => handleHeaderClick("album")}
          >
            <span className="min-w-0 truncate">{t("metadata.album")}</span>
            {sort?.column === "album" ? (
              sort.desc ? (
                <ChevronDown aria-hidden="true" className="size-3 shrink-0" />
              ) : (
                <ChevronUp aria-hidden="true" className="size-3 shrink-0" />
              )
            ) : null}
          </button>
        </div>
      ) : null}
      {visibleColumns.map((column) => {
        const def = TRACK_COLUMN_DEFS[column];
        const active = sort?.column === column;
        const edge =
          dropTarget?.column === column ? dropTarget.edge : undefined;
        return (
          <div
            key={column}
            role="columnheader"
            aria-sort={
              active ? (sort?.desc ? "descending" : "ascending") : "none"
            }
            data-column-id={column}
            className={cn(
              "relative flex min-w-0 items-stretch",
              def.numeric && "justify-end text-right",
              draggingColumn === column && "opacity-50"
            )}
          >
            <button
              type="button"
              className={cn(
                "flex h-full min-w-0 flex-1 cursor-default items-center gap-1 px-2 text-left",
                def.numeric && "justify-end"
              )}
              onClick={() => handleHeaderClick(column)}
              onPointerDown={(event) => handleHeaderPointerDown(event, column)}
              onPointerMove={handleHeaderPointerMove}
              onPointerUp={handleHeaderPointerUp}
              onPointerCancel={handleHeaderPointerUp}
              onKeyDown={(event) => handleHeaderKeyDown(event, column)}
            >
              <span className="min-w-0 truncate">{t(def.labelKey)}</span>
              {active ? (
                sort?.desc ? (
                  <ChevronDown aria-hidden="true" className="size-3 shrink-0" />
                ) : (
                  <ChevronUp aria-hidden="true" className="size-3 shrink-0" />
                )
              ) : null}
            </button>
            {resizeColumns ? (
              <ResizeHandle
                label={t("library.resizeColumn", [t(def.labelKey)])}
                width={widths[column]}
                onResize={(width) => setWidth(column, width)}
                onReset={() => reset(column)}
              />
            ) : null}
            {edge === undefined ? null : (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-y-0 w-0.5 bg-primary",
                  edge === "start" ? "start-0" : "end-0"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <div
      ref={scrollRef}
      className="min-h-0 min-w-0 flex-1 cursor-default overflow-auto"
    >
      {header}
      {variant === "albums" ? (
        albumGroups.length === 0 ? (
          <EmptyMessage />
        ) : (
          <div
            style={{
              height: `${groupVirtualizer.getTotalSize()}px`,
              position: "relative",
              width: `${totalWidth}px`,
            }}
          >
            {groupVirtualizer.getVirtualItems().map((item) => {
              const group = albumGroups[item.index];
              if (group === undefined) return null;
              return (
                <div
                  key={item.key}
                  ref={groupVirtualizer.measureElement}
                  data-index={item.index}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${item.start}px)`,
                  }}
                >
                  <AlbumGroupBlock
                    group={group}
                    trackTemplate={trackTemplate}
                    trackWidth={trackWidth}
                    headerClass={headerClass}
                    renderRow={renderRow}
                    onFilter={onFilter}
                    offset={order.indexOf(group.songs[0]?.id ?? "")}
                  />
                </div>
              );
            })}
          </div>
        )
      ) : songs.length === 0 ? (
        <EmptyMessage />
      ) : (
        <div
          style={{
            height: `${rowsVirtualizer.getTotalSize()}px`,
            position: "relative",
            width: `${totalWidth}px`,
          }}
        >
          {dragRow === undefined ? null : (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 h-0.5 bg-primary"
              style={{ top: `${dragRow.insertion * rowHeight}px` }}
            />
          )}
          {rowsVirtualizer.getVirtualItems().map((item) => {
            const song = songs[item.index];
            if (song === undefined) return null;
            return (
              <div
                key={item.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${item.start}px)`,
                }}
              >
                {renderRow(song, item.index, template)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * One album's header line, cover cell and track rows.
 *
 * @example
 * ```xml
 * <TrackList variant="albums" columns="track title duration" />
 * ```
 * @example
 * ```tsx
 * <AlbumGroupBlock group={group} rowHeight={28} trackTemplate="56px 240px" />
 * ```
 */
function AlbumGroupBlock({
  group,
  trackTemplate,
  trackWidth,
  headerClass,
  renderRow,
  onFilter,
  offset,
}: {
  group: AlbumGroup;
  trackTemplate: string;
  trackWidth: number;
  headerClass: string;
  renderRow: (song: Song, index: number, rowTemplate: string) => ReactElement;
  onFilter: (selection: LibrarySelection) => void;
  offset: number;
}) {
  const { t } = useTranslation();
  const unknownAlbum = group.album === t("library.unknownAlbum");
  const unknownArtist = group.albumArtist === t("common.unknownArtist");
  const genre = group.genre === "" ? undefined : group.genre;
  const year = group.year;

  return (
    <div className="cursor-default pb-4">
      <div className="flex items-center gap-2 px-2 py-1">
        <span className={cn(headerClass, "shrink-0 text-primary")}>
          {group.albumArtist}
        </span>
        <span aria-hidden="true" className="h-px min-w-0 flex-1 bg-border" />
      </div>
      <div className="flex min-w-0 items-start" style={{ minHeight: 112 }}>
        <SongContextMenu songs={group.songs}>
          <div className="flex w-[260px] shrink-0 flex-row gap-2 px-2">
            <div className="size-24 shrink-0 overflow-hidden rounded">
              <AlbumArtImage
                songId={group.pictureSongId}
                thumbSize={ThumbnailSize.thumb128}
                className="size-full rounded object-cover"
                fallback={<span className="block size-full rounded bg-muted" />}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              {group.album === "" ? null : unknownAlbum ? (
                <span className="truncate text-sm">{group.album}</span>
              ) : (
                <AlbumCellButton
                  label={group.album}
                  onFilter={() =>
                    onFilter({ kind: "album", value: group.album })
                  }
                />
              )}
              {group.albumArtist === "" ? null : unknownArtist ? (
                <span className="truncate text-sm text-muted-foreground">
                  {group.albumArtist}
                </span>
              ) : (
                <AlbumCellButton
                  label={group.albumArtist}
                  className="text-muted-foreground"
                  onFilter={() =>
                    onFilter({ kind: "artist", value: group.albumArtist })
                  }
                />
              )}
              {genre === undefined ? null : (
                <AlbumCellButton
                  label={genre}
                  className="text-muted-foreground"
                  onFilter={() => onFilter({ kind: "genre", value: genre })}
                />
              )}
              {year === undefined ? null : (
                <AlbumCellButton
                  label={String(year)}
                  className="text-muted-foreground"
                  onFilter={() =>
                    onFilter({ kind: "year", value: String(year) })
                  }
                />
              )}
            </div>
          </div>
        </SongContextMenu>
        <div className="min-w-0 shrink-0" style={{ width: `${trackWidth}px` }}>
          {group.songs.map((song, index) => (
            <div key={song.id}>
              {renderRow(song, offset + index, trackTemplate)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * One album cell value as a button that filters the page by it.
 *
 * @example
 * ```xml
 * <TrackList variant="albums" columns="track title duration" />
 * ```
 * @example
 * ```tsx
 * <AlbumCellButton label="X&Y" onFilter={() => select({ kind: "album", value: "X&Y" })} />
 * ```
 */
function AlbumCellButton({
  label,
  className,
  onFilter,
}: {
  label: string;
  className?: string;
  onFilter: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={cn(
        "cursor-default truncate text-left text-sm outline-none hover:underline focus-visible:underline",
        className
      )}
      aria-label={t("library.showAllFrom", [label])}
      onClick={onFilter}
    >
      {label}
    </button>
  );
}

/**
 * The message a table shows when it has no rows.
 *
 * @example
 * ```xml
 * <TrackList variant="table" columns="title artist" />
 * ```
 * @example
 * ```tsx
 * <EmptyMessage />
 * ```
 */
function EmptyMessage() {
  const { t } = useTranslation();
  return (
    <span className="flex min-w-0 items-center justify-center py-6 text-sm text-muted-foreground">
      {t("library.noSongsFound")}
    </span>
  );
}

/**
 * The header cell under a pointer position, with the edge the pointer is
 * nearer, or undefined when the pointer is over no header cell.
 *
 * @example
 * ```xml
 * <TrackList variant="table" reorderColumns="true" />
 * ```
 * @example
 * ```ts
 * const target = headerAt(320, 40);
 * target?.edge; // "end"
 * ```
 */
function headerAt(
  x: number,
  y: number
): { column: TrackColumnId; edge: "start" | "end" } | undefined {
  const element = document.elementFromPoint(x, y);
  const cell = element?.closest("[data-column-id]");
  if (!(cell instanceof HTMLElement)) return undefined;
  const id = cell.dataset.columnId;
  if (id === undefined || !(id in TRACK_COLUMN_DEFS)) return undefined;
  const rect = cell.getBoundingClientRect();
  return {
    column: id as TrackColumnId,
    edge: x < rect.left + rect.width / 2 ? "start" : "end",
  };
}

/**
 * The drag handle on a header cell's end edge: drag to resize, double click to
 * return the column to its default width, arrow keys to step it.
 *
 * @example
 * ```xml
 * <TrackList variant="table" resizeColumns="true" />
 * ```
 * @example
 * ```tsx
 * <ResizeHandle label="Resize title column" width={240} onResize={setWidth} />
 * ```
 */
function ResizeHandle({
  label,
  width,
  onResize,
  onReset,
}: {
  label: string;
  width: number;
  onResize: (width: number) => void;
  onReset: () => void;
}) {
  const dragRef = useRef<{ startX: number; startWidth: number } | undefined>(
    undefined
  );

  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startWidth: width };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current;
    if (drag === undefined) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    onResize(drag.startWidth + event.clientX - drag.startX);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>): void {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = undefined;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onResize(clampWidth(width - 8));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      onResize(clampWidth(width + 8));
    }
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={COLUMN_MIN_WIDTH}
      aria-valuemax={COLUMN_MAX_WIDTH}
      tabIndex={0}
      className="absolute inset-y-0 end-0 w-1.5 cursor-col-resize touch-none select-none"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onReset();
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    />
  );
}
