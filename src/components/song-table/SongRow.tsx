import React from "react";
import type { Song } from "@/models";
import type { SortableColumn } from "@/lib/store";

export const SongRow = React.memo(
  function SongRow({
    song,
    columns,
    isSelected,
    onSelect,
  }: {
    song: Song;
    columns: [SortableColumn, string][];
    isSelected: boolean;
    onSelect: (s: Song) => void;
  }) {
    return (
      <tr
        className={`${isSelected ? "bg-accent/25 odd:bg-accent/35" : "odd:bg-muted/15"} hover:bg-accent/45 transition-colors`}
        onClick={() => onSelect(song)}
      >
        {columns.map(([key]) => (
          <td
            key={key}
            className="px-4 py-1 whitespace-nowrap overflow-clip text-ellipsis"
          >
            {song[key]}
          </td>
        ))}
      </tr>
    );
  },

  (prev, next) => {
    return prev.song === next.song && prev.isSelected === next.isSelected;
  }
);
