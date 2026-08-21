import { selectors, type SortableColumn } from "@/lib/store";
import { SongRow } from "./SongRow";
import type { SongTableProps } from "./SongTableProps";
import { ChevronDown, ChevronUp } from "lucide-react";

export function SongTable(props: SongTableProps) {
  const { songs, sort, onSelect, onSort } = props;

  if (songs.length === 0) {
    return (
      <div className="text-muted-foreground p-4 border rounded-md">
        No songs imported yet.
      </div>
    );
  }

  return (
    <div className="rounded-md">
      <table className="w-full border-collapse text-sm select-none">
        <thead className="sticky top-0 bg-background z-10">
          <tr className="border-b">
            {(
              [
                ["title", "Title"],
                ["artist", "Artist"],
                ["album", "Album"],
                ["track", "Track"],
                ["year", "Year"],
              ] as [SortableColumn, string][]
            ).map(([key, label]) => {
              const isActive = sort?.selector === selectors[key];
              const Icon = isActive
                ? sort?.desc
                  ? ChevronDown
                  : ChevronUp
                : null;

              return (
                <th
                  key={key}
                  onClick={() => onSort?.(key)}
                  className={[
                    "bg-accent/5 hover:bg-accent/10 px-4 py-2 text-left font-medium select-none transition-colors",
                    isActive ? "text-white" : "text-muted-foreground",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-1">
                    {label}
                    {Icon && <Icon size=".75lh" className="text-primary" />}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className="font-light">
          {songs.map((song) => (
            <SongRow key={song.id} song={song} onSelect={onSelect} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
