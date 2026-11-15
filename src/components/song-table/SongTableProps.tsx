import type {
  QueryOptions,
  SortableColumn,
} from "@/lib/persistence/QueryOptions";
import type { DragEndEvent } from "@dnd-kit/core";
import type { Song } from "@/models";

export interface SongTableProps {
  songs: Song[];
  selectedSongIds: string[];
  isEditMultiple: boolean;
  onSelect?: (songIds: string[]) => void;
  onSort?: (column: SortableColumn) => void;
  sort?: QueryOptions<Song>["sort"];
  onSongDoubleClicked?: (song: Song) => void;
  /**
   * A track row was dropped on a target outside the table. The table owns its
   * own `DndContext` for column reordering, so a track drag never reaches the
   * page's context and has to be forwarded from here.
   */
  onTrackDrop?: (event: DragEndEvent) => void;
  /**
   * Substitute renderer for each virtual row. When provided, the table's
   * virtualization drives a custom row element instead of the default
   * table row — the phone-size track list (songs rendered as compact
   * `TrackItem`s) reuses the same measureElement/translateY virtual list.
   */
  virtualRowRenderer?: (song: Song) => React.ReactNode;
}
