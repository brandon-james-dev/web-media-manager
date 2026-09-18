import type { QueryOptions, SortableColumn } from "@/lib/store/QueryOptions";
import type { Song } from "@/models";

export interface SongTableProps {
  songs: Song[];
  selectedSongIds: string[];
  isEditMultiple: boolean;
  onSelect: (songIds: string[]) => void;
  onSort?: (column: SortableColumn) => void;
  sort?: QueryOptions<Song>["sort"];
  onSongDoubleClicked?: (song: Song) => void;
}
