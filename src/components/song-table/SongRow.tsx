import type { Song } from "@/models";
import React from "react";

export const SongRow = React.memo(
  function SongRow({
    song,
    onSelect,
  }: {
    song: Song;
    onSelect: (s: Song) => void;
  }) {
    return (
      <tr
        className="hover:bg-accent/25 odd:bg-muted/25 transition-colors"
        onClick={() => onSelect(song)}
      >
        <td className="px-4 py-1 whitespace-nowrap overflow-clip text-ellipsis">
          {song.title}
        </td>
        <td className="px-4 py-1 whitespace-nowrap overflow-clip text-ellipsis">
          {song.artist}
        </td>
        <td className="px-4 py-1 whitespace-nowrap overflow-clip text-ellipsis">
          {song.album}
        </td>
        <td className="px-4 py-1 whitespace-nowrap overflow-clip text-ellipsis">
          {song.track}
        </td>
        <td className="px-4 py-1 whitespace-nowrap overflow-clip text-ellipsis">
          {song.year}
        </td>
      </tr>
    );
  },

  (prev, next) => {
    return prev.song === next.song;
  }
);
