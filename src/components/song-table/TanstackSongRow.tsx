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
}: TanstackSongRowProps) {
  const isSelected = row.getIsSelected();
  const { nowPlaying, isPlaying } = usePlayback();

  const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (e.detail === 1) {
      const selection: RowSelectionState = isEditMultiple
        ? {
          ...rowSelection,
          [song.id]: true,
        }
        : {
          [row.id]: true,
        };

      table.setRowSelection(selection);
    } else if (e.detail === 2) {
      onSongDoubleClicked?.(song);
    }
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
            ? "flex bg-accent/25 odd:bg-accent/35 hover:bg-accent/45"
            : "flex odd:bg-muted/15 hover:bg-accent/45"
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
