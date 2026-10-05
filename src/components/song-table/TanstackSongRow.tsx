import { memo } from "react";

import type { TanstackSongRowProps } from "./TanstackSongRowProps";

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

  const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (e.detail === 1) {
      const selection = isEditMultiple
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
    <div
      key={song.id}
      ref={(el) => registerRowRef(row.id, el)}
      onClick={handleClick}
      className={
        isSelected
          ? "flex bg-accent/25 odd:bg-accent/35 hover:bg-accent/45"
          : "flex odd:bg-muted/15 hover:bg-accent/45"
      }
    >
      {row.getVisibleCells().map((cell: any) => (
        <div
          key={cell.id}
          style={{
            width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
          }}
          className="px-4 py-1 whitespace-nowrap overflow-hidden text-ellipsis"
        >
          <table.FlexRender cell={cell} />
        </div>
      ))}
    </div>
  );
});
