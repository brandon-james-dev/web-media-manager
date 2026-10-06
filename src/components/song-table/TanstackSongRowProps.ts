import type { Song } from "@/models";
import type {
  ReactTable,
  SortingState,
  RowSelectionState,
  ColumnVisibilityState,
  ColumnOrderState,
} from "@tanstack/react-table";

export interface TanstackSongRowProps {
  song: Song;
  row: any;
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
}
