import type { QueryOptions, SortableColumn } from "@/lib/store/QueryOptions";
import type { Song } from "@/models";

export interface SongTableProps {
  songs: Song[];
  onSelect: (song: Song) => void;
  onSort?: (column: SortableColumn) => void;
  sort?: QueryOptions<Song>["sort"];
}
