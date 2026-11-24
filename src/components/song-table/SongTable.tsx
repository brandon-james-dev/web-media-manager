import { selectors, type SortableColumn } from "@/lib/persistence";
import { useTranslation, type WmmResourceKey } from "@/i18n";
import { SongRow } from "./SongRow";
import type { SongTableProps } from "./SongTableProps";
import { ChevronDown, ChevronUp } from "lucide-react";

export function SongTable(props: SongTableProps) {
  const { songs, sort, isEditMultiple, onSelect, onSort, selectedSongIds } =
    props;
  const { t } = useTranslation();

  const sortableColumns: [SortableColumn, WmmResourceKey][] = [
    ["title", "metadata.title"],
    ["album", "metadata.album"],
    ["artist", "metadata.artist"],
    ["track", "metadata.track"],
    ["genre", "metadata.genre"],
    ["year", "metadata.year"],
  ];

  const sortableColumnKeys = sortableColumns.map((key) => key);

  function handleSelect(selectedSongs: string[]) {
    if (isEditMultiple) {
      onSelect?.([...selectedSongIds, ...selectedSongs]);
    } else {
      onSelect?.(selectedSongs);
    }
  }

  return (
    <div className="rounded-md">
      <table className="w-full border-collapse text-sm select-none">
        <thead className="sticky top-0 bg-background z-sticky">
          <tr className="border-b">
            {sortableColumns.map(([key, labelKey]) => {
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
                    {t(labelKey)}
                    {Icon && <Icon size=".75lh" className="text-primary" />}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className="font-light">
          {songs.map((song) => (
            <SongRow
              key={song.id}
              columns={sortableColumnKeys}
              song={song}
              onSelect={handleSelect}
              isSelected={selectedSongIds.includes(song.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
