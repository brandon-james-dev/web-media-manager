import { memo } from "react";
import type { TanstackSongRowProps } from "./TanstackSongRowProps";
import { SongContextMenu } from "../song-context-menu/SongContextMenu";
import type { Cell, RowSelectionState } from "@tanstack/react-table";
import { usePlayback } from "@/hooks";
import type { Song } from "@/models";
import { Play } from "lucide-react";

export const SongRow = memo(function SongRow({
  song,
  row,
  table,
  rowSelection,
  isEditMultiple,
  onSongDoubleClicked,
  registerRowRef,
  orderedSongIds,
  selectionAnchor,
  setSelectionAnchor,
}: TanstackSongRowProps) {
  const isSelected = row.getIsSelected();
  const { nowPlaying, isPlaying } = usePlayback();

  const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (e.detail === 2) {
      onSongDoubleClicked?.(song);
      return;
    }

    const isMeta = e.metaKey || e.ctrlKey;
    const isShift = e.shiftKey;

    // Plain click: select just this row (preserves double-click contract).
    if (!isMeta && !isShift) {
      const selection: RowSelectionState = isEditMultiple
        ? {
            ...rowSelection,
            [song.id]: true,
          }
        : {
            [row.id]: true,
          };

      table.setRowSelection(selection);
      setSelectionAnchor(song.id);
      return;
    }

    // Ctrl/Cmd-click: toggle this row in/out of the selection.
    if (isMeta && !isShift) {
      const next: RowSelectionState = { ...rowSelection };
      if (next[song.id]) {
        delete next[song.id];
        // Toggling off — move the anchor to the previous remaining row so a
        // subsequent shift-click has a sensible origin.
        setSelectionAnchor(getPreviousOrdered(song.id) ?? null);
      } else {
        next[song.id] = true;
        setSelectionAnchor(song.id);
      }
      table.setRowSelection(next);
      return;
    }

    // Shift-click: select the contiguous range from the anchor to this row.
    const range = getRangeIndices(song.id);

    if (range) {
      const [start, end] = range;
      const next: RowSelectionState = { ...rowSelection };
      for (let i = start; i <= end; i++) {
        next[orderedSongIds[i]] = true;
      }
      table.setRowSelection(next);
      // Keep the anchor stable for repeated shift-clicks.
    } else {
      // No anchor established — fall back to toggling like a meta-click.
      const next: RowSelectionState = { ...rowSelection };
      next[song.id] = true;
      table.setRowSelection(next);
      setSelectionAnchor(song.id);
    }
  };

  /** Index of a row id within the current ordered list, or -1. */
  const indexOf = (id: string) => {
    const idx = orderedSongIds.indexOf(id);
    return idx;
  };

  /** [start, end] indices for the shift range from anchor to this row. */
  const getRangeIndices = (id: string) => {
    if (selectionAnchor == null) return null;
    const anchorIdx = indexOf(selectionAnchor);
    const thisIdx = indexOf(id);
    if (anchorIdx < 0 || thisIdx < 0) return null;
    return anchorIdx <= thisIdx ? [anchorIdx, thisIdx] : [thisIdx, anchorIdx];
  };

  /** The row id immediately before `id` in the ordered list, or undefined. */
  const getPreviousOrdered = (id: string) => {
    const idx = indexOf(id);
    return idx > 0 ? orderedSongIds[idx - 1] : undefined;
  };

  return (
    <SongContextMenu songs={[song]}>
      <div
        key={song.id}
        ref={(el) => {
          registerRowRef(row.id, el);
        }}
        onClick={handleClick}
        className={
          isSelected
            ? "flex h-7 bg-accent/25 odd:bg-accent/35 hover:bg-accent/45"
            : "flex h-7 odd:bg-muted/15 hover:bg-accent/45"
        }
      >
        {row.getVisibleCells().map((cell: Cell<any, Song>) => (
          <div
            key={cell.id}
            style={{
              width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
            }}
            className="px-4 py-1 whitespace-nowrap overflow-hidden text-ellipsis"
          >
            <div className="flex items-center gap-1 min-w-0">
              {cell.column.id === "title" && nowPlaying?.id === song.id && (
                isPlaying && <Play className="h-[0.65lh] w-[0.65lh] shrink-0 fill-current" />
              )}
              <div className="flex-1 min-w-0 truncate">
                <table.FlexRender cell={cell} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </SongContextMenu>
  );
});
