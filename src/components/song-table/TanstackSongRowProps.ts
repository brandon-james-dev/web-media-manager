import type { Song } from "@/models";
import type {
  ReactTable,
  SortingState,
  RowSelectionState,
  ColumnVisibilityState,
  ColumnOrderState,
  Row,
} from "@tanstack/react-table";

export interface TanstackSongRowProps {
  song: Song;
  row: Row<any, Song>;
  table: ReactTable<
    any,
    Song,
    {
      sorting: SortingState;
      rowSelection: RowSelectionState;
      columnVisibility: ColumnVisibilityState;
      columnOrder: ColumnOrderState;
    }
  >;
  rowSelection: RowSelectionState;
  isEditMultiple: boolean;
  onSongDoubleClicked?(song: Song): void;
  registerRowRef(rowId: string, element: HTMLDivElement | null): void;
  /** Ordered row ids in the current table view (for shift-range selection). */
  orderedSongIds: string[];
  /** The last single-clicked row id (shift-range anchor). */
  selectionAnchor: string | null;
  /** Updates the shift-range anchor after a click. */
  setSelectionAnchor(anchor: string | null): void;
}
